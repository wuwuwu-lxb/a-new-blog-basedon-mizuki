/**
 * GET /api/admin/articles/[slug] - 获取文章详情
 * PUT /api/admin/articles/[slug] - 更新文章
 * DELETE /api/admin/articles/[slug] - 删除文章
 */

import type { APIRoute } from 'astro';
import path from 'path';
import fs from 'fs/promises';
import matter from 'gray-matter';

const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');

export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  const slug = url.pathname.split('/').filter(Boolean).pop() || '';

  if (!slug) {
    return new Response(JSON.stringify({ error: '无效的文章 slug' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 加载浏览量缓存
  let viewsCache: Record<string, number> = {};
  try {
    const viewsCacheFile = path.join(process.cwd(), '.views-cache.json');
    const cacheContent = await fs.readFile(viewsCacheFile, 'utf-8');
    viewsCache = JSON.parse(cacheContent);
  } catch {
    // 文件不存在或解析失败，使用空缓存
  }

  try {
    let filePath = path.join(POSTS_DIR, slug, 'index.md');
    let altPath = path.join(POSTS_DIR, `${slug}.md`);

    let content;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {
      content = await fs.readFile(altPath, 'utf-8');
      filePath = altPath;
    }

    const { data, content: body } = matter(content);

    return new Response(JSON.stringify({
      article: {
        slug,
        filePath,
        title: data.title || '无标题',
        description: data.description || '',
        published: data.published !== false,
        publishedAt: data.published || data.date,
        tags: data.tags || [],
        category: data.category,
        image: data.image,
        draft: data.draft || false,
        content: body,
        views: viewsCache[slug] || data.views || 0,
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Get article error:', error);
    return new Response(JSON.stringify({ error: '文章不存在' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PUT({ request }: { request: Request }) {
  const url = new URL(request.url);
  const slug = url.pathname.split('/').filter(Boolean).pop() || '';

  try {
    const body = await request.json();
    const { title, description, content, tags, category, image, published, draft, views } = body;

    // 加载浏览量缓存
    let viewsCache: Record<string, number> = {};
    const viewsCacheFile = path.join(process.cwd(), '.views-cache.json');
    try {
      const cacheContent = await fs.readFile(viewsCacheFile, 'utf-8');
      viewsCache = JSON.parse(cacheContent);
    } catch {
      // 文件不存在或解析失败，使用空缓存
    }

    // 如果传入了 views 参数，更新缓存
    if (views !== undefined) {
      viewsCache[slug] = views;
      await fs.writeFile(viewsCacheFile, JSON.stringify(viewsCache, null, 2), 'utf-8');
    }

    let filePath = path.join(POSTS_DIR, slug, 'index.md');
    let altPath = path.join(POSTS_DIR, `${slug}.md`);

    let fileContent;
    try {
      fileContent = await fs.readFile(filePath, 'utf-8');
    } catch {
      fileContent = await fs.readFile(altPath, 'utf-8');
      filePath = altPath;
    }

    const { data, content: oldContent } = matter(fileContent);

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

    const frontmatter: any = {
      title: title || data.title,
      description: description !== undefined ? description : data.description,
      published: published ? formatDate(published) : (data.published || data.date || new Date().toISOString()),
      tags: tags !== undefined ? tags : (data.tags || []),
      category: category !== undefined ? category : (data.category || ''),
      image: image !== undefined ? (image || '') : (data.image || ''),
      draft: draft !== undefined ? draft : (data.draft || false),
    };

    // 如果传入的 published 为 false 或 draft 为 true，则设置为草稿
    if (published === false || draft === true) {
      frontmatter.draft = true;
    } else {
      frontmatter.draft = false;
    }

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
    markdownContent += content !== undefined ? content : oldContent;

    await fs.writeFile(filePath, markdownContent, 'utf-8');

    return new Response(JSON.stringify({
      message: '文章更新成功',
      slug,
      filePath: filePath.replace(POSTS_DIR + '/', ''),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Update article error:', error);
    return new Response(JSON.stringify({ error: '更新失败：' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE({ request }: { request: Request }) {
  const url = new URL(request.url);
  const slug = url.pathname.split('/').filter(Boolean).pop() || '';

  try {
    let dirPath = path.join(POSTS_DIR, slug);
    let filePath = path.join(POSTS_DIR, `${slug}.md`);

    try {
      await fs.access(dirPath);
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch {
      await fs.access(filePath);
      await fs.unlink(filePath);
    }

    return new Response(JSON.stringify({ message: '文章已删除' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Delete article error:', error);
    return new Response(JSON.stringify({ error: '删除失败：' + error.message }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
