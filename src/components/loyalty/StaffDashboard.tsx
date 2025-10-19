import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, Check, Clock, User, ShoppingCart, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CustomerRegistrationForm } from "./CustomerRegistrationForm";
import { useAuth } from "@/hooks/useAuth";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

interface Customer {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  stats?: {
    total_visits: number;
    current_tier: string;
  };
}

interface Reward {
  id: string;
  reward_title: string;
  reward_description?: string;
  status: 'available' | 'claimed';
  customer_id: string;
  customer?: {
    full_name: string;
  };
}

interface Order {
  id: string;
  table_number: string;
  items: { id: string; name: string; qty: number; price: number }[];
  total_amount: number;
  created_at: string;
  status: string;
  notes?: string;
  delivered_at?: string;
}

export const StaffDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [visitNotes, setVisitNotes] = useState("");
  const [pendingRewards, setPendingRewards] = useState<Reward[]>([]);
  const [isLoggingVisit, setIsLoggingVisit] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const { toast } = useToast();
  const { profile } = useAuth();

  useEffect(() => {
    loadPendingRewards();
  }, []);

  const refreshAll = async () => {
    await Promise.all([
      loadPendingRewards(),
      loadActiveOrders()
    ]);
  };

  const { pullDistance, isRefreshing, pullProgress } = usePullToRefresh({
    onRefresh: refreshAll,
    disabled: false
  });

  const loadPendingRewards = async () => {
    try {
      const { data, error } = await supabase
        .from('rewards')
        .select(`
          *,
          customer:profiles!rewards_customer_id_fkey (
            full_name
          )
        `)
        .eq('status', 'available')
        .order('unlocked_at', { ascending: false });

      if (error) {
        console.error('Error fetching rewards:', error);
      } else {
        setPendingRewards(data || []);
      }
    } catch (error) {
      console.error('Error loading rewards:', error);
    }
  };

  const searchCustomers = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Search required",
        description: "Please enter a name, email, or phone number to search.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          customer_stats (
            total_visits,
            current_tier
          )
        `)
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%`)
        .limit(1)
        .single();

      if (error) {
        toast({
          title: "Customer not found",
          description: "No customer found with the provided search criteria.",
          variant: "destructive"
        });
        setSelectedCustomer(null);
        return;
      }

      const customer: Customer = {
        id: data.id,
        full_name: data.full_name,
        email: data.email,
        phone_number: data.phone_number,
        stats: data.customer_stats?.[0] || { total_visits: 0, current_tier: 'bronze' }
      };

      setSelectedCustomer(customer);
      toast({
        title: "Customer found",
        description: `Found ${customer.full_name}`
      });
    } catch (error) {
      console.error('Error searching customers:', error);
      toast({
        title: "Search error",
        description: "Could not search customers. Please try again.",
        variant: "destructive"
      });
    }
  };

  const logVisit = async () => {
    if (!selectedCustomer) {
      toast({
        title: "No customer selected",
        description: "Please search and select a customer first.",
        variant: "destructive"
      });
      return;
    }

    if (!profile) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to log visits.",
        variant: "destructive"
      });
      return;
    }

    setIsLoggingVisit(true);

    try {
      // Insert visit record
      const { error: visitError } = await supabase
        .from('visits')
        .insert({
          customer_id: selectedCustomer.id,
          logged_by_staff_id: profile.id,
          notes: visitNotes.trim() || null
        });

      if (visitError) {
        throw visitError;
      }

      // Refresh customer stats after visit
      const { data: updatedStats, error: statsError } = await supabase
        .from('customer_stats')
        .select('*')
        .eq('customer_id', selectedCustomer.id)
        .single();

      if (statsError) {
        console.error('Error fetching updated stats:', statsError);
      }

      const newStats = updatedStats || { 
        total_visits: (selectedCustomer.stats?.total_visits || 0) + 1, 
        current_tier: selectedCustomer.stats?.current_tier || 'bronze' 
      };

      setSelectedCustomer({
        ...selectedCustomer,
        stats: newStats
      });

      setVisitNotes("");
      loadPendingRewards(); // Refresh rewards in case new ones were created
      
      toast({
        title: "Visit logged successfully",
        description: `Visit recorded for ${selectedCustomer.full_name}. Total visits: ${newStats.total_visits}`
      });
    } catch (error: any) {
      console.error('Error logging visit:', error);
      toast({
        title: "Error logging visit",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoggingVisit(false);
    }
  };

  const validateReward = async (rewardId: string) => {
    if (!profile) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to validate rewards.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('rewards')
        .update({
          status: 'claimed',
          claimed_at: new Date().toISOString(),
          claimed_by_staff_id: profile.id
        })
        .eq('id', rewardId);

      if (error) {
        throw error;
      }

      // Update local state
      setPendingRewards(prev => 
        prev.map(reward => 
          reward.id === rewardId 
            ? { ...reward, status: 'claimed' as const }
            : reward
        )
      );

      const reward = pendingRewards.find(r => r.id === rewardId);
      toast({
        title: "Reward validated",
        description: `Reward claimed for ${reward?.customer?.full_name}`
      });
    } catch (error: any) {
      console.error('Error validating reward:', error);
      toast({
        title: "Error validating reward",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    }
  };

  const loadActiveOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['pending', 'preparing'])
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error(error);
        toast({ title: 'Failed to load orders', description: error.message, variant: 'destructive' });
      } else {
        // Filter out delivered orders older than 1 hour
        const filteredOrders = (data || []).filter(order => {
          if (order.status !== 'delivered') return true;
          
          const deliveredAt = new Date(order.delivered_at || order.created_at);
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          return deliveredAt > oneHourAgo;
        });
        
        setOrders(filteredOrders as any);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: 'preparing' | 'delivered') => {
    if (!profile) {
      toast({ title: "Authentication required", description: "You must be logged in to update orders.", variant: "destructive" });
      return;
    }

    setUpdatingOrder(orderId);
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'delivered') {
        updates.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Order updated",
        description: `Order marked as ${newStatus}`
      });

      // Refresh orders to reflect changes
      loadActiveOrders();
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast({
        title: "Error updating order",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setUpdatingOrder(null);
    }
  };

  useEffect(() => {
    loadActiveOrders();

    const channel = supabase
      .channel('orders-realtime-staff')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        loadActiveOrders();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        loadActiveOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [toast]);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'bronze';
      case 'silver': return 'silver';
      case 'gold': return 'gold';
      default: return 'bronze';
    }
  };

  return (
    <div className="space-y-6">
      {/* Pull to Refresh Indicator */}
      {pullDistance > 0 && (
        <div 
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-primary/10 transition-all"
          style={{ height: `${pullDistance}px` }}
        >
          <RefreshCw 
            className={`w-6 h-6 text-primary transition-transform ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            style={{ transform: `rotate(${pullProgress * 360}deg)` }}
          />
        </div>
      )}

      {/* Staff Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Staff Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Use this dashboard to log customer visits and validate reward redemptions.
          </p>
        </CardContent>
      </Card>

      {/* Active Orders Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Order Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No active orders.</p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">Table {order.table_number}</Badge>
                        <Badge variant={order.status === 'pending' ? 'destructive' : order.status === 'preparing' ? 'default' : 'secondary'}>
                          {order.status.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-sm space-y-1">
                        {(order.items || []).map((item, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{item.name} × {item.qty}</span>
                            <span>${(item.price * item.qty).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      {order.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          Note: {order.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-lg mb-2">${order.total_amount.toFixed(2)}</div>
                      <div className="flex flex-col gap-2">
                        {order.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, 'preparing')}
                            disabled={updatingOrder === order.id}
                            className="min-h-[44px]"
                          >
                            {updatingOrder === order.id ? 'Starting...' : 'Start Order'}
                          </Button>
                        )}
                        {order.status === 'preparing' && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => updateOrderStatus(order.id, 'delivered')}
                            disabled={updatingOrder === order.id}
                            className="min-h-[44px]"
                          >
                            {updatingOrder === order.id ? 'Completing...' : 'Mark Delivered'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Customer Search & Visit Logging */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Customer Lookup & Visit Logging
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Customer</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter name, email, or phone number"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchCustomers()}
                  className="min-h-[44px]"
                />
                <Button onClick={searchCustomers} className="min-h-[44px] min-w-[44px]">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Selected Customer Info */}
            {selectedCustomer && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div>
                  <h4 className="font-semibold">{selectedCustomer.full_name}</h4>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                  {selectedCustomer.phone_number && (
                    <p className="text-sm text-muted-foreground">{selectedCustomer.phone_number}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Total Visits: </span>
                    <span className="font-semibold">{selectedCustomer.stats?.total_visits || 0}</span>
                  </div>
                  <Badge 
                    className={`bg-${getTierColor(selectedCustomer.stats?.current_tier || 'bronze')} text-${getTierColor(selectedCustomer.stats?.current_tier || 'bronze')}-foreground`}
                  >
                    {selectedCustomer.stats?.current_tier?.toUpperCase() || 'BRONZE'}
                  </Badge>
                </div>
              </div>
            )}

            {/* Visit Logging */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Visit Notes (Optional)</label>
              <Textarea
                placeholder="Add any notes about this visit..."
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              onClick={logVisit}
              disabled={!selectedCustomer || isLoggingVisit}
              className="w-full"
            >
              {isLoggingVisit ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Logging Visit...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Log Visit
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Pending Reward Validations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              Pending Reward Validations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRewards.filter(r => r.status === 'available').length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No pending reward validations at the moment.
                </p>
              ) : (
                pendingRewards
                  .filter(reward => reward.status === 'available')
                  .map((reward) => (
                    <div 
                      key={reward.id}
                      className="p-4 border border-warning bg-warning/5 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{reward.reward_title}</h4>
                          <p className="text-sm text-muted-foreground">
                            Customer: {reward.customer?.full_name}
                          </p>
                          {reward.reward_description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {reward.reward_description}
                            </p>
                          )}
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => validateReward(reward.id)}
                          className="min-h-[44px]"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Validate
                        </Button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add New Customer */}
      <CustomerRegistrationForm onCustomerAdded={loadPendingRewards} />

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              • Visit logged for John Doe (Total: 7 visits)
            </p>
            <p className="text-muted-foreground">
              • Reward validated for Jane Smith
            </p>
            <p className="text-muted-foreground">
              • Visit logged for Bob Johnson (Total: 15 visits)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};