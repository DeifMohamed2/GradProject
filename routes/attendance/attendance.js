const express = require('express');
const router = express.Router();
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const Attendance = require('../../models/attendance');
const Student = require('../../models/student');
const multer = require('multer');
const automatedAttendanceController = require('../../controllers/automatedAttendance');

// Get all attendance records
router.get('/', async (req, res) => {
  try {
    const attendance = await Attendance.find()
      .populate('student')
      .sort({ timestamp: -1 });
    
    // Transform the response to include primary photo
    const transformedAttendance = attendance.map(record => {
      const recordObj = record.toObject();
      if (recordObj.student && recordObj.student.photos && recordObj.student.photos.length > 0) {
        const primaryPhoto = recordObj.student.photos.find(p => p.isPrimary) || recordObj.student.photos[0];
        recordObj.student.photoUrl = primaryPhoto.url;
        delete recordObj.student.photos;
      }
      return recordObj;
    });
    
    res.json(transformedAttendance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get attendance records by student ID
router.get('/student/:studentId', async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.studentId });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    
    const attendance = await Attendance.find({ student: student._id })
      .sort({ timestamp: -1 });
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get attendance records for today
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const attendance = await Attendance.find({
      timestamp: { $gte: today, $lt: tomorrow }
    }).populate('student');
    
    // Transform the response to include primary photo
    const transformedAttendance = attendance.map(record => {
      const recordObj = record.toObject();
      if (recordObj.student && recordObj.student.photos && recordObj.student.photos.length > 0) {
        const primaryPhoto = recordObj.student.photos.find(p => p.isPrimary) || recordObj.student.photos[0];
        recordObj.student.photoUrl = primaryPhoto.url;
        delete recordObj.student.photos;
      }
      return recordObj;
    });
    
    res.json(transformedAttendance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verify student attendance using dual-factor authentication
router.post('/verify', async (req, res) => {
  try {
    const { rfidCardId, imageData, studentCode } = req.body;
    console.log(req.body);
    if (!rfidCardId || !imageData) {
      return res.status(400).json({ 
        verified: false,
        message: 'RFID card ID and image data are required' 
      });
    }
    
    // Find student by RFID card ID or student code
    let student;
    if (rfidCardId) {
      student = await Student.findOne({ rfidCardId });
    }
    
    if (!student && studentCode) {
      student = await Student.findOne({ studentCode });
    }
    
    if (!student) {
      return res.status(404).json({ 
        verified: false,
        message: 'Student not found with this RFID card or code' 
      });
    }
    
    try {
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const tempImagePath = path.join(__dirname, '../../routes/temp', `${Date.now()}.jpg`);
      
      // Ensure temp directory exists
      const tempDir = path.join(__dirname, '../../routes/temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Write the image to disk
      fs.writeFileSync(tempImagePath, base64Data, { encoding: 'base64' });
      
      // Send the image to Python service for face verification
      const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:5321';
      
      // Enhanced validation before making API call
      // Debug log the request data
      console.log('Sending verification request with data:', {
        studentId: student._id.toString(),
        photoPath: tempImagePath
      });
      
      // Enhanced validation: Ensure studentId is defined and valid before making the API call
      if (!student._id) {
        throw new Error('Student ID is undefined. Cannot verify face without a student ID.');
      }
      
      // Ensure the photoPath exists
      if (!fs.existsSync(tempImagePath)) {
        throw new Error('Image file not found at path: ' + tempImagePath);
      }
      
      const verificationResponse = await axios.post(`${pythonServiceUrl}/verify-face`, {
        studentId: student._id.toString(),
        photoPath: tempImagePath
      });
      
      // Clean up temp image
      if (fs.existsSync(tempImagePath)) {
        fs.unlinkSync(tempImagePath);
      }
      
      // Check if student already has attendance record for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const existingAttendance = await Attendance.findOne({
        student: student._id,
        timestamp: { $gte: today, $lt: tomorrow },
        status: 'PRESENT' // Only consider successful attendance
      });
      
      // Get the primary photo for the response
      const primaryPhoto = student.photos.find(p => p.isPrimary) || student.photos[0];
      
      // If verification failed, don't record attendance but return the result
      if (!verificationResponse.data.match) {
        return res.status(200).json({
          verified: false,
          message: 'Face verification failed',
          confidence: verificationResponse.data.confidence,
          student: {
            _id: student._id,
            name: student.name,
            studentId: student._id.toString(),
            studentCode: student.studentCode,
            department: student.department,
            photoUrl: primaryPhoto ? primaryPhoto.url : null
          }
        });
      }
      
      // If student already has attendance
      if (existingAttendance) {
        return res.status(200).json({
          verified: true,
          message: 'Student already marked present today',
          confidence: verificationResponse.data.confidence,
          student: {
            _id: student._id,
            name: student.name,
            studentId: student._id.toString(),
            studentCode: student.studentCode,
            department: student.department,
            photoUrl: primaryPhoto ? primaryPhoto.url : null
          },
          attendance: existingAttendance
        });
      }
      
      // Create verification details
      const verificationDetails = {
        rfidVerified: true, // RFID was verified since we found the student
        faceVerified: verificationResponse.data.match,
        matchedPhotoId: verificationResponse.data.encodingId
      };
      
      // Determine status based on verification
      const status = 'PRESENT'; // We only get here if verification was successful
      
      // Create new attendance record
      const attendance = new Attendance({
        student: student._id,
        date: new Date(),
        verificationMethod: 'DUAL_FACTOR',
        status: status,
        faceConfidence: verificationResponse.data.confidence,
        verificationDetails: verificationDetails
      });
      
      try {
        const savedAttendance = await attendance.save();
        
        // Update student's last attendance timestamp
        student.lastAttendance = new Date();
        await student.save();
        
        res.status(201).json({
          verified: true,
          message: 'Attendance recorded successfully',
          confidence: verificationResponse.data.confidence,
          student: {
            _id: student._id,
            name: student.name,
            studentId: student._id.toString(),
            studentCode: student.studentCode,
            department: student.department,
            photoUrl: primaryPhoto ? primaryPhoto.url : null
          },
          attendance: savedAttendance
        });
      } catch (saveError) {
        console.warn('Error saving attendance:', saveError);
        // Still return success but with a note about the error
        res.status(200).json({
          verified: true,
          message: 'Face verified but could not save attendance record: ' + saveError.message,
          confidence: verificationResponse.data.confidence,
          student: {
            _id: student._id,
            name: student.name,
            studentId: student._id.toString(),
            studentCode: student.studentCode,
            department: student.department,
            photoUrl: primaryPhoto ? primaryPhoto.url : null
          }
        });
      }
    } catch (imageError) {
      console.error('Error processing image:', imageError);
      res.status(400).json({ 
        verified: false,
        message: 'Error processing image: ' + imageError.message 
      });
    }
  } catch (err) {
    console.error('Error verifying attendance:', err);
    res.status(500).json({ 
      verified: false,
      message: 'Server error: ' + err.message 
    });
  }
});

// Automated attendance verification (for system-initiated verification)
router.post('/auto-verify', async (req, res) => {
  try {
    const { rfidCardId, imageData, studentCode } = req.body;
    
    if (!rfidCardId && !studentCode || !imageData) {
      return res.status(400).json({ message: 'RFID card ID or student code, and image data are required' });
    }
    
    // Find student by RFID card ID or student code
    let student;
    if (rfidCardId) {
      student = await Student.findOne({ rfidCardId });
    }
    
    if (!student && studentCode) {
      student = await Student.findOne({ studentCode });
    }
    
    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: 'Student not found with this RFID card or code',
        errorType: 'STUDENT_NOT_FOUND'
      });
    }
    
    try {
      // Save the captured image temporarily
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const tempImagePath = path.join(__dirname, '../../routes/temp', `${Date.now()}.jpg`);
      
      // Ensure temp directory exists
      const tempDir = path.join(__dirname, '../../routes/temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Write the image to disk
      fs.writeFileSync(tempImagePath, base64Data, { encoding: 'base64' });
      
      // Send the image to Python service for face verification
      const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:5321';
      
      // Debug log the request data
      console.log('Sending verification request with data:', {
        studentId: student._id.toString(),
        photoPath: tempImagePath
      });
      
      // Enhanced validation: Ensure studentId is defined and valid before making the API call
      if (!student._id) {
        throw new Error('Student ID is undefined. Cannot verify face without a student ID.');
      }
      
      // Ensure the photoPath exists
      if (!fs.existsSync(tempImagePath)) {
        throw new Error('Image file not found at path: ' + tempImagePath);
      }
      
      const verificationResponse = await axios.post(`${pythonServiceUrl}/verify-face`, {
        studentId: student._id.toString(),
        photoPath: tempImagePath
      });
      
      // Clean up temp image
      if (fs.existsSync(tempImagePath)) {
        fs.unlinkSync(tempImagePath);
      }
      
      // Get the confidence score from the verification response
      const confidence = verificationResponse.data.confidence || 0;
      
      // Check if student already has attendance record for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const existingAttendance = await Attendance.findOne({
        student: student._id,
        timestamp: { $gte: today, $lt: tomorrow },
        status: 'PRESENT' // Only consider successful attendance
      });
      
      // Get the primary photo for the response
      const primaryPhoto = student.photos.find(p => p.isPrimary) || student.photos[0];
      
      // Check for identity mismatch (if batch verification was performed)
      let identityMismatch = false;
      let bestMatchStudentId = null;
      
      if (verificationResponse.data.batch_matches && verificationResponse.data.batch_matches.length > 0) {
        // If the best match is not the current student, we might have an identity mismatch
        const bestMatch = verificationResponse.data.batch_matches[0];
        if (bestMatch.studentId !== student._id.toString() && bestMatch.confidence > 80) {
          identityMismatch = true;
          bestMatchStudentId = bestMatch.studentId;
        }
      }
      
      // If student already has attendance
      if (existingAttendance) {
        return res.status(200).json({
          success: true,
          message: 'Student already marked present today',
          faceMatchConfidence: confidence,
          rawConfidence: verificationResponse.data.raw_confidence,
          detectionModel: verificationResponse.data.detection_model,
          student: {
            _id: student._id,
            name: student.name,
            studentId: student._id.toString(),
            studentCode: student.studentCode,
            department: student.department,
            photoUrl: primaryPhoto ? primaryPhoto.url : null
          },
          attendance: existingAttendance,
          identityMismatch: identityMismatch,
          possibleMatch: identityMismatch ? bestMatchStudentId : null
        });
      }
      
      // If verification failed, don't record attendance but return the result
      if (!verificationResponse.data.match) {
        return res.status(200).json({
          success: false,
          message: 'Face verification failed',
          errorType: 'FACE_VERIFICATION_FAILED',
          faceMatchConfidence: confidence,
          rawConfidence: verificationResponse.data.raw_confidence,
          detectionModel: verificationResponse.data.detection_model,
          student: {
            _id: student._id,
            name: student.name,
            studentId: student._id.toString(),
            studentCode: student.studentCode,
            department: student.department,
            photoUrl: primaryPhoto ? primaryPhoto.url : null
          },
          identityMismatch: identityMismatch,
          possibleMatch: identityMismatch ? bestMatchStudentId : null
        });
      }
      
      // Create verification details
      const verificationDetails = {
        rfidVerified: true,
        faceVerified: verificationResponse.data.match,
        matchedPhotoId: verificationResponse.data.encodingId,
        faceConfidence: confidence,
        detectionModel: verificationResponse.data.detection_model
      };
      
      // Create new attendance record
      const attendance = new Attendance({
        student: student._id,
        date: new Date(),
        verificationMethod: 'DUAL_FACTOR',
        status: 'PRESENT',
        faceConfidence: confidence,
        verificationDetails: verificationDetails
      });
      
      try {
        const savedAttendance = await attendance.save();
        
        // Update student's last attendance timestamp
        student.lastAttendance = new Date();
        await student.save();
        
        return res.status(201).json({
          success: true,
          message: 'Attendance recorded successfully',
          faceMatchConfidence: confidence,
          rawConfidence: verificationResponse.data.raw_confidence,
          detectionModel: verificationResponse.data.detection_model,
          student: {
            _id: student._id,
            name: student.name,
            studentId: student._id.toString(),
            studentCode: student.studentCode,
            department: student.department,
            photoUrl: primaryPhoto ? primaryPhoto.url : null
          },
          attendance: savedAttendance,
          identityMismatch: identityMismatch,
          possibleMatch: identityMismatch ? bestMatchStudentId : null
        });
      } catch (saveError) {
        console.warn('Error saving attendance:', saveError);
        // Still return success but with a note about the error
        return res.status(200).json({
          success: true,
          message: 'Face verified but could not save attendance record: ' + saveError.message,
          faceMatchConfidence: confidence,
          rawConfidence: verificationResponse.data.raw_confidence,
          detectionModel: verificationResponse.data.detection_model,
          student: {
            _id: student._id,
            name: student.name,
            studentId: student._id.toString(),
            studentCode: student.studentCode,
            department: student.department,
            photoUrl: primaryPhoto ? primaryPhoto.url : null
          },
          identityMismatch: identityMismatch,
          possibleMatch: identityMismatch ? bestMatchStudentId : null
        });
      }
    } catch (imageError) {
      console.error('Error processing image:', imageError);
      res.status(400).json({ 
        success: false,
        message: 'Error processing image: ' + imageError.message,
        errorType: 'IMAGE_PROCESSING_ERROR'
      });
    }
  } catch (err) {
    console.error('Error in auto-verify:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error: ' + err.message,
      errorType: 'SERVER_ERROR'
    });
  }
});

// Delete an attendance record
router.delete('/:id', async (req, res) => {
  try {
    const attendanceId = req.params.id;
    
    // Find the attendance record
    const attendance = await Attendance.findById(attendanceId);
    
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    
    // Delete the record
    await Attendance.findByIdAndDelete(attendanceId);
    
    res.status(200).json({ 
      message: 'Attendance record deleted successfully',
      deletedRecord: attendance
    });
  } catch (err) {
    console.error('Error deleting attendance record:', err);
    res.status(500).json({ message: err.message });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = path.join(__dirname, '../../public/uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: function(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Encode student face (multiple photos)
router.post('/encode-student-face', upload.array('photos', 10), automatedAttendanceController.encodeStudentFace);

// Get students with encoded faces
router.get('/students-with-faces', automatedAttendanceController.getStudentsWithFaces);

// Get student faces by ID
router.get('/student-faces/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    res.json(student);
  } catch (err) {
    console.error('Error fetching student faces:', err);
    res.status(500).json({ message: err.message });
  }
});

// Delete student face encodings
router.delete('/delete-student-faces/:studentId', automatedAttendanceController.deleteStudentFaces);

// Mark attendance manually
router.post('/mark', async (req, res) => {
  try {
    const { studentCode, rfidCardId, verificationMethod } = req.body;
    
    if (!studentCode && !rfidCardId) {
      return res.status(400).json({ message: 'Student code or RFID card ID is required' });
    }
    
    // Find student by studentCode or rfidCardId
    let student;
    if (studentCode) {
      student = await Student.findOne({ studentCode });
    }
    
    if (!student && rfidCardId) {
      student = await Student.findOne({ rfidCardId });
    }
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Check if student already has attendance record for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const existingAttendance = await Attendance.findOne({
      student: student._id,
      timestamp: { $gte: today, $lt: tomorrow },
      status: 'PRESENT'
    });
    
    if (existingAttendance) {
      return res.status(200).json({
        message: 'Student already marked present today',
        attendance: existingAttendance
      });
    }
    
    // Create new attendance record
    const attendance = new Attendance({
      student: student._id,
      date: new Date(),
      verificationMethod: verificationMethod || 'MANUAL',
      status: 'PRESENT'
    });
    
    const savedAttendance = await attendance.save();
    
    // Update student's last attendance timestamp
    student.lastAttendance = new Date();
    await student.save();
    
    res.status(201).json({
      message: 'Attendance marked successfully',
      attendance: savedAttendance
    });
  } catch (err) {
    console.error('Error marking attendance:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 