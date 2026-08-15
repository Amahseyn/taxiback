const express = require('express');
const AuthController = require('./auth.controller');
const { validate } = require('../../middleware/validate');
const {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} = require('./auth.validation');

const router = express.Router();

router.post('/login', validate(loginSchema), AuthController.login);
router.post('/refresh', validate(refreshTokenSchema), AuthController.refresh);
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/forgot-password', validate(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), AuthController.resetPassword);

module.exports = router;
