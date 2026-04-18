import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/** Requires authentication and `profiles.role = admin` (RPCs still enforce server-side). */
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  // After bootstrap, `profile` may be null (missing row); treat as non-admin instead of spinning forever.
  if (profile?.role !== "admin") return <Navigate to="/admin/login?denied=1" replace />;

  return <>{children}</>;
};

export default AdminRoute;
