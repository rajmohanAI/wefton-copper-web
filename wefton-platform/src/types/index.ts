// ============================================================
// Wefton Copper — Core Type Definitions
// ============================================================

export interface Product {
  productId: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: string;
  subcategory?: string;
  gender: 'men' | 'women' | 'unisex';
  tags: string[];
  price: number;
  comparePrice?: number;
  inventory: number;
  sku: string;
  images: ProductImage[];
  variants: ProductVariant[];
  ratings: number;
  reviewsCount: number;
  featured: boolean;
  bestseller: boolean;
  newArrival: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductImage {
  url: string;
  alt: string;
  isPrimary?: boolean;
}

export interface ProductVariant {
  variantId: string;
  size?: string;
  color?: string;
  colorHex?: string;
  price?: number;
  inventory: number;
  sku?: string;
}

export interface Review {
  reviewId: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  images?: string[];
  verified: boolean;
  helpful: number;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  title: string;
  slug: string;
  image: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  colorHex?: string;
  variantId?: string;
  inventory: number;
}

export interface Cart {
  userId?: string;
  items: CartItem[];
  couponCode?: string;
  discount?: number;
}

export interface Address {
  addressId: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault?: boolean;
}

export interface Order {
  orderId: string;
  userId: string;
  products: OrderItem[];
  subtotal: number;
  shipping: number;
  taxes: number;
  total: number;
  paymentStatus: 'pending' | 'uploaded' | 'verified' | 'failed' | 'refunded';
  orderStatus: 'placed' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: Address;
  paymentMethod: 'qr' | 'razorpay' | 'stripe' | 'cod';
  paymentReference?: string;
  paymentScreenshot?: string;
  trackingNumber?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OrderItem {
  productId: string;
  title: string;
  image: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
}

export interface User {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  addresses: Address[];
  wishlist: string[];
  orders: string[];
  role: 'user' | 'admin';
  createdAt: string;
}

export interface Category {
  categoryId: string;
  name: string;
  slug: string;
  image?: string;
  gender: 'men' | 'women' | 'unisex';
  description?: string;
  order?: number;
}

export interface FilterState {
  category: string[];
  gender: string[];
  priceRange: [number, number];
  rating: number;
  availability: boolean;
  newArrivals: boolean;
  bestsellers: boolean;
  sortBy: 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'bestseller';
}

export interface WishlistItem {
  productId: string;
  addedAt: string;
}

export interface Coupon {
  code: string;
  discount: number;
  active: boolean;
  expiresAt: string | null;
}

export interface NewsletterSubscriber {
  email: string;
  subscribedAt: string;
}

export interface AdminStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalUsers: number;
  pendingOrders: number;
  pendingPayments: number;
}
