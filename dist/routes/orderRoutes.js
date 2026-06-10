import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
router.use(authenticate);
router.get('/:id', async (req, res) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: req.params.id },
            include: { table: true, waiter: { select: { name: true } }, orderItems: { include: { menuItem: true } }, payment: true, branch: true },
        });
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }
        res.json(order);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
export default router;
