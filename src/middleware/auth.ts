/**
 * Auth middleware - Verify JWT token
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mizuki-jwt-secret-key-dev-abc123';

export interface AuthUser {
  userId: number;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/**
 * Extract token from Authorization header
 */
export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

/**
 * Verify JWT token and return payload
 */
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Middleware factory for protecting routes
 */
export function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<Response>,
  options: { required?: boolean; admin?: boolean } = {}
) {
  return async (request: Request): Promise<Response> => {
    const token = getTokenFromRequest(request);

    console.log('[withAuth] Token from request:', token ? 'exists' : 'none');
    console.log('[withAuth] Options:', options);

    if (!token) {
      if (options.required) {
        console.log('[withAuth] Token required but not provided, returning 401');
        return new Response(JSON.stringify({ error: '未授权，请先登录' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      console.log('[withAuth] Token not required, calling handler without auth');
      return handler(request as AuthenticatedRequest);
    }

    const payload = await verifyToken(token);
    if (!payload) {
      console.log('[withAuth] Token verification failed');
      return new Response(JSON.stringify({ error: 'Token 无效或已过期' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (options.admin && payload.role !== 'ADMIN') {
      console.log('[withAuth] Admin required but user is not admin');
      return new Response(JSON.stringify({ error: '需要管理员权限' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[withAuth] Auth successful, calling handler');
    const authRequest = request as AuthenticatedRequest;
    authRequest.user = payload;

    return handler(authRequest);
  };
}
