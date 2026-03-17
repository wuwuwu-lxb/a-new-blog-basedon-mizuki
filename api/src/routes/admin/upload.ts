/**
 * POST /api/admin/upload
 * 上传图片文件
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const runMiddleware = promisify(multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'images');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `upload-${uniqueSuffix}${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('只支持图片文件：jpeg, jpg, png, gif, webp, svg'));
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
}).single('image'));

async function uploadHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: '不允许的请求方法' });
  }

  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: '需要管理员权限' });
  }

  try {
    await runMiddleware(req, res);

    if (!(req.file as Express.Multer.File)) {
      return res.status(400).json({ error: '请上传图片文件' });
    }

    const file = req.file as Express.Multer.File;
    const imageUrl = `/uploads/images/${file.filename}`;

    res.json({
      message: '上传成功',
      url: imageUrl,
      filename: file.filename,
      size: file.size,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    if (error.message.includes('只支持图片文件')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小超过 5MB 限制' });
    }
    res.status(500).json({ error: '上传失败：' + error.message });
  }
}

export default withAuth(uploadHandler, { required: true, admin: true });
