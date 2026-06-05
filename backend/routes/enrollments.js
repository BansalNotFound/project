const express = require('express');
const router = express.Router();
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

router.get('/:userId', authMiddleware, async (req, res, next) => {
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

    const enrollments = await Enrollment.find({ userId: user._id }).select('-embedding');
    res.status(200).json({ success: true, data: enrollments });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
