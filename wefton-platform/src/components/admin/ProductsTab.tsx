'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { deleteProduct } from '@/services/productService';
import { formatPrice } from '@/lib/utils';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ProductFormModal from './ProductFormModal';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import type { Product } from '@/types';

export default function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const db = getFirebaseDb();
      if (!db) {
        setProducts([]);
        return;
      }
      const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({
        productId: d.id,
        ...(d.data() as Omit<Product, 'productId'>),
      }));
      setProducts(items);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddProduct = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteTarget.productId);
      setProducts((prev) => prev.filter((p) => p.productId !== deleteTarget.productId));
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Failed to delete product. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleFormSuccess = () => {
    fetchProducts();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 rounded-full border-2 border-[var(--copper-main)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-light text-[var(--text-light)]">
          Products ({products.length})
        </h2>
        <Button variant="copper" size="sm" onClick={handleAddProduct}>
          <Plus size={14} /> Add Product
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Package size={40} className="text-[var(--text-faint)] mx-auto mb-4" />
          <p className="text-[var(--text-muted)] mb-4">No products yet</p>
          <Button variant="copper" onClick={handleAddProduct}>
            <Plus size={14} /> Add First Product
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[60px_1fr_120px_80px_100px_80px_140px_80px] gap-3 px-4 py-2 text-[10px] font-medium tracking-wider uppercase text-[var(--text-muted)]">
            <span>Image</span>
            <span>Title</span>
            <span>Category</span>
            <span>Gender</span>
            <span>Price</span>
            <span>Stock</span>
            <span>Badges</span>
            <span>Actions</span>
          </div>

          {/* Product rows */}
          {products.map((product) => {
            const primaryImage = product.images?.find((img) => img.isPrimary) || product.images?.[0];
            return (
              <div
                key={product.productId}
                className="glass-card p-4 md:grid md:grid-cols-[60px_1fr_120px_80px_100px_80px_140px_80px] md:gap-3 md:items-center"
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded border border-white/10 overflow-hidden bg-white/5 flex-shrink-0">
                  {primaryImage ? (
                    <img
                      src={primaryImage.url}
                      alt={primaryImage.alt || product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={16} className="text-[var(--text-faint)]" />
                    </div>
                  )}
                </div>

                {/* Title */}
                <div className="mt-2 md:mt-0">
                  <p className="text-sm text-[var(--text-light)] truncate">{product.title}</p>
                  <p className="text-[10px] text-[var(--text-faint)] truncate">{product.slug}</p>
                </div>

                {/* Category */}
                <span className="text-xs text-[var(--text-muted)] capitalize">{product.category}</span>

                {/* Gender */}
                <span className="text-xs text-[var(--text-muted)] capitalize">{product.gender}</span>

                {/* Price */}
                <span className="text-xs text-[var(--copper-light)]">{formatPrice(product.price)}</span>

                {/* Inventory */}
                <span className={`text-xs ${product.inventory === 0 ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>
                  {product.inventory}
                </span>

                {/* Badges */}
                <div className="flex flex-wrap gap-1 mt-1 md:mt-0">
                  {product.featured && <Badge variant="copper">Featured</Badge>}
                  {product.bestseller && <Badge variant="success">Bestseller</Badge>}
                  {product.newArrival && <Badge variant="warning">New</Badge>}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-2 md:mt-0">
                  <button
                    onClick={() => handleEditProduct(product)}
                    className="p-1.5 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
                    title="Edit product"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(product)}
                    className="p-1.5 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                    title="Delete product"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Form Modal */}
      <ProductFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Product"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />
    </div>
  );
}
