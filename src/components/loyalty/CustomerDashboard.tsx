import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Gift, Users, Copy, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface CustomerStats {
  total_visits: number;
  current_tier: 'bronze' | 'silver' | 'gold';
}

interface Reward {
  id: string;
  reward_title: string;
  reward_description: string;
  status: 'available' | 'claimed';
  reward_type: string;
  unlocked_at: string;
  claimed_at?: string;
}

export const CustomerDashboard = () => {
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile } = useAuth();

  useEffect(() => {
    if (profile) {
      loadCustomerData();
    }
  }, [profile]);

  const loadCustomerData = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      // Fetch customer stats
      const { data: statsData, error: statsError } = await supabase
        .from('customer_stats')
        .select('*')
        .eq('customer_id', profile.id)
        .single();

      if (statsError && statsError.code !== 'PGRST116') {
        console.error('Error fetching customer stats:', statsError);
      } else {
        setCustomerStats(statsData || { total_visits: 0, current_tier: 'bronze' });
      }

      // Fetch rewards
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('rewards')
        .select('*')
        .eq('customer_id', profile.id)
        .order('unlocked_at', { ascending: false });

      if (rewardsError) {
        console.error('Error fetching rewards:', rewardsError);
        toast({
          title: "Error loading rewards",
          description: "Could not load your rewards. Please try again.",
          variant: "destructive"
        });
      } else {
        setRewards(rewardsData || []);
      }
    } catch (error) {
      console.error('Error loading customer data:', error);
      toast({
        title: "Error loading data",
        description: "Could not load your loyalty data. Please try again.",
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

  const getNextTierThreshold = (currentTier: string) => {
    switch (currentTier) {
      case 'bronze': return 10;
      case 'silver': return 20;
      case 'gold': return null;
      default: return 10;
    }
  };

  const copyReferralCode = async () => {
    if (profile?.referral_code) {
      await navigator.clipboard.writeText(profile.referral_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast({
        title: "Referral code copied!",
        description: "Share it with friends to earn rewards."
      });
    }
  };

  const nextTierThreshold = getNextTierThreshold(customerStats?.current_tier || 'bronze');
  const progressToNextTier = nextTierThreshold ? 
    Math.min(((customerStats?.total_visits || 0) / nextTierThreshold) * 100, 100) : 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading your loyalty data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Customer Profile Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Welcome back, {profile?.full_name || 'Customer'}!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Current Tier */}
            <div className="text-center">
              <Badge 
                className={`text-lg px-6 py-2 bg-${getTierColor(customerStats?.current_tier || 'bronze')} text-${getTierColor(customerStats?.current_tier || 'bronze')}-foreground`}
              >
                {customerStats?.current_tier?.toUpperCase() || 'BRONZE'} TIER
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">Current Status</p>
            </div>

            {/* Visit Count */}
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {customerStats?.total_visits || 0}
              </div>
              <p className="text-sm text-muted-foreground">Total Visits</p>
            </div>

            {/* Progress to Next Tier */}
            <div className="text-center">
              {nextTierThreshold ? (
                <>
                  <Progress value={progressToNextTier} className="mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {nextTierThreshold - (customerStats?.total_visits || 0)} visits to next tier
                  </p>
                </>
              ) : (
                <div className="text-gold font-semibold">MAX TIER REACHED! 🏆</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Place Order */}
      <Card>
        <CardHeader>
          <CardTitle>Order from your table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Ready to order? Choose items from our menu and tell us your table number.
            </p>
            <Button onClick={() => navigate('/order')}>
              Place an Order
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Reward Wallet */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Reward Wallet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rewards.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No rewards yet. Keep visiting to unlock rewards!
                </p>
              ) : (
                rewards.map((reward) => (
                  <div 
                    key={reward.id}
                    className={`p-4 rounded-lg border ${
                      reward.status === 'available' 
                        ? 'border-success bg-success/5' 
                        : 'border-muted bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{reward.reward_title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {reward.reward_description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Unlocked: {new Date(reward.unlocked_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge 
                        variant={reward.status === 'available' ? 'default' : 'secondary'}
                      >
                        {reward.status === 'available' ? 'Available' : 'Claimed'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Referral Program */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Referral Program
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Your Referral Code</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 p-2 bg-muted rounded font-mono">
                    {profile?.referral_code || 'LOADING...'}
                  </code>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={copyReferralCode}
                    className="shrink-0"
                  >
                    {copiedCode ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Share this code with friends and both of you get rewards!
                </p>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">How it works:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Share your referral code with friends</li>
                  <li>• They use it when signing up</li>
                  <li>• Both of you get a special reward!</li>
                  <li>• One reward per successful referral</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};