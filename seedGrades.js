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
  seedGrades();
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Seed grades for existing students
async function seedGrades() {
  try {
    console.log('Starting to seed grades for existing students...');
    
    // Clear existing grades
    await Grade.deleteMany({});
    console.log('Existing grades cleared');
    
    // Get all parents with their children
    const parents = await Parent.find().populate('childs');
    console.log(`Found ${parents.length} parents`);
    
    const subjects = [
      'Mathematics', 'Science', 'English', 'History', 'Art', 'Physical Education'
    ];
    
    const letterGrades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'];
    const grades = [];
    
    // Loop through each parent
    for (const parent of parents) {
      console.log(`Processing parent: ${parent.firstName} ${parent.lastName} with ${parent.childs.length} children`);
      
      // Loop through each child of the parent
      for (const child of parent.childs) {
        console.log(`Adding grades for student: ${child.firstName} ${child.lastName}`);
        
        // Create grades for each subject
        for (const subject of subjects) {
          // Create grades for each semester
          for (let semester = 1; semester <= 2; semester++) {
            // Generate overall percentage between 60-100
            const overallPercentage = faker.number.int({ min: 60, max: 100 });
            
            // Determine letter grade based on percentage
            let letterGrade;
            if (overallPercentage >= 97) letterGrade = 'A+';
            else if (overallPercentage >= 93) letterGrade = 'A';
            else if (overallPercentage >= 90) letterGrade = 'A-';
            else if (overallPercentage >= 87) letterGrade = 'B+';
            else if (overallPercentage >= 83) letterGrade = 'B';
            else if (overallPercentage >= 80) letterGrade = 'B-';
            else if (overallPercentage >= 77) letterGrade = 'C+';
            else if (overallPercentage >= 73) letterGrade = 'C';
            else if (overallPercentage >= 70) letterGrade = 'C-';
            else if (overallPercentage >= 67) letterGrade = 'D+';
            else if (overallPercentage >= 60) letterGrade = 'D';
            else letterGrade = 'F';
            
            // Create midterm exams
            const midterms = [];
            for (let i = 1; i <= 2; i++) {
              const score = faker.number.int({ min: 60, max: 100 });
              const date = new Date();
              // First midterm is 2-3 months ago, second is 1-2 months ago
              date.setMonth(date.getMonth() - (semester === 1 ? (4 - i) : (i === 1 ? 1 : 0)));
              
              midterms.push({
                name: `Midterm Exam ${i}`,
                date,
                score,
                maxScore: 100
              });
            }
            
            // Create quizzes
            const quizzes = [];
            for (let i = 1; i <= 3; i++) {
              const score = faker.number.int({ min: 12, max: 20 });
              const date = new Date();
              // Space quizzes throughout the semester
              date.setMonth(date.getMonth() - (semester === 1 ? (5 - i) : (3 - i)));
              
              quizzes.push({
                name: `Quiz ${i}`,
                date,
                score,
                maxScore: 20
              });
            }
            
            // Create assignments
            const assignments = [];
            for (let i = 1; i <= 3; i++) {
              const score = faker.number.int({ min: 20, max: 30 });
              const date = new Date();
              // Space assignments throughout the semester
              date.setMonth(date.getMonth() - (semester === 1 ? (5 - i) : (3 - i)));
              
              assignments.push({
                name: `Assignment ${i}`,
                date,
                score,
                maxScore: 30
              });
            }
            
            // Create class participation
            const participationScore = faker.number.int({ min: 7, max: 10 });
            
            // Create final exam (only completed for semester 1, pending for semester 2)
            const finalExamDate = new Date();
            if (semester === 1) {
              finalExamDate.setMonth(finalExamDate.getMonth() - 2);
            } else {
              finalExamDate.setMonth(finalExamDate.getMonth() + 1);
            }
            
            const finalExam = {
              date: finalExamDate,
              status: semester === 1 ? 'Completed' : 'Pending'
            };
            
            if (semester === 1) {
              finalExam.score = faker.number.int({ min: 70, max: 100 });
              finalExam.maxScore = 100;
            }
            
            // Create grade progress data points
            const gradeProgress = [];
            // Add 5-7 progress points over the semester
            const numPoints = faker.number.int({ min: 5, max: 7 });
            
            for (let i = 0; i < numPoints; i++) {
              const date = new Date();
              // Distribute points throughout the semester
              date.setMonth(date.getMonth() - (semester === 1 ? (5 - (5 * i / numPoints)) : (3 - (3 * i / numPoints))));
              
              // Start around 70-80%, gradually increase to final percentage
              const startPercentage = faker.number.int({ min: 70, max: 80 });
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
              teacher: `Ms. ${faker.person.lastName()}`,
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
        
        // Update student with grade references
        const studentGrades = grades.filter(g => g.student.toString() === child._id.toString());
        await Student.findByIdAndUpdate(child._id, {
          $set: { Grades: studentGrades.map(g => g._id) }
        });
      }
    }
    
    // Save all grades
    await Grade.insertMany(grades);
    console.log(`${grades.length} grades created successfully!`);
    
    console.log('Grade seeding completed successfully');
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error seeding grades:', error);
    mongoose.disconnect();
  }
} 