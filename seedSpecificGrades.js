require('dotenv').config();
const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');

// Import models
const Parent = require('./models/parent');
const Student = require('./models/student');
const Grade = require('./models/Grade');

// MongoDB connection
const dbURI = process.env.MONGO_URI;

// Connect to MongoDB
mongoose.connect(dbURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
  seedSpecificGrades();
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Seed grades for specific parent's children
async function seedSpecificGrades() {
  try {
    console.log('Starting to seed grades for specific parent children...');
    
    // Get the specific parent by username from the image
    const parentUsername = "porter.connelly";
    const parent = await Parent.findOne({ username: parentUsername }).populate('childs');
    
    if (!parent) {
      console.error(`Parent with username ${parentUsername} not found`);
      mongoose.disconnect();
      return;
    }
    
    console.log(`Found parent: ${parent.firstName} ${parent.lastName} with ${parent.childs.length} children`);
    
    // Delete existing grades for these children
    const childIds = parent.childs.map(child => child._id);
    await Grade.deleteMany({ student: { $in: childIds } });
    console.log(`Deleted existing grades for children of parent ${parent.firstName} ${parent.lastName}`);
    
    // Define subjects exactly as shown in the image
    const subjects = [
      'Mathematics', 'Science', 'English', 'History', 'Physical Education', 'Art'
    ];
    
    const grades = [];
    
    // Loop through each child of the parent
    for (const child of parent.childs) {
      console.log(`Adding grades for student: ${child.firstName} ${child.lastName}`);
      
      // Create grades for each subject
      for (const subject of subjects) {
        // Create grades for semester 1
        const semester = 1;
        
        // Set specific grades based on the image
        let overallPercentage, letterGrade;
        
        switch (subject) {
          case 'Mathematics':
            letterGrade = 'B+';
            overallPercentage = 88.5;
            break;
          case 'Science':
            letterGrade = 'B+';
            overallPercentage = 88;
            break;
          case 'English':
            letterGrade = 'C';
            overallPercentage = 75;
            break;
          case 'History':
            letterGrade = 'B';
            overallPercentage = 85;
            break;
          case 'Physical Education':
            letterGrade = 'A';
            overallPercentage = 95;
            break;
          case 'Art':
            letterGrade = 'C+';
            overallPercentage = 70;
            break;
          default:
            letterGrade = 'B';
            overallPercentage = 85;
        }
        
        // Create midterm exams based on image
        const midterms = [];
        
        if (subject === 'Mathematics') {
          midterms.push({
            name: 'Midterm Exam 1',
            date: new Date('2024-10-15'),
            score: 85,
            maxScore: 100
          });
          
          midterms.push({
            name: 'Midterm Exam 2',
            date: new Date('2024-11-20'),
            score: 92,
            maxScore: 100
          });
        } else {
          // For other subjects, create generic midterms
          for (let i = 1; i <= 2; i++) {
            const score = faker.number.int({ min: 70, max: 95 });
            const date = new Date();
            date.setMonth(date.getMonth() - (4 - i));
            
            midterms.push({
              name: `Midterm Exam ${i}`,
              date,
              score,
              maxScore: 100
            });
          }
        }
        
        // Create quizzes based on image
        const quizzes = [];
        
        if (subject === 'Mathematics') {
          quizzes.push({
            name: 'Quiz 1',
            date: new Date('2024-09-25'),
            score: 18,
            maxScore: 20
          });
          
          quizzes.push({
            name: 'Quiz 2',
            date: new Date('2024-10-08'),
            score: 15,
            maxScore: 20
          });
          
          quizzes.push({
            name: 'Quiz 3',
            date: new Date('2024-11-05'),
            score: 19,
            maxScore: 20
          });
        } else {
          // For other subjects, create generic quizzes
          for (let i = 1; i <= 3; i++) {
            const score = faker.number.int({ min: 15, max: 19 });
            const date = new Date();
            date.setMonth(date.getMonth() - (5 - i));
            
            quizzes.push({
              name: `Quiz ${i}`,
              date,
              score,
              maxScore: 20
            });
          }
        }
        
        // Create assignments based on image
        const assignments = [];
        
        if (subject === 'Mathematics') {
          assignments.push({
            name: 'Assignment 1',
            date: new Date('2024-09-10'),
            score: 28,
            maxScore: 30
          });
          
          assignments.push({
            name: 'Assignment 2',
            date: new Date('2024-10-02'),
            score: 25,
            maxScore: 30
          });
          
          assignments.push({
            name: 'Assignment 3',
            date: new Date('2024-11-12'),
            score: 29,
            maxScore: 30
          });
        } else {
          // For other subjects, create generic assignments
          for (let i = 1; i <= 3; i++) {
            const score = faker.number.int({ min: 22, max: 29 });
            const date = new Date();
            date.setMonth(date.getMonth() - (5 - i));
            
            assignments.push({
              name: `Assignment ${i}`,
              date,
              score,
              maxScore: 30
            });
          }
        }
        
        // Create class participation
        const participationScore = subject === 'Mathematics' ? 9 : faker.number.int({ min: 7, max: 10 });
        
        // Create final exam
        const finalExam = {
          date: new Date('2024-12-15'),
          status: 'Pending'
        };
        
        // Create grade progress data points
        const gradeProgress = [];
        // Add 6 progress points over the semester
        const numPoints = 6;
        
        for (let i = 0; i < numPoints; i++) {
          const date = new Date();
          // Distribute points throughout the semester
          date.setMonth(date.getMonth() - (5 - (5 * i / numPoints)));
          
          // Start around 75%, gradually increase to final percentage
          const startPercentage = 75;
          const percentage = i === numPoints - 1 
            ? overallPercentage 
            : startPercentage + (overallPercentage - startPercentage) * (i / (numPoints - 1));
          
          gradeProgress.push({
            date,
            percentage: Math.round(percentage)
          });
        }
        
        // Create the grade document
        const grade = new Grade({
          student: child._id,
          subject,
          semester,
          academicYear: '2023-2024',
          teacher: subject === 'Mathematics' ? 'Ms. Johnson' : `Ms. ${faker.person.lastName()}`,
          letterGrade,
          overallPercentage,
          midterms,
          quizzes,
          assignments,
          classParticipation: {
            score: participationScore,
            maxScore: 10
          },
          finalExam,
          gradeProgress
        });
        
        grades.push(grade);
      }
    }
    
    // Save all grades
    const savedGrades = await Grade.insertMany(grades);
    console.log(`${savedGrades.length} grades created successfully!`);
    
    // Update each student with their grade references
    for (const child of parent.childs) {
      const studentGrades = savedGrades.filter(g => g.student.toString() === child._id.toString());
      await Student.findByIdAndUpdate(child._id, {
        $set: { Grades: studentGrades.map(g => g._id) }
      });
      console.log(`Updated student ${child.firstName} ${child.lastName} with ${studentGrades.length} grades`);
    }
    
    console.log('Grade seeding completed successfully');
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error seeding grades:', error);
    mongoose.disconnect();
  }
} 