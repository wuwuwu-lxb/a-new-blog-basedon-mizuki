/**
 * API Route Handler - Admin Articles [slug]
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/routes/admin/articles/[slug]';

export const config = {
  api: {
    bodyParser: true,
  },
};

export default handler;
