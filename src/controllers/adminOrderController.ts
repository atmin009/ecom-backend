import { Request, Response } from 'express';
import { query } from '../config/database';
import { asyncHandler } from '../middlewares/errorHandler';
import { ApiResponse, Order } from '../types';

/**
 * Get all orders (Admin)
 * GET /api/admin/orders
 */
export const getAdminOrders = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, status, payment_status, search } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let queryStr = `
    SELECT o.*,
      (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
    FROM orders o
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (status) {
    queryStr += ` AND o.fulfill_status = ?`;
    params.push(status);
  }
  
  if (payment_status) {
    queryStr += ` AND o.payment_status = ?`;
    params.push(payment_status);
  }
  
  if (search) {
    queryStr += ` AND (
      o.order_number LIKE ? OR 
      o.customer_name LIKE ? OR 
      o.customer_phone LIKE ? OR
      o.customer_email LIKE ?
    )`;
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }
  
  // MySQL requires LIMIT and OFFSET to be integers, use template literal
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  const safeOffset = Math.max(0, Number(offset) || 0);
  const sanitizedLimit = parseInt(String(safeLimit), 10);
  const sanitizedOffset = parseInt(String(safeOffset), 10);
  queryStr += ` ORDER BY o.created_at DESC LIMIT ${sanitizedLimit} OFFSET ${sanitizedOffset}`;

  const result = await query(queryStr, params);
  
  // Get total count
  let countQuery = `SELECT COUNT(*) as total FROM orders o WHERE 1=1`;
  const countParams: any[] = [];
  
  if (status) {
    countQuery += ` AND o.fulfill_status = ?`;
    countParams.push(status);
  }
  
  if (payment_status) {
    countQuery += ` AND o.payment_status = ?`;
    countParams.push(payment_status);
  }
  
  if (search) {
    countQuery += ` AND (
      o.order_number LIKE ? OR 
      o.customer_name LIKE ? OR 
      o.customer_phone LIKE ? OR
      o.customer_email LIKE ?
    )`;
    const searchPattern = `%${search}%`;
    countParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }
  
  const countResult = await query(countQuery, countParams);
  const total = countResult.rows[0]?.total || 0;

  console.log('Admin Orders Result:', {
    rowCount: result.rows.length,
    firstRow: result.rows[0],
    total: total,
  });

  const response: ApiResponse<{
    orders: Order[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> = {
    success: true,
    data: {
      orders: result.rows || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(total),
        totalPages: Math.ceil(Number(total) / Number(limit)),
      },
    },
  };

  console.log('Admin Orders Response:', {
    success: response.success,
    ordersCount: response.data?.orders.length || 0,
    pagination: response.data?.pagination,
  });

  res.json(response);
});

/**
 * Get single order with items (Admin)
 * GET /api/admin/orders/:id
 */
export const getAdminOrderById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const orderResult = await query(
    `SELECT * FROM orders WHERE id = ?`,
    [id]
  );

  if (orderResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบออเดอร์',
    });
  }

  const order = orderResult.rows[0];

  // Get order items
  const itemsResult = await query(
    `SELECT oi.*, p.name as product_name, p.image_url as product_image, p.sku
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = ?`,
    [id]
  );

  const response: ApiResponse<any> = {
    success: true,
    data: {
      ...order,
      items: itemsResult.rows,
    },
  };

  res.json(response);
});

/**
 * Update order status (Admin)
 * PUT /api/admin/orders/:id/status
 */
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { fulfill_status, payment_status } = req.body;

  if (!fulfill_status && !payment_status) {
    return res.status(400).json({
      success: false,
      error: 'กรุณาระบุสถานะที่จะอัปเดต',
    });
  }

  const updateFields: string[] = [];
  const updateValues: any[] = [];

  if (fulfill_status) {
    const validStatuses = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];
    if (!validStatuses.includes(fulfill_status)) {
      return res.status(400).json({
        success: false,
        error: 'สถานะการจัดส่งไม่ถูกต้อง',
      });
    }
    updateFields.push('fulfill_status = ?');
    updateValues.push(fulfill_status);
  }

  if (payment_status) {
    const validStatuses = ['pending', 'paid', 'failed'];
    if (!validStatuses.includes(payment_status)) {
      return res.status(400).json({
        success: false,
        error: 'สถานะการชำระเงินไม่ถูกต้อง',
      });
    }
    updateFields.push('payment_status = ?');
    updateValues.push(payment_status);
  }

  updateFields.push('updated_at = NOW()');
  updateValues.push(id);

  await query(
    `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues
  );

  // Fetch updated order
  const orderResult = await query(
    `SELECT * FROM orders WHERE id = ?`,
    [id]
  );

  const response: ApiResponse<Order> = {
    success: true,
    data: orderResult.rows[0],
    message: 'อัปเดตสถานะออเดอร์สำเร็จ',
  };

  res.json(response);
});

