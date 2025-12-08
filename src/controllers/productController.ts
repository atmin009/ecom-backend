import { Request, Response } from 'express';
import { query } from '../config/database';
import { asyncHandler } from '../middlewares/errorHandler';
import { Product, ApiResponse } from '../types';

/**
 * Get all active products
 */
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const { category_id, brand_id, device_model, film_type, search } = req.query;
  
  let queryStr = `
    SELECT 
      p.id, p.name, p.sku, p.price, p.description_short, p.description_long, 
      p.image_url, p.is_active, p.is_free_gift, p.category_id, p.brand_id,
      p.device_model, p.film_type, p.screen_size, p.thickness, p.hardness, p.features,
      c.id as category_id_full, c.name as category_name, c.name_en as category_name_en,
      b.id as brand_id_full, b.name as brand_name, b.name_en as brand_name_en
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE p.is_active = true
  `;
  
  const params: any[] = [];
  
  if (category_id) {
    queryStr += ` AND p.category_id = ?`;
    params.push(category_id);
  }
  
  if (brand_id) {
    queryStr += ` AND p.brand_id = ?`;
    params.push(brand_id);
  }
  
  if (device_model) {
    queryStr += ` AND (p.device_model LIKE ? OR p.name LIKE ?)`;
    const modelPattern = `%${device_model}%`;
    params.push(modelPattern, modelPattern);
  }
  
  if (film_type) {
    queryStr += ` AND p.film_type = ?`;
    params.push(film_type);
  }
  
  if (search) {
    queryStr += ` AND (
      p.name LIKE ? OR 
      p.description_short LIKE ? OR 
      p.device_model LIKE ? OR
      p.sku LIKE ?
    )`;
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }
  
  queryStr += ` ORDER BY p.created_at DESC`;
  
  const result = await query(queryStr, params.length > 0 ? params : undefined);
  
  // Transform results to include category and brand objects
  const products: Product[] = result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    price: row.price,
    description_short: row.description_short,
    description_long: row.description_long,
    image_url: row.image_url,
    is_active: row.is_active,
    is_free_gift: row.is_free_gift,
    category_id: row.category_id,
    brand_id: row.brand_id,
    device_model: row.device_model,
    film_type: row.film_type,
    screen_size: row.screen_size,
    thickness: row.thickness,
    hardness: row.hardness,
    features: row.features,
    category: row.category_id ? {
      id: row.category_id_full,
      name: row.category_name,
      name_en: row.category_name_en,
    } : undefined,
    brand: row.brand_id ? {
      id: row.brand_id_full,
      name: row.brand_name,
      name_en: row.brand_name_en,
    } : undefined,
  }));

  const response: ApiResponse<Product[]> = {
    success: true,
    data: products,
  };

  res.json(response);
});

/**
 * Get single product by ID
 */
export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query(
    `SELECT 
      p.id, p.name, p.sku, p.price, p.description_short, p.description_long, 
      p.image_url, p.is_active, p.is_free_gift, p.category_id, p.brand_id,
      p.device_model, p.film_type, p.screen_size, p.thickness, p.hardness, p.features,
      c.id as category_id_full, c.name as category_name, c.name_en as category_name_en,
      b.id as brand_id_full, b.name as brand_name, b.name_en as brand_name_en
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE p.id = ? AND p.is_active = true`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบสินค้า',
    });
  }

  const row = result.rows[0];
  const product: Product = {
    id: row.id,
    name: row.name,
    sku: row.sku,
    price: row.price,
    description_short: row.description_short,
    description_long: row.description_long,
    image_url: row.image_url,
    is_active: row.is_active,
    is_free_gift: row.is_free_gift,
    category_id: row.category_id,
    brand_id: row.brand_id,
    device_model: row.device_model,
    film_type: row.film_type,
    screen_size: row.screen_size,
    thickness: row.thickness,
    hardness: row.hardness,
    features: row.features,
    category: row.category_id ? {
      id: row.category_id_full,
      name: row.category_name,
      name_en: row.category_name_en,
    } : undefined,
    brand: row.brand_id ? {
      id: row.brand_id_full,
      name: row.brand_name,
      name_en: row.brand_name_en,
    } : undefined,
  };

  const response: ApiResponse<Product> = {
    success: true,
    data: product,
  };

  res.json(response);
});

