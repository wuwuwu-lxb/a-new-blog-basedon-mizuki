/**
 * GET /api/notifications - 获取通知列表
 * PUT /api/notifications - 标记通知已读
 */

import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/prisma';
import { getTokenFromRequest, verifyToken } from '../../../lib/auth';

export async function GET({ request }: { request: Request }) {
  try {
    const token = getTokenFromRequest(request);
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return new Response(JSON.stringify({
        error: '需要登录',
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 清理超过 1 个月的已读通知
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    await prisma.notification.deleteMany({
      where: {
        userId: payload.userId,
        isRead: true,
        createdAt: { lt: oneMonthAgo },
      },
    });

    const notifications = await prisma.notification.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        fromUser: {
          select: { id: true, name: true, avatar: true },
        },
        comment: {
          select: {
            id: true,
            content: true,
            articleSlug: true,
            articleId: true,
          },
        },
      },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: payload.userId, isRead: false },
    });

    return new Response(JSON.stringify({
      notifications,
      unreadCount,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    return new Response(JSON.stringify({
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PUT({ request }: { request: Request }) {
  try {
    const token = getTokenFromRequest(request);
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return new Response(JSON.stringify({
        error: '需要登录',
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      // 标记全部已读后删除
      await prisma.notification.deleteMany({
        where: { userId: payload.userId, isRead: false },
      });
    } else if (notificationId) {
      // 标记已读后删除
      await prisma.notification.delete({
        where: { id: notificationId },
      });
    }

    return new Response(JSON.stringify({
      message: '已更新',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Update notifications error:', error);
    return new Response(JSON.stringify({
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
