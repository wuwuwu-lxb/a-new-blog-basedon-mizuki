/**
 * GET /api/articles/[slug] - 获取文章详情
 */

import type { APIRoute } from 'astro';
import { prisma } from '@/lib/prisma';

export async function GET({ params }: { params: { slug: string } }) {
  try {
    const { slug } = params;

    const article = await prisma.article.findUnique({
      where: { slug },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
        tags: true,
      },
    });

    if (!article) {
      return new Response(JSON.stringify({ error: '文章不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formattedArticle = {
      id: article.id,
      slug: article.slug,
      title: article.title,
      description: article.excerpt || '',
      content: article.content,
      rawContent: article.rawContent,
      published: article.published,
      publishedAt: article.publishedAt,
      tags: article.tags.map((t) => t.name),
      category: article.categories?.[0]?.name || '',
      image: article.cover || '',
      views: article.views,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
    };

    return new Response(JSON.stringify({ article: formattedArticle }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Get article error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
