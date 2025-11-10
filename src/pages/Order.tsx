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

interface Reward {
  id: string;
  reward_title: string;
  reward_description: string;
  reward_value: number | null;
  discount_percentage: number | null;
  minimum_order_value: number;
  expiration_date: string | null;
  status: 'available' | 'claimed';
}

const Order = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, loading: authLoading } = useAuth();
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [placing, setPlacing] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [selectedReward, setSelectedReward] = useState<string | null>(null);

  // Require authentication to place orders
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to place an order.",
        variant: "destructive"
      });
      navigate('/auth');
    }
  }, [user, authLoading, navigate, toast]);

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

  const loadRewards = async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('customer_id', profile.id)
        .eq('status', 'available')
        .or('expiration_date.is.null,expiration_date.gt.' + new Date().toISOString())
        .order('reward_value', { ascending: false, nullsFirst: false })
        .order('discount_percentage', { ascending: false, nullsFirst: false });

      if (error) throw error;

      setRewards(data || []);
    } catch (error: any) {
      console.error('Error loading rewards:', error);
    }
  };

  useEffect(() => {
    if (profile) {
      loadRewards();
    }
  }, [profile]);

  const items: CartItem[] = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const m = menuItems.find(i => i.id === id)!;
        return { id: m.id, name: m.name, price: m.price, qty };
      });
  }, [cart, menuItems]);

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + it.price * it.qty, 0),
    [items]
  );

  const selectedRewardData = useMemo(
    () => rewards.find(r => r.id === selectedReward),
    [selectedReward, rewards]
  );

  const { discount, total } = useMemo(() => {
    let discountAmount = 0;
    
    if (selectedRewardData && subtotal >= selectedRewardData.minimum_order_value) {
      if (selectedRewardData.reward_value) {
        discountAmount = Math.min(selectedRewardData.reward_value, subtotal);
      } else if (selectedRewardData.discount_percentage) {
        discountAmount = Math.round(subtotal * selectedRewardData.discount_percentage) / 100;
      }
    }
    
    return {
      discount: discountAmount,
      total: Math.max(0, subtotal - discountAmount)
    };
  }, [subtotal, selectedRewardData]);

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
    // Ensure user is authenticated
    if (!profile?.id) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to place an order.",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }

    // Validate input using Zod schema
    try {
      orderSchema.parse({
        tableNumber: tableNumber,
        notes: notes || '',
        items: items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.qty })),
        total: Number(total.toFixed(2)),
        appliedRewardId: selectedReward || undefined,
        discountAmount: discount > 0 ? Number(discount.toFixed(2)) : undefined,
        originalAmount: discount > 0 ? Number(subtotal.toFixed(2)) : undefined
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
      // Link order to logged-in customer profile
      const customerProfileId = profile.id;

      const { error } = await supabase.from('orders').insert({
        table_number: tableNumber.trim(),
        status: 'pending',
        items: items.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
        total_amount: Number(total.toFixed(2)),
        notes: notes.trim() || null,
        customer_profile_id: customerProfileId,
        applied_reward_id: selectedReward || null,
        discount_amount: discount > 0 ? Number(discount.toFixed(2)) : 0,
        original_amount: discount > 0 ? Number(subtotal.toFixed(2)) : null
      });
      
      if (error) throw error;

      const savedAmount = discount > 0 ? ` You saved RM${discount.toFixed(2)}!` : '';
      toast({
        title: "Order placed!", 
        description: `Your order has been sent to the staff and a visit has been logged to your account.${savedAmount}`
      });
      navigate('/');
    } catch (e: any) {
      console.error(e);
      toast({ title: "Could not place order", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setPlacing(false);
    }
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
      <main className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold">Place Your Order</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Select items and enter your table number.</p>
        </header>

        {/* Available Rewards */}
        {rewards.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Available Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {rewards.map((reward) => {
                  const meetsMinimum = subtotal >= reward.minimum_order_value;
                  const isSelected = selectedReward === reward.id;
                  
                  return (
                    <button
                      key={reward.id}
                      onClick={() => setSelectedReward(isSelected ? null : reward.id)}
                      disabled={!meetsMinimum}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/10 ring-2 ring-primary' 
                          : meetsMinimum
                          ? 'border-border hover:border-primary hover:bg-primary/5'
                          : 'border-muted bg-muted/50 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{reward.reward_title}</h4>
                        {reward.reward_value && (
                          <Badge variant={isSelected ? "default" : "secondary"} className="shrink-0 text-xs">
                            RM{reward.reward_value}
                          </Badge>
                        )}
                        {reward.discount_percentage && (
                          <Badge variant={isSelected ? "default" : "secondary"} className="shrink-0 text-xs">
                            {reward.discount_percentage}% OFF
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{reward.reward_description}</p>
                      {!meetsMinimum && reward.minimum_order_value > 0 && (
                        <p className="text-xs text-destructive mt-1">
                          Min. order: RM{reward.minimum_order_value.toFixed(2)}
                        </p>
                      )}
                      {reward.expiration_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Expires: {new Date(reward.expiration_date).toLocaleDateString()}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Menu */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Menu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Loading menu items...
                </div>
              ) : menuItems.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No menu items available at the moment.
                </div>
              ) : (
                <>
                  {['food', 'drink', 'dessert'].map(category => {
                    const categoryItems = menuItems.filter(item => item.category === category);
                    if (categoryItems.length === 0) return null;
                    
                    return (
                      <div key={category}>
                        <h3 className="font-semibold text-base sm:text-lg mb-3 capitalize">
                          {category}s
                        </h3>
                        <div className="space-y-3">
                          {categoryItems.map((m) => (
                            <div key={m.id} className="flex flex-col sm:flex-row items-start sm:justify-between gap-3 p-3 rounded-lg border">
                              <div className="flex-1 w-full sm:w-auto">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-sm sm:text-base">{m.name}</h4>
                                  <Badge variant="secondary" className="text-xs">RM{m.price.toFixed(2)}</Badge>
                                </div>
                                {m.description && (
                                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">{m.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                                <Button variant="outline" size="sm" onClick={() => updateQty(m.id, -1)} className="min-h-[44px] min-w-[44px]">-</Button>
                                <span className="w-8 text-center font-semibold">{cart[m.id] || 0}</span>
                                <Button size="sm" onClick={() => updateQty(m.id, 1)} className="min-h-[44px] min-w-[44px]">+</Button>
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
          <Card className="md:sticky md:top-4 md:self-start">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Your Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Table Number</label>
                <Input placeholder="e.g. A12 or 7" value={tableNumber} onChange={(e)=>setTableNumber(e.target.value)} className="min-h-[44px]" />
              </div>

              <Separator />

              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items yet.</p>
              ) : (
                <div className="space-y-3">
                  {items.map(it => (
                    <div key={it.id} className="flex items-center justify-between text-sm">
                      <span className="break-words">{it.name} × {it.qty}</span>
                      <span className="font-medium shrink-0 ml-2">RM{(it.price * it.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              {discount > 0 && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>RM{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-success">Discount ({selectedRewardData?.reward_title})</span>
                    <span className="text-success font-medium">-RM{discount.toFixed(2)}</span>
                  </div>
                  {total === 0 && (
                    <Badge variant="default" className="w-full justify-center text-base py-2">
                      🎉 FREE 🎉
                    </Badge>
                  )}
                  <Separator />
                </>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className={`text-lg font-bold ${discount > 0 ? 'text-success' : ''}`}>
                  RM{total.toFixed(2)}
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Input placeholder="Any special requests?" value={notes} onChange={(e)=>setNotes(e.target.value)} className="min-h-[44px]" />
              </div>

              <Button className="w-full min-h-[44px]" onClick={placeOrder} disabled={placing}>
                {placing ? 'Placing...' : 'Place Order'}
              </Button>

              <Button variant="ghost" className="w-full min-h-[44px]" onClick={()=>navigate('/')}>Cancel</Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Order;
