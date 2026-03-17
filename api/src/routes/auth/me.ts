/**
 * GET /api/auth/me
 * 获取当前登录用户信息
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { AuthenticatedRequest, withAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';

async function getCurrentUser(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '不允许的请求方法' });
  }

  if (!req.user) {
    return res.status(401).json({ error: '未登录' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            articles: true,
            comments: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

export default withAuth(getCurrentUser, { required: true });
