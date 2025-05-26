const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const quizSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true
    },
    maxScore: {
        type: Number,
        required: true,
        default: 100
    },
    dueDate: {
        type: Date,
        default: function() {
            // Default due date is 7 days from now
            const date = new Date();
            date.setDate(date.getDate() + 7);
            return date;
        }
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'closed'],
        default: 'published'
    },
    grades: [{
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student'
        },
        score: {
            type: Number,
            required: true
        },
        feedback: {
            type: String
        },
        submittedAt: {
            type: Date,
            default: Date.now
        }
    }],
    questions: [{
        text: String,
        options: [String],
        correctAnswer: String,
        points: Number
    }],
    submissions: [{
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student'
        },
        answers: [String],
        score: Number,
        submittedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;
