/**
 * 迁移脚本：将 Markdown 文章迁移到数据库
 * 使用方法: node scripts/migrate-articles-to-db.js
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { PrismaClient } = require('@prisma/client');
const MarkdownIt = require('markdown-it');

const prisma = new PrismaClient();
const md = new MarkdownIt();

// 文章源目录 - 使用绝对路径
const PROJECT_ROOT = '/home/wuwuwu/.openclaw/workspace/Mizuki';
const POSTS_DIR = path.join(PROJECT_ROOT, 'src/content/posts');

/**
 * 将 slug 转换为合法的 slug 格式
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '');
}

/**
 * 迁移单个文章
 */
async function migrateArticle(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { data, content: body } = matter(content);

  // 获取 slug（目录名）
  const dirName = path.dirname(filePath).split('/').pop();
  const slug = dirName;

  // 将 markdown 转换为 HTML
  const htmlContent = md.render(body || '');

  // 处理发布日期
  let publishedAt = null;
  if (data.published) {
    publishedAt = new Date(data.published);
    if (isNaN(publishedAt.getTime())) {
      publishedAt = new Date();
    }
  } else {
    publishedAt = new Date();
  }

  // 查找管理员用户
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (!adminUser) {
    throw new Error('未找到管理员用户，请先创建管理员账户');
  }

  // upsert 文章
  const article = await prisma.article.upsert({
    where: { slug },
    update: {
      title: data.title || slug,
      rawContent: body || '',
      content: htmlContent,
      excerpt: data.description || null,
      cover: data.image || null,
      published: data.draft !== true,
      publishedAt,
      modifiedAt: data.updated ? new Date(data.updated) : null,
      lang: data.lang || null,
      pinned: data.pinned || false,
      comment: data.comment !== false,
      priority: data.priority || null,
      authorName: data.author || null,
      sourceLink: data.sourceLink || null,
      licenseName: data.licenseName || null,
      licenseUrl: data.licenseUrl || null,
      encrypted: data.encrypted || false,
      password: data.password || null,
      permalink: data.permalink || null,
      alias: data.alias || null,
    },
    create: {
      title: data.title || slug,
      slug,
      rawContent: body || '',
      content: htmlContent,
      excerpt: data.description || null,
      cover: data.image || null,
      published: data.draft !== true,
      publishedAt,
      views: data.views || 0,
      modifiedAt: data.updated ? new Date(data.updated) : null,
      lang: data.lang || null,
      pinned: data.pinned || false,
      comment: data.comment !== false,
      priority: data.priority || null,
      authorName: data.author || null,
      sourceLink: data.sourceLink || null,
      licenseName: data.licenseName || null,
      licenseUrl: data.licenseUrl || null,
      encrypted: data.encrypted || false,
      password: data.password || null,
      permalink: data.permalink || null,
      alias: data.alias || null,
      authorId: adminUser.id,
    },
  });

  // 处理标签
  if (data.tags && Array.isArray(data.tags)) {
    for (const tagName of data.tags) {
      const tagSlug = slugify(tagName);
      await prisma.tag.upsert({
        where: { slug: tagSlug },
        create: { name: tagName, slug: tagSlug },
        update: {},
      });

      await prisma.article.update({
        where: { id: article.id },
        data: {
          tags: {
            connect: { slug: tagSlug },
          },
        },
      });
    }
  }

  // 处理分类
  if (data.category) {
    const catSlug = slugify(data.category);
    await prisma.category.upsert({
      where: { slug: catSlug },
      create: { name: data.category, slug: catSlug },
      update: {},
    });

    await prisma.article.update({
      where: { id: article.id },
      data: {
        categories: {
          connect: { slug: catSlug },
        },
      },
    });
  }

  return article;
}

/**
 * 计算并更新 prev/next 链接
 */
async function computePrevNextLinks() {
  // 获取所有已发布的文章，按发布日期降序排序
  const articles = await prisma.article.findMany({
    where: { published: true },
    orderBy: { publishedAt: 'desc' },
    select: { id: true, slug: true, title: true },
  });

  console.log(`\n计算 prev/next 链接，共 ${articles.length} 篇文章`);

  // 计算 numericId（序号，越新越大）
  const total = articles.length;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const prev = articles[i + 1]; // 下一篇（更早发布的）
    const next = articles[i - 1]; // 上一篇（更新的）

    await prisma.article.update({
      where: { id: article.id },
      data: {
        prevSlug: prev?.slug || null,
        prevTitle: prev?.title || null,
        nextSlug: next?.slug || null,
        nextTitle: next?.title || null,
        numericId: total - i,
      },
    });
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('='.repeat(50));
  console.log('开始迁移文章到数据库...');
  console.log('='.repeat(50));

  // 查找所有 markdown 文件
  const files = [];
  const entries = fs.readdirSync(POSTS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const indexPath = path.join(POSTS_DIR, entry.name, 'index.md');
      if (fs.existsSync(indexPath)) {
        files.push(indexPath);
      }
    }
  }

  console.log(`\n找到 ${files.length} 篇文章待迁移\n`);

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    const slug = path.dirname(file).split('/').pop();
    try {
      const article = await migrateArticle(file);
      const status = article.published ? '已发布' : '草稿';
      console.log(`✓ 迁移成功: ${slug} (id: ${article.id}, ${status})`);
      successCount++;
    } catch (error) {
      console.error(`✗ 迁移失败: ${slug} - ${error.message}`);
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`迁移完成: 成功 ${successCount}, 失败 ${failCount}`);
  console.log('='.repeat(50));

  // 计算 prev/next 链接
  if (successCount > 0) {
    try {
      await computePrevNextLinks();
      console.log('\n✓ prev/next 链接计算完成');
    } catch (error) {
      console.error('\n✗ prev/next 链接计算失败:', error.message);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
