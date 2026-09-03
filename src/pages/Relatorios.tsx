import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BarChart3, ListChecks, PhoneOff, Download } from "lucide-react";
import { toast } from "sonner";
import { useLeads } from "@/lib/leads-store";
import { useCompletions } from "@/lib/completions-store";
import { useCadences } from "@/lib/cadences-store";
import { useSdrs } from "@/lib/sdrs-store";

const csvEscape = (v: string | number | null | undefined) => {
  const s = (v ?? "").toString();
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob(["\uFEFF" + content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]) {
  return [headers.join(","), ...rows.map(r => r.map(csvEscape).join(","))].join("\n");
}

// Excel-compatible: tab-separated values open natively in Excel
function toTsv(headers: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => (v ?? "").toString().replace(/\t/g, " ").replace(/\n/g, " ");
  return [headers.map(esc).join("\t"), ...rows.map(r => r.map(esc).join("\t"))].join("\n");
}

export default function Relatorios() {
  const { leads } = useLeads();
  const { completions } = useCompletions();
  const { cadences } = useCadences();
  const { users } = useSdrs(true);

  const userName = (id: string | null | undefined) => users.find(u => u.id === id)?.nome ?? "—";
  const cadName = (id: string | null | undefined) => cadences.find(c => c.id === id)?.name ?? "—";
  const leadName = (id: string) => leads.find(l => l.id === id)?.name ?? id;

  const buildStats = () => {
    const headers = ["Usuário", "Atividades realizadas", "Atividades ignoradas", "Leads atribuídos", "Ganhos", "Perdidos", "Em prospecção"];
    const rows = users.map(u => {
      const userComp = completions.filter(c => leads.find(l => l.id === c.leadId)?.ownerId === u.id);
      const userLeads = leads.filter(l => l.ownerId === u.id);
      return [
        u.nome,
        userComp.filter(c => c.status === "done").length,
        userComp.filter(c => c.status === "skipped").length,
        userLeads.length,
        userLeads.filter(l => l.status === "won").length,
        userLeads.filter(l => l.status === "lost").length,
        userLeads.filter(l => l.status === "active").length,
      ];
    });
    return { headers, rows };
  };

  const buildExecuted = () => {
    const headers = ["Data", "Usuário", "Lead", "Cadência", "Dia", "Passo", "Atividade", "Tipo", "Status", "Notas"];
    const rows = completions.map(c => {
      const lead = leads.find(l => l.id === c.leadId);
      return [
        new Date(c.completedAt).toLocaleString("pt-BR"),
        userName(lead?.ownerId),
        leadName(c.leadId),
        cadName(c.cadenceId),
        c.dayNumber,
        c.activityIndex + 1,
        c.activityName ?? "",
        c.activityType,
        c.status === "done" ? "Realizada" : "Ignorada",
        c.notes ?? "",
      ];
    });
    return { headers, rows };
  };

  const buildDropped = () => {
    const headers = ["Data", "Usuário", "Lead", "Notas"];
    const rows = completions
      .filter(c => c.activityType === "call" && (c.notes ?? "").toLowerCase().includes("derrubad"))
      .map(c => {
        const lead = leads.find(l => l.id === c.leadId);
        return [
          new Date(c.completedAt).toLocaleString("pt-BR"),
          userName(lead?.ownerId),
          leadName(c.leadId),
          c.notes ?? "",
        ];
      });
    return { headers, rows };
  };

  const builders: Record<string, () => { headers: string[]; rows: (string | number | null | undefined)[][] }> = {
    stats: buildStats,
    executed: buildExecuted,
    dropped: buildDropped,
  };

  const handleExport = (id: string, format: "csv" | "xls") => {
    const data = builders[id]();
    if (data.rows.length === 0) { toast.error("Sem dados para exportar."); return; }
    const date = new Date().toISOString().slice(0, 10);
    if (format === "csv") {
      downloadFile(`${id}-${date}.csv`, toCsv(data.headers, data.rows), "text/csv");
    } else {
      downloadFile(`${id}-${date}.xls`, toTsv(data.headers, data.rows), "application/vnd.ms-excel");
    }
    toast.success(`${data.rows.length} linha(s) exportadas.`);
  };

  const reports = [
    {
      id: "stats", icon: BarChart3, title: "Estatísticas de Atividades",
      desc: "Compare produtividade e performance dos usuários, analisando atividades executadas, pendências, e resultados de leads (ganhos, perdidos e em andamento).",
    },
    {
      id: "executed", icon: ListChecks, title: "Atividades Executadas",
      desc: "Acompanhe todas as atividades realizadas ou ignoradas, com detalhes de horário, usuário, cadência e lead.",
    },
    {
      id: "dropped", icon: PhoneOff, title: "Ligações Derrubadas",
      desc: "Acompanhe as ligações encerradas manualmente em até 10 segundos.",
    },
  ];

  return (
    <div className="px-6 py-6 max-w-[1100px] mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Exporte dados detalhados para análise externa em planilhas.</p>
      </div>

      <Accordion type="multiple" className="space-y-3">
        {reports.map(r => {
          const Icon = r.icon;
          return (
            <AccordionItem key={r.id} value={r.id} className="border-0">
              <Card className="shadow-card overflow-hidden">
                <AccordionTrigger className="px-5 py-4 hover:no-underline">
                  <div className="flex items-start gap-4 text-left">
                    <div className="h-10 w-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{r.title}</h3>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5">
                  <p className="text-sm text-muted-foreground mb-4 ml-14">{r.desc}</p>
                  <div className="ml-14 flex gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => handleExport(r.id, "csv")}>
                      <Download className="h-4 w-4" />Exportar CSV
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => handleExport(r.id, "xls")}>
                      <Download className="h-4 w-4" />Exportar Excel
                    </Button>
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
