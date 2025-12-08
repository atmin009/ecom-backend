# Backend API Documentation

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and configure
3. Set up PostgreSQL database and run `database/schema.sql`
4. Start server: `npm run dev`

## API Endpoints

### Products

#### GET /api/products
Get all active products.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Product 1",
      "sku": "PROD-001",
      "price": 500.00,
      "description_short": "Description",
      "image_url": "https://...",
      "is_active": true,
      "is_free_gift": false
    }
  ]
}
```

#### GET /api/products/:id
Get product by ID.

---

### Authentication (OTP)

#### POST /api/auth/otp/request
Request OTP for phone verification.

**Request:**
```json
{
  "phone": "0812345678"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

**Errors:**
- 400: Invalid phone format
- 429: Rate limit exceeded

#### POST /api/auth/otp/verify
Verify OTP code.

**Request:**
```json
{
  "phone": "0812345678",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "phoneVerified": true
  }
}
```

**Errors:**
- 400: Invalid OTP, expired, or too many attempts

---

### Orders

#### POST /api/orders
Create a new order.

**Request:**
```json
{
  "phone": "0812345678",
  "customer_name": "John Doe",
  "address_line": "123 Main St",
  "province": "Bangkok",
  "district": "Sathon",
  "subdistrict": "Sathon",
  "postal_code": "10120",
  "cart_items": [
    {
      "product_id": 1,
      "quantity": 2,
      "unit_price": 500.00
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": 1,
    "orderNumber": "ORD-20240101-12345",
    "totalAmount": 1000.00
  }
}
```

**Note:** Free gift is automatically added/removed based on subtotal.

#### GET /api/orders/:orderId
Get order by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "order_number": "ORD-20240101-12345",
    "customer_phone": "0812345678",
    "customer_name": "John Doe",
    "total_amount": 1000.00,
    "payment_status": "pending",
    "fulfill_status": "pending",
    "items": [...]
  }
}
```

---

### Payments

#### POST /api/payments/create
Create payment session.

**Request:**
```json
{
  "orderId": 1,
  "method": "qr"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentUrl": "https://moneyspace.com/pay/...",
    "qrCode": "https://...",
    "transactionId": "TXN-123"
  }
}
```

#### POST /api/payments/moneyspace/webhook
Money Space webhook endpoint (called by Money Space).

---

### Addresses

#### GET /api/addresses/thailand
Get Thai address hierarchy data.

**Response:**
```json
{
  "success": true,
  "data": {
    "provinces": [
      {
        "id": 1,
        "name_th": "กรุงเทพมหานคร",
        "name_en": "Bangkok"
      }
    ],
    "districts": [...],
    "subdistricts": [...]
  }
}
```

## Free Gift Logic

- Free gift is automatically added when cart subtotal >= `FREE_GIFT_MIN_SUBTOTAL` (default: 1000 THB)
- Free gift product is identified by `is_free_gift = true` in products table
- Free gift quantity is always 1
- Free gift price is always 0
- Rules are enforced both on frontend and backend

## Integration Notes

### SMS Gateway
Edit `src/services/smsService.ts` to integrate with your SMS provider.

### Money Space
Edit `src/services/paymentService.ts` to integrate with Money Space API.

### Thai Address Data
Populate `provinces`, `districts`, `subdistricts` tables with Thai address data.

