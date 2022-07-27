import * as express from "express"
import * as request from 'supertest';
import {strict as assert} from "assert";
import {Server} from "http"
import mongooseMiddleware from "../src"

process.on('uncaughtException', function (err) {
    console.error(`${(new Date()).toUTCString()}: uncaughtException: '${err.message}'. Stack Trace To Follow.`);
    console.error(err.stack);
    process.exit(1);
});

let server: Server;

const exampleServer = () => new Promise<express.Express>((resolve) => {
    const app = express()
    app.use(mongooseMiddleware({mongoUri: "mongodb://", modelsPaths: "models"}))


    server = app.listen("43826", () => resolve(app));
})

const getInsideRequest = (app: express.Express) => new Promise<[req: express.Request, res: express.Response]>(async (resolve) => {
    app.get("/example", (req, res) => {
        resolve([req, res])
    })
    await request(app).get("/example")
})

let app: express.Express

before(async () => {
    app = await exampleServer();
})


it("has the tenant in the request", async () => {
    const [req, res] = await getInsideRequest(app);
    assert("tenant" in req)
})




after(() => {
    server?.close();
})