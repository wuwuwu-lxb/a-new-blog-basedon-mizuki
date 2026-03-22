/**
 * API 限流中间件
 * 基于 IP 地址限制请求频率
 */

interface RateLimitConfig {
  windowMs: number; // 时间窗口（毫秒）
  maxRequests: number; // 最大请求数
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

// 内存存储请求记录（生产环境建议使用 Redis）
const requestStore = new Map<string, RequestRecord>();

// 不同 API 的限流配置
const rateLimitConfigs: Record<string, RateLimitConfig> = {
  // 登录/注册 API：10 次/分钟
  '/api/auth/login': { windowMs: 60000, maxRequests: 10 },
  '/api/auth/admin-login': { windowMs: 60000, maxRequests: 10 },
  '/api/auth/register': { windowMs: 60000, maxRequests: 10 },
  // Chat API：20 次/分钟
  '/api/chat': { windowMs: 60000, maxRequests: 20 },
  // 管理 API：30 次/分钟
  '/api/admin/': { windowMs: 60000, maxRequests: 30 },
  // 搜索 API：30 次/分钟
  '/api/search-articles': { windowMs: 60000, maxRequests: 30 },
  // 其他 API：60 次/分钟
  default: { windowMs: 60000, maxRequests: 60 },
};

/**
 * 获取客户端 IP 地址
 */
function getClientIP(request: Request): string {
  const forwarded = request.headers.get('X-Forwarded-For');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('X-Real-IP');
  if (realIp) {
    return realIp;
  }
  // 返回一个默认值（在真实环境中会被替换为实际 IP）
  return '127.0.0.1';
}

/**
 * 获取 API 对应的限流配置
 */
function getRateLimitConfig(pathname: string): RateLimitConfig {
  // 精确匹配
  if (rateLimitConfigs[pathname]) {
    return rateLimitConfigs[pathname];
  }

  // 前缀匹配（如 /api/admin/*）
  for (const [path, config] of Object.entries(rateLimitConfigs)) {
    if (path.endsWith('/') && pathname.startsWith(path)) {
      return config;
    }
  }

  // 默认配置
  return rateLimitConfigs.default;
}

/**
 * 检查请求是否超过限流
 * @returns { allowed: boolean, resetTime?: number }
 */
export function checkRateLimit(request: Request): {
  allowed: boolean;
  resetTime?: number;
  remaining?: number;
} {
  const ip = getClientIP(request);
  const url = new URL(request.url);
  const config = getRateLimitConfig(url.pathname);
  const now = Date.now();

  const key = `${ip}:${url.pathname}`;
  let record = requestStore.get(key);

  // 如果没有记录或已过期，创建新记录
  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    requestStore.set(key, record);
    return { allowed: true, resetTime: record.resetTime, remaining: config.maxRequests - 1 };
  }

  // 检查是否超过限制
  if (record.count >= config.maxRequests) {
    return { allowed: false, resetTime: record.resetTime, remaining: 0 };
  }

  // 增加计数
  record.count++;
  requestStore.set(key, record);

  return { allowed: true, resetTime: record.resetTime, remaining: config.maxRequests - record.count };
}

/**
 * 清理过期的请求记录（建议定期调用）
 */
export function cleanupExpiredRecords(): void {
  const now = Date.now();
  for (const [key, record] of requestStore.entries()) {
    if (now > record.resetTime) {
      requestStore.delete(key);
    }
  }
}

// 每分钟自动清理一次
setInterval(cleanupExpiredRecords, 60000);
