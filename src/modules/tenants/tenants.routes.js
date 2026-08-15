const express = require('express');
const router = express.Router();
const { authenticate, requirePlatformAdmin } = require('../auth/auth.middleware');
const {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
  inviteUserToTenant,
} = require('./tenants.controller');

router.use(authenticate);

router.get('/', getAllTenants);
router.post('/', createTenant);
router.get('/:id', getTenantById);
router.patch('/:id', updateTenant);
router.delete('/:id', requirePlatformAdmin, deleteTenant);
router.post('/:id/invite', inviteUserToTenant);

module.exports = router;
