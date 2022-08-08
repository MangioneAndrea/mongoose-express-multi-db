import * as express from "express"
import * as request from 'supertest';
import {strict as assert} from "assert";
import type {Server} from "http"
import mongoose from "mongoose";
import {MongoMemoryServer} from 'mongodb-memory-server';

import type Simple from "./models/SimpleModel";
import {ExportingType} from "./models/ExportingTypeModel"
import {Tenant} from "../src"
import {createOpenGetRequest, exampleServer, killReferences} from "./util";

type KnownModels = {
    Simple: typeof Simple,
    ExportingType: ExportingType
}

declare global {
    namespace Express {
        interface Request {
            tenant: Tenant<KnownModels>
        }
    }
}

let server: Server;
let mongod: MongoMemoryServer
let app: express.Express
let req: express.Request
let res: express.Response

describe("tenant", () => {

    before(async () => {
        [mongod, app, server] = await exampleServer();
        [req, res] = await createOpenGetRequest(app);
    })


    it("has the tenant in the request", () => {
        assert("tenant" in req)
    })
    it("resolves the name as localhost", () => {
        assert.equal(req.tenant.name, "localhost")
    })
    it("has the simple model", () => {
        assert(req.tenant.models.has("Simple"))
    })
    it("has the js model", () => {
        assert(req.tenant.models.has("Js"))
    })
    it("has the nested model", () => {
        assert(req.tenant.models.has("Nested"))
    })


    it("has compiled the simple model, so findOne is defined", () => {
        assert(req.tenant.getModel("Simple").findOne)
    })

    it("compiles with the element type if the given type is a model", async () => {
        const el = await req.tenant.getModel("Simple").findOne().lean()
        el?._id
    })

    it("compiles with the element type if the given type is a type", async () => {
        const el = await req.tenant.getModel("ExportingType").findOne().lean()
        el?._id
    })


    after(() => {
        killReferences(res, server, mongod);
    })
})