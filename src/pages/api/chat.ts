/**
 * POST /api/chat
 * 聊天 API - 接入大模型并支持 RAG 向量搜索
 */

import type { APIRoute } from "astro";
import { getSortedPosts } from "@utils/content-utils";
import { initVecTable, searchVectors } from "../../lib/vec-db";

// 配置
const CHAT_API_URL = import.meta.env.CHAT_API_URL || "https://api.openai.com/v1/chat/completions";
const CHAT_MODEL = import.meta.env.CHAT_MODEL || "gpt-3.5-turbo";
const OPENAI_API_KEY = import.meta.env.OPENAI_API_KEY;
const MAX_TOKENS = 2000;
const TEMPERATURE = 0.7;

// 初始化向量表
try {
  initVecTable();
} catch (error) {
  console.error('[RAG] 初始化向量表失败:', error);
}

/**
 * 搜索相关文章（优先使用向量搜索，回退到关键词搜索）
 */
async function searchArticles(query: string, limit: number = 3) {
  try {
    // 尝试向量搜索
    const vectorResults = await searchVectors(query, limit * 2);

    // 按 slug 分组，取每个文章的最佳匹配
    const slugMap = new Map();
    for (const result of vectorResults) {
      if (!slugMap.has(result.slug)) {
        slugMap.set(result.slug, {
          slug: result.slug,
          title: result.title,
          description: result.content_chunk.slice(0, 200) + '...',
          url: `/posts/${result.slug}`,
          similarity: 1 - result.similarity,
        });
      }
    }

    const results = Array.from(slugMap.values()).slice(0, limit);

    if (results.length > 0) {
      console.log(`[RAG] 向量搜索找到 ${results.length} 篇文章`);
      return results;
    }
  } catch (error) {
    console.error('[RAG] 向量搜索失败，回退到关键词搜索:', error);
  }

  // 回退到关键词搜索
  try {
    const posts = await getSortedPosts();

    const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

    const results = posts
      .filter((post) => {
        const title = post.title?.toLowerCase() || '';
        const tags = (post.tags || []).map(tag => tag.name.toLowerCase());
        const category = (post.categories[0]?.name || '').toLowerCase();
        const description = (post.excerpt || '').toLowerCase();
        const slug = post.slug.toLowerCase();

        return searchTerms.some(term =>
          title.includes(term) ||
          tags.some(tag => tag.includes(term)) ||
          category.includes(term) ||
          description.includes(term) ||
          slug.includes(term)
        );
      })
      .slice(0, limit)
      .map((post) => ({
        slug: post.slug,
        title: post.title,
        description: post.excerpt || '',
        url: `/posts/${post.slug}`,
      }));

    console.log(`[RAG] 关键词搜索找到 ${results.length} 篇文章`);
    return results;
  } catch (error) {
    console.error('关键词搜索失败:', error);
    return [];
  }
}

/**
 * 构建系统提示词（包含文章推荐）
 */
function buildSystemPrompt(basePrompt: string, articles?: Array<{ title: string; description: string; url: string }>) {
  let prompt = basePrompt;

  if (articles && articles.length > 0) {
    const articlesContext = articles
      .map((article, i) => `${i + 1}. [${article.title}](${article.url}) - ${article.description || '无描述'}`)
      .join('\n');

    prompt += `\n\n## 相关文章推荐
以下是与本站内容相关的文章，如果用户的问题与这些文章相关，请推荐给用户：
${articlesContext}

当推荐文章时，请使用 Markdown 链接格式：[文章标题](/posts/slug)`;
  }

  return prompt;
}

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

    // 获取系统提示词和用户消息
    const systemMessage = body.messages.find((m: any) => m.role === 'system');
    const userMessage = body.messages.find((m: any) => m.role === 'user');
    const otherMessages = body.messages.filter((m: any) => m.role !== 'system');

    // 搜索相关文章（基于用户最后一条消息）
    let articles = [];
    if (userMessage) {
      articles = await searchArticles(userMessage.content, 3);
    }

    // 构建系统提示词（包含文章推荐）
    const baseSystemPrompt = systemMessage?.content || "你是一个友好、博学的助手，名字叫小唔。请用简洁、温暖的语气回答问题。";
    const enhancedSystemPrompt = buildSystemPrompt(baseSystemPrompt, articles);

    // 格式化消息
    const formattedMessages = [
      { role: 'system', content: enhancedSystemPrompt },
      ...otherMessages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    // 调用 LLM API
    const assistantContent = await callLLMAPI(formattedMessages);

    return new Response(
      JSON.stringify({
        content: assistantContent,
        articles: articles, // 返回推荐的文章
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
