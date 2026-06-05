const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const FaceDB = require('../models/FaceDB');
const VerificationLog = require('../models/VerificationLog');
const { logger } = require('../middleware/requestLogger');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
const LIVENESS_THRESHOLD = parseFloat(process.env.LIVENESS_THRESHOLD) || 0.5;
const MATCH_THRESHOLD = parseFloat(process.env.MATCH_THRESHOLD) || 0.6;
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key';

// Helper for cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Helper to extract device info from User-Agent
function getDeviceInfo(req) {
  const ua = req.get('user-agent') || '';
  return {
    userAgent: ua,
    platform: req.get('sec-ch-ua-platform') || 'Unknown',
    browserVersion: ua.split(' ').pop() || 'Unknown'
  };
}

exports.enrollUser = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { name, email, phone, image, metadata } = req.body;
    
    if (!name || !image) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Name and face image are required'
        }
      });
    }

    // Step 1: Liveness Detection
    let livenessResponse;
    try {
      livenessResponse = await axios.post(`${ML_SERVICE_URL}/ml/liveness`, { image });
    } catch (err) {
      logger.error('Failed to communicate with ML Service for liveness:', err.message);
      return res.status(500).json({
        success: false,
        error: {
          code: 'ML_SERVICE_ERROR',
          message: 'Error communicating with ML liveness service'
        }
      });
    }

    const { is_live, confidence: livenessScore } = livenessResponse.data;
    if (!is_live || livenessScore < LIVENESS_THRESHOLD) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'LIVENESS_FAILED',
          message: 'Face liveness check failed. Spoof detected.',
          details: { livenessScore, threshold: LIVENESS_THRESHOLD }
        }
      });
    }

    // Step 2: Face Embedding Extraction
    let embeddingResponse;
    try {
      embeddingResponse = await axios.post(`${ML_SERVICE_URL}/ml/embedding`, { image });
    } catch (err) {
      logger.error('Failed to communicate with ML Service for embedding:', err.message);
      return res.status(500).json({
        success: false,
        error: {
          code: 'ML_SERVICE_ERROR',
          message: 'Error communicating with ML embedding service'
        }
      });
    }

    const { embedding, quality_score: faceQuality } = embeddingResponse.data;
    if (!embedding || embedding.length !== 128) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'ML_SERVICE_ERROR',
          message: 'ML service failed to generate a valid 128-dimensional face embedding'
        }
      });
    }

    // Step 3: Check if email already enrolled
    if (email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: `User with email ${email} is already enrolled.`
          }
        });
      }
    }

    // Step 4: Create User Document
    const uniqueUserId = crypto.randomBytes(8).toString('hex'); // 16-char hex
    const user = new User({
      userId: uniqueUserId,
      email: email || '',
      name,
      phone: phone || '',
      enrollmentCount: 1,
      isActive: true,
      metadata: {
        location: (metadata && metadata.location) || 'Unknown',
        deviceId: (metadata && metadata.deviceId) || 'Unknown',
        enrollmentImage: image.substring(0, 100) + '...' // truncate for db storage optimization
      }
    });
    await user.save();

    // Step 5: Create Enrollment Document
    const enrollment = new Enrollment({
      userId: user._id,
      embedding,
      imageUrl: image.substring(0, 200) + '...', // truncate or store
      quality: {
        livenessScore,
        faceQuality,
        lightingQuality: faceQuality // fallback
      },
      metadata: {
        imageSize: Buffer.byteLength(image, 'base64'),
        processingTime: Date.now() - startTime
      }
    });
    await enrollment.save();

    // Step 6: Create FaceDB entry
    const faceDbEntry = new FaceDB({
      userId: user._id,
      masterEmbedding: embedding,
      embeddingCount: 1,
      status: 'active'
    });
    await faceDbEntry.save();

    // Step 7: Generate JWT Token
    const token = jwt.sign(
      { userId: user.userId, email: user.email, dbId: user._id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(201).json({
      success: true,
      data: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        token,
        enrollment: {
          id: enrollment._id,
          livenessScore,
          qualityScore: faceQuality
        }
      },
      processingTime: Date.now() - startTime
    });

  } catch (error) {
    next(error);
  }
};

exports.verifyUser = async (req, res, next) => {
  const startTime = Date.now();
  const ipAddress = req.ip || req.connection.remoteAddress;
  const deviceInfo = getDeviceInfo(req);

  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Face image is required for verification'
        }
      });
    }

    // Step 1: Liveness Detection
    let livenessResponse;
    try {
      livenessResponse = await axios.post(`${ML_SERVICE_URL}/ml/liveness`, { image });
    } catch (err) {
      logger.error('Failed to communicate with ML Service for liveness:', err.message);
      return res.status(500).json({
        success: false,
        error: {
          code: 'ML_SERVICE_ERROR',
          message: 'Error communicating with ML liveness service'
        }
      });
    }

    const { is_live, confidence: livenessScore } = livenessResponse.data;
    if (!is_live || livenessScore < LIVENESS_THRESHOLD) {
      // Log liveness failure
      const verificationLog = new VerificationLog({
        result: 'liveness_failed',
        scores: {
          livenessScore,
          matchConfidence: 0,
          qualityScore: 0
        },
        processingTime: Date.now() - startTime,
        security: { ipAddress, deviceInfo }
      });
      await verificationLog.save();

      return res.status(422).json({
        success: false,
        error: {
          code: 'LIVENESS_FAILED',
          message: 'Face liveness check failed. Spoof detected.',
          details: { livenessScore, threshold: LIVENESS_THRESHOLD }
        }
      });
    }

    // Step 2: Face Embedding Extraction
    let embeddingResponse;
    try {
      embeddingResponse = await axios.post(`${ML_SERVICE_URL}/ml/embedding`, { image });
    } catch (err) {
      logger.error('Failed to communicate with ML Service for embedding:', err.message);
      return res.status(500).json({
        success: false,
        error: {
          code: 'ML_SERVICE_ERROR',
          message: 'Error communicating with ML embedding service'
        }
      });
    }

    const { embedding, quality_score: faceQuality } = embeddingResponse.data;
    if (!embedding || embedding.length !== 128) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'ML_SERVICE_ERROR',
          message: 'ML service failed to generate a valid 128-dimensional face embedding'
        }
      });
    }

    // Step 3: Load all active FaceDB entries
    const faceDbEntries = await FaceDB.find({ status: 'active' });
    if (!faceDbEntries || faceDbEntries.length === 0) {
      // Log no match because FaceDB is empty
      const verificationLog = new VerificationLog({
        result: 'no_match',
        scores: {
          livenessScore,
          matchConfidence: 0,
          qualityScore: faceQuality
        },
        processingTime: Date.now() - startTime,
        security: { ipAddress, deviceInfo }
      });
      await verificationLog.save();

      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_MATCH_FOUND',
          message: 'Authentication failed. Face database is empty.'
        }
      });
    }

    // Step 4: Compute Similarities
    let bestMatch = null;
    let maxSimilarity = -1;

    for (const entry of faceDbEntries) {
      const sim = cosineSimilarity(embedding, entry.masterEmbedding);
      if (sim > maxSimilarity) {
        maxSimilarity = sim;
        bestMatch = entry;
      }
    }

    // Step 5: Check MATCH_THRESHOLD
    if (maxSimilarity < MATCH_THRESHOLD) {
      // Log failed match
      const verificationLog = new VerificationLog({
        result: 'low_confidence',
        scores: {
          livenessScore,
          matchConfidence: maxSimilarity,
          qualityScore: faceQuality
        },
        processingTime: Date.now() - startTime,
        security: { ipAddress, deviceInfo }
      });
      await verificationLog.save();

      return res.status(401).json({
        success: false,
        error: {
          code: 'LOW_CONFIDENCE',
          message: 'Authentication failed. Face match confidence below threshold.',
          details: { confidence: maxSimilarity, threshold: MATCH_THRESHOLD }
        }
      });
    }

    // Step 6: Update User statistics
    const matchedUser = await User.findById(bestMatch.userId);
    if (!matchedUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Associated user for face record not found'
        }
      });
    }

    const total = matchedUser.statistics.totalVerifications + 1;
    const success = matchedUser.statistics.successfulVerifications + 1;
    const successRate = (success / total) * 100;

    matchedUser.lastVerified = new Date();
    matchedUser.statistics.totalVerifications = total;
    matchedUser.statistics.successfulVerifications = success;
    matchedUser.statistics.successRate = successRate;
    await matchedUser.save();

    // Step 7: Log successful verification
    const verificationLog = new VerificationLog({
      userId: matchedUser._id,
      matchedUserId: matchedUser._id,
      result: 'success',
      scores: {
        livenessScore,
        matchConfidence: maxSimilarity,
        qualityScore: faceQuality
      },
      processingTime: Date.now() - startTime,
      security: { ipAddress, deviceInfo }
    });
    await verificationLog.save();

    // Step 8: Generate JWT Token
    const token = jwt.sign(
      { userId: matchedUser.userId, email: matchedUser.email, dbId: matchedUser._id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      success: true,
      data: {
        userId: matchedUser.userId,
        email: matchedUser.email,
        name: matchedUser.name,
        token,
        verification: {
          confidence: maxSimilarity,
          livenessScore,
          successRate
        }
      },
      processingTime: Date.now() - startTime
    });

  } catch (error) {
    next(error);
  }
};
