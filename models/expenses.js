const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const expenseSchema = new Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    description: {
        type: String,
        default: 'School Fee'
    },
    amount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    type: {
        type: String,
        enum: ['tuition', 'books', 'transportation', 'meal', 'uniform', 'activity', 'other'],
        default: 'tuition'
    },
    status: {
        type: String,
        enum: ['paid', 'pending', 'overdue'],
        required: true,
        default: 'pending'
    }
}, { timestamps: true });

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;

