const rateLimit = require('express-rate-limit');

const verifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Relaxed limit to 100 verification attempts per minute for testing/dev
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many verification attempts. Please wait 1 minute.'
      }
    });
  }
});

const enrollLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 100, // Relaxed limit to 100 enrollment attempts per day for testing/dev
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Enrollment limit exceeded. Maximum 100 enrollments per day.'
      }
    });
  }
});

module.exports = {
  verifyLimiter,
  enrollLimiter
};
