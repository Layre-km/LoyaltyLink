import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { orderSchema } from "@/lib/validations";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  category: string;
  is_available: boolean;
}

type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

const Order = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [placing, setPlacing] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Place Order | Loyalty Program";
    // Ensure canonical for SEO
    const existing = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const href = window.location.href;
    if (existing) existing.href = href; else {
      const link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', href);
      document.head.appendChild(link);
    }
    
    // Load menu items from database
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      setMenuItems(data || []);
    } catch (error: any) {
      console.error('Error loading menu items:', error);
      toast({
        title: "Error loading menu",
        description: "Could not load menu items. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const items: CartItem[] = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const m = menuItems.find(i => i.id === id)!;
        return { id: m.id, name: m.name, price: m.price, qty };
      });
  }, [cart, menuItems]);

  const total = useMemo(
    () => items.reduce((sum, it) => sum + it.price * it.qty, 0),
    [items]
  );

  const updateQty = (id: string, delta: number) => {
    setCart(prev => {
      const next = { ...prev };
      const current = next[id] || 0;
      const q = Math.max(0, current + delta);
      if (q === 0) delete next[id]; else next[id] = q;
      return next;
    });
  };

  const placeOrder = async () => {
    // Validate input using Zod schema
    try {
      orderSchema.parse({
        tableNumber: tableNumber,
        notes: notes || '',
        items: items,
        total: Number(total.toFixed(2)),
      });
    } catch (validationError: any) {
      const errorMessage = validationError.errors?.[0]?.message || "Invalid order data";
      toast({
        title: "Validation Error",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    setPlacing(true);
    try {
      // Link order to logged-in customer profile if available
      const customerProfileId = profile?.id || null;

      const { error } = await supabase.from('orders').insert({
        table_number: tableNumber.trim(),
        status: 'pending',
        items: items.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
        total_amount: Number(total.toFixed(2)),
        notes: notes.trim() || null,
        customer_profile_id: customerProfileId
      });
      
      if (error) throw error;

      toast({ 
        title: "Order placed!", 
        description: customerProfileId 
          ? "Your order has been sent to the staff and a visit has been logged to your account."
          : "Your order has been sent to the staff."
      });
      navigate('/');
    } catch (e: any) {
      console.error(e);
      toast({ title: "Could not place order", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <main className="max-w-5xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Place Your Order</h1>
          <p className="text-muted-foreground mt-1">Select items and enter your table number.</p>
        </header>

        <section className="grid md:grid-cols-3 gap-6">
          {/* Menu */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Menu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading menu items...
                </div>
              ) : menuItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No menu items available at the moment.
                </div>
              ) : (
                <>
                  {['food', 'drink', 'dessert'].map(category => {
                    const categoryItems = menuItems.filter(item => item.category === category);
                    if (categoryItems.length === 0) return null;
                    
                    return (
                      <div key={category}>
                        <h3 className="font-semibold text-lg mb-3 capitalize">
                          {category}s
                        </h3>
                        <div className="space-y-3">
                          {categoryItems.map((m) => (
                            <div key={m.id} className="flex items-start justify-between gap-4 p-3 rounded-lg border">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">{m.name}</h4>
                                  <Badge variant="secondary">${m.price.toFixed(2)}</Badge>
                                </div>
                                {m.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button variant="outline" size="sm" onClick={() => updateQty(m.id, -1)}>-</Button>
                                <span className="w-8 text-center font-semibold">{cart[m.id] || 0}</span>
                                <Button size="sm" onClick={() => updateQty(m.id, 1)}>+</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        {category !== 'dessert' && <Separator className="my-4" />}
                      </div>
                    );
                  })}
                </>
              )}
            </CardContent>
          </Card>

          {/* Cart */}
          <Card>
            <CardHeader>
              <CardTitle>Your Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Table Number</label>
                <Input placeholder="e.g. A12 or 7" value={tableNumber} onChange={(e)=>setTableNumber(e.target.value)} />
              </div>

              <Separator />

              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items yet.</p>
              ) : (
                <div className="space-y-3">
                  {items.map(it => (
                    <div key={it.id} className="flex items-center justify-between text-sm">
                      <span>{it.name} × {it.qty}</span>
                      <span className="font-medium">${(it.price * it.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-bold">${total.toFixed(2)}</span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Input placeholder="Any special requests?" value={notes} onChange={(e)=>setNotes(e.target.value)} />
              </div>

              <Button className="w-full" onClick={placeOrder} disabled={placing}>
                {placing ? 'Placing...' : 'Place Order'}
              </Button>

              <Button variant="ghost" className="w-full" onClick={()=>navigate('/')}>Cancel</Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Order;
