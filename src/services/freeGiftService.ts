import { query } from '../config/database';
import { CartItem, Product } from '../types';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Free Gift Service
 * 
 * Handles automatic free gift logic:
 * - Adds free gift when conditions are met
 * - Removes free gift when conditions are no longer met
 * - Ensures free gift quantity is always 1 and cannot be modified
 */
class FreeGiftService {
  private freeGiftProductId: number;
  private minSubtotal: number;

  constructor() {
    this.freeGiftProductId = parseInt(process.env.FREE_GIFT_PRODUCT_ID || '1');
    this.minSubtotal = parseFloat(process.env.FREE_GIFT_MIN_SUBTOTAL || '1000');
  }

  /**
   * Apply free gift rules to cart items
   * 
   * Rules:
   * 1. If subtotal (excluding free gift) >= minSubtotal, add free gift
   * 2. If subtotal < minSubtotal, remove free gift
   * 3. Free gift quantity is always 1
   * 4. Free gift price is always 0
   */
  async applyFreeGiftRules(cartItems: CartItem[]): Promise<CartItem[]> {
    // Get free gift product info
    const freeGiftProduct = await this.getFreeGiftProduct();
    if (!freeGiftProduct) {
      console.warn('Free gift product not found');
      return cartItems;
    }

    // Calculate subtotal excluding free gift
    const subtotal = cartItems
      .filter(item => item.product_id !== this.freeGiftProductId)
      .reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

    // Check if free gift is already in cart
    const freeGiftIndex = cartItems.findIndex(
      item => item.product_id === this.freeGiftProductId
    );

    const hasFreeGift = freeGiftIndex !== -1;
    const shouldHaveFreeGift = subtotal >= this.minSubtotal;

    // If conditions are met and free gift not in cart, add it
    if (shouldHaveFreeGift && !hasFreeGift) {
      cartItems.push({
        product_id: this.freeGiftProductId,
        quantity: 1,
        unit_price: 0, // Free gift is always free
      });
    }
    // If conditions not met and free gift is in cart, remove it
    else if (!shouldHaveFreeGift && hasFreeGift) {
      cartItems.splice(freeGiftIndex, 1);
    }
    // If free gift is in cart, ensure quantity is 1 and price is 0
    else if (hasFreeGift) {
      cartItems[freeGiftIndex].quantity = 1;
      cartItems[freeGiftIndex].unit_price = 0;
    }

    return cartItems;
  }

  /**
   * Validate cart items and ensure free gift rules are applied
   * Used during order creation to enforce rules server-side
   */
  async validateAndApplyFreeGift(cartItems: CartItem[]): Promise<CartItem[]> {
    // Verify all products exist and get current prices
    const validatedItems: CartItem[] = [];

    for (const item of cartItems) {
      // Skip free gift validation (we'll add it separately)
      if (item.product_id === this.freeGiftProductId) {
        continue;
      }

      const productResult = await query(
        `SELECT id, price, is_active, is_free_gift FROM products WHERE id = ?`,
        [item.product_id]
      );

      if (productResult.rows.length === 0) {
        throw new Error(`Product not found: ${item.product_id}`);
      }

      const product = productResult.rows[0];
      if (!product.is_active) {
        throw new Error(`Product is not active: ${item.product_id}`);
      }

      // Use current product price (prevent price manipulation)
      validatedItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: product.price,
      });
    }

    // Apply free gift rules
    const itemsWithFreeGift = await this.applyFreeGiftRules(validatedItems);

    return itemsWithFreeGift;
  }

  /**
   * Get free gift product
   */
  private async getFreeGiftProduct(): Promise<Product | null> {
    try {
      const result = await query(
        `SELECT * FROM products WHERE id = ? AND is_free_gift = true`,
        [this.freeGiftProductId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching free gift product:', error);
      return null;
    }
  }

  /**
   * Check if a product is the free gift
   */
  isFreeGift(productId: number): boolean {
    return productId === this.freeGiftProductId;
  }
}

export const freeGiftService = new FreeGiftService();

