const mongoose = require('mongoose');

const VerificationLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Optional if verification fails and user is unknown
    index: true
  },
  matchedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  verificationDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  result: {
    type: String,
    enum: ['success', 'liveness_failed', 'no_match', 'low_confidence', 'error'],
    required: true
  },
  scores: {
    livenessScore: Number,
    matchConfidence: Number,
    qualityScore: Number
  },
  thresholds: {
    livenessThreshold: {
      type: Number,
      default: 0.5
    },
    matchThreshold: {
      type: Number,
      default: 0.6
    }
  },
  processingTime: Number, // ms
  security: {
    ipAddress: String,
    deviceInfo: {
      userAgent: String,
      platform: String,
      browserVersion: String
    }
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    index: { expires: 0 } // TTL index
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('VerificationLog', VerificationLogSchema);
