import { Request, Response } from 'express';
import { query, pool } from '../config/database';
import { asyncHandler } from '../middlewares/errorHandler';
import { ApiResponse, Category } from '../types';

/**
 * Get all categories (Admin)
 * GET /api/admin/categories
 */
export const getAdminCategories = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT * FROM categories ORDER BY sort_order ASC, name ASC`
  );

  const response: ApiResponse<Category[]> = {
    success: true,
    data: result.rows,
  };

  res.json(response);
});

/**
 * Get single category (Admin)
 * GET /api/admin/categories/:id
 */
export const getAdminCategoryById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query(
    `SELECT * FROM categories WHERE id = ?`,
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

/**
 * Create category (Admin)
 * POST /api/admin/categories
 */
export const createAdminCategory = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    name_en,
    description,
    image_url,
    is_active,
    sort_order,
  } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'กรุณากรอกชื่อหมวดหมู่',
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO categories (
        name, name_en, description, image_url, is_active, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        name_en || null,
        description || null,
        image_url || null,
        is_active !== undefined ? is_active : true,
        sort_order || 0,
      ]
    ) as any;

    const categoryId = result.insertId;
    await connection.commit();

    // Fetch created category
    const categoryResult = await query(
      `SELECT * FROM categories WHERE id = ?`,
      [categoryId]
    );

    const response: ApiResponse<Category> = {
      success: true,
      data: categoryResult.rows[0],
      message: 'สร้างหมวดหมู่สำเร็จ',
    };

    res.status(201).json(response);
  } catch (error: any) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * Update category (Admin)
 * PUT /api/admin/categories/:id
 */
export const updateAdminCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    name_en,
    description,
    image_url,
    is_active,
    sort_order,
  } = req.body;

  // Check if category exists
  const existingCategory = await query(
    `SELECT id FROM categories WHERE id = ?`,
    [id]
  );

  if (existingCategory.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบหมวดหมู่',
    });
  }

  const updateFields: string[] = [];
  const updateValues: any[] = [];

  if (name !== undefined) { updateFields.push('name = ?'); updateValues.push(name); }
  if (name_en !== undefined) { updateFields.push('name_en = ?'); updateValues.push(name_en); }
  if (description !== undefined) { updateFields.push('description = ?'); updateValues.push(description); }
  if (image_url !== undefined) { updateFields.push('image_url = ?'); updateValues.push(image_url); }
  if (is_active !== undefined) { updateFields.push('is_active = ?'); updateValues.push(is_active); }
  if (sort_order !== undefined) { updateFields.push('sort_order = ?'); updateValues.push(sort_order); }

  if (updateFields.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'ไม่มีข้อมูลที่จะอัปเดต',
    });
  }

  updateFields.push('updated_at = NOW()');
  updateValues.push(id);

  await query(
    `UPDATE categories SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues
  );

  // Fetch updated category
  const categoryResult = await query(
    `SELECT * FROM categories WHERE id = ?`,
    [id]
  );

  const response: ApiResponse<Category> = {
    success: true,
    data: categoryResult.rows[0],
    message: 'อัปเดตหมวดหมู่สำเร็จ',
  };

  res.json(response);
});

/**
 * Delete category (Admin)
 * DELETE /api/admin/categories/:id
 */
export const deleteAdminCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if category exists
  const existingCategory = await query(
    `SELECT id FROM categories WHERE id = ?`,
    [id]
  );

  if (existingCategory.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบหมวดหมู่',
    });
  }

  // Check if category is used by products
  const productsUsingCategory = await query(
    `SELECT COUNT(*) as count FROM products WHERE category_id = ?`,
    [id]
  );

  if (productsUsingCategory.rows[0]?.count > 0) {
    return res.status(400).json({
      success: false,
      error: 'ไม่สามารถลบหมวดหมู่ได้ เนื่องจากมีสินค้าใช้งานอยู่',
    });
  }

  // Soft delete
  await query(
    `UPDATE categories SET is_active = false, updated_at = NOW() WHERE id = ?`,
    [id]
  );

  const response: ApiResponse = {
    success: true,
    message: 'ลบหมวดหมู่สำเร็จ',
  };

  res.json(response);
});

