const Admin = require('../models/admin');
const Parent = require('../models/parent');
const Student = require('../models/student');
const Teacher = require('../models/teacher');
const Class = require('../models/class');
const Grade = require('../models/Grade');
const Attendance = require('../models/attendance');
const Expense = require('../models/expenses');
const Transaction = require('../models/transaction');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const fs = require('fs');

const jwtSecret = process.env.JWT_SECRET;   



const createAdminAccount = async (req, res) => {
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
  const { 
    username, 
    password, 
    firstName,
    lastName,
    email, 
    phoneNumber,
    alternatePhone,
    address,
    dateOfBirth,
    age, 
    gender,
    occupation,
    workplaceInfo,
    education,
    maritalStatus,
    spouseInfo,
    relationshipToStudent,
    preferredContactMethod,
    numberOfChildren,
    emergencyContact,
    balance,
    pinCode
  } = req.body;

  if (!username || !password || !email || !phoneNumber || !age || !firstName || !lastName) {
    return res.status(400).json({ message: 'Required fields are missing' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const parent = await Parent.create({
      username,
      password: hashedPassword,
      firstName,
      lastName,
      email,
      phoneNumber,
      alternatePhone,
      address,
      dateOfBirth,
      age,
      gender,
      occupation,
      workplaceInfo,
      education,
      maritalStatus,
      spouseInfo,
      relationshipToStudent,
      preferredContactMethod,
      numberOfChildren,
      emergencyContact,
      balance,
      pinCode
    });
    return res.status(201).json({ 
      message: 'Parent account created successfully', 
      parent: {
        _id: parent._id,
        username: parent.username,
        firstName: parent.firstName,
        lastName: parent.lastName,
        email: parent.email,
        phoneNumber: parent.phoneNumber,
        age: parent.age,
        balance: parent.balance,
        parentCode: parent.parentCode
      }
    });
  } catch (error) {
    if(error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
};

// create Student account and assoited with parent

const createStudentAccount = async (req, res) => {
  const { 
    username, 
    password, 
    firstName,
    lastName,
    email, 
    dateOfBirth,
    age,
    gender,
    rollNumber,
    enrollmentDate,
    grade,
    section,
    academicYear,
    classroom,
    contactPhone,
    address,
    emergencyContact,
    bloodGroup,
    medicalConditions,
    status,
    parent 
  } = req.body;

  if (!username || !password || !email || !age || !firstName || !lastName || !dateOfBirth || !gender || !grade || !section || !academicYear) {
    return res.status(400).json({ message: 'Required fields are missing' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const student = await Student.create({
      username,
      password: hashedPassword,
      firstName,
      lastName,
      email,
      dateOfBirth,
      age,
      gender,
      rollNumber,
      enrollmentDate,
      grade,
      section,
      academicYear,
      classroom,
      contactPhone,
      address,
      emergencyContact,
      bloodGroup,
      medicalConditions,
      status: status || 'Active',
      parent
    });

    if (parent) {
      await Parent.findByIdAndUpdate(parent, { $push: { childs: student._id } });
    }

    return res.status(201).json({ 
      message: 'Student account created successfully', 
      student: {
        _id: student._id,
        username: student.username,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        age: student.age,
        grade: student.grade,
        section: student.section,
        studentCode: student.studentCode
      }
    });
  } catch (error) {
    if(error.code === 11000) {
      return res.status(400).json({ message: 'Email or username already exists' });
    }

    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
}

// Link children with parent using codes
const linkChildsWithParent = async (req, res) => {
  const { parentCode, studentCodes } = req.body;

  if (!parentCode || !studentCodes || !Array.isArray(studentCodes) || studentCodes.length === 0) {
    return res.status(400).json({ message: 'Parent code and at least one student code are required' });
  }

  try {
    // Find parent by code
    const parent = await Parent.findOne({ parentCode });
    if (!parent) {
      return res.status(404).json({ message: 'Parent not found with the provided code' });
    }

    // Find students by codes
    const students = await Student.find({ studentCode: { $in: studentCodes } });
    
    if (students.length === 0) {
      return res.status(404).json({ message: 'No students found with the provided codes' });
    }

    // Get IDs of found students
    const studentIds = students.map(student => student._id);
    
    // Link students to parent
    await Parent.findByIdAndUpdate(
      parent._id, 
      { $addToSet: { childs: { $each: studentIds } } }
    );

    // Link parent to students
    await Student.updateMany(
      { _id: { $in: studentIds } },
      { parent: parent._id }
    );

    // Return success with linked students info
    return res.status(200).json({ 
      message: 'Students linked to parent successfully',
      parent: {
        _id: parent._id,
        username: parent.username,
        parentCode: parent.parentCode
      },
      linkedStudents: students.map(student => ({
        _id: student._id,
        username: student.username,
        studentCode: student.studentCode
      }))
    });
  } catch (error) {
    console.error('Error linking children with parent:', error);
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
};

// Dashboard data
const getDashboardData = async (req, res) => {
    try {
        // Use aggregation for more efficient stats collection
        const [studentStats, parentStats, expenseStats, attendanceStats] = await Promise.all([
            // Count students and get growth metrics
            Student.aggregate([
                {
                    $facet: {
                        // Total count
                        count: [{ $count: "total" }],
                        // Current month students
                        currentMonth: [
                            {
                                $match: {
                                    createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
                                }
                            },
                            { $count: "count" }
                        ],
                        // Last month students
                        lastMonth: [
                            {
                                $match: {
                                    createdAt: {
                                        $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
                                        $lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                                    }
                                }
                            },
                            { $count: "count" }
                        ],
                        // Recent registrations
                        recent: [
                            { $sort: { createdAt: -1 } },
                            { $limit: 2 },
                            {
                                $project: {
                                    firstName: 1,
                                    lastName: 1,
                                    grade: 1,
                                    createdAt: 1
                                }
                            }
                        ]
                    }
                }
            ]),
            
            // Count parents and get growth metrics
            Parent.aggregate([
                {
                    $facet: {
                        // Total count
                        count: [{ $count: "total" }],
                        // Current month parents
                        currentMonth: [
                            {
                                $match: {
                                    createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
                                }
                            },
                            { $count: "count" }
                        ],
                        // Last month parents
                        lastMonth: [
                            {
                                $match: {
                                    createdAt: {
                                        $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
                                        $lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                                    }
                                }
                            },
                            { $count: "count" }
                        ]
                    }
                }
            ]),
            
            // Get expense stats
            Expense.aggregate([
                {
                    $facet: {
                        // Total expenses
                        total: [
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: "$amount" }
                                }
                            }
                        ],
                        // Current month expenses
                        currentMonth: [
                            {
                                $match: {
                                    date: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: "$amount" }
                                }
                            }
                        ],
                        // Last month expenses
                        lastMonth: [
                            {
                                $match: {
                                    date: {
                                        $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
                                        $lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                                    }
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: "$amount" }
                                }
                            }
                        ],
                        // Recent expenses
                        recent: [
                            { $sort: { createdAt: -1 } },
                            { $limit: 2 },
                            {
                                $lookup: {
                                    from: "students",
                                    localField: "student",
                                    foreignField: "_id",
                                    as: "student"
                                }
                            },
                            { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } },
                            {
                                $project: {
                                    amount: 1,
                                    type: 1,
                                    status: 1,
                                    createdAt: 1,
                                    "student.firstName": 1,
                                    "student.lastName": 1
                                }
                            }
                        ],
                        // Monthly data for chart (last 6 months)
                        monthly: [
                            {
                                $match: {
                                    date: { $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1) }
                                }
                            },
                            {
                                $group: {
                                    _id: {
                                        year: { $year: "$date" },
                                        month: { $month: "$date" },
                                        status: "$status"
                                    },
                                    amount: { $sum: "$amount" }
                                }
                            },
                            { $sort: { "_id.year": 1, "_id.month": 1 } }
                        ]
                    }
                }
            ]),
            
            // Get attendance stats
            Attendance.aggregate([
                {
                    $facet: {
                        // Total count by status
                        byStatus: [
                            {
                                $group: {
                                    _id: "$status",
                                    count: { $sum: 1 }
                                }
                            }
                        ],
                        // Current month attendance
                        currentMonth: [
                            {
                                $match: {
                                    date: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
                                }
                            },
                            {
                                $group: {
                                    _id: "$status",
                                    count: { $sum: 1 }
                                }
                            }
                        ],
                        // Last month attendance
                        lastMonth: [
                            {
                                $match: {
                                    date: {
                                        $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
                                        $lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                                    }
                                }
                            },
                            {
                                $group: {
                                    _id: "$status",
                                    count: { $sum: 1 }
                                }
                            }
                        ],
                        // Recent attendance
                        recent: [
                            { $sort: { createdAt: -1 } },
                            { $limit: 1 },
                            {
                                $lookup: {
                                    from: "students",
                                    localField: "student",
                                    foreignField: "_id",
                                    as: "student"
                                }
                            },
                            { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } },
                            {
                                $project: {
                                    status: 1,
                                    date: 1,
                                    createdAt: 1,
                                    "student.firstName": 1,
                                    "student.lastName": 1,
                                    "student.grade": 1
                                }
                            }
                        ]
                    }
                }
            ])
        ]);
        
        // Process student data
        const studentsCount = studentStats[0].count.length > 0 ? studentStats[0].count[0].total : 0;
        const currentMonthStudents = studentStats[0].currentMonth.length > 0 ? studentStats[0].currentMonth[0].count : 0;
        const lastMonthStudents = studentStats[0].lastMonth.length > 0 ? studentStats[0].lastMonth[0].count : 0;
        const studentGrowthRate = lastMonthStudents > 0 
            ? ((currentMonthStudents - lastMonthStudents) / lastMonthStudents * 100).toFixed(1) 
            : 0;
        const recentStudents = studentStats[0].recent;
        
        // Process parent data
        const parentsCount = parentStats[0].count.length > 0 ? parentStats[0].count[0].total : 0;
        const currentMonthParents = parentStats[0].currentMonth.length > 0 ? parentStats[0].currentMonth[0].count : 0;
        const lastMonthParents = parentStats[0].lastMonth.length > 0 ? parentStats[0].lastMonth[0].count : 0;
        const parentGrowthRate = lastMonthParents > 0 
            ? ((currentMonthParents - lastMonthParents) / lastMonthParents * 100).toFixed(1) 
            : 0;
        
        // Process expense data
        const totalExpenses = expenseStats[0].total.length > 0 ? expenseStats[0].total[0].total : 0;
        const currentMonthExpensesTotal = expenseStats[0].currentMonth.length > 0 ? expenseStats[0].currentMonth[0].total : 0;
        const lastMonthExpensesTotal = expenseStats[0].lastMonth.length > 0 ? expenseStats[0].lastMonth[0].total : 0;
        const expensesGrowthRate = lastMonthExpensesTotal > 0 
            ? ((currentMonthExpensesTotal - lastMonthExpensesTotal) / lastMonthExpensesTotal * 100).toFixed(1) 
            : 0;
        const recentExpenses = expenseStats[0].recent;
        
        // Process monthly financial data
        const now = new Date();
        const expenseMonths = [];
        const expenseData = {
            income: [],
            expenses: []
        };
        
        // Prepare months for chart
        for (let i = 5; i >= 0; i--) {
            const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = month.toLocaleString('default', { month: 'short' });
            expenseMonths.push(monthName);
            expenseData.income.push(0);
            expenseData.expenses.push(0);
        }
        
        // Fill in financial data
        if (expenseStats[0].monthly.length > 0) {
            expenseStats[0].monthly.forEach(item => {
                const monthIndex = item._id.month - 1; // Convert 1-based month to 0-based
                const yearMonth = `${item._id.year}-${monthIndex + 1}`;
                
                // Find which of the last 6 months this corresponds to
                for (let i = 0; i < 6; i++) {
                    const chartMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const chartYearMonth = `${chartMonth.getFullYear()}-${chartMonth.getMonth() + 1}`;
                    
                    if (yearMonth === chartYearMonth) {
                        const index = 5 - i; // Reverse index for chart
                        
                        if (item._id.status === 'paid') {
                            expenseData.income[index] += item.amount;
                        }
                        expenseData.expenses[index] += item.amount;
                        break;
                    }
                }
            });
        }
        
        // Process attendance data
        const attendanceByStatus = {
            present: 0,
            late: 0,
            absent: 0
        };
        
        attendanceStats[0].byStatus.forEach(item => {
            if (item._id in attendanceByStatus) {
                attendanceByStatus[item._id] = item.count;
            }
        });
        
        const totalAttendanceRecords = Object.values(attendanceByStatus).reduce((sum, val) => sum + val, 0);
        const attendanceRate = totalAttendanceRecords > 0 
            ? ((attendanceByStatus.present + attendanceByStatus.late) / totalAttendanceRecords * 100).toFixed(1) 
            : 0;
        
        // Calculate attendance growth rate
        const currentMonthAttendance = {
            present: 0,
            late: 0,
            absent: 0
        };
        
        attendanceStats[0].currentMonth.forEach(item => {
            if (item._id in currentMonthAttendance) {
                currentMonthAttendance[item._id] = item.count;
            }
        });
        
        const lastMonthAttendance = {
            present: 0,
            late: 0,
            absent: 0
        };
        
        attendanceStats[0].lastMonth.forEach(item => {
            if (item._id in lastMonthAttendance) {
                lastMonthAttendance[item._id] = item.count;
            }
        });
        
        const currentMonthAttendanceTotal = Object.values(currentMonthAttendance).reduce((sum, val) => sum + val, 0);
        const lastMonthAttendanceTotal = Object.values(lastMonthAttendance).reduce((sum, val) => sum + val, 0);
        
        const currentMonthAttendanceRate = currentMonthAttendanceTotal > 0 
            ? (currentMonthAttendance.present / currentMonthAttendanceTotal * 100).toFixed(1) 
            : 0;
        
        const lastMonthAttendanceRate = lastMonthAttendanceTotal > 0 
            ? (lastMonthAttendance.present / lastMonthAttendanceTotal * 100).toFixed(1) 
            : 0;
        
        const attendanceGrowthRate = lastMonthAttendanceRate > 0 
            ? (currentMonthAttendanceRate - lastMonthAttendanceRate).toFixed(1) 
            : 0;
        
        // Compile enrollment data
        const lastSixMonths = [];
        for (let i = 5; i >= 0; i--) {
            const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = month.toLocaleString('default', { month: 'short' });
            lastSixMonths.push({
                month: monthName,
                students: 0
            });
        }
        
        // Recent activities
        const recentActivities = [];
        
        // Add student activities
        recentStudents.forEach(student => {
            recentActivities.push({
                type: 'success',
                icon: 'user-plus',
                title: 'New Student Registered',
                description: `${student.firstName} ${student.lastName} was added to Grade ${student.grade}`,
                time: new Date(student.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                timestamp: student.createdAt
            });
        });
        
        // Add expense activities
        recentExpenses.forEach(expense => {
            if (expense.student) {
                recentActivities.push({
                    type: expense.status === 'paid' ? 'primary' : expense.status === 'pending' ? 'warning' : 'danger',
                    icon: 'money-bill-wave',
                    title: expense.status === 'paid' ? 'Payment Received' : expense.status === 'pending' ? 'Payment Due' : 'Payment Overdue',
                    description: `${expense.student.firstName} ${expense.student.lastName}: $${expense.amount} for ${expense.type}`,
                    time: new Date(expense.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    timestamp: expense.createdAt
                });
            }
        });
        
        // Add attendance activities
        attendanceStats[0].recent.forEach(record => {
            if (record.student) {
                recentActivities.push({
                    type: record.status === 'present' ? 'success' : record.status === 'late' ? 'warning' : 'danger',
                    icon: 'calendar-check',
                    title: 'Attendance Updated',
                    description: `${record.student.firstName} ${record.student.lastName} was marked ${record.status} for Grade ${record.student.grade}`,
                    time: new Date(record.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    timestamp: record.createdAt
                });
            }
        });
        
        // Sort by newest first
        recentActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Optional: Get enrollment data from Student collection (skip if database is large)
        if (studentsCount < 5000) { // Only do this for small to medium databases
            // Fetch last 6 months enrollments in one query
            const enrollmentData = await Student.aggregate([
                {
                    $match: {
                        createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" }
                        },
                        count: { $sum: 1 }
                    }
                }
            ]);
            
            // Map to chart data
            enrollmentData.forEach(item => {
                const monthIndex = item._id.month - 1; // Convert 1-based month to 0-based
                const yearMonth = `${item._id.year}-${monthIndex + 1}`;
                
                // Find which of the last 6 months this corresponds to
                for (let i = 0; i < 6; i++) {
                    const chartMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const chartYearMonth = `${chartMonth.getFullYear()}-${chartMonth.getMonth() + 1}`;
                    
                    if (yearMonth === chartYearMonth) {
                        lastSixMonths[5 - i].students = item.count;
                        break;
                    }
                }
            });
        }
        
        res.render('admin-dashboard', {
            admin: req.admin,
            studentsCount,
            parentsCount,
            totalExpenses,
            attendanceRate,
            studentGrowthRate: parseFloat(studentGrowthRate),
            parentGrowthRate: parseFloat(parentGrowthRate),
            attendanceGrowthRate: parseFloat(attendanceGrowthRate),
            expensesGrowthRate: parseFloat(expensesGrowthRate),
            recentActivities,
            enrollmentData: {
                months: lastSixMonths.map(m => m.month),
                students: lastSixMonths.map(m => m.students)
            },
            financialData: {
                months: expenseMonths,
                income: expenseData.income,
                expenses: expenseData.expenses
            }
        });
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        res.status(500).json({ message: 'Error loading dashboard data' });
    }
};

// Get all students with optional filtering
const getAllStudents = async (req, res) => {
  try {
    // Extract filter parameters from query
    const { grade, section, academicYear, status, search, page = 1, limit = 10 } = req.query;
    
    // Build filter object
    const filter = {};
    
    // Only add filters if they have actual values (not undefined or empty strings)
    if (grade && grade !== 'undefined') filter.grade = grade;
    if (section && section !== 'undefined') filter.section = section;
    if (academicYear && academicYear !== 'undefined') filter.academicYear = academicYear;
    if (status && status !== 'undefined') filter.status = status;
    
    // Handle search (search by name, email, or student code)
    if (search && search !== 'undefined') {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentCode: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Convert page and limit to numbers
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    
    // Get total count for pagination
    const total = await Student.countDocuments(filter);
    
    // Get students with filter, populate parent details, with pagination
    const students = await Student.find(filter)
      .populate('parent', 'firstName lastName email phoneNumber parentCode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;
    
    // For API requests
    if (req.xhr || req.headers.accept.includes('application/json')) {
      return res.status(200).json({
        success: true,
        data: students,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
          hasNextPage,
          hasPrevPage
        }
      });
    }
    
    // For browser requests
    // Get distinct values for filters
    const grades = await Student.distinct('grade');
    const sections = await Student.distinct('section');
    const academicYears = await Student.distinct('academicYear');
    
    // Filter out undefined/null values to pass to the view
    const currentFilters = {
      page: pageNum,
      limit: limitNum
    };
    
    if (grade && grade !== 'undefined') currentFilters.grade = grade;
    if (section && section !== 'undefined') currentFilters.section = section;
    if (academicYear && academicYear !== 'undefined') currentFilters.academicYear = academicYear;
    if (status && status !== 'undefined') currentFilters.status = status;
    if (search && search !== 'undefined') currentFilters.search = search;
    
    res.render('admin-students', {
      admin: req.admin,
      students,
      filters: {
        grades,
        sections,
        academicYears,
        statuses: ['Active', 'Inactive', 'Graduated', 'Transferred', 'Suspended']
      },
      currentFilters,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error('Error getting students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
      error: error.message
    });
  }
};

// Get student details
const getStudentDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get pagination parameters for attendance records
    const page = parseInt(req.query.attendancePage) || 1;
    const limit = parseInt(req.query.attendanceLimit) || 10;
    
    // Get student with all referenced data
    const student = await Student.findById(id)
      .populate('parent', 'firstName lastName email phoneNumber parentCode relationshipToStudent')
      .populate({
        path: 'Grades',
        options: { sort: { createdAt: -1 } } // Sort by date descending
      })
      .populate({
        path: 'attendances',
        options: { sort: { date: -1 } } // Sort by date descending but load all records for stats calculation
      })
      .populate('expenses');
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Calculate attendance statistics
    let attendanceStats = {
      present: 0,
      absent: 0,
      late: 0,
      total: 0,
      presentPercentage: 0,
      absentPercentage: 0,
      latePercentage: 0,
      monthlyData: {},
      lastSixMonths: []
    };

    // Calculate attendance pagination
    const totalAttendanceRecords = student.attendances ? student.attendances.length : 0;
    const totalAttendancePages = Math.ceil(totalAttendanceRecords / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    // Get paginated attendance records
    const paginatedAttendances = student.attendances ? student.attendances.slice(startIndex, endIndex) : [];

    if (student.attendances && student.attendances.length > 0) {
      // Count status occurrences
      student.attendances.forEach(attendance => {
        attendanceStats[attendance.status]++;
        attendanceStats.total++;
        
        // Format date to YYYY-MM for monthly grouping
        const date = new Date(attendance.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!attendanceStats.monthlyData[monthKey]) {
          attendanceStats.monthlyData[monthKey] = {
            present: 0,
            absent: 0,
            late: 0,
            total: 0,
            month: date.toLocaleString('default', { month: 'short' }),
            year: date.getFullYear()
          };
        }
        
        attendanceStats.monthlyData[monthKey][attendance.status]++;
        attendanceStats.monthlyData[monthKey].total++;
      });
      
      // Calculate percentages
      attendanceStats.presentPercentage = Math.round((attendanceStats.present / attendanceStats.total) * 100) || 0;
      attendanceStats.absentPercentage = Math.round((attendanceStats.absent / attendanceStats.total) * 100) || 0;
      attendanceStats.latePercentage = Math.round((attendanceStats.late / attendanceStats.total) * 100) || 0;
      
      // Extract last six months data for charts
      const sortedMonths = Object.keys(attendanceStats.monthlyData).sort().slice(-6);
      attendanceStats.lastSixMonths = sortedMonths.map(monthKey => {
        const data = attendanceStats.monthlyData[monthKey];
        return {
          month: data.month,
          year: data.year,
          present: data.present,
          absent: data.absent,
          late: data.late,
          presentPercentage: Math.round((data.present / data.total) * 100) || 0,
          absentPercentage: Math.round((data.absent / data.total) * 100) || 0,
          latePercentage: Math.round((data.late / data.total) * 100) || 0
        };
      });
    }
    
    // Process grades data for chart visualization
    let gradesData = {
      subjects: [],
      scores: [],
      averageScore: 0,
      semesterData: {
        1: { subjects: [], averageScore: 0 },
        2: { subjects: [], averageScore: 0 }
      },
      detailedGrades: [],
      latestAssessments: []
    };
    
    if (student.Grades && student.Grades.length > 0) {
      // Group grades by subject and semester
      const subjectScores = {};
      const semesterScores = { 1: {}, 2: {} };
      let totalScore = 0;
      let scoreCount = 0;
      
      // Collect all assessments across all grades
      const allAssessments = [];
      
      // Process all grades
      student.Grades.forEach(grade => {
        // Calculate overall percentage if not already set
        let overallScore = grade.overallPercentage;
        if (!overallScore) {
          // Calculate from components if available
          let totalPoints = 0;
          let earnedPoints = 0;
          
          // Add midterms
          if (grade.midterms && grade.midterms.length > 0) {
            grade.midterms.forEach(midterm => {
              totalPoints += midterm.maxScore || 0;
              earnedPoints += midterm.score || 0;
            });
          }
          
          // Add quizzes
          if (grade.quizzes && grade.quizzes.length > 0) {
            grade.quizzes.forEach(quiz => {
              totalPoints += quiz.maxScore || 0;
              earnedPoints += quiz.score || 0;
            });
          }
          
          // Add assignments
          if (grade.assignments && grade.assignments.length > 0) {
            grade.assignments.forEach(assignment => {
              totalPoints += assignment.maxScore || 0;
              earnedPoints += assignment.score || 0;
            });
          }
          
          // Add class participation
          if (grade.classParticipation) {
            totalPoints += grade.classParticipation.maxScore || 0;
            earnedPoints += grade.classParticipation.score || 0;
          }
          
          // Add final exam
          if (grade.finalExam) {
            totalPoints += grade.finalExam.maxScore || 0;
            earnedPoints += grade.finalExam.score || 0;
          }
          
          // Calculate percentage
          overallScore = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
        }
        
        // Store the calculated or provided overall percentage
        const scoreValue = Math.round(overallScore * 10) / 10; // Round to 1 decimal place
        
        // Group by subject
        if (!subjectScores[grade.subject]) {
          subjectScores[grade.subject] = [];
        }
        subjectScores[grade.subject].push(scoreValue);
        
        // Group by semester
        if (!semesterScores[grade.semester][grade.subject]) {
          semesterScores[grade.semester][grade.subject] = [];
        }
        semesterScores[grade.semester][grade.subject].push(scoreValue);
        
        // Add to detailed grades array
        gradesData.detailedGrades.push({
          id: grade._id,
          subject: grade.subject,
          semester: grade.semester,
          academicYear: grade.academicYear,
          teacher: grade.teacher,
          letterGrade: grade.letterGrade,
          overallPercentage: scoreValue,
          midterms: grade.midterms || [],
          quizzes: grade.quizzes || [],
          assignments: grade.assignments || [],
          classParticipation: grade.classParticipation || { score: 0, maxScore: 0 },
          finalExam: grade.finalExam || { score: 0, maxScore: 0, status: 'Pending' },
          gradeProgress: grade.gradeProgress || []
        });
        
        // Collect recent assessments for quick view
        const gradeAssessments = [];
        
        // Add midterms
        if (grade.midterms && grade.midterms.length > 0) {
          grade.midterms.forEach(midterm => {
            if (midterm.date && midterm.name) {
              gradeAssessments.push({
                type: 'Midterm',
                name: midterm.name,
                subject: grade.subject,
                date: midterm.date,
                score: midterm.score || 0,
                maxScore: midterm.maxScore || 0,
                percentage: midterm.maxScore ? (midterm.score / midterm.maxScore) * 100 : 0
              });
            }
          });
        }
        
        // Add quizzes
        if (grade.quizzes && grade.quizzes.length > 0) {
          grade.quizzes.forEach(quiz => {
            if (quiz.date && quiz.name) {
              gradeAssessments.push({
                type: 'Quiz',
                name: quiz.name,
                subject: grade.subject,
                date: quiz.date,
                score: quiz.score || 0,
                maxScore: quiz.maxScore || 0,
                percentage: quiz.maxScore ? (quiz.score / quiz.maxScore) * 100 : 0
              });
            }
          });
        }
        
        // Add assignments
        if (grade.assignments && grade.assignments.length > 0) {
          grade.assignments.forEach(assignment => {
            if (assignment.date && assignment.name) {
              gradeAssessments.push({
                type: 'Assignment',
                name: assignment.name,
                subject: grade.subject,
                date: assignment.date,
                score: assignment.score || 0,
                maxScore: assignment.maxScore || 0,
                percentage: assignment.maxScore ? (assignment.score / assignment.maxScore) * 100 : 0
              });
            }
          });
        }
        
        // Add final exam if completed
        if (grade.finalExam && grade.finalExam.date && grade.finalExam.status === 'Completed') {
          gradeAssessments.push({
            type: 'Final Exam',
            name: 'Final Exam',
            subject: grade.subject,
            date: grade.finalExam.date,
            score: grade.finalExam.score || 0,
            maxScore: grade.finalExam.maxScore || 0,
            percentage: grade.finalExam.maxScore ? (grade.finalExam.score / grade.finalExam.maxScore) * 100 : 0
          });
        }
        
        // Add to total for overall average
        totalScore += scoreValue;
        scoreCount++;
        
        // Add this grade's assessments to the overall collection
        allAssessments.push(...gradeAssessments);
      });
      
      // Get latest 5 assessments sorted by date
      if (allAssessments.length > 0) {
        gradesData.latestAssessments = allAssessments
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 5);
      }
      
      // Calculate subject averages for overall view
      Object.keys(subjectScores).forEach(subject => {
        const scores = subjectScores[subject];
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        
        gradesData.subjects.push(subject);
        gradesData.scores.push(Math.round(avgScore * 10) / 10); // Round to 1 decimal place
      });
      
      // Calculate semester averages
      [1, 2].forEach(semester => {
        let semTotalScore = 0;
        let semScoreCount = 0;
        
        Object.keys(semesterScores[semester]).forEach(subject => {
          const scores = semesterScores[semester][subject];
          if (scores.length > 0) {
            const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
            
            gradesData.semesterData[semester].subjects.push({
              name: subject,
              score: Math.round(avgScore * 10) / 10
            });
            
            semTotalScore += avgScore;
            semScoreCount++;
          }
        });
        
        gradesData.semesterData[semester].averageScore = 
          semScoreCount > 0 ? Math.round((semTotalScore / semScoreCount) * 10) / 10 : 0;
      });
      
      // Calculate overall average
      gradesData.averageScore = scoreCount > 0 ? Math.round((totalScore / scoreCount) * 10) / 10 : 0;
    }
    
    // Process expense data
    let expensesData = {
      totalAmount: 0,
      paidAmount: 0,
      unpaidAmount: 0, // pending + overdue
      pendingAmount: 0,
      overdueAmount: 0,
      byType: {},
      byStatus: {
        paid: 0,
        pending: 0,
        overdue: 0
      },
      failedPurchases: [] // unpaid expenses
    };
    
    if (student.expenses && student.expenses.length > 0) {
      student.expenses.forEach(expense => {
        const amount = expense.amount || 0;
        expensesData.totalAmount += amount;
        
        // Categorize by status
        expensesData.byStatus[expense.status] += amount;
        
        if (expense.status === 'paid') {
          expensesData.paidAmount += amount;
        } else {
          expensesData.unpaidAmount += amount;
          // Add to failed purchases list (unpaid expenses)
          expensesData.failedPurchases.push(expense);
          
          if (expense.status === 'pending') {
            expensesData.pendingAmount += amount;
          } else if (expense.status === 'overdue') {
            expensesData.overdueAmount += amount;
          }
        }
        
        // Categorize by type
        const type = expense.type || 'other';
        if (!expensesData.byType[type]) {
          expensesData.byType[type] = {
            amount: 0,
            count: 0,
            label: type.charAt(0).toUpperCase() + type.slice(1)
          };
        }
        expensesData.byType[type].amount += amount;
        expensesData.byType[type].count++;
      });
      
      // Sort failed purchases by date (newest first)
      expensesData.failedPurchases.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
    }
    
    // For API requests
    if (req.xhr || req.headers.accept.includes('application/json')) {
      return res.status(200).json({
        success: true,
        data: student,
        attendanceStats,
        paginatedAttendances,
        attendancePagination: {
          total: totalAttendanceRecords,
          page,
          totalPages: totalAttendancePages,
          limit,
          hasNextPage: page < totalAttendancePages,
          hasPrevPage: page > 1
        },
        gradesData,
        expensesData
      });
    }
    
    // For browser requests
    res.render('admin-student-details', {
      admin: req.admin,
      student,
      attendanceStats,
      paginatedAttendances,
      attendancePagination: {
        total: totalAttendanceRecords,
        page,
        totalPages: totalAttendancePages,
        limit,
        hasNextPage: page < totalAttendancePages,
        hasPrevPage: page > 1
      },
      gradesData,
      expensesData
    });
  } catch (error) {
    console.error('Error fetching student details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student details',
      error: error.message
    });
  }
};

// Update student
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // If password is provided, hash it
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    
    // Update student
    const student = await Student.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: student
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update student',
      error: error.message
    });
  }
};

// Delete student
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find student to get parent ID if exists
    const student = await Student.findById(id);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // If student has a parent, remove student from parent's childs array
    if (student.parent) {
      await Parent.findByIdAndUpdate(
        student.parent,
        { $pull: { childs: id } }
      );
    }
    
    // Delete related data
    // await Grade.deleteMany({ student: id });
    // await Attendance.deleteMany({ student: id });
    // await Expense.deleteMany({ student: id });
    
    // Delete student
    await Student.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete student',
      error: error.message
    });
  }
};

// Parent Management Functions
const getAllParents = async (req, res) => {
    try {
        // Get query parameters for filtering
        const { relationshipToStudent, hasChildren, search, page = 1, limit = 10 } = req.query;
        
        // Build filter query
        let query = {};
        
        if (relationshipToStudent && relationshipToStudent !== 'undefined') {
            query.relationshipToStudent = relationshipToStudent;
        }
        
        if (hasChildren === 'true') {
            query.childs = { $exists: true, $ne: [] };
        } else if (hasChildren === 'false') {
            query.$or = [
                { childs: { $exists: false } },
                { childs: [] }
            ];
        }
        
        if (search && search !== 'undefined') {
            // Search in multiple fields
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phoneNumber: { $regex: search, $options: 'i' } },
                { parentCode: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Convert page and limit to numbers
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const skip = (pageNum - 1) * limitNum;
        
        // Get total count for pagination
        const total = await Parent.countDocuments(query);
        
        // Get parents with populated children, with pagination
        const parents = await Parent.find(query)
            .populate('childs')
            .sort({ firstName: 1, lastName: 1 })
            .skip(skip)
            .limit(limitNum);
        
        // Calculate pagination metadata
        const totalPages = Math.ceil(total / limitNum);
        const hasNextPage = pageNum < totalPages;
        const hasPrevPage = pageNum > 1;
        
        // For API requests
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.status(200).json({
                success: true,
                data: parents,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages,
                    hasNextPage,
                    hasPrevPage
                }
            });
        }
        
        // For browser requests
        // Get distinct values for filters
        const relationships = await Parent.distinct('relationshipToStudent');
        
        // Filter out undefined/null values to pass to the view
        const currentFilters = {
            page: pageNum,
            limit: limitNum
        };
        
        if (relationshipToStudent && relationshipToStudent !== 'undefined') 
            currentFilters.relationshipToStudent = relationshipToStudent;
        if (hasChildren && hasChildren !== 'undefined') 
            currentFilters.hasChildren = hasChildren;
        if (search && search !== 'undefined') 
            currentFilters.search = search;
        
        res.render('admin-parents', {
            admin: req.admin,
            parents,
            currentFilters,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages,
                hasNextPage,
                hasPrevPage
            }
        });
    } catch (error) {
        console.error('Error getting parents:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch parents',
            error: error.message
        });
    }
}

const getParentDetails = async (req, res) => {
    try {
        const parentId = req.params.id;
        
        // Get parent with populated children and transaction history
        const parent = await Parent.findById(parentId)
            .populate({
                path: 'childs',
                select: 'firstName lastName grade section academicYear status profilePicture email balance attendances'
            })
            .populate({
                path: 'transactionHistory',
                select: 'date description amount type status createdAt'
            });
        
        if (!parent) {
            return res.status(404).json({ success: false, message: 'Parent not found' });
        }

        // Calculate financial summaries
        let financialData = {
            parentBalance: parent.balance || 0,
            childrenBalance: 0,
            totalBalance: 0,
            totalPaid: 0,
            totalPending: 0,
            children: []
        };
        
        // Collect student IDs to fetch attendance data
        const studentIds = parent.childs.map(child => child._id);
        
        // Fetch attendance records for all children
        const attendanceRecords = await Attendance.find({
            student: { $in: studentIds }
        });
        
        // Organize attendance by student
        const attendanceByStudent = {};
        attendanceRecords.forEach(record => {
            if (!attendanceByStudent[record.student]) {
                attendanceByStudent[record.student] = {
                    total: 0,
                    present: 0
                };
            }
            
            attendanceByStudent[record.student].total++;
            if (record.status === 'present') {
                attendanceByStudent[record.student].present++;
            }
        });
        
        // Calculate children's total balance and add attendance data
        if (parent.childs && parent.childs.length > 0) {
            await Promise.all(parent.childs.map(async (child) => {
                const childBalance = child.balance || 0;
                financialData.childrenBalance += childBalance;
                
                // Calculate attendance percentage for this child
                let attendancePercentage = 0;
                if (attendanceByStudent[child._id]) {
                    const attendance = attendanceByStudent[child._id];
                    if (attendance.total > 0) {
                        attendancePercentage = Math.round((attendance.present / attendance.total) * 100);
                    }
                }
                
                // Add to children array with financial info, ensure no undefined values
                financialData.children.push({
                    id: child._id,
                    name: `${child.firstName || 'Unnamed'} ${child.lastName || ''}`.trim(),
                    balance: childBalance,
                    grade: child.grade || 'N/A',
                    section: child.section || 'N/A',
                    attendancePercentage: attendancePercentage
                });
            }));
        }
        
        // Calculate total balance (parent + children)
        financialData.totalBalance = financialData.parentBalance + financialData.childrenBalance;
        
        // Process transaction history
        if (parent.transactionHistory && parent.transactionHistory.length > 0) {
            parent.transactionHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            // Ensure all transactions have valid amount values and calculate totals
            parent.transactionHistory.forEach(transaction => {
                if (transaction.amount === undefined || transaction.amount === null) {
                    transaction.amount = 0;
                }
              
                if (transaction.type === 'payment' && transaction.status === 'completed') {
                    financialData.totalPaid += transaction.amount;
                } else if (transaction.status === 'pending') {
                    financialData.totalPending += transaction.amount;
                }
            });
        } else {
            // Initialize empty array if no transactions
            parent.transactionHistory = [];
        }
        
        // Determine payment status
        let paymentStatus = 'Good Standing';
        if (financialData.totalPending > 0) {
            paymentStatus = 'Pending Payments';
        } else if (financialData.totalBalance < 0) {
            paymentStatus = 'Outstanding Balance';
        }
        
        financialData.paymentStatus = paymentStatus;
        
        // For API requests
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.status(200).json({ 
                success: true, 
                data: parent,
                financialData
            });
        }
        console.log(parent);
        console.log(financialData);
        
        // For browser requests
        res.render('admin-parent-details', {
            admin: req.admin,
            parent,
            financialData,
            attendanceByStudent
        });
    } catch (error) {
        console.error('Error getting parent details:', error);
        
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch parent details',
                error: error.message 
            });
        } else {
            // For browser requests, render error or redirect
            return res.redirect('/admin/parents');
        }
    }
};

const updateParent = async (req, res) => {
    try {
        const parentId = req.params.id;
        
        // Get parent
        const parent = await Parent.findById(parentId);
        
        if (!parent) {
            return res.status(404).json({ success: false, message: 'Parent not found' });
        }
        
        // Fields to update
        const updateFields = {};
        
        // Basic information
        if (req.body.firstName) updateFields.firstName = req.body.firstName;
        if (req.body.lastName) updateFields.lastName = req.body.lastName;
        if (req.body.email) updateFields.email = req.body.email;
        if (req.body.phoneNumber) updateFields.phoneNumber = req.body.phoneNumber;
        if (req.body.alternatePhone) updateFields.alternatePhone = req.body.alternatePhone;
        if (req.body.gender) updateFields.gender = req.body.gender;
        if (req.body.dateOfBirth) updateFields.dateOfBirth = req.body.dateOfBirth;
        if (req.body.age) updateFields.age = parseInt(req.body.age);
        
        // Address (only update if provided)
        if (req.body.address) {
            updateFields.address = {
                street: req.body.address.street || parent.address?.street,
                city: req.body.address.city || parent.address?.city,
                state: req.body.address.state || parent.address?.state,
                zipCode: req.body.address.zipCode || parent.address?.zipCode,
                country: req.body.address.country || parent.address?.country
            };
        }
        
        // Professional information
        if (req.body.occupation) updateFields.occupation = req.body.occupation;
        if (req.body.education) updateFields.education = req.body.education;
        
        // Workplace information (only update if provided)
        if (req.body.workplaceInfo) {
            updateFields.workplaceInfo = {
                companyName: req.body.workplaceInfo.companyName || parent.workplaceInfo?.companyName,
                position: req.body.workplaceInfo.position || parent.workplaceInfo?.position,
                address: req.body.workplaceInfo.address || parent.workplaceInfo?.address,
                phone: req.body.workplaceInfo.phone || parent.workplaceInfo?.phone
            };
        }
        
        // Family information
        if (req.body.relationshipToStudent) updateFields.relationshipToStudent = req.body.relationshipToStudent;
        if (req.body.maritalStatus) updateFields.maritalStatus = req.body.maritalStatus;
        if (req.body.numberOfChildren) updateFields.numberOfChildren = parseInt(req.body.numberOfChildren);
        if (req.body.preferredContactMethod) updateFields.preferredContactMethod = req.body.preferredContactMethod;
        
        // Spouse information (only update if provided)
        if (req.body.spouseInfo) {
            updateFields.spouseInfo = {
                name: req.body.spouseInfo.name || parent.spouseInfo?.name,
                phoneNumber: req.body.spouseInfo.phoneNumber || parent.spouseInfo?.phoneNumber,
                email: req.body.spouseInfo.email || parent.spouseInfo?.email,
                occupation: req.body.spouseInfo.occupation || parent.spouseInfo?.occupation
            };
        }
        
        // Update emergency contact (only update if provided)
        if (req.body.emergencyContact) {
            updateFields.emergencyContact = {
                name: req.body.emergencyContact.name || parent.emergencyContact?.name,
                relationship: req.body.emergencyContact.relationship || parent.emergencyContact?.relationship,
                phone: req.body.emergencyContact.phone || parent.emergencyContact?.phone
            };
        }
        
        // Update balance if provided
        if (req.body.balance !== undefined) updateFields.balance = parseFloat(req.body.balance);
        
        // Update parent
        const updatedParent = await Parent.findByIdAndUpdate(
            parentId,
            { $set: updateFields },
            { new: true }
        );
        
        res.status(200).json({ success: true, data: updatedParent, message: 'Parent updated successfully' });
    } catch (error) {
        console.error('Error updating parent:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteParent = async (req, res) => {
    try {
        const parentId = req.params.id;
        
        // Get parent
        const parent = await Parent.findById(parentId);
        
        if (!parent) {
            return res.status(404).json({ success: false, message: 'Parent not found' });
        }
        
        // If parent has children, update their parent references
        if (parent.childs && parent.childs.length > 0) {
            await Student.updateMany(
                { _id: { $in: parent.childs } },
                { $unset: { parent: 1 } }
            );
        }
        
        // Delete parent
        await Parent.findByIdAndDelete(parentId);
        
        res.status(200).json({ success: true, message: 'Parent deleted successfully' });
    } catch (error) {
        console.error('Error deleting parent:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update parent balance
const updateParentBalance = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, type, description } = req.body;
        
        // Validate inputs
        if (!amount || !type) {
            return res.status(400).json({ 
                success: false, 
                message: 'Amount and transaction type are required' 
            });
        }
        
        // Parse amount to ensure it's a number
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Amount must be a valid number' 
            });
        }
        
        // Get parent
        const parent = await Parent.findById(id);
        if (!parent) {
            return res.status(404).json({ 
                success: false, 
                message: 'Parent not found' 
            });
        }
        
        // Validate transaction type
        if (type !== 'deposit' && type !== 'withdraw') {
            return res.status(400).json({ 
                success: false, 
                message: 'Transaction type must be deposit or withdraw' 
            });
        }
        
        // Create pending transaction record
        const transaction = new Transaction({
            parent: parent._id,
            description: description || (type === 'deposit' ? 'Deposit to account' : 'Withdrawal from account'),
            amount: parsedAmount,
            type: type === 'deposit' ? 'deposit' : 'withdrawal',
            status: 'pending',
            initiatedBy: 'admin'
        });
        
        await transaction.save();
        
        // Add transaction to parent's transaction history without updating balance yet
        await Parent.findByIdAndUpdate(
            id,
            { $push: { transactionHistory: transaction._id } },
            { new: true }
        );
        
        return res.status(200).json({ 
            success: true, 
            transaction,
            message: `Pending ${type} transaction created successfully. Awaiting parent approval.`
        });
        
    } catch (error) {
        console.error('Error creating pending transaction:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'An error occurred while creating the pending transaction',
            error: error.message 
        });
    }
};

// Excel upload placeholder (to be implemented with actual Excel parsing library)
const uploadStudentsFromExcel = async (req, res) => {
  try {
    // Implementation will require a file upload middleware like multer
    // and an Excel parsing library like exceljs or xlsx
    
    res.status(200).json({
      success: true,
      message: 'Excel upload functionality will be implemented here'
    });
  } catch (error) {
    console.error('Error uploading students from Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload students from Excel',
      error: error.message
    });
  }
};

// const addTestAttendance = async (req, res) => {
// ... existing code ...

// Expense Management Functions

// Get expense by ID
const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const expense = await Expense.findById(id);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Error getting expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get expense',
      error: error.message
    });
  }
};

// Create expense
const createExpense = async (req, res) => {
  try {
    const { student, description, amount, date, type, status } = req.body;
    
    // Validate required fields
    if (!student || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Student and amount are required fields'
      });
    }
    
    // Create expense
    const expense = new Expense({
      student,
      description,
      amount,
      date: date || Date.now(),
      type: type || 'tuition',
      status: status || 'pending'
    });
    
    await expense.save();
    
    // Add expense to student
    await Student.findByIdAndUpdate(
      student,
      { $push: { expenses: expense._id } }
    );
    
    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: expense
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create expense',
      error: error.message
    });
  }
};

// Update expense
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const expense = await Expense.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      data: expense
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update expense',
      error: error.message
    });
  }
};

// Mark expense as paid
const markExpenseAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    
    const expense = await Expense.findByIdAndUpdate(
      id,
      { $set: { status: 'paid' } },
      { new: true }
    );
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Expense marked as paid',
      data: expense
    });
  } catch (error) {
    console.error('Error marking expense as paid:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark expense as paid',
      error: error.message
    });
  }
};

// Delete expense
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find expense to get student ID
    const expense = await Expense.findById(id);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }
    
    // Remove expense from student
    await Student.findByIdAndUpdate(
      expense.student,
      { $pull: { expenses: id } }
    );
    
    // Delete expense
    await Expense.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete expense',
      error: error.message
    });
  }
};

// Expenses dashboard page
const getExpensesDashboard = async (req, res) => {
    try {
        // Get pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // Get total count for pagination
        const totalRecords = await Expense.countDocuments();
        const totalPages = Math.ceil(totalRecords / limit);
        
        // Only fetch the data needed for current page
        const expenses = await Expense.find()
            .populate('student', 'firstName lastName')
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);
        
        // Get aggregated statistics in a single query
        const expenseStats = await Expense.aggregate([
            {
                $facet: {
                    // Total amount by status
                    byStatus: [
                        {
                            $group: {
                                _id: '$status',
                                amount: { $sum: '$amount' }
                            }
                        }
                    ],
                    // Total amount by type
                    byType: [
                        {
                            $group: {
                                _id: '$type',
                                amount: { $sum: '$amount' },
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    // Total amount
                    total: [
                        {
                            $group: {
                                _id: null,
                                amount: { $sum: '$amount' }
                            }
                        }
                    ]
                }
            }
        ]);
        
        // Process expense by status
        const expensesByStatus = {
            paid: 0,
            pending: 0,
            overdue: 0
        };
        
        expenseStats[0].byStatus.forEach(stat => {
            if (stat._id in expensesByStatus) {
                expensesByStatus[stat._id] = stat.amount;
            }
        });
        
        // Process expense by type for chart
        const typeData = expenseStats[0].byType.sort((a, b) => b.amount - a.amount);
        const expenseTypeLabels = typeData.map(item => 
            item._id.charAt(0).toUpperCase() + item._id.slice(1)
        );
        const expenseTypeData = typeData.map(item => item.amount);
        
        // Get total amount
        const totalAmount = expenseStats[0].total.length > 0 ? expenseStats[0].total[0].amount : 0;
        
        // Monthly trend data (last 6 months)
        const now = new Date();
        const monthlyData = [];
        const statusByMonth = {
            months: [],
            paid: [],
            pending: [],
            overdue: []
        };
        
        // Generate the last 6 months
        for (let i = 5; i >= 0; i--) {
            const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const monthName = month.toLocaleString('default', { month: 'short' });
            
            monthlyData.push({
                month,
                monthEnd,
                monthName
            });
            
            statusByMonth.months.push(monthName);
        }
        
        // Get monthly expense data efficiently with aggregation
        const monthlyStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const monthlyExpenses = await Expense.aggregate([
            {
                $match: {
                    date: { $gte: monthlyStart }
                }
            },
            {
                $addFields: {
                    month: { $month: '$date' },
                    year: { $year: '$date' }
                }
            },
            {
                $group: {
                    _id: {
                        year: '$year',
                        month: '$month',
                        status: '$status'
                    },
                    amount: { $sum: '$amount' }
                }
            }
        ]);
        
        // Initialize arrays
        statusByMonth.paid = Array(6).fill(0);
        statusByMonth.pending = Array(6).fill(0);
        statusByMonth.overdue = Array(6).fill(0);
        
        // Map monthly expense data
        monthlyExpenses.forEach(record => {
            // Find which month index this record belongs to
            for (let i = 0; i < monthlyData.length; i++) {
                const monthData = monthlyData[i];
                const recordMonth = record._id.month;
                const recordYear = record._id.year;
                const dataMonth = monthData.month.getMonth() + 1; // getMonth() is 0-based
                const dataYear = monthData.month.getFullYear();
                
                if (recordMonth === dataMonth && recordYear === dataYear) {
                    statusByMonth[record._id.status][i] = record.amount;
                    break;
                }
            }
        });
        
        // Calculate expense growth rate
        const currentMonthIndex = 5; // Last month in our array
        const previousMonthIndex = 4;
        
        const currentMonthTotal = statusByMonth.paid[currentMonthIndex] + 
                                 statusByMonth.pending[currentMonthIndex] + 
                                 statusByMonth.overdue[currentMonthIndex];
                                 
        const previousMonthTotal = statusByMonth.paid[previousMonthIndex] + 
                                   statusByMonth.pending[previousMonthIndex] + 
                                   statusByMonth.overdue[previousMonthIndex];
        
        const expenseGrowthRate = previousMonthTotal > 0 
            ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal * 100).toFixed(1)
            : 0;
            
        // Calculate percentage paid vs unpaid
        const paidPercentage = totalAmount > 0 
            ? (expensesByStatus.paid / totalAmount * 100).toFixed(1) 
            : 0;
            
        const pendingPercentage = totalAmount > 0 
            ? (expensesByStatus.pending / totalAmount * 100).toFixed(1) 
            : 0;
            
        const overduePercentage = totalAmount > 0 
            ? (expensesByStatus.overdue / totalAmount * 100).toFixed(1) 
            : 0;
        
        res.render('admin-expenses', {
            admin: req.admin,
            expenses: expenses,
            totalAmount,
            expenseTypeLabels,
            expenseTypeData,
            expensesByStatus,
            statusByMonth,
            paidPercentage,
            pendingPercentage,
            overduePercentage,
            expenseGrowthRate: parseFloat(expenseGrowthRate),
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalRecords: totalRecords,
                limit: limit
            }
        });
    } catch (error) {
        console.error('Error loading expenses dashboard:', error);
        res.status(500).json({ message: 'Error loading expenses dashboard' });
    }
};

// Grades dashboard page
const getGradesDashboard = async (req, res) => {
    try {
        const grades = await Grade.find().populate('student', 'firstName lastName grade section');
        
        // Calculate average grade
        const totalGrades = grades.reduce((total, grade) => total + grade.grade, 0);
        const averageGrade = totalGrades / (grades.length || 1);
        
        // Group grades by subject
        const gradesBySubject = {};
        grades.forEach(grade => {
            if (!gradesBySubject[grade.subject]) {
                gradesBySubject[grade.subject] = {
                    total: 0,
                    count: 0,
                    average: 0,
                    grades: []
                };
            }
            gradesBySubject[grade.subject].total += grade.grade;
            gradesBySubject[grade.subject].count += 1;
            gradesBySubject[grade.subject].grades.push(grade.grade);
        });
        
        // Calculate average grade for each subject and other statistics
        const subjectsData = {
            labels: [],
            averages: [],
            sortedSubjects: []
        };
        
        for (const subject in gradesBySubject) {
            gradesBySubject[subject].average = 
                gradesBySubject[subject].total / gradesBySubject[subject].count;
            
            subjectsData.labels.push(subject);
            subjectsData.averages.push(gradesBySubject[subject].average);
        }
        
        // Sort subjects by average grade (descending)
        subjectsData.sortedSubjects = Object.entries(gradesBySubject)
            .sort((a, b) => b[1].average - a[1].average)
            .map(([subject, data]) => ({
                subject,
                average: data.average
            }));
        
        // Group students by performance
        const performanceGroups = {
            excellent: 0, // 90-100
            good: 0,      // 80-89
            average: 0,   // 70-79
            belowAverage: 0, // 60-69
            poor: 0       // Below 60
        };
        
        grades.forEach(grade => {
            if (grade.grade >= 90) {
                performanceGroups.excellent += 1;
            } else if (grade.grade >= 80) {
                performanceGroups.good += 1;
            } else if (grade.grade >= 70) {
                performanceGroups.average += 1;
            } else if (grade.grade >= 60) {
                performanceGroups.belowAverage += 1;
            } else {
                performanceGroups.poor += 1;
            }
        });
        
        // Calculate performance distribution percentages
        const totalGradeEntries = grades.length;
        const performancePercentages = {
            excellent: totalGradeEntries > 0 ? (performanceGroups.excellent / totalGradeEntries * 100).toFixed(1) : 0,
            good: totalGradeEntries > 0 ? (performanceGroups.good / totalGradeEntries * 100).toFixed(1) : 0,
            average: totalGradeEntries > 0 ? (performanceGroups.average / totalGradeEntries * 100).toFixed(1) : 0,
            belowAverage: totalGradeEntries > 0 ? (performanceGroups.belowAverage / totalGradeEntries * 100).toFixed(1) : 0,
            poor: totalGradeEntries > 0 ? (performanceGroups.poor / totalGradeEntries * 100).toFixed(1) : 0
        };
        
        // Get performance trends data (last 6 months)
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        
        // Get grades from last 6 months
        const recentGrades = await Grade.find({
            createdAt: { $gte: sixMonthsAgo }
        }).sort('createdAt');
        
        // Organize grades by month
        const gradesByMonth = {};
        const monthNames = [];
        
        // Initialize months
        for (let i = 0; i < 6; i++) {
            const month = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
            const monthName = month.toLocaleString('default', { month: 'short' });
            monthNames.push(monthName);
            
            gradesByMonth[monthName] = {
                total: 0,
                count: 0,
                average: 0,
                bySubject: {}
            };
        }
        
        // Gather popular subjects
        const popularSubjects = {};
        recentGrades.forEach(grade => {
            if (!popularSubjects[grade.subject]) {
                popularSubjects[grade.subject] = 0;
            }
            popularSubjects[grade.subject]++;
        });
        
        // Get top 3 subjects
        const topSubjects = Object.entries(popularSubjects)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(item => item[0]);
            
        // Fill in data for each month by subject
        recentGrades.forEach(grade => {
            const gradeDate = new Date(grade.createdAt);
            const monthName = gradeDate.toLocaleString('default', { month: 'short' });
            
            if (gradesByMonth[monthName]) {
                gradesByMonth[monthName].total += grade.grade;
                gradesByMonth[monthName].count++;
                
                if (!gradesByMonth[monthName].bySubject[grade.subject]) {
                    gradesByMonth[monthName].bySubject[grade.subject] = {
                        total: 0,
                        count: 0,
                        average: 0
                    };
                }
                
                gradesByMonth[monthName].bySubject[grade.subject].total += grade.grade;
                gradesByMonth[monthName].bySubject[grade.subject].count++;
            }
        });
        
        // Calculate averages
        for (const month in gradesByMonth) {
            if (gradesByMonth[month].count > 0) {
                gradesByMonth[month].average = gradesByMonth[month].total / gradesByMonth[month].count;
            }
            
            for (const subject in gradesByMonth[month].bySubject) {
                const subjectData = gradesByMonth[month].bySubject[subject];
                if (subjectData.count > 0) {
                    subjectData.average = subjectData.total / subjectData.count;
                }
            }
        }
        
        // Prepare trends data for chart
        const trendsData = {
            labels: monthNames,
            datasets: []
        };
        
        // Add data for each top subject
        topSubjects.forEach((subject, index) => {
            const subjectTrends = [];
            
            monthNames.forEach(month => {
                if (gradesByMonth[month].bySubject[subject] && gradesByMonth[month].bySubject[subject].count > 0) {
                    subjectTrends.push(gradesByMonth[month].bySubject[subject].average);
                } else {
                    subjectTrends.push(null); // No data for this month
                }
            });
            
            trendsData.datasets.push({
                subject,
                data: subjectTrends
            });
        });
        
        // Sort grades by date (newest first) for the table
        const sortedGrades = [...grades].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        res.render('admin-grades', {
            admin: req.admin,
            grades: sortedGrades,
            averageGrade,
            gradesBySubject,
            subjectsData,
            performanceGroups,
            performancePercentages,
            trendsData
        });
    } catch (error) {
        console.error('Error loading grades dashboard:', error);
        res.status(500).json({ message: 'Error loading grades dashboard' });
    }
};

// Get grade by ID
const getGradeById = async (req, res) => {
    try {
        const grade = await Grade.findById(req.params.id).populate('student', 'firstName lastName');
        
        if (!grade) {
            return res.status(404).json({ message: 'Grade not found' });
        }
        
        res.status(200).json({
            admin: req.admin,
            grade
        });
    } catch (error) {
        console.error('Error getting grade:', error);
        res.status(500).json({ message: 'Error getting grade' });
    }
};

// Create grade
const createGrade = async (req, res) => {
    try {
        const { student, subject, grade, term, academicYear } = req.body;
        
        const newGrade = new Grade({
            student,
            subject,
            grade,
            term,
            academicYear
        });
        
        await newGrade.save();
        
        res.status(201).json({ 
            message: 'Grade created successfully',
            grade: newGrade
        });
    } catch (error) {
        console.error('Error creating grade:', error);
        res.status(500).json({ message: 'Error creating grade' });
    }
};

// Update grade
const updateGrade = async (req, res) => {
    try {
        const { subject, grade, term, academicYear } = req.body;
        
        const updatedGrade = await Grade.findByIdAndUpdate(
            req.params.id,
            { subject, grade, term, academicYear },
            { new: true }
        );
        
        if (!updatedGrade) {
            return res.status(404).json({ message: 'Grade not found' });
        }
        
        res.status(200).json({ 
            message: 'Grade updated successfully',
            grade: updatedGrade
        });
    } catch (error) {
        console.error('Error updating grade:', error);
        res.status(500).json({ message: 'Error updating grade' });
    }
};

// Delete grade
const deleteGrade = async (req, res) => {
    try {
        const deletedGrade = await Grade.findByIdAndDelete(req.params.id);
        
        if (!deletedGrade) {
            return res.status(404).json({ message: 'Grade not found' });
        }
        
        res.status(200).json({ message: 'Grade deleted successfully' });
    } catch (error) {
        console.error('Error deleting grade:', error);
        res.status(500).json({ message: 'Error deleting grade' });
    }
};

// Attendance dashboard page
const getAttendanceDashboard = async (req, res) => {
    try {
        // Get pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // Get total count for pagination
        const totalRecords = await Attendance.countDocuments();
        const totalPages = Math.ceil(totalRecords / limit);
        
        // Only fetch the data needed for current page
        const attendance = await Attendance.find()
            .populate('student', 'firstName lastName grade section')
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);
        
        // Get aggregated statistics (separate from paginated data)
        const attendanceStats = await Attendance.aggregate([
            { $group: {
                _id: '$status',
                count: { $sum: 1 }
            }}
        ]);
        
        // Process statistics
        const attendanceByStatus = {
            present: 0,
            absent: 0,
            late: 0
        };
        
        attendanceStats.forEach(stat => {
            if (stat._id in attendanceByStatus) {
                attendanceByStatus[stat._id] = stat.count;
            }
        });
        
        // Calculate percentages
        const totalAttendanceCount = Object.values(attendanceByStatus).reduce((sum, val) => sum + val, 0);
        const attendancePercentages = {
            present: totalAttendanceCount > 0 ? (attendanceByStatus.present / totalAttendanceCount) * 100 : 0,
            absent: totalAttendanceCount > 0 ? (attendanceByStatus.absent / totalAttendanceCount) * 100 : 0,
            late: totalAttendanceCount > 0 ? (attendanceByStatus.late / totalAttendanceCount) * 100 : 0
        };
        
        // Weekly attendance data
        const now = new Date();
        const today = now.getDay(); // 0 (Sunday) to 6 (Saturday)
        const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        
        // Calculate start and end of current week (Monday to Friday)
        const mondayOffset = today === 0 ? -6 : 1 - today; // If Sunday, get previous week's Monday
        const fridayOffset = today === 0 ? -2 : 5 - today; // If Sunday, get previous week's Friday
        
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);
        monday.setHours(0, 0, 0, 0);
        
        const friday = new Date(now);
        friday.setDate(now.getDate() + fridayOffset);
        friday.setHours(23, 59, 59, 999);
        
        // Use aggregation for weekly data instead of fetching all records
        const weeklyAttendance = await Attendance.aggregate([
            {
                $match: {
                    date: { $gte: monday, $lte: friday }
                }
            },
            {
                $addFields: {
                    dayOfWeek: { $dayOfWeek: '$date' }
                }
            },
            {
                $match: {
                    dayOfWeek: { $gte: 2, $lte: 6 } // Monday (2) to Friday (6)
                }
            },
            {
                $group: {
                    _id: {
                        status: '$status',
                        dayOfWeek: '$dayOfWeek'
                    },
                    count: { $sum: 1 }
                }
            }
        ]);
        
        // Initialize weekly data structure
        const weeklyData = {
            labels: weekdays,
            present: Array(5).fill(0),
            late: Array(5).fill(0),
            absent: Array(5).fill(0),
            percentages: {
                present: Array(5).fill(0),
                late: Array(5).fill(0),
                absent: Array(5).fill(0)
            }
        };
        
        // Process aggregated weekly data
        weeklyAttendance.forEach(record => {
            const dayIndex = record._id.dayOfWeek - 2; // Convert Monday (2) to index 0
            weeklyData[record._id.status][dayIndex] = record.count;
        });
        
        // Calculate total records for each day and percentages
        for (let i = 0; i < 5; i++) {
            const total = weeklyData.present[i] + weeklyData.late[i] + weeklyData.absent[i];
            if (total > 0) {
                weeklyData.percentages.present[i] = (weeklyData.present[i] / total) * 100;
                weeklyData.percentages.late[i] = (weeklyData.late[i] / total) * 100;
                weeklyData.percentages.absent[i] = (weeklyData.absent[i] / total) * 100;
            }
        }
        
        // Get calendar data for current month more efficiently
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const monthlyAttendance = await Attendance.aggregate([
            {
                $match: {
                    date: { $gte: firstDayOfMonth, $lte: lastDayOfMonth }
                }
            },
            {
                $addFields: {
                    dateString: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                    day: { $dayOfMonth: '$date' }
                }
            },
            {
                $group: {
                    _id: {
                        dateString: '$dateString',
                        day: '$day',
                        status: '$status'
                    },
                    count: { $sum: 1 }
                }
            }
        ]);
        
        // Initialize calendar data
        const calendarData = {};
        for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
            const date = new Date(now.getFullYear(), now.getMonth(), day);
            const dateStr = date.toISOString().split('T')[0];
            calendarData[dateStr] = {
                present: 0,
                late: 0,
                absent: 0,
                total: 0,
                date: date,
                displayDate: day,
                dayOfWeek: date.getDay()
            };
        }
        
        // Fill in attendance data for the month
        monthlyAttendance.forEach(record => {
            const dateStr = record._id.dateString;
            const status = record._id.status;
            
            if (calendarData[dateStr]) {
                calendarData[dateStr][status]++;
                calendarData[dateStr].total++;
            }
        });
        
        res.render('admin-attendance', {
            admin: req.admin,
            attendance: attendance,
            attendanceByStatus,
            attendancePercentages,
            weeklyData,
            calendarData,
            currentMonth: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalRecords: totalRecords,
                limit: limit
            }
        });
    } catch (error) {
        console.error('Error loading attendance dashboard:', error);
        res.status(500).json({ message: 'Error loading attendance dashboard' });
    }
};

// Get attendance by ID
const getAttendanceById = async (req, res) => {
    try {
        const attendance = await Attendance.findById(req.params.id).populate('student', 'firstName lastName');
        
        if (!attendance) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }
        
        res.status(200).json({
            admin: req.admin,
            attendance
        });
    } catch (error) {
        console.error('Error getting attendance record:', error);
        res.status(500).json({ message: 'Error getting attendance record' });
    }
};

// Create attendance
const createAttendance = async (req, res) => {
    try {
        const { student, date, status } = req.body;
        
        const newAttendance = new Attendance({
            student,
            date,
            status
        });
        
        await newAttendance.save();
        
        res.status(201).json({ 
            message: 'Attendance record created successfully',
            attendance: newAttendance
        });
    } catch (error) {
        console.error('Error creating attendance record:', error);
        res.status(500).json({ message: 'Error creating attendance record' });
    }
};

// Update attendance
const updateAttendance = async (req, res) => {
    try {
        const { date, status } = req.body;
        
        const updatedAttendance = await Attendance.findByIdAndUpdate(
            req.params.id,
            { date, status },
            { new: true }
        );
        
        if (!updatedAttendance) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }
        
        res.status(200).json({ 
            message: 'Attendance record updated successfully',
            attendance: updatedAttendance
        });
    } catch (error) {
        console.error('Error updating attendance record:', error);
        res.status(500).json({ message: 'Error updating attendance record' });
    }
};

// Delete attendance
const deleteAttendance = async (req, res) => {
    try {
        const deletedAttendance = await Attendance.findByIdAndDelete(req.params.id);
        
        if (!deletedAttendance) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }
        
        res.status(200).json({ message: 'Attendance record deleted successfully' });
    } catch (error) {
        console.error('Error deleting attendance record:', error);
        res.status(500).json({ message: 'Error deleting attendance record' });
    }
};

// ===== Teacher Management Functions =====

// Get all teachers
const getTeachers = async (req, res) => {
    try {
        const teachers = await Teacher.find().select('-password');
        
        res.render('admin-teachers', { 
            title: 'Teachers Management',
            teachers,
            admin: req.admin,
            activePage: 'teachers'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get create teacher page
const getCreateTeacherPage = async (req, res) => {
    try {
        res.render('admin-create-teacher', { 
            title: 'Create Teacher',
            admin: req.admin,
            activePage: 'create-teacher'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create a new teacher
const createTeacher = async (req, res) => {
    try {
        console.log('Create teacher request body:', req.body);
        const { username, email, firstName, lastName, password, phoneNumber, profilePicture } = req.body;
        
        // Enhanced validation
        if (!username || !email || !firstName || !lastName || !password) {
            return res.status(400).json({ 
                message: 'Missing required fields: username, email, firstName, lastName, and password are required' 
            });
        }
        
        // Check if username or email already exists
        const existingTeacher = await Teacher.findOne({ $or: [{ username }, { email }] });
        if (existingTeacher) {
            return res.status(400).json({ 
                message: existingTeacher.username === username ? 'Username already exists' : 'Email already exists' 
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create teacher
        const teacher = new Teacher({
            username,
            email,
            firstName,
            lastName,
            password: hashedPassword,
            phoneNumber,
            profilePicture: profilePicture || 'https://via.placeholder.com/150',
            classes: [] // Initialize with empty classes array
        });
        
        await teacher.save();
        console.log('Teacher created successfully:', teacher._id);
        
        res.status(201).json({ 
            success: true,
            message: 'Teacher created successfully', 
            teacher: {
                id: teacher._id,
                username: teacher.username,
                email: teacher.email,
                firstName: teacher.firstName,
                lastName: teacher.lastName
            } 
        });
    } catch (error) {
        console.error('Error creating teacher:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error: ' + (error.message || 'Unknown error')
        });
    }
};

// Get teacher details
const getTeacherDetails = async (req, res) => {
    try {
        const { teacherId } = req.params;
        
        // Get teacher details
        const teacher = await Teacher.findById(teacherId).select('-password');
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }
        
        // Get classes taught by this teacher
        const classes = await Class.find({ teacher: teacherId }).populate('students', 'firstName lastName');
        
        // Get available classes (classes not assigned to this teacher)
        const availableClasses = await Class.find({ teacher: { $ne: teacherId } }).select('name');
        
        res.render('admin-teacher-details', {
            title: 'Teacher Details',
            teacher,
            classes,
            availableClasses,
            admin: req.admin,
            activePage: 'teachers'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update teacher
const updateTeacher = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const { username, email, firstName, lastName, phoneNumber, profilePicture } = req.body;
        
        // Check if username or email already exists
        const existingTeacher = await Teacher.findOne({
            $and: [
                { _id: { $ne: teacherId } },
                { $or: [{ username }, { email }] }
            ]
        });
        
        if (existingTeacher) {
            return res.status(400).json({ 
                message: existingTeacher.username === username ? 'Username already exists' : 'Email already exists' 
            });
        }
        
        const updatedTeacher = await Teacher.findByIdAndUpdate(
            teacherId,
            {
                username,
                email,
                firstName,
                lastName,
                phoneNumber,
                profilePicture
            },
            { new: true }
        ).select('-password');
        
        if (!updatedTeacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }
        
        res.status(200).json({ message: 'Teacher updated successfully', teacher: updatedTeacher });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete teacher
const deleteTeacher = async (req, res) => {
    try {
        const { teacherId } = req.params;
        
        // Find classes taught by this teacher
        const classes = await Class.find({ teacher: teacherId });
        
        // If teacher has classes, don't allow deletion
        if (classes.length > 0) {
            return res.status(400).json({ 
                message: 'Cannot delete teacher with assigned classes. Please reassign classes first.' 
            });
        }
        
        const deletedTeacher = await Teacher.findByIdAndDelete(teacherId);
        if (!deletedTeacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }
        
        res.status(200).json({ message: 'Teacher deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ===== Class Management Functions =====

// Get all classes
const getClasses = async (req, res) => {
    try {
        // Get pagination parameters
        const { page = 1, limit = 10, search, teacherId, status } = req.query;
        
        // Build filter query
        const filter = {};
        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }
        if (teacherId) {
            filter.teacher = teacherId;
        }
        if (status === 'active') {
            filter.isActive = true;
        } else if (status === 'inactive') {
            filter.isActive = false;
        }
        
        // Convert page and limit to numbers
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const skip = (pageNum - 1) * limitNum;
        
        // Get total count for pagination
        const total = await Class.countDocuments(filter);
        
        // Get classes with pagination
        const classes = await Class.find(filter)
            .populate('teacher', 'firstName lastName')
            .populate('students', 'firstName lastName profilePicture')
            .sort({ name: 1 })
            .skip(skip)
            .limit(limitNum);
        
        // Calculate stats for each class
        const classesWithStats = classes.map(cls => ({
            ...cls.toObject(),
            studentCount: cls.students.length,
            // Truncate description if needed
            shortDescription: cls.description && cls.description.length > 50 
                ? cls.description.substring(0, 50) + '...' 
                : cls.description
        }));
        
        // Calculate pagination metadata
        const totalPages = Math.ceil(total / limitNum);
        const hasNextPage = pageNum < totalPages;
        const hasPrevPage = pageNum > 1;
        
        // Get all teachers for filters and class creation
        const teachers = await Teacher.find().select('firstName lastName');
        
        // For API requests
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.status(200).json({
                success: true,
                data: classesWithStats,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages,
                    hasNextPage,
                    hasPrevPage
                }
            });
        }
        
        // For browser requests
        res.render('admin-classes', {
            title: 'Classes Management',
            classes: classesWithStats,
            teachers,
            admin: req.admin,
            activePage: 'classes',
            currentFilters: {
                search,
                teacherId,
                status,
                page: pageNum,
                limit: limitNum
            },
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages,
                hasNextPage,
                hasPrevPage
            }
        });
    } catch (error) {
        console.error('Error getting classes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch classes',
            error: error.message
        });
    }
};

// Get create class page
const getCreateClassPage = async (req, res) => {
    try {
        // Get all teachers for the dropdown
        const teachers = await Teacher.find().select('firstName lastName');
        
        res.render('admin-create-class', {
            title: 'Create Class',
            teachers,
            admin: req.admin,
            activePage: 'create-class'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create a new class
const createClass = async (req, res) => {
    try {
        console.log('Create class request body:', req.body);
        const { name, description, teacherId, isActive } = req.body;
        
        // Enhanced validation
        if (!name || !teacherId) {
            return res.status(400).json({ 
                success: false,
                message: 'Missing required fields: name and teacherId are required' 
            });
        }
        
        // Validate teacher exists
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).json({
                success: false, 
                message: 'Teacher not found' 
            });
        }
        
        // Create class
        const newClass = new Class({
            name,
            description,
            teacher: teacherId,
            students: [],
            attendanceSessions: [],
            quizzes: [],
            isActive: isActive !== undefined ? isActive : true
        });
        
        await newClass.save();
        console.log('Class created successfully:', newClass._id);
        
        // Add class to teacher's classes
        teacher.classes.push(newClass._id);
        await teacher.save();
        
        res.status(201).json({ 
            success: true,
            message: 'Class created successfully', 
            class: {
                id: newClass._id,
                name: newClass.name,
                description: newClass.description,
                teacherId: teacher._id,
                teacherName: `${teacher.firstName} ${teacher.lastName}`
            } 
        });
    } catch (error) {
        console.error('Error creating class:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error: ' + (error.message || 'Unknown error')
        });
    }
};

// Get class details
const getClassDetails = async (req, res) => {
    try {
        const { classId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        
        // Convert page and limit to numbers
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const skip = (pageNum - 1) * limitNum;
        
        // First, get the class with basic info and teacher
        const classData = await Class.findById(classId)
            .populate('teacher', 'firstName lastName email profilePicture');
        
        if (!classData) {
            return res.status(404).render('error', { 
                message: 'Class not found',
                error: { status: 404, stack: '' },
                title: 'Error'
            });
        }
        
        // Get total number of students in the class
        const totalStudents = classData.students.length;
        
        // Get all teachers for the change teacher modal
        const teachers = await Teacher.find({}, 'firstName lastName email');
        
        // Pagination for students (get only a slice of students to display)
        // If the students array is empty, we'll handle that in the view
        const studentIds = classData.students.slice(skip, skip + limitNum);
        
        // Populate student data only for the current page
        if (studentIds.length > 0) {
            await Class.populate(classData, {
                path: 'students',
                match: { _id: { $in: studentIds } },
                select: 'firstName lastName email profilePicture'
            });
        } else {
            classData.students = [];
        }
        
        // Get available students (not in this class) for the add students modal
        const availableStudents = await Student.find(
            { _id: { $nin: classData.students } },
            'firstName lastName email'
        );
        
        // Create pagination info
        const studentPagination = {
            total: totalStudents,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(totalStudents / limitNum),
            hasPrevPage: pageNum > 1,
            hasNextPage: pageNum < Math.ceil(totalStudents / limitNum)
        };
        
        res.render('admin-class-details', {
            title: `Class: ${classData.name}`,
            classData,
            teachers,
            availableStudents,
            studentPagination,
            currentFilters: { page, limit },
            admin: req.admin,
            activePage: 'classes'
        });
    } catch (error) {
        console.error('Error getting class details:', error);
        res.status(500).render('error', { 
            message: 'Error getting class details',
            error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' },
            title: 'Error'
        });
    }
};

// Update class
const updateClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const { name, description, teacherId, isActive } = req.body;
        
        const classToUpdate = await Class.findById(classId);
        if (!classToUpdate) {
            return res.status(404).json({ message: 'Class not found' });
        }
        
        // If teacher is being changed
        if (teacherId && teacherId !== classToUpdate.teacher.toString()) {
            // Remove class from old teacher's classes
            await Teacher.findByIdAndUpdate(
                classToUpdate.teacher,
                { $pull: { classes: classId } }
            );
            
            // Add class to new teacher's classes
            await Teacher.findByIdAndUpdate(
                teacherId,
                { $push: { classes: classId } }
            );
        }
        
        // Update class
        const updatedClass = await Class.findByIdAndUpdate(
            classId,
            {
                name,
                description,
                teacher: teacherId || classToUpdate.teacher,
                isActive: isActive !== undefined ? isActive : classToUpdate.isActive
            },
            { new: true }
        );
        
        res.status(200).json({ message: 'Class updated successfully', class: updatedClass });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete class
const deleteClass = async (req, res) => {
    try {
        const { classId } = req.params;
        
        const classToDelete = await Class.findById(classId);
        if (!classToDelete) {
            return res.status(404).json({ message: 'Class not found' });
        }
        
        // Remove class from teacher's classes
        await Teacher.findByIdAndUpdate(
            classToDelete.teacher,
            { $pull: { classes: classId } }
        );
        
        // Delete class
        await Class.findByIdAndDelete(classId);
        
        res.status(200).json({ message: 'Class deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Assign students to class
const assignStudentsToClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const { studentIds } = req.body;
        
        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ message: 'Student IDs array is required' });
        }
        
        // Find the class
        const classToUpdate = await Class.findById(classId);
        if (!classToUpdate) {
            return res.status(404).json({ message: 'Class not found' });
        }
        
        // Validate all students exist
        const students = await Student.find({ _id: { $in: studentIds } });
        if (students.length !== studentIds.length) {
            return res.status(400).json({ message: 'One or more students not found' });
        }
        
        // Add students to class
        await Class.findByIdAndUpdate(
            classId,
            { $addToSet: { students: { $each: studentIds } } }
        );
        
        res.status(200).json({ message: 'Students assigned to class successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Remove student from class
const removeStudentFromClass = async (req, res) => {
    try {
        const { classId, studentId } = req.params;
        
        // Find the class
        const classToUpdate = await Class.findById(classId);
        if (!classToUpdate) {
            return res.status(404).json({ message: 'Class not found' });
        }
        
        // Check if student is in the class
        if (!classToUpdate.students.includes(studentId)) {
            return res.status(400).json({ message: 'Student not in this class' });
        }
        
        // Remove student from class
        await Class.findByIdAndUpdate(
            classId,
            { $pull: { students: studentId } }
        );
        
        res.status(200).json({ message: 'Student removed from class successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    loginAdmin,
    createAdminAccount,
    getDashboardData,
    // getMyProfile,
    // addGrade,
    // addAttendance,
    // createStudent,
    // getCreateStudent,
    // getStudents,
    // getStudentDetailss,
    updateStudent,
    deleteStudent,
    // createParent,
    // getCreateParent,
    // getParents,
    // getParentDetailss,
    updateParent,
    deleteParent,
    // getLinkChildsPage,
    // getLinkChildren,
    linkChildsWithParent,
    createStudentAccount,
    createParentAccount,
    getAllStudents,
    getStudentDetails,
    getAllParents,
    getParentDetails,
    updateParentBalance,
    uploadStudentsFromExcel,
    getExpenseById,
    createExpense,
    updateExpense,
    markExpenseAsPaid,
    deleteExpense,
    getExpensesDashboard,
    getGradesDashboard,
    getGradeById,
    createGrade,
    updateGrade,
    deleteGrade,
    getAttendanceDashboard,
    getAttendanceById,
    createAttendance,
    updateAttendance,
    deleteAttendance,
    getTeachers,
    getCreateTeacherPage,
    createTeacher,
    getTeacherDetails,
    updateTeacher,
    deleteTeacher,
    getClasses,
    getCreateClassPage,
    createClass,
    getClassDetails,
    updateClass,
    deleteClass,
    assignStudentsToClass,
    removeStudentFromClass
};