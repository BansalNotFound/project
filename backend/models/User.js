const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: false,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: false
  },
  enrollmentCount: {
    type: Number,
    default: 1
  },
  lastVerified: {
    type: Date
  },
  lastEnrolled: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    location: String,
    deviceId: String,
    enrollmentImage: String // base64 or URL
  },
  statistics: {
    totalVerifications: {
      type: Number,
      default: 0
    },
    successfulVerifications: {
      type: Number,
      default: 0
    },
    failedVerifications: {
      type: Number,
      default: 0
    },
    successRate: {
      type: Number,
      default: 100.0
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
