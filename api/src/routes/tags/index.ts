/**
 * GET /api/tags
 * 获取标签列表
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

async function getTags(req: NextApiRequest, res: NextApiResponse) {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });

    res.json({ tags });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

async function tagsHandler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  if (method === 'GET') {
    return getTags(req, res);
  }

  res.setHeader('Allow', ['GET']);
  res.status(405).json({ error: `不允许的请求方法：${method}` });
}

export default tagsHandler;
