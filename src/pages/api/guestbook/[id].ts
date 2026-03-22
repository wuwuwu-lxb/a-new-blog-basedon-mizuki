/**
 * DELETE /api/guestbook/:id - 删除留言（需管理员权限）
 */

import type { APIRoute } from 'astro';
import { getTokenFromRequest, verifyToken, isAdmin } from '../../../lib/auth';

export async function DELETE({ params, request }: { params: { id: string }, request: Request }) {
  try {
    // 验证管理员权限
    const token = getTokenFromRequest(request);
    const payload = token ? verifyToken(token) : null;

    if (!payload || !isAdmin(payload)) {
      return new Response(JSON.stringify({
        success: false,
        error: '需要管理员权限',
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
      return new Response(JSON.stringify({
        success: false,
        error: '无效的留言 ID',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { prisma } = await import('../../../lib/prisma');

    await prisma.guestbook.delete({
      where: { id: parseInt(id) },
    });

    return new Response(JSON.stringify({
      success: true,
      message: '留言已删除',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Delete guestbook error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: '删除留言失败',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
