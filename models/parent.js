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

    email: {
        type: String,
        required: false
    },

    phoneNumber: {
        type: String,
        required: true
    },

    age: {
        type: Number,
        required:false,
    },

    childs:[{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],

    transactionHistory : [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }],
    
    messageHistory : [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],

    balance: {
        type: Number,
        required: true
    }


}, { timestamps: true });

const Parent = mongoose.model('Parent', parentSchema);

module.exports = Parent;
