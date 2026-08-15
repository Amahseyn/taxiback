const express = require('express');
const router = express.Router();
const { authenticate, requireTenant } = require('../auth/auth.middleware');
const { prisma } = require('../../utils/prisma');
const { asyncHandler } = require('../../utils/async-handler');
const { NotFoundError } = require('../../types/errors');

router.use(authenticate);
router.use(requireTenant);

router.get('/', asyncHandler(async (req, res) => {
  const locations = await prisma.location.findMany({
    where: { tenantId: req.user.activeTenantId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ status: 'success', data: locations });
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
      placeId,
    },
  });
  res.status(201).json({ status: 'success', data: location });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.location.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!existing) throw new NotFoundError('Location not found');

  const updated = await prisma.location.update({
    where: { id: req.params.id },
    data: req.body,
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
