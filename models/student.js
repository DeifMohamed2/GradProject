const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const studentSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    Code: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    age: {
      type: Number,
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Parent',
    },
    profilePicture: {
      type: String,
      required: false,
      default: '',
    },
    Grades : [{ type: mongoose.Schema.Types.ObjectId, ref: 'Grade' }],
    messageHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    attendances: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' }],
    expenses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Expense' }],
  },
  { timestamps: true }
);

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
