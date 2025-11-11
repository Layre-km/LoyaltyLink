import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { profileUpdateSchema } from "@/lib/validations";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, User, Mail, Phone, Calendar, Info, Shield, Crown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ProfileFormData = z.infer<typeof profileUpdateSchema>;

const Profile = () => {
  const { profile, updateProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      fullName: profile?.full_name || "",
      email: profile?.email || "",
      phoneNumber: profile?.phone_number || "",
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    
    const emailChanged = data.email !== profile?.email;
    
    const { error } = await updateProfile({
      fullName: data.fullName,
      email: data.email,
      phoneNumber: data.phoneNumber || undefined,
    });

    setIsSubmitting(false);

    if (error) {
      const errorMessage = error.message || "Failed to update profile";
      
      // Handle specific error cases
      if (errorMessage.includes("email")) {
        toast({
          title: "Email Update Failed",
          description: errorMessage.includes("already registered") 
            ? "This email is already in use by another account"
            : errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Update Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
      return;
    }

    toast({
      title: "Profile Updated",
      description: emailChanged 
        ? "Your profile has been updated. Please check your new email address for a confirmation link."
        : "Your profile has been updated successfully.",
    });

    if (!emailChanged) {
      navigate("/");
    }
  };

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

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="shadow-lg">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <User className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Profile Settings</CardTitle>
                  <CardDescription>Manage your personal information</CardDescription>
                </div>
              </div>
              {profile?.roles && profile.roles.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {profile.roles.includes('admin') && <Shield className="h-3 w-3" />}
                  {profile.roles.includes('staff') && !profile.roles.includes('admin') && <Crown className="h-3 w-3" />}
                  {profile.roles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(' & ')}
                </Badge>
              )}
            </div>
            
            {profile?.referral_code && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Your referral code: <strong className="font-mono">{profile.referral_code}</strong>
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Editable Fields */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Full Name
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your full name" 
                            {...field} 
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email Address
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="Enter your email" 
                            {...field} 
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                        {field.value !== profile?.email && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            Changing your email will require confirmation
                          </p>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone Number <span className="text-muted-foreground text-xs">(Optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="tel"
                            placeholder="Enter your phone number" 
                            {...field} 
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Read-Only Field */}
                <div className="space-y-2 pt-4 border-t">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Date of Birth
                  </Label>
                  <Input 
                    value={formatDate(profile?.date_of_birth)}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your date of birth cannot be changed. Contact support if this needs updating.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-6">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSubmitting || !form.formState.isDirty}
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/")}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
