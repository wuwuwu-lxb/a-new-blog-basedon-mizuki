/**
 * POST /api/auth/logout
 * 用户登出（客户端清除 token 即可，此接口用于服务端 session 清理）
 */

import type { NextApiRequest, NextApiResponse } from 'next';

export default function logout(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '不允许的请求方法' });
  }

  // 由于我们使用 JWT，登出主要由客户端完成（清除存储的 token）
  // 如果需要实现 token 黑名单，可以在此处添加 Redis 等缓存存储已登出的 token

  res.json({ message: '登出成功' });
}
