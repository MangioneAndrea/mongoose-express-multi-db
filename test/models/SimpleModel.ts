import mongoose, {Schema} from "mongoose";

export type SimpleType = {
    example: string
}

const SimpleSchema = new Schema({
    example: {
        type: String
    }
})
const SimpleModel = mongoose.model("Simple", SimpleSchema);

export default SimpleModel;