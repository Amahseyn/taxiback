const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@admin.com';
  const rawPassword = 'adminpass';
  const passwordHash = await bcrypt.hash(rawPassword, 12);

  console.log('Seeding database...');

  // 1. Create or get default Tenant
  let tenant = await prisma.tenant.findFirst({
    where: { slug: 'default-tenant' },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Default Dispatch Company',
        slug: 'default-tenant',
        status: 'active',
      },
    });
    console.log(`Created default tenant: ${tenant.name} (${tenant.id})`);
  }

  // 2. Upsert admin user
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      isPlatformAdmin: true,
      isActive: true,
      firstName: 'System',
      lastName: 'Admin',
    },
    create: {
      email,
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      isPlatformAdmin: true,
      isActive: true,
    },
  });

  console.log(`Upserted user: ${user.email} (${user.id})`);

  // 3. Ensure user-tenant link exists
  await prisma.userTenant.upsert({
    where: {
      userId_tenantId: {
        userId: user.id,
        tenantId: tenant.id,
      },
    },
    update: {
      role: 'TENANT_ADMIN',
      status: 'active',
    },
    create: {
      userId: user.id,
      tenantId: tenant.id,
      role: 'TENANT_ADMIN',
      status: 'active',
    },
  });

  console.log(`Assigned role TENANT_ADMIN to ${user.email} for tenant ${tenant.name}`);
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
