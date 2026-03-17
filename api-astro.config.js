/**
 * Astro 配置 - 添加 API 代理
 * 开发环境下将 /api/* 请求代理到 Next.js API 服务
 */

import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import expressiveCode from 'astro-expressive-code';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';
import icon from 'astro-icon';
import swup from '@swup/astro';

// https://astro.build/config
export default defineConfig({
  site: 'https://mizuki.mysqil.com/',
  integrations: [
    expressiveCode({
      themes: ['github-dark'],
      plugins: [
        // 按需添加插件
      ],
    }),
    sitemap(),
    svelte(),
    icon(),
    swup({
      theme: false,
      animationClass: 'swup-transition-rotate',
      animationSelector: '[role="main"]',
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        // 开发环境下代理 API 请求到 Next.js 服务
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          rewrite: (path) => path,
        },
      },
    },
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
