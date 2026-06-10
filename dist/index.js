import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './middleware/logger.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import hqRoutes from './routes/hqRoutes.js';
import branchManagerRoutes from './routes/branchManagerRoutes.js';
import chefRoutes from './routes/chefRoutes.js';
import cashierRoutes from './routes/cashierRoutes.js';
import waiterRoutes from './routes/waiterRoutes.js';
import menuRoutes from './routes/menuRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import branchRoutes from './routes/branchRoutes.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(logger);
// Public routes
app.use('/api/menu', menuRoutes);
app.use('/api/branches', branchRoutes);
// Auth
app.use('/api/auth', authRoutes);
// Protected routes
app.use('/api/admin', adminRoutes);
app.use('/api/hq', hqRoutes);
app.use('/api/branch-manager', branchManagerRoutes);
app.use('/api/chef', chefRoutes);
app.use('/api/cashier', cashierRoutes);
app.use('/api/waiter', waiterRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.get('/api/health', (_req, res) => {
    res.json({ status: 'OK', service: 'Steakz API', timestamp: new Date().toISOString() });
});
app.listen(PORT, () => {
    console.log(`Steakz API running on http://localhost:${PORT}`);
});
