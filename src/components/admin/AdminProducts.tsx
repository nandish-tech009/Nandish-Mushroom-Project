import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Star } from "lucide-react";
import { AdminRatingOverview } from "../AdminRatingOverview";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  image_url: string | null;
  average_rating: number | null;
  review_count: number | null;
};

export const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProductForRating, setSelectedProductForRating] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    unit: "lb",
    image_url: "",
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Failed to load products");
      console.error(error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price) {
      toast.error("Name and price are required");
      return;
    }

    const productData = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      unit: formData.unit,
      image_url: formData.image_url || null,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProduct.id);

      if (error) {
        toast.error("Failed to update product");
        console.error(error);
      } else {
        toast.success("Product updated successfully!");
        resetForm();
        fetchProducts();
      }
    } else {
      const { error } = await supabase.from("products").insert(productData);

      if (error) {
        toast.error("Failed to create product");
        console.error(error);
      } else {
        toast.success("Product created successfully!");
        resetForm();
        fetchProducts();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete product");
      console.error(error);
    } else {
      toast.success("Product deleted successfully!");
      fetchProducts();
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      unit: product.unit,
      image_url: product.image_url || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      unit: "lb",
      image_url: "",
    });
    setIsDialogOpen(false);
  };

  if (loading) {
    return <div className="text-center">Loading products...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Product Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Edit Product" : "Create New Product"}
              </DialogTitle>
              <DialogDescription>
                {editingProduct
                  ? "Update the product details below"
                  : "Fill in the details for the new product"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData({ ...formData, image_url: e.target.value })
                  }
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingProduct ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="mb-4 h-48 w-full rounded-md object-cover"
                />
              )}
              <CardTitle>{product.name}</CardTitle>
              {/* Rating Badge */}
              {product.average_rating !== null && product.average_rating > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-semibold text-yellow-700">
                      {product.average_rating.toFixed(1)}
                    </span>
                  </div>
                  {product.review_count !== null && product.review_count > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({product.review_count} reviews)
                    </span>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                {product.description}
              </p>
              <p className="text-xl font-bold text-primary">
                ₹{Number(product.price).toFixed(2)} / {product.unit}
              </p>
            </CardContent>
            <CardFooter className="flex gap-2 flex-wrap">
              {product.average_rating !== null && product.average_rating > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedProductForRating(product)}
                  className="flex-1"
                >
                  <Star className="h-4 w-4 mr-1" />
                  Ratings
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(product)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(product.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Rating Details Modal */}
      {selectedProductForRating && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-start justify-between sticky top-0 bg-background border-b">
              <CardTitle>Rating Analysis</CardTitle>
              <button
                onClick={() => setSelectedProductForRating(null)}
                className="text-2xl hover:bg-gray-100 p-1 rounded"
              >
                ✕
              </button>
            </CardHeader>
            <CardContent className="pt-6">
              <AdminRatingOverview
                productId={selectedProductForRating.id}
                productName={selectedProductForRating.name}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};