import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Target, Inbox } from "lucide-react";
import { useCadences } from "@/lib/cadences-store";
import { useGoals, CadenceGoal, emptyCadenceGoal } from "@/lib/goals";
import { toast } from "sonner";

export function EditGoalsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { goals, saveAll } = useGoals();
  const { cadences } = useCadences();
  const [draft, setDraft] = useState<Record<string, CadenceGoal>>({});
  const [globalRate, setGlobalRate] = useState(20);

  useEffect(() => {
    if (!open) return;
    const initial: Record<string, CadenceGoal> = {};
    cadences.forEach(c => {
      initial[c.id] = goals.cadences[c.id] ?? emptyCadenceGoal(c.id);
    });
    setDraft(initial);
    setGlobalRate(goals.globalConversionRate);
  }, [open, goals]);

  const updateField = (cadenceId: string, field: keyof CadenceGoal, value: number) => {
    setDraft(prev => ({ ...prev, [cadenceId]: { ...prev[cadenceId], [field]: value } }));
  };

  const handleSave = () => {
    saveAll({ cadences: draft, globalConversionRate: globalRate });
    toast.success("Metas atualizadas!");
    onOpenChange(false);
  };

  // Aggregated totals preview
  const totals = Object.values(draft).reduce(
    (acc, g) => ({
      opportunities: acc.opportunities + (g.opportunities || 0),
      finishedLeads: acc.finishedLeads + (g.finishedLeads || 0),
      activities: acc.activities + (g.activities || 0),
    }),
    { opportunities: 0, finishedLeads: 0, activities: 0 }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" />Editar metas</DialogTitle>
          <DialogDescription>
            Defina metas individuais por cadência. Os totais agregados aparecem no Dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Global aggregate preview */}
          <Card className="p-4 bg-muted/40 border-dashed">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Oportunidades</p>
                <p className="text-2xl font-bold">{totals.opportunities}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Leads Finalizados</p>
                <p className="text-2xl font-bold">{totals.finishedLeads}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Atividades</p>
                <p className="text-2xl font-bold">{totals.activities}</p>
              </div>
            </div>
          </Card>

          {/* Global conversion rate target */}
          <div className="flex items-center gap-3 p-4 border border-border rounded-lg">
            <div className="flex-1">
              <Label className="text-sm font-medium">Meta global de taxa de conversão (%)</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Usada como referência geral no card de Taxa de Conversão.</p>
            </div>
            <Input
              type="number"
              min={0}
              max={100}
              value={globalRate}
              onChange={(e) => setGlobalRate(Number(e.target.value) || 0)}
              className="w-24 text-right"
            />
          </div>

          {/* Per-cadence goals */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Metas por cadência</h3>
            {cadences.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Nenhuma cadência criada ainda</p>
                <p className="text-xs text-muted-foreground mt-1">Crie uma cadência para definir metas individuais.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {cadences.map(c => {
                  const g = draft[c.id] ?? emptyCadenceGoal(c.id);
                  return (
                    <Card key={c.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-sm">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.total} leads • {c.focus.replace("_", " ")}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Field label="Oportunidades" value={g.opportunities} onChange={(v) => updateField(c.id, "opportunities", v)} />
                        <Field label="Leads finalizados" value={g.finishedLeads} onChange={(v) => updateField(c.id, "finishedLeads", v)} />
                        <Field label="Atividades" value={g.activities} onChange={(v) => updateField(c.id, "activities", v)} />
                        <Field label="Conversão (%)" value={g.conversionRate} onChange={(v) => updateField(c.id, "conversionRate", v)} max={100} />
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar metas</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, max }: { label: string; value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1 h-9"
      />
    </div>
  );
}
