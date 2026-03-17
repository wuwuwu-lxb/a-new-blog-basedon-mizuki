#!/usr/bin/env node

/**
 * API 测试脚本
 * 测试所有 API 端点是否正常工作
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(colors.green, `✅ ${message}`);
}

function error(message) {
  log(colors.red, `❌ ${message}`);
}

function info(message) {
  log(colors.blue, `ℹ️  ${message}`);
}

function loading(message) {
  log(colors.cyan, `⏳ ${message}`);
}

async function testEndpoint(name, method, url, data = null) {
  try {
    const config = {
      method,
      url,
      headers: { 'Content-Type': 'application/json' },
      data: data ? JSON.stringify(data) : undefined,
    };

    const response = await axios(config);

    if (response.status >= 200 && response.status < 300) {
      success(`${name} - ${method} ${url} (${response.status})`);
      return response.data;
    } else {
      error(`${name} - ${method} ${url} (${response.status})`);
      return null;
    }
  } catch (err) {
    if (err.response) {
      error(`${name} - ${method} ${url} (${err.response.status})`);
      info(`响应：${JSON.stringify(err.response.data)}`);
    } else {
      error(`${name} - ${method} ${url} - ${err.message}`);
    }
    return null;
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(50));
  log(colors.cyan, '🧪 Mizuki API 测试脚本');
  console.log('='.repeat(50) + '\n');

  // 检查 API 是否可访问
  loading('检查 API 服务是否运行...');
  try {
    await axios.get(API_BASE);
  } catch {
    error('无法连接到 API 服务');
    info('请确保已运行：cd api && pnpm dev');
    info('API 应该在 http://localhost:3001 运行');
    process.exit(1);
  }
  success('API 服务运行正常\n');

  // 测试文章列表
  loading('测试文章列表 API...');
  const articles = await testEndpoint('获取文章列表', 'GET', `${API_BASE}/articles`);
  if (articles) {
    info(`找到 ${articles.articles?.length || 0} 篇文章`);
  }

  // 测试分类列表
  loading('测试分类列表 API...');
  const categories = await testEndpoint('获取分类列表', 'GET', `${API_BASE}/categories`);
  if (categories) {
    info(`找到 ${categories.categories?.length || 0} 个分类`);
  }

  // 测试标签列表
  loading('测试标签列表 API...');
  const tags = await testEndpoint('获取标签列表', 'GET', `${API_BASE}/tags`);
  if (tags) {
    info(`找到 ${tags.tags?.length || 0} 个标签`);
  }

  // 测试评论列表
  loading('测试评论列表 API...');
  const comments = await testEndpoint('获取评论列表', 'GET', `${API_BASE}/comments`);
  if (comments) {
    info(`找到 ${comments.comments?.length || 0} 条评论`);
  }

  // 测试用户认证（使用测试账号）
  console.log('\n' + '-'.repeat(50));
  loading('测试用户认证...');

  const loginResult = await testEndpoint(
    '用户登录',
    'POST',
    `${API_BASE}/auth/login`,
    {
      email: 'admin@mizuki.com',
      password: 'admin123',
    }
  );

  let authToken = null;
  if (loginResult?.data?.token) {
    authToken = loginResult.data.token;
    success(`获取 Token 成功：${authToken.slice(0, 20)}...`);
    info(`用户：${loginResult.data.user?.name || 'Unknown'}`);
  } else {
    info('登录失败，可能数据库未初始化');
  }

  // 如果认证成功，测试需要认证的端点
  if (authToken) {
    console.log('\n' + '-'.repeat(50));
    loading('测试需要认证的 API...');

    const authHeaders = {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    };

    // 获取当前用户
    loading('获取当前用户信息...');
    const me = await axios.get(`${API_BASE}/auth/me`, authHeaders);
    if (me.status === 200) {
      success(`获取用户信息成功 - ${me.data.user?.name || 'Unknown'}`);
    }

    // 测试创建文章（可选）
    // const createArticle = await testEndpoint(
    //   '创建文章',
    //   'POST',
    //   `${API_BASE}/articles`,
    //   {
    //     title: '测试文章',
    //     slug: 'test-article',
    //     content: '这是一篇测试文章',
    //     published: false,
    //   }
    // );
  }

  // 测试 Chat API
  console.log('\n' + '-'.repeat(50));
  loading('测试 Chat API...');

  const chatResult = await testEndpoint(
    '发送聊天消息',
    'POST',
    `${API_BASE}/chat`,
    {
      messages: [
        { role: 'system', content: '你是一个友好的助手' },
        { role: 'user', content: '你好，请介绍一下自己' },
      ],
    }
  );

  if (chatResult?.content) {
    success(`Chat API 响应：${chatResult.content.slice(0, 50)}...`);
  } else if (chatResult) {
    info('Chat API 返回空响应，可能未配置 OPENAI_API_KEY');
  }

  // 测试结果汇总
  console.log('\n' + '='.repeat(50));
  log(colors.green, '✅ API 测试完成！');
  console.log('='.repeat(50) + '\n');

  info('提示：如果看到 401 错误，说明数据库未初始化');
  info('运行以下命令初始化数据库：');
  info('pnpm init-db\n');
}

// 运行测试
runTests().catch((err) => {
  error(`测试执行失败：${err.message}`);
  process.exit(1);
});
