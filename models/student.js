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
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    age: {
      type: Number,
      required: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: true,
    },
    studentCode: {
      type: String,
      unique: true,
      default: function() {
        return Math.floor(1000000 + Math.random() * 9000000).toString();
      }
    },
    rollNumber: {
      type: String,
      required: false,
    },
    enrollmentDate: {
      type: Date,
      default: Date.now,
    },
    grade: {
      type: Number, // 1-12 for grades 1-12
      required: true,
    },
    section: {
      type: String, // A, B, C, etc.
      required: true,
    },
    academicYear: {
      type: String, // e.g., "2023-2024"
      required: true,
    },
    classroom: {
      type: String, // e.g., "Room 101"
      required: false,
    },
    contactPhone: {
      type: String,
      required: false,
    },
    address: {
      type: String,
      required: false,
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
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
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: false,
    },
    medicalConditions: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Graduated', 'Transferred', 'Suspended'],
      default: 'Active',
    },
    Grades: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Grade' }],
    messageHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    attendances: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' }],
    expenses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Expense' }],
  },
  { timestamps: true }
);

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
