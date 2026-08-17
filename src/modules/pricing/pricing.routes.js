const express = require('express');
const router = express.Router();
const { authenticate, requireTenant } = require('../auth/auth.middleware');
const { prisma } = require('../../utils/prisma');
const { asyncHandler } = require('../../utils/async-handler');
router.post('/quote', asyncHandler(async (req, res) => {
  const { distanceKm, durationMin, categoryId } = req.body;
  const tenantId = req.headers['x-tenant-id'] || req.user?.activeTenantId;

  if (!tenantId) {
    return res.status(400).json({ status: 'error', message: 'Tenant context required' });
  }

  const categories = await prisma.vehicleCategory.findMany({
    where: { tenantId, id: categoryId ? categoryId : undefined },
    orderBy: { sortOrder: 'asc' },
  });

  const dist = parseFloat(distanceKm || 10);
  const dur = parseFloat(durationMin || 15);

  const quotes = categories.map(cat => {
    const base = cat.basePrice || 15.0;
    const distanceCost = dist * (cat.perKmPrice || 2.0);
    const durationCost = dur * (cat.perMinPrice || 0.5);
    const totalPrice = Math.round((base + distanceCost + durationCost) * 100) / 100;

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      capacityPax: cat.capacityPax,
      capacityLug: cat.capacityLug,
      basePrice: base,
      distanceCost,
      durationCost,
      totalPrice,
      currency: 'USD',
    };
  });

  res.json({ status: 'success', data: quotes });
}));

router.use(authenticate);
router.use(requireTenant);

router.get('/routes', asyncHandler(async (req, res) => {
  const routePrices = await prisma.routePrice.findMany({
    where: { tenantId: req.user.activeTenantId },
  });
  res.json({ status: 'success', data: routePrices });
}));

router.post('/routes', asyncHandler(async (req, res) => {
  const { fromLocationId, toLocationId, categoryId, price } = req.body;
  const routePrice = await prisma.routePrice.create({
    data: {
      tenantId: req.user.activeTenantId,
      fromLocationId,
      toLocationId,
      categoryId,
      price: parseFloat(price),
    },
  });
  res.status(201).json({ status: 'success', data: routePrice });
}));

module.exports = router;
