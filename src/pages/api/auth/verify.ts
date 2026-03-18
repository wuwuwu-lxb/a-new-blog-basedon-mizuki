/**
 * GET /api/auth/verify - 验证 JWT token
 */

import type { APIRoute } from 'astro';
import { getTokenFromRequest, isAdmin, verifyToken } from '../../../lib/auth.js';

export async function GET({ request }: { request: Request }) {
  const token = getTokenFromRequest(request);

  if (!token) {
    return new Response(
      JSON.stringify({
        valid: false,
        error: '未提供 Token'
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const payload = verifyToken(token);

  if (!payload) {
    return new Response(
      JSON.stringify({
        valid: false,
        error: 'Token 无效或已过期'
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (!isAdmin(payload)) {
    return new Response(
      JSON.stringify({
        valid: false,
        error: '需要管理员权限'
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(
    JSON.stringify({
      valid: true,
      user: {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
      }
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
