const { TenantsService } = require('./tenants.service');
const { asyncHandler } = require('../../utils/async-handler');

const getAllTenants = asyncHandler(async (req, res) => {
  const tenants = await TenantsService.getAll(req.user);
  res.json({ status: 'success', data: tenants });
});

const getTenantById = asyncHandler(async (req, res) => {
  const tenant = await TenantsService.getById(req.params.id, req.user);
  res.json({ status: 'success', data: tenant });
});

const createTenant = asyncHandler(async (req, res) => {
  const tenant = await TenantsService.create(req.body, req.user?.id);
  res.status(201).json({ status: 'success', data: tenant });
});

const updateTenant = asyncHandler(async (req, res) => {
  const tenant = await TenantsService.update(req.params.id, req.body, req.user);
  res.json({ status: 'success', data: tenant });
});

const deleteTenant = asyncHandler(async (req, res) => {
  const result = await TenantsService.delete(req.params.id, req.user);
  res.json({ status: 'success', data: result });
});

const inviteUserToTenant = asyncHandler(async (req, res) => {
  const membership = await TenantsService.inviteUser(req.params.id, req.body, req.user);
  res.status(201).json({ status: 'success', data: membership });
});

module.exports = {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
  inviteUserToTenant,
};
