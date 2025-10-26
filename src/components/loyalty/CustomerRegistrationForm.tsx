import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { customerRegistrationSchema, sanitizeText } from "@/lib/validations";
interface CustomerRegistrationFormProps {
  onCustomerAdded?: () => void;
}
export const CustomerRegistrationForm = ({
  onCustomerAdded
}: CustomerRegistrationFormProps) => {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    referred_by_code: ""
  });
  const [birthday, setBirthday] = useState<Date>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    toast
  } = useToast();
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const validateForm = () => {
    try {
      customerRegistrationSchema.parse({
        fullName: formData.full_name,
        email: formData.email,
        phoneNumber: formData.phone_number,
        referralCode: formData.referred_by_code
      });
      return true;
    } catch (validationError: any) {
      const errorMessage = validationError.errors?.[0]?.message || "Invalid form data";
      toast({
        title: "Validation Error",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      // First, create the profile with sanitized data
      const profileData = {
        user_id: crypto.randomUUID(),
        // Generate a UUID for the customer
        full_name: sanitizeText(formData.full_name.trim()),
        email: formData.email.trim().toLowerCase(),
        phone_number: sanitizeText(formData.phone_number.trim()),
        date_of_birth: birthday ? birthday.toISOString().split('T')[0] : null,
        referred_by_code: formData.referred_by_code.trim() || null,
        referral_code: crypto.randomUUID().slice(0, 8).toUpperCase(),
        // Generate referral code
        role: 'customer' as const
      };
      const {
        data: profile,
        error: profileError
      } = await supabase.from('profiles').insert([profileData]).select().single();
      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw new Error(profileError.message);
      }

      // Create initial customer stats
      const {
        error: statsError
      } = await supabase.from('customer_stats').insert([{
        customer_id: profile.id,
        total_visits: 0,
        current_tier: 'bronze' as const
      }]);
      if (statsError) {
        console.error('Stats creation error:', statsError);
        // Don't throw here as the profile was created successfully
      }

      // Handle referral if provided
      if (formData.referred_by_code.trim()) {
        const {
          data: referrer
        } = await supabase.from('profiles').select('id').eq('referral_code', formData.referred_by_code.trim()).single();
        if (referrer) {
          // Create referral record
          await supabase.from('referrals').insert([{
            referrer_id: referrer.id,
            referred_id: profile.id,
            referral_code: formData.referred_by_code.trim()
          }]);

          // Create referral rewards for both users
          await supabase.from('rewards').insert([{
            customer_id: referrer.id,
            reward_type: 'referral',
            reward_title: 'Referral Reward',
            reward_description: `Thank you for referring ${formData.full_name}!`,
            is_referral_reward: true
          }, {
            customer_id: profile.id,
            reward_type: 'referral',
            reward_title: 'Welcome Referral Bonus',
            reward_description: 'Welcome bonus for joining through a referral!',
            is_referral_reward: true
          }]);
        }
      }

      // Reset form
      setFormData({
        full_name: "",
        email: "",
        phone_number: "",
        referred_by_code: ""
      });
      setBirthday(undefined);
      toast({
        title: "Customer added successfully",
        description: `${formData.full_name} has been registered in the loyalty program.`
      });
      onCustomerAdded?.();
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return <Card>
      
      
    </Card>;
};