/**
 * API Route Handler - Comments
 * 处理评论相关的 API 请求
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import getComments from '@/routes/comments/index';
import getComment from '@/routes/comments/[id]';

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
  const { id } = req.query;

  // 如果有 id 参数，路由到具体评论处理（支持 GET, PUT, DELETE 等方法）
  if (id && Array.isArray(id) && id.length === 1) {
    req.query.id = id[0];
    return getComment(req, res);
  }
  if (id && !Array.isArray(id)) {
    req.query.id = id;
    return getComment(req, res);
  }

  // 否则路由到评论列表处理（仅 GET, POST）
  switch (method) {
    case 'GET':
    case 'POST':
      return getComments(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ error: `不允许的请求方法：${method}` });
  }
}
