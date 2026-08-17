const { prisma } = require('../../utils/prisma');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../../types/errors');
const { createTenantSchema, updateTenantSchema, inviteUserSchema } = require('./tenants.validation');

class TenantsService {
  static async getAll(user) {
    if (user.isPlatformAdmin) {
      return prisma.tenant.findMany({
        include: {
          _count: { select: { users: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return prisma.tenant.findMany({
      where: {
        users: {
          some: { userId: user.id, status: 'active' },
        },
      },
      include: {
        users: {
          where: { userId: user.id },
          select: { role: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getById(id, user) {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
            },
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    if (!user.isPlatformAdmin) {
      const isMember = tenant.users.some(u => u.userId === user.id && u.status === 'active');
      if (!isMember) {
        throw new ForbiddenError('Access denied to this tenant');
      }
    }

    return tenant;
  }

  static async create(data, ownerUserId) {
    const validated = createTenantSchema.parse(data);

    const existingSlug = await prisma.tenant.findUnique({ where: { slug: validated.slug } });
    if (existingSlug) {
      throw new BadRequestError('Tenant slug already taken');
    }

    const tenant = await prisma.tenant.create({
      data: {
        name: validated.name,
        slug: validated.slug,
        users: ownerUserId
          ? {
              create: {
                userId: ownerUserId,
                role: 'owner',
                status: 'active',
              },
            }
          : undefined,
      },
      include: {
        users: true,
      },
    });

    return tenant;
  }

  static async update(id, data, user) {
    const validated = updateTenantSchema.parse(data);

    if (!user.isPlatformAdmin && user.activeTenantId !== id) {
      throw new ForbiddenError('Cannot modify non-active tenant');
    }

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    if (validated.slug && validated.slug !== tenant.slug) {
      const existingSlug = await prisma.tenant.findUnique({ where: { slug: validated.slug } });
      if (existingSlug) {
        throw new BadRequestError('Tenant slug already taken');
      }
    }

    return prisma.tenant.update({
      where: { id },
      data: validated,
    });
  }

  static async delete(id, user) {
    if (!user.isPlatformAdmin) {
      throw new ForbiddenError('Only platform admins can delete tenants');
    }

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    await prisma.tenant.delete({ where: { id } });
    return { message: 'Tenant deleted successfully' };
  }

  static async inviteUser(tenantId, inviteData, _inviterUser) {
    const validated = inviteUserSchema.parse(inviteData);

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    let targetUser = await prisma.user.findUnique({ where: { email: validated.email } });

    if (!targetUser) {
      targetUser = await prisma.user.create({
        data: {
          email: validated.email,
          passwordHash: '',
          firstName: validated.firstName,
          lastName: validated.lastName,
          forcePasswordReset: true,
        },
      });
    }

    const existingMembership = await prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId: targetUser.id, tenantId } },
    });

    if (existingMembership) {
      throw new BadRequestError('User is already a member of this tenant');
    }

    const membership = await prisma.userTenant.create({
      data: {
        userId: targetUser.id,
        tenantId,
        role: validated.role,
        status: 'active',
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    return membership;
  }
}

module.exports = { TenantsService };
