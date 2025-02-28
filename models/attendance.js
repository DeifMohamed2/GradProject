const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const attendanceSchema = new Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    },
    date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['absent', 'late', 'present']
    }
}, { timestamps: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;