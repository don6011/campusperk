import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  GripVertical,
  Image as ImageIcon,
  Megaphone,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  sponsored: boolean;
  display_order: number;
  created_at: string;
}

interface FormData {
  name: string;
  slug: string;
  description: string;
  sponsored: boolean;
  display_order: number;
}

const defaultForm: FormData = {
  name: "",
  slug: "",
  description: "",
  sponsored: false,
  display_order: 0,
};

export default function CategoryManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
  });

  // Count deals per category
  const { data: dealCounts = {} } = useQuery({
    queryKey: ["admin-category-deal-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("category")
        .eq("status", "active");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((d) => {
        if (d.category) {
          counts[d.category] = (counts[d.category] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const uploadIcon = async (categoryId: string, file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${categoryId}.${ext}`;

    const { error } = await supabase.storage
      .from("category-icons")
      .upload(path, file, { upsert: true });

    if (error) {
      toast({ title: "Icon upload failed", description: error.message, variant: "destructive" });
      return null;
    }

    const { data: urlData } = supabase.storage.from("category-icons").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let iconUrl: string | null = null;

      if (editingId) {
        // Update
        if (iconFile) {
          iconUrl = await uploadIcon(editingId, iconFile);
        }
        const updateData: Record<string, unknown> = {
          name: form.name,
          slug: form.slug,
          description: form.description || null,
          sponsored: form.sponsored,
          display_order: form.display_order,
        };
        if (iconUrl) updateData.icon_url = iconUrl;

        const { error } = await supabase
          .from("categories")
          .update(updateData)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        // Insert
        const { data: inserted, error } = await supabase
          .from("categories")
          .insert({
            name: form.name,
            slug: form.slug,
            description: form.description || null,
            sponsored: form.sponsored,
            display_order: form.display_order,
          })
          .select()
          .single();
        if (error) throw error;

        if (iconFile && inserted) {
          iconUrl = await uploadIcon(inserted.id, iconFile);
          if (iconUrl) {
            await supabase
              .from("categories")
              .update({ icon_url: iconUrl })
              .eq("id", inserted.id);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast({ title: editingId ? "Category updated" : "Category created" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast({ title: "Category deleted" });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...defaultForm, display_order: categories.length + 1 });
    setIconFile(null);
    setIconPreview(null);
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      sponsored: cat.sponsored,
      display_order: cat.display_order,
    });
    setIconFile(null);
    setIconPreview(cat.icon_url);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(defaultForm);
    setIconFile(null);
    setIconPreview(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconFile(file);
      setIconPreview(URL.createObjectURL(file));
    }
  };

  const autoSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">Category Manager</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Create, edit and organize marketplace categories
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Add Category
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-12">#</TableHead>
                <TableHead className="w-14">Icon</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Deals</TableHead>
                <TableHead className="text-center">Sponsored</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No categories yet. Click "Add Category" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => (
                  <TableRow key={cat.id} className="group">
                    <TableCell className="text-muted-foreground">
                      <GripVertical className="h-4 w-4 inline-block mr-1 opacity-40" />
                      {cat.display_order}
                    </TableCell>
                    <TableCell>
                      {cat.icon_url ? (
                        <img
                          src={cat.icon_url}
                          alt={cat.name}
                          className="h-8 w-8 rounded-lg object-cover border border-border"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{cat.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{cat.slug}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {cat.description || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-xs">
                        {dealCounts[cat.name] || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {cat.sponsored ? (
                        <Badge className="bg-gold/20 text-gold border-gold/30 text-xs gap-1">
                          <Megaphone className="h-3 w-3" /> Yes
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(cat.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    slug: editingId ? f.slug : autoSlug(name),
                  }));
                }}
                placeholder="e.g. Software"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="e.g. software"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description for the category"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input
                type="number"
                value={form.display_order}
                onChange={(e) =>
                  setForm((f) => ({ ...f, display_order: parseInt(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex items-center gap-3">
                {iconPreview ? (
                  <img src={iconPreview} alt="Icon preview" className="h-12 w-12 rounded-lg object-cover border border-border" />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Upload className="h-4 w-4" />
                    {iconPreview ? "Change icon" : "Upload icon"}
                  </div>
                </label>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.sponsored}
                onCheckedChange={(v) => setForm((f) => ({ ...f, sponsored: v }))}
              />
              <Label>Sponsored category</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.name || !form.slug || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving…" : editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure? Deals in this category won't be deleted but will become uncategorized.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
