require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Base URL for API requests
const BASE_URL = 'http://127.0.0.1:' + (process.env.PORT || 9700);

// Credentials for testing
const TEST_CREDENTIALS = {
  admin: { username: 'admin1', password: 'admin123' },
  teacher: { username: '', password: 'teacher123' },
  parent: { username: '', password: 'parent123' }
};

// Storage for auth tokens and test data
const testState = {
  tokens: {},
  data: {
    students: [],
    teachers: [],
    parents: [],
    classes: [],
    quizzes: [],
    expenses: [],
    attendance: []
  }
};

// Logger
const logFile = path.join(__dirname, 'api_test_results.log');
fs.writeFileSync(logFile, `API Test Started: ${new Date().toISOString()}\n\n`, 'utf8');

function log(message) {
  const logMessage = `[${new Date().toISOString()}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(logFile, logMessage, 'utf8');
}

// Helper to make API requests with auth
async function apiRequest(method, url, data = null, token = null, description = '') {
  try {
    const headers = {};
    if (token) {
      headers.Cookie = `token=${token}`;
    }

    const response = await axios({
      method,
      url: `${BASE_URL}${url}`,
      data,
      headers,
      withCredentials: true
    });

    log(`✅ ${description || url} - SUCCESS`);
    return response.data;
  } catch (error) {
    log(`❌ ${description || url} - FAILED: ${error.message}`);
    if (error.response) {
      log(`Response: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

// Authenticate and get tokens
async function authenticate() {
  log('🔑 Authenticating users...');

  // Admin login
  const adminLogin = await apiRequest(
    'post',
    '/admin/login',
    TEST_CREDENTIALS.admin,
    null,
    'Admin Login'
  );
  
  if (adminLogin && adminLogin.token) {
    testState.tokens.admin = adminLogin.token;
    log('✅ Admin authenticated successfully');
  }

  // Get a teacher username first (we need to fetch a valid username)
  if (testState.tokens.admin) {
    const teachers = await apiRequest(
      'get',
      '/admin/teachers',
      null,
      testState.tokens.admin,
      'Fetching teachers for credentials'
    );
    
    if (teachers && teachers.data && teachers.data.length > 0) {
      TEST_CREDENTIALS.teacher.username = teachers.data[0].username;
      log(`✅ Using teacher username: ${TEST_CREDENTIALS.teacher.username}`);
      
      // Teacher login
      const teacherLogin = await apiRequest(
        'post',
        '/teacher/login',
        TEST_CREDENTIALS.teacher,
        null,
        'Teacher Login'
      );
      
      if (teacherLogin && teacherLogin.token) {
        testState.tokens.teacher = teacherLogin.token;
        log('✅ Teacher authenticated successfully');
      }
    } else {
      log('❌ No teachers found in the database');
    }
  }

  // Get a parent username (we need to fetch a valid username)
  if (testState.tokens.admin) {
    const parents = await apiRequest(
      'get',
      '/admin/parents',
      null,
      testState.tokens.admin,
      'Fetching parents for credentials'
    );
    
    if (parents && parents.data && parents.data.length > 0) {
      TEST_CREDENTIALS.parent.username = parents.data[0].username;
      log(`✅ Using parent username: ${TEST_CREDENTIALS.parent.username}`);
      
      // Parent login
      const parentLogin = await apiRequest(
        'post',
        '/parent/login',
        TEST_CREDENTIALS.parent,
        null,
        'Parent Login'
      );
      
      if (parentLogin && parentLogin.token) {
        testState.tokens.parent = parentLogin.token;
        log('✅ Parent authenticated successfully');
      }
    } else {
      log('❌ No parents found in the database');
    }
  }
}

// Test Admin Routes
async function testAdminRoutes() {
  log('\n🧪 Testing Admin Routes...');
  if (!testState.tokens.admin) {
    log('❌ Admin token not available, skipping admin tests');
    return;
  }

  // Test dashboard
  const dashboard = await apiRequest(
    'get',
    '/admin/dashboard',
    null,
    testState.tokens.admin,
    'Admin Dashboard'
  );

  // Test Students
  const students = await apiRequest(
    'get',
    '/admin/students',
    null,
    testState.tokens.admin,
    'List Students'
  );
  
  if (students && students.data && students.data.length > 0) {
    testState.data.students = students.data;
    
    // Test student details
    await apiRequest(
      'get',
      `/admin/students/${students.data[0]._id}`,
      null,
      testState.tokens.admin,
      'Student Details'
    );
  }

  // Test Teachers
  const teachers = await apiRequest(
    'get',
    '/admin/teachers',
    null,
    testState.tokens.admin,
    'List Teachers'
  );
  
  if (teachers && teachers.data && teachers.data.length > 0) {
    testState.data.teachers = teachers.data;
    
    // Test teacher details
    await apiRequest(
      'get',
      `/admin/teachers/${teachers.data[0]._id}`,
      null,
      testState.tokens.admin,
      'Teacher Details'
    );
  }

  // Test Parents
  const parents = await apiRequest(
    'get',
    '/admin/parents',
    null,
    testState.tokens.admin,
    'List Parents'
  );
  
  if (parents && parents.data && parents.data.length > 0) {
    testState.data.parents = parents.data;
    
    // Test parent details
    await apiRequest(
      'get',
      `/admin/parents/${parents.data[0]._id}`,
      null,
      testState.tokens.admin,
      'Parent Details'
    );
  }

  // Test Classes
  const classes = await apiRequest(
    'get',
    '/admin/classes',
    null,
    testState.tokens.admin,
    'List Classes'
  );
  
  if (classes && classes.data && classes.data.length > 0) {
    testState.data.classes = classes.data;
    
    // Test class details
    await apiRequest(
      'get',
      `/admin/classes/${classes.data[0]._id}`,
      null,
      testState.tokens.admin,
      'Class Details'
    );
  }

  // Test Expenses
  const expenses = await apiRequest(
    'get',
    '/admin/expenses',
    null,
    testState.tokens.admin,
    'List Expenses'
  );

  // Test Grades
  await apiRequest(
    'get',
    '/admin/grades',
    null,
    testState.tokens.admin,
    'List Grades'
  );

  // Test Attendance
  await apiRequest(
    'get',
    '/admin/attendance',
    null,
    testState.tokens.admin,
    'List Attendance'
  );
}

// Test Teacher Routes
async function testTeacherRoutes() {
  log('\n🧪 Testing Teacher Routes...');
  if (!testState.tokens.teacher) {
    log('❌ Teacher token not available, skipping teacher tests');
    return;
  }

  // Test dashboard
  const dashboard = await apiRequest(
    'get',
    '/teacher/dashboard',
    null,
    testState.tokens.teacher,
    'Teacher Dashboard'
  );

  // Test Classes
  const classes = await apiRequest(
    'get',
    '/teacher/classes',
    null,
    testState.tokens.teacher,
    'Teacher Classes'
  );
  
  if (classes && classes.data && classes.data.length > 0) {
    // Test class details
    await apiRequest(
      'get',
      `/teacher/classes/${classes.data[0]._id}`,
      null,
      testState.tokens.teacher,
      'Teacher Class Details'
    );
  }

  // Test Profile
  await apiRequest(
    'get',
    '/teacher/profile',
    null,
    testState.tokens.teacher,
    'Teacher Profile'
  );

  // Test Quizzes
  await apiRequest(
    'get',
    '/teacher/quizzes',
    null,
    testState.tokens.teacher,
    'Teacher Quizzes'
  );

  // Test Attendance
  await apiRequest(
    'get',
    '/teacher/attendance',
    null,
    testState.tokens.teacher,
    'Teacher Attendance'
  );
}

// Test Parent Routes
async function testParentRoutes() {
  log('\n🧪 Testing Parent Routes...');
  if (!testState.tokens.parent) {
    log('❌ Parent token not available, skipping parent tests');
    return;
  }

  // Test dashboard/profile
  await apiRequest(
    'get',
    '/parent/profile',
    null,
    testState.tokens.parent,
    'Parent Profile'
  );

  // Test Children
  const children = await apiRequest(
    'get',
    '/parent/children',
    null,
    testState.tokens.parent,
    'Parent Children'
  );
  
  if (children && children.data && children.data.length > 0) {
    // Test child details
    await apiRequest(
      'get',
      `/parent/children/${children.data[0]._id}`,
      null,
      testState.tokens.parent,
      'Child Details'
    );
  }

  // Test Transactions
  await apiRequest(
    'get',
    '/parent/transactions',
    null,
    testState.tokens.parent,
    'Parent Transactions'
  );
}

// Test API creation functions (for admin)
async function testCreateFunctions() {
  log('\n🧪 Testing Create Functions...');
  if (!testState.tokens.admin) {
    log('❌ Admin token not available, skipping create function tests');
    return;
  }

  // Create a test student
  const newStudent = {
    username: 'teststudent' + Date.now(),
    password: 'student123',
    firstName: 'Test',
    lastName: 'Student',
    email: `test.student${Date.now()}@example.com`,
    dateOfBirth: '2010-01-01',
    age: 14,
    gender: 'Male',
    grade: 8,
    section: 'A',
    academicYear: '2023-2024'
  };
  
  await apiRequest(
    'post',
    '/admin/createStudentAccount',
    newStudent,
    testState.tokens.admin,
    'Create Student'
  );

  // Create a test parent
  const newParent = {
    username: 'testparent' + Date.now(),
    password: 'parent123',
    firstName: 'Test',
    lastName: 'Parent',
    email: `test.parent${Date.now()}@example.com`,
    phoneNumber: '1234567890',
    age: 40,
    gender: 'Female',
    relationshipToStudent: 'Father' // Adding valid relationship value
  };
  
  await apiRequest(
    'post',
    '/admin/createParentAccount',
    newParent,
    testState.tokens.admin,
    'Create Parent'
  );

  // Create a test teacher
  const newTeacher = {
    username: 'testteacher' + Date.now(),
    password: 'teacher123',
    firstName: 'Test',
    lastName: 'Teacher',
    email: `test.teacher${Date.now()}@example.com`,
    phoneNumber: '0987654321'
  };
  
  await apiRequest(
    'post',
    '/admin/create-teacher',
    newTeacher,
    testState.tokens.admin,
    'Create Teacher'
  );

  // Create a test class
  if (testState.data.teachers.length > 0) {
    const newClass = {
      name: 'Test Class ' + Date.now(),
      description: 'A test class for API testing',
      teacher: testState.data.teachers[0]._id
    };
    
    await apiRequest(
      'post',
      '/admin/create-class',
      newClass,
      testState.tokens.admin,
      'Create Class'
    );
  }
}

// Main test function
async function runTests() {
  try {
    log('🚀 Starting API Tests...');
    
    // First authenticate
    await authenticate();
    
    // Run tests for each role
    await testAdminRoutes();
    await testTeacherRoutes();
    await testParentRoutes();
    
    // Test creation functions
    await testCreateFunctions();
    
    log('\n✅ API Testing Completed Successfully!');
    log(`📝 Detailed log saved to: ${logFile}`);
  } catch (error) {
    log(`❌ Test error: ${error.message}`);
    console.error(error);
  }
}

// Run the tests
runTests(); 