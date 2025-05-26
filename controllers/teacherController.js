const Teacher = require('../models/teacher');
const Class = require('../models/class');
const Student = require('../models/student');
const Attendance = require('../models/attendance');
const Quiz = require('../models/quiz');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET;

// Teacher Authentication
const loginTeacher = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  try {
    const teacher = await Teacher.findOne({ email });
    
    if (!teacher) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ teacherId: teacher._id }, jwtSecret, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true });
    
    return res.status(200).json({ 
      success: true, 
      message: 'Login successful', 
      teacher: {
        id: teacher._id,
        username: teacher.username,
        email: teacher.email,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        profilePicture: teacher.profilePicture
      },
      token 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Logout Teacher
const logoutTeacher = async (req, res) => {
  try {
    res.clearCookie('token');
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Dashboard
const getDashboard = async (req, res) => {
  try {
    const teacher = req.teacher;
    
    // Get teacher's classes
    const classes = await Class.find({ teacher: teacher._id })
      .select('name description students')
      .populate('students', 'firstName lastName')
      .limit(5);
    
    // Format classes data for the dashboard
    const classesFormatted = classes.map(cls => ({
      id: cls._id,
      name: cls.name,
      description: cls.description,
      studentCount: cls.students.length
    }));
    
    // Count all students across all classes
    const studentsCount = await Student.countDocuments({
      _id: { $in: classes.flatMap(cls => cls.students) }
    });
    
    // Count all quizzes across all classes
    const quizzesCount = await Quiz.countDocuments({
      class: { $in: classes.map(cls => cls._id) }
    });
    
    // Count all attendance records
    const attendanceCount = await Attendance.countDocuments({
      class: { $in: classes.map(cls => cls._id) }
    });
    
    // Get recent activities
    const recentQuizzes = await Quiz.find({ class: { $in: classes.map(cls => cls._id) } })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('class', 'name');
    
    const recentAttendance = await Attendance.find({ class: { $in: classes.map(cls => cls._id) } })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('class', 'name');
    
    // Combine and format activities
    const recentActivities = [
      ...recentQuizzes.map(quiz => ({
        className: quiz.class.name,
        description: `Created quiz: ${quiz.title}`,
        date: quiz.createdAt,
        status: 'Completed'
      })),
      ...recentAttendance.map(attendance => ({
        className: attendance.class.name,
        description: `Attendance session created`,
        date: attendance.date,
        status: 'Completed'
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    
    // Render the dashboard with data
    res.render('teacher-dashboard', {
      teacher,
      classes: classesFormatted,
      stats: {
        classesCount: classes.length,
        studentsCount,
        quizzesCount,
        attendanceCount
      },
      recentActivities
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// Get teacher profile
const getProfile = async (req, res) => {
  try {
    const teacher = req.teacher;
    
    // Get stats for display on profile
    const classes = await Class.find({ teacher: teacher._id });
    const classIds = classes.map(cls => cls._id);
    
    const studentsCount = await Student.countDocuments({ 
      _id: { $in: classes.flatMap(cls => cls.students) } 
    });
    
    const quizzesCount = await Quiz.countDocuments({ class: { $in: classIds } });
    
    const stats = {
      classesCount: classes.length,
      studentsCount,
      quizzesCount
    };
    
    res.render('teacher-profile', {
      teacher,
      stats
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// Update teacher profile
const updateProfile = async (req, res) => {
  const { username, firstName, lastName, email, phoneNumber, profilePicture } = req.body;

  try {
    const updatedTeacher = await Teacher.findByIdAndUpdate(
      req.teacher._id,
      { 
        username: username || req.teacher.username,
        firstName: firstName || req.teacher.firstName,
        lastName: lastName || req.teacher.lastName,
        email: email || req.teacher.email,
        phoneNumber: phoneNumber || req.teacher.phoneNumber,
        profilePicture: profilePicture || req.teacher.profilePicture
      },
      { new: true }
    ).select('-password');

    return res.status(200).json({ 
      success: true, 
      message: 'Profile updated successfully', 
      teacher: updatedTeacher 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Classes

// Get all classes for a teacher
const getClasses = async (req, res) => {
  try {
    const teacher = req.teacher;
    
    // Get teacher's classes with student count
    const classes = await Class.find({ teacher: teacher._id })
      .select('name description students')
      .populate('students', 'firstName lastName');
    
    // Get additional stats for each class
    const classesWithStats = await Promise.all(classes.map(async (cls) => {
      // Count attendance sessions
      const attendanceCount = await Attendance.countDocuments({ class: cls._id });
      
      // Count quizzes
      const quizCount = await Quiz.countDocuments({ class: cls._id });
      
      return {
        id: cls._id,
        name: cls.name,
        description: cls.description,
        studentCount: cls.students.length,
        attendanceCount,
        quizCount
      };
    }));
    
    res.render('teacher-classes', {
      teacher,
      classes: classesWithStats
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// Get a specific class details
const getClassDetails = async (req, res) => {
  try {
    const { classId } = req.params;
    const teacher = req.teacher;
    
    // Verify class belongs to teacher
    const classDetails = await Class.findOne({ _id: classId, teacher: teacher._id })
      .populate('students', 'firstName lastName profilePicture');
    
    if (!classDetails) {
      return res.status(404).send('Class not found');
    }
    
    // Get additional stats
    const attendanceSessions = await Attendance.countDocuments({ class: classId });
    const quizzes = await Quiz.countDocuments({ class: classId });
    
    // Calculate average attendance (simplified example)
    const attendanceRecords = await Attendance.find({ class: classId });
    let totalPresent = 0;
    let totalStudents = 0;
    
    attendanceRecords.forEach(record => {
      totalPresent += record.students.filter(s => s.status === 'present').length;
      totalStudents += record.students.length;
    });
    
    const averageAttendance = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
    
    // Get recent activities
    const recentAttendance = await Attendance.find({ class: classId })
      .sort({ date: -1 })
      .limit(5);
      
    const recentQuizzes = await Quiz.find({ class: classId })
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Combine and format activities
    const recentActivities = [
      ...recentAttendance.map(attendance => ({
        type: 'attendance',
        title: `Attendance: ${new Date(attendance.date).toLocaleDateString()}`,
        date: attendance.date,
        status: 'Completed'
      })),
      ...recentQuizzes.map(quiz => ({
        type: 'quiz',
        title: `Quiz: ${quiz.title}`,
        date: quiz.createdAt,
        status: quiz.dueDate && new Date(quiz.dueDate) > new Date() ? 'Pending' : 'Completed'
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    
    // Enhance students with last attendance
    const studentsWithStatus = await Promise.all(classDetails.students.map(async (student) => {
      // Find the last attendance record for this student
      const lastAttendance = await Attendance.findOne({ 
        class: classId, 
        'students.student': student._id 
      }).sort({ date: -1 });
      
      let lastAttendanceStatus = 'No Data';
      if (lastAttendance) {
        const studentRecord = lastAttendance.students.find(s => 
          s.student.toString() === student._id.toString()
        );
        if (studentRecord) {
          lastAttendanceStatus = studentRecord.status;
        }
      }
      
      return {
        ...student.toObject(),
        lastAttendanceStatus
      };
    }));
    
    // Prepare final class details
    const classDetailsFormatted = {
      ...classDetails.toObject(),
      students: studentsWithStatus,
      attendanceSessions,
      quizzes,
      averageAttendance,
      recentActivities
    };
    
    res.render('teacher-class-details', {
      teacher,
      classDetails: classDetailsFormatted
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// Attendance

// Get attendance view
const getAttendanceView = async (req, res) => {
  try {
    const teacher = req.teacher;
    
    // Get teacher's classes
    const classes = await Class.find({ teacher: teacher._id })
      .select('name description students')
      .populate('students', 'firstName lastName');
    
    // Format classes data
    const classesData = classes.map(cls => ({
      id: cls._id,
      name: cls.name,
      description: cls.description,
      studentCount: cls.students.length,
      // You would calculate these with a query in a real app
      sessionCount: 0,
      averageAttendance: 0
    }));
    
    // Get recent attendance sessions
    const recentSessions = await Attendance.find({ class: { $in: classes.map(c => c._id) } })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('class', 'name');
    
    // Format attendance data
    const recentSessionsData = recentSessions.map(session => {
      // Calculate stats (this is a simplified example)
      const presentCount = session.students.filter(s => s.status === 'present').length;
      const absentCount = session.students.filter(s => s.status === 'absent').length;
      const lateCount = session.students.filter(s => s.status === 'late').length;
      
      return {
        _id: session._id,
        classId: session.class._id,
        className: session.class.name,
        date: session.date,
        presentCount,
        absentCount,
        lateCount
      };
    });
    
    res.render('teacher-attendance', {
      teacher,
      classes: classesData,
      recentSessions: recentSessionsData
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// Get create attendance view
const getCreateAttendanceView = async (req, res) => {
  try {
    const teacher = req.teacher;
    
    // Get teacher's classes
    const classes = await Class.find({ teacher: teacher._id })
      .select('name description students')
      .populate('students', 'firstName lastName');
    
    // Format classes data
    const classesData = classes.map(cls => ({
      id: cls._id,
      name: cls.name,
      description: cls.description,
      studentCount: cls.students.length
    }));
    
    res.render('teacher-create-attendance', {
      teacher,
      classes: classesData
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// Create an attendance session for a class
const createAttendanceSession = async (req, res) => {
  const { classId } = req.params;
  const { date } = req.body;

  try {
    const classDetails = await Class.findOne({ 
      _id: classId, 
      teacher: req.teacher._id 
    }).populate('students');

    if (!classDetails) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Check if an attendance session already exists for this date
    const existingSession = classDetails.attendanceSessions.find(
      session => new Date(session.date).toDateString() === new Date(date).toDateString()
    );

    if (existingSession) {
      return res.status(400).json({ 
        success: false, 
        message: 'Attendance session already exists for this date' 
      });
    }

    // Create a new attendance session
    const newSession = {
      date: date || new Date(),
      attendances: []
    };

    classDetails.attendanceSessions.push(newSession);
    await classDetails.save();

    return res.status(201).json({ 
      success: true, 
      message: 'Attendance session created successfully', 
      session: newSession
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Mark attendance for a student
const markAttendance = async (req, res) => {
  const { classId, sessionId, studentId } = req.params;
  const { status } = req.body;

  try {
    const classDetails = await Class.findOne({ 
      _id: classId, 
      teacher: req.teacher._id 
    });

    if (!classDetails) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Find the session
    const session = classDetails.attendanceSessions.id(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Check if student exists in the class
    const isStudentInClass = classDetails.students.some(student => student.toString() === studentId);
    if (!isStudentInClass) {
      return res.status(400).json({ success: false, message: 'Student not in this class' });
    }

    // Create a new attendance record
    const attendance = new Attendance({
      class: classId,
      student: studentId,
      date: session.date,
      status: status || 'present'
    });

    await attendance.save();

    // Add the attendance to the session
    session.attendances.push(attendance._id);
    await classDetails.save();

    return res.status(200).json({ 
      success: true, 
      message: 'Attendance marked successfully', 
      attendance 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get attendance history for a class
const getAttendanceHistory = async (req, res) => {
  const { classId } = req.params;

  try {
    // First verify the class belongs to the teacher
    const classDetails = await Class.findOne({ 
      _id: classId, 
      teacher: req.teacher._id 
    });

    if (!classDetails) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Get all attendance records for this class instead of relying on attendanceSessions
    const attendanceRecords = await Attendance.find({ 
      class: classId 
    })
    .populate('student', 'firstName lastName profilePicture')
    .sort({ date: -1 });

    // Group attendance records by date to create sessions
    const sessionMap = new Map();
    
    attendanceRecords.forEach(record => {
      const dateStr = new Date(record.date).toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!sessionMap.has(dateStr)) {
        sessionMap.set(dateStr, {
          id: dateStr,
          date: record.date,
          attendances: []
        });
      }
      
      sessionMap.get(dateStr).attendances.push({
        student: record.student,
        status: record.status,
        _id: record._id
      });
    });
    
    // Convert map to array for response
    const sessions = Array.from(sessionMap.values());

    return res.status(200).json({ 
      success: true, 
      message: 'Attendance history retrieved successfully', 
      sessions 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Quizzes & Grades

// Get quizzes view
const getQuizzesView = async (req, res) => {
  try {
    const teacher = req.teacher;
    const { classId, status } = req.query;
    
    // Get teacher's classes
    const classes = await Class.find({ teacher: teacher._id })
      .select('name description students')
      .populate('students', 'firstName lastName');
    
    // Format classes data
    const classesData = classes.map(cls => ({
      id: cls._id,
      name: cls.name,
      description: cls.description,
      studentCount: cls.students.length
    }));
    
    // Build query for quizzes
    const query = { teacher: teacher._id };
    if (classId) query.class = classId;
    if (status) query.status = status;
    
    // Get quizzes
    const quizzes = await Quiz.find(query)
      .sort({ createdAt: -1 })
      .populate('class', 'name students');
    
    // Format quizzes data
    const quizzesData = quizzes.map(quiz => ({
      _id: quiz._id,
      classId: quiz.class._id,
      className: quiz.class.name,
      title: quiz.title,
      description: quiz.description,
      maxScore: quiz.maxScore,
      createdAt: quiz.createdAt,
      dueDate: quiz.dueDate,
      totalStudents: quiz.class.students.length,
      submissionsCount: quiz.submissions ? quiz.submissions.length : 0
    }));
    
    res.render('teacher-quizzes', {
      teacher,
      classes: classesData,
      quizzes: quizzesData
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// Get create quiz view
const getCreateQuizView = async (req, res) => {
  try {
    const teacher = req.teacher;
    
    // Get teacher's classes
    const classes = await Class.find({ teacher: teacher._id })
      .select('name description');
    
    // Format classes data
    const classesData = classes.map(cls => ({
      id: cls._id,
      name: cls.name,
      description: cls.description
    }));
    
    res.render('teacher-create-quiz', {
      teacher,
      classes: classesData
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// Get update grades view
const getUpdateGradesView = async (req, res) => {
  try {
    const teacher = req.teacher;
    const { classId, quizId } = req.query;
    
    if (!classId || !quizId) {
      return res.status(400).send('Class ID and Quiz ID are required');
    }
    
    // Verify class and quiz belong to teacher
    const classObj = await Class.findOne({ _id: classId, teacher: teacher._id })
      .populate('students', 'firstName lastName profilePicture');
    
    if (!classObj) {
      return res.status(404).send('Class not found');
    }
    
    const quiz = await Quiz.findOne({ _id: quizId, class: classId, teacher: teacher._id });
    
    if (!quiz) {
      return res.status(404).send('Quiz not found');
    }
    
    // Get existing grades for this quiz
    const students = classObj.students.map(student => {
      const submission = quiz.submissions?.find(s => s.student.toString() === student._id.toString());
      
      return {
        _id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        profilePicture: student.profilePicture,
        score: submission?.score || null,
        maxScore: quiz.maxScore,
        submitted: !!submission,
        submissionDate: submission?.submittedAt || null
      };
    });
    
    res.render('teacher-update-grades', {
      teacher,
      class: classObj,
      quiz,
      students
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// Create a quiz
const createQuiz = async (req, res) => {
  const { classId } = req.params;
  const { title, description, maxScore, dueDate } = req.body;

  try {
    const classDetails = await Class.findOne({ 
      _id: classId, 
      teacher: req.teacher._id 
    });

    if (!classDetails) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const quiz = new Quiz({
      title,
      description,
      maxScore,
      dueDate,
      class: classId,
      grades: []
    });

    await quiz.save();

    // Add quiz to class
    classDetails.quizzes.push(quiz._id);
    await classDetails.save();

    return res.status(201).json({ 
      success: true, 
      message: 'Quiz created successfully', 
      quiz 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all quizzes for a class
const getQuizzes = async (classId, teacherId) => {
  try {
    // Verify the teacher has access to this class
    const classExists = classId ? await Class.findOne({ 
      _id: classId, 
      teacher: teacherId 
    }) : null;

    // Build query
    const query = {};
    if (classId) {
      if (!classExists) {
        throw new Error('Class not found or access denied');
      }
      query.class = classId;
    } else {
      // Get all classes for this teacher
      const teacherClasses = await Class.find({ teacher: teacherId });
      if (teacherClasses.length > 0) {
        query.class = { $in: teacherClasses.map(c => c._id) };
      } else {
        // No classes, return empty array
        return [];
      }
    }

    // Get quizzes
    const quizzes = await Quiz.find(query)
      .populate('class', 'name')
      .sort({ createdAt: -1 });

    // Format quizzes for response
    return quizzes.map(quiz => ({
      _id: quiz._id,
      title: quiz.title || quiz.name,
      description: quiz.description,
      maxScore: quiz.totalScore || quiz.maxScore || 100,
      dueDate: quiz.dueDate,
      class: {
        _id: quiz.class._id,
        name: quiz.class.name
      },
      createdAt: quiz.createdAt,
      grades: quiz.grades || []
    }));
  } catch (error) {
    console.error('Error getting quizzes:', error);
    throw error;
  }
};

// Get quiz details
const getQuizDetails = async (req, res) => {
  const { classId, quizId } = req.params;

  try {
    const classDetails = await Class.findOne({ 
      _id: classId, 
      teacher: req.teacher._id 
    }).populate('students', 'username firstName lastName profilePicture');

    if (!classDetails) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const quiz = await Quiz.findOne({ 
      _id: quizId, 
      class: classId 
    }).populate({
      path: 'grades.student',
      select: 'username firstName lastName profilePicture'
    });

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    // Get students without grades
    const studentsWithGrades = quiz.grades.map(grade => grade.student._id.toString());
    const studentsWithoutGrades = classDetails.students.filter(
      student => !studentsWithGrades.includes(student._id.toString())
    );

    return res.status(200).json({ 
      success: true, 
      message: 'Quiz details retrieved successfully', 
      quiz,
      studentsWithoutGrades
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update grade for a student
const updateQuizGrade = async (req, res) => {
  const { classId, quizId, studentId } = req.params;
  const { score, feedback } = req.body;

  try {
    const classDetails = await Class.findOne({ 
      _id: classId, 
      teacher: req.teacher._id 
    });

    if (!classDetails) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Check if student exists in the class
    const isStudentInClass = classDetails.students.some(student => student.toString() === studentId);
    if (!isStudentInClass) {
      return res.status(400).json({ success: false, message: 'Student not in this class' });
    }

    const quiz = await Quiz.findOne({ _id: quizId, class: classId });
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    // Check if grade already exists
    const existingGradeIndex = quiz.grades.findIndex(
      grade => grade.student.toString() === studentId
    );

    if (existingGradeIndex !== -1) {
      // Update existing grade
      quiz.grades[existingGradeIndex].score = score;
      quiz.grades[existingGradeIndex].feedback = feedback;
    } else {
      // Add new grade
      quiz.grades.push({
        student: studentId,
        score,
        feedback
      });
    }

    await quiz.save();

    return res.status(200).json({ 
      success: true, 
      message: 'Grade updated successfully', 
      grade: existingGradeIndex !== -1 ? quiz.grades[existingGradeIndex] : quiz.grades[quiz.grades.length - 1]
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get dashboard data for API response
const getDashboardData = async (teacher) => {
  try {
    // Get teacher's classes
    const classes = await Class.find({ teacher: teacher._id })
      .select('name description students')
      .populate('students', 'firstName lastName');
    
    // Format classes data for the dashboard
    const classesFormatted = classes.map(cls => ({
      id: cls._id,
      name: cls.name,
      description: cls.description,
      studentCount: cls.students.length
    }));
    
    // Count all students across all classes
    const studentsCount = await Student.countDocuments({
      _id: { $in: classes.flatMap(cls => cls.students) }
    });
    
    // Count all quizzes across all classes
    const quizzesCount = await Quiz.countDocuments({
      class: { $in: classes.map(cls => cls._id) }
    });
    
    // Count all attendance records
    const attendanceCount = await Attendance.countDocuments({
      class: { $in: classes.map(cls => cls._id) }
    });
    
    // Get recent activities
    const recentQuizzes = await Quiz.find({ class: { $in: classes.map(cls => cls._id) } })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('class', 'name');
    
    const recentAttendance = await Attendance.find({ class: { $in: classes.map(cls => cls._id) } })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('class', 'name');
    
    // Combine and format activities
    const recentActivities = [
      ...recentQuizzes.map(quiz => ({
        className: quiz.class.name,
        description: `Created quiz: ${quiz.title}`,
        date: quiz.createdAt,
        status: 'Completed'
      })),
      ...recentAttendance.map(attendance => ({
        className: attendance.class.name,
        description: `Attendance session created`,
        date: attendance.date,
        status: 'Completed'
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    
    // Return formatted dashboard data
    return {
      teacher: {
        id: teacher._id,
        name: `${teacher.firstName} ${teacher.lastName}`,
        email: teacher.email,
        profilePicture: teacher.profilePicture
      },
      classes: classesFormatted,
      stats: {
        classesCount: classes.length,
        studentsCount,
        quizzesCount,
        attendanceCount
      },
      recentActivities
    };
  } catch (error) {
    console.error(error);
    throw new Error('Error getting dashboard data');
  }
};

// Get all classes for a specific teacher
const getTeacherClasses = async (teacherId) => {
  try {
    const classes = await Class.find({ teacher: teacherId })
      .select('name description students schedule')
      .populate('students', 'username firstName lastName profilePicture');
    
    // Format classes for API response
    return classes.map(cls => ({
      id: cls._id,
      name: cls.name,
      description: cls.description,
      studentCount: cls.students.length,
      schedule: cls.schedule,
      students: cls.students.map(student => ({
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        profilePicture: student.profilePicture
      }))
    }));
  } catch (error) {
    console.error(error);
    throw new Error('Error retrieving classes');
  }
};

// Get a specific class by ID for a teacher
const getClassById = async (classId, teacherId) => {
  try {
    const classDetails = await Class.findOne({ 
      _id: classId, 
      teacher: teacherId 
    })
    .populate('students', 'username firstName lastName email profilePicture')
    .populate({
      path: 'attendanceSessions.attendances',
      populate: {
        path: 'student',
        select: 'username firstName lastName profilePicture'
      }
    });

    if (!classDetails) {
      return null;
    }

    // Get quizzes for this class
    const quizzes = await Quiz.find({ class: classId });

    // Format for API response
    return {
      id: classDetails._id,
      name: classDetails.name,
      description: classDetails.description,
      schedule: classDetails.schedule,
      students: classDetails.students.map(student => ({
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        profilePicture: student.profilePicture
      })),
      quizzes: quizzes.map(quiz => ({
        id: quiz._id,
        title: quiz.title,
        dueDate: quiz.dueDate,
        maxScore: quiz.maxScore
      })),
      attendanceSessions: classDetails.attendanceSessions.map(session => ({
        id: session._id,
        date: session.date,
        attendanceCount: session.attendances.length
      }))
    };
  } catch (error) {
    console.error(error);
    throw new Error('Error retrieving class details');
  }
};

// Get students by class ID
const getStudentsByClass = async (classId, teacherId) => {
  try {
    // Verify the teacher has access to this class
    const classDetails = await Class.findOne({ 
      _id: classId, 
      teacher: teacherId 
    }).populate('students', 'username firstName lastName email profilePicture');

    if (!classDetails) {
      throw new Error('Class not found');
    }

    // Format student data for API response
    return classDetails.students.map(student => ({
      id: student._id,
      username: student.username,
      name: `${student.firstName} ${student.lastName}`,
      email: student.email,
      profilePicture: student.profilePicture
    }));
  } catch (error) {
    console.error(error);
    throw new Error('Error retrieving students');
  }
};

// Get detailed student information for a teacher
const getStudentDetails = async (studentId, teacherId) => {
  try {
    // First check if this student is in any of the teacher's classes
    const teacherClasses = await Class.find({ 
      teacher: teacherId,
      students: studentId
    });

    if (teacherClasses.length === 0) {
      return null; // Teacher doesn't have access to this student
    }

    // Get the student details
    const student = await Student.findById(studentId)
      .select('username firstName lastName email profilePicture');

    if (!student) {
      return null;
    }

    // Get attendance records for this student in teacher's classes
    const attendance = await Attendance.find({
      class: { $in: teacherClasses.map(c => c._id) },
      student: studentId
    }).sort({ date: -1 }).limit(10);

    // Get quiz grades for this student in teacher's classes
    const quizzes = await Quiz.find({
      class: { $in: teacherClasses.map(c => c._id) },
      'grades.student': studentId
    }).select('title maxScore grades');

    // Format student data with attendance and grades
    return {
      id: student._id,
      username: student.username,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      profilePicture: student.profilePicture,
      classes: teacherClasses.map(c => ({
        id: c._id,
        name: c.name
      })),
      attendance: attendance.map(a => ({
        id: a._id,
        date: a.date,
        status: a.status,
        className: teacherClasses.find(c => c._id.toString() === a.class.toString())?.name
      })),
      grades: quizzes.flatMap(quiz => {
        const studentGrade = quiz.grades.find(g => g.student.toString() === studentId);
        if (studentGrade) {
          return [{
            quizId: quiz._id,
            quizTitle: quiz.title,
            maxScore: quiz.maxScore,
            score: studentGrade.score,
            feedback: studentGrade.feedback
          }];
        }
        return [];
      })
    };
  } catch (error) {
    console.error(error);
    throw new Error('Error retrieving student details');
  }
};

// Get attendance records with filtering options
const getAttendanceRecords = async (teacherId, classId, date, month, year) => {
  try {
    // Build query based on provided filters
    const query = {};
    
    // If class ID is provided, filter by that class
    if (classId) {
      // Verify teacher has access to this class
      const classExists = await Class.findOne({ 
        _id: classId, 
        teacher: teacherId 
      });
      
      if (!classExists) {
        throw new Error('Class not found or access denied');
      }
      
      query.class = classId;
    } else {
      // Otherwise, get all classes for this teacher
      const teacherClasses = await Class.find({ teacher: teacherId });
      query.class = { $in: teacherClasses.map(c => c._id) };
    }
    
    // Apply date filters if provided
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query.date = { $gte: startOfDay, $lte: endOfDay };
    } else if (month && year) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
      
      query.date = { $gte: startOfMonth, $lte: endOfMonth };
    } else if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
      
      query.date = { $gte: startOfYear, $lte: endOfYear };
    }
    
    // Get attendance records
    const attendanceRecords = await Attendance.find(query)
      .populate('student', 'firstName lastName profilePicture')
      .populate('class', 'name')
      .sort({ date: -1 });
    
    // Format for API response
    return attendanceRecords.map(record => ({
      id: record._id,
      date: record.date,
      status: record.status,
      student: {
        id: record.student._id,
        name: `${record.student.firstName} ${record.student.lastName}`,
        profilePicture: record.student.profilePicture
      },
      class: {
        id: record.class._id,
        name: record.class.name
      }
    }));
  } catch (error) {
    console.error(error);
    throw new Error('Error retrieving attendance records');
  }
};

// Update a quiz
const updateQuiz = async (classId, quizId, teacherId, updateData) => {
  try {
    // Verify teacher has access to this class
    const classDetails = await Class.findOne({ 
      _id: classId, 
      teacher: teacherId 
    });
    
    if (!classDetails) {
      return null;
    }
    
    // Update the quiz
    const updatedQuiz = await Quiz.findOneAndUpdate(
      { _id: quizId, class: classId },
      { $set: updateData },
      { new: true }
    );
    
    return updatedQuiz;
  } catch (error) {
    console.error(error);
    throw new Error('Error updating quiz');
  }
};

// Delete a quiz
const deleteQuiz = async (classId, quizId, teacherId) => {
  try {
    // Verify teacher has access to this class
    const classDetails = await Class.findOne({ 
      _id: classId, 
      teacher: teacherId 
    });
    
    if (!classDetails) {
      return false;
    }
    
    // Delete the quiz
    const result = await Quiz.findOneAndDelete({ _id: quizId, class: classId });
    
    // Remove reference from class
    if (result) {
      await Class.findByIdAndUpdate(
        classId,
        { $pull: { quizzes: quizId } }
      );
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(error);
    throw new Error('Error deleting quiz');
  }
};

module.exports = {
  loginTeacher,
  logoutTeacher,
  getDashboard,
  getProfile,
  updateProfile,
  getClasses,
  getClassDetails,
  getAttendanceView,
  getCreateAttendanceView,
  createAttendanceSession,
  markAttendance,
  getAttendanceHistory,
  getQuizzesView,
  getCreateQuizView,
  getUpdateGradesView,
  createQuiz,
  getQuizzes,
  getQuizDetails,
  updateQuizGrade,
  // New API methods
  getDashboardData,
  getTeacherClasses,
  getClassById,
  getStudentsByClass,
  getStudentDetails,
  getAttendanceRecords,
  updateQuiz,
  deleteQuiz
};
