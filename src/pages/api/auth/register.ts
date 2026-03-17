/**
 * POST /api/auth/register - 用户注册
 */

import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'mizuki-jwt-secret-key-dev-abc123';

export async function POST({ request }: any) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // 验证必填字段
    if (!email || !password || !name) {
      return new Response(JSON.stringify({ error: '邮箱、密码和姓名不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: '邮箱格式不正确' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 验证密码长度
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: '密码长度至少为 6 位' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return new Response(JSON.stringify({ error: '该邮箱已被注册' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 创建用户（第一个注册用户自动成为管理员）
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'ADMIN' : 'USER';

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
    });

    // 生成 Token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return new Response(JSON.stringify({
      message: '注册成功',
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
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Register error:', error);
    return new Response(JSON.stringify({ error: '服务器错误：' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
