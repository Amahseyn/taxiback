const { UsersService } = require('./users.service');
const { asyncHandler } = require('../../utils/async-handler');

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await UsersService.getAll(req.user);
  res.json({ status: 'success', data: users });
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await UsersService.getById(req.params.id, req.user);
  res.json({ status: 'success', data: user });
});

const createUser = asyncHandler(async (req, res) => {
  const user = await UsersService.create(req.body, req.user);
  res.status(201).json({ status: 'success', data: user });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await UsersService.update(req.params.id, req.body, req.user);
  res.json({ status: 'success', data: user });
});

const deleteUser = asyncHandler(async (req, res) => {
  const result = await UsersService.delete(req.params.id, req.user);
  res.json({ status: 'success', data: result });
});

const updateUserTenantRole = asyncHandler(async (req, res) => {
  const membership = await UsersService.updateUserRoleInTenant(
    req.params.userId,
    req.params.tenantId,
    req.body,
    req.user
  );
  res.json({ status: 'success', data: membership });
});

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserTenantRole,
};
