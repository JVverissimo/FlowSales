import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Mail, Phone, MessageSquare, Calendar, Database, Zap, Sheet as SheetIcon, Copy, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

const integrations = [
  { id: "gmail", name: "Gmail", desc: "Envio e rastreio de e-mails", icon: Mail, color: "text-red-500" },
  { id: "outlook", name: "Outlook", desc: "Sincronize sua caixa Microsoft", icon: Mail, color: "text-blue-500" },
  { id: "whatsapp", name: "WhatsApp Business", desc: "Mensagens diretas com leads", icon: MessageSquare, color: "text-green-500" },
  { id: "calendar", name: "Google Calendar", desc: "Reuniões e agendamentos", icon: Calendar, color: "text-blue-600" },
  { id: "telefonia", name: "Telefonia (VoIP)", desc: "Discador integrado", icon: Phone, color: "text-purple-500" },
  { id: "crm", name: "CRM (HubSpot/Pipedrive)", desc: "Sincronize seus negócios", icon: Database, color: "text-orange-500" },
  { id: "zapier", name: "Zapier", desc: "Automatize workflows", icon: Zap, color: "text-amber-500" },
];

export default function Integracoes() {
  const { isGestor } = useAuth();
  const [conectados, setConectados] = useState<Record<string, boolean>>({});
  const [keyInfo, setKeyInfo] = useState<{ active: boolean; masked: string; key: string | null; endpoint: string } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loadingKey, setLoadingKey] = useState(false);

  useEffect(() => {
    if (!isGestor) return;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-api-key");
        if (error) throw error;
        setKeyInfo(data);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [isGestor]);

  const handleReveal = async () => {
    if (revealed) { setRevealed(false); return; }
    setLoadingKey(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-api-key?reveal=1`;
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${session?.access_token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro");
      setKeyInfo(json);
      setRevealed(true);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível buscar a chave");
    } finally {
      setLoadingKey(false);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  const toggle = (id: string, name: string) => {
    setConectados(prev => {
      const novo = { ...prev, [id]: !prev[id] };
      toast.success(novo[id] ? `${name} conectado` : `${name} desconectado`);
      return novo;
    });
  };

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
        <p className="text-sm text-muted-foreground">Conecte ferramentas que sua equipe já usa</p>
      </div>

      {isGestor && (
        <Card className="shadow-card border-success/30">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center shrink-0 text-success">
                <SheetIcon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">Google Sheets</h3>
                  <Badge variant={keyInfo?.active ? "default" : "secondary"} className={keyInfo?.active ? "bg-success text-success-foreground" : ""}>
                    {keyInfo?.active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Receba leads automaticamente da sua planilha de tráfego.</p>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Chave de API</label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={revealed ? (keyInfo?.key ?? "") : (keyInfo?.masked ?? "carregando...")} className="font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={handleReveal} disabled={loadingKey} title={revealed ? "Ocultar" : "Revelar"}>
                      {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => keyInfo?.key && copy(keyInfo.key, "Chave")} disabled={!keyInfo?.key} title="Copiar">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  {!revealed && <p className="text-[11px] text-muted-foreground">Clique no olho para revelar a chave completa.</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">URL do endpoint</label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={keyInfo?.endpoint ?? ""} className="font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={() => keyInfo?.endpoint && copy(keyInfo.endpoint, "Endpoint")} title="Copiar">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Envie POST com header <code>Authorization: Bearer SUA_CHAVE</code></p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map(({ id, name, desc, icon: Icon, color }) => {
          const ativo = !!conectados[id];
          return (
            <Card key={id} className="hover:shadow-card transition-shadow">
              <CardContent className="p-5 flex items-start gap-4">
                <div className={`h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{name}</h3>
                    {ativo && <Badge variant="secondary" className="text-xs">Conectado</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                  <Button
                    size="sm"
                    variant={ativo ? "outline" : "default"}
                    className="mt-3"
                    onClick={() => toggle(id, name)}
                  >
                    {ativo ? "Desconectar" : "Conectar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
