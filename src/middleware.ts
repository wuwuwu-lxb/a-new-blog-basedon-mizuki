/**
 * Astro 中间件 - 处理限流和 admin 认证
 */

import type { APIContext, MiddlewareNext } from 'astro';
import { checkRateLimit } from './lib/rateLimiter.js';
import { getTokenFromRequest, isAdmin, verifyToken } from './lib/auth.js';

// 管理员邮箱白名单
const ADMIN_EMAIL_WHITELIST = ['2752825104@qq.com'];

// 需要认证的管理页面路径
const ADMIN_ROUTES = ['/admin', '/admin/'];

// 需要认证的 API 路径前缀
const ADMIN_API_PREFIX = '/api/admin/';

// 公开的管理页面路径（登录页已移至 /login，不再需要）
const PUBLIC_ADMIN_ROUTES: string[] = [];

export async function onRequest(context: APIContext, next: MiddlewareNext) {
  const { request, url } = context;
  const pathname = new URL(url).pathname;

  // ========================================
  // 1. API 限流检查
  // ========================================
  if (pathname.startsWith('/api/')) {
    const rateLimitResult = checkRateLimit(request);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: '请求过于频繁，请稍后再试',
          resetTime: new Date(rateLimitResult.resetTime!).toISOString(),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Reset': String(rateLimitResult.resetTime),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // 添加限流响应头
    context.responseHeaders?.set('X-RateLimit-Remaining', String(rateLimitResult.remaining!));
    context.responseHeaders?.set('X-RateLimit-Reset', String(rateLimitResult.resetTime));
  }

  // ========================================
  // 2. 管理页面认证检查
  // ========================================
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));

  if (isAdminRoute) {
    // 检查是否是公开页面
    const isPublicRoute = PUBLIC_ADMIN_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + '/')
    );

    if (!isPublicRoute) {
      const token = getTokenFromRequest(request);
      const payload = token ? verifyToken(token) : null;

      // 检查是否是管理员或白名单邮箱
      const isAuthorized = payload && (isAdmin(payload) || (payload.email && ADMIN_EMAIL_WHITELIST.includes(payload.email)));

      if (!isAuthorized) {
        // 非管理员，跳转 404
        return context.redirect('/404');
      }
    }
  }

  // ========================================
  // 3. 管理 API 认证检查
  // ========================================
  if (pathname.startsWith(ADMIN_API_PREFIX)) {
    const token = getTokenFromRequest(request);
    const payload = token ? verifyToken(token) : null;

    // 检查是否是管理员或白名单邮箱
    const isAuthorized = payload && (isAdmin(payload) || (payload.email && ADMIN_EMAIL_WHITELIST.includes(payload.email)));

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({
          error: '未授权访问',
          message: '需要管理员权限',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 将用户信息添加到上下文，供后续 API 使用
    context.locals.user = payload;
  }

  // 继续处理请求
  const response = await next();

  return response;
}
