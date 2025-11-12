import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useEffect } from 'react';
import { signInSchema, signUpSchema, passwordResetSchema } from '@/lib/validations';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date>();
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  
  const { signIn, signUp, user, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Validate input
    try {
      signInSchema.parse({ email, password });
    } catch (validationError: any) {
      const errorMessage = validationError.errors?.[0]?.message || "Invalid input";
      toast({
        title: "Validation Error",
        description: errorMessage,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    
    const { error } = await signIn(email, password);
    if (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Validate input
    try {
      signUpSchema.parse({
        email,
        password,
        fullName,
        phoneNumber,
        dateOfBirth: dateOfBirth ? format(dateOfBirth, 'yyyy-MM-dd') : '',
        referralCode,
      });
    } catch (validationError: any) {
      const errorMessage = validationError.errors?.[0]?.message || "Invalid input";
      toast({
        title: "Validation Error",
        description: errorMessage,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    
    const { error } = await signUp(email, password, {
      fullName,
      phoneNumber: phoneNumber || undefined,
      dateOfBirth: dateOfBirth ? format(dateOfBirth, 'yyyy-MM-dd') : undefined,
      referralCode: referralCode || undefined
    });
    
    if (error) {
      setError(error.message);
    } else {
      setError('Check your email for the confirmation link!');
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    
    // Validate email
    try {
      passwordResetSchema.parse({ email: resetEmail });
    } catch (validationError: any) {
      const errorMessage = validationError.errors?.[0]?.message || "Invalid email";
      toast({
        title: "Validation Error",
        description: errorMessage,
        variant: "destructive",
      });
      setResetLoading(false);
      return;
    }
    
    const { error } = await resetPassword(resetEmail);
    
    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset link",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "If an account exists with this email, you'll receive a password reset link. Check your spam folder if you don't see it.",
      });
      setShowForgotPassword(false);
      setResetEmail('');
    }
    
    setResetLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl sm:text-2xl">Welcome to LoyaltyLink</CardTitle>
          <CardDescription className="text-sm">Sign in to your account or create a new one</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin" className="min-h-[44px]">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="min-h-[44px]">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="min-h-[44px]"
                  />
                </div>
                <Button type="submit" className="w-full min-h-[44px]" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
                
                <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
                  <DialogTrigger asChild>
                    <Button variant="link" className="w-full" type="button">
                      Forgot Password?
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reset Your Password</DialogTitle>
                      <DialogDescription>
                        Enter your email address and we'll send you a link to reset your password. The link will expire in 1 hour.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reset-email">Email</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="Enter your email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                          className="min-h-[44px]"
                        />
                      </div>
                      <Button type="submit" className="w-full min-h-[44px]" disabled={resetLoading}>
                        {resetLoading ? 'Sending...' : 'Send Reset Link'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="Enter your phone number (optional)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal min-h-[44px]"
                        type="button"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateOfBirth ? format(dateOfBirth, "PPP") : "Select your birthdate (optional)"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center">
                      <Calendar
                        mode="single"
                        captionLayout="dropdown"
                        selected={dateOfBirth}
                        onSelect={setDateOfBirth}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        fromYear={1900}
                        toYear={new Date().getFullYear()}
                        defaultMonth={new Date(2000, 0)}
                        className="pointer-events-auto"
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referralCode">Referral Code</Label>
                  <Input
                    id="referralCode"
                    type="text"
                    placeholder="Enter referral code (optional)"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="min-h-[44px]"
                  />
                </div>
                <Button type="submit" className="w-full min-h-[44px]" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          {error && (
            <Alert className="mt-4">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;