import { Card } from "@/components/ui/card";
import { useLocation } from "react-router-dom";
import { Construction } from "lucide-react";

export default function Placeholder({ title }: { title?: string }) {
  const loc = useLocation();
  const t = title ?? loc.pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") ?? "Página";
  return (
    <div className="px-6 py-12 max-w-[800px] mx-auto">
      <Card className="p-12 text-center shadow-card">
        <div className="mx-auto h-16 w-16 rounded-full bg-primary-soft text-primary flex items-center justify-center mb-4">
          <Construction className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight capitalize">{t}</h1>
        <p className="text-sm text-muted-foreground mt-2">Esta tela está disponível na próxima iteração. A navegação e o design system já estão prontos para receber a UI completa.</p>
      </Card>
    </div>
  );
}
