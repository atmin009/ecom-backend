import { Request, Response } from 'express';
import { query } from '../config/database';
import { asyncHandler } from '../middlewares/errorHandler';
import { ApiResponse } from '../types';

/**
 * Get active promotions (Public)
 * GET /api/promotions
 * Returns only active promotions that are currently valid
 */
export const getActivePromotions = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const queryStr = `
    SELECT 
      p.*,
      GROUP_CONCAT(pp.product_id) as product_ids
    FROM promotions p
    LEFT JOIN promotion_products pp ON p.id = pp.promotion_id
    WHERE p.is_active = true
      AND p.start_date <= ?
      AND p.end_date >= ?
      AND (p.usage_limit IS NULL OR p.usage_count < p.usage_limit)
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `;

  const result = await query(queryStr, [now, now]);

  // Format promotions with product_ids as array
  const promotions = (result.rows || []).map((row: any) => ({
    ...row,
    product_ids: row.product_ids 
      ? row.product_ids.split(',').map((id: string) => parseInt(id.trim()))
      : [],
  }));

  const response: ApiResponse<any[]> = {
    success: true,
    data: promotions,
  };

  res.json(response);
});

