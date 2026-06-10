import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
const router = Router();
// GET /api/menu  — all available items
router.get('/', async (_req, res) => {
    try {
        const items = await prisma.menuItem.findMany({
            where: { isActive: true },
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        });
        res.json(items);
    }
    catch (err) {
        console.error('Menu fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch menu' });
    }
});
// GET /api/menu/:category  — filter by category
router.get('/:category', async (req, res) => {
    try {
        const category = req.params.category.toUpperCase();
        const items = await prisma.menuItem.findMany({
            where: { isActive: true, category: category },
            orderBy: { name: 'asc' },
        });
        res.json(items);
    }
    catch (err) {
        console.error('Menu category fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch menu category' });
    }
});
export default router;
