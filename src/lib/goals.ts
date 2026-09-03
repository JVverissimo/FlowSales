// Lightweight goal storage (per cadence + global) persisted in localStorage.
// Keeps the platform working without a backend while still feeling real.
import { useEffect, useState } from "react";

export interface CadenceGoal {
  cadenceId: string;
  opportunities: number;
  finishedLeads: number;
  activities: number;
  conversionRate: number; // %
}

export interface GoalsState {
  cadences: Record<string, CadenceGoal>;
  globalConversionRate: number;
}

const STORAGE_KEY = "flowsales:goals";

function read(): GoalsState {
  if (typeof window === "undefined") return { cadences: {}, globalConversionRate: 20 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { cadences: {}, globalConversionRate: 20 };
    return JSON.parse(raw) as GoalsState;
  } catch {
    return { cadences: {}, globalConversionRate: 20 };
  }
}

function write(state: GoalsState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("flowsales:goals-changed"));
}

export function useGoals() {
  const [state, setState] = useState<GoalsState>(() => read());

  useEffect(() => {
    const handler = () => setState(read());
    window.addEventListener("flowsales:goals-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("flowsales:goals-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const saveCadenceGoal = (goal: CadenceGoal) => {
    const next: GoalsState = {
      ...state,
      cadences: { ...state.cadences, [goal.cadenceId]: goal },
    };
    write(next);
    setState(next);
  };

  const saveAll = (next: GoalsState) => {
    write(next);
    setState(next);
  };

  return { goals: state, saveCadenceGoal, saveAll };
}

export function emptyCadenceGoal(cadenceId: string): CadenceGoal {
  return { cadenceId, opportunities: 0, finishedLeads: 0, activities: 0, conversionRate: 0 };
}
