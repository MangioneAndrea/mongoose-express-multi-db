import mongoose, {Schema} from "mongoose";

export type ExportingType = {
    example: string
}

const ExportingTypeSchema = new Schema<ExportingType>({
    example: {
        type: String
    }
})
const ExportingTypeModel = mongoose.model("ExportingType", ExportingTypeSchema);

export default ExportingTypeModel;