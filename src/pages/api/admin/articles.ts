/**
 * GET /api/admin/articles - 获取文章列表
 * POST /api/admin/articles - 创建文章
 */

import type { APIRoute } from 'astro';
import { prisma } from '@/lib/prisma';
import MarkdownIt from 'markdown-it';

// Markdown 解析器
const markdownParser = new MarkdownIt();

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  return d.toISOString().split('T')[0];
}

/**
 * 创建或获取标签
 */
async function findOrCreateTag(name: string): Promise<{ id: number; name: string; slug: string }> {
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  let tag = await prisma.tag.findUnique({ where: { slug } });
  if (!tag) {
    tag = await prisma.tag.create({
      data: { name, slug },
    });
  }
  return tag;
}

/**
 * 创建或获取分类
 */
async function findOrCreateCategory(name: string): Promise<{ id: number; name: string; slug: string }> {
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  let category = await prisma.category.findUnique({ where: { slug } });
  if (!category) {
    category = await prisma.category.create({
      data: { name, slug },
    });
  }
  return category;
}

// GET - 获取文章列表
export async function GET() {
  try {
    const articles = await prisma.article.findMany({
      include: {
        tags: true,
        categories: true,
      },
      orderBy: [
        { pinned: 'desc' },
        { priority: 'asc' },
        { publishedAt: 'desc' },
      ],
    });

    const result = articles.map((article) => ({
      id: article.id,
      slug: article.slug,
      title: article.title,
      description: article.excerpt || '',
      published: article.published,
      publishedAt: article.publishedAt,
      tags: article.tags.map((t) => t.name),
      category: article.categories[0]?.name || null,
      image: article.cover,
      draft: article.draft,
      views: article.views,
      pinned: article.pinned,
      priority: article.priority,
      encrypted: article.encrypted,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
    }));

    return new Response(JSON.stringify({ articles: result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Get articles error:', error);
    return new Response(JSON.stringify({ error: '服务器错误：' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// POST - 创建文章
export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const {
      title,
      slug,
      content,
      description,
      tags,
      category,
      image,
      draft,
      published,
      views,
      // 扩展字段
      lang,
      pinned,
      comment,
      priority,
      authorName,
      sourceLink,
      licenseName,
      licenseUrl,
      encrypted,
      password,
      permalink,
      alias,
    } = body;

    if (!title || !slug) {
      return new Response(JSON.stringify({ error: '标题和 slug 为必填项' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 检查 slug 是否已存在
    const existing = await prisma.article.findUnique({ where: { slug } });
    if (existing) {
      return new Response(JSON.stringify({ error: '文章 slug 已存在' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 将 Markdown 转换为 HTML
    const htmlContent = markdownParser.render(content || '');

    // 处理标签和分类
    const tagRecords = tags?.length
      ? await Promise.all(tags.map((t: string) => findOrCreateTag(t)))
      : [];
    const categoryRecord = category
      ? await findOrCreateCategory(category)
      : null;

    // 获取默认作者（第一个用户）
    const defaultAuthor = await prisma.user.findFirst();
    const authorId = defaultAuthor?.id || 1;

    // 计算 numericId（最大 ID + 1）
    const maxIdArticle = await prisma.article.findFirst({
      orderBy: { numericId: 'desc' },
    });
    const numericId = (maxIdArticle?.numericId || 0) + 1;

    // 创建文章
    const article = await prisma.article.create({
      data: {
        title,
        slug,
        content: htmlContent,
        rawContent: content || '',
        excerpt: description || null,
        cover: image || null,
        published: published === true,
        draft: draft === true,
        views: views || 0,
        publishedAt: typeof published === 'string' ? new Date(published) : (published ? new Date() : null),
        lang: lang || null,
        pinned: pinned === true,
        comment: comment !== false,
        priority: priority || null,
        authorName: authorName || null,
        sourceLink: sourceLink || null,
        licenseName: licenseName || null,
        licenseUrl: licenseUrl || null,
        encrypted: encrypted === true,
        password: password || null,
        permalink: permalink || null,
        alias: alias || null,
        numericId,
        authorId,
        tags: {
          connect: tagRecords.map((t) => ({ id: t.id })),
        },
        categories: categoryRecord
          ? { connect: [{ id: categoryRecord.id }] }
          : undefined,
      },
    });

    return new Response(
      JSON.stringify({
        message: '文章创建成功',
        article: {
          id: article.id,
          slug: article.slug,
        },
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Create article error:', error);
    return new Response(JSON.stringify({ error: '创建失败：' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
