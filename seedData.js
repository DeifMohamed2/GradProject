require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { faker } = require('@faker-js/faker');

// Import models
const Admin = require('./models/admin');
const Teacher = require('./models/teacher');
const Student = require('./models/student');
const Parent = require('./models/parent');
const Class = require('./models/class');
const Attendance = require('./models/attendance');
const Grade = require('./models/Grade');
const Quiz = require('./models/quiz');
const Transaction = require('./models/transaction');
const Expense = require('./models/expenses');

// MongoDB connection
const dbURI = process.env.MONGO_URI;

// Seed data configuration
const SEED_CONFIG = {
  admins: 2,
  teachers: 20,
  parents: 50,
  studentsPerParent: { min: 1, max: 3 },
  classesPerTeacher: { min: 1, max: 3 },
  studentsPerClass: { min: 15, max: 25 },
  quizzesPerClass: { min: 2, max: 5 },
  attendanceDays: 30,
  expensesPerStudent: { min: 3, max: 8 },
  transactionsPerParent: { min: 2, max: 10 },
};

// Hash password
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

// Clear all collections
async function clearCollections() {
  console.log('Clearing existing data...');
  await Admin.deleteMany({});
  await Teacher.deleteMany({});
  await Student.deleteMany({});
  await Parent.deleteMany({});
  await Class.deleteMany({});
  await Attendance.deleteMany({});
  await Grade.deleteMany({});
  await Quiz.deleteMany({});
  await Transaction.deleteMany({});
  await Expense.deleteMany({});
  console.log('All collections cleared!');
}

// Create admins
async function createAdmins() {
  console.log('Creating admins...');
  const admins = [];
  
  // Create predictable admin accounts
  admins.push(new Admin({
    username: 'admin1',
    password: await hashPassword('admin123')
  }));
  
  admins.push(new Admin({
    username: 'admin2',
    password: await hashPassword('admin123')
  }));
  
  await Admin.insertMany(admins);
  console.log(`${admins.length} admins created!`);
  return admins;
}

// Create teachers
async function createTeachers() {
  console.log('Creating teachers...');
  const teachers = [];
  
  for (let i = 0; i < SEED_CONFIG.teachers; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    teachers.push(new Teacher({
      username: faker.internet.userName({ firstName, lastName }).toLowerCase(),
      password: await hashPassword('teacher123'),
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      firstName,
      lastName,
      phoneNumber: faker.phone.number(),
      profilePicture: faker.image.avatar()
    }));
  }
  
  await Teacher.insertMany(teachers);
  console.log(`${teachers.length} teachers created!`);
  return teachers;
}

// Create parents
async function createParents() {
  console.log('Creating parents...');
  const parents = [];
  
  for (let i = 0; i < SEED_CONFIG.parents; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const gender = faker.helpers.arrayElement(['Male', 'Female']);
    const dob = faker.date.birthdate({ min: 30, max: 50, mode: 'age' });
    
    parents.push(new Parent({
      username: faker.internet.userName({ firstName, lastName }).toLowerCase(),
      password: await hashPassword('parent123'),
      firstName,
      lastName,
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      phoneNumber: faker.phone.number(),
      alternatePhone: faker.phone.number(),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: faker.location.country()
      },
      dateOfBirth: dob,
      age: new Date().getFullYear() - dob.getFullYear(),
      gender,
      occupation: faker.person.jobTitle(),
      workplaceInfo: {
        companyName: faker.company.name(),
        position: faker.person.jobTitle(),
        address: faker.location.streetAddress(),
        phone: faker.phone.number()
      },
      education: faker.helpers.arrayElement([
        'High School', 'Bachelor\'s Degree', 'Master\'s Degree', 'PhD', 'Other'
      ]),
      maritalStatus: faker.helpers.arrayElement(['Single', 'Married', 'Divorced', 'Widowed']),
      spouseInfo: {
        name: faker.person.fullName(),
        phoneNumber: faker.phone.number(),
        email: faker.internet.email(),
        occupation: faker.person.jobTitle()
      },
      relationshipToStudent: faker.helpers.arrayElement(['Father', 'Mother', 'Guardian']),
      preferredContactMethod: faker.helpers.arrayElement(['Email', 'Phone', 'SMS', 'WhatsApp']),
      balance: faker.number.int({ min: 0, max: 5000 }),
      emergencyContact: {
        name: faker.person.fullName(),
        relationship: faker.helpers.arrayElement(['Sibling', 'Friend', 'Relative']),
        phone: faker.phone.number()
      },
      notes: faker.lorem.paragraph(),
      profilePicture: faker.image.avatar()
    }));
  }
  
  await Parent.insertMany(parents);
  console.log(`${parents.length} parents created!`);
  return parents;
}

// Create students
async function createStudents(parents) {
  console.log('Creating students...');
  const students = [];
  
  for (const parent of parents) {
    const numStudents = faker.number.int({
      min: SEED_CONFIG.studentsPerParent.min,
      max: SEED_CONFIG.studentsPerParent.max
    });
    
    const studentsForParent = [];
    
    for (let i = 0; i < numStudents; i++) {
      const firstName = faker.person.firstName();
      const lastName = parent.lastName; // Same last name as parent
      const gender = faker.helpers.arrayElement(['Male', 'Female', 'Other']);
      const dob = faker.date.birthdate({ min: 5, max: 18, mode: 'age' });
      const age = new Date().getFullYear() - dob.getFullYear();
      
      // Calculate grade based on age
      const grade = Math.min(Math.max(age - 5, 1), 12);
      
      const student = new Student({
        username: faker.internet.userName({ firstName, lastName }).toLowerCase(),
        password: await hashPassword('student123'),
        firstName,
        lastName,
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        dateOfBirth: dob,
        age,
        gender,
        rollNumber: faker.string.alphanumeric(6).toUpperCase(),
        grade,
        section: faker.helpers.arrayElement(['A', 'B', 'C']),
        academicYear: '2023-2024',
        classroom: `Room ${faker.number.int({ min: 100, max: 300 })}`,
        contactPhone: faker.phone.number(),
        address: parent.address.street,
        emergencyContact: {
          name: parent.firstName + ' ' + parent.lastName,
          relationship: parent.relationshipToStudent,
          phone: parent.phoneNumber
        },
        balance: faker.number.int({ min: 0, max: 1000 }),
        parent: parent._id,
        profilePicture: faker.image.avatar(),
        bloodGroup: faker.helpers.arrayElement(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
        medicalConditions: faker.helpers.maybe(() => [faker.helpers.arrayElement(['Asthma', 'Allergies', 'Diabetes', 'None'])], { probability: 0.3 }),
        status: 'Active'
      });
      
      students.push(student);
      studentsForParent.push(student._id);
    }
    
    // Update parent with student references
    parent.childs = studentsForParent;
    parent.numberOfChildren = studentsForParent.length;
    await parent.save();
  }
  
  await Student.insertMany(students);
  console.log(`${students.length} students created!`);
  return students;
}

// Create classes
async function createClasses(teachers, students) {
  console.log('Creating classes...');
  const classes = [];
  const subjects = [
    'Mathematics', 'Science', 'English', 'History', 'Geography',
    'Computer Science', 'Physics', 'Chemistry', 'Biology',
    'Art', 'Music', 'Physical Education', 'Economics', 'Foreign Languages'
  ];
  
  for (const teacher of teachers) {
    const numClasses = faker.number.int({
      min: SEED_CONFIG.classesPerTeacher.min,
      max: SEED_CONFIG.classesPerTeacher.max
    });
    
    const teacherClasses = [];
    
    for (let i = 0; i < numClasses; i++) {
      // Select a subject for this class
      const subject = subjects[Math.floor(Math.random() * subjects.length)];
      const gradeLevel = faker.number.int({ min: 1, max: 12 });
      
      const classObj = new Class({
        name: `${subject} Grade ${gradeLevel}`,
        description: faker.lorem.paragraph(),
        teacher: teacher._id,
        students: [],
        isActive: true
      });
      
      // Assign students to class (filter by appropriate grade level +/- 1)
      const eligibleStudents = students.filter(s => 
        Math.abs(s.grade - gradeLevel) <= 1
      );
      
      // Randomly select students
      const numStudents = faker.number.int({
        min: Math.min(SEED_CONFIG.studentsPerClass.min, eligibleStudents.length),
        max: Math.min(SEED_CONFIG.studentsPerClass.max, eligibleStudents.length)
      });
      
      const selectedStudents = faker.helpers.arrayElements(
        eligibleStudents, 
        numStudents
      );
      
      classObj.students = selectedStudents.map(s => s._id);
      classes.push(classObj);
      teacherClasses.push(classObj._id);
    }
    
    // Update teacher with class references
    teacher.classes = teacherClasses;
    await teacher.save();
  }
  
  await Class.insertMany(classes);
  console.log(`${classes.length} classes created!`);
  return classes;
}

// Create attendance records
async function createAttendance(classes) {
  console.log('Creating attendance records...');
  const attendanceRecords = [];
  
  for (const classObj of classes) {
    // Create attendance records for the past 30 days
    for (let i = 0; i < SEED_CONFIG.attendanceDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Skip weekends
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      
      // Create attendance for each student in the class
      for (const studentId of classObj.students) {
        // Randomly determine attendance status with probabilities
        let status;
        const rand = Math.random();
        if (rand < 0.85) {
          status = 'present';
        } else if (rand < 0.95) {
          status = 'late';
        } else {
          status = 'absent';
        }
        
        attendanceRecords.push(new Attendance({
          student: studentId,
          class: classObj._id,
          date,
          status
        }));
      }
    }
  }
  
  await Attendance.insertMany(attendanceRecords);
  console.log(`${attendanceRecords.length} attendance records created!`);
  return attendanceRecords;
}

// Create quizzes and grades
async function createQuizzesAndGrades(classes) {
  console.log('Creating quizzes and grades...');
  const quizzes = [];
  const grades = [];
  
  for (const classObj of classes) {
    const numQuizzes = faker.number.int({
      min: SEED_CONFIG.quizzesPerClass.min,
      max: SEED_CONFIG.quizzesPerClass.max
    });
    
    for (let i = 0; i < numQuizzes; i++) {
      // Create quiz
      const quizDate = new Date();
      quizDate.setDate(quizDate.getDate() - faker.number.int({ min: 0, max: 60 }));
      
      // Determine if quiz is in the past or future
      const isPastQuiz = quizDate < new Date();
      const status = isPastQuiz ? 'closed' : faker.helpers.arrayElement(['draft', 'published']);
      
      // Create questions
      const numQuestions = faker.number.int({ min: 5, max: 15 });
      const questions = [];
      
      for (let q = 0; q < numQuestions; q++) {
        const options = [
          faker.lorem.sentence(),
          faker.lorem.sentence(),
          faker.lorem.sentence(),
          faker.lorem.sentence()
        ];
        
        questions.push({
          text: faker.lorem.sentence() + '?',
          options,
          correctAnswer: options[faker.number.int({ min: 0, max: 3 })],
          points: faker.number.int({ min: 5, max: 20 })
        });
      }
      
      const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
      
      const quiz = new Quiz({
        title: faker.lorem.words({ min: 2, max: 5 }),
        description: faker.lorem.paragraph(),
        class: classObj._id,
        teacher: classObj.teacher,
        maxScore,
        dueDate: quizDate,
        status,
        questions,
        grades: [],
        submissions: []
      });
      
      // If it's a past quiz, add submissions and grades
      if (isPastQuiz) {
        for (const studentId of classObj.students) {
          // 90% chance student submitted the quiz
          if (Math.random() < 0.9) {
            // Create answers
            const answers = questions.map(q => {
              // 70% chance of correct answer
              if (Math.random() < 0.7) {
                return q.correctAnswer;
              } else {
                // Return random wrong answer
                const wrongOptions = q.options.filter(o => o !== q.correctAnswer);
                return faker.helpers.arrayElement(wrongOptions);
              }
            });
            
            // Calculate score
            let score = 0;
            for (let qIdx = 0; qIdx < questions.length; qIdx++) {
              if (answers[qIdx] === questions[qIdx].correctAnswer) {
                score += questions[qIdx].points;
              }
            }
            
            // Add submission
            const submittedAt = new Date(quizDate);
            submittedAt.setDate(submittedAt.getDate() - faker.number.int({ min: 1, max: 5 }));
            
            quiz.submissions.push({
              student: studentId,
              answers,
              score,
              submittedAt
            });
            
            // Add grade
            quiz.grades.push({
              student: studentId,
              score,
              feedback: faker.lorem.sentence(),
              submittedAt
            });
            
            // Create grade record for reporting
            grades.push(new Grade({
              student: studentId,
              subject: classObj.name,
              grade: score
            }));
          }
        }
      }
      
      quizzes.push(quiz);
    }
  }
  
  await Quiz.insertMany(quizzes);
  await Grade.insertMany(grades);
  console.log(`${quizzes.length} quizzes created!`);
  console.log(`${grades.length} grades created!`);
  return { quizzes, grades };
}

// Create expenses
async function createExpenses(students) {
  console.log('Creating expenses...');
  const expenses = [];
  const expenseTypes = ['tuition', 'books', 'transportation', 'meal', 'uniform', 'activity', 'other'];
  
  for (const student of students) {
    const numExpenses = faker.number.int({
      min: SEED_CONFIG.expensesPerStudent.min,
      max: SEED_CONFIG.expensesPerStudent.max
    });
    
    for (let i = 0; i < numExpenses; i++) {
      const date = new Date();
      date.setDate(date.getDate() - faker.number.int({ min: 0, max: 180 }));
      
      const expenseType = faker.helpers.arrayElement(expenseTypes);
      let amount;
      
      // Set realistic amounts based on expense type
      switch (expenseType) {
        case 'tuition':
          amount = faker.number.int({ min: 500, max: 2000 });
          break;
        case 'books':
          amount = faker.number.int({ min: 50, max: 300 });
          break;
        case 'transportation':
          amount = faker.number.int({ min: 100, max: 500 });
          break;
        case 'meal':
          amount = faker.number.int({ min: 50, max: 200 });
          break;
        case 'uniform':
          amount = faker.number.int({ min: 80, max: 150 });
          break;
        case 'activity':
          amount = faker.number.int({ min: 20, max: 100 });
          break;
        default:
          amount = faker.number.int({ min: 10, max: 100 });
      }
      
      // Determine status with probabilities
      let status;
      const rand = Math.random();
      if (rand < 0.6) {
        status = 'paid';
      } else if (rand < 0.9) {
        status = 'pending';
      } else {
        status = 'overdue';
      }
      
      expenses.push(new Expense({
        student: student._id,
        description: `${expenseType.charAt(0).toUpperCase() + expenseType.slice(1)} Fee`,
        amount,
        date,
        type: expenseType,
        status
      }));
    }
  }
  
  await Expense.insertMany(expenses);
  console.log(`${expenses.length} expenses created!`);
  return expenses;
}

// Create transactions
async function createTransactions(parents, expenses) {
  console.log('Creating transactions...');
  const transactions = [];
  
  for (const parent of parents) {
    const numTransactions = faker.number.int({
      min: SEED_CONFIG.transactionsPerParent.min,
      max: SEED_CONFIG.transactionsPerParent.max
    });
    
    const parentTransactions = [];
    
    for (let i = 0; i < numTransactions; i++) {
      // Get random child of parent
      if (!parent.childs || parent.childs.length === 0) continue;
      
      const studentId = faker.helpers.arrayElement(parent.childs);
      
      // Create transaction
      const amount = faker.number.int({ min: 100, max: 2000 });
      const type = faker.helpers.arrayElement(['deposit', 'withdrawal', 'payment']);
      const status = faker.helpers.arrayElement(['completed', 'pending', 'failed']);
      
      const transaction = new Transaction({
        student: studentId,
        amount,
        type,
        status,
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} transaction for student`
      });
      
      transactions.push(transaction);
      parentTransactions.push(transaction._id);
    }
    
    // Update parent with transaction references
    parent.transactionHistory = parentTransactions;
    await parent.save();
  }
  
  await Transaction.insertMany(transactions);
  console.log(`${transactions.length} transactions created!`);
  return transactions;
}

// Update models with relationships
async function updateRelationships(students, classes, attendance, expenses) {
  console.log('Updating model relationships...');
  
  // Update students with attendance, expenses
  for (const student of students) {
    student.attendances = attendance
      .filter(a => a.student.toString() === student._id.toString())
      .map(a => a._id);
      
    student.expenses = expenses
      .filter(e => e.student.toString() === student._id.toString())
      .map(e => e._id);
      
    await student.save();
  }
  
  // Update classes with attendance sessions
  for (const classObj of classes) {
    // Group attendance by date
    const attendanceByDate = {};
    
    for (const record of attendance) {
      if (record.class.toString() === classObj._id.toString()) {
        const dateStr = record.date.toISOString().split('T')[0];
        
        if (!attendanceByDate[dateStr]) {
          attendanceByDate[dateStr] = [];
        }
        
        attendanceByDate[dateStr].push(record._id);
      }
    }
    
    // Create attendance sessions
    const attendanceSessions = [];
    
    for (const dateStr in attendanceByDate) {
      attendanceSessions.push({
        date: new Date(dateStr),
        attendances: attendanceByDate[dateStr]
      });
    }
    
    classObj.attendanceSessions = attendanceSessions;
    await classObj.save();
  }
  
  console.log('Model relationships updated!');
}

// Main seed function
async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(dbURI);
    console.log('Connected to MongoDB!');
    
    // Clear existing data
    await clearCollections();
    
    // Create data
    const admins = await createAdmins();
    const teachers = await createTeachers();
    const parents = await createParents();
    const students = await createStudents(parents);
    const classes = await createClasses(teachers, students);
    const attendance = await createAttendance(classes);
    const { quizzes, grades } = await createQuizzesAndGrades(classes);
    
    // Create expenses and transactions
    console.log('Creating expenses...');
    const expenses = await createExpenses(students);
    console.log(`${expenses.length} expenses created!`);
    
    console.log('Creating transactions...');
    const transactions = await createTransactions(parents, expenses);
    console.log(`${transactions.length} transactions created!`);
    
    // Update relationships
    await updateRelationships(students, classes, attendance, expenses);
    
    console.log('Database seeded successfully!');
    console.log('\nSummary:');
    console.log(`- ${admins.length} admins`);
    console.log(`- ${teachers.length} teachers`);
    console.log(`- ${parents.length} parents`);
    console.log(`- ${students.length} students`);
    console.log(`- ${classes.length} classes`);
    console.log(`- ${attendance.length} attendance records`);
    console.log(`- ${quizzes.length} quizzes`);
    console.log(`- ${grades.length} grades`);
    console.log(`- ${expenses.length} expenses`);
    console.log(`- ${transactions.length} transactions`);
    
    console.log('\nTest Accounts:');
    console.log('- Admin: username: admin1, password: admin123');
    console.log('- Teacher: password: teacher123 (usernames generated from first and last names)');
    console.log('- Parent: password: parent123 (usernames generated from first and last names)');
    console.log('- Student: password: student123 (usernames generated from first and last names)');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // Close the connection
    console.log('Closing MongoDB connection...');
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
}

// async function clearCollections() {
//     console.log('Clearing existing data...');
//     await Admin.deleteMany({});
//     await Teacher.deleteMany({});
//     await Student.deleteMany({});
//     await Parent.deleteMany({});
//     await Class.deleteMany({});
//     await Attendance.deleteMany({});
// }


// Run the seed function
seedDatabase(); 