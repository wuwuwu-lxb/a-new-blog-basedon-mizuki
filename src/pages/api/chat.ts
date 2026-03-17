/**
 * POST /api/chat
 * 聊天 API - 接入大模型
 */

import type { APIRoute } from "astro";

// 配置
const CHAT_API_URL = import.meta.env.CHAT_API_URL || "https://api.openai.com/v1/chat/completions";
const CHAT_MODEL = import.meta.env.CHAT_MODEL || "gpt-3.5-turbo";
const OPENAI_API_KEY = import.meta.env.OPENAI_API_KEY;
const MAX_TOKENS = 2000;
const TEMPERATURE = 0.7;

/**
 * 调用大模型 API
 */
async function callLLMAPI(messages: Array<{ role: string; content: string }>) {
  if (!OPENAI_API_KEY) {
    throw new Error("未配置 OPENAI_API_KEY 环境变量");
  }

  try {
    const response = await fetch(CHAT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 401) {
        throw new Error("API 密钥无效");
      }
      if (response.status === 429) {
        throw new Error("请求过于频繁，请稍后再试");
      }
      if (response.status === 500) {
        throw new Error("AI 服务暂时不可用");
      }

      throw new Error(errorData.error?.message || "AI 请求失败，请稍后重试");
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "抱歉，我没有理解你的问题。";
  } catch (error) {
    console.error("LLM API Error:", error);
    throw error;
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    // 验证请求
    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(
        JSON.stringify({
          error: "参数验证失败",
          message: "需要 messages 数组",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 格式化消息
    const formattedMessages = body.messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    // 调用 LLM API
    const assistantContent = await callLLMAPI(formattedMessages);

    return new Response(
      JSON.stringify({
        content: assistantContent,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Chat error:", error);

    if (error instanceof Error) {
      if (error.message.includes("OPENAI_API_KEY")) {
        return new Response(
          JSON.stringify({
            error: "聊天服务未配置",
            message: "请联系管理员配置 AI 服务",
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      return new Response(
        JSON.stringify({
          error: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: "服务器错误",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
