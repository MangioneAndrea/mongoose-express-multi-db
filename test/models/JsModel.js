import mongoose, {Schema} from "mongoose";

const JsSchema = new Schema({
    example: {
        type: String
    }
})

const JsModel = mongoose.model("Js", JsSchema);

export default JsModel;