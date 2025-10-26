import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomerDashboard } from "@/components/loyalty/CustomerDashboard";
import { StaffDashboard } from "@/components/loyalty/StaffDashboard";
import { AdminDashboard } from "@/components/loyalty/AdminDashboard";
import { Crown, Users, Settings, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type UserRole = 'customer' | 'staff' | 'admin';

const Index = () => {
  const [currentRole, setCurrentRole] = useState<UserRole>('customer');
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Update current role based on user's actual roles
  useEffect(() => {
    if (profile?.roles && profile.roles.length > 0) {
      // Set to highest privilege role (admin > staff > customer)
      if (profile.roles.includes('admin')) {
        setCurrentRole('admin');
      } else if (profile.roles.includes('staff')) {
        setCurrentRole('staff');
      } else {
        setCurrentRole('customer');
      }
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Only show role buttons for admin/staff users, customers only see their view
  const roleButtons = profile?.roles?.includes('admin')
    ? [
        { role: 'customer' as UserRole, label: 'Customer View', icon: Crown, variant: 'default' },
        { role: 'staff' as UserRole, label: 'Staff View', icon: Users, variant: 'secondary' },
        { role: 'admin' as UserRole, label: 'Admin View', icon: Settings, variant: 'outline' }
      ]
    : profile?.roles?.includes('staff')
    ? [
        { role: 'customer' as UserRole, label: 'Customer View', icon: Crown, variant: 'default' },
        { role: 'staff' as UserRole, label: 'Staff View', icon: Users, variant: 'secondary' }
      ]
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Digital Loyalty Program
            </h1>
            <div className="flex items-center gap-3">
              {profile?.roles && !profile.roles.includes('admin') && (
                <Link to="/admin-access">
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Request Admin Access
                  </Button>
                </Link>
              )}
              <Button 
                variant="outline" 
                onClick={signOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
          <p className="text-xl text-muted-foreground mb-6">
            Welcome back, {profile?.full_name || user?.email}
            {profile?.roles && profile.roles.length > 0 && ` (${profile.roles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', ')})`}
          </p>
          
          {/* Role Switcher - only show for staff/admin */}
          {roleButtons.length > 0 && (
            <div className="flex justify-center gap-4 mb-6 flex-wrap">
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
          )}
          
          <Badge variant="secondary" className="text-sm">
            {profile?.roles && profile.roles.length > 0 
              ? `${profile.roles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(' & ')} Access` 
              : 'Authenticated User Mode'}
          </Badge>
        </div>

        <div className="max-w-7xl mx-auto">
          {currentRole === 'customer' && <CustomerDashboard />}
          {currentRole === 'staff' && <StaffDashboard />}
          {currentRole === 'admin' && <AdminDashboard />}
        </div>
      </div>
    </div>
  );
};

export default Index;