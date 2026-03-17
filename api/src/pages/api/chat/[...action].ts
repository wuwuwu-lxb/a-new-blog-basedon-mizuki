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
  const { action } = req.query;

  // 将 action 参数转换为数组格式供路由处理
  if (action) {
    req.query.action = Array.isArray(action) ? action : [action];
  }

  return chatHandler(req, res);
}
