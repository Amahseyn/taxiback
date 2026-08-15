const bcrypt = require('bcrypt');
const { prisma } = require('../../utils/prisma');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../../types/errors');
const { createUserSchema, updateUserSchema, updateUserRoleSchema } = require('./users.validation');

class UsersService {
  static async getAll(currentUser) {
    if (currentUser.isPlatformAdmin) {
      return prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
          isPlatformAdmin: true,
          createdAt: true,
          tenants: {
            select: {
              tenantId: true,
              role: true,
              status: true,
              tenant: { select: { id: true, name: true, slug: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!currentUser.activeTenantId) {
      throw new ForbiddenError('Active tenant scope required');
    }

    return prisma.user.findMany({
      where: {
        tenants: {
          some: { tenantId: currentUser.activeTenantId },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        tenants: {
          where: { tenantId: currentUser.activeTenantId },
          select: { role: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getById(id, currentUser) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        isPlatformAdmin: true,
        createdAt: true,
        tenants: {
          select: {
            tenantId: true,
            role: true,
            status: true,
            tenant: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!currentUser.isPlatformAdmin && currentUser.id !== id) {
      const sharesTenant = user.tenants.some(t => t.tenantId === currentUser.activeTenantId);
      if (!sharesTenant) {
        throw new ForbiddenError('Access denied');
      }
    }

    return user;
  }

  static async create(data, currentUser) {
    const validated = createUserSchema.parse(data);

    if (validated.isPlatformAdmin && !currentUser.isPlatformAdmin) {
      throw new ForbiddenError('Only platform admins can grant platform admin role');
    }

    const existing = await prisma.user.findUnique({ where: { email: validated.email } });
    if (existing) {
      throw new BadRequestError('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(validated.password, 12);
    const tenantIdToAssign = validated.tenantId || currentUser.activeTenantId;

    const user = await prisma.user.create({
      data: {
        email: validated.email,
        passwordHash,
        firstName: validated.firstName,
        lastName: validated.lastName,
        phone: validated.phone,
        isPlatformAdmin: validated.isPlatformAdmin || false,
        tenants: tenantIdToAssign
          ? {
              create: {
                tenantId: tenantIdToAssign,
                role: validated.role || 'member',
                status: 'active',
              },
            }
          : undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        isPlatformAdmin: true,
        createdAt: true,
      },
    });

    return user;
  }

  static async update(id, data, currentUser) {
    const validated = updateUserSchema.parse(data);

    if (validated.isPlatformAdmin !== undefined && !currentUser.isPlatformAdmin) {
      throw new ForbiddenError('Only platform admins can update admin status');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!currentUser.isPlatformAdmin && currentUser.id !== id) {
      throw new ForbiddenError('Cannot update another user profile');
    }

    return prisma.user.update({
      where: { id },
      data: validated,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        isPlatformAdmin: true,
        updatedAt: true,
      },
    });
  }

  static async delete(id, currentUser) {
    if (!currentUser.isPlatformAdmin) {
      throw new ForbiddenError('Only platform admins can delete users');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully' };
  }

  static async updateUserRoleInTenant(userId, tenantId, data, currentUser) {
    const validated = updateUserRoleSchema.parse(data);

    if (!currentUser.isPlatformAdmin && currentUser.activeTenantId !== tenantId) {
      throw new ForbiddenError('Access denied');
    }

    const membership = await prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (!membership) {
      throw new NotFoundError('User membership not found in tenant');
    }

    return prisma.userTenant.update({
      where: { userId_tenantId: { userId, tenantId } },
      data: validated,
    });
  }
}

module.exports = { UsersService };
