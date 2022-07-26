import mongoose from "mongoose"
import type {NextFunction, Request, Response} from "express"
import {walk} from "./util";


type OptionalConfig = {
    reconnectTries?: number,
    reconnectInterval?: number,
    maxPoolSize?: number,
    minPoolSize?: number,
    getOrigin?: (req: Request) => string
}

type RequiredConfig = {
    mongoUri: string,
    modelsPaths: string | Array<string>,
}

type Config = Required<OptionalConfig> & RequiredConfig

const defaultConfig: Required<OptionalConfig> = {
    getOrigin(req: Request): string {
        return req?.headers?.origin ?? "localhost";
    },
    maxPoolSize: 500,
    minPoolSize: 1,
    reconnectInterval: 1000,
    reconnectTries: 5
}

class Pool {
    #connections: Map<string, mongoose.Connection> = new Map();
    readonly #mongoURI: string
    readonly #modelsPaths: string | Array<string>

    constructor(configs: RequiredConfig) {
        this.#mongoURI = configs.mongoUri
        this.#modelsPaths = configs.modelsPaths
    }


    #has(origin: string): boolean {
        return this.#connections.has(origin)
    }

    #add(origin: string) {
        const conn = mongoose.createConnection(`${this.#mongoURI}/${origin}`)
        this.#connections.set(origin, conn);
        walk("yay")
    }

    async connect(origin: string): Promise<mongoose.Connection> {
        if (!this.#has(origin)) {
            this.#add(origin);
        }
        return this.#connections.get(origin) as mongoose.Connection;
    }
}

const Middleware = (configs: OptionalConfig & RequiredConfig) => {
    const finalConfigs: Config = {...defaultConfig, ...configs}
    const pool = new Pool(configs)

    return async (req: Request, res: Response, next: NextFunction) => {
        const origin = finalConfigs.getOrigin(req);
        const tenant = await pool.connect(origin)
        Object.assign(req, {tenant})

        return next();
    }
}


export default Middleware