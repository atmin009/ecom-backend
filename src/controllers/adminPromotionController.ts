import { Request, Response } from 'express';
import { query, pool } from '../config/database';
import { asyncHandler } from '../middlewares/errorHandler';
import { ApiResponse } from '../types';
import { AuthRequest } from '../middlewares/authMiddleware';

/**
 * Get all promotions (Admin)
 * GET /api/admin/promotions
 */
export const getAdminPromotions = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, is_active } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let queryStr = `
    SELECT p.*,
      (SELECT COUNT(*) FROM promotion_usage_logs WHERE promotion_id = p.id) as usage_count,
      au.username as created_by_username
    FROM promotions p
    LEFT JOIN admin_users au ON p.created_by = au.id
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (is_active !== undefined) {
    queryStr += ` AND p.is_active = ?`;
    params.push(is_active === 'true');
  }
  
  // MySQL requires LIMIT and OFFSET to be integers, use template literal
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  const safeOffset = Math.max(0, Number(offset) || 0);
  const sanitizedLimit = parseInt(String(safeLimit), 10);
  const sanitizedOffset = parseInt(String(safeOffset), 10);
  queryStr += ` ORDER BY p.created_at DESC LIMIT ${sanitizedLimit} OFFSET ${sanitizedOffset}`;

  const result = await query(queryStr, params);
  
  // Get total count
  let countQuery = `SELECT COUNT(*) as total FROM promotions WHERE 1=1`;
  const countParams: any[] = [];
  
  if (is_active !== undefined) {
    countQuery += ` AND is_active = ?`;
    countParams.push(is_active === 'true');
  }
  
  const countResult = await query(countQuery, countParams);
  const total = countResult.rows[0]?.total || 0;

  console.log('Admin Promotions Result:', {
    rowCount: result.rows.length,
    firstRow: result.rows[0],
    total: total,
  });

  const response: ApiResponse<{
    promotions: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> = {
    success: true,
    data: {
      promotions: result.rows || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(total),
        totalPages: Math.ceil(Number(total) / Number(limit)),
      },
    },
  };

  console.log('Admin Promotions Response:', {
    success: response.success,
    promotionsCount: response.data?.promotions.length || 0,
    pagination: response.data?.pagination,
  });

  res.json(response);
});

/**
 * Get single promotion (Admin)
 * GET /api/admin/promotions/:id
 */
export const getAdminPromotionById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query(
    `SELECT p.*,
      au.username as created_by_username
    FROM promotions p
    LEFT JOIN admin_users au ON p.created_by = au.id
    WHERE p.id = ?`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบโปรโมชั่น',
    });
  }

  const promotion = result.rows[0];

  // Get promotion products
  const productsResult = await query(
    `SELECT pp.product_id, p.name, p.sku, p.price
     FROM promotion_products pp
     JOIN products p ON pp.product_id = p.id
     WHERE pp.promotion_id = ?`,
    [id]
  );

  const response: ApiResponse<any> = {
    success: true,
    data: {
      ...promotion,
      products: productsResult.rows,
    },
  };

  res.json(response);
});

/**
 * Create promotion (Admin)
 * POST /api/admin/promotions
 */
export const createAdminPromotion = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const {
    name,
    description,
    promotion_type,
    discount_value,
    min_purchase_amount,
    buy_quantity,
    get_quantity,
    free_gift_product_id,
    start_date,
    end_date,
    is_active,
    usage_limit,
    product_ids,
  } = req.body;

  // Validate required fields
  if (!name || !promotion_type || !start_date || !end_date) {
    return res.status(400).json({
      success: false,
      error: 'กรุณากรอกข้อมูลโปรโมชั่นให้ครบถ้วน',
    });
  }

  // Validate dates
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  
  if (endDate <= startDate) {
    return res.status(400).json({
      success: false,
      error: 'วันที่สิ้นสุดต้องมากกว่าวันที่เริ่มต้น',
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [promotionResult] = await connection.execute(
      `INSERT INTO promotions (
        name, description, promotion_type, discount_value, min_purchase_amount,
        buy_quantity, get_quantity, free_gift_product_id,
        start_date, end_date, is_active, usage_limit, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || null,
        promotion_type,
        discount_value || null,
        min_purchase_amount || null,
        buy_quantity || null,
        get_quantity || null,
        free_gift_product_id || null,
        start_date,
        end_date,
        is_active !== undefined ? is_active : true,
        usage_limit || null,
        authReq.adminUser?.id || null,
      ]
    ) as any;

    const promotionId = promotionResult.insertId;

    // Add promotion products if provided
    if (product_ids && Array.isArray(product_ids) && product_ids.length > 0) {
      for (const productId of product_ids) {
        await connection.execute(
          `INSERT INTO promotion_products (promotion_id, product_id) VALUES (?, ?)`,
          [promotionId, productId]
        );
      }
    }

    await connection.commit();

    // Fetch created promotion
    const promotionData = await query(
      `SELECT * FROM promotions WHERE id = ?`,
      [promotionId]
    );

    const response: ApiResponse<any> = {
      success: true,
      data: promotionData.rows[0],
      message: 'สร้างโปรโมชั่นสำเร็จ',
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
 * Update promotion (Admin)
 * PUT /api/admin/promotions/:id
 */
export const updateAdminPromotion = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    description,
    promotion_type,
    discount_value,
    min_purchase_amount,
    buy_quantity,
    get_quantity,
    free_gift_product_id,
    start_date,
    end_date,
    is_active,
    usage_limit,
    product_ids,
  } = req.body;

  // Check if promotion exists
  const existingPromotion = await query(
    `SELECT id FROM promotions WHERE id = ?`,
    [id]
  );

  if (existingPromotion.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบโปรโมชั่น',
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Build update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (name !== undefined) { updateFields.push('name = ?'); updateValues.push(name); }
    if (description !== undefined) { updateFields.push('description = ?'); updateValues.push(description); }
    if (promotion_type !== undefined) { updateFields.push('promotion_type = ?'); updateValues.push(promotion_type); }
    if (discount_value !== undefined) { updateFields.push('discount_value = ?'); updateValues.push(discount_value); }
    if (min_purchase_amount !== undefined) { updateFields.push('min_purchase_amount = ?'); updateValues.push(min_purchase_amount); }
    if (buy_quantity !== undefined) { updateFields.push('buy_quantity = ?'); updateValues.push(buy_quantity); }
    if (get_quantity !== undefined) { updateFields.push('get_quantity = ?'); updateValues.push(get_quantity); }
    if (free_gift_product_id !== undefined) { updateFields.push('free_gift_product_id = ?'); updateValues.push(free_gift_product_id); }
    if (start_date !== undefined) { updateFields.push('start_date = ?'); updateValues.push(start_date); }
    if (end_date !== undefined) { updateFields.push('end_date = ?'); updateValues.push(end_date); }
    if (is_active !== undefined) { updateFields.push('is_active = ?'); updateValues.push(is_active); }
    if (usage_limit !== undefined) { updateFields.push('usage_limit = ?'); updateValues.push(usage_limit); }

    if (updateFields.length > 0) {
      updateFields.push('updated_at = NOW()');
      updateValues.push(id);
      await connection.execute(
        `UPDATE promotions SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }

    // Update promotion products if provided
    if (product_ids !== undefined) {
      // Delete existing products
      await connection.execute(
        `DELETE FROM promotion_products WHERE promotion_id = ?`,
        [id]
      );

      // Add new products
      if (Array.isArray(product_ids) && product_ids.length > 0) {
        for (const productId of product_ids) {
          await connection.execute(
            `INSERT INTO promotion_products (promotion_id, product_id) VALUES (?, ?)`,
            [id, productId]
          );
        }
      }
    }

    await connection.commit();

    // Fetch updated promotion
    const promotionData = await query(
      `SELECT * FROM promotions WHERE id = ?`,
      [id]
    );

    const response: ApiResponse<any> = {
      success: true,
      data: promotionData.rows[0],
      message: 'อัปเดตโปรโมชั่นสำเร็จ',
    };

    res.json(response);
  } catch (error: any) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * Delete promotion (Admin)
 * DELETE /api/admin/promotions/:id
 */
export const deleteAdminPromotion = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if promotion exists
  const existingPromotion = await query(
    `SELECT id FROM promotions WHERE id = ?`,
    [id]
  );

  if (existingPromotion.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบโปรโมชั่น',
    });
  }

  // Soft delete
  await query(
    `UPDATE promotions SET is_active = false, updated_at = NOW() WHERE id = ?`,
    [id]
  );

  const response: ApiResponse = {
    success: true,
    message: 'ลบโปรโมชั่นสำเร็จ',
  };

  res.json(response);
});

