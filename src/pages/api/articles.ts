/**
 * GET /api/articles - 获取文章列表（供 Astro 内部使用）
 */

import type { APIRoute } from 'astro';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const articles = await prisma.article.findMany({
      where: { published: true },
      orderBy: { publishedAt: 'desc' },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
        tags: true,
      },
    });

    const formattedArticles = articles.map((article) => ({
      id: article.id,
      slug: article.slug,
      title: article.title,
      description: article.excerpt || '',
      content: article.content, // HTML content for rendering
      rawContent: article.rawContent, // Raw markdown for editing
      published: article.published,
      publishedAt: article.publishedAt,
      tags: article.tags.map((t) => t.name),
      category: article.categories?.[0]?.name || '',
      image: article.cover || '',
      views: article.views,
    }));

    return new Response(JSON.stringify({ articles: formattedArticles }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Get articles error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
