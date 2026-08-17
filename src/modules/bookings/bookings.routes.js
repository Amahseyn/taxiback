const express = require('express');
const router = express.Router();
const { authenticate, requireTenant } = require('../auth/auth.middleware');
const { prisma } = require('../../utils/prisma');
const { asyncHandler } = require('../../utils/async-handler');
const { NotFoundError } = require('../../types/errors');

router.use(authenticate);
router.use(requireTenant);

router.get('/dashboard-summary', asyncHandler(async (req, res) => {
  const tenantId = req.user.activeTenantId;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const next24End = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Today's jobs count
  const todayBookings = await prisma.booking.findMany({
    where: {
      tenantId,
      pickupDateTime: { gte: todayStart, lt: tomorrowStart },
    },
    include: { jobs: true },
  });

  const todayJobsCount = todayBookings.length;
  const todayScheduled = todayBookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length;
  const todayCompleted = todayBookings.filter(b => b.status === 'completed').length;
  const todayCancelled = todayBookings.filter(b => b.status === 'cancelled').length;

  // Revenue Today & Month
  const todayPaidBookings = await prisma.booking.findMany({
    where: {
      tenantId,
      createdAt: { gte: todayStart, lt: tomorrowStart },
    },
  });
  const revenueToday = todayPaidBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  const monthBookings = await prisma.booking.findMany({
    where: {
      tenantId,
      createdAt: { gte: monthStart },
    },
  });
  const revenueMonth = monthBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  // Attention Counts & Items
  const unassignedJobsCount = await prisma.job.count({
    where: {
      booking: { tenantId },
      status: 'unassigned',
      scheduledAt: { gte: now, lt: next24End },
    },
  });

  const activeDriversCount = await prisma.driver.count({
    where: { tenantId, status: 'active' },
  });

  const activeVehiclesCount = await prisma.vehicleCategory.count({
    where: { tenantId },
  });

  const attentionItems = [];
  if (unassignedJobsCount > 0) {
    attentionItems.push({
      level: 'Urgent',
      title: `${unassignedJobsCount} ${unassignedJobsCount === 1 ? 'job' : 'jobs'} in the next 24 hours are unassigned`,
      sub: 'Assign a driver before the upcoming pickups.',
      href: '/admin/bookings?page=unassigned',
    });
  }

  if (activeDriversCount === 0) {
    attentionItems.push({
      level: 'Urgent',
      title: 'No active drivers are available for upcoming jobs',
      sub: 'Add or activate drivers before dispatch starts.',
      href: '/admin/drivers',
    });
  }

  // Fetch job lists for tabs: today, next24, latest
  const formatJobItem = (b) => {
    const timeStr = new Date(b.pickupDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const driverName = b.jobs?.[0]?.driver ? `${b.jobs[0].driver.firstName} ${b.jobs[0].driver.lastName}` : 'Unassigned';
    const custName = b.customer ? `${b.customer.firstName} ${b.customer.lastName}` : 'Guest';
    let statusClass = 'badge-info';
    let statusLabel = b.status.charAt(0).toUpperCase() + b.status.slice(1);
    if (!b.jobs?.[0]?.driver && b.status !== 'completed' && b.status !== 'cancelled') {
      statusLabel = 'Unassigned';
      statusClass = 'badge-warn';
    } else if (b.status === 'completed') {
      statusClass = 'badge-success';
    } else if (b.status === 'cancelled') {
      statusClass = 'badge-urgent';
    }

    return {
      booking_id: b.id,
      booking_number: b.bookingNumber,
      time: timeStr,
      title: `${b.pickupAddress || 'Unknown pickup'} -> ${b.dropoffAddress || 'Unknown dropoff'}`,
      sub: `Customer: ${custName} | Driver: ${driverName}`,
      status: statusLabel,
      status_class: statusClass,
      href: `/admin/bookings/${b.id}`,
    };
  };

  const next24Bookings = await prisma.booking.findMany({
    where: { tenantId, pickupDateTime: { gte: now, lt: next24End } },
    include: { customer: true, jobs: { include: { driver: true } } },
    orderBy: { pickupDateTime: 'asc' },
    take: 6,
  });

  const latestBookings = await prisma.booking.findMany({
    where: { tenantId },
    include: { customer: true, jobs: { include: { driver: true } } },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });

  res.json({
    status: 'success',
    data: {
      kpis: [
        { label: "Today's Jobs", value: todayJobsCount, sub: `${todayScheduled} scheduled | ${todayCompleted} completed | ${todayCancelled} cancelled` },
        { label: 'Revenue Today', value: `$${revenueToday.toFixed(2)}`, sub: `${todayPaidBookings.length} bookings` },
        { label: 'Revenue This Month', value: `$${revenueMonth.toFixed(2)}`, sub: 'Month to date' },
        { label: 'Needs Attention', value: attentionItems.length, sub: `${unassignedJobsCount} unassigned` },
        { label: 'Active Vehicle Types', value: activeVehiclesCount, sub: `${activeVehiclesCount} available` },
        { label: 'Active Drivers', value: activeDriversCount, sub: `${activeDriversCount} active in dispatch` },
      ],
      attentionItems,
      bookingViews: {
        today: todayBookings.map(formatJobItem),
        next24: next24Bookings.map(formatJobItem),
        latest: latestBookings.map(formatJobItem),
      },
    },
  });
}));

// GET /bookings — with filtering, search, pagination (matching PHP bookings.php)
router.get('/', asyncHandler(async (req, res) => {
  const tenantId = req.user.activeTenantId;
  const { page, search, limit: limitParam, offset: offsetParam } = req.query;
  const now = new Date();
  const next24End = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const limit = parseInt(limitParam) || 25;
  const offset = parseInt(offsetParam) || 0;

  // Build where clause based on page filter
  const where = { tenantId };

  if (page === 'next24') {
    where.pickupDateTime = { gte: now, lt: next24End };
    where.status = { not: 'cancelled' };
  } else if (page === 'latest') {
    // No extra filter, just sorted by createdAt desc
  } else if (page === 'completed') {
    where.status = 'completed';
  } else if (page === 'cancelled') {
    where.status = 'cancelled';
  } else if (page === 'trash') {
    where.status = 'trashed';
  } else if (page === 'pending') {
    where.status = 'pending';
  } else if (page === 'confirmed') {
    where.status = 'confirmed';
  }

  // Search filter
  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { bookingNumber: { contains: s, mode: 'insensitive' } },
      { pickupAddress: { contains: s, mode: 'insensitive' } },
      { dropoffAddress: { contains: s, mode: 'insensitive' } },
      { customer: { firstName: { contains: s, mode: 'insensitive' } } },
      { customer: { lastName: { contains: s, mode: 'insensitive' } } },
    ];
  }

  const orderBy = page === 'next24'
    ? { pickupDateTime: 'asc' }
    : { createdAt: 'desc' };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: { customer: true, stops: true, lineItems: true, jobs: { include: { driver: true } } },
      orderBy,
      take: limit,
      skip: offset,
    }),
    prisma.booking.count({ where }),
  ]);

  res.json({ status: 'success', data: bookings, meta: { total, limit, offset } });
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
  const { customerId, pickupAddress, dropoffAddress, pickupDateTime, passengerCount, luggageCount, totalPrice, stops, lineItems, notes } = req.body;

  const count = await prisma.booking.count({ where: { tenantId: req.user.activeTenantId } });
  const bookingNumber = `BK-${1000 + count + 1}`;

  const booking = await prisma.booking.create({
    data: {
      tenantId: req.user.activeTenantId,
      bookingNumber,
      customerId: customerId || null,
      pickupAddress,
      dropoffAddress,
      pickupDateTime: new Date(pickupDateTime || Date.now()),
      passengerCount: passengerCount ? parseInt(passengerCount) : 1,
      luggageCount: luggageCount ? parseInt(luggageCount) : 0,
      totalPrice: totalPrice ? parseFloat(totalPrice) : 0.0,
      notes: notes || null,
      stops: stops ? { create: stops } : undefined,
      lineItems: lineItems ? { create: lineItems } : undefined,
    },
    include: { customer: true, stops: true, lineItems: true },
  });

  res.status(201).json({ status: 'success', data: booking });
}));

// PATCH /:id/status — Status transition (matching PHP row ops)
router.patch('/:id/status', asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'trashed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ status: 'error', message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const existing = await prisma.booking.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!existing) throw new NotFoundError('Booking not found');

  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: { status },
    include: { customer: true, stops: true, lineItems: true },
  });
  res.json({ status: 'success', data: updated });
}));

// POST /bulk — Bulk operations (matching PHP bulk ops)
router.post('/bulk', asyncHandler(async (req, res) => {
  const { op, ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ status: 'error', message: 'No booking IDs provided' });
  }

  const validOps = ['complete', 'cancel', 'trash', 'restore', 'delete'];
  if (!validOps.includes(op)) {
    return res.status(400).json({ status: 'error', message: `Invalid operation. Must be one of: ${validOps.join(', ')}` });
  }

  const where = { id: { in: ids }, tenantId: req.user.activeTenantId };

  if (op === 'delete') {
    await prisma.booking.deleteMany({ where });
  } else {
    const statusMap = { complete: 'completed', cancel: 'cancelled', trash: 'trashed', restore: 'pending' };
    await prisma.booking.updateMany({ where, data: { status: statusMap[op] } });
  }

  res.json({ status: 'success', data: { message: `Bulk ${op} completed for ${ids.length} bookings` } });
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
