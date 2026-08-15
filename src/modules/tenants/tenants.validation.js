const { z } = require('zod');

const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
});

const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
  status: z.enum(['active', 'suspended', 'archived']).optional(),
});

const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'driver', 'dispatcher']).default('member'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

module.exports = {
  createTenantSchema,
  updateTenantSchema,
  inviteUserSchema,
};
