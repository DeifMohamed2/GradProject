require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const http = require('http');
const bodyParser = require('body-parser');

const adminRoute = require('./routes/adminRoute');
const parentRoute = require('./routes/parentRoute');
const teacherRoute = require('./routes/teacherRoute');
const teacherApi = require('./routes/teacherApi');

// Import attendance system routes
const attendanceRoutes = require('./routes/attendance/attendance');
const studentRoutes = require('./routes/attendance/student');
const rfidRoutes = require('./routes/attendance/rfid');

// Import services
const automatedAttendanceSocket = require('./services/automatedAttendanceSocket');

// express app
const app = express();

// Configure body parser with increased limits first
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Request body:', req.body);
  }
  next();
});

// connect to mongodb & listen for requests
const dbURI = process.env.MONGO_URI;
mongoose.connect(dbURI)
    .then(() => {
        console.log('Connected to MongoDB database');
        startServer();
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });
    

// register view engine
app.set('view engine', 'ejs');


// middleware & static files
app.use(
  cors({
    origin: '*', // Or replace '*' with specific origins, e.g., ['https://your-friend-frontend.com']
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser())

app.use(session({
    secret: "Keybord",
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: dbURI
    }),

}))


// routes
app.get('/', (req, res) => {
    res.render('index', { title: 'Home' });
});


app.use('/admin' , adminRoute);
app.use('/parent' , parentRoute);
app.use('/teacher', teacherRoute);
app.use('/api/teacher', teacherApi);

// Attendance system routes
app.use('/api/attendance', attendanceRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/rfid', rfidRoutes);

// Serve HTML pages for attendance system
app.get('/attendance', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'attendance', 'attendance.html'));
});

app.get('/student-capture', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'attendance', 'student_capture.html'));
});


// 404 page
app.use((req, res) => {
  res.status(404).render('404', { title: '404' });
});

// Function to start server with port fallback
function startServer(port = process.env.PORT || 9700, retries = 0) {
  const MAX_RETRIES = 10; // Maximum number of port retries
  
  if (retries >= MAX_RETRIES) {
    console.error(`Failed to start server after ${MAX_RETRIES} retries. Please configure a different port in your .env file.`);
    process.exit(1);
  }

  console.log(`Attempting to start server on port ${port}...`);
  
  // Create server but don't start listening yet
  const server = http.createServer(app);
  
  // Initialize socket service for automated attendance
  automatedAttendanceSocket.initialize(server);
  
  // Handle server errors
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, trying port ${port + 1}...`);
      // Close the server (not listening yet, but still need to clean up)
      server.close();
      // Try the next port
      setTimeout(() => {
        startServer(port + 1, retries + 1);
      }, 1000); // Add a slight delay to prevent rapid retries
    } else {
      console.error('Server error:', error);
      process.exit(1);
    }
  });
  
  // Start listening on the port
  server.listen(port, () => {
    console.log(`Connected to db, server started on port ${port}`);
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.close(() => {
      console.log('Server shut down successfully');
      process.exit(0);
    });
  });
  
  return server;
}

module.exports = app;
