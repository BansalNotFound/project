const mongoose = require('mongoose');

const EnrollmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  embedding: {
    type: [Number],
    required: true,
    validate: {
      validator: function(v) {
        return v.length === 128;
      },
      message: props => `Embedding must be exactly 128 dimensions! Got ${props.value.length}`
    }
  },
  imageUrl: {
    type: String,
    required: true
  },
  quality: {
    livenessScore: {
      type: Number,
      default: 1.0
    },
    faceQuality: {
      type: Number,
      default: 1.0
    },
    lightingQuality: {
      type: Number,
      default: 1.0
    }
  },
  metadata: {
    imageSize: Number,
    processingTime: Number // ms
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Enrollment', EnrollmentSchema);
