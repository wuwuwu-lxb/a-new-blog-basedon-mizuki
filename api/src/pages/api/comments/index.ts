/**
 * GET /api/comments
 * 获取评论列表（支持分页、筛选）
 *
 * POST /api/comments
 * 创建新评论
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import getComments from '@/routes/comments/index';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function commentsHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  switch (method) {
    case 'GET':
    case 'POST':
      return getComments(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ error: `不允许的请求方法：${method}` });
  }
}
