const express = require('express');
const router = express.Router();
const { authenticate, requireTenant } = require('../auth/auth.middleware');
const { prisma } = require('../../utils/prisma');
const { asyncHandler } = require('../../utils/async-handler');
const { NotFoundError } = require('../../types/errors');

router.use(authenticate);
router.use(requireTenant);

router.get('/', asyncHandler(async (req, res) => {
  const jobs = await prisma.job.findMany({
    where: { booking: { tenantId: req.user.activeTenantId } },
    include: { booking: true, driver: true, assignedBy: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ status: 'success', data: jobs });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { bookingId, driverId, scheduledAt } = req.body;
  const job = await prisma.job.create({
    data: {
      bookingId,
      driverId,
      assignedById: req.user.id,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: driverId ? 'assigned' : 'unassigned',
    },
    include: { booking: true, driver: true },
  });
  res.status(201).json({ status: 'success', data: job });
}));

router.patch('/:id/assign', asyncHandler(async (req, res) => {
  const { driverId } = req.body;
  const updated = await prisma.job.update({
    where: { id: req.params.id },
    data: {
      driverId,
      assignedById: req.user.id,
      status: 'assigned',
    },
    include: { booking: true, driver: true },
  });
  res.json({ status: 'success', data: updated });
}));

router.patch('/:id/status', asyncHandler(async (req, res) => {
  const { status } = req.body;
  const data = { status };
  if (status === 'completed') data.completedAt = new Date();

  const updated = await prisma.job.update({
    where: { id: req.params.id },
    data,
    include: { booking: true, driver: true },
  });
  res.json({ status: 'success', data: updated });
}));

module.exports = router;
