const express = require('express');
const router = express.Router();
const { authenticate, requireTenant } = require('../auth/auth.middleware');
const { prisma } = require('../../utils/prisma');
const { asyncHandler } = require('../../utils/async-handler');
const { NotFoundError } = require('../../types/errors');

router.use(authenticate);
router.use(requireTenant);

router.get('/', asyncHandler(async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: { tenantId: req.user.activeTenantId },
    include: { customer: true, stops: true, lineItems: true, jobs: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ status: 'success', data: bookings });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
    include: { customer: true, stops: true, lineItems: true, jobs: { include: { driver: true } }, payments: true },
  });
  if (!booking) throw new NotFoundError('Booking not found');
  res.json({ status: 'success', data: booking });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { customerId, pickupAddress, dropoffAddress, pickupDateTime, passengerCount, luggageCount, totalPrice, stops, lineItems } = req.body;

  const count = await prisma.booking.count({ where: { tenantId: req.user.activeTenantId } });
  const bookingNumber = `BK-${1000 + count + 1}`;

  const booking = await prisma.booking.create({
    data: {
      tenantId: req.user.activeTenantId,
      bookingNumber,
      customerId,
      pickupAddress,
      dropoffAddress,
      pickupDateTime: new Date(pickupDateTime || Date.now()),
      passengerCount: passengerCount ? parseInt(passengerCount) : 1,
      luggageCount: luggageCount ? parseInt(luggageCount) : 0,
      totalPrice: totalPrice ? parseFloat(totalPrice) : 0.0,
      stops: stops ? { create: stops } : undefined,
      lineItems: lineItems ? { create: lineItems } : undefined,
    },
    include: { customer: true, stops: true, lineItems: true },
  });

  res.status(201).json({ status: 'success', data: booking });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.booking.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!existing) throw new NotFoundError('Booking not found');

  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: req.body,
    include: { customer: true, stops: true, lineItems: true },
  });
  res.json({ status: 'success', data: updated });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.booking.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!existing) throw new NotFoundError('Booking not found');

  await prisma.booking.delete({ where: { id: req.params.id } });
  res.json({ status: 'success', data: { message: 'Booking deleted' } });
}));

module.exports = router;
