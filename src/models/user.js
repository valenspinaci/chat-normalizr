import mongoose from "mongoose";

const userCollection = "users";
const userSchema = new mongoose.Schema({
    mail:{
        type:String,
        require: true 
    },
    password:{
        type: String,
        require:true
    },
    name:{
        type: String,
        require: true
    },
    direction:{
        type: String,
        require: true
    },
    age:{
        type:Number,
        require:true
    },
    phone:{
        type:String,
        require:true
    }
})

export const userModel = mongoose.model(userCollection, userSchema);