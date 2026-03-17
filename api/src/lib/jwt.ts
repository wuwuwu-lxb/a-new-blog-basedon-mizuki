/**
 * JWT Token 工具函数
 */

import type { NextApiRequest } from 'next';

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  exp: number;
}

/**
 * 生成 JWT Token
 */
export async function generateToken(payload: Omit<JWTPayload, 'exp'>): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 天有效期

  // 使用 base64 编码（生产环境建议使用 jose 或 jsonwebtoken）
  const header = { alg: 'HS256', typ: 'JWT' };
  const secret = process.env.JWT_SECRET || 'fallback-secret';

  const encodeBase64 = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');

  const headerStr = encodeBase64(header);
  const payloadStr = encodeBase64({ ...payload, exp });

  // 签名
  const signature = encodeBase64(`${headerStr}.${payloadStr}.${secret}`);

  return `${headerStr}.${payloadStr}.${signature}`;
}

/**
 * 验证 JWT Token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    // 检查过期时间
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    // 验证签名
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    const headerStr = parts[0];
    const payloadStr = parts[1];
    const expectedSignature = encodeBase64(`${headerStr}.${payloadStr}.${secret}`);

    if (parts[2] !== expectedSignature) {
      return null;
    }

    return payload as JWTPayload;
  } catch {
    return null;
  }
}

function encodeBase64(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

/**
 * 从请求头获取 Token
 */
export function getTokenFromRequest(req: NextApiRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}
