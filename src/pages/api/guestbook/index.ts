/**
 * GET /api/guestbook - 获取留言列表
 * POST /api/guestbook - 发布留言（需要登录）
 */

import type { APIRoute } from 'astro';
import { getTokenFromRequest, verifyToken } from '../../../lib/auth';

export async function GET() {
  try {
    const { prisma } = await import('../../../lib/prisma');

    const guestbook = await prisma.guestbook.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return new Response(JSON.stringify({
      success: true,
      guestbook,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Get guestbook error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: '获取留言失败',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST({ request }: { request: Request }) {
  try {
    // 验证登录状态（必须登录才能留言）
    const token = getTokenFromRequest(request);
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return new Response(JSON.stringify({
        success: false,
        error: '请先登录再留言',
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { content, isAnonymous } = body;

    if (!content || !content.trim()) {
      return new Response(JSON.stringify({
        success: false,
        error: '留言内容不能为空',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { prisma } = await import('../../../lib/prisma');

    // 如果选择匿名，使用"匿名用户"，否则使用登录用户名
    const finalNickname = isAnonymous ? '匿名用户' : (payload.name || '用户');

    const entry = await prisma.guestbook.create({
      data: {
        nickname: finalNickname,
        content: content.trim(),
        userId: String(payload.userId),
      },
    });

    return new Response(JSON.stringify({
      success: true,
      entry,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Post guestbook error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: '发布留言失败',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
