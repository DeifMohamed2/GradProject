const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const gradeSchema = new Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    },
    subject: {
        type: String,
        required: true
    },
    grade: {
        type: Number,
        required: true
    }
}, { timestamps: true });

const Grade = mongoose.model('Grade', gradeSchema);

module.exports = Grade;
