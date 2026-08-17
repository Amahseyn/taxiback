const express = require('express');
const router = express.Router();
const { authenticate, requireTenant } = require('../auth/auth.middleware');
const { prisma } = require('../../utils/prisma');
const { asyncHandler } = require('../../utils/async-handler');
const { NotFoundError } = require('../../types/errors');

router.use(authenticate);
router.use(requireTenant);

router.get('/', asyncHandler(async (req, res) => {
  const { search, status } = req.query;
  const where = { tenantId: req.user.activeTenantId };

  if (status && status !== 'all') {
    where.status = status;
  }

  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { firstName: { contains: s, mode: 'insensitive' } },
      { lastName: { contains: s, mode: 'insensitive' } },
      { email: { contains: s, mode: 'insensitive' } },
      { phone: { contains: s, mode: 'insensitive' } },
      { licenseNumber: { contains: s, mode: 'insensitive' } },
    ];
  }

  const drivers = await prisma.driver.findMany({
    where,
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
  const { firstName, lastName, email, phone, licenseNumber, notes, status } = req.body;
  const driver = await prisma.driver.create({
    data: {
      tenantId: req.user.activeTenantId,
      firstName,
      lastName,
      email,
      phone,
      licenseNumber: licenseNumber || null,
      notes: notes || null,
      status: status || 'active',
    },
  });
  res.status(201).json({ status: 'success', data: driver });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.driver.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!existing) throw new NotFoundError('Driver not found');

  const { firstName, lastName, email, phone, licenseNumber, notes, status } = req.body;
  const updated = await prisma.driver.update({
    where: { id: req.params.id },
    data: {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(licenseNumber !== undefined && { licenseNumber }),
      ...(notes !== undefined && { notes }),
      ...(status !== undefined && { status }),
    },
  });
  res.json({ status: 'success', data: updated });
}));

router.patch('/:id/toggle-active', asyncHandler(async (req, res) => {
  const existing = await prisma.driver.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!existing) throw new NotFoundError('Driver not found');

  const newStatus = existing.status === 'active' ? 'inactive' : 'active';
  const updated = await prisma.driver.update({
    where: { id: req.params.id },
    data: { status: newStatus },
  });
  res.json({ status: 'success', data: updated });
}));

router.post('/bulk', asyncHandler(async (req, res) => {
  const { op, ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ status: 'error', message: 'No driver IDs provided' });
  }

  const where = { id: { in: ids }, tenantId: req.user.activeTenantId };
  if (op === 'delete') {
    await prisma.driver.deleteMany({ where });
  } else if (op === 'activate') {
    await prisma.driver.updateMany({ where, data: { status: 'active' } });
  } else if (op === 'deactivate') {
    await prisma.driver.updateMany({ where, data: { status: 'inactive' } });
  } else {
    return res.status(400).json({ status: 'error', message: 'Invalid operation' });
  }

  res.json({ status: 'success', data: { message: `Bulk ${op} completed for ${ids.length} drivers` } });
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
