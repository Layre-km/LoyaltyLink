import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const AdminAccessPanel = () => {
  const [email, setEmail] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { refreshProfile } = useAuth();

  const handlePromoteToAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase.rpc("create_admin_access", {
        user_email: email,
        secret_key: secretKey,
      });

      if (error) {
        setMessage("Error: " + error.message);
      } else if (data) {
        setMessage("Successfully promoted user to admin!");
        setEmail("");
        setSecretKey("");
        // Refresh current user's profile in case they promoted themselves
        refreshProfile();
      } else {
        setMessage("Invalid secret key or user not found.");
      }
    } catch (error) {
      setMessage("Error promoting user: " + (error as Error).message);
    }

    setLoading(false);
  };

  const handlePromoteToStaff = async () => {
    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.rpc("promote_user_to_staff", {
        user_email: email,
      });

      if (error) {
        setMessage("Error: " + error.message);
      } else {
        setMessage("Successfully promoted user to staff!");
        setEmail("");
        refreshProfile();
      }
    } catch (error) {
      setMessage("Error promoting user: " + (error as Error).message);
    }

    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Admin Access Panel</CardTitle>
        <CardDescription className="text-sm">Promote users to admin or staff roles</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePromoteToAdmin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">User Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter user email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="min-h-[44px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secretKey">Admin Secret Key</Label>
            <Input
              id="secretKey"
              type="password"
              placeholder="Enter admin secret key"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className="min-h-[44px]"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button type="submit" disabled={loading} className="flex-1 min-h-[44px]">
              {loading ? "Processing..." : "Promote to Admin"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handlePromoteToStaff}
              disabled={loading || !email}
              className="flex-1 min-h-[44px]"
            >
              Promote to Staff
            </Button>
          </div>
        </form>

        {message && (
          <Alert className="mt-4">
            <AlertDescription className="text-sm">{message}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminAccessPanel;
