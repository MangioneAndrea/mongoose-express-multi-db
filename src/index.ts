import mongoose, {ConnectOptions, Model, Promise, Schema} from "mongoose"
import type {NextFunction, Request, Response} from "express"
import {fileHasMongooseDeclaration, walk} from "./util";


type OptionalConfig = {
    reconnectTries?: number,
    reconnectInterval?: number,
    maxPoolSize?: number,
    minPoolSize?: number,
    getOrigin?: (req: Request) => string
}

type RequiredConfig = {
    mongoUri: `${"mongodb://" | "mongodb+srv://"}${string}`,
    modelsPaths: string | Array<string>,
}

type Config = Required<OptionalConfig> & RequiredConfig

const defaultConfig: Required<OptionalConfig> = {
    getOrigin(req: Request): string {
        return req?.headers?.origin ?? "localhost";
    },
    maxPoolSize: 500,
    minPoolSize: 1,
    reconnectInterval: 100,
    reconnectTries: 5
}

export class Tenant {
    get name(): string {
        return this.#name;
    }

    get models(): Map<string, Model<any>> {
        return this.#models;
    }

    get connection(): mongoose.Connection {
        return this.#connection;
    }

    readonly #connection: mongoose.Connection
    readonly #models: Map<string, Model<any>>
    readonly #name: string

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


class Pool {
    readonly #mongoURI: string
    #schemas: Map<string, Schema> = new Map()
    #setReady: undefined | { resolve: (() => boolean), reject: ((e: Error) => Error) };
    readonly isReady = new Promise((resolve: () => boolean, reject: (e: Error) => Error) => {
        this.#setReady = {resolve, reject};
    });
    #tenants: Map<string, Tenant> = new Map();

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

    async connect(origin: string, options: ConnectOptions): Promise<Tenant> {
        if (!this.#has(origin)) {
            await this.#add(origin, options);
        }
        return this.#tenants.get(origin) as Tenant;
    }
}

const Middleware = (configs: OptionalConfig & RequiredConfig) => {
    const finalConfigs: Config = {...defaultConfig, ...configs}
    const pool = new Pool(configs)

    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await pool.isReady
            const origin = finalConfigs.getOrigin(req);
            const tenant = await pool.connect(origin, finalConfigs)
            Object.assign(req, {tenant})
            return next();
        } catch (e) {
            next(e)
        }
    }
}


export default Middleware