import mongoose, {Schema} from "mongoose";

const NestedSchema = new Schema({
    example: {
        type: String
    }
})

const NestedModel = mongoose.model("Nested", NestedSchema);

export default NestedModel;