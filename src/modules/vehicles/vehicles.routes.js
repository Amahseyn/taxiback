const express = require('express');
const router = express.Router();
const { authenticate, requireTenant } = require('../auth/auth.middleware');
const { prisma } = require('../../utils/prisma');
const { asyncHandler } = require('../../utils/async-handler');
const { NotFoundError } = require('../../types/errors');

router.use(authenticate);
router.use(requireTenant);

router.get('/categories', asyncHandler(async (req, res) => {
  const { search } = req.query;
  const where = { tenantId: req.user.activeTenantId };
  if (search && search.trim()) {
    where.name = { contains: search.trim(), mode: 'insensitive' };
  }

  const categories = await prisma.vehicleCategory.findMany({
    where,
    orderBy: { sortOrder: 'asc' },
  });
  res.json({ status: 'success', data: categories });
}));

router.get('/categories/:id', asyncHandler(async (req, res) => {
  const category = await prisma.vehicleCategory.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!category) throw new NotFoundError('Category not found');
  res.json({ status: 'success', data: category });
}));

router.post('/categories', asyncHandler(async (req, res) => {
  const { name, description, capacityPax, capacityLug, basePrice, perKmPrice, perMinPrice, sortOrder } = req.body;
  const category = await prisma.vehicleCategory.create({
    data: {
      tenantId: req.user.activeTenantId,
      name,
      description: description || null,
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

  const { name, description, capacityPax, capacityLug, basePrice, perKmPrice, perMinPrice, sortOrder } = req.body;
  const updated = await prisma.vehicleCategory.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(capacityPax !== undefined && { capacityPax: parseInt(capacityPax) }),
      ...(capacityLug !== undefined && { capacityLug: parseInt(capacityLug) }),
      ...(basePrice !== undefined && { basePrice: parseFloat(basePrice) }),
      ...(perKmPrice !== undefined && { perKmPrice: parseFloat(perKmPrice) }),
      ...(perMinPrice !== undefined && { perMinPrice: parseFloat(perMinPrice) }),
      ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder) }),
    },
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
