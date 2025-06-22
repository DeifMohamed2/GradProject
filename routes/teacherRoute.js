const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const jwt = require('jsonwebtoken');
const Teacher = require('../models/teacher');

// Middleware to authenticate teacher
const requireTeacherAuth = async (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.redirect('/teacher/login');
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    const decoded = jwt.verify(token, jwtSecret);

    if (!decoded.teacherId) {
      res.clearCookie('token');
      return res.redirect('/teacher/login');
    }

    const teacher = await Teacher.findById(decoded.teacherId);
    if (!teacher) {
      res.clearCookie('token');
      return res.redirect('/teacher/login');
    }

    req.teacher = teacher;
    next();
  } catch (error) {
    console.error(error);
    res.clearCookie('token');
    return res.redirect('/teacher/login');
  }
};

// Login page route
router.get('/login', (req, res) => {
  res.render('teacher-login');
});

// Public routes
router.post('/login', teacherController.loginTeacher);
router.post('/logout', teacherController.logoutTeacher);

// Dashboard route
router.get('/dashboard', requireTeacherAuth, teacherController.getDashboard);

// Protected routes
router.get('/profile', requireTeacherAuth, teacherController.getProfile);
router.put('/profile', requireTeacherAuth, teacherController.updateProfile);

// Classes routes
router.get('/classes', requireTeacherAuth, teacherController.getClasses);
router.get('/classes/:classId', requireTeacherAuth, teacherController.getClassDetails);
router.get('/classes/:classId/quizzes', requireTeacherAuth, teacherController.getClassQuizzesView);

// Attendance routes
router.get('/attendance', requireTeacherAuth, teacherController.getAttendanceView);
router.get('/attendance/create', requireTeacherAuth, teacherController.getCreateAttendanceView);
router.post('/classes/:classId/attendance', requireTeacherAuth, teacherController.createAttendanceSession);
router.post('/classes/:classId/sessions/:sessionId/students/:studentId', requireTeacherAuth, teacherController.markAttendance);
router.get('/classes/:classId/attendance', requireTeacherAuth, teacherController.getAttendanceHistory);

// Quiz and grades routes
router.get('/quizzes', requireTeacherAuth, teacherController.getQuizzesView);
router.get('/quizzes/create', requireTeacherAuth, teacherController.getCreateQuizView);
router.get('/grades/update', requireTeacherAuth, teacherController.getUpdateGradesView);

// Class-specific routes for quizzes
router.get('/classes/:classId/quizzes/data', requireTeacherAuth, async (req, res) => {
  try {
    const { classId } = req.params;
    const quizzes = await teacherController.getQuizzes(classId, req.teacher._id);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Quizzes retrieved successfully', 
      quizzes 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/classes/:classId/quizzes', requireTeacherAuth, teacherController.createQuiz);
router.get('/classes/:classId/quizzes/:quizId', requireTeacherAuth, teacherController.getQuizDetails);
router.post('/classes/:classId/quizzes/:quizId/students/:studentId', requireTeacherAuth, teacherController.updateQuizGrade);

module.exports = router;
