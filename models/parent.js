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
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    profilePicture: {
        type: String,
        required: false,
        default: '',
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    alternatePhone: {
        type: String,
        required: false
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    dateOfBirth: {
        type: Date,
        required: false
    },
    age: {
        type: Number,
        required: true
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: false
    },
    occupation: {
        type: String,
        required: false
    },
    workplaceInfo: {
        companyName: String,
        position: String,
        address: String,
        phone: String
    },
    education: {
        type: String,
        required: false
    },
    maritalStatus: {
        type: String,
        enum: ['Single', 'Married', 'Divorced', 'Widowed'],
        default: 'Married'
    },
    spouseInfo: {
        name: String,
        phoneNumber: String,
        email: String,
        occupation: String
    },
    relationshipToStudent: {
        type: String,
        enum: ['Father', 'Mother', 'Guardian', 'Other'],
        default: 'Parent'
    },
    preferredContactMethod: {
        type: String,
        enum: ['Email', 'Phone', 'SMS', 'WhatsApp'],
        default: 'Email'
    },
    numberOfChildren: {
        type: Number,
        required: false
    },
    pinCode: {
        type: String,
        required: false
    },
    childs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
    transactionHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }],
    messageHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    balance: {
        type: Number,
        default: 0,
        required: true
    },
    pinAuth: {
        type: String,
        default: false
    },
    emergencyContact: {
        name: String,
        relationship: String,
        phone: String
    },
    notes: {
        type: String,
        required: false
    },
    parentCode: {
        type: String,
        unique: true,
        default: function() {
            return Math.floor(1000000 + Math.random() * 9000000).toString();
        }
    }
}, { timestamps: true });

const Parent = mongoose.model('Parent', parentSchema);

module.exports = Parent;

