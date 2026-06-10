import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, authorize('CHEF'));

router.get('/orders', async (req: AuthRequest, res: Response): Promise<void> => {
  const branchId = req.user!.branchId;
  try {
    const orders = await prisma.order.findMany({
      where: { branchId: branchId!, status: { in: ['PENDING', 'CONFIRMED', 'PREPARING'] } },
      include: { table: true, orderItems: { include: { menuItem: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(orders);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/orders/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.body;
  try {
    const order = await prisma.order.update({ where: { id: req.params.id }, data: { status } });
    res.json(order);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/items/:itemId/ready', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const item = await prisma.orderItem.update({ where: { id: req.params.itemId }, data: { isReady: true } });
    res.json(item);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/menu', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const items = await prisma.menuItem.findMany({ where: { isActive: true } });
    res.json(items);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/menu/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { isAvailable, name, description, price } = req.body;
  try {
    const item = await prisma.menuItem.update({ where: { id: req.params.id }, data: { isActive: isAvailable, name, description, price } });
    res.json(item);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;