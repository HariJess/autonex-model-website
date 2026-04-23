import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { WheelSpinner } from "@/components/ui/wheel-spinner";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <WheelSpinner size="xl" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
