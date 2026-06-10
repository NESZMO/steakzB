import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, authorize('CASHIER', 'BRANCH_MANAGER'));

// ── GET orders awaiting payment ─────────────────────────────────────────────
// Returns SERVED orders that have no payment record yet
router.get('/orders', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        branchId: req.user!.branchId!,
        status: { in: ['SERVED', 'READY'] }, // READY might be more appropriate if SERVED is not used as a terminal prep state
        payment: { is: null },
      },
      include: {
        table: { select: { id: true, tableNumber: true } },
        waiter: { select: { id: true, name: true } },
        orderItems: {
          include: {
            menuItem: { select: { id: true, name: true, price: true, category: true } },
          },
          orderBy: { menuItem: { category: 'asc' } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch pending orders' });
  }
});

// ── POST process a payment ──────────────────────────────────────────────────
router.post('/payment', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId, paymentMethod } = req.body;

    if (!orderId || !paymentMethod) {
      res.status(400).json({ error: 'orderId and paymentMethod are required' });
      return;
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        branchId: req.user!.branchId!,
        payment: { is: null },
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found or already paid' });
      return;
    }

    const receiptNumber = `STKZ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const payment = await prisma.$transaction(async (tx) => {
      // Create the payment record
      const p = await tx.payment.create({
        data: {
          orderId,
          amount: order.totalAmount,
          method: paymentMethod,
          status: 'COMPLETED',
          receiptNumber,
          processedById: req.user!.id,
        },
      });

      // Mark order as PAID
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      });

      // Free the table
      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: 'AVAILABLE' },
        });
      }

      return p;
    });

    res.json({ success: true, payment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

// ── GET all transactions for this branch ────────────────────────────────────
router.get('/transactions', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payments = await prisma.payment.findMany({
      where: {
        order: { branchId: req.user!.branchId! },
        status: 'COMPLETED',
      },
      include: {
        order: {
          include: {
            table:      { select: { tableNumber: true } },
            orderItems: {
              include: { menuItem: { select: { name: true, price: true } } },
            },
          },
        },
        processedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// ── GET daily summary ────────────────────────────────────────────────────────
router.get('/summary', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const payments = await prisma.payment.findMany({
      where: {
        order: { branchId: req.user!.branchId! },
        status: 'COMPLETED',
        createdAt: { gte: startOfDay },
      },
      select: { amount: true, method: true },
    });

    const totalRevenue   = payments.reduce((s, p) => s + Number(p.amount), 0);
    const totalCount     = payments.length;
    const byMethod       = payments.reduce<Record<string, number>>((acc, p) => {
      acc[p.method] = (acc[p.method] ?? 0) + Number(p.amount);
      return acc;
    }, {});

    res.json({ totalRevenue, totalCount, byMethod });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

export default router;