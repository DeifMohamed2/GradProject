const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const attendanceSchema = new Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        required: true,
        enum: ['absent', 'late', 'present', 'PRESENT', 'ABSENT', 'LATE', 'MISMATCH']
    },
    verificationMethod: {
        type: String,
        enum: ['RFID_ONLY', 'FACE_ONLY', 'DUAL_FACTOR'],
        default: 'DUAL_FACTOR'
    },
    faceConfidence: {
        type: Number,
        default: 0
    },
    verificationDetails: {
        rfidVerified: {
            type: Boolean,
            default: false
        },
        faceVerified: {
            type: Boolean,
            default: false
        },
        matchedPhotoId: {
            type: String,
            default: null
        }
    },
    retryCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;