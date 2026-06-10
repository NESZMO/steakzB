import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, authorize('BRANCH_MANAGER'));

router.get('/overview', async (req: AuthRequest, res: Response): Promise<void> => {
  const branchId = req.user!.branchId;
  if (!branchId) { res.status(400).json({ message: 'No branch assigned' }); return; }
  try {
    const [branch, ordersStats, staffCount, inventory, recentOrders] = await Promise.all([
      prisma.branch.findUnique({ where: { id: branchId } }),
      prisma.order.aggregate({
        where: { branchId },
        _sum: { totalAmount: true },
        _count: true
      }),
      prisma.user.count({ where: { branchId, isActive: true } }),
      prisma.inventory.findMany({ where: { branchId } }),
      prisma.order.findMany({
        where: { branchId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { table: true, orderItems: true }
      })
    ]);

    const lowStockCount = inventory.filter(i => i.currentStock <= i.minimumStock).length;

    res.json({
      branch,
      totalRevenue: ordersStats._sum.totalAmount || 0,
      totalOrders: ordersStats._count,
      staffCount,
      lowStockCount,
      recentOrders
    });
  } catch (error) {
    console.error('Overview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/orders', async (req: AuthRequest, res: Response): Promise<void> => {
  const branchId = req.user!.branchId;
  try {
    const orders = await prisma.order.findMany({
      where: { branchId: branchId! },
      include: { table: true, waiter: { select: { name: true } }, orderItems: { include: { menuItem: true } }, payment: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(orders);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/staff', async (req: AuthRequest, res: Response): Promise<void> => {
  const branchId = req.user!.branchId;
  try {
    const staff = await prisma.user.findMany({
      where: { branchId: branchId!, isActive: true },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    res.json(staff);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/inventory', async (req: AuthRequest, res: Response): Promise<void> => {
  const branchId = req.user!.branchId;
  try {
    const inventory = await prisma.inventory.findMany({ where: { branchId: branchId! } });
    res.json(inventory);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
