import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AdminAccessPanel from '@/components/AdminAccessPanel';
import { ArrowLeft } from 'lucide-react';

const AdminAccess = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="flex justify-center">
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
        
        <AdminAccessPanel />
        
        <div className="text-center text-sm text-muted-foreground">
          <p>Need to create an account? <Link to="/auth" className="text-primary hover:underline">Sign up here</Link></p>
        </div>
      </div>
    </div>
  );
};

export default AdminAccess;