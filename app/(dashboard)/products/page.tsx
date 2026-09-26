"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pagination } from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Package,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  Layers,
  ArrowUpDown,
} from "lucide-react";
import { ProductFormData, productSchema } from "@/lib/validations/product";
import { StockStatus } from "@/types";
import { formatNumber, formatCurrency } from "@/lib/utils";

interface CategorySummary {
  id: string;
  name: string;
  code: string;
}

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  categoryId: string;
  category: CategorySummary;
  uom: string;
  reorderPoint: number;
  minStockLevel: number;
  maxStockLevel: number | null;
  costPrice: number;
  sellingPrice: number;
  active: boolean;
  totalStock: number;
  stockStatus: StockStatus;
  updatedAt: string;
  createdAt: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Create / Edit modal
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    sku: "",
    description: "",
    categoryId: "",
    uom: "units",
    reorderPoint: 10,
    minStockLevel: 5,
    maxStockLevel: null,
    costPrice: 0,
    sellingPrice: 0,
    active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Delete modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);

  // Fetch categories for select dropdown
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/categories?limit=100");
        const data = await res.json();
        if (res.ok && data.items) {
          setCategories(data.items);
        }
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    }
    loadCategories();
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });
      if (search) params.append("search", search);
      if (selectedCategory) params.append("categoryId", selectedCategory);
      if (selectedStatus) params.append("status", selectedStatus);

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setProducts(data.items);
        setTotalPages(data.totalPages);
        setTotalItems(data.total);
      }
    } catch (err) {
      console.error("Failed to fetch products", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedCategory, selectedStatus]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      sku: "",
      description: "",
      categoryId: categories[0]?.id || "",
      uom: "units",
      reorderPoint: 10,
      minStockLevel: 5,
      maxStockLevel: null,
      costPrice: 0,
      sellingPrice: 0,
      active: true,
    });
    setFormErrors({});
    setApiError(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (prod: ProductItem) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      sku: prod.sku,
      description: prod.description || "",
      categoryId: prod.categoryId,
      uom: prod.uom,
      reorderPoint: prod.reorderPoint,
      minStockLevel: prod.minStockLevel,
      maxStockLevel: prod.maxStockLevel,
      costPrice: prod.costPrice,
      sellingPrice: prod.sellingPrice,
      active: prod.active,
    });
    setFormErrors({});
    setApiError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setApiError(null);

    const parsed = productSchema.safeParse(formData);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to save product");
      }

      setDialogOpen(false);
      fetchProducts();
    } catch (err: any) {
      setApiError(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    try {
      const res = await fetch(`/api/products/${productToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete product");
        return;
      }
      fetchProducts();
    } catch (err: any) {
      alert(err.message || "Failed to delete product");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products Catalog"
        description="Master inventory catalog, SKUs, units of measure, and stock thresholds."
      >
        <Link href="/products/categories">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Layers className="h-3.5 w-3.5" />
            Manage Categories
          </Button>
        </Link>
        <Button size="sm" onClick={handleOpenCreate} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Add Product
        </Button>
      </PageHeader>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg border bg-surface">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by product name or SKU..."
            className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="h-8 px-2 text-xs border rounded-md bg-slate-50 text-slate-700"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="h-8 px-2 text-xs border rounded-md bg-slate-50 text-slate-700"
          >
            <option value="">All Stock Statuses</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Products Table (Desktop) / Cards (Mobile) */}
      <div className="rounded-lg border bg-surface shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products found"
            description={
              search || selectedCategory || selectedStatus
                ? "No products matched your active filters."
                : "Your catalog is empty. Add your first product to begin tracking inventory."
            }
            actionLabel={
              search || selectedCategory || selectedStatus
                ? undefined
                : "Add Product"
            }
            onAction={
              search || selectedCategory || selectedStatus
                ? undefined
                : handleOpenCreate
            }
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b text-slate-500 font-medium">
                  <tr>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">UOM</th>
                    <th className="py-2.5 px-3 text-right">Total Stock</th>
                    <th className="py-2.5 px-3 text-right">Reorder Point</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                        <Link href={`/products/${p.id}`} className="hover:underline">
                          {p.sku}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        <Link href={`/products/${p.id}`} className="hover:text-blue-600">
                          {p.name}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {p.category?.name || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono">
                        {p.uom}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatNumber(p.totalStock)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        {formatNumber(p.reorderPoint)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StatusBadge status={p.stockStatus} />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/products/${p.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-500 hover:text-slate-900"
                              title="View Product Detail"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Product"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-500 hover:text-rose-600"
                            onClick={() => {
                              setProductToDelete(p);
                              setDeleteConfirmOpen(true);
                            }}
                            title="Delete Product"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {products.map((p) => (
                <div key={p.id} className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link href={`/products/${p.id}`}>
                        <h4 className="text-xs font-bold text-slate-900 hover:text-blue-600">
                          {p.name}
                        </h4>
                      </Link>
                      <p className="text-[11px] font-mono text-blue-600 mt-0.5">
                        {p.sku}
                      </p>
                    </div>
                    <StatusBadge status={p.stockStatus} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t text-slate-600">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">
                        Category
                      </span>
                      <span>{p.category?.name || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">
                        Total Stock
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatNumber(p.totalStock)} {p.uom}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t">
                    <Link href={`/products/${p.id}`}>
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        View
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleOpenEdit(p)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                pageSize={15}
                totalItems={totalItems}
                onPageChange={(p) => setPage(p)}
                className="border-t"
              />
            )}
          </>
        )}
      </div>

      {/* Create / Edit Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Create New Product"}
            </DialogTitle>
          </DialogHeader>

          {apiError && (
            <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Industrial Steel Rod"
                  className="text-xs"
                  disabled={submitting}
                />
                {formErrors.name && (
                  <p className="text-[11px] text-rose-600">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  SKU / Code <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g. SKU-STL-0012"
                  className="font-mono uppercase text-xs"
                  disabled={submitting}
                />
                {formErrors.sku && (
                  <p className="text-[11px] text-rose-600">{formErrors.sku}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryId: e.target.value })
                  }
                  className="w-full h-9 px-2.5 text-xs border rounded-md bg-transparent"
                  disabled={submitting}
                >
                  <option value="">Select category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                {formErrors.categoryId && (
                  <p className="text-[11px] text-rose-600">
                    {formErrors.categoryId}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Unit of Measure (UOM) <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={formData.uom}
                  onChange={(e) =>
                    setFormData({ ...formData, uom: e.target.value })
                  }
                  placeholder="e.g. units, meters, kg, boxes"
                  className="text-xs"
                  disabled={submitting}
                />
                {formErrors.uom && (
                  <p className="text-[11px] text-rose-600">{formErrors.uom}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Reorder Point <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  value={formData.reorderPoint}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reorderPoint: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="font-mono text-xs"
                  disabled={submitting}
                />
                {formErrors.reorderPoint && (
                  <p className="text-[11px] text-rose-600">
                    {formErrors.reorderPoint}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Min Stock Level
                </label>
                <Input
                  type="number"
                  value={formData.minStockLevel}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minStockLevel: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="font-mono text-xs"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Max Stock Level
                </label>
                <Input
                  type="number"
                  value={formData.maxStockLevel || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxStockLevel: e.target.value
                        ? parseFloat(e.target.value)
                        : null,
                    })
                  }
                  placeholder="Optional"
                  className="font-mono text-xs"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Cost Price ($)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      costPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="font-mono text-xs"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Selling Price ($)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.sellingPrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sellingPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="font-mono text-xs"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Description
              </label>
              <textarea
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Product specifications and storage details..."
                rows={2}
                className="w-full text-xs p-2 border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                disabled={submitting}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="prod-active"
                checked={formData.active}
                onChange={(e) =>
                  setFormData({ ...formData, active: e.target.checked })
                }
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="prod-active" className="text-xs text-slate-700 font-medium">
                Active SKU
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? "Saving..." : editingProduct ? "Update SKU" : "Create Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Product"
        description={`Are you sure you want to delete product "${productToDelete?.name}" (${productToDelete?.sku})? Products with historical ledger transactions cannot be deleted and should instead be set to inactive.`}
        confirmLabel="Delete Product"
        onConfirm={handleDelete}
      />
    </div>
  );
}
