const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    firstname: {
        type: String
    },
    lastname: {
        type: String
    }
})

const UserModel = mongoose.model("Users", UserSchema);

module.exports = UserModel;