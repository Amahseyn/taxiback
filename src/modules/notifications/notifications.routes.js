const express = require('express');
const router = express.Router();
const { authenticate, requireTenant } = require('../auth/auth.middleware');
const { prisma } = require('../../utils/prisma');
const { asyncHandler } = require('../../utils/async-handler');
const { NotFoundError } = require('../../types/errors');

router.use(authenticate);
router.use(requireTenant);

// Templates
router.get('/templates', asyncHandler(async (req, res) => {
  const templates = await prisma.notificationTemplate.findMany({
    where: { tenantId: req.user.activeTenantId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ status: 'success', data: templates });
}));

router.post('/templates', asyncHandler(async (req, res) => {
  const { name, channel, subject, body } = req.body;
  const template = await prisma.notificationTemplate.create({
    data: {
      tenantId: req.user.activeTenantId,
      name,
      channel: channel || 'email',
      subject: subject || null,
      body,
    },
  });
  res.status(201).json({ status: 'success', data: template });
}));

router.delete('/templates/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.notificationTemplate.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!existing) throw new NotFoundError('Template not found');
  await prisma.notificationTemplate.delete({ where: { id: req.params.id } });
  res.json({ status: 'success', data: { message: 'Template deleted' } });
}));

// Rules
router.get('/rules', asyncHandler(async (req, res) => {
  const rules = await prisma.notificationRule.findMany({
    where: { tenantId: req.user.activeTenantId },
  });
  res.json({ status: 'success', data: rules });
}));

router.post('/rules', asyncHandler(async (req, res) => {
  const { event, channel, enabled } = req.body;
  const rule = await prisma.notificationRule.create({
    data: {
      tenantId: req.user.activeTenantId,
      event,
      channel,
      enabled: enabled !== undefined ? Boolean(enabled) : true,
    },
  });
  res.status(201).json({ status: 'success', data: rule });
}));

router.patch('/rules/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.notificationRule.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!existing) throw new NotFoundError('Rule not found');

  const { enabled, channel, event } = req.body;
  const updated = await prisma.notificationRule.update({
    where: { id: req.params.id },
    data: {
      ...(enabled !== undefined && { enabled: Boolean(enabled) }),
      ...(channel !== undefined && { channel }),
      ...(event !== undefined && { event }),
    },
  });
  res.json({ status: 'success', data: updated });
}));

router.delete('/rules/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.notificationRule.findFirst({
    where: { id: req.params.id, tenantId: req.user.activeTenantId },
  });
  if (!existing) throw new NotFoundError('Rule not found');
  await prisma.notificationRule.delete({ where: { id: req.params.id } });
  res.json({ status: 'success', data: { message: 'Rule deleted' } });
}));

// Logs
router.get('/logs', asyncHandler(async (req, res) => {
  const logs = await prisma.notificationLog.findMany({
    where: { tenantId: req.user.activeTenantId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ status: 'success', data: logs });
}));

module.exports = router;
