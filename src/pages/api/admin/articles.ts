/**
 * GET /api/admin/articles - 获取文章列表
 * POST /api/admin/articles - 创建文章
 */

import type { APIRoute } from 'astro';
import path from 'path';
import fs from 'fs/promises';
import { glob } from 'glob';
import matter from 'gray-matter';

const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');

// GET - 获取文章列表
export async function GET(request: Request) {
  try {
    const files = await glob('**/*.md', { cwd: POSTS_DIR });

    // 加载浏览量缓存
    let viewsCache: Record<string, number> = {};
    try {
      const viewsCacheFile = path.join(process.cwd(), '.views-cache.json');
      const cacheContent = await fs.readFile(viewsCacheFile, 'utf-8');
      viewsCache = JSON.parse(cacheContent);
    } catch {
      // 文件不存在或解析失败，使用空缓存
    }

    const articles = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(POSTS_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const { data, content: body } = matter(content);

        const slug = file.replace(/\/index\.md$/, '').replace(/\.md$/, '');
        return {
          slug,
          filePath: file,
          title: data.title || '无标题',
          description: data.description || '',
          published: data.published !== false,
          publishedAt: data.published || data.date,
          tags: data.tags || [],
          category: data.category,
          image: data.image,
          draft: data.draft || false,
          views: viewsCache[slug] || data.views || 0,
        };
      })
    );

    articles.sort((a, b) => {
      const dateA = new Date(a.publishedAt || 0).getTime();
      const dateB = new Date(b.publishedAt || 0).getTime();
      return dateB - dateA;
    });

    return new Response(JSON.stringify({ articles }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Get articles error:', error);
    return new Response(JSON.stringify({ error: '服务器错误：' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// POST - 创建文章
export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { title, slug, content, description, tags, category, image, draft, published, views } = body;

    if (!title || !slug) {
      return new Response(JSON.stringify({ error: '标题和 slug 为必填项' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const existingIndexPath = path.join(POSTS_DIR, slug, 'index.md');
    try {
      await fs.access(existingIndexPath);
      return new Response(JSON.stringify({ error: '文章 slug 已存在' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // 文件不存在，继续
    }

    const articleDir = path.join(POSTS_DIR, slug);
    await fs.mkdir(articleDir, { recursive: true });

    // 辅助函数：格式化日期为 YYYY-MM-DD
    function formatDate(dateStr: string): string {
      if (!dateStr) return new Date().toISOString().split('T')[0];
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr; // 如果无法解析，返回原值
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // 加载浏览量缓存
    let viewsCache: Record<string, number> = {};
    const viewsCacheFile = path.join(process.cwd(), '.views-cache.json');
    try {
      const cacheContent = await fs.readFile(viewsCacheFile, 'utf-8');
      viewsCache = JSON.parse(cacheContent);
    } catch {
      // 文件不存在或解析失败，使用空缓存
    }

    // 初始化浏览量
    if (views !== undefined) {
      viewsCache[slug] = views;
      await fs.writeFile(viewsCacheFile, JSON.stringify(viewsCache, null, 2), 'utf-8');
    }

    const frontmatter: any = {
      title,
      description: description || '',
      published: published ? formatDate(published) : new Date().toISOString().split('T')[0],
      tags: tags || [],
      category: category || '',
      image: image || '',
      draft: draft === true,
    };

    let markdownContent = '---\n';
    Object.keys(frontmatter).forEach((key) => {
      const value = frontmatter[key];
      if (Array.isArray(value)) {
        markdownContent += `${key}:\n`;
        value.forEach((item: string) => {
          markdownContent += `  - ${item}\n`;
        });
      } else if (value === '') {
        // 空字符串需要加引号，否则会被解析为 null
        markdownContent += `${key}: ""\n`;
      } else {
        markdownContent += `${key}: ${value}\n`;
      }
    });
    markdownContent += '---\n\n';
    markdownContent += content || '';

    const filePath = path.join(articleDir, 'index.md');
    await fs.writeFile(filePath, markdownContent, 'utf-8');

    return new Response(JSON.stringify({
      message: '文章创建成功',
      slug,
      filePath: `${slug}/index.md`,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Create article error:', error);
    return new Response(JSON.stringify({ error: '创建失败：' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
