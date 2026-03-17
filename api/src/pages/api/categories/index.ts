/**
 * API Route Handler - Categories
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import categoriesHandler from '@/routes/categories/index';

export default async function categoriesApiHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return categoriesHandler(req, res);
}
