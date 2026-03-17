/**
 * GET /api/comments/[id]
 * 获取评论详情
 *
 * PUT /api/comments/[id]
 * 更新评论（审核状态）
 *
 * DELETE /api/comments/[id]
 * 删除评论
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { z } from 'zod';

// 更新评论验证 schema
const updateCommentSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SPAM']),
  content: z.string().min(1).max(2000).optional(),
});

// 获取评论详情
async function getComment(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: '无效的评论 ID' });
  }

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
        article: {
          select: { id: true, title: true, slug: true },
        },
        parent: {
          include: {
            author: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
      },
    });

    if (!comment) {
      return res.status(404).json({ error: '评论不存在' });
    }

    res.json({ comment });
  } catch (error) {
    console.error('Get comment error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

// 更新评论（主要是审核状态）
async function updateComment(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: '无效的评论 ID' });
  }

  try {
    if (!req.user) {
      return res.status(401).json({ error: '未授权，请先登录' });
    }

    // 检查评论是否存在
    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!comment) {
      return res.status(404).json({ error: '评论不存在' });
    }

    // 检查权限（只有管理员可以审核评论）
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: '需要管理员权限' });
    }

    const body = updateCommentSchema.parse(req.body);

    // 更新评论
    const updatedComment = await prisma.comment.update({
      where: { id: parseInt(id, 10) },
      data: {
        status: body.status,
        content: body.content,
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
        article: {
          select: { id: true, title: true, slug: true },
        },
      },
    });

    res.json({ comment: updatedComment, message: '评论已更新' });
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

    console.error('Update comment error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

// 删除评论
async function deleteComment(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: '无效的评论 ID' });
  }

  try {
    if (!req.user) {
      return res.status(401).json({ error: '未授权，请先登录' });
    }

    // 检查评论是否存在
    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!comment) {
      return res.status(404).json({ error: '评论不存在' });
    }

    // 检查权限（管理员可以删除任何评论，用户只能删除自己的评论）
    if (req.user.role !== 'ADMIN' && comment.authorId !== req.user.userId) {
      return res.status(403).json({ error: '无权限删除此评论' });
    }

    // 删除评论（级联删除回复）
    await prisma.comment.delete({
      where: { id: parseInt(id, 10) },
    });

    res.json({ message: '评论已删除' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

// 主处理函数
async function commentHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { method } = req;

  switch (method) {
    case 'GET':
      return getComment(req, res);
    case 'PUT':
      return updateComment(req, res);
    case 'DELETE':
      return deleteComment(req, res);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).json({ error: `不允许的请求方法：${method}` });
  }
}

export default withAuth(commentHandler, { required: false });
