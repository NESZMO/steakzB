import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
const router = Router();
router.use(authenticate, authorize('HQ_MANAGER'));
router.get('/overview', async (_req, res) => {
    try {
        const [totalBranches, totalUsers, totalRevenue, ordersToday] = await Promise.all([
            prisma.branch.count({ where: { isActive: true } }),
            prisma.user.count({ where: { isActive: true } }),
            prisma.order.aggregate({
                where: { status: 'PAID' },
                _sum: { totalAmount: true }
            }),
            prisma.order.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            })
        ]);
        res.json({
            totalBranches,
            totalUsers,
            totalRevenue: totalRevenue._sum.totalAmount || 0,
            ordersToday
        });
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/branch-performance', async (_req, res) => {
    try {
        const branches = await prisma.branch.findMany({
            include: {
                orders: { select: { totalAmount: true, status: true } },
                _count: { select: { users: true } }
            }
        });
        const performance = branches.map(b => ({
            id: b.id,
            name: b.name,
            city: b.city,
            isActive: b.isActive,
            stats: {
                revenue: b.orders.filter(o => o.status === 'PAID').reduce((sum, o) => sum + Number(o.totalAmount), 0),
                totalOrders: b.orders.length,
                staffCount: b._count.users
            }
        }));
        res.json(performance);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/branches/:id/performance', async (req, res) => {
    const { id } = req.params;
    try {
        const [branch, orders, staff, topSelling] = await Promise.all([
            prisma.branch.findUnique({ where: { id } }),
            prisma.order.findMany({
                where: { branchId: id },
                select: { status: true, totalAmount: true, createdAt: true }
            }),
            prisma.user.findMany({
                where: { branchId: id },
                select: { id: true, name: true, role: true, email: true }
            }),
            prisma.orderItem.groupBy({
                by: ['menuItemId'],
                where: { order: { branchId: id, status: 'PAID' } },
                _count: { _all: true },
                orderBy: { _count: { menuItemId: 'desc' } },
                take: 5
            })
        ]);
        if (!branch) {
            res.status(404).json({ message: 'Branch not found' });
            return;
        }
        const menuItems = await prisma.menuItem.findMany({
            where: { id: { in: topSelling.map(ts => ts.menuItemId) } }
        });
        const paid = orders.filter(o => o.status === 'PAID');
        const revenue = paid.reduce((sum, o) => sum + Number(o.totalAmount), 0);
        const last7 = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const ds = d.toISOString().split('T')[0];
            const rev = paid
                .filter(o => new Date(o.createdAt).toISOString().split('T')[0] === ds)
                .reduce((sum, o) => sum + Number(o.totalAmount), 0);
            return { date: ds, revenue: rev };
        });
        const statusCounts = await prisma.order.groupBy({
            by: ['status'],
            where: { branchId: id },
            _count: { _all: true }
        });
        res.json({
            branch,
            stats: {
                totalOrders: orders.length,
                revenue,
                averageOrderValue: paid.length > 0 ? revenue / paid.length : 0,
                completedOrders: paid.length
            },
            revenueByDay: last7,
            ordersByStatus: statusCounts,
            topSelling: topSelling.map(ts => ({
                name: menuItems.find(m => m.id === ts.menuItemId)?.name || 'Unknown',
                count: ts._count._all
            })),
            staff
        });
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/inventory', async (_req, res) => {
    try {
        const inventory = await prisma.inventory.findMany({
            include: { branch: { select: { name: true, city: true } } },
            orderBy: [{ branchId: 'asc' }, { itemName: 'asc' }]
        });
        const formatted = inventory.map(i => ({
            id: i.id,
            itemName: i.itemName,
            quantity: i.currentStock,
            unit: i.unit,
            minStock: i.minimumStock,
            branch: i.branch
        }));
        res.json(formatted);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/staff/elevated', async (_req, res) => {
    try {
        const staff = await prisma.user.findMany({
            where: { role: { in: ['ADMIN', 'BRANCH_MANAGER'] } },
            select: { id: true, name: true, email: true, role: true, branch: { select: { name: true } } }
        });
        res.json(staff);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/reports/sales-data', async (req, res) => {
    const { branchId, from, to } = req.query;
    const where = { status: 'PAID' };
    if (branchId)
        where.branchId = branchId;
    if (from || to) {
        where.createdAt = {};
        if (from)
            where.createdAt.gte = new Date(from);
        if (to)
            where.createdAt.lte = new Date(to);
    }
    try {
        const orders = await prisma.order.findMany({
            where,
            include: { branch: { select: { name: true, city: true } } },
            orderBy: { createdAt: 'asc' }
        });
        const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
        const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
        // Group by day for chart
        const dailyMap = {};
        orders.forEach(o => {
            const d = o.createdAt.toISOString().split('T')[0];
            dailyMap[d] = (dailyMap[d] || 0) + Number(o.totalAmount);
        });
        const dailyChart = Object.entries(dailyMap).map(([date, revenue]) => ({ date, revenue }));
        // Group by branch
        const branchMap = {};
        orders.forEach(o => {
            const bid = o.branchId;
            if (!branchMap[bid]) {
                branchMap[bid] = { branchId: bid, branchName: o.branch.name, city: o.branch.city, totalOrders: 0, revenue: 0 };
            }
            branchMap[bid].totalOrders++;
            branchMap[bid].revenue += Number(o.totalAmount);
        });
        const byBranch = Object.values(branchMap).map(b => ({ ...b, avgValue: b.revenue / b.totalOrders }));
        res.json({
            summary: { totalRevenue, totalOrders: orders.length, avgOrderValue },
            dailyChart,
            byBranch
        });
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
router.post('/branches', async (req, res) => {
    try {
        const branch = await prisma.branch.create({ data: req.body });
        res.status(201).json(branch);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
router.delete('/branches/:id', async (req, res) => {
    try {
        await prisma.user.updateMany({ where: { branchId: req.params.id }, data: { branchId: null } });
        await prisma.branch.delete({ where: { id: req.params.id } });
        res.json({ message: 'Branch deleted' });
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
router.post('/staff', async (req, res) => {
    const { name, email, password, role, branchId } = req.body;
    try {
        const hashed = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { name, email, password: hashed, role, branchId: branchId || null }
        });
        res.status(201).json(user);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
router.delete('/staff/:id', async (req, res) => {
    try {
        await prisma.user.delete({ where: { id: req.params.id } });
        res.json({ message: 'Staff deleted' });
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
export default router;
