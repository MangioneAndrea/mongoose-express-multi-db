import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    firstname: {
        type: String
    },
    lastname: {
        type: String
    }
})

const UserModel = mongoose.model("Users", UserSchema);

export default UserModel;