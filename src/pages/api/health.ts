/**
 * GET /api/health - 健康检查端点
 * 用于 Docker 健康检查和负载均衡器探针
 */

import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || 'unknown',
    node_version: process.version,
    environment: process.env.NODE_ENV || 'development',
  };

  return new Response(JSON.stringify(healthStatus), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
