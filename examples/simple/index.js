const express = require("express")
const bp = require("body-parser");
const mongooseMiddleware = require("mongoose-express-multi-db").default
const app = express();

const URI = "mongodb://localhost:27017"
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
        res.json({error: error.message})
    }
})

app.get("/user", async (req, res) => {
    try {
        const _id = req.param("_id");
        const user = await req.tenant.getModel("Users").findById(_id).lean()
        res.json({user})
    } catch (error) {
        res.json({error: error.message})
    }
})

server = app.listen("1234", () => {
    console.log(`App listening under ${PORT}`)
});