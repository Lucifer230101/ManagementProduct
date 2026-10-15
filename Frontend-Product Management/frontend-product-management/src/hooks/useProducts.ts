import { useState, useEffect } from 'react';
import { productService } from '@/services/productService';
import type { Product } from '@/types';

export function useProducts(page = 1, limit = 10) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    productService.getAll(page, limit)
      .then((res) => { setProducts(res.data); setTotal(res.total); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, limit]);

  return { products, loading, error, total };
}
