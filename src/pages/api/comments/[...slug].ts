/**
 * GET /api/comments - 获取评论列表
 * POST /api/comments - 创建评论
 */

import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/prisma';
import { getTokenFromRequest, verifyToken } from '../../../lib/auth';

export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  const articleSlug = url.searchParams.get('articleSlug');
  const status = url.searchParams.get('status') || 'APPROVED';

  try {
    const where: any = {};

    if (articleSlug) {
      where.articleSlug = articleSlug;
    }

    if (status) {
      where.status = status;
    }

    // 只获取顶级评论（parentId 为 null）
    where.parentId = null;

    const comments = await prisma.comment.findMany({
      where,
      include: {
        author: {
          select: { id: true, name: true, avatar: true }
        },
        replies: {
          where: { status: 'APPROVED' },
          include: {
            author: {
              select: { id: true, name: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return new Response(JSON.stringify({ comments }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Get comments error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { content, articleSlug, parentId } = body;

    if (!content) {
      return new Response(JSON.stringify({ error: '评论内容不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!articleSlug && !parentId) {
      return new Response(JSON.stringify({ error: '缺少文章标识' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 检查是否登录
    const token = getTokenFromRequest(request);
    const payload = token ? verifyToken(token) : null;

    // 构建评论数据
    const commentData: any = {
      content,
      articleSlug,
      status: 'APPROVED',
      parentId: parentId || null,
    };

    // 如果已登录，使用用户信息
    if (payload) {
      commentData.authorId = payload.userId;
      commentData.guestName = payload.name || payload.email?.split('@')[0] || '用户';
    } else {
      commentData.guestName = '匿名用户';
    }

    const comment = await prisma.comment.create({
      data: commentData,
    });

    // 如果是回复且父评论作者存在且不是自己，则发送通知
    if (parentId && payload) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        include: { author: true },
      });

      if (parentComment && parentComment.authorId && parentComment.authorId !== payload.userId) {
        // 获取文章标题
        const article = await prisma.article.findUnique({
          where: { slug: articleSlug },
          select: { title: true },
        });

        await prisma.notification.create({
          data: {
            userId: parentComment.authorId,
            type: 'comment_reply',
            content: `"${payload.name || payload.email?.split('@')[0] || '某用户'}" 回复了你的评论${article ? `《${article.title}》` : ''}`,
            fromUserId: payload.userId,
            commentId: comment.id,
          },
        });
      }
    }

    // 如果已登录，重新查询以获取 author 信息
    if (payload) {
      const commentWithAuthor = await prisma.comment.findUnique({
        where: { id: comment.id },
        include: {
          author: {
            select: { id: true, name: true, avatar: true }
          }
        }
      });
      return new Response(JSON.stringify({ comment: commentWithAuthor }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ comment }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Create comment error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
