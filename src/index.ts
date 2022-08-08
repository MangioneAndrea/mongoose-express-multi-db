import mongoose, {ConnectOptions, Model, Promise, Schema} from "mongoose"
import type {Express, NextFunction, Request, Response} from "express"

import {fileHasMongooseDeclaration, walk} from "./util";

/**
 * Optional configuration for the package
 */
type OptionalConfig = {
    getDBName?: (req: Request) => string,
    connectOptions?: ConnectOptions,
    /**
     * Throws an error if a connection requires a DB which does not exist
     */
    ensureDbExists?: boolean
}
/**
 * Required configuration for the package
 */
type RequiredConfig = {
    /**
     * uri for the mongoDb. This shouldn't contain the db at the end
     */
    mongoUri: string,
    /**
     * Path where to search for the models. The narrower, the faster. Not all files will be imported. Only those containing models
     */
    modelsPaths: string | Array<string>
}

type Config = OptionalConfig & RequiredConfig

/**
 * Configurations used as callback for the optional config
 */
const defaultConfig: Required<OptionalConfig> = {
    /**
     * The database is equal to the origin or localhost
     */
    getDBName(req: Request): string {
        return req?.headers?.origin ?? "localhost";
    },
    /**
     * No connectOptions
     */
    connectOptions: {},
    /**
     * By default, the db might not exist
     */
    ensureDbExists: false,
}

/**
 * This is how the models definition looks like.
 * Both models and types are accepted
 */
interface KnownModels {
    [key: string]: Model<any> | any
}

/**
 * Object containing each db info
 */
export class Tenant<T extends KnownModels = {}> {

    /** @internal */
    readonly connection: mongoose.Connection

    /** @internal */
    readonly models: Map<string, Model<any>>

    /** @internal */
    readonly name: string

    /**
     * Get reference to model. The string defined in the models will provide typings
     *
     * @see KnownModels
     *
     *
     * T is the set of Models or Schemas
     * K is a key of the Models
     * T[K] is the Model or schema
     * The function always return the Schema type
     */
    getModel<K extends keyof T>(modelName: K): Model<T[K] extends Model<infer N> ? N : T[K]>;
    getModel(modelName: string): Model<any> | undefined {
        return this.models.get(modelName)
    }


    /** @internal  */
    constructor(name: string, connection: mongoose.Connection, schemas: Map<string, Schema>) {
        this.connection = connection
        this.name = name;
        const models = new Map<string, Model<any>>;
        for (const [name, schema] of schemas) {
            models.set(name, connection.model(name, schema));
        }
        this.models = models;
    }
}

/**
 * Object containing all references to the databases. The pool gets bigger when more people from different tenants
 * try to connect. The references are used to reuse connections but also to allow to cleanup mongoose
 * @internal
 */
class Pool<T extends KnownModels> {
    /** @internal  */
    readonly #mongoURI: string
    /** @internal  */
    #schemas: Map<string, Schema> = new Map()
    /** @internal  */
    #setReady: undefined | { resolve: (() => boolean), reject: ((e: Error) => Error) };
    /** @internal  */
    readonly isReady = new Promise((resolve: () => boolean, reject: (e: Error) => Error) => {
        this.#setReady = {resolve, reject};
    });
    /** @internal  */
    #tenants: Map<string, Tenant<T>> = new Map();
    #configs: Required<Config>

    /** @internal  */
    constructor(configs: Required<Config>) {
        this.#mongoURI = configs.mongoUri.replace(/\/$/, "")
        this.#configs = configs
        this.#initModels(configs.modelsPaths).then(() => {
            this.#setReady?.resolve()
        }).catch((e) => {
            this.#setReady?.reject(e as Error)
        })
    }

    /** @internal  */
    async #initModels(paths: Array<string> | string) {
        const files = walk(paths)

        for await (const file of files.filter(fileHasMongooseDeclaration)) {
            const importedModel = await import(file)
            const model = (importedModel.default || importedModel) as Model<any>
            let {schema, modelName} = model
            this.#schemas.set(modelName, schema)
        }
    }

    /** @internal  */
    #has(origin: string): boolean {
        return this.#tenants.has(origin)
    }

    /** @internal  */
    async clear() {
        await Promise.all(Array.from(this.#tenants.values()).map(tenant => tenant.connection.close(true)))
        this.#tenants.clear()
    }

    /** @internal  */
    async #add(db: string) {
        const connection = await mongoose.createConnection(`${this.#mongoURI}/${db}`, this.#configs.connectOptions || {}).asPromise()
        if (this.#configs.ensureDbExists) {
            const dbs = await connection.db.admin().listDatabases();
            if (!dbs.databases.some(({name}) => name === db)) throw new Error(`DB ${db} does not exist`)
        }
        this.#tenants.set(db, new Tenant(db, connection, this.#schemas));
    }

    /** @internal  */
    async connect(db: string): Promise<Tenant<T>> {
        if (!this.#has(db)) {
            await this.#add(db);
        }
        return this.#tenants.get(db) as Tenant<T>;
    }
}

/**
 * Middleware to use direct under express as `app.use(middleware(props))`
 * @export
 */
const middleware = <T extends KnownModels>(configs: Config) => {
    const finalConfigs: Required<Config> = {...defaultConfig, ...configs}
    const pool = new Pool(finalConfigs)


    /**
     * This is the middleware itself, wrapped in a function to provide setting directly as oneliner
     */
    async function MongooseMultiDBMiddleware(req: Request, res: Response, next: NextFunction) {
        try {
            await pool.isReady
            const db = finalConfigs.getDBName(req);
            const tenant = await pool.connect(db)
            Object.assign(req, {tenant})
            return next();
        } catch (e) {
            next(e)
        }
    }

    /**
     * This reference is used to cleanup
     * @internal
     */
    MongooseMultiDBMiddleware.clear = () => pool.clear();

    return MongooseMultiDBMiddleware
}
/**
 * Cleanup function to ensure mongoose disconnects from the server
 * @param app express app where to close the connections from
 */
export const killMiddlewareConnections = async (app: Express) => {
    // Search for the mongoose middleware
    const middleware = (app.stack || app._router.stack).find((el) => el.name === "MongooseMultiDBMiddleware");
    // Do not throw errors if the middleware was not (yet) applied
    if (!middleware) return;
    await middleware.handle.clear()
}


export default middleware