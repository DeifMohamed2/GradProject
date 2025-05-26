const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const jwt = require('jsonwebtoken');
const Teacher = require('../models/teacher');

// Middleware to authenticate teacher via token
const authenticateTeacher = async (req, res, next) => {
  // Try to get token from different sources to support both web and mobile
  const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1] || req.query?.token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    const decoded = jwt.verify(token, jwtSecret);

    if (!decoded.teacherId) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const teacher = await Teacher.findById(decoded.teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    req.teacher = teacher;
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

/*
 * Authentication Routes
 */
router.post('/login', teacherController.loginTeacher);
router.post('/logout', teacherController.logoutTeacher);

/*
 * Profile Routes
 */
router.get('/profile', authenticateTeacher, teacherController.getProfile);
router.put('/profile', authenticateTeacher, teacherController.updateProfile);
router.put('/password', authenticateTeacher, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password and new password are required'
      });
    }
    
    // Password update logic would be implemented in controller
    // For now, respond with placeholder
    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/*
 * Dashboard Routes
 */
router.get('/dashboard', authenticateTeacher, async (req, res) => {
  try {
    // Get dashboard data from controller
    const dashboardData = await teacherController.getDashboardData(req.teacher);
    
    // Return the dashboard data as JSON
    res.status(200).json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: dashboardData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/*
 * Classes Routes
 */
router.get('/classes', authenticateTeacher, async (req, res) => {
  try {
    const classes = await teacherController.getTeacherClasses(req.teacher._id);
    res.status(200).json({
      success: true,
      message: 'Classes retrieved successfully',
      data: classes
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/classes/:classId', authenticateTeacher, async (req, res) => {
  try {
    const classDetails = await teacherController.getClassById(req.params.classId, req.teacher._id);
    
    if (!classDetails) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }
    
    res.status(200).json({
      success: true,
      message: 'Class details retrieved successfully',
      data: classDetails
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/*
 * Students Routes
 */
router.get('/classes/:classId/students', authenticateTeacher, async (req, res) => {
  try {
    const students = await teacherController.getStudentsByClass(req.params.classId, req.teacher._id);
    
    res.status(200).json({
      success: true,
      message: 'Students retrieved successfully',
      data: students
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/students/:studentId', authenticateTeacher, async (req, res) => {
  try {
    const student = await teacherController.getStudentDetails(req.params.studentId, req.teacher._id);
    
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    res.status(200).json({
      success: true,
      message: 'Student details retrieved successfully',
      data: student
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/*
 * Attendance Routes
 */
router.get('/attendance', authenticateTeacher, async (req, res) => {
  try {
    const { classId, date, month, year } = req.query;
    const attendanceRecords = await teacherController.getAttendanceRecords(req.teacher._id, classId, date, month, year);
    
    res.status(200).json({
      success: true,
      message: 'Attendance records retrieved successfully',
      data: attendanceRecords
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/classes/:classId/attendance', authenticateTeacher, teacherController.createAttendanceSession);

router.post('/classes/:classId/attendance/:sessionId/students/:studentId', authenticateTeacher, teacherController.markAttendance);

router.get('/classes/:classId/attendance', authenticateTeacher, teacherController.getAttendanceHistory);

/*
 * Grades and Quizzes Routes
 */
router.get('/quizzes', authenticateTeacher, async (req, res) => {
  try {
    const { classId } = req.query;
    const quizzes = await teacherController.getQuizzes(classId, req.teacher._id);
    
    res.status(200).json({
      success: true,
      message: 'Quizzes retrieved successfully',
      quizzes
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/classes/:classId/quizzes', authenticateTeacher, teacherController.createQuiz);

router.get('/classes/:classId/quizzes/:quizId', authenticateTeacher, teacherController.getQuizDetails);

router.put('/classes/:classId/quizzes/:quizId', authenticateTeacher, async (req, res) => {
  try {
    const { title, description, maxScore, dueDate } = req.body;
    const updatedQuiz = await teacherController.updateQuiz(
      req.params.classId,
      req.params.quizId,
      req.teacher._id,
      { title, description, maxScore, dueDate }
    );
    
    if (!updatedQuiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }
    
    res.status(200).json({
      success: true,
      message: 'Quiz updated successfully',
      data: updatedQuiz
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/classes/:classId/quizzes/:quizId', authenticateTeacher, async (req, res) => {
  try {
    const deleted = await teacherController.deleteQuiz(
      req.params.classId,
      req.params.quizId,
      req.teacher._id
    );
    
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }
    
    res.status(200).json({
      success: true,
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/classes/:classId/quizzes/:quizId/students/:studentId', authenticateTeacher, teacherController.updateQuizGrade);

/*
 * Notifications Routes
 */
router.get('/notifications', authenticateTeacher, async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    // This would need to be implemented in the controller
    const notifications = []  // placeholder for controller.getNotifications
    
    res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: {
        notifications,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: notifications.length
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/notifications/:notificationId/mark-read', authenticateTeacher, async (req, res) => {
  try {
    // This would need to be implemented in the controller
    // Placeholder response
    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/*
 * Teaching Materials Routes
 */
router.get('/materials', authenticateTeacher, async (req, res) => {
  try {
    const { classId } = req.query;
    // This would need to be implemented in the controller
    const materials = [];  // placeholder for controller.getMaterials
    
    res.status(200).json({
      success: true,
      message: 'Teaching materials retrieved successfully',
      data: materials
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/materials', authenticateTeacher, async (req, res) => {
  try {
    const { classId, title, description, fileUrl, type } = req.body;
    // This would need to be implemented in the controller
    // Placeholder response
    res.status(201).json({
      success: true,
      message: 'Material added successfully',
      data: { id: 'material_id_placeholder', title, classId }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/materials/:materialId', authenticateTeacher, async (req, res) => {
  try {
    // This would need to be implemented in the controller
    // Placeholder response
    res.status(200).json({
      success: true,
      message: 'Material deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router; 