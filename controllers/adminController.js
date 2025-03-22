const Admin = require('../models/admin');
const Parent = require('../models/parent');
const Student = require('../models/student');
const Attendance = require('../models/attendance');
const Expense = require('../models/expenses');
const Transaction = require('../models/transaction');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const jwtSecret = process.env.JWT_SECRET;   



const creatAdminAccount = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
         const hashedPassword = await bcrypt.hash(password, 10);
            const admin = await Admin.create({ username, password: hashedPassword });
            const token = jwt.sign({ adminId: admin._id }, jwtSecret);
            res.cookie('token', token, { httpOnly: true });
            res.status(201).json({ message: 'Admin account created successfully' , admin , token }); 
        
    } catch (error) {
      console.log(error);
        res.status(500).json({ message: 'An error occurred' });
    }
    
}

const loginAdmin = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ adminId: admin._id }, jwtSecret);
        res.cookie('token', token, { httpOnly: true });
        return res.status(200).json({ message: 'Login successful' , admin , token });
    } catch (error) {
        return res.status(500).json({ message: 'An error occurred' });
    }
}

const createParentAccount = async (req, res) => {
  const { username, password, email, phoneNumber, age, balance } = req.body;

  if (!username || !password || !email || !phoneNumber || !age ) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const parent = await Parent.create({
      username,
      password: hashedPassword,
      email,
      phoneNumber,
      age,
      balance,
    });
    return res.status(201).json({ message: 'Parent account created successfully', parent });
  } catch (error) {
    if(error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
};

// create Student account and assoited with parent

const createStudentAccount = async (req, res) => {
  const { username, password, email, age, parent } = req.body;

  if (!username || !password || !email || !age || !parent) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const student = await Student.create({
      username,
      password: hashedPassword,
      email,
      age,
      parent,
      Code: Math.floor(Math.random() * (5000 - 1000 + 1)) + 1000,
    });

    await Parent.findByIdAndUpdate(parent, { $push: { childs: student._id } });

    return res.status(201).json({ message: 'Student account created successfully', student });
  } catch (error) {
    if(error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
}


// const addTestAttendance = async (req, res) => {
//   try {
//     const studentId = '67c1e287a73179097a18b970';
//     const testAttendances = [
//       { student: studentId, date: new Date(), status: 'present' },
//       { student: studentId, date: new Date(), status: 'present' },
//       { student: studentId, date: new Date(), status: 'absent' },
//       { student: studentId, date: new Date(), status: 'late' },
//       { student: studentId, date: new Date(), status: 'present' },
//       { student: studentId, date: new Date(), status: 'absent' },
//       { student: studentId, date: new Date(), status: 'late' },
//       { student: studentId, date: new Date(), status: 'present' },
//       { student: studentId, date: new Date(), status: 'present' },
//       { student: studentId, date: new Date(), status: 'absent' },
//     ];

//     const testExpenses = [
//       { student: studentId, amount: 150, type: 'books', status: 'paid' },
//       { student: studentId, amount: 75, type: 'uniform', status: 'unpaid' },
//       { student: studentId, amount: 250, type: 'tuition', status: 'paid' },
//       { student: studentId, amount: 100, type: 'transportation', status: 'unpaid' },
//     ];

//     const createdExpenses = await Expense.insertMany(testExpenses);
//     const createdAttendances = await Attendance.insertMany(testAttendances);

//     await Student.findByIdAndUpdate(studentId, {
//       $push: {
//         expenses: { $each: createdExpenses.map(expense => expense._id) },
//         attendances: { $each: createdAttendances.map(attendance => attendance._id) },
//       },
//     });

//     // return res.status(200).json({ message: 'Test data added successfully' });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ message: 'An error occurred', error: error.message });
//   }
// };

// const addTestTransactions = async (req, res) => {
//   try {
//     const parentId = '67c1e2afa73179097a18b974';
//     const testTransactions = [
//       { student: parentId, amount: 100, type: 'deposit', status: 'completed' },
//       { student: parentId, amount: 50, type: 'withdrawal', status: 'pending' },
//       { student: parentId, amount: 200, type: 'deposit', status: 'completed' },
//       { student: parentId, amount: 75, type: 'withdrawal', status: 'failed' },
//       { student: parentId, amount: 150, type: 'deposit', status: 'completed' },
//       { student: parentId, amount: 25, type: 'withdrawal', status: 'pending' },
//       { student: parentId, amount: 300, type: 'deposit', status: 'completed' },
//       { student: parentId, amount: 100, type: 'withdrawal', status: 'failed' },
//     ];

//     const createdTransactions = await Transaction.insertMany(testTransactions);

//     await Parent.findByIdAndUpdate('67c1e201a73179097a18b96d', {
//       $push: {
//         transactionHistory: { $each: createdTransactions.map(transaction => transaction._id) },
//       },
//     });

//     return res.status(200).json({ message: 'Test transactions added successfully' });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ message: 'An error occurred', error: error.message });
//   }
// };


// addTestAttendance();

// addTestTransactions();

module.exports = {
  creatAdminAccount,
  loginAdmin,
  createParentAccount,
  createStudentAccount,
};