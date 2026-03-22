/**
 * GET /api/admin/articles/[slug] - 获取文章详情
 * PUT /api/admin/articles/[slug] - 更新文章
 * DELETE /api/admin/articles/[slug] - 删除文章
 */

import type { APIRoute } from 'astro';
import { prisma } from '@/lib/prisma';
import MarkdownIt from 'markdown-it';

// Markdown 解析器
const markdownParser = new MarkdownIt();

/**
 * 创建或获取标签
 */
async function findOrCreateTag(name: string): Promise<{ id: number; name: string; slug: string }> {
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  let tag = await prisma.tag.findUnique({ where: { slug } });
  if (!tag) {
    tag = await prisma.tag.create({
      data: { name, slug },
    });
  }
  return tag;
}

/**
 * 创建或获取分类
 */
async function findOrCreateCategory(name: string): Promise<{ id: number; name: string; slug: string }> {
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  let category = await prisma.category.findUnique({ where: { slug } });
  if (!category) {
    category = await prisma.category.create({
      data: { name, slug },
    });
  }
  return category;
}

export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  const slug = url.pathname.split('/').filter(Boolean).pop() || '';

  if (!slug) {
    return new Response(JSON.stringify({ error: '无效的文章 slug' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const article = await prisma.article.findUnique({
      where: { slug },
      include: {
        tags: true,
        categories: true,
      },
    });

    if (!article) {
      return new Response(JSON.stringify({ error: '文章不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        article: {
          id: article.id,
          slug: article.slug,
          title: article.title,
          description: article.excerpt || '',
          content: article.rawContent, // 返回原始 Markdown
          published: article.published,
          publishedAt: article.publishedAt,
          tags: article.tags.map((t) => t.name),
          category: article.categories[0]?.name || null,
          image: article.cover,
          draft: article.draft,
          views: article.views,
          pinned: article.pinned,
          priority: article.priority,
          lang: article.lang,
          comment: article.comment,
          authorName: article.authorName,
          sourceLink: article.sourceLink,
          licenseName: article.licenseName,
          licenseUrl: article.licenseUrl,
          encrypted: article.encrypted,
          password: article.password,
          permalink: article.permalink,
          alias: article.alias,
          prevSlug: article.prevSlug,
          prevTitle: article.prevTitle,
          nextSlug: article.nextSlug,
          nextTitle: article.nextTitle,
          createdAt: article.createdAt,
          updatedAt: article.updatedAt,
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Get article error:', error);
    return new Response(JSON.stringify({ error: '服务器错误：' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PUT({ request }: { request: Request }) {
  const url = new URL(request.url);
  const slug = url.pathname.split('/').filter(Boolean).pop() || '';

  try {
    const body = await request.json();
    const {
      title,
      description,
      content,
      tags,
      category,
      image,
      published,
      draft,
      views,
      // 扩展字段
      lang,
      pinned,
      comment,
      priority,
      authorName,
      sourceLink,
      licenseName,
      licenseUrl,
      encrypted,
      password,
      permalink,
      alias,
    } = body;

    // 检查文章是否存在
    const existing = await prisma.article.findUnique({ where: { slug } });
    if (!existing) {
      return new Response(JSON.stringify({ error: '文章不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 将 Markdown 转换为 HTML
    const htmlContent = content ? markdownParser.render(content) : existing.content;

    // 处理标签和分类
    const tagRecords = tags?.length
      ? await Promise.all(tags.map((t: string) => findOrCreateTag(t)))
      : [];
    const categoryRecord = category
      ? await findOrCreateCategory(category)
      : null;

    // 构建更新数据
    // 注意：published 可能是布尔值（发布状态）或日期字符串（发布日期）
    const isPublishedValue = typeof published === 'boolean' ? published : existing.published;
    const publishedDateValue = typeof published === 'string' ? new Date(published) : existing.publishedAt;

    const updateData: any = {
      title: title || existing.title,
      content: htmlContent,
      rawContent: content !== undefined ? content : existing.rawContent,
      excerpt: description !== undefined ? description : existing.excerpt,
      cover: image !== undefined ? image : existing.cover,
      published: isPublishedValue,
      draft: draft !== undefined ? draft : existing.draft,
      views: views !== undefined ? views : existing.views,
      publishedAt: publishedDateValue,
      lang: lang !== undefined ? lang : existing.lang,
      pinned: pinned !== undefined ? pinned : existing.pinned,
      comment: comment !== undefined ? comment : existing.comment,
      priority: priority !== undefined ? priority : existing.priority,
      authorName: authorName !== undefined ? authorName : existing.authorName,
      sourceLink: sourceLink !== undefined ? sourceLink : existing.sourceLink,
      licenseName: licenseName !== undefined ? licenseName : existing.licenseName,
      licenseUrl: licenseUrl !== undefined ? licenseUrl : existing.licenseUrl,
      encrypted: encrypted !== undefined ? encrypted : existing.encrypted,
      password: password !== undefined ? password : existing.password,
      permalink: permalink !== undefined ? permalink : existing.permalink,
      alias: alias !== undefined ? alias : existing.alias,
    };

    // 更新标签关联
    if (tags !== undefined) {
      updateData.tags = {
        disconnect: await prisma.tag.findMany({
          where: { articles: { some: { slug } } },
          select: { id: true },
        }),
        connect: tagRecords.map((t) => ({ id: t.id })),
      };
    }

    // 更新分类关联
    if (category !== undefined) {
      // 先获取当前分类
      const currentArticle = await prisma.article.findUnique({
        where: { slug },
        select: { categories: { select: { id: true } } },
      });

      if (currentArticle && currentArticle.categories.length > 0) {
        // 断开现有分类
        await prisma.article.update({
          where: { slug },
          data: { categories: { disconnect: currentArticle.categories.map(c => ({ id: c.id })) } },
        });
      }

      // 如果有新分类，连接它
      if (categoryRecord) {
        updateData.categories = { connect: [{ id: categoryRecord.id }] };
      }
    }

    const article = await prisma.article.update({
      where: { slug },
      data: updateData,
    });

    return new Response(
      JSON.stringify({
        message: '文章更新成功',
        article: {
          id: article.id,
          slug: article.slug,
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
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
    const existing = await prisma.article.findUnique({ where: { slug } });
    if (!existing) {
      return new Response(JSON.stringify({ error: '文章不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 删除文章（评论会级联删除）
    await prisma.article.delete({ where: { slug } });

    return new Response(JSON.stringify({ message: '文章已删除' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Delete article error:', error);
    return new Response(JSON.stringify({ error: '删除失败：' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
