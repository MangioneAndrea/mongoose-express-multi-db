import mongoose, {ConnectOptions, Model, Promise, Schema} from "mongoose"
import type {NextFunction, Request, Response} from "express"
import {Server} from "http"

import {fileHasMongooseDeclaration, walk} from "./util";


type OptionalConfig = {
    getDBName?: (req: Request) => string,
    connectOptions?: mongoose.ConnectOptions
}

type RequiredConfig = {
    mongoUri: string,
    modelsPaths: string | Array<string>,
}

type Config = OptionalConfig & RequiredConfig

const defaultConfig: Required<OptionalConfig> = {
    getDBName(req: Request): string {
        return req?.headers?.origin ?? "localhost";
    },
    connectOptions: {}
}


interface KnownModels {
    [key: string]: Model<any> | any
}

export class Tenant<T extends KnownModels = {}> {

    /** @internal */
    readonly #connection: mongoose.Connection

    /** @internal */
    readonly #models: Map<string, Model<any>>

    /** @internal */
    readonly #name: string

    get name(): string {
        return this.#name;
    }

    get models(): Map<string, Model<any>> {
        return this.#models;
    }

    getModel<K extends keyof T, C extends T[K]>(modelName: K): Model<C extends Model<infer N> ? N : T[K]>;
    getModel(modelName: string): Model<any> | undefined {
        return this.models.get(modelName)
    }

    get connection(): mongoose.Connection {
        return this.#connection;
    }

    constructor(name: string, connection: mongoose.Connection, schemas: Map<string, Schema>) {
        this.#connection = connection
        this.#name = name;
        const models = new Map<string, Model<any>>;
        for (const [name, schema] of schemas) {
            models.set(name, connection.model(name, schema));
        }
        this.#models = models;
    }
}


class Pool<T extends KnownModels> {
    readonly #mongoURI: string
    #schemas: Map<string, Schema> = new Map()
    #setReady: undefined | { resolve: (() => boolean), reject: ((e: Error) => Error) };
    readonly isReady = new Promise((resolve: () => boolean, reject: (e: Error) => Error) => {
        this.#setReady = {resolve, reject};
    });
    #tenants: Map<string, Tenant<T>> = new Map();

    constructor(configs: RequiredConfig) {
        this.#mongoURI = configs.mongoUri.replace(/\/$/, "")
        this.#initModels(configs.modelsPaths).then(() => {
            this.#setReady?.resolve()
        }).catch((e) => {
            this.#setReady?.reject(e as Error)
        })
    }

    async #initModels(paths: Array<string> | string) {
        const files = walk(paths)

        for await (const file of files.filter(fileHasMongooseDeclaration)) {
            const importedModel = await import(file)
            const model = (importedModel.default || importedModel) as Model<any>
            let {schema, modelName} = model
            this.#schemas.set(modelName, schema)
        }
    }

    #has(origin: string): boolean {
        return this.#tenants.has(origin)
    }

    async #add(origin: string, options: ConnectOptions) {
        const connection = await mongoose.createConnection(`${this.#mongoURI}/${origin}`, {}).asPromise()
        this.#tenants.set(origin, new Tenant(origin, connection, this.#schemas));
    }

    async connect(origin: string, options: ConnectOptions): Promise<Tenant<T>> {
        if (!this.#has(origin)) {
            await this.#add(origin, options);
        }
        return this.#tenants.get(origin) as Tenant<T>;
    }
}

const Middleware = <T extends KnownModels>(configs: Config) => {
    const finalConfigs: Required<Config> = {...defaultConfig, ...configs}
    const pool = new Pool(configs)


    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // @ts-ignore
            const server: Server = req.connection.server
            server.on("close", () => console.log("closing"))
            await pool.isReady
            const origin = finalConfigs.getDBName(req);
            const tenant = await pool.connect(origin, finalConfigs.connectOptions)
            Object.assign(req, {tenant})
            return next();
        } catch (e) {
            next(e)
        }
    }
}


export default Middleware