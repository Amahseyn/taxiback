const { asyncHandler } = require('../../utils/async-handler');
const { AuthService } = require('./auth.service');

class AuthController {
  static async login(req, res) {
    const result = await AuthService.login(req.body.email, req.body.password);
    res.json(result);
  }

  static async refresh(req, res) {
    const result = await AuthService.refresh(req.body.refreshToken);
    res.json(result);
  }

  static async register(req, res) {
    const result = await AuthService.register(req.body);
    res.status(201).json(result);
  }

  static async forgotPassword(req, res) {
    const result = await AuthService.forgotPassword(req.body.email);
    res.json(result);
  }

  static async resetPassword(req, res) {
    const result = await AuthService.resetPassword(req.body.token, req.body.password);
    res.json(result);
  }
}

module.exports = {
  login: asyncHandler(AuthController.login),
  refresh: asyncHandler(AuthController.refresh),
  register: asyncHandler(AuthController.register),
  forgotPassword: asyncHandler(AuthController.forgotPassword),
  resetPassword: asyncHandler(AuthController.resetPassword),
};
