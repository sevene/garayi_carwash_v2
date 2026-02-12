// lib/products.ts
// Product interface and type definitions

/**
 * Defines the structure for a single product.
 */
export interface Product {
  _id: string;
  name: string;
  sku: string;
  description?: string;
  volume?: number | string;
  price: number | string;
  cost: number | string;
  image?: string;
  category?: string | { _id: string; name: string } | null;
  stock?: number;
  lowStockThreshold?: number;
  showInPOS?: boolean;
  soldBy?: 'piece' | 'weight/volume' | 'quantity';
  unit?: string;
  active?: boolean;
}