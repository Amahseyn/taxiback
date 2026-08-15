const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { prisma } = require('../../utils/prisma');
const { UnauthorizedError } = require('../../types/errors');
const { loginSchema, registerSchema } = require('./auth.validation');

const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

class AuthService {
  static async login(email, password) {
    const validated = loginSchema.parse({ email, password });
    const user = await prisma.user.findUnique({ where: { email: validated.email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValid = await bcrypt.compare(validated.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const memberships = await prisma.userTenant.findMany({
      where: { userId: user.id, status: 'active' },
      select: { tenantId: true, role: true },
    });

    const activeTenant = memberships[0];

    const payload = { userId: user.id, email: user.email };
    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isPlatformAdmin: user.isPlatformAdmin,
        forcePasswordReset: user.forcePasswordReset,
        activeTenantId: activeTenant?.tenantId,
        role: activeTenant?.role,
        memberships: memberships.map(m => ({ tenantId: m.tenantId, role: m.role })),
      },
    };
  }

  static async refresh(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

      if (!user || !user.isActive) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      const payload = { userId: user.id, email: user.email };
      const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });

      return { accessToken };
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  static async register(data) {
    const validated = registerSchema.parse(data);
    const existing = await prisma.user.findUnique({ where: { email: validated.email } });
    if (existing) {
      throw new UnauthorizedError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(validated.password, 12);

    const user = await prisma.user.create({
      data: {
        email: validated.email,
        passwordHash,
        firstName: validated.firstName,
        lastName: validated.lastName,
      },
    });

    return { id: user.id, email: user.email };
  }

  static async forgotPassword(email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { message: 'If an account exists, a reset email will be sent' };
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: await bcrypt.hash(token, 10),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    return { message: 'Reset email sent', token };
  }

  static async resetPassword(token, newPassword) {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const reset = await prisma.passwordReset.findFirst({
      where: { userId: decoded.userId, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!reset) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: decoded.userId }, data: { passwordHash, forcePasswordReset: false } });
    await prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } });

    return { message: 'Password reset successful' };
  }
}

module.exports = { AuthService };
