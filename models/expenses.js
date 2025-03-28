const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const expenseSchema = new Schema({

    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    },
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    }
}, { timestamps: true });

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;

