const mongoose = require("mongoose");

const JsSchema = new mongoose.Schema({
    example: {
        type: String
    }
})

const JsModel = mongoose.model("Js", JsSchema);

module.exports = JsModel;