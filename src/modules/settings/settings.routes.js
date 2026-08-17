const express = require('express');
const router = express.Router();
const { authenticate, requireTenant } = require('../auth/auth.middleware');
const { prisma } = require('../../utils/prisma');
const { asyncHandler } = require('../../utils/async-handler');

router.use(authenticate);
router.use(requireTenant);

router.get('/', asyncHandler(async (req, res) => {
  const settingsList = await prisma.setting.findMany({
    where: { tenantId: req.user.activeTenantId },
  });
  const settingsObj = {};
  settingsList.forEach(s => {
    settingsObj[s.key] = s.value;
  });
  res.json({ status: 'success', data: settingsObj });
}));

router.post('/', asyncHandler(async (req, res) => {
  const settingsData = req.body;
  const updates = [];

  for (const [key, value] of Object.entries(settingsData)) {
    if (value !== undefined && value !== null) {
      updates.push(
        prisma.setting.upsert({
          where: { tenantId_key: { tenantId: req.user.activeTenantId, key } },
          update: { value: String(value) },
          create: { tenantId: req.user.activeTenantId, key, value: String(value) },
        })
      );
    }
  }

  await Promise.all(updates);
  res.json({ status: 'success', data: { message: 'Settings saved' } });
}));

module.exports = router;
