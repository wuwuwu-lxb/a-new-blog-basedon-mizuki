---
// Chat 设置 API - 获取和保存配置
import type { APIRoute } from 'astro';

const STORAGE_KEY = 'chat-settings';

// 默认配置
const defaultConfig = {
  systemPrompt: "你是一个友好、博学的助手，名字叫 Mizuki。请用简洁、温暖的语气回答问题。",
  apiEndpoint: "/api/chat",
  model: "gpt-3.5-turbo",
  temperature: 0.7,
};

export const GET: APIRoute = async () => {
  try {
    // 从 localStorage 或数据库读取配置
    // 由于是服务器端 API，我们需要使用数据库或文件存储
    // 这里我们先返回默认配置，后续可以集成到 Prisma

    return new Response(JSON.stringify({
      success: true,
      config: defaultConfig,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: '获取配置失败',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { config } = body;

    // 验证配置
    if (!config) {
      return new Response(JSON.stringify({
        success: false,
        error: '配置数据不能为空',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 保存配置到文件
    // 注意：在生产环境中，应该使用数据库存储
    // 这里使用 JSON 文件临时存储

    const fs = await import('fs');
    const path = await import('path');

    const configPath = path.join(process.cwd(), 'chat-config.json');
    const configData = {
      ...defaultConfig,
      ...config,
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));

    return new Response(JSON.stringify({
      success: true,
      config: configData,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('保存配置失败:', error);
    return new Response(JSON.stringify({
      success: false,
      error: '保存配置失败',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
---
