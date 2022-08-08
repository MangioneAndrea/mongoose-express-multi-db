import {Server} from "http"
import {createOpenGetRequest, exampleServer, killReferences} from "./util";
import {MongoMemoryServer} from "mongodb-memory-server";
import * as express from "express"
import * as assert from "assert"

let server: Server | undefined
let mongod: MongoMemoryServer | undefined
let app: express.Express | undefined
let req: express.Request | undefined
let res: express.Response | undefined

describe("connection", () => {
    it.skip("throws an error if ensureDbExists is true and the given db does not exist", async () => {
        [mongod, app, server] = await exampleServer(true)
        await assert.rejects(createOpenGetRequest(app))
    })

    it("does not throw an error if ensureDbExists is false and the given db does not exist", async () => {
        [mongod, app, server] = await exampleServer(false)
        await assert.doesNotReject((async () => {
            [req, res] = await createOpenGetRequest(app);
        })());
    })

    afterEach(() => {
        killReferences(res, server, mongod);
    })
})