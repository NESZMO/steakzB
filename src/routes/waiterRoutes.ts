import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, authorize('WAITER', 'BRANCH_MANAGER'));

// ── GET all tables for this branch ───────────────────────────────────────────
router.get('/tables', async (req: AuthRequest, res: Response) => {
  if (!req.user?.branchId) {
    return res.status(400).json({
      error: 'No branch assigned to your account. Please sign out, sign back in, or ask your manager to assign you to a branch.',
    });
  }
  try {
    const tables = await prisma.table.findMany({
      where:   { branchId: req.user.branchId },
      include: {
        orders: {
          where:   { status: { notIn: ['PAID', 'CANCELLED'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            orderItems: {
              include: { menuItem: { select: { name: true } } },
            },
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { tableNumber: 'asc' },
    });
    res.json(tables);
  } catch (err) {
    console.error('GET /waiter/tables error:', err);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// ── GET all available menu items ─────────────────────────────────────────────
router.get('/menu', async (_req: AuthRequest, res: Response) => {
  try {
    const items = await prisma.menuItem.findMany({
      where:   { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    res.json(items);
  } catch (err) {
    console.error('GET /waiter/menu error:', err);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// ── POST create a new order ──────────────────────────────────────────────────
router.post('/orders', async (req: AuthRequest, res: Response) => {
  if (!req.user?.branchId) {
    return res.status(400).json({ error: 'No branch assigned to your account' });
  }
  try {
    const { tableId, items, notes } = req.body as {
      tableId: string;
      items:   { menuItemId: string; quantity: number }[];
      notes?:  string;
    };

    if (!tableId || !items?.length) {
      return res.status(400).json({ error: 'tableId and at least one item are required' });
    }

    // Verify table belongs to this branch
    const table = await prisma.table.findFirst({
      where: { id: tableId, branchId: req.user.branchId },
    });
    if (!table) return res.status(404).json({ error: 'Table not found in your branch' });

    // Fetch prices for the requested items
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: items.map(i => i.menuItemId) }, isActive: true },
    });

    if (menuItems.length !== items.length) {
      return res.status(400).json({ error: 'One or more menu items are unavailable' });
    }

    // Calculate total
    const totalAmount = items.reduce((sum, item) => {
      const mi = menuItems.find(m => m.id === item.menuItemId)!;
      return sum + Number(mi.price) * item.quantity;
    }, 0);

    // Create order + set table OCCUPIED atomically
    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          branchId:    req.user!.branchId!,
          tableId,
          userId:      req.user!.id,
          waiterId:    req.user!.id,   // also set waiterId so cashier can see waiter name
          status:      'PENDING',
          totalAmount,
          notes:       notes ?? null,
          orderItems: {
            create: items.map(item => {
              const mi = menuItems.find(m => m.id === item.menuItemId)!;
              return {
                menuItemId: item.menuItemId,
                quantity:   item.quantity,
                unitPrice:  mi.price,
              };
            }),
          },
        },
        include: {
          table:      { select: { tableNumber: true } },
          orderItems: { include: { menuItem: { select: { name: true, price: true } } } },
        },
      });

      await tx.table.update({
        where: { id: tableId },
        data:  { status: 'OCCUPIED' },
      });
      return o;
    });

    res.status(201).json(order);
  } catch (err) {
    console.error('POST /waiter/orders error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// ── GET active orders for this branch ────────────────────────────────────────
router.get('/orders', async (req: AuthRequest, res: Response) => {
  if (!req.user?.branchId) {
    return res.status(400).json({ error: 'No branch assigned to your account' });
  }
  try {
    const orders = await prisma.order.findMany({
      where: {
        branchId: req.user.branchId,
        status:   { notIn: ['PAID', 'CANCELLED'] },
      },
      include: {
        table:      { select: { tableNumber: true } },
        user:       { select: { name: true } },
        orderItems: {
          include: { menuItem: { select: { name: true, price: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (err) {
    console.error('GET /waiter/orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ── PUT mark order as SERVED (food delivered to table) ───────────────────────
router.put('/orders/:id/serve', async (req: AuthRequest, res: Response) => {
  if (!req.user?.branchId) {
    return res.status(400).json({ error: 'No branch assigned to your account' });
  }
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, branchId: req.user.branchId },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'READY') {
      return res.status(400).json({ error: 'Order is not ready yet — the chef has not finished cooking' });
    }
    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data:  { status: 'SERVED' },
    });
    res.json(updated);
  } catch (err) {
    console.error('PUT /waiter/orders/:id/serve error:', err);
    res.status(500).json({ error: 'Failed to mark order as served' });
  }
});

// ── PUT free a table manually ─────────────────────────────────────────────────
router.put('/tables/:id/status', async (req: AuthRequest, res: Response) => {
  if (!req.user?.branchId) {
    return res.status(400).json({ error: 'No branch assigned to your account' });
  }
  try {
    const { status } = req.body;
    const table = await prisma.table.findFirst({
      where: { id: req.params.id, branchId: req.user.branchId },
    });
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const updated = await prisma.table.update({
      where: { id: req.params.id },
      data:  { status },
    });
    res.json(updated);
  } catch (err) {
    console.error('PUT /waiter/tables/:id/status error:', err);
    res.status(500).json({ error: 'Failed to update table status' });
  }
});

export default router;
