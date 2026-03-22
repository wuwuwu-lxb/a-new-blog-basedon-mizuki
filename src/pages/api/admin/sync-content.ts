/**
 * POST /api/admin/sync-content - 同步内容
 * 注意：文章现在存储在数据库中，此 API 主要用于触发缓存刷新等操作
 */

import type { APIRoute } from 'astro';

export async function POST({ request }: { request: Request }) {
  try {
    // 文章现在直接从数据库读取，无需同步文件系统
    // 此端点可扩展用于缓存失效等操作

    return new Response(JSON.stringify({
      message: '内容同步成功（数据库模式）',
      timestamp: new Date().toISOString(),
      mode: 'database',
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error: any) {
    console.error('Sync content error:', error);
    return new Response(JSON.stringify({ error: '同步失败：' + error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
