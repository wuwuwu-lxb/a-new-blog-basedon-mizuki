/**
 * GET /api/articles/[slug]
 * 获取文章详情
 *
 * PUT /api/articles/[slug]
 * 更新文章（需要管理员权限）
 *
 * DELETE /api/articles/[slug]
 * 删除文章（需要管理员权限）
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { z } from 'zod';

// 更新文章验证 schema
const updateArticleSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().optional().or(z.literal('')),
  cover: z.string().url().optional().or(z.literal('')),
  published: z.boolean().optional(),
  categoryIds: z.array(z.number()).optional(),
  tagIds: z.array(z.number()).optional(),
});

// 获取文章详情
async function getArticle(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query;

  if (!slug || Array.isArray(slug)) {
    return res.status(400).json({ error: '无效的文章 slug' });
  }

  try {
    const article = await prisma.article.findUnique({
      where: { slug },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, bio: true },
        },
        categories: {
          select: { id: true, name: true, slug: true },
        },
        tags: {
          select: { id: true, name: true, slug: true },
        },
        comments: {
          where: { status: 'APPROVED' },
          include: {
            author: {
              select: { id: true, name: true, avatar: true },
            },
            replies: {
              include: {
                author: {
                  select: { id: true, name: true, avatar: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 增加阅读量（仅在已发布时）
    if (article.published) {
      await prisma.article.update({
        where: { id: article.id },
        data: { views: article.views + 1 },
      });
    }

    res.json({ article });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

// 更新文章
async function updateArticle(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  const { slug } = req.query;

  if (!slug || Array.isArray(slug)) {
    return res.status(400).json({ error: '无效的文章 slug' });
  }

  try {
    if (!req.user) {
      return res.status(401).json({ error: '未授权，请先登录' });
    }

    // 检查文章是否存在
    const existingArticle = await prisma.article.findUnique({
      where: { slug: slug as string },
    });

    if (!existingArticle) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 检查权限（只有作者或管理员可以编辑）
    if (existingArticle.authorId !== req.user.userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: '无权限编辑此文章' });
    }

    const body = updateArticleSchema.parse(req.body);

    // 如果修改了 slug，检查新 slug 是否已被占用
    if (body.slug && body.slug !== slug) {
      const slugExists = await prisma.article.findUnique({
        where: { slug: body.slug },
      });

      if (slugExists) {
        return res.status(400).json({ error: '文章 slug 已被占用' });
      }
    }

    // 更新文章
    const article = await prisma.article.update({
      where: { slug: slug as string },
      data: {
        ...body,
        // 更新分类关联
        categories: body.categoryIds ? {
          deleteMany: {},
          create: body.categoryIds.map((id: number) => ({
            category: { connect: { id } },
          })),
        } : undefined,
        // 更新标签关联
        tags: body.tagIds ? {
          deleteMany: {},
          create: body.tagIds.map((id: number) => ({
            tag: { connect: { id } },
          })),
        } : undefined,
        // 如果设置为已发布且之前未发布，设置发布时间
        publishedAt: body.published && !existingArticle.published
          ? new Date()
          : existingArticle.publishedAt,
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
        categories: {
          select: { id: true, name: true, slug: true },
        },
        tags: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    res.json({ article, message: '文章更新成功' });
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

    console.error('Update article error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

// 删除文章
async function deleteArticle(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  const { slug } = req.query;

  if (!slug || Array.isArray(slug)) {
    return res.status(400).json({ error: '无效的文章 slug' });
  }

  try {
    if (!req.user) {
      return res.status(401).json({ error: '未授权，请先登录' });
    }

    // 检查文章是否存在
    const article = await prisma.article.findUnique({
      where: { slug: slug as string },
    });

    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 检查权限（只有作者或管理员可以删除）
    if (article.authorId !== req.user.userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: '无权限删除此文章' });
    }

    // 删除文章
    await prisma.article.delete({
      where: { slug: slug as string },
    });

    res.json({ message: '文章已删除' });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

// 主处理函数
async function articleHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { method } = req;

  switch (method) {
    case 'GET':
      return getArticle(req, res);
    case 'PUT':
      return updateArticle(req, res);
    case 'DELETE':
      return deleteArticle(req, res);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).json({ error: `不允许的请求方法：${method}` });
  }
}

export default withAuth(articleHandler);
