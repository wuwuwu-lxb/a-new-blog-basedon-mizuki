/**
 * 数据库种子脚本
 * 用于初始化测试数据和管理员账户
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据库...');

  // 创建管理员账户
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@mizuki.com' },
    update: {},
    create: {
      email: 'admin@mizuki.com',
      name: '管理员',
      password: adminPassword,
      role: 'ADMIN',
      bio: '网站管理员',
    },
  });
  console.log('✓ 创建管理员账户：admin@mizuki.com / admin123');

  // 创建普通用户
  const userPassword = await bcrypt.hash('user123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'user@mizuki.com' },
    update: {},
    create: {
      email: 'user@mizuki.com',
      name: '测试用户',
      password: userPassword,
      role: 'USER',
      bio: '这是一个测试用户',
    },
  });
  console.log('✓ 创建测试用户：user@mizuki.com / user123');

  // 创建分类
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'tech' },
      update: {},
      create: {
        name: '技术',
        slug: 'tech',
        description: '技术相关文章',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'life' },
      update: {},
      create: {
        name: '生活',
        slug: 'life',
        description: '生活随笔',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'diary' },
      update: {},
      create: {
        name: '日记',
        slug: 'diary',
        description: '日常日记',
      },
    }),
  ]);
  console.log('✓ 创建分类：技术、生活、日记');

  // 创建标签
  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { slug: 'javascript' },
      update: {},
      create: { name: 'JavaScript', slug: 'javascript' },
    }),
    prisma.tag.upsert({
      where: { slug: 'typescript' },
      update: {},
      create: { name: 'TypeScript', slug: 'typescript' },
    }),
    prisma.tag.upsert({
      where: { slug: 'astro' },
      update: {},
      create: { name: 'Astro', slug: 'astro' },
    }),
    prisma.tag.upsert({
      where: { slug: 'nextjs' },
      update: {},
      create: { name: 'Next.js', slug: 'nextjs' },
    }),
    prisma.tag.upsert({
      where: { slug: 'daily' },
      update: {},
      create: { name: '日常', slug: 'daily' },
    }),
  ]);
  console.log('✓ 创建标签：JavaScript、TypeScript、Astro、Next.js、日常');

  // 创建示例文章
  const article1 = await prisma.article.create({
    data: {
      title: '欢迎来到 Mizuki 博客',
      slug: 'welcome-to-mizuki',
      content: `
# 欢迎来到 Mizuki 博客

这是一个基于 Astro 和 Next.js 构建的全栈博客系统。

## 功能特性

- 📝 文章管理
- 💬 评论系统
- 🤖 AI 聊天
- 🎨 Live2D 看板娘
- 📱 响应式设计

## 技术栈

### 前端
- Astro 6.x
- Svelte 5.x
- Tailwind CSS 4.x

### 后端
- Next.js 14
- PostgreSQL
- Prisma ORM

感谢你使用 Mizuki 博客系统！
      `.trim(),
      excerpt: '欢迎来到 Mizuki 博客，这是一个功能齐全的全栈博客系统',
      published: true,
      publishedAt: new Date(),
      authorId: admin.id,
      categories: {
        connect: [{ id: categories[0].id }],
      },
      tags: {
        connect: [{ id: tags[2].id }, { id: tags[3].id }],
      },
    },
  });
  console.log('✓ 创建示例文章：欢迎来到 Mizuki 博客');

  const article2 = await prisma.article.create({
    data: {
      title: 'TypeScript 入门教程',
      slug: 'typescript-getting-started',
      content: `
# TypeScript 入门教程

TypeScript 是 JavaScript 的超集，添加了静态类型系统。

## 为什么使用 TypeScript？

1. **类型安全** - 在编译时发现错误
2. **更好的 IDE 支持** - 智能提示和重构
3. **代码可维护性** - 类型作为文档

## 快速开始

\`\`\`bash
npm install -g typescript
tsc --init
\`\`\`

## 基本类型

\`\`\`typescript
let name: string = 'Mizuki';
let age: number = 18;
let isStudent: boolean = true;
let hobbies: string[] = ['coding', 'reading'];
\`\`\`

祝你学习愉快！
      `.trim(),
      excerpt: 'TypeScript 入门教程，带你快速了解 TypeScript 的基本用法',
      published: true,
      publishedAt: new Date(),
      authorId: admin.id,
      categories: {
        create: { categoryId: categories[0].id },
      },
      tags: {
        create: { tagId: tags[1].id },
      },
    },
  });
  console.log('✓ 创建示例文章：TypeScript 入门教程');

  // 创建示例评论
  const comment1 = await prisma.comment.create({
    data: {
      content: '很好的博客，界面设计很漂亮！',
      articleId: article1.id,
      authorId: user.id,
      status: 'APPROVED',
    },
  });
  console.log('✓ 创建示例评论');

  // 创建回复
  await prisma.comment.create({
    data: {
      content: '感谢支持！',
      articleId: article1.id,
      parentId: comment1.id,
      authorId: admin.id,
      status: 'APPROVED',
    },
  });
  console.log('✓ 创建评论回复');

  console.log('\n数据库初始化完成！\n');
  console.log('=================================');
  console.log('管理员账户：admin@mizuki.com / admin123');
  console.log('博客作者：唔唔唔');
  console.log('=================================');
}

main()
  .catch((e) => {
    console.error('初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
