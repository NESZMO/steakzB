import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
const router = Router();
router.get('/', async (_req, res) => {
    try {
        const branches = await prisma.branch.findMany({
            where: { isActive: true },
            orderBy: { city: 'asc' },
            select: {
                id: true,
                name: true,
                address: true,
                city: true,
                postcode: true,
                phone: true,
                email: true,
            },
        });
        res.json(branches);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const branch = await prisma.branch.findUnique({
            where: { id: req.params.id },
            select: {
                id: true,
                name: true,
                address: true,
                city: true,
                postcode: true,
                phone: true,
                email: true,
            },
        });
        if (!branch) {
            res.status(404).json({ message: 'Branch not found' });
            return;
        }
        res.json(branch);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
export default router;
