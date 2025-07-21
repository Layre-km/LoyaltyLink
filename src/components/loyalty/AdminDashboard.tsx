import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Users, BarChart3, Gift, Calendar, TrendingUp } from "lucide-react";
import { CustomerRegistrationForm } from "./CustomerRegistrationForm";

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

export const AdminDashboard = () => {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);

  // Demo data since authentication is disabled
  useEffect(() => {
    loadDemoData();
  }, []);

  const loadDemoData = () => {
    setSystemStats({
      total_customers: 125,
      total_visits: 867,
      rewards_claimed: 234,
      bronze_tier: 78,
      silver_tier: 35,
      gold_tier: 12
    });

    setCustomers([
      {
        id: '1',
        full_name: 'John Doe',
        email: 'john.doe@example.com',
        total_visits: 7,
        current_tier: 'silver',
        joined_date: '2024-01-01',
        last_visit: '2024-01-20'
      },
      {
        id: '2',
        full_name: 'Jane Smith',
        email: 'jane.smith@example.com',
        total_visits: 3,
        current_tier: 'bronze',
        joined_date: '2024-01-05',
        last_visit: '2024-01-18'
      },
      {
        id: '3',
        full_name: 'Bob Johnson',
        email: 'bob.johnson@example.com',
        total_visits: 22,
        current_tier: 'gold',
        joined_date: '2023-12-15',
        last_visit: '2024-01-19'
      },
      {
        id: '4',
        full_name: 'Alice Wilson',
        email: 'alice.wilson@example.com',
        total_visits: 12,
        current_tier: 'silver',
        joined_date: '2024-01-10',
        last_visit: '2024-01-21'
      },
      {
        id: '5',
        full_name: 'Charlie Brown',
        email: 'charlie.brown@example.com',
        total_visits: 1,
        current_tier: 'bronze',
        joined_date: '2024-01-20',
        last_visit: '2024-01-20'
      }
    ]);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'bronze';
      case 'silver': return 'silver';
      case 'gold': return 'gold';
      default: return 'bronze';
    }
  };

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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="customers">Customer Management</TabsTrigger>
          <TabsTrigger value="settings">System Settings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="customers">
          <div className="space-y-6">
            {/* Add Customer Form */}
            <CustomerRegistrationForm onCustomerAdded={loadDemoData} />
            
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
                        {new Date(customer.last_visit).toLocaleDateString()}
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