const express = require('express');
const router = express.Router();
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
    // Enforce that user can only access their own data
    if (req.user.userId !== user.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied'
        }
      });
    }
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

router.put('/:userId', authMiddleware, async (req, res, next) => {
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
    
    const { name, phone } = req.body;
    if (name) user.name = name;
    if (phone) user.phone = phone;
    
    await user.save();
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

router.delete('/:userId', authMiddleware, async (req, res, next) => {
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
    
    user.isActive = false; // Soft delete
    await user.save();
    res.status(200).json({ success: true, message: 'User profile deactivated successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
