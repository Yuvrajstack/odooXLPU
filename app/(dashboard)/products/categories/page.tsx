"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Search, Layers, Edit2, Trash2, AlertCircle } from "lucide-react";
import { CategoryFormData, categorySchema } from "@/lib/validations/category";

interface CategoryItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    products: number;
  };
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Form modal state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    code: "",
    description: "",
    active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });
      if (search) params.append("search", search);

      const res = await fetch(`/api/categories?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setCategories(data.items);
        setTotalPages(data.totalPages);
        setTotalItems(data.total);
      }
    } catch (err) {
      console.error("Failed to load categories", err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({ name: "", code: "", description: "", active: true });
    setFormErrors({});
    setApiError(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      code: cat.code,
      description: cat.description || "",
      active: cat.active,
    });
    setFormErrors({});
    setApiError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setApiError(null);

    const parsed = categorySchema.safeParse(formData);
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
      const url = editingCategory
        ? `/api/categories/${editingCategory.id}`
        : "/api/categories";
      const method = editingCategory ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to save category");
      }

      setDialogOpen(false);
      fetchCategories();
    } catch (err: any) {
      setApiError(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    try {
      const res = await fetch(`/api/categories/${categoryToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete category");
        return;
      }
      fetchCategories();
    } catch (err: any) {
      alert(err.message || "Failed to delete category");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Categories"
        description="Organize your product catalog by functional classification and hierarchy."
      >
        <Button size="sm" onClick={handleOpenCreate} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Add Category
        </Button>
      </PageHeader>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-surface">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search category name or code..."
            className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Categories Table */}
      <div className="rounded-lg border bg-surface shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No categories found"
            description={
              search
                ? "No categories matched your search criteria."
                : "Create your first category to start organizing products."
            }
            actionLabel={search ? undefined : "Create Category"}
            onAction={search ? undefined : handleOpenCreate}
          />
        ) : (
          <>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b text-slate-500 font-medium">
                <tr>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-center">Products</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                      {cat.code}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {cat.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                      {cat.description || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-slate-100 text-slate-700">
                        {cat._count.products} SKUs
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {cat.active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-slate-900"
                          onClick={() => handleOpenEdit(cat)}
                          title="Edit Category"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-rose-600"
                          onClick={() => {
                            setCategoryToDelete(cat);
                            setDeleteConfirmOpen(true);
                          }}
                          title="Delete Category"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Create Product Category"}
            </DialogTitle>
          </DialogHeader>

          {apiError && (
            <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Category Code <span className="text-rose-500">*</span>
              </label>
              <Input
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                placeholder="e.g. RAW, ELEC, HW"
                className="font-mono uppercase text-xs"
                disabled={submitting}
              />
              {formErrors.code && (
                <p className="text-[11px] text-rose-600">{formErrors.code}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Category Name <span className="text-rose-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. Raw Materials, Fasteners"
                className="text-xs"
                disabled={submitting}
              />
              {formErrors.name && (
                <p className="text-[11px] text-rose-600">{formErrors.name}</p>
              )}
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
                placeholder="Optional purpose and description of category items..."
                rows={3}
                className="w-full text-xs p-2.5 border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                disabled={submitting}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cat-active"
                checked={formData.active}
                onChange={(e) =>
                  setFormData({ ...formData, active: e.target.checked })
                }
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="cat-active" className="text-xs text-slate-700 font-medium">
                Active in catalog
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
                {submitting ? "Saving..." : editingCategory ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Category"
        description={`Are you sure you want to delete category "${categoryToDelete?.name}" (${categoryToDelete?.code})? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
