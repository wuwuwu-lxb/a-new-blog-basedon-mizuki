/**
 * API Route Handler - Articles
 * 处理文章相关的 API 请求
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import getArticles from '@/routes/articles/index';
import getArticle from '@/routes/articles/[slug]';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function articlesHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  const { slug } = req.query;

  // 如果有 slug 参数（数组），取第一个值路由到具体文章处理
  if (slug && Array.isArray(slug) && slug.length > 0) {
    // 添加 slug 到 query 中供 [slug].ts 使用
    req.query.slug = slug[0];
    return getArticle(req, res);
  }

  // 否则路由到文章列表处理（支持 GET 和 POST）
  switch (method) {
    case 'GET':
    case 'POST':
      return getArticles(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ error: `不允许的请求方法：${method}` });
  }
}
