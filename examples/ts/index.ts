import * as express from "express";
import * as bp from "body-parser" ;
import mongooseMiddleware, {Tenant} from "mongoose-express-multi-db"
import KnownModels from "./models";

declare global {
    namespace Express {
        interface Request {
            tenant: Tenant<KnownModels>
        }
    }
}

const app = express();

const URI = "mongodb+srv://andrea:WGWnZVmN2f6gxZD8@eu1.qaewz.mongodb.net"
const PORT = "1234"
app.use(bp.json())
app.use(bp.urlencoded())
app.use(mongooseMiddleware({
    mongoUri: URI,
    modelsPaths: __dirname + "/models"
}))


app.post("/user", async (req, res) => {
    try {
        const {firstname, lastname} = req.body;
        const {_id} = await req.tenant.getModel("Users").create({firstname, lastname});
        res.json({_id})

    } catch (error) {
        res.json({error: (error as Error).message})
    }
})

app.get("/user", async (req, res) => {
    try {
        const {_id} = req.query as { _id: string };
        const user = await req.tenant.getModel("Users").findById(_id).lean()
        res.json({user})
    } catch (error) {
        res.json({error: (error as Error).message})
    }
})

app.listen("1234", () => {
    console.log(`App listening under ${PORT}`)
});