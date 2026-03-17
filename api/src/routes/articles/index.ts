/**
 * GET /api/articles
 * 获取文章列表（支持分页、筛选、搜索）
 *
 * POST /api/articles
 * 创建新文章（需要管理员权限）
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { z } from 'zod';

// 创建文章验证 schema
const createArticleSchema = z.object({
  title: z.string().min(1, '请输入文章标题'),
  slug: z.string().min(1, '请输入文章 slug'),
  content: z.string().min(1, '请输入文章内容'),
  excerpt: z.string().optional(),
  cover: z.string().url().optional().or(z.literal('')),
  published: z.boolean().default(false),
  categoryIds: z.array(z.number()).default([]),
  tagIds: z.array(z.number()).default([]),
});

// 获取文章列表
async function getArticles(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      page = '1',
      limit = '10',
      category,
      tag,
      search,
      published,
      authorId,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // 构建查询条件
    const where: any = {};

    // 筛选已发布文章
    if (published === 'true') {
      where.published = true;
    }

    // 按作者筛选
    if (authorId) {
      where.authorId = parseInt(authorId as string, 10);
    }

    // 搜索标题和内容
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { content: { contains: search as string } },
      ];
    }

    // 按分类筛选
    if (category) {
      where.categories = {
        some: { slug: category as string },
      };
    }

    // 按标签筛选
    if (tag) {
      where.tags = {
        some: { slug: tag as string },
      };
    }

    // 获取文章总数
    const total = await prisma.article.count({ where });

    // 获取文章列表
    const articles = await prisma.article.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { publishedAt: 'desc' },
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
        _count: {
          select: { comments: true },
        },
      },
    });

    res.json({
      articles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

// 创建文章
async function createArticle(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未授权，请先登录' });
    }

    const body = createArticleSchema.parse(req.body);

    // 检查 slug 是否已存在
    const existing = await prisma.article.findUnique({
      where: { slug: body.slug },
    });

    if (existing) {
      return res.status(400).json({ error: '文章 slug 已存在' });
    }

    // 创建文章
    const article = await prisma.article.create({
      data: {
        title: body.title,
        slug: body.slug,
        content: body.content,
        excerpt: body.excerpt || null,
        cover: body.cover || null,
        published: body.published,
        publishedAt: body.published ? new Date() : null,
        author: {
          connect: { id: req.user.userId },
        },
        // 关联分类
        categories: body.categoryIds.length > 0 ? {
          create: body.categoryIds.map((id: number) => ({
            category: { connect: { id } },
          })),
        } : undefined,
        // 关联标签
        tags: body.tagIds.length > 0 ? {
          create: body.tagIds.map((id: number) => ({
            tag: { connect: { id } },
          })),
        } : undefined,
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

    res.status(201).json({ article, message: '文章创建成功' });
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

    console.error('Create article error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

// 主处理函数
async function articlesHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { method } = req;

  switch (method) {
    case 'GET':
      return getArticles(req, res);
    case 'POST':
      return createArticle(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ error: `不允许的请求方法：${method}` });
  }
}

export default withAuth(articlesHandler);
