import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { WheelSpinner } from "@/components/ui/wheel-spinner";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <WheelSpinner size="xl" />
      </div>
    );
  }

  if (!user) {
    // Préserver le contexte YAS dans le redirect login. Sans ça, un utilisateur
    // YAS qui clique « Vendre »/« Crédits » → ProtectedRoute → /login perd les
    // params source=yas&embedded=true et sort du mode embedded (Header/Footer
    // réapparaissent, contexte cassé). Le `state.from` sert au navigate
    // post-login pour ramener l'utilisateur sur la page initialement demandée.
    const params = new URLSearchParams(location.search);
    const isYasFlow = params.get("source") === "yas" || params.get("embedded") === "true";
    const loginSearch = isYasFlow ? `?${params.toString()}` : "";
    const from = location.pathname + location.search;
    return <Navigate to={`/login${loginSearch}`} state={{ from }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
