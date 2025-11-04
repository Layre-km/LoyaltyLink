import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface TierThresholds {
  bronze: { min: number; max: number };
  silver: { min: number; max: number };
  gold: { min: number };
}

interface GraduationReward {
  reward_type: 'fixed' | 'percentage';
  reward_value: number;
  reward_title: string;
  reward_description: string;
}

interface TierGraduationRewards {
  bronze_to_silver: GraduationReward;
  silver_to_gold: GraduationReward;
}

interface SystemSettings {
  tier_thresholds: TierThresholds;
  tier_graduation_rewards: TierGraduationRewards;
  milestone_frequency: number;
  milestone_reward_value: number;
  referral_reward_value: number;
  reward_expiration_days: number;
}

export const SystemConfiguration = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      const settingsMap = data?.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {} as Record<string, any>) || {};

      setSettings({
        tier_thresholds: settingsMap.tier_thresholds || {
          bronze: { min: 0, max: 9 },
          silver: { min: 10, max: 19 },
          gold: { min: 20 }
        },
        tier_graduation_rewards: settingsMap.tier_graduation_rewards || {
          bronze_to_silver: {
            reward_type: 'fixed',
            reward_value: 10,
            reward_title: 'Upgraded to Silver Tier!',
            reward_description: 'Congratulations on reaching Silver tier! Enjoy $10 off your next order.'
          },
          silver_to_gold: {
            reward_type: 'fixed',
            reward_value: 15,
            reward_title: 'Upgraded to Gold Tier!',
            reward_description: 'Congratulations on reaching Gold tier! Enjoy $15 off your next order.'
          }
        },
        milestone_frequency: settingsMap.milestone_frequency || 6,
        milestone_reward_value: settingsMap.milestone_reward_value || 10.00,
        referral_reward_value: settingsMap.referral_reward_value || 15.00,
        reward_expiration_days: settingsMap.reward_expiration_days || 30
      });
    } catch (error: any) {
      console.error('Error loading settings:', error);
      toast.error("Failed to load system settings");
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    const { error } = await supabase
      .from('system_settings')
      .update({ setting_value: value })
      .eq('setting_key', key);

    if (error) throw error;
  };

  const handleSaveTierThresholds = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      await updateSetting('tier_thresholds', settings.tier_thresholds);
      toast.success("Tier thresholds updated successfully");
    } catch (error: any) {
      toast.error("Failed to save tier thresholds");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGraduationRewards = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      await updateSetting('tier_graduation_rewards', settings.tier_graduation_rewards);
      toast.success("Graduation rewards updated successfully");
    } catch (error: any) {
      toast.error("Failed to save graduation rewards");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOtherRewards = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      await Promise.all([
        updateSetting('milestone_frequency', settings.milestone_frequency),
        updateSetting('milestone_reward_value', settings.milestone_reward_value),
        updateSetting('referral_reward_value', settings.referral_reward_value),
        updateSetting('reward_expiration_days', settings.reward_expiration_days)
      ]);
      toast.success("Other reward settings updated successfully");
    } catch (error: any) {
      toast.error("Failed to save reward settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading settings...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tier Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Tier Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Visit Thresholds */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Visit Thresholds</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bronze Tier - Min Visits</Label>
                <Input
                  type="number"
                  value={settings.tier_thresholds.bronze.min}
                  onChange={(e) => setSettings({
                    ...settings,
                    tier_thresholds: {
                      ...settings.tier_thresholds,
                      bronze: { ...settings.tier_thresholds.bronze, min: parseInt(e.target.value) || 0 }
                    }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Bronze Tier - Max Visits</Label>
                <Input
                  type="number"
                  value={settings.tier_thresholds.bronze.max}
                  onChange={(e) => setSettings({
                    ...settings,
                    tier_thresholds: {
                      ...settings.tier_thresholds,
                      bronze: { ...settings.tier_thresholds.bronze, max: parseInt(e.target.value) || 0 }
                    }
                  })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Silver Tier - Min Visits</Label>
                <Input
                  type="number"
                  value={settings.tier_thresholds.silver.min}
                  onChange={(e) => setSettings({
                    ...settings,
                    tier_thresholds: {
                      ...settings.tier_thresholds,
                      silver: { ...settings.tier_thresholds.silver, min: parseInt(e.target.value) || 0 }
                    }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Silver Tier - Max Visits</Label>
                <Input
                  type="number"
                  value={settings.tier_thresholds.silver.max}
                  onChange={(e) => setSettings({
                    ...settings,
                    tier_thresholds: {
                      ...settings.tier_thresholds,
                      silver: { ...settings.tier_thresholds.silver, max: parseInt(e.target.value) || 0 }
                    }
                  })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gold Tier - Min Visits</Label>
                <Input
                  type="number"
                  value={settings.tier_thresholds.gold.min}
                  onChange={(e) => setSettings({
                    ...settings,
                    tier_thresholds: {
                      ...settings.tier_thresholds,
                      gold: { min: parseInt(e.target.value) || 0 }
                    }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Gold Tier - Max Visits</Label>
                <Input value="∞" disabled />
              </div>
            </div>

            <Button 
              onClick={handleSaveTierThresholds}
              disabled={saving}
              className="min-h-[44px]"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Tier Thresholds
            </Button>
          </div>

          {/* Tier Graduation Rewards */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold">Tier Graduation Rewards</h3>
            
            {/* Bronze to Silver */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium">Bronze → Silver Upgrade Reward</h4>
              
              <div className="space-y-2">
                <Label>Reward Type</Label>
                <RadioGroup
                  value={settings.tier_graduation_rewards.bronze_to_silver.reward_type}
                  onValueChange={(value: 'fixed' | 'percentage') => setSettings({
                    ...settings,
                    tier_graduation_rewards: {
                      ...settings.tier_graduation_rewards,
                      bronze_to_silver: {
                        ...settings.tier_graduation_rewards.bronze_to_silver,
                        reward_type: value
                      }
                    }
                  })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="bronze-fixed" />
                    <Label htmlFor="bronze-fixed">Fixed Dollar Amount</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="percentage" id="bronze-percentage" />
                    <Label htmlFor="bronze-percentage">Percentage Discount</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>
                  {settings.tier_graduation_rewards.bronze_to_silver.reward_type === 'fixed' 
                    ? 'Dollar Amount ($)' 
                    : 'Percentage (%)'}
                </Label>
                <Input
                  type="number"
                  step={settings.tier_graduation_rewards.bronze_to_silver.reward_type === 'fixed' ? '0.01' : '1'}
                  value={settings.tier_graduation_rewards.bronze_to_silver.reward_value}
                  onChange={(e) => setSettings({
                    ...settings,
                    tier_graduation_rewards: {
                      ...settings.tier_graduation_rewards,
                      bronze_to_silver: {
                        ...settings.tier_graduation_rewards.bronze_to_silver,
                        reward_value: parseFloat(e.target.value) || 0
                      }
                    }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Reward Title</Label>
                <Input
                  value={settings.tier_graduation_rewards.bronze_to_silver.reward_title}
                  onChange={(e) => setSettings({
                    ...settings,
                    tier_graduation_rewards: {
                      ...settings.tier_graduation_rewards,
                      bronze_to_silver: {
                        ...settings.tier_graduation_rewards.bronze_to_silver,
                        reward_title: e.target.value
                      }
                    }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Reward Description</Label>
                <Textarea
                  value={settings.tier_graduation_rewards.bronze_to_silver.reward_description}
                  onChange={(e) => setSettings({
                    ...settings,
                    tier_graduation_rewards: {
                      ...settings.tier_graduation_rewards,
                      bronze_to_silver: {
                        ...settings.tier_graduation_rewards.bronze_to_silver,
                        reward_description: e.target.value
                      }
                    }
                  })}
                  rows={3}
                />
              </div>
            </div>

            {/* Silver to Gold */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium">Silver → Gold Upgrade Reward</h4>
              
              <div className="space-y-2">
                <Label>Reward Type</Label>
                <RadioGroup
                  value={settings.tier_graduation_rewards.silver_to_gold.reward_type}
                  onValueChange={(value: 'fixed' | 'percentage') => setSettings({
                    ...settings,
                    tier_graduation_rewards: {
                      ...settings.tier_graduation_rewards,
                      silver_to_gold: {
                        ...settings.tier_graduation_rewards.silver_to_gold,
                        reward_type: value
                      }
                    }
                  })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="gold-fixed" />
                    <Label htmlFor="gold-fixed">Fixed Dollar Amount</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="percentage" id="gold-percentage" />
                    <Label htmlFor="gold-percentage">Percentage Discount</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>
                  {settings.tier_graduation_rewards.silver_to_gold.reward_type === 'fixed' 
                    ? 'Dollar Amount ($)' 
                    : 'Percentage (%)'}
                </Label>
                <Input
                  type="number"
                  step={settings.tier_graduation_rewards.silver_to_gold.reward_type === 'fixed' ? '0.01' : '1'}
                  value={settings.tier_graduation_rewards.silver_to_gold.reward_value}
                  onChange={(e) => setSettings({
                    ...settings,
                    tier_graduation_rewards: {
                      ...settings.tier_graduation_rewards,
                      silver_to_gold: {
                        ...settings.tier_graduation_rewards.silver_to_gold,
                        reward_value: parseFloat(e.target.value) || 0
                      }
                    }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Reward Title</Label>
                <Input
                  value={settings.tier_graduation_rewards.silver_to_gold.reward_title}
                  onChange={(e) => setSettings({
                    ...settings,
                    tier_graduation_rewards: {
                      ...settings.tier_graduation_rewards,
                      silver_to_gold: {
                        ...settings.tier_graduation_rewards.silver_to_gold,
                        reward_title: e.target.value
                      }
                    }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Reward Description</Label>
                <Textarea
                  value={settings.tier_graduation_rewards.silver_to_gold.reward_description}
                  onChange={(e) => setSettings({
                    ...settings,
                    tier_graduation_rewards: {
                      ...settings.tier_graduation_rewards,
                      silver_to_gold: {
                        ...settings.tier_graduation_rewards.silver_to_gold,
                        reward_description: e.target.value
                      }
                    }
                  })}
                  rows={3}
                />
              </div>
            </div>

            <Button 
              onClick={handleSaveGraduationRewards}
              disabled={saving}
              className="min-h-[44px]"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Graduation Rewards
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Other Reward Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Other Reward Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="milestone_frequency">Milestone Frequency (Visits)</Label>
              <Input
                id="milestone_frequency"
                type="number"
                value={settings.milestone_frequency}
                onChange={(e) => setSettings({
                  ...settings,
                  milestone_frequency: parseInt(e.target.value) || 0
                })}
              />
              <p className="text-xs text-muted-foreground">
                Award a milestone reward every X visits
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="milestone_reward">Milestone Reward Value ($)</Label>
              <Input
                id="milestone_reward"
                type="number"
                step="0.01"
                value={settings.milestone_reward_value}
                onChange={(e) => setSettings({
                  ...settings,
                  milestone_reward_value: parseFloat(e.target.value) || 0
                })}
              />
              <p className="text-xs text-muted-foreground">
                Dollar amount for milestone rewards
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referral_reward">Referral Reward Value ($)</Label>
              <Input
                id="referral_reward"
                type="number"
                step="0.01"
                value={settings.referral_reward_value}
                onChange={(e) => setSettings({
                  ...settings,
                  referral_reward_value: parseFloat(e.target.value) || 0
                })}
              />
              <p className="text-xs text-muted-foreground">
                Reward for referring new customers
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reward_expiration">Reward Expiration (Days)</Label>
              <Input
                id="reward_expiration"
                type="number"
                value={settings.reward_expiration_days}
                onChange={(e) => setSettings({
                  ...settings,
                  reward_expiration_days: parseInt(e.target.value) || 0
                })}
              />
              <p className="text-xs text-muted-foreground">
                Days until rewards expire
              </p>
            </div>
          </div>

          <Button 
            onClick={handleSaveOtherRewards}
            disabled={saving}
            className="min-h-[44px]"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Other Reward Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
