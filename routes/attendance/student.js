const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const Student = require('../../models/student');

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
  limits: { fileSize: 25 * 1024 * 1024 }, // Increased from 10MB to 25MB limit
  fileFilter: function(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Get all students
router.get('/', async (req, res) => {
  try {
    const students = await Student.find();
    
    // Transform the response to include only primary photo
    const transformedStudents = students.map(student => {
      const studentObj = student.toObject();
      const primaryPhoto = student.photos.find(p => p.isPrimary) || student.photos[0];
      
      return {
        ...studentObj,
        photoUrl: primaryPhoto ? primaryPhoto.url : null,
        photos: undefined // Remove the photos array
      };
    });
    
    res.json(transformedStudents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get student by ID
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get student by RFID
router.get('/rfid/:cardId', async (req, res) => {
  try {
    const student = await Student.findOne({ rfidCardId: req.params.cardId });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    
    // Transform the response to include only primary photo
    const studentObj = student.toObject();
    const primaryPhoto = student.photos.find(p => p.isPrimary) || student.photos[0];
    
    const transformedStudent = {
      ...studentObj,
      photoUrl: primaryPhoto ? primaryPhoto.url : null,
      photos: undefined // Remove the photos array for the response
    };
    
    res.json(transformedStudent);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get student by student code
router.get('/code/:studentCode', async (req, res) => {
  try {
    const student = await Student.findOne({ studentCode: req.params.studentCode });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add new student with photo capture
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { studentId, name, department, rfidCardId } = req.body;
    
    // Check if student already exists
    const existingStudent = await Student.findOne({ 
      $or: [{ studentId }, { rfidCardId }] 
    });
    
    if (existingStudent) {
      return res.status(400).json({ 
        message: 'Student with this ID or RFID card already exists' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Photo is required' });
    }

    // Create relative path for the photo URL
    const photoUrl = `/uploads/${req.file.filename}`;
    
    // Send photo to Python service for face encoding
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:5321';
    const encodingResponse = await axios.post(`${pythonServiceUrl}/encode-face`, {
      studentId,
      photoPath: path.join(__dirname, '../../public', photoUrl)
    });

    // Create new student with face encoding
    const student = new Student({
      studentId,
      name,
      department,
      rfidCardId,
      photos: [{
        url: photoUrl,
        encodingId: encodingResponse.data.encodingId,
        isPrimary: true
      }]
    });

    const newStudent = await student.save();
    
    // Return student with photoUrl for compatibility
    const returnStudent = {
      ...newStudent.toObject(),
      photoUrl: photoUrl,
      photos: undefined
    };
    
    res.status(201).json(returnStudent);
  } catch (err) {
    console.error('Error adding student:', err);
    res.status(500).json({ message: err.message });
  }
});

// Add additional photo to existing student
router.post('/:id/photos', upload.single('photo'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    
    if (!req.file) {
      return res.status(400).json({ message: 'Photo is required' });
    }
    
    // Create relative path for the photo URL
    const photoUrl = `/uploads/${req.file.filename}`;
    
    // Send photo to Python service for face encoding
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:5321';
    const encodingResponse = await axios.post(`${pythonServiceUrl}/encode-face`, {
      studentId: student.studentId,
      photoPath: path.join(__dirname, '../../public', photoUrl)
    });
    
    // Add new photo to student
    const newPhoto = {
      url: photoUrl,
      encodingId: encodingResponse.data.encodingId,
      isPrimary: req.body.isPrimary === 'true'
    };
    
    // If this is set as primary, unset other primary photos
    if (newPhoto.isPrimary) {
      student.photos.forEach(photo => {
        photo.isPrimary = false;
      });
    }
    
    // If this is the first photo, make it primary
    if (student.photos.length === 0) {
      newPhoto.isPrimary = true;
    }
    
    student.photos.push(newPhoto);
    await student.save();
    
    res.status(201).json({
      message: 'Photo added successfully',
      photo: newPhoto
    });
  } catch (err) {
    console.error('Error adding photo:', err);
    res.status(500).json({ message: err.message });
  }
});

// Delete a photo
router.delete('/:id/photos/:photoId', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    
    // Find the photo
    const photoIndex = student.photos.findIndex(p => p._id.toString() === req.params.photoId);
    if (photoIndex === -1) return res.status(404).json({ message: 'Photo not found' });
    
    const photo = student.photos[photoIndex];
    
    // Delete encoding from Python service
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:5321';
    await axios.post(`${pythonServiceUrl}/delete-encoding`, {
      encodingId: photo.encodingId
    });
    
    // Delete photo file
    const photoPath = path.join(__dirname, '../../public', photo.url);
    if (fs.existsSync(photoPath)) {
      fs.unlinkSync(photoPath);
    }
    
    // Remove photo from student
    student.photos.splice(photoIndex, 1);
    
    // If we deleted the primary photo, set a new one if available
    if (photo.isPrimary && student.photos.length > 0) {
      student.photos[0].isPrimary = true;
    }
    
    await student.save();
    
    res.json({ message: 'Photo deleted successfully' });
  } catch (err) {
    console.error('Error deleting photo:', err);
    res.status(500).json({ message: err.message });
  }
});

// Set a photo as primary
router.put('/:id/photos/:photoId/primary', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    
    // Find the photo
    const photoIndex = student.photos.findIndex(p => p._id.toString() === req.params.photoId);
    if (photoIndex === -1) return res.status(404).json({ message: 'Photo not found' });
    
    // Update primary status
    student.photos.forEach((photo, index) => {
      photo.isPrimary = (index === photoIndex);
    });
    
    await student.save();
    
    res.json({ message: 'Primary photo updated successfully' });
  } catch (err) {
    console.error('Error updating primary photo:', err);
    res.status(500).json({ message: err.message });
  }
});

// Update student
router.put('/:id', async (req, res) => {
  try {
    const { studentId, name, department, rfidCardId } = req.body;
    const updateData = { studentId, name, department, rfidCardId };
    
    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id, 
      updateData,
      { new: true }
    );
    
    if (!updatedStudent) return res.status(404).json({ message: 'Student not found' });
    
    // Transform the response to include only primary photo
    const studentObj = updatedStudent.toObject();
    const primaryPhoto = updatedStudent.photos.find(p => p.isPrimary) || updatedStudent.photos[0];
    
    const transformedStudent = {
      ...studentObj,
      photoUrl: primaryPhoto ? primaryPhoto.url : null,
      photos: undefined // Remove the photos array for the response
    };
    
    res.json(transformedStudent);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update student profile picture
router.put('/:id/profile-picture', async (req, res) => {
  try {
    const { profilePicture } = req.body;
    
    if (!profilePicture) {
      return res.status(400).json({ message: 'Profile picture URL is required' });
    }
    
    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      { profilePicture },
      { new: true }
    );
    
    if (!updatedStudent) return res.status(404).json({ message: 'Student not found' });
    
    res.json({ message: 'Profile picture updated successfully', student: updatedStudent });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update student RFID
router.put('/:id/rfid', async (req, res) => {
  try {
    const { rfidCardId } = req.body;
    
    if (!rfidCardId) {
      return res.status(400).json({ message: 'RFID card ID is required' });
    }
    
    // Check if RFID is already assigned to another student
    const existingStudent = await Student.findOne({ 
      rfidCardId,
      _id: { $ne: req.params.id }
    });
    
    if (existingStudent) {
      return res.status(400).json({ 
        message: 'This RFID card is already assigned to another student' 
      });
    }
    
    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      { rfidCardId },
      { new: true }
    );
    
    if (!updatedStudent) return res.status(404).json({ message: 'Student not found' });
    
    res.json({ message: 'RFID card updated successfully', student: updatedStudent });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete student
router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    
    // Delete all photos and encodings
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:5321';
    
    for (const photo of student.photos) {
      // Delete encoding from Python service
      try {
        await axios.post(`${pythonServiceUrl}/delete-encoding`, {
          encodingId: photo.encodingId
        });
      } catch (err) {
        console.error(`Error deleting encoding ${photo.encodingId}:`, err);
      }
      
      // Delete photo file
      const photoPath = path.join(__dirname, '../../public', photo.url);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }
    
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Encode student face (multiple photos)
router.post('/encode-face', upload.array('photos', 10), async (req, res) => {
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
      
      // Send photo to Python service for face encoding
      const encodingResponse = await axios.post(`${pythonServiceUrl}/encode-face`, {
        studentId: student._id.toString(),
        studentCode: student.studentCode,
        name: name || `${student.firstName} ${student.lastName}`,
        photoPath: path.join(__dirname, '../../public', photoUrl)
      });
      
      // Add new photo to student
      const isPrimary = req.body.isPrimary === 'true' && encodedPhotos.length === 0;
      
      const newPhoto = {
        url: photoUrl,
        encodingId: encodingResponse.data.encodingId,
        isPrimary: isPrimary
      };
      
      encodedPhotos.push(newPhoto);
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
    
    res.status(201).json({
      message: 'Student face encoded successfully',
      student: student,
      encodedPhotos: encodedPhotos
    });
  } catch (err) {
    console.error('Error encoding student face:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get students with encoded faces
router.get('/students-with-faces', async (req, res) => {
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
});

// Delete student face encodings
router.delete('/delete-faces/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    
    // Delete all encodings from Python service
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:5321';
    
    for (const photo of student.photos) {
      try {
        await axios.post(`${pythonServiceUrl}/delete-encoding`, {
          encodingId: photo.encodingId
        });
        
        // Delete photo file
        const photoPath = path.join(__dirname, '../../public', photo.url);
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
        }
      } catch (err) {
        console.error(`Error deleting encoding ${photo.encodingId}:`, err);
      }
    }
    
    // Remove all photos
    student.photos = [];
    await student.save();
    
    res.json({ message: 'Student face encodings deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 