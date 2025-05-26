# School Management System

A comprehensive school management system for administrators, teachers, parents, and students.

## Features

- User management (admins, teachers, parents, students)
- Class management
- Attendance tracking
- Quiz and grade management
- Financial tracking (expenses, transactions)
- Dashboard analytics

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   PORT=9700
   MONGO_URI=mongodb://localhost:27017/school_management
   JWT_SECRET=your_jwt_secret
   ```
4. Start the application:
   ```
   npm start
   ```

## Data Seeding

The application includes a data seeding script that populates the database with sample data for testing and development purposes.

### Generated Data

The seeding script creates:

- Admin accounts (2)
- Teacher accounts (20)
- Parent accounts (50)
- Student accounts (1-3 per parent)
- Classes (1-3 per teacher)
- Attendance records
- Quizzes and grades
- Expenses
- Transactions

### Seed Data Command

To seed the database with sample data:

```
npm run seed
```

This will clear any existing data and create new sample data with realistic relationships between entities.

### Test Accounts

After seeding, you can use the following accounts:

- **Admin**: username: `admin1`, password: `admin123`
- **Teachers**: password: `teacher123` (usernames are generated from first and last names)
- **Parents**: password: `parent123` (usernames are generated from first and last names)
- **Students**: password: `student123` (usernames are generated from first and last names)

## API Testing

The project includes an automated API testing script that tests all available endpoints.

### Running Tests

To run the API tests:

```
npm test
```

The test script:

1. Authenticates with admin, teacher, and parent accounts
2. Tests all available GET endpoints
3. Tests creation of new entities (students, parents, teachers, classes)
4. Logs all results to the console and to `api_test_results.log`

### Prerequisites for Testing

- The application must be running (`npm start`)
- The database should be seeded with test data (`npm run seed`)

## API Routes

### Admin Routes

- `/admin/login` - Admin login
- `/admin/dashboard` - Admin dashboard
- `/admin/students` - Student management
- `/admin/teachers` - Teacher management
- `/admin/parents` - Parent management
- `/admin/classes` - Class management
- `/admin/expenses` - Expense management
- `/admin/grades` - Grade management
- `/admin/attendance` - Attendance management

### Teacher Routes

- `/teacher/login` - Teacher login
- `/teacher/dashboard` - Teacher dashboard
- `/teacher/classes` - Teacher's classes
- `/teacher/profile` - Teacher profile
- `/teacher/quizzes` - Quiz management
- `/teacher/attendance` - Attendance management

### Parent Routes

- `/parent/login` - Parent login
- `/parent/profile` - Parent profile
- `/parent/children` - Parent's children
- `/parent/transactions` - Transaction history

## Technology Stack

- Node.js
- Express.js
- MongoDB (Mongoose)
- EJS templates
- JWT Authentication