import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Users, BarChart3, Gift, Calendar, TrendingUp, Loader2, Clock, Search } from "lucide-react";
import { CustomerRegistrationForm } from "./CustomerRegistrationForm";
import { MenuManagement } from "./MenuManagement";
import { useToast } from "@/hooks/use-toast";

interface CustomerData {
  id: string;
  full_name: string;
  email: string;
  total_visits: number;
  current_tier: string;
  joined_date: string;
  last_visit: string;
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
}

export const AdminDashboard = () => {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const [orderSearchTerm, setOrderSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSystemData();
    loadOrderHistory();
  }, []);

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

      // Load customer list with stats
      const { data: customersData, error: customersError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          created_at,
          customer_stats (
            total_visits,
            current_tier
          ),
          visits (
            visit_date
          )
        `)
        .eq('role', 'customer')
        .order('created_at', { ascending: false })
        .limit(50);

      if (customersError) throw customersError;

      const formattedCustomers: CustomerData[] = customersData?.map(customer => ({
        id: customer.id,
        full_name: customer.full_name,
        email: customer.email,
        total_visits: customer.customer_stats?.[0]?.total_visits || 0,
        current_tier: customer.customer_stats?.[0]?.current_tier || 'bronze',
        joined_date: new Date(customer.created_at).toISOString().split('T')[0],
        last_visit: customer.visits?.[0]?.visit_date 
          ? new Date(customer.visits[0].visit_date).toISOString().split('T')[0]
          : 'Never'
      })) || [];

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
        .select('*')
        .eq('status', 'delivered')
        .lt('delivered_at', oneHourAgo.toISOString())
        .order('delivered_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setOrderHistory((data || []).map(order => ({
        ...order,
        items: order.items as any // Cast JSONB to expected type
      })));
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
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Admin Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Complete system overview and customer management tools.
          </p>
        </CardContent>
      </Card>

      {/* System Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Customers"
          value={systemStats?.total_customers || 0}
          icon={Users}
          description="Active loyalty members"
        />
        <StatCard
          title="Total Visits"
          value={systemStats?.total_visits || 0}
          icon={TrendingUp}
          description="All recorded visits"
        />
        <StatCard
          title="Rewards Claimed"
          value={systemStats?.rewards_claimed || 0}
          icon={Gift}
          description="Successfully redeemed"
        />
        <StatCard
          title="Gold Members"
          value={systemStats?.gold_tier || 0}
          icon={Calendar}
          description="Premium tier customers"
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
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-bronze/10 rounded-lg">
              <div className="text-2xl font-bold text-bronze">
                {systemStats?.bronze_tier || 0}
              </div>
              <div className="text-sm text-muted-foreground">Bronze Members</div>
            </div>
            <div className="text-center p-4 bg-silver/10 rounded-lg">
              <div className="text-2xl font-bold text-silver">
                {systemStats?.silver_tier || 0}
              </div>
              <div className="text-sm text-muted-foreground">Silver Members</div>
            </div>
            <div className="text-center p-4 bg-gold/10 rounded-lg">
              <div className="text-2xl font-bold text-gold">
                {systemStats?.gold_tier || 0}
              </div>
              <div className="text-sm text-muted-foreground">Gold Members</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Management Tabs */}
      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="customers">Customer Management</TabsTrigger>
          <TabsTrigger value="orders">Order History</TabsTrigger>
          <TabsTrigger value="menu">Menu Management</TabsTrigger>
          <TabsTrigger value="settings">System Settings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="customers">
          <div className="space-y-6">
            {/* Add Customer Form */}
            <CustomerRegistrationForm onCustomerAdded={loadSystemData} />
            
            {/* Customer List */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Visits</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Last Visit</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        {customer.full_name}
                      </TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.total_visits}</TableCell>
                      <TableCell>
                        <Badge 
                          className={`bg-${getTierColor(customer.current_tier)} text-${getTierColor(customer.current_tier)}-foreground`}
                        >
                          {customer.current_tier.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {customer.last_visit === 'Never' 
                          ? 'Never' 
                          : new Date(customer.last_visit).toLocaleDateString()
                        }
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Order History
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={orderSearchTerm}
                    onChange={(e) => setOrderSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredOrderHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {orderSearchTerm ? 'No orders match your search.' : 'No completed orders to display.'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Delivered</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrderHistory.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Badge variant="outline">{order.table_number}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span>{item.name} × {item.qty}</span>
                                <span>${(item.price * item.qty).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${order.total_amount.toFixed(2)}
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="menu">
          <MenuManagement />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3">Tier Thresholds</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="font-medium text-bronze">Bronze Tier</div>
                    <div className="text-sm text-muted-foreground">0 - 9 visits</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="font-medium text-silver">Silver Tier</div>
                    <div className="text-sm text-muted-foreground">10 - 19 visits</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="font-medium text-gold">Gold Tier</div>
                    <div className="text-sm text-muted-foreground">20+ visits</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Reward Settings</h4>
                <div className="space-y-2 text-sm">
                  <p>• Milestone rewards every 6 visits</p>
                  <p>• Automatic tier upgrade rewards</p>
                  <p>• Birthday rewards enabled</p>
                  <p>• Referral rewards: 1 per successful referral</p>
                </div>
              </div>

              <Button>Update Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>System Analytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Visit Trends</h4>
                  <div className="space-y-2 text-sm">
                    <p>• Average visits per customer: 6.9</p>
                    <p>• Most active day: Friday</p>
                    <p>• Peak hours: 2pm - 4pm</p>
                    <p>• Monthly growth: +12%</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Reward Performance</h4>
                  <div className="space-y-2 text-sm">
                    <p>• Redemption rate: 78%</p>
                    <p>• Most popular: Milestone rewards</p>
                    <p>• Referral success rate: 34%</p>
                    <p>• Birthday rewards sent: 23 this month</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Customer Insights</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-muted/50 rounded">
                    <div className="font-medium">New Signups</div>
                    <div className="text-muted-foreground">+15 this week</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded">
                    <div className="font-medium">Retention Rate</div>
                    <div className="text-muted-foreground">82% return visitors</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded">
                    <div className="font-medium">Avg. Time to Gold</div>
                    <div className="text-muted-foreground">3.2 months</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};