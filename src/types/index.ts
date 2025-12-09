// Category types
export interface Category {
  id: number;
  name: string;
  name_en?: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  sort_order?: number;
}

// Brand types
export interface Brand {
  id: number;
  parent_id?: number | null;
  name: string;
  name_en?: string;
  description?: string;
  logo_url?: string;
  is_active: boolean;
  sort_order?: number;
  parent?: Brand | null;
  children?: Brand[];
  path?: string; // Breadcrumb path (e.g., "Apple > iPhone > iPhone 17 series")
}

// Product types
export interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  description_short?: string;
  description_long?: string;
  image_url?: string;
  is_active: boolean;
  is_free_gift: boolean;
  category_id?: number;
  brand_id?: number;
  category?: Category;
  brand?: Brand;
  // Screen protector specific fields
  device_model?: string; // รุ่นมือถือที่รองรับ (เช่น iPhone 15 Pro Max)
  film_type?: string; // ประเภทฟิล์ม (Tempered Glass, Privacy, Anti-fingerprint)
  screen_size?: string; // ขนาดหน้าจอ (เช่น 6.7 นิ้ว)
  thickness?: string; // ความหนา (เช่น 0.33mm)
  hardness?: string; // ความแข็ง (เช่น 9H)
  features?: string; // คุณสมบัติพิเศษ
  // Promotion fields
  promotion_price?: number; // ราคาโปรโมชั่น
  promotion_start_date?: string; // ISO date string
  promotion_end_date?: string; // ISO date string
  promotion_action?: 'revert_price' | 'hide_product'; // การกระทำเมื่อหมดเวลา
  original_price?: number; // ราคาเดิม (เก็บไว้สำหรับ revert)
  created_at?: Date;
  updated_at?: Date;
}

// Cart types
export interface CartItem {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export interface CartItemWithProduct extends CartItem {
  product?: Product;
}

// Order types
export interface Order {
  id: number;
  order_number: string;
  customer_phone: string;
  customer_email: string;
  customer_name: string;
  shipping_address_line: string;
  province: string;
  district: string;
  subdistrict: string;
  postal_code: string;
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'failed';
  fulfill_status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
  created_at?: Date;
  updated_at?: Date;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_free_gift: boolean;
  created_at?: Date;
}

export interface CreateOrderRequest {
  phone: string;
  email: string;
  customer_name: string;
  address_line: string;
  province: string;
  district: string;
  subdistrict: string;
  postal_code: string;
  cart_items: CartItem[];
}

// OTP types
export interface OTPRequest {
  id: number;
  phone: string;
  otp_code: string; // hashed
  expires_at: Date;
  attempts: number;
  created_at?: Date;
}

export interface OTPVerifyRequest {
  phone: string;
  otp: string;
}

// Payment types
export interface Payment {
  id: number;
  order_id: number;
  gateway: string;
  gateway_transaction_id?: string;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  raw_response?: any;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreatePaymentRequest {
  orderId: number;
  method: 'qr' | 'card';
}

export interface PaymentResponse {
  paymentUrl: string;
  qrCode?: string;
  transactionId?: string;
  token?: string; // Moneyspec payment token
  options?: any; // Payment options from Moneyspec API
  isFallback?: boolean; // Flag indicating fallback mode
  message?: string; // Additional message (e.g., error or warning)
}

// SMS types
export interface SMSLog {
  id: number;
  phone: string;
  message: string;
  type: 'otp' | 'order_created' | 'payment_success' | 'other';
  status: 'sent' | 'failed';
  created_at?: Date;
}

// Address types
export interface ThaiProvince {
  id: number;
  name_th: string;
  name_en: string;
}

export interface ThaiDistrict {
  id: number;
  province_id: number;
  name_th: string;
  name_en: string;
}

export interface ThaiSubdistrict {
  id: number;
  district_id: number;
  name_th: string;
  name_en: string;
  postal_code: string;
}

export interface ThailandAddressData {
  provinces: ThaiProvince[];
  districts: ThaiDistrict[];
  subdistricts: ThaiSubdistrict[];
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

