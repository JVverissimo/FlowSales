import { useEffect, useState } from "react";

export type AccessProfile = "Gestor" | "SDR" | "Usuário Meetime";
export type Module = "DIALER" | "FLOW";

export interface CompanyUser {
  id: string;
  nome: string;
  email: string;
  papel: AccessProfile;
  modulos: Module[];
  criadoEm: string;
}

const KEY = "flowsales:company-users";

function read(): CompanyUser[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function write(users: CompanyUser[]) {
  localStorage.setItem(KEY, JSON.stringify(users));
  window.dispatchEvent(new Event("flowsales:users-updated"));
}

export function useCompanyUsers() {
  const [users, setUsers] = useState<CompanyUser[]>(read);

  useEffect(() => {
    const sync = () => setUsers(read());
    window.addEventListener("flowsales:users-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("flowsales:users-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return {
    users,
    add: (u: Omit<CompanyUser, "id" | "criadoEm">) => {
      const novo: CompanyUser = { ...u, id: crypto.randomUUID(), criadoEm: new Date().toISOString() };
      write([...read(), novo]);
    },
    update: (id: string, patch: Partial<CompanyUser>) => {
      write(read().map(u => u.id === id ? { ...u, ...patch } : u));
    },
    remove: (id: string) => write(read().filter(u => u.id !== id)),
  };
}
