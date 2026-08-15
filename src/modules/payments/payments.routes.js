const express = require('express');
const router = express.Router();
const { authenticate, requireTenant } = require('../auth/auth.middleware');
const { prisma } = require('../../utils/prisma');
const { asyncHandler } = require('../../utils/async-handler');

router.use(authenticate);
router.use(requireTenant);

router.get('/', asyncHandler(async (req, res) => {
  const payments = await prisma.payment.findMany({
    where: { tenantId: req.user.activeTenantId },
    include: { booking: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ status: 'success', data: payments });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { bookingId, amount, provider, transactionId } = req.body;
  const payment = await prisma.payment.create({
    data: {
      tenantId: req.user.activeTenantId,
      bookingId,
      amount: parseFloat(amount),
      provider: provider || 'cash',
      transactionId,
      status: 'completed',
    },
  });

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'confirmed' },
  });

  res.status(201).json({ status: 'success', data: payment });
}));

module.exports = router;
