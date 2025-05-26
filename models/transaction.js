const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const transactionSchema = new Schema({
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Parent',
        required: false
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: false
    },
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['payment', 'withdrawal', 'deposit', 'credit', 'refund', 'fee']
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'approved', 'rejected', 'completed', 'failed'],
        default: 'pending'
    },
    description: {
        type: String,
        default: 'Transaction'
    },
    initiatedBy: {
        type: String,
        enum: ['admin', 'parent', 'system'],
        default: 'system'
    },
    reason: {
        type: String,
        default: ''
    }
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;