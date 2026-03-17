/**
 * API Route Handler - Admin Upload
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/routes/admin/upload';

export const config = {
  api: {
    bodyParser: false, // multer 需要自己处理 body
    externalResolver: true,
  },
};

export default handler;
