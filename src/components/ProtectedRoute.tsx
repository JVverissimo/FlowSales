import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children, requireGestor = false }: { children: JSX.Element; requireGestor?: boolean }) {
  const { session, loading, isGestor } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" state={{ from: location }} replace />;
  if (requireGestor && !isGestor) return <Navigate to="/" replace />;
  return children;
}
