const express = require('express');
const Admin = require('../models/admin');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

const jwtSecret = process.env.JWT_SECRET;

const adminController = require('../controllers/adminController.js');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function(req, file, cb) {
    // Accept only Excel files
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'), false);
    }
  }
});

const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token;
  console.log(token);
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decode = jwt.verify(token, jwtSecret);
    req.adminId = decode.adminId;
    console.log(decode.adminId);
    const admin = await Admin.findOne({ _id: decode.adminId });

    if (admin) {
      req.admin = admin;
      next(); // Proceed to the next middleware/route handler
    } else {
        res.clearCookie('token');
        return res.status(401).json({ message: 'Unauthorized' });   
    }
  } catch (error) {
    res.clearCookie('token');
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

// ===== Authentication Routes =====
// Render the admin login page
router.get('/login', (req, res) => {
  res.render('admin-login');
});

// Login POST request
router.post('/login', adminController.loginAdmin);

// Create admin account
router.post('/createAccount', adminController.creatAdminAccount);

// ===== Dashboard Routes =====
// Dashboard route (protected)
router.get('/dashboard', authMiddleware, adminController.getDashboardData);

// ===== Student Management Routes =====
// Students list page
router.get('/students', authMiddleware, adminController.getAllStudents);

// Student details page
router.get('/students/:id', authMiddleware, adminController.getStudentDetails);

// Create student account page
router.get('/create-student', authMiddleware, (req, res) => {
  res.render('admin-create-student', { admin: req.admin });
});

// Create student API
router.post('/createStudentAccount', authMiddleware, adminController.createStudentAccount);

// Update student
router.put('/students/:id', authMiddleware, adminController.updateStudent);

// Delete student
router.delete('/students/:id', authMiddleware, adminController.deleteStudent);

// Upload students from Excel
router.post('/upload-students', authMiddleware, upload.single('excelFile'), adminController.uploadStudentsFromExcel);

// ===== Parent Management Routes =====
// Parents list page
router.get('/parents', authMiddleware, adminController.getAllParents);

// Parent details page
router.get('/parents/:id', authMiddleware, adminController.getParentDetails);

// Create parent account page
router.get('/create-parent', authMiddleware, (req, res) => {
  res.render('admin-create-parent', { admin: req.admin });
});

// Create parent API
router.post('/createParentAccount', authMiddleware, adminController.createParentAccount);

// Update parent
router.put('/parents/:id', authMiddleware, adminController.updateParent);

// Delete parent
router.delete('/parents/:id', authMiddleware, adminController.deleteParent);

// Update parent balance
router.post('/parents/:id/balance', authMiddleware, adminController.updateParentBalance);

// Link children with parent page
router.get('/link-children', authMiddleware, (req, res) => {
  res.render('admin-link-children', { admin: req.admin });
});

// Link children with parent API
router.post('/link-childswithparent', authMiddleware, adminController.linkChildsWithParent);

// ===== Expense Management Routes =====
// Get expense by ID
router.get('/expenses/:id', authMiddleware, adminController.getExpenseById);

// Create expense
router.post('/expenses', authMiddleware, adminController.createExpense);

// Update expense
router.put('/expenses/:id', authMiddleware, adminController.updateExpense);

// Mark expense as paid
router.put('/expenses/:id/mark-paid', authMiddleware, adminController.markExpenseAsPaid);

// Delete expense
router.delete('/expenses/:id', authMiddleware, adminController.deleteExpense);

// Expenses dashboard page
router.get('/expenses', authMiddleware, adminController.getExpensesDashboard);

// ===== Grades Management Routes =====
// Grades dashboard page
router.get('/grades', authMiddleware, adminController.getGradesDashboard);

// Get grade by ID
router.get('/grades/:id', authMiddleware, adminController.getGradeById);

// Create grade
router.post('/grades', authMiddleware, adminController.createGrade);

// Update grade
router.put('/grades/:id', authMiddleware, adminController.updateGrade);

// Delete grade
router.delete('/grades/:id', authMiddleware, adminController.deleteGrade);

// ===== Attendance Management Routes =====
// Attendance dashboard page
router.get('/attendance', authMiddleware, adminController.getAttendanceDashboard);

// Get attendance by ID
router.get('/attendance/:id', authMiddleware, adminController.getAttendanceById);

// Create attendance
router.post('/attendance', authMiddleware, adminController.createAttendance);

// Update attendance
router.put('/attendance/:id', authMiddleware, adminController.updateAttendance);

// Delete attendance
router.delete('/attendance/:id', authMiddleware, adminController.deleteAttendance);

module.exports = router;







