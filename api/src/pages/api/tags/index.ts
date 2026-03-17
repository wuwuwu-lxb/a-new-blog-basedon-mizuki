/**
 * API Route Handler - Tags
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import tagsHandler from '@/routes/tags/index';

export default async function tagsApiHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return tagsHandler(req, res);
}
