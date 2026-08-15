const { z } = require('zod');

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  isPlatformAdmin: z.boolean().optional(),
  tenantId: z.string().optional(),
  role: z.enum(['admin', 'member', 'driver', 'dispatcher', 'owner']).optional(),
});

const updateUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  isPlatformAdmin: z.boolean().optional(),
});

const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'driver', 'dispatcher', 'owner']),
  status: z.enum(['active', 'suspended', 'inactive']).optional(),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  updateUserRoleSchema,
};
