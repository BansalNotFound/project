const express = require('express');
const router = express.Router();
const VerificationLog = require('../models/VerificationLog');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Get user specific verification logs
router.get('/user/:userId', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }
    if (req.user.userId !== user.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied'
        }
      });
    }

    const limit = parseInt(req.query.limit) || 50;
    const logs = await VerificationLog.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (err) {
    next(err);
  }
});

// Admin endpoint to get all verification logs
router.get('/admin/all', authMiddleware, async (req, res, next) => {
  try {
    // For the hackathon, we allow any valid authenticated user to view aggregate admin stats.
    const limit = parseInt(req.query.limit) || 100;
    const logs = await VerificationLog.find()
      .populate('userId', 'name email userId')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
