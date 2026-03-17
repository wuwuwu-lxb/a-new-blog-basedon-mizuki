/**
 * 认证中间件
 * 验证用户 Token 并附加到请求对象
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getTokenFromRequest, verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    userId: number;
    email: string;
    role: string;
  };
}

/**
 * 可选认证 - 有 token 则验证，没有也允许访问
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  next: () => void
) {
  const token = getTokenFromRequest(req);

  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      // 验证用户是否存在
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, role: true },
      });

      if (user) {
        req.user = {
          userId: user.id,
          email: user.email,
          role: user.role,
        };
      }
    }
  }

  next();
}

/**
 * 必需认证 - 必须有有效 token
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  next: () => void
) {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ error: '未授权，请先登录' });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Token 无效或已过期' });
  }

  // 验证用户是否存在
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    return res.status(401).json({ error: '用户不存在' });
  }

  req.user = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  next();
}

/**
 * 管理员认证
 */
export async function requireAdmin(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  next: () => void
) {
  await requireAuth(req, res, async () => {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: '需要管理员权限' });
    }
    next();
  });
}

/**
 * 认证中间件工厂 - 用于 API routes
 */
export function withAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>,
  options: { required?: boolean; admin?: boolean } = {}
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const authReq = req as AuthenticatedRequest;

    if (options.admin) {
      await requireAdmin(authReq, res, () => handler(authReq, res));
    } else if (options.required) {
      await requireAuth(authReq, res, () => handler(authReq, res));
    } else {
      await optionalAuth(authReq, res, () => handler(authReq, res));
    }
  };
}
