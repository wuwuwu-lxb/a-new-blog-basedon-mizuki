/**
 * POST /api/auth/login - 用户登录
 */

import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../../lib/prisma';
import { checkRateLimit } from '../../../lib/rateLimiter.js';

const JWT_SECRET = process.env.JWT_SECRET || 'mizuki-jwt-secret-key-dev-abc123';

export async function POST({ request }: any) {
  // API 限流检查
  const rateLimitResult = checkRateLimit(request);
  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({
        error: '请求过于频繁，请稍后再试',
        resetTime: new Date(rateLimitResult.resetTime!).toISOString(),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Reset': String(rateLimitResult.resetTime),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: '邮箱和密码不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return new Response(JSON.stringify({ error: '邮箱或密码错误' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return new Response(JSON.stringify({ error: '邮箱或密码错误' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 生成 Token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // 设置 HTTP-only Cookie
    const cookieHeader = `admin_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;

    return new Response(JSON.stringify({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
      },
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieHeader,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: '服务器错误：' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
