import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { WheelSpinner } from "@/components/ui/wheel-spinner";

/**
 * Requires authentication AND a server-side admin confirmation via the
 * immonex_is_admin() RPC. Audit fix M4 (2026-04-26): the previous gate
 * relied on `profile.role === "admin"` from local state, which a user
 * could flip in DevTools to bypass UI access. RLS still blocks writes,
 * but the admin pages can SELECT/RPC and leak aggregate info — so we
 * confirm with the server before rendering.
 *
 * Fail-closed: any RPC error redirects out instead of granting access.
 */
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { data: isAdmin, isLoading: isAdminLoading, isError } = useIsAdmin();
  const location = useLocation();

  const Spinner = () => (
    <div className="min-h-screen flex items-center justify-center">
      <WheelSpinner size="xl" />
    </div>
  );

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  if (isAdminLoading) return <Spinner />;
  if (isError || !isAdmin) return <Navigate to="/admin/login?denied=1" replace />;

  return <>{children}</>;
};

export default AdminRoute;
