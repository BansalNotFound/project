const mongoose = require('mongoose');

const FaceDBSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  masterEmbedding: {
    type: [Number],
    required: true,
    validate: {
      validator: function(v) {
        return v.length === 128;
      },
      message: props => `Master embedding must be exactly 128 dimensions! Got ${props.value.length}`
    }
  },
  embeddingCount: {
    type: Number,
    default: 1
  },
  version: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('FaceDB', FaceDBSchema);
