import { Request, Response } from 'express';
import { query, pool } from '../config/database';
import { asyncHandler } from '../middlewares/errorHandler';
import { ApiResponse, Brand } from '../types';

/**
 * Build hierarchical brand tree
 */
function buildBrandTree(brands: Brand[]): Brand[] {
  const brandMap = new Map<number, Brand>();
  const rootBrands: Brand[] = [];

  // First pass: create map and initialize children arrays
  brands.forEach(brand => {
    brandMap.set(brand.id, { ...brand, children: [] });
  });

  // Second pass: build tree structure
  brands.forEach(brand => {
    const brandNode = brandMap.get(brand.id)!;
    
    if (brand.parent_id && brandMap.has(brand.parent_id)) {
      const parent = brandMap.get(brand.parent_id)!;
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(brandNode);
    } else {
      rootBrands.push(brandNode);
    }
  });

  // Third pass: build path for each brand (from root to leaf)
  function buildPath(brand: Brand): string {
    const pathParts: string[] = [];
    let current: Brand | undefined = brand;
    
    // Traverse up to root
    while (current) {
      pathParts.unshift(current.name);
      if (current.parent_id && brandMap.has(current.parent_id)) {
        current = brandMap.get(current.parent_id);
      } else {
        break;
      }
    }
    
    return pathParts.join(' > ');
  }

  function addPaths(brands: Brand[]) {
    brands.forEach(brand => {
      brand.path = buildPath(brand);
      if (brand.children && brand.children.length > 0) {
        addPaths(brand.children);
      }
    });
  }

  addPaths(rootBrands);

  // Flatten tree for display (with indentation)
  function flattenTree(brands: Brand[], level: number = 0): Brand[] {
    const result: Brand[] = [];
    brands.forEach(brand => {
      result.push({ ...brand, children: undefined }); // Remove children from flat list
      if (brand.children && brand.children.length > 0) {
        result.push(...flattenTree(brand.children, level + 1));
      }
    });
    return result;
  }

  return flattenTree(rootBrands);
}

/**
 * Get all brands (Admin) - Returns hierarchical structure
 * GET /api/admin/brands
 */
export const getAdminBrands = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT * FROM brands ORDER BY sort_order ASC, name ASC`
  );

  const brands = result.rows as Brand[];
  const treeBrands = buildBrandTree(brands);

  const response: ApiResponse<Brand[]> = {
    success: true,
    data: treeBrands,
  };

  res.json(response);
});

/**
 * Get single brand (Admin)
 * GET /api/admin/brands/:id
 */
export const getAdminBrandById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query(
    `SELECT * FROM brands WHERE id = ?`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบแบรนด์',
    });
  }

  const brand = result.rows[0] as Brand;

  // Build path
  if (brand.parent_id) {
    const pathParts: string[] = [brand.name];
    let currentParentId = brand.parent_id;
    
    while (currentParentId) {
      const parentResult = await query(
        `SELECT id, name, parent_id FROM brands WHERE id = ?`,
        [currentParentId]
      );
      
      if (parentResult.rows.length > 0) {
        const parent = parentResult.rows[0];
        pathParts.unshift(parent.name);
        currentParentId = parent.parent_id;
      } else {
        break;
      }
    }
    
    brand.path = pathParts.join(' > ');
  } else {
    brand.path = brand.name;
  }

  const response: ApiResponse<Brand> = {
    success: true,
    data: brand,
  };

  res.json(response);
});

/**
 * Check for circular reference in brand hierarchy
 */
async function checkCircularReference(brandId: number, parentId: number | null): Promise<boolean> {
  if (!parentId) return false;
  
  let currentId = parentId;
  const visited = new Set<number>();
  
  while (currentId) {
    if (currentId === brandId) {
      return true; // Circular reference detected
    }
    
    if (visited.has(currentId)) {
      break; // Prevent infinite loop
    }
    
    visited.add(currentId);
    
    const result = await query(
      `SELECT parent_id FROM brands WHERE id = ?`,
      [currentId]
    );
    
    if (result.rows.length === 0) {
      break;
    }
    
    currentId = result.rows[0].parent_id;
  }
  
  return false;
}

/**
 * Create brand (Admin)
 * POST /api/admin/brands
 */
export const createAdminBrand = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    name_en,
    description,
    logo_url,
    is_active,
    sort_order,
    parent_id,
  } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'กรุณากรอกชื่อแบรนด์',
    });
  }

  // Validate parent_id if provided
  if (parent_id) {
    const parentResult = await query(
      `SELECT id FROM brands WHERE id = ?`,
      [parent_id]
    );
    
    if (parentResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ไม่พบแบรนด์หลักที่ระบุ',
      });
    }
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO brands (
        name, name_en, description, logo_url, is_active, sort_order, parent_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        name_en || null,
        description || null,
        logo_url || null,
        is_active !== undefined ? is_active : true,
        sort_order || 0,
        parent_id || null,
      ]
    ) as any;

    const brandId = result.insertId;
    await connection.commit();

    // Fetch created brand
    const brandResult = await query(
      `SELECT * FROM brands WHERE id = ?`,
      [brandId]
    );

    const response: ApiResponse<Brand> = {
      success: true,
      data: brandResult.rows[0],
      message: 'สร้างแบรนด์สำเร็จ',
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
 * Update brand (Admin)
 * PUT /api/admin/brands/:id
 */
export const updateAdminBrand = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    name_en,
    description,
    logo_url,
    is_active,
    sort_order,
    parent_id,
  } = req.body;

  // Check if brand exists
  const existingBrand = await query(
    `SELECT id, parent_id FROM brands WHERE id = ?`,
    [id]
  );

  if (existingBrand.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบแบรนด์',
    });
  }

  // Validate parent_id if provided
  if (parent_id !== undefined) {
    if (parent_id === parseInt(id)) {
      return res.status(400).json({
        success: false,
        error: 'ไม่สามารถตั้งให้เป็น parent ของตัวเองได้',
      });
    }

    if (parent_id) {
      const parentResult = await query(
        `SELECT id FROM brands WHERE id = ?`,
        [parent_id]
      );
      
      if (parentResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'ไม่พบแบรนด์หลักที่ระบุ',
        });
      }

      // Check for circular reference
      const hasCircular = await checkCircularReference(parseInt(id), parent_id);
      if (hasCircular) {
        return res.status(400).json({
          success: false,
          error: 'ไม่สามารถตั้ง parent ได้ เนื่องจากจะเกิด circular reference',
        });
      }
    }
  }

  const updateFields: string[] = [];
  const updateValues: any[] = [];

  if (name !== undefined) { updateFields.push('name = ?'); updateValues.push(name); }
  if (name_en !== undefined) { updateFields.push('name_en = ?'); updateValues.push(name_en); }
  if (description !== undefined) { updateFields.push('description = ?'); updateValues.push(description); }
  if (logo_url !== undefined) { updateFields.push('logo_url = ?'); updateValues.push(logo_url); }
  if (is_active !== undefined) { updateFields.push('is_active = ?'); updateValues.push(is_active); }
  if (sort_order !== undefined) { updateFields.push('sort_order = ?'); updateValues.push(sort_order); }
  if (parent_id !== undefined) { updateFields.push('parent_id = ?'); updateValues.push(parent_id || null); }

  if (updateFields.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'ไม่มีข้อมูลที่จะอัปเดต',
    });
  }

  updateFields.push('updated_at = NOW()');
  updateValues.push(id);

  await query(
    `UPDATE brands SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues
  );

  // Fetch updated brand
  const brandResult = await query(
    `SELECT * FROM brands WHERE id = ?`,
    [id]
  );

  const response: ApiResponse<Brand> = {
    success: true,
    data: brandResult.rows[0],
    message: 'อัปเดตแบรนด์สำเร็จ',
  };

  res.json(response);
});

/**
 * Delete brand (Admin)
 * DELETE /api/admin/brands/:id
 */
export const deleteAdminBrand = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if brand exists
  const existingBrand = await query(
    `SELECT id FROM brands WHERE id = ?`,
    [id]
  );

  if (existingBrand.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบแบรนด์',
    });
  }

  // Check if brand has children
  const childrenCount = await query(
    `SELECT COUNT(*) as count FROM brands WHERE parent_id = ?`,
    [id]
  );

  if (childrenCount.rows[0]?.count > 0) {
    return res.status(400).json({
      success: false,
      error: 'ไม่สามารถลบแบรนด์ได้ เนื่องจากมีแบรนด์ลูกอยู่ กรุณาลบหรือย้ายแบรนด์ลูกก่อน',
    });
  }

  // Check if brand is used by products
  const productsUsingBrand = await query(
    `SELECT COUNT(*) as count FROM products WHERE brand_id = ?`,
    [id]
  );

  if (productsUsingBrand.rows[0]?.count > 0) {
    return res.status(400).json({
      success: false,
      error: 'ไม่สามารถลบแบรนด์ได้ เนื่องจากมีสินค้าใช้งานอยู่',
    });
  }

  // Soft delete
  await query(
    `UPDATE brands SET is_active = false, updated_at = NOW() WHERE id = ?`,
    [id]
  );

  const response: ApiResponse = {
    success: true,
    message: 'ลบแบรนด์สำเร็จ',
  };

  res.json(response);
});

