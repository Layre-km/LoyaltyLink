import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

interface SystemSettings {
  tier_thresholds: {
    bronze: { min: number; max: number };
    silver: { min: number; max: number };
    gold: { min: number };
  };
  tier_discounts: {
    bronze: number;
    silver: number;
    gold: number;
  };
  milestone_frequency: number;
  milestone_reward_value: number;
  referral_reward_value: number;
  reward_expiration_days: number;
  birthday_rewards_enabled: boolean;
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
        .from("system_settings")
        .select("setting_key, setting_value");

      if (error) throw error;

      const settingsObj: any = {};
      data?.forEach((item) => {
        settingsObj[item.setting_key] = item.setting_value;
      });

      setSettings(settingsObj as SystemSettings);
    } catch (error: any) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load system settings");
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      const { error } = await supabase
        .from("system_settings")
        .update({ 
          setting_value: value,
          updated_at: new Date().toISOString()
        })
        .eq("setting_key", key);

      if (error) throw error;
    } catch (error: any) {
      throw new Error(`Failed to update ${key}: ${error.message}`);
    }
  };

  const handleSaveTierSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await Promise.all([
        updateSetting("tier_thresholds", settings.tier_thresholds),
        updateSetting("tier_discounts", settings.tier_discounts),
      ]);
      toast.success("Tier settings updated successfully");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRewardSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await Promise.all([
        updateSetting("milestone_frequency", settings.milestone_frequency),
        updateSetting("milestone_reward_value", settings.milestone_reward_value),
        updateSetting("referral_reward_value", settings.referral_reward_value),
        updateSetting("reward_expiration_days", settings.reward_expiration_days),
        updateSetting("birthday_rewards_enabled", settings.birthday_rewards_enabled),
      ]);
      toast.success("Reward settings updated successfully");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">Loading settings...</span>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Failed to load settings
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tier Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Tier Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bronze Tier */}
            <div className="space-y-3 p-4 border rounded-lg">
              <h4 className="font-semibold text-bronze">Bronze Tier</h4>
              <div className="space-y-2">
                <Label htmlFor="bronze-min">Min Visits</Label>
                <Input
                  id="bronze-min"
                  type="number"
                  value={settings.tier_thresholds.bronze.min}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      tier_thresholds: {
                        ...settings.tier_thresholds,
                        bronze: {
                          ...settings.tier_thresholds.bronze,
                          min: parseInt(e.target.value) || 0,
                        },
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bronze-max">Max Visits</Label>
                <Input
                  id="bronze-max"
                  type="number"
                  value={settings.tier_thresholds.bronze.max}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      tier_thresholds: {
                        ...settings.tier_thresholds,
                        bronze: {
                          ...settings.tier_thresholds.bronze,
                          max: parseInt(e.target.value) || 0,
                        },
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bronze-discount">Discount %</Label>
                <Input
                  id="bronze-discount"
                  type="number"
                  value={settings.tier_discounts.bronze}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      tier_discounts: {
                        ...settings.tier_discounts,
                        bronze: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
            </div>

            {/* Silver Tier */}
            <div className="space-y-3 p-4 border rounded-lg">
              <h4 className="font-semibold text-silver">Silver Tier</h4>
              <div className="space-y-2">
                <Label htmlFor="silver-min">Min Visits</Label>
                <Input
                  id="silver-min"
                  type="number"
                  value={settings.tier_thresholds.silver.min}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      tier_thresholds: {
                        ...settings.tier_thresholds,
                        silver: {
                          ...settings.tier_thresholds.silver,
                          min: parseInt(e.target.value) || 0,
                        },
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="silver-max">Max Visits</Label>
                <Input
                  id="silver-max"
                  type="number"
                  value={settings.tier_thresholds.silver.max}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      tier_thresholds: {
                        ...settings.tier_thresholds,
                        silver: {
                          ...settings.tier_thresholds.silver,
                          max: parseInt(e.target.value) || 0,
                        },
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="silver-discount">Discount %</Label>
                <Input
                  id="silver-discount"
                  type="number"
                  value={settings.tier_discounts.silver}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      tier_discounts: {
                        ...settings.tier_discounts,
                        silver: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
            </div>

            {/* Gold Tier */}
            <div className="space-y-3 p-4 border rounded-lg">
              <h4 className="font-semibold text-gold">Gold Tier</h4>
              <div className="space-y-2">
                <Label htmlFor="gold-min">Min Visits</Label>
                <Input
                  id="gold-min"
                  type="number"
                  value={settings.tier_thresholds.gold.min}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      tier_thresholds: {
                        ...settings.tier_thresholds,
                        gold: {
                          min: parseInt(e.target.value) || 0,
                        },
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max Visits</Label>
                <Input value="∞" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gold-discount">Discount %</Label>
                <Input
                  id="gold-discount"
                  type="number"
                  value={settings.tier_discounts.gold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      tier_discounts: {
                        ...settings.tier_discounts,
                        gold: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleSaveTierSettings}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Tier Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Reward Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Reward Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="milestone-freq">Milestone Frequency (visits)</Label>
              <Input
                id="milestone-freq"
                type="number"
                value={settings.milestone_frequency}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    milestone_frequency: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="milestone-value">Milestone Reward Value ($)</Label>
              <Input
                id="milestone-value"
                type="number"
                step="0.01"
                value={settings.milestone_reward_value}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    milestone_reward_value: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referral-value">Referral Reward Value ($)</Label>
              <Input
                id="referral-value"
                type="number"
                step="0.01"
                value={settings.referral_reward_value}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    referral_reward_value: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiration-days">Reward Expiration (days)</Label>
              <Input
                id="expiration-days"
                type="number"
                value={settings.reward_expiration_days}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    reward_expiration_days: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <Button
            onClick={handleSaveRewardSettings}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Reward Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
