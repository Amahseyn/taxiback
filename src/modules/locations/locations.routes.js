const express = require('express');
const router = express.Router();
const { authenticate, requireTenant } = require('../auth/auth.middleware');
const { prisma } = require('../../utils/prisma');
const { asyncHandler } = require('../../utils/async-handler');
const { NotFoundError } = require('../../types/errors');

router.use(authenticate);
router.use(requireTenant);

router.get('/', asyncHandler(async (req, res) => {
  const { search, type } = req.query;
  const where = { tenantId: req.user.activeTenantId };

  if (type && type !== 'all') {
    where.type = type;
  }

  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { address: { contains: s, mode: 'insensitive' } },
    ];
  }

  const locations = await prisma.location.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ status: 'success', data: locations });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const location = await prisma.location.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!location) throw new NotFoundError('Location not found');
  res.json({ status: 'success', data: location });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, type, address, lat, lng, placeId } = req.body;
  const location = await prisma.location.create({
    data: {
      tenantId: req.user.activeTenantId,
      name,
      type: type || 'address',
      address,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      placeId: placeId || null,
    },
  });
  res.status(201).json({ status: 'success', data: location });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.location.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!existing) throw new NotFoundError('Location not found');

  const { name, type, address, lat, lng, placeId } = req.body;
  const updated = await prisma.location.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(address !== undefined && { address }),
      ...(lat !== undefined && { lat: lat ? parseFloat(lat) : null }),
      ...(lng !== undefined && { lng: lng ? parseFloat(lng) : null }),
      ...(placeId !== undefined && { placeId }),
    },
  });
  res.json({ status: 'success', data: updated });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.location.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!existing) throw new NotFoundError('Location not found');

  await prisma.location.delete({ where: { id: req.params.id } });
  res.json({ status: 'success', data: { message: 'Location deleted' } });
}));

module.exports = router;
