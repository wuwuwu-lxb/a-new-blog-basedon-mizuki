/**
 * 初始化 RAG 向量索引
 * 使用方式：pnpm vec-init
 */

// 加载环境变量
import 'dotenv/config';

import { initVecTable, saveArticleVector, chunkText, generateEmbedding } from '../src/lib/vec-db';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

// 文章内容目录
const CONTENT_DIR = join(process.cwd(), 'src/content/posts');

/**
 * 获取所有文章
 */
function getPosts(): Array<{ slug: string; title: string; content: string }> {
  const posts: Array<{ slug: string; title: string; content: string }> = [];

  if (!readdirSync(CONTENT_DIR)) {
    return posts;
  }

  const slugDirs = readdirSync(CONTENT_DIR);

  for (const slug of slugDirs) {
    const mdPath = join(CONTENT_DIR, slug, 'index.md');
    try {
      const content = readFileSync(mdPath, 'utf-8');
      const { data, content: body } = matter(content);

      // 跳过草稿
      if (data.draft) continue;

      posts.push({
        slug,
        title: data.title || slug,
        content: body,
      });
    } catch (error) {
      console.error(`读取文章失败 ${slug}:`, error);
    }
  }

  return posts;
}

async function main() {
  console.log('🚀 开始初始化 RAG 向量索引...\n');

  // 初始化向量表
  console.log('1️⃣ 初始化向量表...');
  try {
    initVecTable();
    console.log('✅ 向量表初始化完成\n');
  } catch (error) {
    console.error('❌ 向量表初始化失败:', error);
    process.exit(1);
  }

  // 获取所有文章
  console.log('2️⃣ 获取文章列表...');
  const posts = getPosts();
  console.log(`📚 找到 ${posts.length} 篇文章\n`);

  // 向量化所有文章
  console.log('3️⃣ 向量化所有文章...');
  let success = 0;
  let failed: string[] = [];

  for (const post of posts) {
    try {
      await saveArticleVector(post.slug, post.title, post.content);
      success++;
      console.log(`  ✅ ${post.slug}`);
    } catch (error: any) {
      console.error(`  ❌ ${post.slug}:`, error?.message || error);
      failed.push(post.slug);
    }
  }

  console.log('\n✅ 向量化完成!');
  console.log(`   成功：${success} 篇`);
  console.log(`   失败：${failed.length} 篇`);
  if (failed.length > 0) {
    console.log(`   失败列表：${failed.join(', ')}`);
  }

  console.log('\n🎉 RAG 向量索引初始化完成!');
}

main().catch(console.error);
