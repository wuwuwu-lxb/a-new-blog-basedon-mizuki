/**
 * GET /api/categories
 * 获取分类列表
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

async function getCategories(req: NextApiRequest, res: NextApiResponse) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

async function categoriesHandler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  if (method === 'GET') {
    return getCategories(req, res);
  }

  res.setHeader('Allow', ['GET']);
  res.status(405).json({ error: `不允许的请求方法：${method}` });
}

export default categoriesHandler;
