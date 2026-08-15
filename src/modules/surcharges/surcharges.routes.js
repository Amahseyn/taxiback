const express = require('express');
const router = express.Router();
const { authenticate, requireTenant } = require('../auth/auth.middleware');
const { prisma } = require('../../utils/prisma');
const { asyncHandler } = require('../../utils/async-handler');
const { NotFoundError } = require('../../types/errors');

router.use(authenticate);
router.use(requireTenant);

router.get('/', asyncHandler(async (req, res) => {
  const surcharges = await prisma.surcharge.findMany({
    where: { tenantId: req.user.activeTenantId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ status: 'success', data: surcharges });
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

router.delete('/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.surcharge.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!existing) throw new NotFoundError('Surcharge not found');

  await prisma.surcharge.delete({ where: { id: req.params.id } });
  res.json({ status: 'success', data: { message: 'Surcharge deleted' } });
}));

module.exports = router;
