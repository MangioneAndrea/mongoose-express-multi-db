import express, {Express} from "express"
import mongooseMiddleware from "../src"

const exampleServer = () => new Promise<Express>((resolve) => {
    const app = express()
    app.use(mongooseMiddleware({mongoUri: "", modelsPaths: ""}))
    app.get("/test", (req, res) => {

    })

    app.listen("4386", () => resolve(app));
})

describe("middleware", async () => {
    const app = await exampleServer();
})