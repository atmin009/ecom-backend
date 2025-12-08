import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import multer from 'multer';
import { query, pool } from '../config/database';
import { asyncHandler } from '../middlewares/errorHandler';
import { ApiResponse } from '../types';
import { authenticateAdmin } from '../middlewares/authMiddleware';

// Configure multer for file upload
const storage = multer.memoryStorage();
export const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('กรุณาอัปโหลดไฟล์ Excel (.xlsx, .xls) หรือ CSV เท่านั้น'));
    }
  },
});

/**
 * Export products to Excel template
 * GET /api/admin/products/export/template
 */
export const exportProductsTemplate = asyncHandler(async (req: Request, res: Response) => {
  // Create template with headers only
  const headers = [
    'SKU',
    'ชื่อสินค้า',
    'ราคา',
    'คำอธิบายสั้น',
    'คำอธิบายยาว',
    'URL รูปภาพ',
    'เปิดใช้งาน (true/false)',
    'ของแถม (true/false)',
    'หมวดหมู่ ID',
    'แบรนด์ ID',
    'รุ่นมือถือ',
    'ประเภทฟิล์ม',
    'ขนาดหน้าจอ',
    'ความหนา',
    'ความแข็ง',
    'คุณสมบัติ',
  ];

  const templateData = [headers];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(templateData);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // SKU
    { wch: 30 }, // ชื่อสินค้า
    { wch: 12 }, // ราคา
    { wch: 40 }, // คำอธิบายสั้น
    { wch: 50 }, // คำอธิบายยาว
    { wch: 50 }, // URL รูปภาพ
    { wch: 15 }, // เปิดใช้งาน
    { wch: 15 }, // ของแถม
    { wch: 12 }, // หมวดหมู่ ID
    { wch: 12 }, // แบรนด์ ID
    { wch: 25 }, // รุ่นมือถือ
    { wch: 20 }, // ประเภทฟิล์ม
    { wch: 15 }, // ขนาดหน้าจอ
    { wch: 12 }, // ความหนา
    { wch: 10 }, // ความแข็ง
    { wch: 40 }, // คุณสมบัติ
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Products');

  // Add Categories sheet
  const categoriesResult = await query(`SELECT id, name FROM categories WHERE is_active = true`);
  const categoriesData = [['ID', 'ชื่อหมวดหมู่'], ...categoriesResult.rows.map((c: any) => [c.id, c.name])];
  const categoriesWs = XLSX.utils.aoa_to_sheet(categoriesData);
  XLSX.utils.book_append_sheet(wb, categoriesWs, 'Categories');

  // Add Brands sheet
  const brandsResult = await query(`SELECT id, name FROM brands WHERE is_active = true`);
  const brandsData = [['ID', 'ชื่อแบรนด์'], ...brandsResult.rows.map((b: any) => [b.id, b.name])];
  const brandsWs = XLSX.utils.aoa_to_sheet(brandsData);
  XLSX.utils.book_append_sheet(wb, brandsWs, 'Brands');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=product_template.xlsx');
  res.send(buffer);
});

/**
 * Export all products to Excel
 * GET /api/admin/products/export
 */
export const exportProducts = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(`
    SELECT 
      p.sku,
      p.name,
      p.price,
      p.description_short,
      p.description_long,
      p.image_url,
      p.is_active,
      p.is_free_gift,
      p.category_id,
      p.brand_id,
      p.device_model,
      p.film_type,
      p.screen_size,
      p.thickness,
      p.hardness,
      p.features
    FROM products p
    ORDER BY p.created_at DESC
  `);

  const headers = [
    'SKU',
    'ชื่อสินค้า',
    'ราคา',
    'คำอธิบายสั้น',
    'คำอธิบายยาว',
    'URL รูปภาพ',
    'เปิดใช้งาน',
    'ของแถม',
    'หมวดหมู่ ID',
    'แบรนด์ ID',
    'รุ่นมือถือ',
    'ประเภทฟิล์ม',
    'ขนาดหน้าจอ',
    'ความหนา',
    'ความแข็ง',
    'คุณสมบัติ',
  ];

  const data = [
    headers,
    ...result.rows.map((p: any) => [
      p.sku,
      p.name,
      p.price,
      p.description_short || '',
      p.description_long || '',
      p.image_url || '',
      p.is_active ? 'true' : 'false',
      p.is_free_gift ? 'true' : 'false',
      p.category_id || '',
      p.brand_id || '',
      p.device_model || '',
      p.film_type || '',
      p.screen_size || '',
      p.thickness || '',
      p.hardness || '',
      p.features || '',
    ]),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 40 }, { wch: 50 },
    { wch: 50 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
    { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 40 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Products');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=products_export.xlsx');
  res.send(buffer);
});

/**
 * Import products from Excel
 * POST /api/admin/products/import
 */
export const importProducts = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'กรุณาอัปโหลดไฟล์ Excel',
    });
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

    if (data.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'ไฟล์ Excel ไม่มีข้อมูล',
      });
    }

    // Skip header row
    const rows = data.slice(1);
    const connection = await pool.getConnection();
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      await connection.beginTransaction();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Skip empty rows
        if (!row[0] || !row[1]) {
          continue;
        }

        try {
          const sku = String(row[0] || '').trim();
          const name = String(row[1] || '').trim();
          const price = parseFloat(row[2] || 0);
          
          if (!sku || !name || !price || price <= 0) {
            errors.push(`แถว ${i + 2}: SKU, ชื่อสินค้า และราคาต้องกรอก`);
            errorCount++;
            continue;
          }

          // Check if SKU already exists
          const existing = await query(
            `SELECT id FROM products WHERE sku = ?`,
            [sku]
          );

          const isActive = String(row[6] || 'true').toLowerCase() === 'true';
          const isFreeGift = String(row[7] || 'false').toLowerCase() === 'true';
          const categoryId = row[8] ? parseInt(String(row[8])) : null;
          const brandId = row[9] ? parseInt(String(row[9])) : null;

          if (existing.rows.length > 0) {
            // Update existing product
            await connection.execute(
              `UPDATE products SET
                name = ?, price = ?, description_short = ?, description_long = ?,
                image_url = ?, is_active = ?, is_free_gift = ?, category_id = ?, brand_id = ?,
                device_model = ?, film_type = ?, screen_size = ?, thickness = ?, hardness = ?, features = ?,
                updated_at = NOW()
              WHERE sku = ?`,
              [
                name,
                price,
                row[3] || null,
                row[4] || null,
                row[5] || null,
                isActive,
                isFreeGift,
                categoryId,
                brandId,
                row[10] || null,
                row[11] || null,
                row[12] || null,
                row[13] || null,
                row[14] || null,
                row[15] || null,
                sku,
              ]
            );
          } else {
            // Create new product
            await connection.execute(
              `INSERT INTO products (
                sku, name, price, description_short, description_long, image_url,
                is_active, is_free_gift, category_id, brand_id,
                device_model, film_type, screen_size, thickness, hardness, features
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                sku,
                name,
                price,
                row[3] || null,
                row[4] || null,
                row[5] || null,
                isActive,
                isFreeGift,
                categoryId,
                brandId,
                row[10] || null,
                row[11] || null,
                row[12] || null,
                row[13] || null,
                row[14] || null,
                row[15] || null,
              ]
            );
          }

          successCount++;
        } catch (err: any) {
          errors.push(`แถว ${i + 2}: ${err.message || 'เกิดข้อผิดพลาด'}`);
          errorCount++;
        }
      }

      await connection.commit();

      const response: ApiResponse<{
        successCount: number;
        errorCount: number;
        errors: string[];
      }> = {
        success: true,
        data: {
          successCount,
          errorCount,
          errors: errors.slice(0, 20), // Limit to first 20 errors
        },
        message: `นำเข้าสินค้าเสร็จสิ้น: สำเร็จ ${successCount} รายการ, ผิดพลาด ${errorCount} รายการ`,
      };

      res.json(response);
    } catch (error: any) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: `ไม่สามารถอ่านไฟล์ Excel ได้: ${error.message}`,
    });
  }
});

