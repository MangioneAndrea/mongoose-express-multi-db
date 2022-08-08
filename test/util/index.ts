import * as express from "express";
import * as http from "http";
import {MongoMemoryServer} from "mongodb-memory-server";
import mongooseMiddleware, {killMiddlewareConnections} from "../../src";
import * as request from "supertest";
import mongoose from "mongoose";

let Port = 4001

export const exampleServer = (ensureDbExists = false) => new Promise<[MongoMemoryServer, express.Express, http.Server]>(async (resolve) => {
    let mongod: MongoMemoryServer | undefined
    let server: http.Server | undefined
    try {
        mongod = await MongoMemoryServer.create();

        const uri = mongod.getUri();
        const app = express()

        app.use(mongooseMiddleware({
            mongoUri: uri,
            modelsPaths: __dirname + "/../models",
            ensureDbExists
        }))

        server = app.listen(Port++, () => resolve([mongod!, app, server!]));
        server.addListener("close", () => killMiddlewareConnections(app).catch(console.error))

    } catch (e) {
        killReferences(undefined, server, mongod)
        throw e;
    }
})


// Create a long term request to be killed at the end of thetests
export const createOpenGetRequest: (app: express.Express) => Promise<[req: express.Request, res: express.Response]> = (app) => new Promise(async (resolve, reject) => {
    app.get("/example", (req, res) => {
        resolve([req, res])
    })

    const getRequest = request(app).get("/example")
    // @ts-ignore
    await getRequest.then(({error, res}) => {
        if (error) {
            reject(error)
        }
    })
})

export const killReferences = (res?: express.Response, server?: http.Server, mongod?: MongoMemoryServer) => {
    // Close the express request
    res?.end()
    // Clear mongoose references when running test:dev
    Object.keys(mongoose.models).forEach((m) => {
        delete mongoose.models[m]
    })
    // Stop listening to requests
    server?.close();
    // Kill mongodb
    mongod?.stop({doCleanup: true, force: true}).finally(console.error)
}