/**
 * GET /api/search-articles - 搜索文章
 * 支持关键词搜索文章的标题、标签、分类
 */

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

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

    // 获取所有文章
    const posts = await getCollection('posts', ({ data }) => {
      return !data.draft;
    });

    // 关键词搜索（标题、标签、分类、描述）
    const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

    const results = posts
      .filter((post) => {
        const title = post.data.title?.toLowerCase() || '';
        const tags = (post.data.tags || []).map(tag => tag.toLowerCase());
        const category = (post.data.category || '').toLowerCase();
        const description = (post.data.description || '').toLowerCase();
        const slug = post.slug.toLowerCase();

        // 检查是否包含所有搜索词
        return searchTerms.every(term =>
          title.includes(term) ||
          tags.some(tag => tag.includes(term)) ||
          category.includes(term) ||
          description.includes(term) ||
          slug.includes(term)
        );
      })
      .map((post) => ({
        slug: post.slug,
        title: post.data.title,
        description: post.data.description || '',
        tags: post.data.tags || [],
        category: post.data.category || '',
        published: post.data.published,
        url: `/posts/${post.slug}`,
      }))
      .sort((a, b) => {
        // 按发布时间倒序
        return new Date(b.published).getTime() - new Date(a.published).getTime();
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
