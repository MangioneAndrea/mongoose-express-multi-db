import {Server} from "http"
import {createOpenGetRequest, exampleServer, killReferences} from "./util";
import {MongoMemoryServer} from "mongodb-memory-server";
import * as express from "express"
import * as assert from "assert"


describe("connection", () => {
    let server: Server | undefined
    let mongod: MongoMemoryServer | undefined
    let app: express.Express | undefined
    let req: express.Request | undefined
    let res: express.Response | undefined
    it("does not throw an error if ensureDbExists is false and the given db does not exist", async () => {
        [mongod, app, server] = await exampleServer(false)
        await assert.doesNotReject((async () => {
            [req, res] = await createOpenGetRequest(app);
        })());
    })
    it("throws an error if ensureDbExists is true and the given db does not exist", async () => {
        [mongod, app, server] = await exampleServer(true)
        await assert.rejects(createOpenGetRequest(app))
    })


    afterEach(() => {
        killReferences(res, server, mongod);
    })
})

// This is a workaround for superset as it stays alive if an error is thrown :(
setTimeout(function () {
    process.exit(0) // logs out active handles that are keeping node running
}, 5000)

