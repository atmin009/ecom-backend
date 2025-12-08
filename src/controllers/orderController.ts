import { Request, Response } from 'express';
import { query, pool } from '../config/database';
import { freeGiftService } from '../services/freeGiftService';
import { asyncHandler } from '../middlewares/errorHandler';
import { CreateOrderRequest, ApiResponse, Order } from '../types';

/**
 * Create order
 * POST /api/orders
 */
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const orderData: CreateOrderRequest = req.body;

  console.log('Creating order with data:', {
    phone: orderData.phone,
    email: orderData.email,
    customer_name: orderData.customer_name,
    cart_items_count: orderData.cart_items?.length,
  });

  // Validate required fields
  const requiredFields = [
    'phone', 'email', 'customer_name', 'address_line', 'province',
    'district', 'subdistrict', 'postal_code', 'cart_items'
  ];

  const fieldNames: { [key: string]: string } = {
    phone: 'เบอร์โทรศัพท์',
    email: 'อีเมล',
    customer_name: 'ชื่อ-นามสกุล',
    address_line: 'ที่อยู่',
    province: 'จังหวัด',
    district: 'อำเภอ/เขต',
    subdistrict: 'ตำบล/แขวง',
    postal_code: 'รหัสไปรษณีย์',
    cart_items: 'รายการสินค้า',
  };

  for (const field of requiredFields) {
    if (!orderData[field as keyof CreateOrderRequest]) {
      console.error(`Missing required field: ${field}`);
      return res.status(400).json({
        success: false,
        error: `กรุณากรอก${fieldNames[field] || field}`,
      });
    }
  }

  // Validate cart items
  if (!Array.isArray(orderData.cart_items) || orderData.cart_items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'กรุณาเพิ่มสินค้าในตะกร้าก่อน',
    });
  }

  // Apply free gift rules and validate cart items
  const validatedCartItems = await freeGiftService.validateAndApplyFreeGift(
    orderData.cart_items
  );

  // Calculate total amount
  const totalAmount = validatedCartItems.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );

  // Generate order number (format: ORD-YYYYMMDD-XXXXX)
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.floor(10000 + Math.random() * 90000).toString();
  const orderNumber = `ORD-${dateStr}-${randomStr}`;

  // Get a connection for transaction
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Create order
    await connection.execute(
      `INSERT INTO orders (
        order_number, customer_phone, customer_email, customer_name,
        shipping_address_line, province, district, subdistrict, postal_code,
        total_amount, payment_status, fulfill_status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', NOW(), NOW())`,
      [
        orderNumber,
        orderData.phone,
        orderData.email,
        orderData.customer_name,
        orderData.address_line,
        orderData.province,
        orderData.district,
        orderData.subdistrict,
        orderData.postal_code,
        totalAmount,
      ]
    );

    // Get insertId from connection (mysql2 stores it in connection.insertId)
    let orderId = (connection as any).insertId;
    
    if (!orderId) {
      // Fallback: query for the order by order_number
      const [orderRows] = await connection.execute(
        `SELECT id FROM orders WHERE order_number = ?`,
        [orderNumber]
      ) as any;
      
      if (orderRows && orderRows.length > 0) {
        orderId = orderRows[0].id;
        console.log('Using fallback order ID:', orderId);
      } else {
        throw new Error('Failed to get order ID after insert');
      }
    }
    
    if (!orderId) {
      throw new Error('Order ID is missing');
    }
    
    console.log('Order created with ID:', orderId);

    // Create order items
    for (const item of validatedCartItems) {
      const isFreeGift = freeGiftService.isFreeGift(item.product_id);
      const totalPrice = item.unit_price * item.quantity;

      await connection.execute(
        `INSERT INTO order_items (
          order_id, product_id, quantity, unit_price, total_price, is_free_gift, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          orderId,
          item.product_id,
          item.quantity,
          item.unit_price,
          totalPrice,
          isFreeGift,
        ]
      );
    }

    await connection.commit();

    // Fetch the created order to get order_number and total_amount
    const [createdOrderRows] = await connection.execute(
      `SELECT order_number, total_amount FROM orders WHERE id = ?`,
      [orderId]
    ) as any;

    const response: ApiResponse<{ orderId: number; orderNumber: string; totalAmount: number }> = {
      success: true,
      data: {
        orderId,
        orderNumber: createdOrderRows[0]?.order_number || orderNumber,
        totalAmount: parseFloat(createdOrderRows[0]?.total_amount || totalAmount),
      },
      message: 'สร้างออเดอร์สำเร็จ',
    };

    res.status(201).json(response);
  } catch (error: any) {
    await connection.rollback();
    console.error('Order creation error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      errno: error.errno,
      sql: error.sql,
    });
    
    // Return more detailed error in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `${error.message} (Code: ${error.code}, SQL State: ${error.sqlState})`
      : 'ไม่สามารถสร้างออเดอร์ได้ กรุณาลองใหม่อีกครั้ง';
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
      ...(process.env.NODE_ENV === 'development' && {
        details: {
          code: error.code,
          sqlState: error.sqlState,
          sqlMessage: error.sqlMessage,
        }
      })
    });
  } finally {
    connection.release();
  }
});

/**
 * Get order by ID
 * GET /api/orders/:orderId
 */
export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;

  const orderResult = await query(
    `SELECT * FROM orders WHERE id = ?`,
    [orderId]
  );

  if (orderResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบข้อมูลออเดอร์',
    });
  }

  const order = orderResult.rows[0];

  // Get order items
  const itemsResult = await query(
    `SELECT oi.*, p.name as product_name, p.image_url as product_image
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = ?`,
    [orderId]
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

