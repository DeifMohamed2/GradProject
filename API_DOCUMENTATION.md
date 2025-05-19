# School Management System API Documentation

## Teacher API Endpoints

This document provides comprehensive documentation for the Teacher API endpoints that can be used by both web and mobile applications.

### Base URL

All API endpoints are relative to: `/api/teacher`

### Authentication

Most endpoints require authentication using a JWT token. The token can be provided in one of the following ways:

1. In the request cookies as `token`
2. In the Authorization header as `Bearer <token>`
3. As a query parameter: `?token=<token>`

### Response Format

All API responses follow a consistent format:

```json
{
  "success": true|false,
  "message": "Description of the result",
  "data": {...}  // Present only in successful responses
}
```

For paginated results:

```json
{
  "success": true,
  "message": "Description of the result",
  "data": {
    "items": [...],
    "pagination": {
      "limit": 10,
      "offset": 0,
      "total": 100
    }
  }
}
```

### Error Handling

Error responses include appropriate HTTP status codes and a descriptive message:

```json
{
  "success": false,
  "message": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Server Error

---

## Authentication Endpoints

### Login

```
POST /api/teacher/login
```

Authenticate a teacher and receive a JWT token.

**Request Body:**
```json
{
  "email": "teacher@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "teacher": {
    "id": "teacherId",
    "username": "teacherUsername",
    "email": "teacher@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "profilePicture": "https://example.com/profile.jpg"
  },
  "token": "JWT_TOKEN"
}
```

### Logout

```
POST /api/teacher/logout
```

Logout the current teacher session.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Profile Endpoints

### Get Profile

```
GET /api/teacher/profile
```

Get the current teacher's profile information.

**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "teacherId",
    "username": "teacherUsername",
    "email": "teacher@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "1234567890",
    "profilePicture": "https://example.com/profile.jpg"
  }
}
```

### Update Profile

```
PUT /api/teacher/profile
```

Update the current teacher's profile information.

**Request Body:**
```json
{
  "username": "newUsername",
  "firstName": "NewFirstName",
  "lastName": "NewLastName",
  "email": "newemail@example.com",
  "phoneNumber": "9876543210",
  "profilePicture": "https://example.com/new-profile.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "teacherId",
    "username": "newUsername",
    "email": "newemail@example.com",
    "firstName": "NewFirstName",
    "lastName": "NewLastName",
    "phoneNumber": "9876543210",
    "profilePicture": "https://example.com/new-profile.jpg"
  }
}
```

### Change Password

```
PUT /api/teacher/password
```

Update the current teacher's password.

**Request Body:**
```json
{
  "currentPassword": "currentPassword123",
  "newPassword": "newPassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

## Dashboard Endpoints

### Get Dashboard Data

```
GET /api/teacher/dashboard
```

Get comprehensive dashboard data for the teacher.

**Response:**
```json
{
  "success": true,
  "message": "Dashboard data retrieved successfully",
  "data": {
    "teacher": {
      "id": "teacherId",
      "name": "John Doe",
      "email": "teacher@example.com",
      "profilePicture": "https://example.com/profile.jpg"
    },
    "classes": [
      {
        "id": "classId1",
        "name": "Math 101",
        "description": "Introduction to Mathematics",
        "studentCount": 25
      }
    ],
    "stats": {
      "classesCount": 3,
      "studentsCount": 75,
      "quizzesCount": 15,
      "attendanceCount": 150
    },
    "recentActivities": [
      {
        "className": "Math 101",
        "description": "Created quiz: Algebra Basics",
        "date": "2023-11-10T09:30:00Z",
        "status": "Completed"
      }
    ]
  }
}
```

---

## Classes Endpoints

### Get All Classes

```
GET /api/teacher/classes
```

Get all classes assigned to the teacher.

**Response:**
```json
{
  "success": true,
  "message": "Classes retrieved successfully",
  "data": [
    {
      "id": "classId1",
      "name": "Math 101",
      "description": "Introduction to Mathematics",
      "studentCount": 25,
      "schedule": {
        "days": ["Monday", "Wednesday"],
        "time": "09:00 - 10:30"
      },
      "students": [
        {
          "id": "studentId1",
          "name": "Jane Smith",
          "profilePicture": "https://example.com/student1.jpg"
        }
      ]
    }
  ]
}
```

### Get Class Details

```
GET /api/teacher/classes/:classId
```

Get detailed information about a specific class.

**Response:**
```json
{
  "success": true,
  "message": "Class details retrieved successfully",
  "data": {
    "id": "classId1",
    "name": "Math 101",
    "description": "Introduction to Mathematics",
    "schedule": {
      "days": ["Monday", "Wednesday"],
      "time": "09:00 - 10:30"
    },
    "students": [
      {
        "id": "studentId1",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "profilePicture": "https://example.com/student1.jpg"
      }
    ],
    "quizzes": [
      {
        "id": "quizId1",
        "title": "Algebra Basics",
        "dueDate": "2023-11-15T23:59:59Z",
        "maxScore": 100
      }
    ],
    "attendanceSessions": [
      {
        "id": "sessionId1",
        "date": "2023-11-10T09:00:00Z",
        "attendanceCount": 22
      }
    ]
  }
}
```

### Get Students By Class

```
GET /api/teacher/classes/:classId/students
```

Get all students enrolled in a specific class.

**Response:**
```json
{
  "success": true,
  "message": "Students retrieved successfully",
  "data": [
    {
      "id": "studentId1",
      "username": "janes",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "profilePicture": "https://example.com/student1.jpg"
    }
  ]
}
```

---

## Students Endpoints

### Get Student Details

```
GET /api/teacher/students/:studentId
```

Get detailed information about a specific student.

**Response:**
```json
{
  "success": true,
  "message": "Student details retrieved successfully",
  "data": {
    "id": "studentId1",
    "username": "janes",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "profilePicture": "https://example.com/student1.jpg",
    "classes": [
      {
        "id": "classId1",
        "name": "Math 101"
      }
    ],
    "attendance": [
      {
        "id": "attendanceId1",
        "date": "2023-11-10T09:00:00Z",
        "status": "present",
        "className": "Math 101"
      }
    ],
    "grades": [
      {
        "quizId": "quizId1",
        "quizTitle": "Algebra Basics",
        "maxScore": 100,
        "score": 85,
        "feedback": "Good work on equations."
      }
    ]
  }
}
```

---

## Attendance Endpoints

### Get Attendance Records

```
GET /api/teacher/attendance
```

Get attendance records with optional filtering.

**Query Parameters:**
- `classId` (optional): Filter by class ID
- `date` (optional): Filter by specific date (YYYY-MM-DD)
- `month` (optional): Filter by month (1-12)
- `year` (optional): Filter by year

**Response:**
```json
{
  "success": true,
  "message": "Attendance records retrieved successfully",
  "data": [
    {
      "id": "attendanceId1",
      "date": "2023-11-10T09:00:00Z",
      "status": "present",
      "student": {
        "id": "studentId1",
        "name": "Jane Smith",
        "profilePicture": "https://example.com/student1.jpg"
      },
      "class": {
        "id": "classId1",
        "name": "Math 101"
      }
    }
  ]
}
```

### Create Attendance Session

```
POST /api/teacher/classes/:classId/attendance
```

Create a new attendance session for a class.

**Request Body:**
```json
{
  "date": "2023-11-15T09:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Attendance session created successfully",
  "data": {
    "session": {
      "id": "sessionId1",
      "date": "2023-11-15T09:00:00Z",
      "attendances": []
    }
  }
}
```

### Mark Attendance

```
POST /api/teacher/classes/:classId/attendance/:sessionId/students/:studentId
```

Mark attendance for a specific student in a session.

**Request Body:**
```json
{
  "status": "present"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Attendance marked successfully",
  "data": {
    "attendance": {
      "id": "attendanceId1",
      "class": "classId1",
      "student": "studentId1",
      "date": "2023-11-15T09:00:00Z",
      "status": "present"
    }
  }
}
```

### Get Attendance History

```
GET /api/teacher/classes/:classId/attendance
```

Get attendance history for a specific class.

**Response:**
```json
{
  "success": true,
  "message": "Attendance history retrieved successfully",
  "data": {
    "sessions": [
      {
        "id": "sessionId1",
        "date": "2023-11-10T09:00:00Z",
        "attendances": [
          {
            "id": "attendanceId1",
            "student": {
              "id": "studentId1",
              "username": "janes",
              "firstName": "Jane",
              "lastName": "Smith",
              "profilePicture": "https://example.com/student1.jpg"
            },
            "status": "present"
          }
        ]
      }
    ]
  }
}
```

---

## Quizzes and Grades Endpoints

### Get All Quizzes

```
GET /api/teacher/quizzes
```

Get all quizzes created by the teacher, optionally filtered by class.

**Query Parameters:**
- `classId` (optional): Filter quizzes by class ID

**Response:**
```json
{
  "success": true,
  "message": "Quizzes retrieved successfully",
  "data": [
    {
      "id": "quizId1",
      "title": "Algebra Basics",
      "description": "Fundamental algebra concepts",
      "maxScore": 100,
      "dueDate": "2023-11-15T23:59:59Z",
      "class": {
        "id": "classId1",
        "name": "Math 101"
      },
      "gradeCount": 18
    }
  ]
}
```

### Create Quiz

```
POST /api/teacher/classes/:classId/quizzes
```

Create a new quiz for a class.

**Request Body:**
```json
{
  "title": "Geometry Basics",
  "description": "Introduction to geometry concepts",
  "maxScore": 100,
  "dueDate": "2023-11-20T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Quiz created successfully",
  "data": {
    "quiz": {
      "id": "quizId2",
      "title": "Geometry Basics",
      "description": "Introduction to geometry concepts",
      "maxScore": 100,
      "dueDate": "2023-11-20T23:59:59Z",
      "class": "classId1",
      "grades": []
    }
  }
}
```

### Get Quiz Details

```
GET /api/teacher/classes/:classId/quizzes/:quizId
```

Get detailed information about a specific quiz.

**Response:**
```json
{
  "success": true,
  "message": "Quiz details retrieved successfully",
  "data": {
    "quiz": {
      "id": "quizId1",
      "title": "Algebra Basics",
      "description": "Fundamental algebra concepts",
      "maxScore": 100,
      "dueDate": "2023-11-15T23:59:59Z",
      "grades": [
        {
          "student": {
            "id": "studentId1",
            "username": "janes",
            "firstName": "Jane",
            "lastName": "Smith",
            "profilePicture": "https://example.com/student1.jpg"
          },
          "score": 85,
          "feedback": "Good work on equations."
        }
      ]
    },
    "studentsWithoutGrades": [
      {
        "id": "studentId2",
        "username": "johnb",
        "firstName": "John",
        "lastName": "Brown",
        "profilePicture": "https://example.com/student2.jpg"
      }
    ]
  }
}
```

### Update Quiz

```
PUT /api/teacher/classes/:classId/quizzes/:quizId
```

Update an existing quiz.

**Request Body:**
```json
{
  "title": "Updated Algebra Quiz",
  "description": "Updated description",
  "maxScore": 120,
  "dueDate": "2023-11-17T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Quiz updated successfully",
  "data": {
    "id": "quizId1",
    "title": "Updated Algebra Quiz",
    "description": "Updated description",
    "maxScore": 120,
    "dueDate": "2023-11-17T23:59:59Z",
    "class": "classId1"
  }
}
```

### Delete Quiz

```
DELETE /api/teacher/classes/:classId/quizzes/:quizId
```

Delete a quiz.

**Response:**
```json
{
  "success": true,
  "message": "Quiz deleted successfully"
}
```

### Update Quiz Grade

```
POST /api/teacher/classes/:classId/quizzes/:quizId/students/:studentId
```

Add or update a grade for a student on a quiz.

**Request Body:**
```json
{
  "score": 90,
  "feedback": "Excellent understanding of concepts"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Grade updated successfully",
  "data": {
    "grade": {
      "student": "studentId1",
      "score": 90,
      "feedback": "Excellent understanding of concepts"
    }
  }
}
```

---

## Teaching Materials Endpoints

### Get Teaching Materials

```
GET /api/teacher/materials
```

Get teaching materials, optionally filtered by class.

**Query Parameters:**
- `classId` (optional): Filter materials by class ID

**Response:**
```json
{
  "success": true,
  "message": "Teaching materials retrieved successfully",
  "data": [
    {
      "id": "materialId1",
      "title": "Algebra Lesson 1",
      "description": "Introduction to variables and equations",
      "fileUrl": "https://example.com/files/algebra-lesson-1.pdf",
      "type": "pdf",
      "uploadDate": "2023-11-05T10:15:00Z",
      "class": {
        "id": "classId1",
        "name": "Math 101"
      }
    }
  ]
}
```

### Add Teaching Material

```
POST /api/teacher/materials
```

Add a new teaching material.

**Request Body:**
```json
{
  "classId": "classId1",
  "title": "Geometry Worksheets",
  "description": "Practice worksheets for geometry lessons",
  "fileUrl": "https://example.com/files/geometry-worksheets.pdf",
  "type": "pdf"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Material added successfully",
  "data": {
    "id": "materialId2",
    "title": "Geometry Worksheets",
    "classId": "classId1"
  }
}
```

### Delete Teaching Material

```
DELETE /api/teacher/materials/:materialId
```

Delete a teaching material.

**Response:**
```json
{
  "success": true,
  "message": "Material deleted successfully"
}
```

---

## Notifications Endpoints

### Get Notifications

```
GET /api/teacher/notifications
```

Get notifications for the teacher.

**Query Parameters:**
- `limit` (optional): Number of notifications to return (default: 10)
- `offset` (optional): Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": {
    "notifications": [
      {
        "id": "notificationId1",
        "title": "New Student Added",
        "message": "A new student has been added to your Math 101 class",
        "date": "2023-11-10T14:30:00Z",
        "read": false,
        "type": "student"
      }
    ],
    "pagination": {
      "limit": 10,
      "offset": 0,
      "total": 1
    }
  }
}
```

### Mark Notification as Read

```
PUT /api/teacher/notifications/:notificationId/mark-read
```

Mark a notification as read.

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
``` 