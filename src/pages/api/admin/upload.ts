/**
 * POST /api/admin/upload - 上传图片（Base64 存入数据库）
 * POST /api/admin/upload?articleSlug=xxx - 上传到指定文章
 */

import type { APIRoute } from 'astro';
import { prisma } from '@/lib/prisma';
import path from 'path';

export async function POST({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const articleSlug = url.searchParams.get('articleSlug');

    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: '请上传图片文件' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: '只支持图片文件：jpeg, jpg, png, gif, webp, svg' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: '文件大小超过 5MB 限制' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 转为 Base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // 生成图片 ID
    const imageId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const filename = file.name || `${imageId}${path.extname(file.name)}`;

    // 如果有 articleSlug，存入 Article.images
    if (articleSlug) {
      const article = await prisma.article.findUnique({
        where: { slug: articleSlug },
      });

      if (!article) {
        return new Response(JSON.stringify({ error: '文章不存在' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 获取现有 images（处理 null 情况）
      let existingImages: any[] = [];
      if (article.images) {
        try {
          existingImages = JSON.parse(article.images);
        } catch (e) {
          console.error('Failed to parse existing images:', e);
          existingImages = [];
        }
      }

      // 添加新图片
      const newImage = {
        id: imageId,
        name: filename,
        base64: dataUrl,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      };

      const imagesJson = JSON.stringify([...existingImages, newImage]);

      // 调试日志
      console.log(`Updating article ${articleSlug} with ${existingImages.length + 1} images`);

      try {
        // 更新文章
        await prisma.article.update({
          where: { slug: articleSlug },
          data: { images: imagesJson },
        });
      } catch (dbError: any) {
        console.error('Prisma update error:', dbError);
        return new Response(JSON.stringify({
          error: '数据库更新失败：' + dbError.message,
          details: dbError.code || 'UNKNOWN_ERROR'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        message: '上传成功',
        url: dataUrl,
        filename,
        size: file.size,
        imageId,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 没有 articleSlug 时，只返回 Base64（不存数据库）
    return new Response(JSON.stringify({
      message: '上传成功',
      url: dataUrl,
      filename,
      size: file.size,
      imageId,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ error: '上传失败：' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
