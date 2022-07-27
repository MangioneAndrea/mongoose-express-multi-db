import mongoose, {Schema} from "mongoose";

const SimpleSchema = new Schema({
    example: {
        type: String
    }
})
const SimpleModel = mongoose.model("Simple", SimpleSchema);

export default SimpleModel;