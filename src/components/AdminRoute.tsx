import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { WheelSpinner } from "@/components/ui/wheel-spinner";

/** Requires authentication and `profiles.role = admin` (RPCs still enforce server-side). */
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <WheelSpinner size="xl" />
      </div>
    );
  }

  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  // After bootstrap, `profile` may be null (missing row); treat as non-admin instead of spinning forever.
  if (profile?.role !== "admin") return <Navigate to="/admin/login?denied=1" replace />;

  return <>{children}</>;
};

export default AdminRoute;
