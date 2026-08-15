const express = require('express');
const router = express.Router();
const { authenticate, requireTenant } = require('../auth/auth.middleware');
const { prisma } = require('../../utils/prisma');
const { asyncHandler } = require('../../utils/async-handler');
const { NotFoundError } = require('../../types/errors');

router.use(authenticate);
router.use(requireTenant);

router.get('/', asyncHandler(async (req, res) => {
  const zones = await prisma.zone.findMany({
    where: { tenantId: req.user.activeTenantId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ status: 'success', data: zones });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, geojson } = req.body;
  const zone = await prisma.zone.create({
    data: {
      tenantId: req.user.activeTenantId,
      name,
      geojson: typeof geojson === 'string' ? geojson : JSON.stringify(geojson),
    },
  });
  res.status(201).json({ status: 'success', data: zone });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.zone.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!existing) throw new NotFoundError('Zone not found');

  const data = { ...req.body };
  if (data.geojson && typeof data.geojson !== 'string') {
    data.geojson = JSON.stringify(data.geojson);
  }

  const updated = await prisma.zone.update({
    where: { id: req.params.id },
    data,
  });
  res.json({ status: 'success', data: updated });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.zone.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!existing) throw new NotFoundError('Zone not found');

  await prisma.zone.delete({ where: { id: req.params.id } });
  res.json({ status: 'success', data: { message: 'Zone deleted' } });
}));

module.exports = router;
