const express = require('express');
const router = express.Router();
const { authenticate, requireTenant } = require('../auth/auth.middleware');
const { prisma } = require('../../utils/prisma');
const { asyncHandler } = require('../../utils/async-handler');

router.get('/feed/:feedKey.ics', asyncHandler(async (req, res) => {
  const feed = await prisma.calendarFeed.findUnique({
    where: { feedKey: req.params.feedKey },
  });
  if (!feed) return res.status(404).send('Feed not found');

  const bookings = await prisma.booking.findMany({
    where: { tenantId: feed.tenantId },
    take: 100,
  });

  let ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//RouteOS//EN'];
  bookings.forEach(b => {
    ics.push('BEGIN:VEVENT');
    ics.push(`UID:${b.id}`);
    ics.push(`SUMMARY:Booking ${b.bookingNumber}`);
    ics.push(`DESCRIPTION:From ${b.pickupAddress} to ${b.dropoffAddress}`);
    ics.push('END:VEVENT');
  });
  ics.push('END:VCALENDAR');

  res.setHeader('Content-Type', 'text/calendar');
  res.send(ics.join('\r\n'));
}));

router.use(authenticate);
router.use(requireTenant);

router.get('/feeds', asyncHandler(async (req, res) => {
  const feeds = await prisma.calendarFeed.findMany({
    where: { tenantId: req.user.activeTenantId },
  });
  res.json({ status: 'success', data: feeds });
}));

router.post('/feeds', asyncHandler(async (req, res) => {
  const { name } = req.body;
  const feedKey = Math.random().toString(36).substring(2, 15);
  const feed = await prisma.calendarFeed.create({
    data: {
      tenantId: req.user.activeTenantId,
      name: name || 'Default Feed',
      feedKey,
    },
  });
  res.status(201).json({ status: 'success', data: feed });
}));

module.exports = router;
