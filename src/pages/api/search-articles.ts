/**
 * GET /api/search-articles - 搜索文章
 * 支持关键词搜索文章的标题、标签、分类
 */

import type { APIRoute } from 'astro';
import { prisma } from '@/lib/prisma';

export async function GET({ url }: { url: URL }) {
  try {
    const searchParams = url.searchParams;
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.trim().length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: '搜索关键词不能为空',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 从数据库获取所有已发布的文章
    const posts = await prisma.article.findMany({
      where: { published: true },
      include: {
        tags: true,
        categories: true,
      },
    });

    // 关键词搜索（标题、标签、分类、描述）
    const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

    const results = posts
      .filter((post) => {
        const title = post.title?.toLowerCase() || '';
        const tags = (post.tags || []).map(tag => tag.name.toLowerCase());
        const category = (post.categories[0]?.name || '').toLowerCase();
        const description = (post.excerpt || '').toLowerCase();
        const slug = post.slug.toLowerCase();

        // 检查是否包含任意一个搜索词（改为 some 而不是 every）
        return searchTerms.some(term =>
          title.includes(term) ||
          tags.some(tag => tag.includes(term)) ||
          category.includes(term) ||
          description.includes(term) ||
          slug.includes(term)
        );
      })
      .map((post) => ({
        slug: post.slug,
        title: post.title,
        description: post.excerpt || '',
        tags: post.tags.map(t => t.name),
        category: post.categories[0]?.name || '',
        published: post.publishedAt,
        url: `/posts/${post.slug}`,
      }))
      .sort((a, b) => {
        // 按发布时间倒序
        const dateA = a.published ? new Date(a.published).getTime() : 0;
        const dateB = b.published ? new Date(b.published).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit);

    return new Response(JSON.stringify({
      success: true,
      results,
      query,
      total: results.length,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('搜索文章失败:', error);
    return new Response(JSON.stringify({
      success: false,
      error: '搜索失败：' + error.message,
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
