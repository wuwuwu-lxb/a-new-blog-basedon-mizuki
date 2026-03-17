/**
 * GET /api/comments
 * 获取评论列表（支持分页、筛选）
 *
 * POST /api/comments
 * 创建新评论
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest, requireAuth } from '@/middleware/auth';
import { z } from 'zod';

// 创建评论验证 schema
const createCommentSchema = z.object({
  articleId: z.number().int().positive('无效的文章 ID').optional(),
  articleSlug: z.string().min(1, '请输入文章 slug').optional(),
  content: z.string().min(1, '请输入评论内容').max(2000, '评论内容过长'),
  parentId: z.number().int().positive().optional().nullable(),
});

// 获取评论列表（不需要认证）
async function getComments(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      page = '1',
      limit = '20',
      articleId,
      articleSlug,
      status,
      userId,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // 构建查询条件
    const where: any = {};

    // 按文章筛选（支持 articleId 或 articleSlug）
    if (articleId) {
      where.articleId = parseInt(articleId as string, 10);
      // 默认只返回已审核通过的评论
      if (!status) {
        where.status = 'APPROVED';
      }
    } else if (articleSlug) {
      where.articleSlug = articleSlug as string;
      // 默认只返回已审核通过的评论
      if (!status) {
        where.status = 'APPROVED';
      }
    }

    // 按状态筛选
    if (status) {
      where.status = status;
    }

    // 按用户筛选
    if (userId) {
      where.authorId = parseInt(userId as string, 10);
    }

    // 只获取顶级评论（不包括回复）
    where.parentId = null;

    // 获取评论总数
    const total = await prisma.comment.count({ where });

    // 获取评论列表（包含回复）
    const comments = await prisma.comment.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
        // 包含回复
        replies: {
          include: {
            author: {
              select: { id: true, name: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    res.json({
      comments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

// 创建评论（需要认证）
async function createComment(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    // 必须登录才能评论
    if (!req.user) {
      return res.status(401).json({ error: '请先登录后再评论' });
    }

    const body = createCommentSchema.parse(req.body);

    // 必须有 articleId 或 articleSlug
    if (!body.articleId && !body.articleSlug) {
      return res.status(400).json({ error: '必须提供文章 ID 或文章 slug' });
    }

    // 如果有 articleId，检查文章是否存在
    if (body.articleId) {
      const article = await prisma.article.findUnique({
        where: { id: body.articleId },
      });

      if (!article) {
        return res.status(404).json({ error: '文章不存在' });
      }

      // 如果文章未发布，不允许评论
      if (!article.published) {
        return res.status(403).json({ error: '文章未发布，无法评论' });
      }
    }

    // 如果有 parentId，检查父评论是否存在
    if (body.parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: body.parentId },
      });

      if (!parentComment) {
        return res.status(404).json({ error: '父评论不存在' });
      }

      // 检查父评论是否属于同一篇文章
      if (body.articleId && parentComment.articleId !== body.articleId) {
        return res.status(400).json({ error: '评论不属于同一篇文章' });
      }
      if (body.articleSlug && parentComment.articleSlug !== body.articleSlug) {
        return res.status(400).json({ error: '评论不属于同一篇文章' });
      }
    }

    // 创建评论（仅登录用户）
    const comment = await prisma.comment.create({
      data: {
        content: body.content,
        articleId: body.articleId || null,
        articleSlug: body.articleSlug || null,
        parentId: body.parentId,
        authorId: req.user.userId,
        status: req.user.role === 'ADMIN' ? 'APPROVED' : 'PENDING', // 管理员评论直接通过
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    const message = req.user.role === 'ADMIN'
      ? '评论发布成功'
      : '评论已提交，待审核后显示';

    res.status(201).json({ comment, message });
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

    console.error('Create comment error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

// 主处理函数
async function commentsHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { method } = req;

  switch (method) {
    case 'GET':
      return getComments(req, res);
    case 'POST':
      // POST 请求需要认证
      await requireAuth(req, res, () => createComment(req, res));
      return;
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ error: `不允许的请求方法：${method}` });
  }
}

export default withAuth(commentsHandler, { required: false });
