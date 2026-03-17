/**
 * POST /api/chat
 * 聊天 API - 接入大模型
 *
 * GET /api/chat/sessions
 * 获取聊天会话列表
 *
 * GET /api/chat/sessions/[sessionId]
 * 获取指定会话的聊天记录
 *
 * DELETE /api/chat/sessions/[sessionId]
 * 删除聊天会话
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { z } from 'zod';
import axios from 'axios';

// 发送消息验证 schema
const chatMessageSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    })
  ).min(1, '至少需要一条消息'),
  sessionId: z.string().optional(),
});

// 配置
const CHAT_API_URL = process.env.CHAT_API_URL || 'https://api.openai.com/v1/chat/completions';
const CHAT_MODEL = process.env.CHAT_MODEL || 'gpt-3.5-turbo';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MAX_TOKENS = 2000;
const TEMPERATURE = 0.7;

/**
 * 调用大模型 API
 */
async function callLLMAPI(messages: Array<{ role: string; content: string }>) {
  if (!OPENAI_API_KEY) {
    throw new Error('未配置 OPENAI_API_KEY 环境变量');
  }

  try {
    const response = await axios.post(
      CHAT_API_URL,
      {
        model: CHAT_MODEL,
        messages,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        stream: false,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        timeout: 30000,
      }
    );

    return response.data.choices?.[0]?.message?.content || '抱歉，我没有理解你的问题。';
  } catch (error: any) {
    console.error('LLM API Error:', error.response?.data || error.message);

    if (error.response?.status === 401) {
      throw new Error('API 密钥无效');
    }
    if (error.response?.status === 429) {
      throw new Error('请求过于频繁，请稍后再试');
    }
    if (error.response?.status === 500) {
      throw new Error('AI 服务暂时不可用');
    }

    throw new Error('AI 请求失败，请稍后重试');
  }
}

/**
 * 发送聊天消息
 */
async function sendMessage(req: NextApiRequest, res: NextApiResponse) {
  try {
    const body = chatMessageSchema.parse(req.body);

    // 格式化消息
    const formattedMessages = body.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 调用 LLM API
    const assistantContent = await callLLMAPI(formattedMessages);

    // 如果有 sessionId，保存对话到数据库
    let session = null;
    let savedMessage = null;

    if (body.sessionId) {
      // 查找或创建会话
      session = await prisma.chatSession.findUnique({
        where: { sessionId: body.sessionId },
      });

      if (!session) {
        // 创建新会话，使用第一条用户消息作为标题
        const firstUserMessage = body.messages.find((m) => m.role === 'user');
        session = await prisma.chatSession.create({
          data: {
            sessionId: body.sessionId!,
            title: firstUserMessage?.content.slice(0, 50) || '新对话',
          },
        });
      }

      // 保存用户消息
      const userMessage = body.messages[body.messages.length - 1];
      savedMessage = await prisma.message.create({
        data: {
          sessionId: session.id,
          role: userMessage.role.toUpperCase() as any,
          content: userMessage.content,
        },
      });

      // 保存 AI 回复
      await prisma.message.create({
        data: {
          sessionId: session.id,
          role: 'ASSISTANT',
          content: assistantContent,
        },
      });
    }

    res.json({
      content: assistantContent,
      sessionId: session?.sessionId,
      messageId: savedMessage?.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: '参数验证失败',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    console.error('Chat error:', error);

    if (error instanceof Error) {
      if (error.message.includes('OPENAI_API_KEY')) {
        return res.status(503).json({
          error: '聊天服务未配置',
          message: '请联系管理员配置 AI 服务',
        });
      }
      return res.status(500).json({ error: error.message });
    }

    res.status(500).json({ error: '服务器错误' });
  }
}

/**
 * 获取会话列表
 */
async function getSessions(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const sessions = await prisma.chatSession.findMany({
      skip,
      take: limitNum,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    const total = await prisma.chatSession.count();

    res.json({
      sessions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

/**
 * 获取会话详情
 */
async function getSession(req: NextApiRequest, res: NextApiResponse) {
  const { sessionId } = req.query;

  if (!sessionId || Array.isArray(sessionId)) {
    return res.status(400).json({ error: '无效的会话 ID' });
  }

  try {
    const session = await prisma.chatSession.findUnique({
      where: { sessionId: sessionId as string },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

/**
 * 删除会话
 */
async function deleteSession(req: NextApiRequest, res: NextApiResponse) {
  const { sessionId } = req.query;

  if (!sessionId || Array.isArray(sessionId)) {
    return res.status(400).json({ error: '无效的会话 ID' });
  }

  try {
    await prisma.chatSession.delete({
      where: { sessionId: sessionId as string },
    });

    res.json({ message: '会话已删除' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

// 主处理函数
async function chatHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { method } = req;
  const { action } = req.query;

  // 路由分发
  const actionPath = Array.isArray(action) ? action.join('/') : action;

  switch (actionPath) {
    case 'sessions':
      if (method === 'GET') return getSessions(req, res);
      break;
    case undefined:
    case '':
      if (method === 'POST') return sendMessage(req, res);
      break;
    default:
      // 处理 /sessions/[sessionId] 路由
      if (actionPath?.startsWith('sessions/')) {
        const sessionPath = actionPath.replace('sessions/', '');
        req.query.sessionId = sessionPath;

        if (method === 'GET') return getSession(req, res);
        if (method === 'DELETE') return deleteSession(req, res);
      }
  }

  res.setHeader('Allow', ['POST', 'GET', 'DELETE']);
  res.status(405).json({ error: `不允许的请求方法：${method}` });
}

export default withAuth(chatHandler, { required: false });
