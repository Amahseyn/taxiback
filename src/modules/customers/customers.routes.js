const express = require('express');
const router = express.Router();
const { authenticate, requireTenant } = require('../auth/auth.middleware');
const { prisma } = require('../../utils/prisma');
const { asyncHandler } = require('../../utils/async-handler');
const { NotFoundError } = require('../../types/errors');

router.use(authenticate);
router.use(requireTenant);

router.get('/', asyncHandler(async (req, res) => {
  const customers = await prisma.customer.findMany({
    where: { tenantId: req.user.activeTenantId },
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
      phone,
      companyName,
      vatNumber,
      creditLimit: creditLimit ? parseFloat(creditLimit) : 0,
      notes,
    },
  });
  res.status(201).json({ status: 'success', data: customer });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.customer.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!existing) throw new NotFoundError('Customer not found');

  const updated = await prisma.customer.update({
    where: { id: req.params.id },
    data: req.body,
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
