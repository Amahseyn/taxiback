const express = require('express');
const router = express.Router();
const { authenticate, requireTenant } = require('../auth/auth.middleware');
const { prisma } = require('../../utils/prisma');
const { asyncHandler } = require('../../utils/async-handler');

router.use(authenticate);
router.use(requireTenant);

router.get('/', asyncHandler(async (req, res) => {
  const files = await prisma.file.findMany({
    where: { tenantId: req.user.activeTenantId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ status: 'success', data: files });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { filename, path, mimeType, size } = req.body;
  const file = await prisma.file.create({
    data: {
      tenantId: req.user.activeTenantId,
      filename: filename || 'uploaded_file',
      path: path || '/uploads/file.png',
      mimeType: mimeType || 'image/png',
      size: size ? parseInt(size) : 1024,
    },
  });
  res.status(201).json({ status: 'success', data: file });
}));

module.exports = router;
