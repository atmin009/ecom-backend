import { Request, Response } from 'express';
import { query } from '../config/database';
import { asyncHandler } from '../middlewares/errorHandler';
import { Brand, ApiResponse } from '../types';

/**
 * Get all active brands
 */
export const getBrands = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Check if parent_id column exists, if not use simple query
    const result = await query(
      `SELECT id, parent_id, name, name_en, description, logo_url, is_active, sort_order
       FROM brands
       WHERE is_active = true
       ORDER BY sort_order ASC, name ASC`
    );

    const brands: Brand[] = result.rows;

    const response: ApiResponse<Brand[]> = {
      success: true,
      data: brands,
    };

    res.json(response);
  } catch (error: any) {
    // Fallback if parent_id column doesn't exist yet
    if (error.message && error.message.includes('parent_id')) {
      const result = await query(
        `SELECT id, name, name_en, description, logo_url, is_active, sort_order
         FROM brands
         WHERE is_active = true
         ORDER BY sort_order ASC, name ASC`
      );

      const brands: Brand[] = result.rows;

      const response: ApiResponse<Brand[]> = {
        success: true,
        data: brands,
      };

      res.json(response);
    } else {
      throw error;
    }
  }
});

/**
 * Get single brand by ID
 */
export const getBrandById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT id, parent_id, name, name_en, description, logo_url, is_active, sort_order
       FROM brands
       WHERE id = ? AND is_active = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบแบรนด์',
      });
    }

    const response: ApiResponse<Brand> = {
      success: true,
      data: result.rows[0],
    };

    res.json(response);
  } catch (error: any) {
    // Fallback if parent_id column doesn't exist yet
    if (error.message && error.message.includes('parent_id')) {
      const result = await query(
        `SELECT id, name, name_en, description, logo_url, is_active, sort_order
         FROM brands
         WHERE id = ? AND is_active = true`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบแบรนด์',
        });
      }

      const response: ApiResponse<Brand> = {
        success: true,
        data: result.rows[0],
      };

      res.json(response);
    } else {
      throw error;
    }
  }
});

