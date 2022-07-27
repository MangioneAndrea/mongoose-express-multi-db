import mongoose, {ConnectOptions, Model, Schema} from "mongoose"
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

const properMongooseConnect = (uri: string, options: ConnectOptions) => new Promise<mongoose.Connection>((resolve, reject) => {
    const connection = mongoose.createConnection(uri, options)
    connection.on("open", () => {
        resolve(connection)
    })
    connection.on("error", (e) => {
        reject(e)
    });
})

class Pool {
    readonly #mongoURI: string
    #schemas: Map<string, Schema> = new Map();
    #ready = false;
    #connections: Map<string, mongoose.Connection> = new Map();

    constructor(configs: RequiredConfig) {
        this.#mongoURI = configs.mongoUri
        this.#initModels(configs.modelsPaths).then(() => this.#ready = true)
    }

    async #initModels(paths: Array<string> | string) {
        const files = walk(paths).filter(fileHasMongooseDeclaration)

        for (const file of files) {
            const model = (await import(file)) as Model<any>
            let {schema, modelName} = model
            this.#schemas.set(modelName, schema)
        }
    }


    #has(origin: string): boolean {
        return this.#connections.has(origin)
    }

    async #add(origin: string, options: ConnectOptions) {
        const connection = await properMongooseConnect(`${this.#mongoURI}/${origin}`, options)
        console.log(connection)
        this.#connections.set(origin, connection);
        for (const [name, schema] of this.#schemas) {
            connection.model(name, schema);
        }
    }

    async connect(origin: string, options: ConnectOptions): Promise<mongoose.Connection> {
        if (!this.#has(origin)) {
            await this.#add(origin, options);
        }
        return this.#connections.get(origin) as mongoose.Connection;
    }
}

const Middleware = (configs: OptionalConfig & RequiredConfig) => {
    const finalConfigs: Config = {...defaultConfig, ...configs}
    const pool = new Pool(configs)

    return async (req: Request, res: Response, next: NextFunction) => {
        try {
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