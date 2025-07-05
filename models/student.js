const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const studentSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    age: {
      type: Number,
      required: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: true,
    },
    studentCode: {
      type: String,
      unique: true,
      default: function() {
        return Math.floor(1000000 + Math.random() * 9000000).toString();
      }
    },
    rollNumber: {
      type: String,
      required: false,
    },
    enrollmentDate: {
      type: Date,
      default: Date.now,
    },
    grade: {
      type: Number, // 1-12 for grades 1-12
      required: true,
    },
    section: {
      type: String, // A, B, C, etc.
      required: true,
    },
    academicYear: {
      type: String, // e.g., "2023-2024"
      required: true,
    },
    classroom: {
      type: String, // e.g., "Room 101"
      required: false,
    },
    contactPhone: {
      type: String,
      required: false,
    },
    address: {
      type: String,
      required: false,
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
    },
    balance: {
      type: Number,
      default: 0,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Parent',
    },
    profilePicture: {
      type: String,
      required: false,
      default: '',
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: false,
    },
    medicalConditions: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Graduated', 'Transferred', 'Suspended'],
      default: 'Active',
    },
    Grades: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Grade' }],
    messageHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    attendances: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' }],
    expenses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Expense' }],
    // RFID and attendance tracking fields
    rfidCardId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    photos: [{
      url: {
        type: String,
        required: true
      },
      encodingId: {
        type: String,
        required: true
      },
      isPrimary: {
        type: Boolean,
        default: false
      },
      description: {
        type: String,
        default: ''
      },
      confidence: {
        type: Number,
        default: 0
      },
      angle: {
        type: String,
        enum: ['front', 'left', 'right', 'up', 'down', 'other'],
        default: 'front'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    lastAttendance: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Virtual for primary photo URL
studentSchema.virtual('primaryPhotoUrl').get(function() {
  const primaryPhoto = this.photos.find(photo => photo.isPrimary);
  return primaryPhoto ? primaryPhoto.url : (this.photos.length > 0 ? this.photos[0].url : null);
});

// Method to add a new photo
studentSchema.methods.addPhoto = function(photoData) {
  // If this is the first photo, make it primary
  if (this.photos.length === 0) {
    photoData.isPrimary = true;
  }
  
  this.photos.push(photoData);
  return this;
};

// Method to set a photo as primary
studentSchema.methods.setPrimaryPhoto = function(photoId) {
  this.photos.forEach(photo => {
    photo.isPrimary = photo._id.toString() === photoId.toString();
  });
  return this;
};

// Method to remove a photo
studentSchema.methods.removePhoto = function(photoId) {
  const initialLength = this.photos.length;
  const removedPhoto = this.photos.find(photo => photo._id.toString() === photoId.toString());
  const wasPrimary = removedPhoto && removedPhoto.isPrimary;
  
  this.photos = this.photos.filter(photo => photo._id.toString() !== photoId.toString());
  
  // If we removed the primary photo and there are still photos left, set a new primary
  if (wasPrimary && this.photos.length > 0) {
    this.photos[0].isPrimary = true;
  }
  
  return initialLength > this.photos.length;
};

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
