import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
const router = Router();
router.use(authenticate, authorize('WAITER'));
router.get('/tables', async (req, res) => {
    const branchId = req.user.branchId;
    try {
        const tables = await prisma.table.findMany({
            where: { branchId: branchId },
            orderBy: { tableNumber: 'asc' },
        });
        res.json(tables);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/orders', async (req, res) => {
    const branchId = req.user.branchId;
    try {
        const orders = await prisma.order.findMany({
            where: { branchId: branchId, waiterId: req.user.id, status: { notIn: ['PAID', 'CANCELLED'] } },
            include: { table: true, orderItems: { include: { menuItem: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json(orders);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
router.post('/orders', async (req, res) => {
    const { tableId, items, notes } = req.body;
    const branchId = req.user.branchId;
    try {
        const menuItems = await prisma.menuItem.findMany({ where: { id: { in: items.map(i => i.menuItemId) } } });
        const total = items.reduce((sum, item) => {
            const mi = menuItems.find(m => m.id === item.menuItemId);
            return sum + Number(mi?.price || 0) * item.quantity;
        }, 0);
        const order = await prisma.order.create({
            data: {
                branchId: branchId,
                tableId,
                userId: req.user.id,
                waiterId: req.user.id,
                status: 'CONFIRMED',
                totalAmount: total,
                notes,
                orderItems: {
                    create: items.map(item => ({
                        menuItemId: item.menuItemId,
                        quantity: item.quantity,
                        unitPrice: menuItems.find(m => m.id === item.menuItemId)?.price || 0,
                        notes: item.notes,
                    })),
                },
            },
            include: { orderItems: { include: { menuItem: true } }, table: true },
        });
        if (tableId)
            await prisma.table.update({ where: { id: tableId }, data: { status: 'OCCUPIED' } });
        res.status(201).json(order);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
router.put('/tables/:id', async (req, res) => {
    const { status } = req.body;
    try {
        const table = await prisma.table.update({ where: { id: req.params.id }, data: { status } });
        res.json(table);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
export default router;
