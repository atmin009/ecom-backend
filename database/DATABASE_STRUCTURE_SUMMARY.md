# สรุปโครงสร้างฐานข้อมูล E-commerce System

## ตารางหลัก (Core Tables)

### 1. **categories** - หมวดหมู่สินค้า
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- name (VARCHAR(255), NOT NULL) - ชื่อหมวดหมู่ (ไทย)
- name_en (VARCHAR(255)) - ชื่อหมวดหมู่ (อังกฤษ)
- description (TEXT) - คำอธิบาย
- image_url (VARCHAR(500)) - URL รูปภาพ
- is_active (BOOLEAN, DEFAULT true) - สถานะใช้งาน
- sort_order (INT, DEFAULT 0) - ลำดับการแสดงผล
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 2. **brands** - แบรนด์สินค้า
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- parent_id (INT, NULL) - สำหรับ hierarchical brands (เช่น Apple > iPhone > iPhone 17)
- name (VARCHAR(255), NOT NULL) - ชื่อแบรนด์ (ไทย)
- name_en (VARCHAR(255)) - ชื่อแบรนด์ (อังกฤษ)
- description (TEXT) - คำอธิบาย
- logo_url (VARCHAR(500)) - URL โลโก้
- is_active (BOOLEAN, DEFAULT true) - สถานะใช้งาน
- sort_order (INT, DEFAULT 0) - ลำดับการแสดงผล
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- FOREIGN KEY (parent_id) REFERENCES brands(id) ON DELETE SET NULL
```

### 3. **products** - สินค้า
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- name (VARCHAR(255), NOT NULL) - ชื่อสินค้า
- sku (VARCHAR(100), UNIQUE, NOT NULL) - รหัสสินค้า
- price (DECIMAL(10, 2), NOT NULL) - ราคา
- description_short (TEXT) - คำอธิบายสั้น
- description_long (TEXT) - คำอธิบายยาว
- image_url (VARCHAR(500)) - URL รูปภาพ
- is_active (BOOLEAN, DEFAULT true) - สถานะใช้งาน
- is_free_gift (BOOLEAN, DEFAULT false) - เป็นของแถมหรือไม่
- category_id (INT, NULL) - หมวดหมู่
- brand_id (INT, NULL) - แบรนด์
- device_model (VARCHAR(255), NULL) - รุ่นมือถือที่รองรับ (สำหรับฟิล์ม)
- film_type (VARCHAR(100), NULL) - ประเภทฟิล์ม
- screen_size (VARCHAR(50), NULL) - ขนาดหน้าจอ
- thickness (VARCHAR(20), NULL) - ความหนา
- hardness (VARCHAR(20), NULL) - ความแข็ง
- features (TEXT, NULL) - คุณสมบัติพิเศษ
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
- FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL
```

### 4. **orders** - คำสั่งซื้อ
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- order_number (VARCHAR(50), UNIQUE, NOT NULL) - เลขที่คำสั่งซื้อ
- customer_phone (VARCHAR(20), NOT NULL) - เบอร์โทรศัพท์ลูกค้า
- customer_email (VARCHAR(255), NOT NULL) - อีเมลลูกค้า
- customer_name (VARCHAR(255), NOT NULL) - ชื่อลูกค้า
- shipping_address_line (TEXT, NOT NULL) - ที่อยู่จัดส่ง
- province (VARCHAR(100), NOT NULL) - จังหวัด
- district (VARCHAR(100), NOT NULL) - อำเภอ
- subdistrict (VARCHAR(100), NOT NULL) - ตำบล
- postal_code (VARCHAR(10), NOT NULL) - รหัสไปรษณีย์
- total_amount (DECIMAL(10, 2), NOT NULL) - ยอดรวม
- payment_status (ENUM: 'pending', 'paid', 'failed', DEFAULT 'pending') - สถานะการชำระเงิน
- fulfill_status (ENUM: 'pending', 'processing', 'shipped', 'completed', 'cancelled', DEFAULT 'pending') - สถานะการจัดส่ง
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 5. **order_items** - รายการสินค้าในคำสั่งซื้อ
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- order_id (INT, NOT NULL) - คำสั่งซื้อ
- product_id (INT, NOT NULL) - สินค้า
- quantity (INT, NOT NULL) - จำนวน
- unit_price (DECIMAL(10, 2), NOT NULL) - ราคาต่อหน่วย
- total_price (DECIMAL(10, 2), NOT NULL) - ราคารวม
- is_free_gift (BOOLEAN, DEFAULT false) - เป็นของแถมหรือไม่
- created_at (TIMESTAMP)
- FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
- FOREIGN KEY (product_id) REFERENCES products(id)
- CHECK (quantity > 0)
```

### 6. **payments** - การชำระเงิน
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- order_id (INT, NOT NULL) - คำสั่งซื้อ
- gateway (VARCHAR(50), NOT NULL) - ช่องทางการชำระเงิน
- gateway_transaction_id (VARCHAR(255)) - Transaction ID จาก gateway
- amount (DECIMAL(10, 2), NOT NULL) - จำนวนเงิน
- status (ENUM: 'pending', 'success', 'failed', DEFAULT 'pending') - สถานะ
- raw_response (JSON) - ข้อมูล response จาก gateway
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- FOREIGN KEY (order_id) REFERENCES orders(id)
```

### 7. **otp_requests** - คำขอ OTP
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- phone (VARCHAR(20), NOT NULL) - เบอร์โทรศัพท์
- otp_code (VARCHAR(255), NOT NULL) - OTP code (hashed)
- expires_at (TIMESTAMP, NOT NULL) - วันหมดอายุ
- attempts (INT, DEFAULT 0) - จำนวนครั้งที่ลอง
- created_at (TIMESTAMP)
```

### 8. **sms_logs** - บันทึกการส่ง SMS
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- phone (VARCHAR(20), NOT NULL) - เบอร์โทรศัพท์
- message (TEXT, NOT NULL) - ข้อความ
- type (ENUM: 'otp', 'order_created', 'payment_success', 'other', NOT NULL) - ประเภท
- status (ENUM: 'sent', 'failed', NOT NULL) - สถานะ
- created_at (TIMESTAMP)
```

## ตารางที่อยู่ (Address Tables)

### 9. **provinces** - จังหวัด
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- name_th (VARCHAR(100), NOT NULL) - ชื่อไทย
- name_en (VARCHAR(100), NOT NULL) - ชื่ออังกฤษ
```

### 10. **districts** - อำเภอ
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- province_id (INT, NOT NULL) - จังหวัด
- name_th (VARCHAR(100), NOT NULL) - ชื่อไทย
- name_en (VARCHAR(100), NOT NULL) - ชื่ออังกฤษ
- FOREIGN KEY (province_id) REFERENCES provinces(id)
```

### 11. **subdistricts** - ตำบล
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- district_id (INT, NOT NULL) - อำเภอ
- name_th (VARCHAR(100), NOT NULL) - ชื่อไทย
- name_en (VARCHAR(100), NOT NULL) - ชื่ออังกฤษ
- postal_code (VARCHAR(10), NOT NULL) - รหัสไปรษณีย์
- FOREIGN KEY (district_id) REFERENCES districts(id)
```

## ตารางระบบจัดการหลังบ้าน (Admin System)

### 12. **admin_users** - ผู้ดูแลระบบ
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- username (VARCHAR(100), UNIQUE, NOT NULL) - ชื่อผู้ใช้
- email (VARCHAR(255), UNIQUE, NOT NULL) - อีเมล
- password_hash (VARCHAR(255), NOT NULL) - รหัสผ่าน (bcrypt hashed)
- full_name (VARCHAR(255)) - ชื่อเต็ม
- role (ENUM: 'super_admin', 'admin', 'staff', DEFAULT 'admin') - บทบาท
- is_active (BOOLEAN, DEFAULT true) - สถานะใช้งาน
- last_login (TIMESTAMP, NULL) - เข้าสู่ระบบล่าสุด
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## ตารางโปรโมชั่น (Promotions System)

### 13. **promotions** - โปรโมชั่น
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- name (VARCHAR(255), NOT NULL) - ชื่อโปรโมชั่น
- description (TEXT) - คำอธิบาย
- promotion_type (ENUM: 'percentage', 'fixed_amount', 'buy_x_get_y', 'free_gift', NOT NULL) - ประเภท
- discount_value (DECIMAL(10, 2), NULL) - จำนวนส่วนลด (สำหรับ percentage หรือ fixed_amount)
- min_purchase_amount (DECIMAL(10, 2), NULL) - ยอดซื้อขั้นต่ำ
- buy_quantity (INT, NULL) - จำนวนที่ต้องซื้อ (สำหรับ buy_x_get_y)
- get_quantity (INT, NULL) - จำนวนที่ได้ (สำหรับ buy_x_get_y)
- free_gift_product_id (INT, NULL) - สินค้าของแถม (สำหรับ free_gift)
- start_date (DATETIME, NOT NULL) - วันที่เริ่ม
- end_date (DATETIME, NOT NULL) - วันที่สิ้นสุด
- is_active (BOOLEAN, DEFAULT true) - สถานะใช้งาน
- usage_limit (INT, NULL) - จำนวนครั้งที่ใช้ได้ (NULL = ไม่จำกัด)
- usage_count (INT, DEFAULT 0) - จำนวนครั้งที่ใช้แล้ว
- created_by (INT, NULL) - ผู้สร้าง (admin_user id)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- FOREIGN KEY (free_gift_product_id) REFERENCES products(id) ON DELETE SET NULL
- FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
```

### 14. **promotion_products** - สินค้าที่ใช้โปรโมชั่น (Many-to-Many)
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- promotion_id (INT, NOT NULL) - โปรโมชั่น
- product_id (INT, NOT NULL) - สินค้า
- created_at (TIMESTAMP)
- FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE
- FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
- UNIQUE KEY (promotion_id, product_id)
```

### 15. **promotion_usage_logs** - บันทึกการใช้งานโปรโมชั่น
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- promotion_id (INT, NOT NULL) - โปรโมชั่น
- order_id (INT, NOT NULL) - คำสั่งซื้อ
- discount_amount (DECIMAL(10, 2), NOT NULL) - จำนวนส่วนลด
- used_at (TIMESTAMP) - วันที่ใช้
- FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE
- FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
```

## สรุปจำนวนตาราง

**รวมทั้งหมด 15 ตาราง:**
1. categories
2. brands (มี parent_id สำหรับ hierarchical)
3. products (มี fields สำหรับฟิล์มกันรอย)
4. orders
5. order_items
6. payments
7. otp_requests
8. sms_logs
9. provinces
10. districts
11. subdistricts
12. admin_users
13. promotions
14. promotion_products
15. promotion_usage_logs

## หมายเหตุสำคัญ

1. **Brands Hierarchy**: ตาราง `brands` มี `parent_id` สำหรับสร้าง hierarchical structure (เช่น Apple > iPhone > iPhone 17 series)

2. **Film Products**: ตาราง `products` มี fields เพิ่มเติมสำหรับฟิล์มกันรอย:
   - device_model
   - film_type
   - screen_size
   - thickness
   - hardness
   - features

3. **Promotions**: ระบบโปรโมชั่นรองรับหลายประเภท:
   - percentage (ลดเปอร์เซ็นต์)
   - fixed_amount (ลดจำนวนเงิน)
   - buy_x_get_y (ซื้อ X แถม Y)
   - free_gift (ของแถม)

4. **Address Data**: ตาราง provinces, districts, subdistricts ต้อง import ข้อมูลจากไฟล์ address data

5. **Admin Users**: ต้องสร้าง admin user ผ่าน script `createAdminUser.ts` ไม่ควรใส่ password hash โดยตรงใน SQL

## ไฟล์ที่ควรใช้สำหรับสร้างฐานข้อมูลใหม่

1. **schema.sql** - โครงสร้างหลัก (แต่ยังไม่มี migrations)
2. **migration_add_category_brand.sql** - เพิ่ม categories และ brands
3. **migration_add_email.sql** - เพิ่ม customer_email ใน orders
4. **migration_add_brand_hierarchy_simple.sql** - เพิ่ม parent_id ใน brands
5. **migration_add_film_fields_simple.sql** - เพิ่ม fields สำหรับฟิล์ม
6. **migration_add_admin_promotions.sql** - เพิ่ม admin users และ promotions system

**คำแนะนำ**: ควรสร้างไฟล์ SQL ใหม่ที่รวมทุกอย่างไว้ในไฟล์เดียวสำหรับสร้างฐานข้อมูลใหม่
