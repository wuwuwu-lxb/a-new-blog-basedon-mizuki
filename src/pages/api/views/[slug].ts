/**
 * GET /api/views/[slug] - 获取文章浏览量
 * POST /api/views/[slug] - 增加文章浏览量
 */

import type { APIRoute } from 'astro';
import path from 'path';
import fs from 'fs/promises';
import matter from 'gray-matter';

const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');
const VIEWS_CACHE_FILE = path.join(process.cwd(), '.views-cache.json');

// 缓存浏览量数据，避免频繁读取文件
let viewsCache: Record<string, number> = {};
let cacheLoaded = false;

// 加载缓存
async function loadViewsCache() {
  if (cacheLoaded) return;
  try {
    const content = await fs.readFile(VIEWS_CACHE_FILE, 'utf-8');
    viewsCache = JSON.parse(content);
  } catch {
    // 文件不存在或解析失败，使用空缓存
    viewsCache = {};
  }
  cacheLoaded = true;
}

// 保存缓存
async function saveViewsCache() {
  await fs.writeFile(VIEWS_CACHE_FILE, JSON.stringify(viewsCache, null, 2), 'utf-8');
}

// 获取文章的 frontmatter
async function getArticleFrontmatter(slug: string) {
  let filePath = path.join(POSTS_DIR, slug, 'index.md');
  let altPath = path.join(POSTS_DIR, `${slug}.md`);

  let content;
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch {
    content = await fs.readFile(altPath, 'utf-8');
  }

  const { data } = matter(content);
  return data;
}

// GET - 获取浏览量
export async function GET({ request }: { request: Request }) {
  await loadViewsCache();

  const url = new URL(request.url);
  const slug = url.pathname.split('/').filter(Boolean).pop() || '';

  if (!slug) {
    return new Response(JSON.stringify({ error: '无效的 slug' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 优先使用缓存中的浏览量
    const views = viewsCache[slug] ?? 0;

    return new Response(JSON.stringify({ slug, views }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: '获取失败：' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// POST - 增加浏览量
export async function POST({ request }: { request: Request }) {
  await loadViewsCache();

  const url = new URL(request.url);
  const slug = url.pathname.split('/').filter(Boolean).pop() || '';

  if (!slug) {
    return new Response(JSON.stringify({ error: '无效的 slug' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 检查文章是否存在
    await getArticleFrontmatter(slug);

    // 增加浏览量
    viewsCache[slug] = (viewsCache[slug] || 0) + 1;

    // 异步保存缓存，不阻塞响应
    saveViewsCache().catch(console.error);

    return new Response(JSON.stringify({
      slug,
      views: viewsCache[slug],
      message: '浏览量已更新'
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: '文章不存在：' + error.message }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
