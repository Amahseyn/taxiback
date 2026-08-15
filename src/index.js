require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { errorMiddleware } = require('./middleware/error.middleware');
const { rateLimitMiddleware } = require('./middleware/rate-limit.middleware');
const authRoutes = require('./modules/auth/auth.routes');
const tenantRoutes = require('./modules/tenants/tenants.routes');
const userRoutes = require('./modules/users/users.routes');
const bookingRoutes = require('./modules/bookings/bookings.routes');
const jobRoutes = require('./modules/jobs/jobs.routes');
const customerRoutes = require('./modules/customers/customers.routes');
const driverRoutes = require('./modules/drivers/drivers.routes');
const vehicleRoutes = require('./modules/vehicles/vehicles.routes');
const locationRoutes = require('./modules/locations/locations.routes');
const zoneRoutes = require('./modules/zones/zones.routes');
const pricingRoutes = require('./modules/pricing/pricing.routes');
const surchargeRoutes = require('./modules/surcharges/surcharges.routes');
const paymentRoutes = require('./modules/payments/payments.routes');
const notificationRoutes = require('./modules/notifications/notifications.routes');
const calendarRoutes = require('./modules/calendar/calendar.routes');
const settingsRoutes = require('./modules/settings/settings.routes');
const fileRoutes = require('./modules/files/files.routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(rateLimitMiddleware);

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/surcharges', surchargeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/files', fileRoutes);

app.use(errorMiddleware);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`taxibackend running on port ${PORT}`));
