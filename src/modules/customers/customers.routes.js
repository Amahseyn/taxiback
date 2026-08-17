const express = require('express');
const router = express.Router();
const { authenticate, requireTenant } = require('../auth/auth.middleware');
const { prisma } = require('../../utils/prisma');
const { asyncHandler } = require('../../utils/async-handler');
const { NotFoundError } = require('../../types/errors');

router.use(authenticate);
router.use(requireTenant);

router.get('/', asyncHandler(async (req, res) => {
  const { search } = req.query;
  const where = { tenantId: req.user.activeTenantId };

  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { firstName: { contains: s, mode: 'insensitive' } },
      { lastName: { contains: s, mode: 'insensitive' } },
      { email: { contains: s, mode: 'insensitive' } },
      { phone: { contains: s, mode: 'insensitive' } },
      { companyName: { contains: s, mode: 'insensitive' } },
    ];
  }

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ status: 'success', data: customers });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const customer = await prisma.customer.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
    include: { bookings: true },
  });
  if (!customer) throw new NotFoundError('Customer not found');
  res.json({ status: 'success', data: customer });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, companyName, vatNumber, creditLimit, notes } = req.body;
  const customer = await prisma.customer.create({
    data: {
      tenantId: req.user.activeTenantId,
      firstName,
      lastName,
      email,
      phone: phone || null,
      companyName: companyName || null,
      vatNumber: vatNumber || null,
      creditLimit: creditLimit ? parseFloat(creditLimit) : 0,
      notes: notes || null,
    },
  });
  res.status(201).json({ status: 'success', data: customer });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.customer.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!existing) throw new NotFoundError('Customer not found');

  const { firstName, lastName, email, phone, companyName, vatNumber, creditLimit, notes } = req.body;
  const updated = await prisma.customer.update({
    where: { id: req.params.id },
    data: {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(companyName !== undefined && { companyName }),
      ...(vatNumber !== undefined && { vatNumber }),
      ...(creditLimit !== undefined && { creditLimit: parseFloat(creditLimit) }),
      ...(notes !== undefined && { notes }),
    },
  });
  res.json({ status: 'success', data: updated });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.customer.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!existing) throw new NotFoundError('Customer not found');

  await prisma.customer.delete({ where: { id: req.params.id } });
  res.json({ status: 'success', data: { message: 'Customer deleted' } });
}));

module.exports = router;
