'use client';
import { createContext, useContext, useState, ReactNode } from 'react';
import type { Product } from '@/types';

interface ProductStore {
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
}

const ProductContext = createContext<ProductStore | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  return (
    // @ts-ignore
    <ProductContext.Provider value={{ selectedProduct, setSelectedProduct }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProductStore() {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error('useProductStore must be used inside ProductProvider');
  return ctx;
}
