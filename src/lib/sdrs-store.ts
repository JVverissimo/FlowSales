import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SdrUser {
  id: string;
  nome: string;
  email: string;
  papel: "SDR" | "Gestor";
}

/**
 * Busca todos os usuários com papel 'sdr' (e opcionalmente gestores) a partir
 * das tabelas `profiles` + `user_roles` no banco. Substitui o uso do
 * localStorage `useCompanyUsers` para listas de participantes de cadência.
 */
export function useSdrs(includeGestores = false) {
  const [users, setUsers] = useState<SdrUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const { data: roles, error: rolesErr } = await supabase
      .from("user_roles")
      .select("user_id, role");
    if (rolesErr) { console.error("fetch roles", rolesErr); setLoading(false); return; }

    const wanted = (roles ?? []).filter(r => r.role === "sdr" || (includeGestores && r.role === "gestor"));
    const ids = wanted.map(r => r.user_id);
    if (ids.length === 0) { setUsers([]); setLoading(false); return; }

    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id, nome, email")
      .in("id", ids);
    if (profErr) { console.error("fetch profiles", profErr); setLoading(false); return; }

    const roleById = new Map(wanted.map(r => [r.user_id, r.role]));
    setUsers((profiles ?? []).map(p => ({
      id: p.id,
      nome: p.nome,
      email: p.email,
      papel: roleById.get(p.id) === "gestor" ? "Gestor" : "SDR",
    })));
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeGestores]);

  return { users, loading, refresh: fetchAll };
}
