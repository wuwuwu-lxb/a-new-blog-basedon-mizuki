/**
 * JWT 认证工具函数
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mizuki-jwt-secret-key-dev-abc123';

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  name: string;
}

/**
 * 验证 JWT token
 * @param token JWT token
 * @returns 解析后的 payload，无效则返回 null
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
}

/**
 * 从请求头提取 Token
 * @param request Request 对象
 * @returns Token 字符串或 null
 */
export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 尝试从 Cookie 获取
  const cookie = request.headers.get('Cookie');
  if (cookie) {
    const match = cookie.match(/admin_token=([^;]+)/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * 检查用户是否为管理员
 * @param payload JWT payload
 * @returns 是否为管理员
 */
export function isAdmin(payload: JwtPayload | null): boolean {
  return payload?.role === 'ADMIN';
}
