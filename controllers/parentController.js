const Parent = require('../models/parent');
const Attendance = require('../models/attendance');
const Expense = require('../models/expenses');
const Transaction = require('../models/transaction');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const jwtSecret = process.env.JWT_SECRET;   


const loginParent =async (req,res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: false });
  }

  try {
      const parent = await Parent.findOne({ email });
      
      if (!parent) {
          return res.status(400).json({ message: false });
      }

      const isMatch = await bcrypt.compare(password, parent.password);
      if (!isMatch) {
          return res.status(400).json({ message: false });
      }

      const token = jwt.sign({ parentId: parent._id }, jwtSecret);
      res.cookie('token', token, { httpOnly: true });
      return res.status(200).json({ message: true , parent , token });
  } catch (error) {
      return res.status(500).json({ message: false});
  }
}


const getProfileData = async (req,res) => {
  return res.status(200).json({ message: 'Profile data fetched successfully' , parent: req.parent });
}

// DahsBoard 

const dashbard_get = async (req,res) => {
  const parent = req.parent;
  try {
    const students = await Parent.findById(
      parent._id,
      'childs'
    )
      .populate('childs', 'username email profilePicture')
      .exec();
    return res
      .status(200)
      .json({
        message: 'Dashboard data fetched successfully',
        parent: {
          _id : parent._id,
          username: parent.username,
          email: parent.email,
          profilePicture: parent.profilePicture,
        } ,
        childs: students.childs,
      });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: false });
  }
}

const getChildInsights = async (req, res) => {
  const { parent } = req;
  const { id: studentId } = req.params;

  const student = parent.childs.find(child => child.toString() === studentId);
  if (!student) {
    return res.status(403).json({ message: 'Unauthorized access' });
  }

  try {
    const studentData = await Parent.findById(parent._id)
      .populate({
        path: 'childs',
        match: { _id: studentId },
        populate: [
          { path: 'attendances', select: 'status' },
          { path: 'expenses', select: 'amount' },
        ],
      })
      .exec();

    if (!studentData || !studentData.childs.length) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const child = studentData.childs[0];
    const totalExpenses = child.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const attendanceStats = child.attendances.reduce(
      (acc, attendance) => {
        acc[`total${attendance.status.charAt(0).toUpperCase() + attendance.status.slice(1)}`]++;
        return acc;
      },
      { totalAbsent: 0, totalLate: 0, totalPresent: 0 }
    );

    return res.status(200).json({
      message: 'Child insights fetched successfully',
      ...attendanceStats,
      totalExpenses,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: false });
  }
};

// End DahsBoard 

// start wallet

const getWallet = async (req, res) => {
  const { parent } = req;
  try {
    const parentData = await Parent.findById(
      parent._id,
      'childs transactionHistory balance username profilePicture'
    )
      .populate({
        path: 'childs',
        select: 'username profilePicture balance',
    
      })
      .populate({
        path: 'transactionHistory',
        select: 'amount type',
        populate: { path: 'student', select: 'username profilePicture' },
      })
      .exec();
    if (!parentData) {
      return res.status(404).json({ message: 'Parent not found' });
    }


    return res
      .status(200)
      .json({ message: 'Wallet data fetched successfully', parent: parentData });
  }
  catch (error) {
    console.error(error);
    return res.status(500).json({ message: false });
  }
}


module.exports = {
  loginParent,
  dashbard_get,
  getProfileData,
  getChildInsights,
  getWallet,
};