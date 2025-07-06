const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Parent',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: false
    }
})

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;