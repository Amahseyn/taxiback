const express = require('express');
const router = express.Router();
const { authenticate, requireTenant } = require('../auth/auth.middleware');
const { prisma } = require('../../utils/prisma');
const { asyncHandler } = require('../../utils/async-handler');
const { NotFoundError } = require('../../types/errors');

router.use(authenticate);
router.use(requireTenant);

router.get('/', asyncHandler(async (req, res) => {
  const drivers = await prisma.driver.findMany({
    where: { tenantId: req.user.activeTenantId },
    include: { credentials: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ status: 'success', data: drivers });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const driver = await prisma.driver.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
    include: { credentials: true, jobs: true },
  });
  if (!driver) throw new NotFoundError('Driver not found');
  res.json({ status: 'success', data: driver });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, licenseNumber, notes } = req.body;
  const driver = await prisma.driver.create({
    data: {
      tenantId: req.user.activeTenantId,
      firstName,
      lastName,
      email,
      phone,
      licenseNumber,
      notes,
    },
  });
  res.status(201).json({ status: 'success', data: driver });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.driver.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!existing) throw new NotFoundError('Driver not found');

  const updated = await prisma.driver.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json({ status: 'success', data: updated });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.driver.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!existing) throw new NotFoundError('Driver not found');

  await prisma.driver.delete({ where: { id: req.params.id } });
  res.json({ status: 'success', data: { message: 'Driver deleted' } });
}));

router.post('/:id/credentials', asyncHandler(async (req, res) => {
  const { type, documentNo, expiresAt, fileUrl } = req.body;
  const credential = await prisma.driverCredential.create({
    data: {
      driverId: req.params.id,
      type,
      documentNo,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      fileUrl,
    },
  });
  res.status(201).json({ status: 'success', data: credential });
}));

module.exports = router;
