/**
 * GET /api/admin/articles/[slug]
 * 获取文章详情
 *
 * PUT /api/admin/articles/[slug]
 * 更新文章
 *
 * DELETE /api/admin/articles/[slug]
 * 删除文章
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import path from 'path';
import fs from 'fs/promises';
import matter from 'gray-matter';

const POSTS_DIR = path.join(process.cwd(), '../src/content/posts');

// 获取文章详情
async function getArticle(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query;

  if (!slug || Array.isArray(slug)) {
    return res.status(400).json({ error: '无效的文章 slug' });
  }

  try {
    // 尝试两种路径格式
    let filePath = path.join(POSTS_DIR, slug as string, 'index.md');
    let altPath = path.join(POSTS_DIR, `${slug}.md`);

    let content;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {
      content = await fs.readFile(altPath, 'utf-8');
      filePath = altPath;
    }

    const { data, content: body } = matter(content);

    res.json({
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
      },
    });
  } catch (error: any) {
    console.error('Get article error:', error);
    res.status(404).json({ error: '文章不存在' });
  }
}

// 更新文章
async function updateArticle(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ error: '不允许的请求方法' });
  }

  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: '需要管理员权限' });
  }

  const { slug } = req.query;

  if (!slug || Array.isArray(slug)) {
    return res.status(400).json({ error: '无效的文章 slug' });
  }

  try {
    const { title, description, content, tags, category, image, published, draft } = req.body;

    // 尝试两种路径格式
    let filePath = path.join(POSTS_DIR, slug as string, 'index.md');
    let altPath = path.join(POSTS_DIR, `${slug}.md`);

    let fileContent;
    try {
      fileContent = await fs.readFile(filePath, 'utf-8');
    } catch {
      fileContent = await fs.readFile(altPath, 'utf-8');
      filePath = altPath;
    }

    const { data, content: oldContent } = matter(fileContent);

    // 生成新的 frontmatter
    const frontmatter: any = {
      title: title || data.title,
      description: description !== undefined ? description : data.description,
      published: published !== undefined ? published : (draft !== undefined ? draft !== true : data.published !== false),
      publishedAt: data.publishedAt || data.date || new Date().toISOString().split('T')[0],
    };

    if (tags !== undefined) {
      frontmatter.tags = Array.isArray(tags) ? tags : (tags ? [tags] : []);
    } else if (data.tags) {
      frontmatter.tags = data.tags;
    }

    if (category !== undefined) {
      frontmatter.category = category;
    } else if (data.category) {
      frontmatter.category = data.category;
    }

    if (image !== undefined) {
      frontmatter.image = image;
    } else if (data.image) {
      frontmatter.image = data.image;
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
    markdownContent += content !== undefined ? content : oldContent;

    // 写入文件
    await fs.writeFile(filePath, markdownContent, 'utf-8');

    res.json({
      message: '文章更新成功',
      slug,
      filePath: filePath.replace(POSTS_DIR + '/', ''),
    });
  } catch (error: any) {
    console.error('Update article error:', error);
    res.status(500).json({ error: '更新失败：' + error.message });
  }
}

// 删除文章
async function deleteArticle(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ error: '不允许的请求方法' });
  }

  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: '需要管理员权限' });
  }

  const { slug } = req.query;

  if (!slug || Array.isArray(slug)) {
    return res.status(400).json({ error: '无效的文章 slug' });
  }

  try {
    // 尝试两种路径格式
    let dirPath = path.join(POSTS_DIR, slug as string);
    let filePath = path.join(POSTS_DIR, `${slug}.md`);

    try {
      await fs.access(dirPath);
      // 如果是目录，删除整个目录
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch {
      // 如果是文件，删除文件
      await fs.access(filePath);
      await fs.unlink(filePath);
    }

    res.json({ message: '文章已删除' });
  } catch (error: any) {
    console.error('Delete article error:', error);
    res.status(404).json({ error: '删除失败：' + error.message });
  }
}

async function articleHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { method } = req;

  switch (method) {
    case 'GET':
      return getArticle(req, res);
    case 'PUT':
      return updateArticle(req, res);
    case 'DELETE':
      return deleteArticle(req, res);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).json({ error: `不允许的请求方法：${method}` });
  }
}

export default withAuth(articleHandler, { required: true, admin: true });
