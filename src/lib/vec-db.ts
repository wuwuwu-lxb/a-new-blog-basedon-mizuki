/**
 * 向量数据库工具 - 基于 sqlite-vec
 * 用于 RAG 文章搜索
 */

import 'dotenv/config';
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import path from 'path';

// 数据库路径（与 Prisma 共用一个数据库文件）
const DB_PATH = path.join(process.cwd(), 'prisma', 'dev.db');

let db: Database.Database | null = null;

/**
 * 获取数据库实例
 */
export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    // 加载 sqlite-vec 扩展
    sqliteVec.load(db);
  }
  return db;
}

/**
 * 初始化向量表
 */
export function initVecTable() {
  const database = getDb();

  // 创建文章向量表
  database.exec(`
    CREATE TABLE IF NOT EXISTS article_vectors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      content_chunk TEXT NOT NULL,
      embedding F32_BLOB(1536),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建向量索引（使用 sqlite-vec 的向量索引）
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_article_vectors_slug ON article_vectors(slug)
  `);

  console.log('[sqlite-vec] 向量表初始化完成');
}

/**
 * 生成文本向量（调用 OpenAI 或阿里云 DashScope Embedding API）
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
  const EMBEDDING_API_URL = process.env.EMBEDDING_API_URL;

  // 检测是否使用阿里云 DashScope
  const isAliyun = EMBEDDING_API_URL?.includes('dashscope');

  // 阿里云使用 DASHSCOPE_API_KEY，其他使用 OPENAI_API_KEY
  const API_KEY = isAliyun ? process.env.DASHSCOPE_API_KEY : process.env.OPENAI_API_KEY;

  if (!API_KEY) {
    throw new Error(isAliyun ? '未配置 DASHSCOPE_API_KEY 环境变量' : '未配置 OPENAI_API_KEY 环境变量');
  }

  try {
    const url = EMBEDDING_API_URL;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    headers['Authorization'] = `Bearer ${API_KEY}`;

    // 构建请求体 - DashScope 和 OpenAI 格式不同
    let body: any;
    if (isAliyun) {
      // 阿里云 DashScope 格式
      body = {
        model: EMBEDDING_MODEL,
        input: { texts: [text] },
      };
    } else {
      // OpenAI 兼容格式
      body = {
        model: EMBEDDING_MODEL,
        input: text,
        encoding_format: 'float',
      };
    }

    const response = await fetch(url!, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Embedding API 请求失败: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // 解析响应 - DashScope 和 OpenAI 格式不同
    let embedding: number[] = [];
    if (isAliyun) {
      embedding = data.output?.embeddings?.[0]?.embedding || [];
    } else {
      embedding = data.data?.[0]?.embedding || [];
    }

    if (embedding.length === 0) {
      throw new Error('Embedding 返回为空');
    }

    return embedding;
  } catch (error) {
    console.error('生成向量失败:', error);
    throw error;
  }
}

/**
 * 将文本分块（用于 RAG）
 * 每块约 500-1000 字符，重叠 100 字符
 */
export function chunkText(text: string, chunkSize: number = 800, overlap: number = 100): string[] {
  // 清理 markdown 符号
  const cleaned = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length);
    let chunk = cleaned.slice(start, end);

    // 尝试在句子边界处切断
    if (end < cleaned.length) {
      const lastPeriod = chunk.lastIndexOf('。');
      const lastQuestion = chunk.lastIndexOf('?');
      const lastExclaim = chunk.lastIndexOf('!');
      const lastNewline = chunk.lastIndexOf('\n');

      const breakPoint = Math.max(lastPeriod, lastQuestion, lastExclaim, lastNewline);
      if (breakPoint > chunkSize / 2) {
        chunk = chunk.slice(0, breakPoint + 1);
      }
    }

    if (chunk.trim()) {
      chunks.push(chunk.trim());
    }

    start += chunkSize - overlap;
    if (start >= cleaned.length) break;
  }

  return chunks;
}

/**
 * 保存文章向量
 */
export async function saveArticleVector(slug: string, title: string, content: string): Promise<void> {
  const database = getDb();

  // 先删除旧的向量
  database.prepare('DELETE FROM article_vectors WHERE slug = ?').run(slug);

  // 分块
  const chunks = chunkText(content);

  // 生成所有 embedding
  const embeddings = await Promise.all(chunks.map(chunk => generateEmbedding(chunk)));

  // 使用事务插入数据库
  const insertStmt = database.prepare(`
    INSERT OR REPLACE INTO article_vectors (slug, title, content_chunk, embedding)
    VALUES (?, ?, ?, ?)
  `);

  const transaction = database.transaction(() => {
    for (let i = 0; i < chunks.length; i++) {
      const embeddingBuffer = new Float32Array(embeddings[i]);
      insertStmt.run(slug, title, chunks[i], embeddingBuffer);
    }
  })();

  console.log(`[sqlite-vec] 已保存文章向量：${slug}, chunks: ${chunks.length}`);
}

/**
 * 向量相似度搜索（异步版本）
 */
export async function searchVectors(query: string, limit: number = 5): Promise<Array<{
  slug: string;
  title: string;
  content_chunk: string;
  similarity: number;
}>> {
  const database = getDb();

  // 生成查询向量
  const queryEmbedding = await generateEmbedding(query);
  const queryBuffer = new Float32Array(queryEmbedding);

  // 使用 sqlite-vec 的向量相似度搜索
  const stmt = database.prepare(`
    SELECT
      slug,
      title,
      content_chunk,
      vec_distance_cosine(embedding, ?) as similarity
    FROM article_vectors
    ORDER BY similarity ASC
    LIMIT ?
  `);

  const results = stmt.all(queryBuffer, limit) as Array<{
    slug: string;
    title: string;
    content_chunk: string;
    similarity: number;
  }>;

  // 按相似度降序排列（cosine distance 越小越相似）
  return results;
}

/**
 * 删除文章向量
 */
export function deleteArticleVector(slug: string): void {
  const database = getDb();
  database.prepare('DELETE FROM article_vectors WHERE slug = ?').run(slug);
  console.log(`[sqlite-vec] 已删除文章向量：${slug}`);
}

/**
 * 获取所有已向量化的文章
 */
export function getAllVectors(): Array<{ slug: string; title: string; created_at: string }> {
  const database = getDb();
  return database.prepare(`
    SELECT slug, title, created_at FROM article_vectors
    GROUP BY slug
    ORDER BY created_at DESC
  `).all() as Array<{ slug: string; title: string; created_at: string }>;
}

/**
 * 重新向量化所有文章（用于 Astro API 运行时）
 */
export async function reindexAllArticles(): Promise<{ success: number; failed: string[] }> {
  const { prisma } = await import('@/lib/prisma');

  const result = { success: 0, failed: [] as string[] };

  try {
    const posts = await prisma.article.findMany({
      where: { published: true },
      select: { slug: true, title: true, content: true },
    });

    for (const post of posts) {
      try {
        // content 字段已经存储了 HTML，需要转换为纯文本
        const textContent = post.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        await saveArticleVector(post.slug, post.title, textContent);
        result.success++;
      } catch (error) {
        console.error(`向量化文章失败 ${post.slug}:`, error);
        result.failed.push(post.slug);
      }
    }

    console.log(`[sqlite-vec] 重新索引完成：成功 ${result.success}, 失败 ${result.failed.length}`);
  } catch (error) {
    console.error('[sqlite-vec] 重新索引失败:', error);
  }

  return result;
}
