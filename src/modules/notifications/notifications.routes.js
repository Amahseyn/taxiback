const express = require('express');
const router = express.Router();
const { authenticate, requireTenant } = require('../auth/auth.middleware');
const { prisma } = require('../../utils/prisma');
const { asyncHandler } = require('../../utils/async-handler');

router.use(authenticate);
router.use(requireTenant);

router.get('/templates', asyncHandler(async (req, res) => {
  const templates = await prisma.notificationTemplate.findMany({
    where: { tenantId: req.user.activeTenantId },
  });
  res.json({ status: 'success', data: templates });
}));

router.post('/templates', asyncHandler(async (req, res) => {
  const { name, channel, subject, body } = req.body;
  const template = await prisma.notificationTemplate.create({
    data: {
      tenantId: req.user.activeTenantId,
      name,
      channel,
      subject,
      body,
    },
  });
  res.status(201).json({ status: 'success', data: template });
}));

router.get('/logs', asyncHandler(async (req, res) => {
  const logs = await prisma.notificationLog.findMany({
    where: { tenantId: req.user.activeTenantId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ status: 'success', data: logs });
}));

module.exports = router;
