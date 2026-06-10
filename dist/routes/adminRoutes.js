import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
const router = Router();
router.use(authenticate, authorize('ADMIN'));
// ── USERS ─────────────────────────────────────────────────────────────────────
router.get('/users', async (_req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true, name: true, email: true, role: true,
                isActive: true, branchId: true, createdAt: true,
                branch: { select: { id: true, name: true, city: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(users);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
router.post('/users', async (req, res) => {
    const { name, email, password, role, branchId } = req.body;
    if (!name || !email || !password || !role) {
        res.status(400).json({ message: 'Missing required fields' });
        return;
    }
    try {
        const hashed = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { name, email, password: hashed, role, branchId: branchId || null },
            select: { id: true, name: true, email: true, role: true, branchId: true, branch: { select: { name: true, city: true } } },
        });
        res.status(201).json(user);
    }
    catch (err) {
        if (err.code === 'P2002') {
            res.status(409).json({ message: 'Email already exists' });
            return;
        }
        res.status(500).json({ message: 'Server error' });
    }
});
router.put('/users/:id', async (req, res) => {
    const { name, email, role, branchId, isActive } = req.body;
    try {
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { name, email, role, branchId: branchId || null, isActive },
            select: { id: true, name: true, email: true, role: true, isActive: true, branch: { select: { name: true, city: true } } },
        });
        res.json(user);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
// Hard delete — permanently removes from database
router.delete('/users/:id', async (req, res) => {
    try {
        await prisma.user.delete({ where: { id: req.params.id } });
        res.json({ message: 'User permanently deleted' });
    }
    catch (err) {
        if (err.code === 'P2025') {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.status(500).json({ message: 'Server error' });
    }
});
// ── BRANCHES ──────────────────────────────────────────────────────────────────
router.get('/branches', async (_req, res) => {
    try {
        const branches = await prisma.branch.findMany({
            orderBy: { city: 'asc' },
            include: { _count: { select: { users: true, orders: true } } },
        });
        res.json(branches);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
router.post('/branches', async (req, res) => {
    const { name, address, city, postcode, phone, email } = req.body;
    try {
        const branch = await prisma.branch.create({ data: { name, address, city, postcode, phone, email } });
        res.status(201).json(branch);
    }
    catch (err) {
        if (err.code === 'P2002') {
            res.status(409).json({ message: 'Email already in use' });
            return;
        }
        res.status(500).json({ message: 'Server error' });
    }
});
router.put('/branches/:id', async (req, res) => {
    try {
        const branch = await prisma.branch.update({ where: { id: req.params.id }, data: req.body });
        res.json(branch);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
router.delete('/branches/:id', async (req, res) => {
    try {
        await prisma.user.updateMany({ where: { branchId: req.params.id }, data: { branchId: null } });
        await prisma.branch.delete({ where: { id: req.params.id } });
        res.json({ message: 'Branch removed' });
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
// ── PERFORMANCE ───────────────────────────────────────────────────────────────
// All branches overview
router.get('/performance', async (_req, res) => {
    try {
        const branches = await prisma.branch.findMany({
            include: {
                orders: { select: { totalAmount: true, status: true } },
            },
        });
        const data = branches.map(b => ({
            branch: { id: b.id, name: b.name, city: b.city },
            stats: {
                totalOrders: b.orders.length,
                revenue: b.orders.filter(o => o.status === 'PAID').reduce((s, o) => s + Number(o.totalAmount), 0),
            }
        }));
        res.json(data);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
// Single branch performance + users
router.get('/branches/:id/performance', async (req, res) => {
    const { id } = req.params;
    try {
        const [branch, orders, staff] = await Promise.all([
            prisma.branch.findUnique({ where: { id } }),
            prisma.order.findMany({
                where: { branchId: id },
                include: { orderItems: { include: { menuItem: true } } }
            }),
            prisma.user.findMany({
                where: { branchId: id },
                select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
            }),
        ]);
        if (!branch) {
            res.status(404).json({ message: 'Branch not found' });
            return;
        }
        const paid = orders.filter(o => o.status === 'PAID');
        const totalRevenue = paid.reduce((s, o) => s + Number(o.totalAmount), 0);
        // Calculate top selling items
        const itemCounts = {};
        orders.forEach(o => {
            o.orderItems.forEach(i => {
                const name = i.menuItem.name;
                itemCounts[name] = (itemCounts[name] || 0) + i.quantity;
            });
        });
        const topSelling = Object.entries(itemCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        const last7 = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const ds = d.toISOString().split('T')[0];
            const rev = paid
                .filter(o => new Date(o.createdAt).toISOString().split('T')[0] === ds)
                .reduce((s, o) => s + Number(o.totalAmount), 0);
            return { date: ds, revenue: rev };
        });
        res.json({
            branch: { id: branch.id, name: branch.name, city: branch.city },
            staff,
            stats: {
                totalOrders: orders.length,
                revenue: totalRevenue,
                averageOrderValue: paid.length > 0 ? totalRevenue / paid.length : 0,
                completedOrders: paid.length,
                pendingOrders: orders.filter(o => o.status === 'PENDING').length,
            },
            revenueByDay: last7,
            topSelling,
            ordersByStatus: [
                { status: 'PENDING', _count: { _all: orders.filter(o => o.status === 'PENDING').length } },
                { status: 'PREPARING', _count: { _all: orders.filter(o => o.status === 'PREPARING').length } },
                { status: 'PAID', _count: { _all: paid.length } },
                { status: 'CANCELLED', _count: { _all: orders.filter(o => o.status === 'CANCELLED').length } },
            ],
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});
export default router;
