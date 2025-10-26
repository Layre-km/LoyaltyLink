import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const DemoDataGenerator = ({ onDataGenerated }: { onDataGenerated?: () => void }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateDemoData = async () => {
    setIsGenerating(true);
    try {
      // Get current admin profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Generate menu items
      const menuItems = [
        { name: "Espresso", category: "beverages", price: 3.50, description: "Rich and bold espresso shot" },
        { name: "Cappuccino", category: "beverages", price: 4.50, description: "Espresso with steamed milk foam" },
        { name: "Latte", category: "beverages", price: 4.75, description: "Smooth espresso with steamed milk" },
        { name: "Croissant", category: "food", price: 3.25, description: "Buttery, flaky pastry" },
        { name: "Bagel", category: "food", price: 2.75, description: "Toasted with cream cheese" },
        { name: "Muffin", category: "food", price: 3.50, description: "Blueberry or chocolate chip" },
        { name: "Caesar Salad", category: "food", price: 8.50, description: "Fresh romaine with parmesan" },
        { name: "Club Sandwich", category: "food", price: 9.75, description: "Triple-decker classic" },
        { name: "Smoothie", category: "beverages", price: 5.50, description: "Fruit blend with yogurt" },
        { name: "Iced Tea", category: "beverages", price: 3.25, description: "Refreshing black tea" }
      ];

      await supabase.from("menu_items").insert(menuItems);

      // Update customer stats
      await supabase
        .from("customer_stats")
        .upsert({ 
          customer_id: profile.id, 
          total_visits: 15, 
          current_tier: "silver" 
        });

      // Generate orders (past 60 days)
      const orders = [];
      for (let i = 0; i < 20; i++) {
        const daysAgo = Math.floor(Math.random() * 60);
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        
        orders.push({
          customer_profile_id: profile.id,
          table_number: `T${Math.floor(Math.random() * 20) + 1}`,
          items: [{ name: menuItems[Math.floor(Math.random() * menuItems.length)].name, quantity: 1 }],
          total_amount: (Math.random() * 30 + 5).toFixed(2),
          status: "delivered",
          delivered_at: date.toISOString(),
          created_at: date.toISOString()
        });
      }

      await supabase.from("orders").insert(orders);

      // Generate visits
      const visits = [];
      for (let i = 0; i < 15; i++) {
        const daysAgo = Math.floor(Math.random() * 60);
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        
        visits.push({
          customer_id: profile.id,
          visit_date: date.toISOString(),
          notes: `Demo visit ${i + 1}`
        });
      }

      await supabase.from("visits").insert(visits);

      // Generate rewards
      const rewards = [
        { customer_id: profile.id, reward_type: "milestone", reward_title: "6 Visits Reward", reward_description: "Free drink", status: "claimed" as const, claimed_at: new Date().toISOString(), milestone_visits: 6 },
        { customer_id: profile.id, reward_type: "milestone", reward_title: "12 Visits Reward", reward_description: "Free pastry", status: "claimed" as const, claimed_at: new Date().toISOString(), milestone_visits: 12 },
        { customer_id: profile.id, reward_type: "tier_upgrade", reward_title: "Silver Tier Upgrade", reward_description: "Welcome to Silver!", status: "claimed" as const, claimed_at: new Date().toISOString() },
        { customer_id: profile.id, reward_type: "birthday", reward_title: "Birthday Reward", reward_description: "Happy birthday!", status: "available" as const, is_birthday_reward: true },
        { customer_id: profile.id, reward_type: "milestone", reward_title: "18 Visits Reward", reward_description: "Free meal", status: "available" as const, milestone_visits: 18 },
        { customer_id: profile.id, reward_type: "referral", reward_title: "Referral Bonus", reward_description: "Thanks for referring!", status: "available" as const, is_referral_reward: true }
      ];

      await supabase.from("rewards").insert(rewards);

      toast.success("Demo data generated successfully!");
      onDataGenerated?.();
    } catch (error: any) {
      console.error("Error generating demo data:", error);
      toast.error(`Failed to generate demo data: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demo Data Generator</CardTitle>
        <CardDescription>
          Generate sample data for testing (menu items, orders, visits, rewards)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={generateDemoData} 
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate Demo Data
        </Button>
      </CardContent>
    </Card>
  );
};
