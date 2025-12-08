import { Request, Response } from 'express';
import { query } from '../config/database';
import { asyncHandler } from '../middlewares/errorHandler';
import { Category, ApiResponse } from '../types';

/**
 * Get all active categories
 */
export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT id, name, name_en, description, image_url, is_active, sort_order
     FROM categories
     WHERE is_active = true
     ORDER BY sort_order ASC, name ASC`
  );

  const categories: Category[] = result.rows;

  const response: ApiResponse<Category[]> = {
    success: true,
    data: categories,
  };

  res.json(response);
});

/**
 * Get single category by ID
 */
export const getCategoryById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query(
    `SELECT id, name, name_en, description, image_url, is_active, sort_order
     FROM categories
     WHERE id = ? AND is_active = true`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบหมวดหมู่',
    });
  }

  const response: ApiResponse<Category> = {
    success: true,
    data: result.rows[0],
  };

  res.json(response);
});

