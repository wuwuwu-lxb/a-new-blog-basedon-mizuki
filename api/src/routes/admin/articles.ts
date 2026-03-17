/**
 * POST /api/admin/articles
 * 创建新文章（markdown 文件）
 *
 * GET /api/admin/articles
 * 获取所有文章列表（用于管理后台）
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import path from 'path';
import fs from 'fs/promises';
import { glob } from 'glob';
import matter from 'gray-matter';

const POSTS_DIR = path.join(process.cwd(), '../src/content/posts');

// 获取所有 markdown 文章
async function getArticles(req: NextApiRequest, res: NextApiResponse) {
  try {
    const files = await glob('**/*.md', { cwd: POSTS_DIR });

    const articles = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(POSTS_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const { data, content: body } = matter(content);

        return {
          slug: file.replace(/\/index\.md$/, '').replace(/\.md$/, ''),
          filePath: file,
          title: data.title || '无标题',
          description: data.description || '',
          published: data.published !== false,
          publishedAt: data.published || data.date,
          tags: data.tags || [],
          category: data.category,
          image: data.image,
          draft: data.draft || false,
        };
      })
    );

    // 按发布时间排序
    articles.sort((a, b) => {
      const dateA = new Date(a.publishedAt || 0).getTime();
      const dateB = new Date(b.publishedAt || 0).getTime();
      return dateB - dateA;
    });

    res.json({ articles });
  } catch (error: any) {
    console.error('Get articles error:', error);
    res.status(500).json({ error: '服务器错误：' + error.message });
  }
}

// 创建新文章
async function createArticle(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: '不允许的请求方法' });
  }

  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: '需要管理员权限' });
  }

  try {
    const { title, slug, content, description, tags, category, image, draft } = req.body;

    if (!title || !slug) {
      return res.status(400).json({ error: '标题和 slug 为必填项' });
    }

    // 检查 slug 是否已存在
    const existingPath = path.join(POSTS_DIR, `${slug}.md`);
    const existingIndexPath = path.join(POSTS_DIR, slug, 'index.md');

    try {
      await fs.access(existingPath);
      return res.status(400).json({ error: '文章 slug 已存在' });
    } catch {
      // 文件不存在，继续
    }

    // 创建文章目录
    const articleDir = path.join(POSTS_DIR, slug);
    await fs.mkdir(articleDir, { recursive: true });

    // 生成 frontmatter
    const frontmatter: any = {
      title,
      description: description || '',
      published: draft !== true,
      publishedAt: new Date().toISOString().split('T')[0],
    };

    if (tags && Array.isArray(tags) && tags.length > 0) {
      frontmatter.tags = tags;
    }

    if (category) {
      frontmatter.category = category;
    }

    if (image) {
      frontmatter.image = image;
    }

    // 生成 markdown 内容
    let markdownContent = '---\n';
    Object.keys(frontmatter).forEach((key) => {
      const value = frontmatter[key];
      if (Array.isArray(value)) {
        markdownContent += `${key}:\n`;
        value.forEach((item: string) => {
          markdownContent += `  - ${item}\n`;
        });
      } else {
        markdownContent += `${key}: ${value}\n`;
      }
    });
    markdownContent += '---\n\n';
    markdownContent += content || '';

    // 写入文件
    const filePath = path.join(articleDir, 'index.md');
    await fs.writeFile(filePath, markdownContent, 'utf-8');

    res.status(201).json({
      message: '文章创建成功',
      slug,
      filePath: `${slug}/index.md`,
    });
  } catch (error: any) {
    console.error('Create article error:', error);
    res.status(500).json({ error: '创建失败：' + error.message });
  }
}

async function articlesHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { method } = req;

  switch (method) {
    case 'GET':
      return getArticles(req, res);
    case 'POST':
      return createArticle(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ error: `不允许的请求方法：${method}` });
  }
}

export default withAuth(articlesHandler, { required: true, admin: true });
