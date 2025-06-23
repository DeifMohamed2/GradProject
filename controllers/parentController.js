const Parent = require('../models/parent');
const Student = require('../models/student');
const Attendance = require('../models/attendance');
const Expense = require('../models/expenses');
const Grade = require('../models/Grade');
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


const sendMoney = async (req,res) =>{
    const {studentId} = req.params;
    const {amount , pinCode} = req.body;
    const parent = req.parent;

      const transaction = await Transaction.create({
              amount,
              type: 'credit',
              student: studentId,
              status: 'pending'
            });


    if(!amount || !pinCode){
        transaction.status = 'failed';
        await transaction.save();
        return res.status(400).json({message: 'All fields are required'});
    }


    if(parent.pinCode !== pinCode){
        transaction.status = 'failed';
        await transaction.save();
        return res.status(400).json({message: 'Invalid pin code'});
    }


    if(parent.balance < amount){
        transaction.status = 'failed';
        await transaction.save();
        return res.status(400).json({message: 'Insufficient balance'});
    }



    try {
        const student = await Student.findById(studentId);
        if(!student){
            transaction.status = 'failed';
            await transaction.save();
            return res.status(404).json({message: 'Student not found'});
        }

        
        transaction.status = 'completed';
        await transaction.save();

        parent.balance -= amount;
        student.balance += amount;
        

        parent.transactionHistory.push(transaction._id);
        
        await parent.save();
        await student.save();

        return res.status(200).json({message: 'Money sent successfully', transaction});

      } catch (error) {
        console.error(error);
        return res.status(500).json({message: false});
      }

}

const updateProfile = async (req, res) => {
  const { parent } = req;
  const { username, email, phoneNumber, age, profilePicture } = req.body;


  try {
    const updatedParent = await Parent.findByIdAndUpdate(
      parent._id,
      { username : username||parent.username
      , email : email||parent.email
      , phoneNumber : phoneNumber||parent.phoneNumber
      , age : age||parent.age
      , profilePicture : profilePicture||parent.profilePicture
      },
      { new: true }
    );
    

    return res.status(200).json({ message: 'Profile updated successfully', parent: updatedParent });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: false });
  }
}



const forgetPassword = async (req, res) => {
  const { email } = req.body;
  const parent = await Parent.findOne({ email });
  if (!parent) {
    return res.status(404).json({ message: 'Parent not found' });
  }

  const pinAuth = Math.floor(10000 + Math.random() * 90000);
  parent.pinAuth = pinAuth;
  await parent.save();

  const token = jwt.sign({ parentId: parent._id }, jwtSecret);

  // Send email to parent
  return res.status(200).json({ message: 'Email sent successfully', pinAuth, token });
};


const updatePassword = async (req, res) => {
  const { password, pinAuth } = req.body;
  const parent = req.parent;

  if (parent.pinAuth !== pinAuth) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  parent.password = hashedPassword;

  parent.pinAuth = false;
  await parent.save();

  return res.status(200).json({ message: 'Password updated successfully' });
};


const getStudentAllData = async (req, res) => {
  const { parent } = req;
  const { id } = req.params;
  try {
    if (!parent.childs.includes(id)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const studentData = await Student.findById(id)
      .populate('attendances')
      .populate('expenses')
      .populate('Grades')
      .exec();

    if (!studentData) {
      return res.status(404).json({ message: 'Student not found' });
    }

    return res
      .status(200)
      .json({
        message: 'Student data fetched successfully',
        student: studentData,
      });
  } catch (error) {
    console.error(error);

    return res.status(500).json({ message: false });
  }
};


const updatePinCode = async (req, res) => {
  const { parent } = req;
  const { pinCode1, pinCode2 } = req.body;

  try {
    if(pinCode1.length<6 || pinCode2.length<6){
      return res.status(400).json({ message: 'Pin code must be 6 characters' });
    }
    if (!pinCode1 || !pinCode2) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (pinCode1 === parent.pinCode) {
      return res.status(400).json({ message: 'New pin code cannot be same as old pin code' });
    }

    if(pinCode1 == pinCode2){
      parent.pinCode = pinCode1;    

    await parent.save();
    return res.status(200).json({ message: 'Pin code updated successfully' });
  }else{
    return res.status(400).json({ message: 'Pin code not match' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: false });
  }
}

// Get pending transactions for parent
const getPendingTransactions = async (req, res) => {
  const { parent } = req;
  
  try {
    // Populate parent with transaction history
    await parent.populate({
      path: 'transactionHistory',
      match: { status: 'pending' },
      options: { sort: { createdAt: -1 } }
    });

    // Filter to only include pending transactions
    const pendingTransactions = parent.transactionHistory || [];
    
    return res.status(200).json({ 
      success: true, 
      transactions: pendingTransactions,
      message: 'Pending transactions retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting pending transactions:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve pending transactions',
      error: error.message
    });
  }
};

// Approve a pending transaction
const approveTransaction = async (req, res) => {
  const { parent } = req;
  const { transactionId } = req.params;
  const { pinCode } = req.body;
  
  try {
    // Validate pin code
    if (!pinCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Pin code is required' 
      });
    }
    
    if (parent.pinCode !== pinCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid pin code' 
      });
    }
    
    // Find the transaction
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction not found' 
      });
    }
    
    // Verify transaction belongs to this parent
    if (transaction.parent.toString() !== parent._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not authorized to approve this transaction' 
      });
    }
    
    // Verify transaction is still pending
    if (transaction.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Transaction cannot be approved as it is already ${transaction.status}` 
      });
    }
    
    // Calculate new balance based on transaction type
    let newBalance = parent.balance || 0;
    if (transaction.type === 'deposit') {
      newBalance += transaction.amount;
    } else if (transaction.type === 'withdrawal') {
      // Ensure parent has sufficient balance
      if (newBalance < transaction.amount) {
        return res.status(400).json({ 
          success: false, 
          message: 'Insufficient balance to approve this withdrawal' 
        });
      }
      newBalance -= transaction.amount;
    }
    
    // Update transaction status
    transaction.status = 'approved';
    await transaction.save();
    
    // Update parent balance
    parent.balance = newBalance;
    await parent.save();
    
    return res.status(200).json({ 
      success: true, 
      transaction,
      newBalance,
      message: 'Transaction approved successfully' 
    });
    
  } catch (error) {
    console.error('Error approving transaction:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to approve transaction',
      error: error.message
    });
  }
};

// Reject a pending transaction
const rejectTransaction = async (req, res) => {
  const { parent } = req;
  const { transactionId } = req.params;
  const { pinCode, reason } = req.body;
  
  try {
     // Validate pin code
    if (!pinCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Pin code is required' 
      });
    }
    
    if (parent.pinCode !== pinCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid pin code' 
      });
    }
  

    // Find the transaction
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction not found' 
      });
    }
    
    // Verify transaction belongs to this parent
    if (transaction.parent.toString() !== parent._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not authorized to reject this transaction' 
      });
    }
    
    // Verify transaction is still pending
    if (transaction.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Transaction cannot be rejected as it is already ${transaction.status}` 
      });
    }
    
    // Update transaction status and reason
    transaction.status = 'rejected';
    if (reason) {
      transaction.reason = reason;
    }
    await transaction.save();
    
    return res.status(200).json({ 
      success: true, 
      transaction,
      message: 'Transaction rejected successfully' 
    });
    
  } catch (error) {
    console.error('Error rejecting transaction:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to reject transaction',
      error: error.message
    });
  }
};

// Get student grades
const getStudentGrades = async (req, res) => {
  const { parent } = req;
  const { id: studentId } = req.params;

  // Check if the student is a child of this parent
  const isParentChild = parent.childs.some(child => child.toString() === studentId);
  if (!isParentChild) {
    return res.status(403).json({ message: 'Unauthorized access' });
  }

  try {
    // Get the student with populated grades
    const student = await Student.findById(studentId)
      .populate({
        path: 'Grades',
        select: 'subject semester academicYear teacher letterGrade overallPercentage midterms quizzes assignments classParticipation finalExam gradeProgress'
      })
      .exec();

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Group grades by subject
    const gradesBySubject = {};
    
    student.Grades.forEach(grade => {
      if (!gradesBySubject[grade.subject]) {
        gradesBySubject[grade.subject] = [];
      }
      gradesBySubject[grade.subject].push(grade);
    });

    return res.status(200).json({
      message: 'Grades fetched successfully',
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        grade: student.grade,
        section: student.section,
        profilePicture: student.profilePicture
      },
      gradesBySubject
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Render student grades page
const renderStudentGrades = async (req, res) => {
  try {
    const { parent } = req;
    const { id: studentId } = req.params;

    // Check if the student is a child of this parent
    const isParentChild = parent.childs.some(child => child.toString() === studentId);
    if (!isParentChild) {
      return res.status(403).render('404', { message: 'Unauthorized access' });
    }

    // Get the student with populated grades
    const student = await Student.findById(studentId)
      .populate({
        path: 'Grades',
        select: 'subject semester academicYear teacher letterGrade overallPercentage midterms quizzes assignments classParticipation finalExam gradeProgress'
      })
      .exec();

    if (!student) {
      return res.status(404).render('404', { message: 'Student not found' });
    }

    // Group grades by subject
    const gradesBySubject = {};
    
    student.Grades.forEach(grade => {
      if (!gradesBySubject[grade.subject]) {
        gradesBySubject[grade.subject] = [];
      }
      gradesBySubject[grade.subject].push(grade);
    });

    return res.render('parent-student-grades', { 
      parent,
      student: {
        id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        grade: student.grade,
        section: student.section,
        profilePicture: student.profilePicture
      },
      gradesBySubject
    });
  } catch (error) {
    console.error(error);
    return res.status(500).render('404', { message: 'Server error' });
  }
};

module.exports = {
  loginParent,
  dashbard_get,
  getProfileData,
  getChildInsights,
  getWallet,
  sendMoney,
  updateProfile,
  forgetPassword,
  updatePassword,

  getStudentAllData,
  updatePinCode,
  getPendingTransactions,
  approveTransaction,
  rejectTransaction,
  getStudentGrades,
  renderStudentGrades
};