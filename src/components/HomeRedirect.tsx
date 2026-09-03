import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

/**
 * Root route resolver: everyone lands on the personal dashboard.
 */
export function HomeRedirect() {
  const { loading } = useAuth();
  if (loading) return null;
  return <Navigate to="/meu-dashboard" replace />;
}

