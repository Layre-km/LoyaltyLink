import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, Check, Clock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  status: 'available' | 'claimed';
  customer_name: string;
}

export const StaffDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [visitNotes, setVisitNotes] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pendingRewards, setPendingRewards] = useState<Reward[]>([]);
  const [isLoggingVisit, setIsLoggingVisit] = useState(false);
  const { toast } = useToast();

  // Demo data since authentication is disabled
  useEffect(() => {
    loadDemoData();
  }, []);

  const loadDemoData = () => {
    setCustomers([
      {
        id: '1',
        full_name: 'John Doe',
        email: 'john.doe@example.com',
        phone_number: '+1234567890',
        stats: { total_visits: 7, current_tier: 'silver' }
      },
      {
        id: '2',
        full_name: 'Jane Smith',
        email: 'jane.smith@example.com',
        phone_number: '+1234567891',
        stats: { total_visits: 3, current_tier: 'bronze' }
      },
      {
        id: '3',
        full_name: 'Bob Johnson',
        email: 'bob.johnson@example.com',
        phone_number: '+1234567892',
        stats: { total_visits: 15, current_tier: 'silver' }
      }
    ]);

    setPendingRewards([
      {
        id: '1',
        reward_title: 'Milestone Reward - 6 Visits!',
        status: 'available',
        customer_name: 'John Doe'
      },
      {
        id: '2',
        reward_title: 'Tier Upgraded to SILVER',
        status: 'available',
        customer_name: 'John Doe'
      }
    ]);
  };

  const searchCustomers = () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Search required",
        description: "Please enter a name, email, or phone number to search.",
        variant: "destructive"
      });
      return;
    }

    const found = customers.filter(customer => 
      customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone_number?.includes(searchTerm)
    );

    if (found.length === 0) {
      toast({
        title: "Customer not found",
        description: "No customer found with the provided search criteria.",
        variant: "destructive"
      });
      setSelectedCustomer(null);
    } else {
      setSelectedCustomer(found[0]);
      toast({
        title: "Customer found",
        description: `Found ${found[0].full_name}`
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

    setIsLoggingVisit(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update customer stats (demo)
      const updatedStats = {
        total_visits: (selectedCustomer.stats?.total_visits || 0) + 1,
        current_tier: selectedCustomer.stats?.current_tier || 'bronze'
      };

      setSelectedCustomer({
        ...selectedCustomer,
        stats: updatedStats
      });

      // Update customers list
      setCustomers(prev => 
        prev.map(c => 
          c.id === selectedCustomer.id 
            ? { ...c, stats: updatedStats }
            : c
        )
      );

      setVisitNotes("");
      
      toast({
        title: "Visit logged successfully",
        description: `Visit recorded for ${selectedCustomer.full_name}. Total visits: ${updatedStats.total_visits}`
      });
    } catch (error) {
      toast({
        title: "Error logging visit",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoggingVisit(false);
    }
  };

  const validateReward = async (rewardId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
        description: `Reward claimed for ${reward?.customer_name}`
      });
    } catch (error) {
      toast({
        title: "Error validating reward",
        description: "Please try again.",
        variant: "destructive"
      });
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

  return (
    <div className="space-y-6">
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
                />
                <Button onClick={searchCustomers}>
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
                            Customer: {reward.customer_name}
                          </p>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => validateReward(reward.id)}
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