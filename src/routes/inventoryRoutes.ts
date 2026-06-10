import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, authorize('BRANCH_MANAGER', 'HQ_MANAGER', 'ADMIN'));

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const branchId = req.user!.role === 'HQ_MANAGER' ? undefined : req.user!.branchId;
  try {
    const inventory = await prisma.inventory.findMany({
      where: branchId ? { branchId } : {},
      include: { branch: { select: { name: true, city: true } } },
    });
    res.json(inventory);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentStock, minimumStock } = req.body;
  try {
    const item = await prisma.inventory.update({
      where: { id: req.params.id },
      data: { currentStock, minimumStock },
    });
    res.json(item);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;