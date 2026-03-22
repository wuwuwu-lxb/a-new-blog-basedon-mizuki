/**
 * DELETE /api/comments/:id - 删除评论
 * 管理员可以删除任意评论，普通用户只能删除自己的评论
 */

import type { APIRoute } from 'astro';
import { getTokenFromRequest, verifyToken, isAdmin } from '../../../lib/auth';

export async function DELETE({ params, request }: { params: { id: string }, request: Request }) {
  try {
    const token = getTokenFromRequest(request);
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return new Response(JSON.stringify({
        error: '请先登录',
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
      return new Response(JSON.stringify({
        error: '无效的评论 ID',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { prisma } = await import('../../../lib/prisma');

    // 检查评论
    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(id) },
      include: { replies: true },
    });

    if (!comment) {
      return new Response(JSON.stringify({
        error: '评论不存在',
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 检查权限：管理员或评论作者
    const isAuthor = comment.authorId === payload.userId;
    if (!isAdmin(payload) && !isAuthor) {
      return new Response(JSON.stringify({
        error: '无权删除此评论',
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 如果有回复，标记为已删除而不是真正删除
    if (comment.replies && comment.replies.length > 0) {
      await prisma.comment.update({
        where: { id: parseInt(id) },
        data: {
          content: '[已删除]',
          guestName: '已删除',
        },
      });
    } else {
      // 删除关联的通知
      await prisma.notification.deleteMany({
        where: { commentId: parseInt(id) },
      });
      // 删除评论
      await prisma.comment.delete({
        where: { id: parseInt(id) },
      });
    }

    return new Response(JSON.stringify({
      message: '评论已删除',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Delete comment error:', error);
    return new Response(JSON.stringify({
      error: '删除评论失败',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
