const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { enrollLimiter, verifyLimiter } = require('../middleware/rateLimiter');

router.post('/enroll', enrollLimiter, authController.enrollUser);
router.post('/verify', verifyLimiter, authController.verifyUser);

router.post('/logout', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Successfully logged out'
  });
});

module.exports = router;
