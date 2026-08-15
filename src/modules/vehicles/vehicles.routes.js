const express = require('express');
const router = express.Router();
const { authenticate, requireTenant } = require('../auth/auth.middleware');
const { prisma } = require('../../utils/prisma');
const { asyncHandler } = require('../../utils/async-handler');
const { NotFoundError } = require('../../types/errors');

router.use(authenticate);
router.use(requireTenant);

router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await prisma.vehicleCategory.findMany({
    where: { tenantId: req.user.activeTenantId },
    orderBy: { sortOrder: 'asc' },
  });
  res.json({ status: 'success', data: categories });
}));

router.post('/categories', asyncHandler(async (req, res) => {
  const { name, description, capacityPax, capacityLug, basePrice, perKmPrice, perMinPrice, sortOrder } = req.body;
  const category = await prisma.vehicleCategory.create({
    data: {
      tenantId: req.user.activeTenantId,
      name,
      description,
      capacityPax: capacityPax ? parseInt(capacityPax) : 4,
      capacityLug: capacityLug ? parseInt(capacityLug) : 2,
      basePrice: basePrice ? parseFloat(basePrice) : 0,
      perKmPrice: perKmPrice ? parseFloat(perKmPrice) : 0,
      perMinPrice: perMinPrice ? parseFloat(perMinPrice) : 0,
      sortOrder: sortOrder ? parseInt(sortOrder) : 0,
    },
  });
  res.status(201).json({ status: 'success', data: category });
}));

router.patch('/categories/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.vehicleCategory.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!existing) throw new NotFoundError('Category not found');

  const updated = await prisma.vehicleCategory.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json({ status: 'success', data: updated });
}));

router.delete('/categories/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.vehicleCategory.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!existing) throw new NotFoundError('Category not found');

  await prisma.vehicleCategory.delete({ where: { id: req.params.id } });
  res.json({ status: 'success', data: { message: 'Vehicle category deleted' } });
}));

module.exports = router;
