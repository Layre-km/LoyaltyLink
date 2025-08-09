import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Simple demo menu. In a real app this could come from the DB.
const MENU = [
  { id: "espresso", name: "Espresso", price: 2.5, description: "Rich single shot" },
  { id: "latte", name: "Caffe Latte", price: 3.9, description: "Espresso with steamed milk" },
  { id: "cappuccino", name: "Cappuccino", price: 3.9, description: "Foamy and balanced" },
  { id: "americano", name: "Americano", price: 3.2, description: "Espresso diluted with hot water" },
  { id: "croissant", name: "Butter Croissant", price: 2.8, description: "Flaky, baked fresh" },
  { id: "muffin", name: "Blueberry Muffin", price: 2.6, description: "Sweet and soft" },
] as const;

 type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

const Order = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [placing, setPlacing] = useState(false);

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
  }, []);

  const items: CartItem[] = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const m = MENU.find(i => i.id === id)!;
        return { id: m.id, name: m.name, price: m.price, qty };
      });
  }, [cart]);

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
    if (!tableNumber.trim()) {
      toast({ title: "Table number required", description: "Please enter your table number.", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "Cart is empty", description: "Please add at least one item." , variant: "destructive"});
      return;
    }

    setPlacing(true);
    try {
      const { error } = await supabase.from('orders').insert({
        table_number: tableNumber.trim(),
        status: 'pending',
        items: items.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
        total_amount: Number(total.toFixed(2)),
        notes: notes || null,
        customer_profile_id: null
      });
      if (error) throw error;

      toast({ title: "Order placed!", description: "Your order has been sent to the staff." });
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
              {MENU.map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-4 p-3 rounded-lg border">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{m.name}</h3>
                      <Badge variant="secondary">${m.price.toFixed(2)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{m.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" onClick={() => updateQty(m.id, -1)}>-</Button>
                    <span className="w-8 text-center font-semibold">{cart[m.id] || 0}</span>
                    <Button onClick={() => updateQty(m.id, 1)}>+</Button>
                  </div>
                </div>
              ))}
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
