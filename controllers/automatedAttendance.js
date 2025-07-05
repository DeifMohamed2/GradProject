const EventEmitter = require('events');
const axios = require('axios');
const Student = require('../models/student');
const path = require('path');
const fs = require('fs');

/**
 * AutomatedAttendanceController - Manages the automated attendance process
 * 
 * This controller handles the state machine for the attendance verification process:
 * 1. Waiting for RFID
 * 2. Capturing face
 * 3. Verifying identity
 * 4. Processing result
 * 5. Reset to waiting state
 */
class AutomatedAttendanceController extends EventEmitter {
  constructor() {
    super();
    this.state = 'WAITING_FOR_RFID';
    this.currentRfidCard = null;
    this.currentStudent = null;
    this.capturedImage = null;
    this.verificationResult = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.resetTimeout = null;
    this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000/api';
  }

  /**
   * Start the automated attendance process
   */
  start() {
    this.resetState();
    this.emit('stateChanged', { state: this.state });
    console.log('Automated attendance system started');
    return this;
  }

  /**
   * Reset the state machine to initial state
   */
  resetState() {
    // Clear any pending timeouts
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
      this.resetTimeout = null;
    }

    this.state = 'WAITING_FOR_RFID';
    this.currentRfidCard = null;
    this.currentStudent = null;
    this.capturedImage = null;
    this.verificationResult = null;
    this.retryCount = 0;
    
    this.emit('stateChanged', { state: this.state });
    console.log('System reset, waiting for RFID');
  }

  /**
   * Process RFID card detection
   * @param {string} rfidCardId - The detected RFID card ID
   */
  async processRfidCard(rfidCardId) {
    if (this.state !== 'WAITING_FOR_RFID') {
      console.log(`Ignoring RFID card ${rfidCardId}, system in ${this.state} state`);
      return;
    }

    console.log(`Processing RFID card: ${rfidCardId}`);
    
    // Clear any previous data to prevent using stale verification results
    this.capturedImage = null;
    this.verificationResult = null;
    this.retryCount = 0;
    
    this.currentRfidCard = rfidCardId;
    
    try {
      // Fetch student information
      const response = await axios.get(`${this.apiBaseUrl}/students/rfid/${rfidCardId}`);
      this.currentStudent = response.data;
      
      // Update state to capturing face
      this.state = 'CAPTURING_FACE';
      this.emit('stateChanged', { 
        state: this.state, 
        student: this.currentStudent 
      });
      
      console.log(`RFID verified for student: ${this.currentStudent.name}`);
    } catch (error) {
      console.error('Error fetching student by RFID:', error.message);
      
      // Emit error event
      this.emit('error', { 
        type: 'RFID_ERROR',
        message: 'Student not found with this RFID card',
        rfidCardId
      });
      
      // Auto-reset after delay
      this.scheduleReset(3000);
    }
  }

  /**
   * Process captured face image
   * @param {string} imageData - Base64 encoded image data
   * @param {number} timestamp - Timestamp when the image was captured
   */
  async processCapturedFace(imageData, timestamp = Date.now()) {
    if (this.state !== 'CAPTURING_FACE') {
      console.log('Ignoring face capture, system not in CAPTURING_FACE state');
      return;
    }

    console.log(`Processing captured face image from timestamp: ${timestamp}`);
    
    // Store the image data and timestamp
    this.capturedImage = imageData;
    this.captureTimestamp = timestamp;
    
    // Update state to verifying
    this.state = 'VERIFYING';
    this.emit('stateChanged', { state: this.state });
    
    try {
      // Send verification request
      const response = await axios.post(`${this.apiBaseUrl}/attendance/auto-verify`, {
        rfidCardId: this.currentRfidCard,
        imageData: this.capturedImage,
        retryCount: this.retryCount,
        timestamp: this.captureTimestamp
      });
      
      this.verificationResult = response.data;
      
      // Update state based on verification result
      this.state = 'PROCESSING_RESULT';
      this.emit('stateChanged', { 
        state: this.state,
        result: this.verificationResult
      });
      
      // Process the result
      this.processVerificationResult();
    } catch (error) {
      console.error('Error verifying attendance:', error.message);
      
      // Emit error event
      this.emit('error', { 
        type: 'VERIFICATION_ERROR',
        message: 'Failed to verify attendance',
        error: error.message
      });
      
      // Auto-reset after delay
      this.scheduleReset(3000);
    }
  }

  /**
   * Process the verification result
   */
  processVerificationResult() {
    if (!this.verificationResult) {
      console.error('No verification result to process');
      this.scheduleReset(3000);
      return;
    }

    // Check if confidence is too low (0 or very low value)
    const confidence = this.verificationResult.faceMatchConfidence || 0;
    
    if (this.verificationResult.success && confidence > 0) {
      // Successful verification with valid confidence score
      console.log(`Attendance marked successfully for ${this.currentStudent.name} with confidence ${confidence}%`);
      
      this.emit('attendanceMarked', {
        student: this.currentStudent,
        attendance: this.verificationResult.attendance,
        confidence: confidence,
        rawConfidence: this.verificationResult.rawConfidence,
        detectionModel: this.verificationResult.detectionModel
      });
      
      // Reset after a delay to show success message
      this.scheduleReset(5000);
    } else {
      // Failed verification or zero confidence
      const errorMessage = confidence <= 0 
        ? 'Face not verified - No confidence score' 
        : `Verification failed: ${this.verificationResult.message}`;
      
      console.log(errorMessage);
      
      // Check if we should retry
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Retry ${this.retryCount}/${this.maxRetries}`);
        
        // Go back to capturing face state
        this.state = 'CAPTURING_FACE';
        this.emit('stateChanged', { 
          state: this.state, 
          student: this.currentStudent,
          retryCount: this.retryCount,
          errorType: confidence <= 0 ? 'NO_CONFIDENCE_SCORE' : this.verificationResult.errorType,
          errorMessage: errorMessage
        });
      } else {
        // Max retries reached, reset
        console.log('Max retries reached, resetting');
        this.emit('maxRetriesReached', {
          student: this.currentStudent,
          errorType: confidence <= 0 ? 'NO_CONFIDENCE_SCORE' : this.verificationResult.errorType,
          message: 'Maximum verification attempts reached. Please try again.',
          confidence: confidence
        });
        
        this.scheduleReset(3000);
      }
    }
  }

  /**
   * Schedule a reset after a delay
   * @param {number} delay - Delay in milliseconds
   */
  scheduleReset(delay = 1000) {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }
    
    this.resetTimeout = setTimeout(() => {
      this.resetState();
    }, delay);
  }

  /**
   * Force a reset of the system
   */
  forceReset() {
    console.log('Forcing system reset');
    this.resetState();
  }
}

// API controller functions for student photo capture

// Get student by code
const getStudentByCode = async (req, res) => {
  try {
    const { studentCode } = req.params;
    
    if (!studentCode) {
      return res.status(400).json({ message: 'Student code is required' });
    }
    
    const student = await Student.findOne({ studentCode });
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found with the provided code' });
    }
    
    res.status(200).json(student);
  } catch (error) {
    console.error('Error fetching student by code:', error);
    res.status(500).json({ message: 'An error occurred', error: error.message });
  }
};

// Update student profile picture
const updateStudentProfilePicture = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { profilePicture } = req.body;
    
    if (!profilePicture) {
      return res.status(400).json({ message: 'Profile picture URL is required' });
    }
    
    const student = await Student.findByIdAndUpdate(
      studentId,
      { profilePicture },
      { new: true }
    );
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    res.status(200).json({ 
      message: 'Profile picture updated successfully', 
      student 
    });
  } catch (error) {
    console.error('Error updating student profile picture:', error);
    res.status(500).json({ message: 'An error occurred', error: error.message });
  }
};

// Update student RFID
const updateStudentRfid = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { rfidCardId } = req.body;
    
    if (!rfidCardId) {
      return res.status(400).json({ message: 'RFID card ID is required' });
    }
    
    // Check if RFID is already assigned to another student
    const existingStudent = await Student.findOne({ 
      rfidCardId,
      _id: { $ne: studentId }
    });
    
    if (existingStudent) {
      return res.status(400).json({ 
        message: 'This RFID card is already assigned to another student' 
      });
    }
    
    const student = await Student.findByIdAndUpdate(
      studentId,
      { rfidCardId },
      { new: true }
    );
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    res.status(200).json({ 
      message: 'RFID card updated successfully', 
      student 
    });
  } catch (error) {
    console.error('Error updating student RFID:', error);
    res.status(500).json({ message: 'An error occurred', error: error.message });
  }
};

// Encode student face (multiple photos)
const encodeStudentFace = async (req, res) => {
  try {
    const { studentId, studentCode, name, grade, section, rfidCardId } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Photos are required' });
    }
    
    // Find student by studentId or studentCode
    const student = await Student.findOne({
      $or: [
        { _id: studentId },
        { studentCode: studentCode }
      ]
    });
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:5321';
    const encodedPhotos = [];
    
    // Process each photo
    for (const file of req.files) {
      // Create relative path for the photo URL
      const photoUrl = `/uploads/${file.filename}`;
      
      try {
        // Send photo to Python service for face encoding
        const encodingResponse = await axios.post(`${pythonServiceUrl}/encode-face`, {
          studentId: student._id.toString(),
          studentCode: student.studentCode,
          name: name || `${student.firstName} ${student.lastName}`,
          photoPath: path.join(__dirname, '../public', photoUrl)
        });
        
        // Add new photo to student
        const isPrimary = req.body.isPrimary === 'true' && encodedPhotos.length === 0;
        
        const newPhoto = {
          url: photoUrl,
          encodingId: encodingResponse.data.encodingId,
          isPrimary: isPrimary
        };
        
        encodedPhotos.push(newPhoto);
      } catch (error) {
        console.error('Error encoding face:', error);
        // Store error details for better feedback
        const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
        const errorDetails = {
          photoUrl,
          error: errorMessage,
          timestamp: new Date().toISOString()
        };
        
        // Add to failed photos list for reporting
        if (!req.failedPhotos) req.failedPhotos = [];
        req.failedPhotos.push(errorDetails);
        
        // Continue with other photos even if one fails
      }
    }
    
    if (encodedPhotos.length === 0) {
      return res.status(500).json({ message: 'Failed to encode any faces' });
    }
    
    // If any photo is set as primary, unset other primary photos
    if (encodedPhotos.some(p => p.isPrimary)) {
      student.photos.forEach(photo => {
        photo.isPrimary = false;
      });
    }
    
    // Add all new photos to student
    student.photos.push(...encodedPhotos);
    
    // Update RFID if provided
    if (rfidCardId) {
      student.rfidCardId = rfidCardId;
    }
    
    await student.save();
    
    // Prepare response with success and any failures
    const response = {
      message: 'Student face encoded successfully',
      student: student,
      encodedPhotos: encodedPhotos,
      success: true,
      totalPhotos: req.files.length,
      successfulPhotos: encodedPhotos.length
    };
    
    // Include failed photos if any
    if (req.failedPhotos && req.failedPhotos.length > 0) {
      response.failedPhotos = req.failedPhotos;
      response.hasFailures = true;
    }
    
    res.status(201).json(response);
  } catch (err) {
    console.error('Error encoding student face:', err);
    
    // Check for specific error types
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        message: 'Face recognition service is not available. Please ensure the Python service is running.',
        error: 'SERVICE_UNAVAILABLE',
        details: err.message
      });
    }
    
    res.status(500).json({ 
      message: err.message || 'An error occurred while processing the photos',
      error: 'ENCODING_ERROR'
    });
  }
};

// Get students with encoded faces
const getStudentsWithFaces = async (req, res) => {
  try {
    const students = await Student.find({ 'photos.0': { $exists: true } });
    
    const transformedStudents = students.map(student => {
      const studentObj = student.toObject();
      
      return {
        ...studentObj,
        photoCount: student.photos.length
      };
    });
    
    res.json(transformedStudents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete student face encodings
const deleteStudentFaces = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Delete all encodings from Python service
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:5321';
    const failedDeletions = [];
    
    for (const photo of student.photos) {
      try {
        if (photo.encodingId) {
          await axios.post(`${pythonServiceUrl}/delete-encoding`, {
            encodingId: photo.encodingId
          });
          
          // Delete photo file
          const photoPath = path.join(__dirname, '../public', photo.url);
          if (fs.existsSync(photoPath)) {
            fs.unlinkSync(photoPath);
          }
        }
      } catch (err) {
        console.error(`Error deleting encoding ${photo.encodingId}:`, err);
        failedDeletions.push(photo.encodingId);
      }
    }
    
    // Remove all photos
    student.photos = [];
    await student.save();
    
    if (failedDeletions.length > 0) {
      res.json({ 
        message: 'Student face encodings deleted with some errors',
        failedDeletions
      });
    } else {
      res.json({ message: 'Student face encodings deleted successfully' });
    }
  } catch (err) {
    console.error('Error deleting student face encodings:', err);
    res.status(500).json({ message: err.message });
  }
};

// Create instance of the controller
const automatedAttendanceController = new AutomatedAttendanceController();

// Export both the controller instance and the API functions
module.exports = {
  controller: automatedAttendanceController,
  getStudentByCode,
  updateStudentProfilePicture,
  updateStudentRfid,
  encodeStudentFace,
  getStudentsWithFaces,
  deleteStudentFaces
}; 