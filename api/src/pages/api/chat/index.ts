/**
 * API Route Handler - Chat
 * 处理聊天相关的 API 请求
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import chatHandler from '@/routes/chat/index';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
};

export default async function chatApiHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 设置 action 为空数组，让路由处理 POST 请求
  req.query.action = [];
  return chatHandler(req, res);
}
