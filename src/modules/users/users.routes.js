const express = require('express');
const router = express.Router();
const { authenticate, requirePlatformAdmin } = require('../auth/auth.middleware');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserTenantRole,
} = require('./users.controller');

router.use(authenticate);

router.get('/', getAllUsers);
router.post('/', createUser);
router.get('/:id', getUserById);
router.patch('/:id', updateUser);
router.delete('/:id', requirePlatformAdmin, deleteUser);
router.patch('/tenants/:tenantId/users/:userId/role', updateUserTenantRole);

module.exports = router;
