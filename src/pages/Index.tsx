import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerDashboard } from "@/components/loyalty/CustomerDashboard";
import { StaffDashboard } from "@/components/loyalty/StaffDashboard";
import { AdminDashboard } from "@/components/loyalty/AdminDashboard";
import { Crown, Users, Settings } from "lucide-react";

type UserRole = 'customer' | 'staff' | 'admin';

const Index = () => {
  const [currentRole, setCurrentRole] = useState<UserRole>('customer');

  const roleButtons = [
    { role: 'customer' as UserRole, label: 'Customer View', icon: Crown, variant: 'default' },
    { role: 'staff' as UserRole, label: 'Staff View', icon: Users, variant: 'secondary' },
    { role: 'admin' as UserRole, label: 'Admin View', icon: Settings, variant: 'outline' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
            Digital Loyalty Program
          </h1>
          <p className="text-xl text-muted-foreground mb-6">
            Complete loyalty management system with tier progression and rewards
          </p>
          
          {/* Role Switcher */}
          <div className="flex justify-center gap-4 mb-8 flex-wrap">
            {roleButtons.map(({ role, label, icon: Icon, variant }) => (
              <Button
                key={role}
                variant={currentRole === role ? "default" : variant as any}
                onClick={() => setCurrentRole(role)}
                className="flex items-center gap-2"
              >
                <Icon className="w-4 h-4" />
                {label}
              </Button>
            ))}
          </div>
          
          <Badge variant="secondary" className="text-sm">
            Demo Mode - Authentication disabled for testing
          </Badge>
        </div>

        {/* Dashboard Content */}
        <div className="max-w-7xl mx-auto">
          {currentRole === 'customer' && <CustomerDashboard />}
          {currentRole === 'staff' && <StaffDashboard />}
          {currentRole === 'admin' && <AdminDashboard />}
        </div>

        {/* Features Overview */}
        <Card className="mt-12 max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center">System Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Customer Features</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• View tier status and visit count</li>
                  <li>• Reward wallet management</li>
                  <li>• Referral code sharing</li>
                  <li>• Birthday reward tracking</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Staff Features</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Manual visit logging</li>
                  <li>• Customer lookup by email/phone</li>
                  <li>• Reward validation</li>
                  <li>• Quick customer stats view</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Admin Features</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Complete customer management</li>
                  <li>• System analytics dashboard</li>
                  <li>• Tier threshold configuration</li>
                  <li>• Reward system management</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;