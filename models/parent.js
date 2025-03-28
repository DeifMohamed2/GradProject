const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const parentSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    profilePicture :{
        type: String,
        required: false,
        default:'',
    },
    email: {
        type: String,
        required: false,
        unique: true
    },

    phoneNumber: {
        type: String,
        required: true
    },

    address: {
        type: String,
        required: false
    },

    age: {
        type: Number,
        required:false,
    },
    numberOfChildren: {
        type: Number,
        required: false
    },

    pinCode: {
        type: String,
        required: true
    },

    childs:[{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],

    transactionHistory : [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }],
    
    messageHistory : [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],

    balance: {
        type: Number,
        default: 0,
        required: true
    },

    pinAuth: {
        type: String,
        default: false
    }

}, { timestamps: true });

const Parent = mongoose.model('Parent', parentSchema);

module.exports = Parent;
