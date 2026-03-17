/**
 * POST /api/admin/sync-content - 强制同步内容
 * 触发 Astro Content Collections 重新扫描内容目录
 */

import type { APIRoute } from 'astro';

export async function POST({ request }: { request: Request }) {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const postsDir = path.join(process.cwd(), 'src/content/posts');

    // 获取所有 .md 文件，然后 touch 它们来触发 Astro 重新扫描
    const files = await fs.readdir(postsDir, { withFileTypes: true });
    const mdFiles: string[] = [];

    // 收集所有 .md 文件和目录下的 index.md
    for (const file of files) {
      if (file.isDirectory()) {
        const indexPath = path.join(postsDir, file.name, 'index.md');
        try {
          await fs.access(indexPath);
          mdFiles.push(indexPath);
        } catch {
          // 没有 index.md，跳过
        }
      } else if (file.name.endsWith('.md')) {
        mdFiles.push(path.join(postsDir, file.name));
      }
    }

    // 如果没有找到任何文件，至少 touch 一下目录
    if (mdFiles.length === 0) {
      const touchFile = path.join(postsDir, '.astro-sync-trigger');
      await fs.writeFile(touchFile, String(Date.now()), 'utf-8');
      setTimeout(async () => {
        try { await fs.unlink(touchFile); } catch {}
      }, 100);
    } else {
      // Touch 所有 .md 文件（更新 mtime）来触发 Astro 的文件监视器
      const now = new Date();
      for (const filePath of mdFiles) {
        try {
          await fs.utimes(filePath, now, now);
        } catch (err) {
          console.warn(`Failed to touch file: ${filePath}`, err);
        }
      }
    }

    // 等待一小段时间确保 Astro 检测到文件变化
    // 在开发模式下，Astro 应该会重新加载 Content Collections
    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

    return new Response(JSON.stringify({
      message: isDev ? '内容已同步，Astro 检测到文件变化后会自动刷新（可能需要几秒）' : '内容已同步，请刷新页面查看最新内容',
      timestamp: new Date().toISOString(),
      touchedFiles: mdFiles.length,
      isDev,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error: any) {
    console.error('Sync content error:', error);
    return new Response(JSON.stringify({ error: '同步失败：' + error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
