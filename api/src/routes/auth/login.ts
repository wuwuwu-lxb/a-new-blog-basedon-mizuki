/**
 * POST /api/auth/login
 * 用户登录
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';
import { generateToken } from '@/lib/jwt';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(1, '请输入密码'),
});

export default async function login(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '不允许的请求方法' });
  }

  try {
    const body = loginSchema.parse(req.body);

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 验证密码
    const isValid = await verifyPassword(body.password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 生成 Token
    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
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
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: '参数验证失败',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    console.error('Login error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}
