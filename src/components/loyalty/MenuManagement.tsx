import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import { menuItemSchema } from "@/lib/validations";
import { z } from "zod";

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  is_available: boolean;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'food',
    is_available: true,
    image_url: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error: any) {
      console.error('Error loading menu items:', error);
      toast({
        title: "Error loading menu",
        description: error.message || "Could not load menu items.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'food',
      is_available: true,
      image_url: ''
    });
    setEditingItem(null);
  };

  const openEditDialog = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category: item.category,
      is_available: item.is_available,
      image_url: item.image_url || ''
    });
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const saveMenuItem = async () => {
    if (!formData.name.trim() || !formData.price.trim()) {
      toast({
        title: "Validation error",
        description: "Name and price are required fields.",
        variant: "destructive"
      });
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid price greater than 0.",
        variant: "destructive"
      });
      return;
    }

    // Validate with Zod schema
    try {
      menuItemSchema.parse({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price: price,
        category: formData.category,
        imageUrl: formData.image_url.trim() || undefined
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive"
        });
        return;
      }
    }

    try {
      const itemData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: price,
        category: formData.category,
        is_available: formData.is_available,
        image_url: formData.image_url.trim() || null
      };

      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('menu_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;

        toast({
          title: "Menu item updated",
          description: `${formData.name} has been updated successfully.`
        });
      } else {
        // Create new item
        const { error } = await supabase
          .from('menu_items')
          .insert(itemData);

        if (error) throw error;

        toast({
          title: "Menu item added",
          description: `${formData.name} has been added to the menu.`
        });
      }

      setIsDialogOpen(false);
      resetForm();
      loadMenuItems();
    } catch (error: any) {
      console.error('Error saving menu item:', error);
      toast({
        title: "Error saving item",
        description: error.message || "Could not save menu item.",
        variant: "destructive"
      });
    }
  };

  const toggleAvailability = async (itemId: string, isAvailable: boolean) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: isAvailable })
        .eq('id', itemId);

      if (error) throw error;

      setMenuItems(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, is_available: isAvailable } : item
        )
      );

      toast({
        title: "Availability updated",
        description: `Item ${isAvailable ? 'enabled' : 'disabled'} successfully.`
      });
    } catch (error: any) {
      console.error('Error updating availability:', error);
      toast({
        title: "Error updating item",
        description: error.message || "Could not update item availability.",
        variant: "destructive"
      });
    }
  };

  const deleteMenuItem = async (itemId: string, itemName: string) => {
    if (!confirm(`Are you sure you want to delete "${itemName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setMenuItems(prev => prev.filter(item => item.id !== itemId));
      toast({
        title: "Item deleted",
        description: `${itemName} has been removed from the menu.`
      });
    } catch (error: any) {
      console.error('Error deleting menu item:', error);
      toast({
        title: "Error deleting item",
        description: error.message || "Could not delete menu item.",
        variant: "destructive"
      });
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'food': return 'default';
      case 'drink': return 'secondary';
      case 'dessert': return 'outline';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading menu items...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Menu Management</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Menu Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Item name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Price *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="food">Food</SelectItem>
                        <SelectItem value="drink">Drink</SelectItem>
                        <SelectItem value="dessert">Dessert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="image_url">Image URL</Label>
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="availability"
                    checked={formData.is_available}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_available: checked }))}
                  />
                  <Label htmlFor="availability">Available for ordering</Label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={saveMenuItem}>
                    <Save className="w-4 h-4 mr-2" />
                    {editingItem ? 'Update' : 'Add'} Item
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {menuItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{item.name}</div>
                    {item.description && (
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getCategoryBadgeColor(item.category)}>
                    {item.category}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">RM{item.price.toFixed(2)}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={item.is_available}
                      onCheckedChange={(checked) => toggleAvailability(item.id, checked)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {item.is_available ? 'Available' : 'Disabled'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(item)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMenuItem(item.id, item.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {menuItems.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No menu items found. Add your first item to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
};