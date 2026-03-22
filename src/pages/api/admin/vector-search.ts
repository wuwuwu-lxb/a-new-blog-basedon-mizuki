/**
 * GET /api/admin/vector-search - 向量相似度搜索
 * POST /api/admin/vector-search - 重新向量化文章
 */

import type { APIRoute } from 'astro';
import { initVecTable, searchVectors, getAllVectors } from '../../../lib/vec-db';

// 初始化向量表
try {
  initVecTable();
} catch (error) {
  console.error('[向量搜索] 初始化失败:', error);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const limit = parseInt(url.searchParams.get('limit') || '5');

    if (!query) {
      // 返回所有已向量化的文章列表
      const vectors = getAllVectors();
      return new Response(JSON.stringify({
        success: true,
        vectors,
        total: vectors.length,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 向量相似度搜索
    const results = await searchVectors(query, limit);

    // 按文章 slug 分组（去重）
    const groupedResults = new Map();
    for (const result of results) {
      if (!groupedResults.has(result.slug)) {
        groupedResults.set(result.slug, {
          slug: result.slug,
          title: result.title,
          chunks: [],
          maxSimilarity: 1 - result.similarity, // 转换为相似度分数
        });
      }
      groupedResults.get(result.slug).chunks.push({
        content: result.content_chunk,
        similarity: 1 - result.similarity,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      results: Array.from(groupedResults.values()),
      query,
      total: groupedResults.size,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('向量搜索失败:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || '搜索失败',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { action, slug } = body;

    if (action === 'reindex') {
      // 重新索引所有文章
      const { reindexAllArticles } = await import('../../../lib/vec-db');
      const result = await reindexAllArticles();
      return new Response(JSON.stringify({
        success: true,
        message: `重新索引完成`,
        result,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'indexOne' && slug) {
      // 索引单篇文章
      const { saveArticleVector } = await import('../../../lib/vec-db');
      const { prisma } = await import('../../../lib/prisma');

      const post = await prisma.article.findUnique({
        where: { slug },
        select: { slug: true, title: true, content: true },
      });

      if (!post) {
        return new Response(JSON.stringify({
          success: false,
          error: '文章不存在',
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 转换为纯文本
      const textContent = post.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      await saveArticleVector(post.slug, post.title, textContent);

      return new Response(JSON.stringify({
        success: true,
        message: `文章「${post.title}」索引完成`,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: '未知的操作',
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('向量索引操作失败:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || '操作失败',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
