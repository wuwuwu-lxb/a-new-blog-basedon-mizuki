/**
 * 清理 30 天前的已读通知
 * 可以通过定时任务调用：pnpm cleanup-notifications
 */

import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库路径（与 prisma/schema.prisma 保持一致）
const DATABASE_PATH = path.resolve(process.cwd(), 'prisma/dev.db');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${DATABASE_PATH}`,
    },
  },
});

async function cleanupNotifications() {
  try {
    // 计算 30 天前的日期
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 删除 30 天前的已读通知
    const result = await prisma.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    console.log(`✅ 已清理 ${result.count} 条 30 天前的已读通知`);
  } catch (error) {
    console.error('❌ 清理通知失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行清理
cleanupNotifications();
