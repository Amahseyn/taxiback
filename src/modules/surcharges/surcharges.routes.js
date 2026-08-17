const express = require('express');
const router = express.Router();
const { authenticate, requireTenant } = require('../auth/auth.middleware');
const { prisma } = require('../../utils/prisma');
const { asyncHandler } = require('../../utils/async-handler');
const { NotFoundError } = require('../../types/errors');

router.use(authenticate);
router.use(requireTenant);

router.get('/', asyncHandler(async (req, res) => {
  const { type, search } = req.query;
  const where = { tenantId: req.user.activeTenantId };

  if (type && type !== 'all') {
    where.type = type;
  }

  if (search && search.trim()) {
    where.name = { contains: search.trim(), mode: 'insensitive' };
  }

  const surcharges = await prisma.surcharge.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ status: 'success', data: surcharges });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const surcharge = await prisma.surcharge.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!surcharge) throw new NotFoundError('Surcharge not found');
  res.json({ status: 'success', data: surcharge });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, type, amount, isPercentage, rulesJson } = req.body;
  const surcharge = await prisma.surcharge.create({
    data: {
      tenantId: req.user.activeTenantId,
      name,
      type,
      amount: parseFloat(amount),
      isPercentage: Boolean(isPercentage),
      rulesJson: typeof rulesJson === 'string' ? rulesJson : JSON.stringify(rulesJson || {}),
    },
  });
  res.status(201).json({ status: 'success', data: surcharge });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.surcharge.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!existing) throw new NotFoundError('Surcharge not found');

  const { name, type, amount, isPercentage, rulesJson } = req.body;
  const updated = await prisma.surcharge.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(amount !== undefined && { amount: parseFloat(amount) }),
      ...(isPercentage !== undefined && { isPercentage: Boolean(isPercentage) }),
      ...(rulesJson !== undefined && {
        rulesJson: typeof rulesJson === 'string' ? rulesJson : JSON.stringify(rulesJson || {}),
      }),
    },
  });
  res.json({ status: 'success', data: updated });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.surcharge.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!existing) throw new NotFoundError('Surcharge not found');

  await prisma.surcharge.delete({ where: { id: req.params.id } });
  res.json({ status: 'success', data: { message: 'Surcharge deleted' } });
}));

module.exports = router;
