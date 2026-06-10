import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ message: 'Email and password required' });
        return;
    }
    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: { branch: true },
        });
        if (!user || !user.isActive) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, branchId: user.branchId }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                branchId: user.branchId,
                branch: user.branch,
            },
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, role: true, branchId: true, branch: true },
        });
        res.json(user);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
export default router;
