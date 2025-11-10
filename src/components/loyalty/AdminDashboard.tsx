import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Users, BarChart3, Gift, Calendar, TrendingUp, Loader2, Clock, Search, DollarSign, RefreshCw } from "lucide-react";
import { CustomerRegistrationForm } from "./CustomerRegistrationForm";
import { MenuManagement } from "./MenuManagement";
import { SystemConfiguration } from "./SystemConfiguration";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/useAnalytics";

interface CustomerData {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  date_of_birth: string | null;
  total_visits: number;
  current_tier: string;
  joined_date: string;
  last_visit: string;
  referral_code: string;
  referred_by_code: string | null;
  total_spent: number;
  available_rewards: number;
  claimed_rewards: number;
}

interface SystemStats {
  total_customers: number;
  total_visits: number;
  rewards_claimed: number;
  bronze_tier: number;
  silver_tier: number;
  gold_tier: number;
}

interface OrderHistory {
  id: string;
  table_number: string;
  items: { id: string; name: string; qty: number; price: number }[];
  total_amount: number;
  created_at: string;
  delivered_at: string;
  notes?: string;
  customer_profile_id?: string;
  profiles?: { full_name: string };
}

export const AdminDashboard = () => {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const [orderSearchTerm, setOrderSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revenueTimeframe, setRevenueTimeframe] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const { toast } = useToast();

  // Calculate date range based on timeframe
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined = now;

    switch (revenueTimeframe) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (customStartDate) startDate = new Date(customStartDate);
        if (customEndDate) endDate = new Date(customEndDate);
        break;
      case 'all':
      default:
        startDate = undefined;
        endDate = undefined;
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();
  const analytics = useAnalytics(startDate, endDate);

  useEffect(() => {
    loadSystemData();
    loadOrderHistory();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadSystemData(),
      loadOrderHistory(),
      analytics.refresh()
    ]);
    setRefreshing(false);
    toast({ title: "Data refreshed" });
  };

  const loadSystemData = async () => {
    setLoading(true);
    try {
      // Load system statistics
      const [profilesData, statsData, rewardsData, visitsData] = await Promise.all([
        supabase.from('profiles').select('id, role').eq('role', 'customer'),
        supabase.from('customer_stats').select('current_tier'),
        supabase.from('rewards').select('id').eq('status', 'claimed'),
        supabase.from('visits').select('id')
      ]);

      if (profilesData.error) throw profilesData.error;
      if (statsData.error) throw statsData.error;
      if (rewardsData.error) throw rewardsData.error;
      if (visitsData.error) throw visitsData.error;

      const tierCounts = statsData.data?.reduce(
        (acc, stat) => {
          acc[stat.current_tier]++;
          return acc;
        },
        { bronze: 0, silver: 0, gold: 0 } as Record<string, number>
      ) || { bronze: 0, silver: 0, gold: 0 };

      setSystemStats({
        total_customers: profilesData.data?.length || 0,
        total_visits: visitsData.data?.length || 0,
        rewards_claimed: rewardsData.data?.length || 0,
        bronze_tier: tierCounts.bronze,
        silver_tier: tierCounts.silver,
        gold_tier: tierCounts.gold
      });

      // Load customer list with comprehensive stats
      const { data: customersData, error: customersError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone_number,
          date_of_birth,
          referral_code,
          referred_by_code,
          created_at,
          customer_stats (
            total_visits,
            current_tier
          ),
          visits!customer_id (
            visit_date
          )
        `)
        .eq('role', 'customer')
        .order('created_at', { ascending: false })
        .limit(50);

      if (customersError) throw customersError;

      // Calculate total spent and rewards for each customer
      const formattedCustomers: CustomerData[] = await Promise.all(
        (customersData || []).map(async (customer) => {
          // Get total spent from orders
          const { data: orders } = await supabase
            .from('orders')
            .select('total_amount')
            .eq('customer_profile_id', customer.id)
            .eq('status', 'delivered');

          const totalSpent = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

          // Get reward counts
          const { data: availableRewards } = await supabase
            .from('rewards')
            .select('id')
            .eq('customer_id', customer.id)
            .eq('status', 'available');

          const { data: claimedRewards } = await supabase
            .from('rewards')
            .select('id')
            .eq('customer_id', customer.id)
            .eq('status', 'claimed');

          return {
            id: customer.id,
            full_name: customer.full_name,
            email: customer.email,
            phone_number: customer.phone_number,
            date_of_birth: customer.date_of_birth,
            total_visits: customer.customer_stats?.[0]?.total_visits || 0,
            current_tier: customer.customer_stats?.[0]?.current_tier || 'bronze',
            joined_date: new Date(customer.created_at).toISOString().split('T')[0],
            last_visit: customer.visits?.[0]?.visit_date 
              ? new Date(customer.visits[0].visit_date).toISOString().split('T')[0]
              : 'Never',
            referral_code: customer.referral_code,
            referred_by_code: customer.referred_by_code,
            total_spent: totalSpent,
            available_rewards: availableRewards?.length || 0,
            claimed_rewards: claimedRewards?.length || 0,
          };
        })
      );

      setCustomers(formattedCustomers);
    } catch (error: any) {
      console.error('Error loading system data:', error);
      toast({
        title: "Error loading data",
        description: error.message || "Could not load system data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'bronze';
      case 'silver': return 'silver';
      case 'gold': return 'gold';
      default: return 'bronze';
    }
  };

  const loadOrderHistory = async () => {
    try {
      // Get delivered orders older than 1 hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const { data, error } = await supabase
        .from('orders')
        .select('*, profiles!customer_profile_id(full_name)')
        .eq('status', 'delivered')
        .lt('delivered_at', oneHourAgo.toISOString())
        .order('delivered_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setOrderHistory((data || []).map(order => ({
        ...order,
        items: order.items as any // Cast JSONB to expected type
      })) as any);
    } catch (error: any) {
      console.error('Error loading order history:', error);
      toast({
        title: "Error loading order history",
        description: error.message || "Could not load order history.",
        variant: "destructive"
      });
    }
  };

  const filteredOrderHistory = orderHistory.filter(order => {
    if (!orderSearchTerm.trim()) return true;
    
    const searchLower = orderSearchTerm.toLowerCase();
    return (
      order.table_number.toLowerCase().includes(searchLower) ||
      order.items.some(item => item.name.toLowerCase().includes(searchLower)) ||
      order.total_amount.toString().includes(searchLower)
    );
  });

  const StatCard = ({ title, value, icon: Icon, description }: {
    title: string;
    value: string | number;
    icon: any;
    description: string;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <Icon className="w-8 h-8 text-primary" />
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading system data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Admin Dashboard
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="min-h-[44px] min-w-[44px]"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Complete system overview and customer management tools.
          </p>
        </CardContent>
      </Card>

      {/* Revenue Timeframe Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Revenue Timeframe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={revenueTimeframe === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRevenueTimeframe('today')}
                className="min-h-[44px]"
              >
                Today
              </Button>
              <Button
                variant={revenueTimeframe === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRevenueTimeframe('week')}
                className="min-h-[44px]"
              >
                Last 7 Days
              </Button>
              <Button
                variant={revenueTimeframe === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRevenueTimeframe('month')}
                className="min-h-[44px]"
              >
                Last 30 Days
              </Button>
              <Button
                variant={revenueTimeframe === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRevenueTimeframe('all')}
                className="min-h-[44px]"
              >
                All Time
              </Button>
              <Button
                variant={revenueTimeframe === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRevenueTimeframe('custom')}
                className="min-h-[44px]"
              >
                Custom
              </Button>
            </div>

            {revenueTimeframe === 'custom' && (
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Start Date</label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="min-h-[44px]"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">End Date</label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="min-h-[44px]"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Customers"
          value={systemStats?.total_customers || 0}
          icon={Users}
          description="Active loyalty members"
        />
        <StatCard
          title={`Revenue (${
            revenueTimeframe === 'today' ? 'Today' :
            revenueTimeframe === 'week' ? 'Last 7 Days' :
            revenueTimeframe === 'month' ? 'Last 30 Days' :
            revenueTimeframe === 'custom' ? 'Custom Range' :
            'All Time'
          })`}
          value={`RM${analytics.totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          description={analytics.loading ? "Loading..." : "From delivered orders"}
        />
        <StatCard
          title="Avg Visits/Customer"
          value={analytics.avgVisitsPerCustomer.toFixed(1)}
          icon={TrendingUp}
          description="Customer engagement"
        />
        <StatCard
          title="Reward Redemption"
          value={`${analytics.rewardRedemptionRate}%`}
          icon={Gift}
          description="Claimed rewards"
        />
      </div>

      {/* Tier Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Tier Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="text-center p-3 sm:p-4 bg-bronze/10 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-bronze">
                {systemStats?.bronze_tier || 0}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Bronze</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-silver/10 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-silver">
                {systemStats?.silver_tier || 0}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Silver</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-gold/10 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-gold">
                {systemStats?.gold_tier || 0}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Gold</div>
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Management Tabs */}
        <Tabs defaultValue="customers" className="space-y-4">
          <div className="overflow-x-auto -mx-4 px-4">
            <TabsList className="grid w-full grid-cols-5 min-w-[600px]">
              <TabsTrigger value="customers" className="min-h-[44px] text-xs sm:text-sm">Customers</TabsTrigger>
              <TabsTrigger value="orders" className="min-h-[44px] text-xs sm:text-sm">Orders</TabsTrigger>
              <TabsTrigger value="menu" className="min-h-[44px] text-xs sm:text-sm">Menu</TabsTrigger>
              <TabsTrigger value="settings" className="min-h-[44px] text-xs sm:text-sm">Settings</TabsTrigger>
              <TabsTrigger value="analytics" className="min-h-[44px] text-xs sm:text-sm">Analytics</TabsTrigger>
            </TabsList>
          </div>

        <TabsContent value="customers">
          <div className="space-y-6">
            {/* Add Customer Form */}
            <CustomerRegistrationForm onCustomerAdded={loadSystemData} />
            
            {/* Customer List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Customer Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-[1200px] px-4 sm:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Customer</TableHead>
                        <TableHead className="min-w-[200px]">Email</TableHead>
                        <TableHead className="min-w-[120px]">Phone</TableHead>
                        <TableHead>DOB</TableHead>
                        <TableHead>Visits</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Total Spent</TableHead>
                        <TableHead>Rewards</TableHead>
                        <TableHead>Referral Code</TableHead>
                        <TableHead className="min-w-[120px]">Joined</TableHead>
                        <TableHead className="min-w-[120px]">Last Visit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">
                            {customer.full_name}
                          </TableCell>
                          <TableCell className="text-sm">{customer.email}</TableCell>
                          <TableCell className="text-sm">
                            {customer.phone_number || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {customer.date_of_birth 
                              ? new Date(customer.date_of_birth).toLocaleDateString() 
                              : '-'
                            }
                          </TableCell>
                          <TableCell>{customer.total_visits}</TableCell>
                          <TableCell>
                            <Badge 
                              className={`bg-${getTierColor(customer.current_tier)} text-${getTierColor(customer.current_tier)}-foreground`}
                            >
                              {customer.current_tier.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold">
                            RM{customer.total_spent.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <span className="text-green-600">{customer.available_rewards}</span>
                              {' / '}
                              <span className="text-muted-foreground">{customer.claimed_rewards}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {customer.referral_code}
                            </code>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(customer.joined_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-sm">
                            {customer.last_visit === 'Never' 
                              ? 'Never' 
                              : new Date(customer.last_visit).toLocaleDateString()
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                  Order History
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={orderSearchTerm}
                    onChange={(e) => setOrderSearchTerm(e.target.value)}
                    className="w-full sm:w-64 min-h-[44px]"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredOrderHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {orderSearchTerm ? 'No orders match your search.' : 'No completed orders to display.'}
                </div>
              ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="min-w-[600px] px-4 sm:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Table</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead className="min-w-[200px]">Items</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead className="min-w-[150px]">Delivered</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrderHistory.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>
                              <Badge variant="outline">{order.table_number}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {order.profiles?.full_name || 'Guest'}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm space-y-1">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between">
                                    <span>{item.name} × {item.qty}</span>
                                    <span>RM{(item.price * item.qty).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">
                              RM{order.total_amount.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(order.delivered_at).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {order.notes || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                  </div>
              )}
            </CardContent>
          </Card>

        <TabsContent value="menu">
          <MenuManagement />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <SystemConfiguration />
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Real-Time Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {analytics.loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Loading analytics...</span>
                </div>
              ) : analytics.error ? (
                <div className="text-center py-8 text-destructive">
                  {analytics.error}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Customer Metrics</h4>
                      <div className="space-y-2 text-sm">
                        <p>• Average visits per customer: <strong>{analytics.avgVisitsPerCustomer}</strong></p>
                        <p>• Customer acquisition (30 days): <strong>{analytics.customerAcquisitionRate}</strong> new visits</p>
                        <p>• Reward redemption rate: <strong>{analytics.rewardRedemptionRate}%</strong></p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3">Revenue & Orders</h4>
                      <div className="space-y-2 text-sm">
                        <p>• Total revenue: <strong>RM{analytics.totalRevenue.toFixed(2)}</strong></p>
                        <p>• Popular menu items below</p>
                      </div>
                    </div>
                  </div>

                  {analytics.popularMenuItems.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Popular Menu Items</h4>
                      <div className="space-y-2">
                        {analytics.popularMenuItems.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                            <span className="font-medium">{idx + 1}. {item.name}</span>
                            <Badge variant="secondary">{item.count} orders</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};