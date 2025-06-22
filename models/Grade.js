const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const gradeSchema = new Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    semester: {
        type: Number,
        required: true,
        enum: [1, 2]
    },
    academicYear: {
        type: String,
        required: true
    },
    teacher: {
        type: String,
        required: false
    },
    letterGrade: {
        type: String,
        required: false
    },
    overallPercentage: {
        type: Number,
        required: false
    },
    midterms: [{
        name: String,
        date: Date,
        score: Number,
        maxScore: Number
    }],
    quizzes: [{
        name: String,
        date: Date,
        score: Number,
        maxScore: Number
    }],
    assignments: [{
        name: String,
        date: Date,
        score: Number,
        maxScore: Number
    }],
    classParticipation: {
        score: Number,
        maxScore: Number
    },
    finalExam: {
        date: Date,
        score: Number,
        maxScore: Number,
        status: {
            type: String,
            enum: ['Pending', 'Completed'],
            default: 'Pending'
        }
    },
    gradeProgress: [{
        date: Date,
        percentage: Number
    }]
}, { timestamps: true });

const Grade = mongoose.model('Grade', gradeSchema);

module.exports = Grade;
