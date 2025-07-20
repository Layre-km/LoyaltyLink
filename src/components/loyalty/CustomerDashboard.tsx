import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Gift, Users, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

interface Profile {
  id: string;
  full_name: string;
  email: string;
  referral_code: string;
}

export const CustomerDashboard = () => {
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const { toast } = useToast();

  // Demo data since authentication is disabled
  useEffect(() => {
    loadDemoData();
  }, []);

  const loadDemoData = () => {
    // Simulate customer data
    setProfile({
      id: 'demo-customer',
      full_name: 'John Doe',
      email: 'john.doe@example.com',
      referral_code: 'JOHN2024'
    });

    setCustomerStats({
      total_visits: 7,
      current_tier: 'silver'
    });

    setRewards([
      {
        id: '1',
        reward_title: 'Welcome Bonus',
        reward_description: 'Thank you for joining our loyalty program!',
        status: 'claimed',
        reward_type: 'signup',
        unlocked_at: '2024-01-01T00:00:00Z',
        claimed_at: '2024-01-02T00:00:00Z'
      },
      {
        id: '2',
        reward_title: 'Milestone Reward - 6 Visits!',
        reward_description: 'Congratulations on reaching 6 visits! Enjoy your reward.',
        status: 'available',
        reward_type: 'milestone',
        unlocked_at: '2024-01-15T00:00:00Z'
      },
      {
        id: '3',
        reward_title: 'Tier Upgraded to SILVER',
        reward_description: 'Congratulations! You have been upgraded to SILVER tier!',
        status: 'available',
        reward_type: 'tier_upgrade',
        unlocked_at: '2024-01-15T00:00:00Z'
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