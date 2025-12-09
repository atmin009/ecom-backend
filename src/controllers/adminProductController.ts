import { Request, Response } from 'express';
import { query, pool } from '../config/database';
import { asyncHandler } from '../middlewares/errorHandler';
import { ApiResponse, Product } from '../types';
import { AuthRequest } from '../middlewares/authMiddleware';

/**
 * Get all products (Admin)
 * GET /api/admin/products
 */
export const getAdminProducts = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, search, category_id, brand_id } = req.query;
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(100, Number(limit) || 20)); // Limit between 1-100
  const offset = Math.max(0, (pageNum - 1) * limitNum);

  console.log('getAdminProducts called with:', { page, limit, search, category_id, brand_id });

  let queryStr = `
    SELECT 
      p.*,
      c.name as category_name,
      b.name as brand_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE 1=1
  `;
  
  // Note: We don't filter by is_active here for admin view
  // Admin should see all products including inactive ones
  
  const params: any[] = [];
  
  if (search) {
    queryStr += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.description_short LIKE ?)`;
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }
  
  if (category_id) {
    const catId = Number(category_id);
    if (!isNaN(catId)) {
      queryStr += ` AND p.category_id = ?`;
      params.push(catId);
    }
  }
  
  if (brand_id) {
    const brId = Number(brand_id);
    if (!isNaN(brId)) {
      queryStr += ` AND p.brand_id = ?`;
      params.push(brId);
    }
  }
  
  // Order by id DESC (fallback to id if created_at doesn't exist)
  // Note: Some MySQL drivers don't support parameter binding for LIMIT/OFFSET
  // So we'll use template literal with sanitized values
  const safeLimit = Math.max(1, Math.min(100, Number(limitNum) || 20));
  const safeOffset = Math.max(0, Number(offset) || 0);
  // Sanitize to prevent SQL injection (only allow integers)
  const sanitizedLimit = parseInt(String(safeLimit), 10);
  const sanitizedOffset = parseInt(String(safeOffset), 10);
  queryStr += ` ORDER BY p.id DESC LIMIT ${sanitizedLimit} OFFSET ${sanitizedOffset}`;

  console.log('Admin Products Query:', queryStr);
  console.log('Admin Products Params:', params);
  
  const result = await query(queryStr, params);
  
  console.log('Admin Products Result:', {
    rowCount: result.rows.length,
    firstRow: result.rows[0],
  });

  // Get total count
  let countQuery = `SELECT COUNT(*) as total FROM products p WHERE 1=1`;
  const countParams: any[] = [];
  
  if (search) {
    countQuery += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.description_short LIKE ?)`;
    const searchPattern = `%${search}%`;
    countParams.push(searchPattern, searchPattern, searchPattern);
  }
  
  if (category_id) {
    const catId = Number(category_id);
    if (!isNaN(catId)) {
      countQuery += ` AND p.category_id = ?`;
      countParams.push(catId);
    }
  }
  
  if (brand_id) {
    const brId = Number(brand_id);
    if (!isNaN(brId)) {
      countQuery += ` AND p.brand_id = ?`;
      countParams.push(brId);
    }
  }
  
  const countResult = await query(countQuery, countParams);
  const total = countResult.rows[0]?.total || 0;

  console.log('Admin Products Total:', total);

  const response: ApiResponse<{
    products: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> = {
    success: true,
    data: {
      products: result.rows || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limitNum),
      },
    },
  };

  console.log('Admin Products Response:', {
    success: response.success,
    productsCount: response.data?.products.length || 0,
    pagination: response.data?.pagination,
  });

  res.json(response);
});

/**
 * Get single product (Admin)
 * GET /api/admin/products/:id
 */
export const getAdminProductById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query(
    `SELECT 
      p.*,
      c.name as category_name,
      b.name as brand_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE p.id = ?`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบสินค้า',
    });
  }

  const response: ApiResponse<Product> = {
    success: true,
    data: result.rows[0],
  };

  res.json(response);
});

/**
 * Create product (Admin)
 * POST /api/admin/products
 */
export const createAdminProduct = asyncHandler(async (req: Request, res: Response) => {
  console.log('📥 [Create Product] Request received');
  console.log('📥 [Create Product] Request body keys:', Object.keys(req.body));
  
  const authReq = req as AuthRequest;
  const {
    name,
    sku,
    price,
    description_short,
    description_long,
    image_url,
    is_active,
    is_free_gift,
    category_id,
    brand_id,
    device_model,
    film_type,
    screen_size,
    thickness,
    hardness,
    features,
    promotion_price,
    promotion_start_date,
    promotion_end_date,
    promotion_action,
    original_price,
  } = req.body;

  // Validate required fields
  if (!name || !sku || price === undefined || price === null) {
    return res.status(400).json({
      success: false,
      error: 'กรุณากรอกชื่อสินค้า, SKU และราคา',
    });
  }

  // Validate price is a valid number
  const priceNum = Number(price);
  if (isNaN(priceNum) || priceNum < 0) {
    return res.status(400).json({
      success: false,
      error: 'ราคาต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0',
    });
  }

  // Check if SKU already exists
  const existingSku = await query(
    `SELECT id FROM products WHERE sku = ?`,
    [sku]
  );

  if (existingSku.rows.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'SKU นี้มีอยู่แล้ว',
    });
  }

  // Log promotion data for debugging
  console.log('📊 [Create Product] Full request body:', JSON.stringify(req.body, null, 2));
  console.log('📊 [Create Product] Promotion data:', {
    promotion_price,
    promotion_start_date,
    promotion_end_date,
    promotion_action,
    original_price,
  });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Prepare promotion values
    const promoPrice = promotion_price !== null && promotion_price !== undefined && promotion_price !== '' 
      ? Number(promotion_price) 
      : null;
    const origPrice = original_price !== null && original_price !== undefined && original_price !== '' 
      ? Number(original_price) 
      : null;

    console.log('📊 [Create Product] Prepared promotion values:', {
      promoPrice,
      origPrice,
      promotion_start_date,
      promotion_end_date,
      promotion_action,
    });

    const [result] = await connection.execute(
      `INSERT INTO products (
        name, sku, price, description_short, description_long, image_url,
        is_active, is_free_gift, category_id, brand_id,
        device_model, film_type, screen_size, thickness, hardness, features,
        promotion_price, promotion_start_date, promotion_end_date, promotion_action, original_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        sku,
        priceNum,
        description_short || null,
        description_long || null,
        image_url || null,
        is_active !== undefined ? is_active : true,
        is_free_gift || false,
        category_id || null,
        brand_id || null,
        device_model || null,
        film_type || null,
        screen_size || null,
        thickness || null,
        hardness || null,
        features || null,
        promoPrice,
        promotion_start_date || null,
        promotion_end_date || null,
        promotion_action || null,
        origPrice,
      ]
    ) as any;

    const productId = result.insertId;
    console.log('✅ [Create Product] Product created with ID:', productId);
    
    await connection.commit();

    // Fetch created product
    const productResult = await query(
      `SELECT * FROM products WHERE id = ?`,
      [productId]
    );
    
    console.log('📦 [Create Product] Created product data:', {
      id: productResult.rows[0]?.id,
      promotion_price: productResult.rows[0]?.promotion_price,
      promotion_start_date: productResult.rows[0]?.promotion_start_date,
      promotion_end_date: productResult.rows[0]?.promotion_end_date,
      promotion_action: productResult.rows[0]?.promotion_action,
      original_price: productResult.rows[0]?.original_price,
    });

    const response: ApiResponse<Product> = {
      success: true,
      data: productResult.rows[0],
      message: 'สร้างสินค้าสำเร็จ',
    };

    res.status(201).json(response);
  } catch (error: any) {
    await connection.rollback();
    console.error('❌ [Create Product] Error:', error);
    console.error('❌ [Create Product] Error message:', error.message);
    console.error('❌ [Create Product] Error code:', error.code);
    console.error('❌ [Create Product] Error sqlMessage:', error.sqlMessage);
    
    // Check if it's a column not found error
    if (error.code === 'ER_BAD_FIELD_ERROR' || error.message?.includes('Unknown column')) {
      return res.status(500).json({
        success: false,
        error: 'Database columns สำหรับโปรโมชั่นยังไม่มี กรุณารัน migration: migration_add_promotion_fields.sql',
        details: error.message,
      });
    }
    
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * Update product (Admin)
 * PUT /api/admin/products/:id
 */
export const updateAdminProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    sku,
    price,
    description_short,
    description_long,
    image_url,
    is_active,
    is_free_gift,
    category_id,
    brand_id,
    device_model,
    film_type,
    screen_size,
    thickness,
    hardness,
    features,
    promotion_price,
    promotion_start_date,
    promotion_end_date,
    promotion_action,
    original_price,
  } = req.body;

  // Check if product exists
  const existingProduct = await query(
    `SELECT id FROM products WHERE id = ?`,
    [id]
  );

  if (existingProduct.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบสินค้า',
    });
  }

  // Validate price if provided
  if (price !== undefined && price !== null) {
    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({
        success: false,
        error: 'ราคาต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0',
      });
    }
  }

  // Check if SKU is being changed and if it conflicts
  if (sku) {
    const skuCheck = await query(
      `SELECT id FROM products WHERE sku = ? AND id != ?`,
      [sku, id]
    );

    if (skuCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'SKU นี้มีอยู่แล้ว',
      });
    }
  }

  // Build update query dynamically
  const updateFields: string[] = [];
  const updateValues: any[] = [];

  // Helper to safely push values (convert undefined to null)
  const safePush = (field: string, value: any) => {
    if (value !== undefined) {
      updateFields.push(field);
      updateValues.push(value === null || value === '' ? null : value);
    }
  };

  safePush('name = ?', name);
  safePush('sku = ?', sku);
  // Convert price to number if provided
  if (price !== undefined && price !== null) {
    safePush('price = ?', Number(price));
  }
  safePush('description_short = ?', description_short);
  safePush('description_long = ?', description_long);
  safePush('image_url = ?', image_url);
  safePush('is_active = ?', is_active);
  safePush('is_free_gift = ?', is_free_gift);
  safePush('category_id = ?', category_id);
  safePush('brand_id = ?', brand_id);
  safePush('device_model = ?', device_model);
  safePush('film_type = ?', film_type);
  safePush('screen_size = ?', screen_size);
  safePush('thickness = ?', thickness);
  safePush('hardness = ?', hardness);
  safePush('features = ?', features);
  // Promotion fields - always include them to allow clearing promotion
  if (promotion_price !== undefined) {
    safePush('promotion_price = ?', promotion_price !== null && promotion_price !== '' ? Number(promotion_price) : null);
  }
  if (promotion_start_date !== undefined) {
    safePush('promotion_start_date = ?', promotion_start_date || null);
  }
  if (promotion_end_date !== undefined) {
    safePush('promotion_end_date = ?', promotion_end_date || null);
  }
  if (promotion_action !== undefined) {
    safePush('promotion_action = ?', promotion_action || null);
  }
  if (original_price !== undefined) {
    safePush('original_price = ?', original_price !== null && original_price !== '' ? Number(original_price) : null);
  }

  // Log promotion data for debugging
  console.log('📊 [Update Product] Full request body:', JSON.stringify(req.body, null, 2));
  console.log('📊 [Update Product] Promotion data:', {
    promotion_price,
    promotion_start_date,
    promotion_end_date,
    promotion_action,
    original_price,
    updateFields: updateFields.filter(f => f.includes('promotion') || f.includes('original')),
  });

  if (updateFields.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'ไม่มีข้อมูลที่จะอัปเดต',
    });
  }

  updateFields.push('updated_at = NOW()');
  updateValues.push(id);

  try {
    await query(
      `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    console.log('✅ [Update Product] Update query executed successfully');
  } catch (error: any) {
    console.error('❌ [Update Product] Error:', error);
    console.error('❌ [Update Product] Error message:', error.message);
    console.error('❌ [Update Product] Error code:', error.code);
    
    // Check if it's a column not found error
    if (error.code === 'ER_BAD_FIELD_ERROR' || error.message?.includes('Unknown column')) {
      return res.status(500).json({
        success: false,
        error: 'Database columns สำหรับโปรโมชั่นยังไม่มี กรุณารัน migration: migration_add_promotion_fields.sql',
        details: error.message,
      });
    }
    
    throw error;
  }

  // Fetch updated product
  const productResult = await query(
    `SELECT * FROM products WHERE id = ?`,
    [id]
  );
  
  console.log('📦 [Update Product] Updated product data:', {
    id: productResult.rows[0]?.id,
    promotion_price: productResult.rows[0]?.promotion_price,
    promotion_start_date: productResult.rows[0]?.promotion_start_date,
    promotion_end_date: productResult.rows[0]?.promotion_end_date,
    promotion_action: productResult.rows[0]?.promotion_action,
    original_price: productResult.rows[0]?.original_price,
  });

  const response: ApiResponse<Product> = {
    success: true,
    data: productResult.rows[0],
    message: 'อัปเดตสินค้าสำเร็จ',
  };

  res.json(response);
});

/**
 * Delete product (Admin)
 * DELETE /api/admin/products/:id
 */
export const deleteAdminProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if product exists
  const existingProduct = await query(
    `SELECT id, name FROM products WHERE id = ?`,
    [id]
  );

  if (existingProduct.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบสินค้า',
    });
  }

  // Check if product is used in any order_items
  const orderItemsCheck = await query(
    `SELECT COUNT(*) as count FROM order_items WHERE product_id = ?`,
    [id]
  );

  const orderItemsCount = orderItemsCheck.rows[0]?.count || 0;

  if (orderItemsCount > 0) {
    return res.status(400).json({
      success: false,
      error: `ไม่สามารถลบสินค้านี้ได้ เนื่องจากมีออเดอร์ที่ใช้สินค้านี้อยู่ ${orderItemsCount} รายการ กรุณาปิดใช้งานแทน`,
    });
  }

  // Check if product is used in promotions
  const promotionCheck = await query(
    `SELECT COUNT(*) as count FROM promotion_products WHERE product_id = ?`,
    [id]
  );

  const promotionCount = promotionCheck.rows[0]?.count || 0;

  if (promotionCount > 0) {
    return res.status(400).json({
      success: false,
      error: `ไม่สามารถลบสินค้านี้ได้ เนื่องจากมีโปรโมชั่นที่ใช้สินค้านี้อยู่ ${promotionCount} รายการ กรุณาลบออกจากโปรโมชั่นก่อน`,
    });
  }

  // Hard delete - actually delete the product
  await query(
    `DELETE FROM products WHERE id = ?`,
    [id]
  );

  const response: ApiResponse = {
    success: true,
    message: 'ลบสินค้าสำเร็จ',
  };

  res.json(response);
});

