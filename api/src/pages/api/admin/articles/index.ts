/**
 * API Route Handler - Admin Articles
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/routes/admin/articles';

export const config = {
  api: {
    bodyParser: true,
  },
};

export default handler;
