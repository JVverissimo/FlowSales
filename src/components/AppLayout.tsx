import { Outlet } from "react-router-dom";
import { TopNavbar } from "@/components/TopNavbar";

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNavbar />
      <main className="flex-1 animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
}
