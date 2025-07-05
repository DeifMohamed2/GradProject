const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const classSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true
    },
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    }],
    attendanceSessions: [{
        date: {
            type: Date,
            required: true
        },
        attendances: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Attendance'
        }]
    }],
    quizzes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz'
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    hasRaspberryDevice: {
        type: Boolean,
        default: false
    },
    deviceInfo: {
        name: {
            type: String,
            default: ''
        },
        ipAddress: {
            type: String,
            default: ''
        }
    }
}, { timestamps: true });

const Class = mongoose.model('Class', classSchema);

module.exports = Class;
