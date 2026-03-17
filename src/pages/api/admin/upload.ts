/**
 * POST /api/admin/upload - 上传图片
 */

import type { APIRoute } from 'astro';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
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

    // 生成唯一文件名
    const ext = path.extname(file.name);
    const filename = `upload-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;

    // 确保上传目录存在
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 保存文件
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    const imageUrl = `/uploads/images/${filename}`;

    return new Response(JSON.stringify({
      message: '上传成功',
      url: imageUrl,
      filename,
      size: file.size,
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
