const jwt = require('jsonwebtoken');
const { prisma } = require('../../utils/prisma');
const { UnauthorizedError, ForbiddenError } = require('../../types/errors');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid token');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        isPlatformAdmin: true,
        isActive: true,
        forcePasswordReset: true,
        tenants: {
          where: { status: 'active' },
          select: { tenantId: true, role: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }

    const activeTenant = user.tenants[0];

    req.user = {
      id: user.id,
      email: user.email,
      isPlatformAdmin: user.isPlatformAdmin,
      activeTenantId: activeTenant?.tenantId,
      role: activeTenant?.role,
    };

    next();
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired token');
  }
};

const requireTenant = (req, res, next) => {
  if (!req.user?.activeTenantId) {
    throw new ForbiddenError('No active tenant selected');
  }
  next();
};

const requirePlatformAdmin = (req, res, next) => {
  if (!req.user?.isPlatformAdmin) {
    throw new ForbiddenError('Platform admin access required');
  }
  next();
};

module.exports = { authenticate, requireTenant, requirePlatformAdmin };
