/**
 * API Route Handler - Auth
 * 处理所有认证相关的 API 请求
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import register from '@/routes/auth/register';
import login from '@/routes/auth/login';
import getCurrentUser from '@/routes/auth/me';
import logout from '@/routes/auth/logout';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function authHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  // 路由分发
  switch (req.query.route?.join('/')) {
    case 'register':
      return register(req, res);
    case 'login':
      return login(req, res);
    case 'me':
      return getCurrentUser(req, res);
    case 'logout':
      return logout(req, res);
    default:
      // 支持直接在 /api/auth 路径下访问
      if (method === 'POST' && !req.query.route) {
        // 判断是登录还是注册（根据请求体字段）
        if (req.body.token) {
          return getCurrentUser(req, res);
        }
        if (req.body.password && req.body.email) {
          // 简单判断：如果有 email 和 password，优先尝试登录
          return login(req, res);
        }
      }
      return res.status(404).json({ error: '未找到该 API 端点' });
  }
}
