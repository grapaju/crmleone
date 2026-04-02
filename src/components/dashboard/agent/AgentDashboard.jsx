import React, { useState, useMemo, useEffect } from "react";
import Sparkline from "./Sparkline";
import KPI from "../KPI";
import ActivityKanbanBoard from "../kanban/ActivityKanbanBoard";
import SuggestionList from "./SuggestionList";
import QuickScheduleModal from "./QuickScheduleModal";
import HotLeads from "../HotLeads";
// Novos painéis
import LeadPanorama from "./LeadPanorama";
import { LeadPanoramaCard } from "@/components/leads/LeadPanoramaCard";
import PerformancePanel from "./PerformancePanel";
import AvailablePropertiesPanel from "./AvailablePropertiesPanel";
import IntelligentRecommendationsPanel from "./IntelligentRecommendationsPanel";
import WhatsAppSendModal from "@/components/communications/WhatsAppSendModal";
import { generateRecommendations } from "@/lib/recommendationEngine";
import {
  fetchPerformanceHistory,
  mergeHistoryIntoMetrics,
} from "../../../services/performanceService";

// Dashboard do agente: foco em atividades (Kanban) e leads quentes
export default function AgentDashboard({
  user,
  stats = [],
  kanbanActivities = [],
  onKanbanStatusChange,
  stalledDeals = [],
  nextActions = [],
  suggestions = [],
  onSuggestionSchedule,
  onSuggestionSnooze,
  onSuggestionIgnore,
  onSuggestionResetAll,
  hiddenSuggestionCount = 0,
  leads = [],
  loading = false,
  error = null,
  pendingAppointments = [],
  /** Variante visual:
   * - 'default' (layout original)
   * - 'twoColumns' (layout 2 colunas existente)
   * - 'priorities' (novo fluxo: Panorama Leads -> Sugestões -> Kanban -> Performance -> Imóveis -> Recomendações)
   */
  layoutVariant = "default",
  /** Metas de performance (mensal) para painel de Performance */
  performanceGoals = {},
  /** Métricas atuais agregadas para painel de Performance */
  performanceMetrics = {},
  /** Lista de imóveis disponíveis (reduzida) para painel Imóveis */
  propertiesAvailable = [],
  /** Recomendações inteligentes (protótipo) */
  recommendations = [],
}) {
  // Estado modal WhatsApp (stub de envio)
  const [whatsModalOpen, setWhatsModalOpen] = useState(false);
  const [whatsContext, setWhatsContext] = useState({});
  // Fallback: gerar recomendações locais se não vieram por props e houver dados suficientes
  const autoRecommendations = useMemo(() => {
    if (recommendations && recommendations.length > 0) return recommendations;
    try {
      if (
        (leads || []).length === 0 ||
        (propertiesAvailable || []).length === 0
      )
        return [];
      return generateRecommendations({
        leads,
        properties: propertiesAvailable,
        max: 12,
      });
    } catch (e) {
      return [];
    }
  }, [recommendations, leads, propertiesAvailable]);
  // Filtros persistentes
  const [statusFilter, setStatusFilter] = useState(() => {
    try {
      return localStorage.getItem("crm_dashboard_statusFilter") || "all";
    } catch {
      return "all";
    }
  });
  const [originFilter, setOriginFilter] = useState(() => {
    try {
      return localStorage.getItem("crm_dashboard_originFilter") || "all";
    } catch {
      return "all";
    }
  });
  const [search, setSearch] = useState(() => {
    try {
      return localStorage.getItem("crm_dashboard_search") || "";
    } catch {
      return "";
    }
  });

  // Persist mudanças de filtros
  useEffect(() => {
    try {
      localStorage.setItem("crm_dashboard_statusFilter", statusFilter);
    } catch {}
  }, [statusFilter]);
  useEffect(() => {
    try {
      localStorage.setItem("crm_dashboard_originFilter", originFilter);
    } catch {}
  }, [originFilter]);
  useEffect(() => {
    try {
      localStorage.setItem("crm_dashboard_search", search);
    } catch {}
  }, [search]);

  // Enriquecer atividades com origem detectada (sem mutar prop original)
  const activitiesWithOrigin = useMemo(() => {
    return (kanbanActivities || []).map((a) => {
      const txt = `${a.title || ""} ${a.label || ""} ${
        a.description || ""
      }`.toLowerCase();
      // Heurística simples: contém 'gerado por dica' ou flag explicita suggestionOrigin
      const isFromSuggestion =
        a.isFromSuggestion || txt.includes("gerado por dica");
      return { ...a, origin: isFromSuggestion ? "dica" : "manual" };
    });
  }, [kanbanActivities]);

  const filteredActivities = useMemo(() => {
    return (activitiesWithOrigin || []).filter((a) => {
      if (statusFilter !== "all") {
        if (statusFilter === "scheduled" && a.status !== "scheduled")
          return false;
        if (statusFilter === "done" && a.status !== "done") return false;
        if (statusFilter === "naorealizado") {
          if (
            ![
              "nao_realizado",
              "não realizado",
              "nao realizado",
              "cancelado",
              "cancelada",
              "missed",
            ].includes((a.status || "").toLowerCase())
          )
            return false;
        }
      }
      if (originFilter !== "all") {
        if (a.origin !== originFilter) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const hay = `${a.leadName || ""} ${a.propertyName || ""} ${
          a.type || ""
        } ${a.label || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [activitiesWithOrigin, statusFilter, originFilter, search]);

  // Notificações automáticas para atrasados (evitar spam mantendo memória em sessionStorage)
  useEffect(() => {
    try {
      const key = "crm_overdue_notified_ids";
      const raw = sessionStorage.getItem(key);
      const notified = raw ? JSON.parse(raw) : {};
      const now = Date.now();
      const updated = { ...notified };
      (kanbanActivities || []).forEach((a) => {
        if (
          a.status === "scheduled" &&
          typeof a.overdueMinutes === "number" &&
          a.overdueMinutes >= 1
        ) {
          if (!updated[a.id]) {
            // Dispara toast via simples alert fallback (poderia usar NotificationContext se disponível por prop)
            try {
              console.log("[OVERDUE]", a.id, a.leadName);
            } catch {}
            // Marcar como notificado
            updated[a.id] = now;
          }
        }
      });
      sessionStorage.setItem(key, JSON.stringify(updated));
    } catch (_) {}
  }, [kanbanActivities]);

  // Quick schedule modal state
  const [quickSuggestion, setQuickSuggestion] = useState(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const handleSchedule = (s) => {
    setQuickSuggestion(s);
    setQuickOpen(true);
  };
  const handleCreated = (appointment, suggestion) => {
    // Ao criar, podemos chamar onSuggestionIgnore para remover da lista
    if (onSuggestionIgnore) onSuggestionIgnore(suggestion);
  };

  // Wrapper para tratar 'reschedule' vindo dos botões rápidos
  const handleKanbanStatusChange = (activity, newStatus, extra) => {
    try {
      console.debug("[AGENT DASH WRAPPER]", {
        activityId: activity?.id,
        newStatus,
        extra,
      });
    } catch (_) {}
    if (newStatus === "reschedule" && extra && extra.addDays) {
      // Calcula nova data adicionando dias sobre start/nextActionDate
      const baseDateStr =
        activity.start || activity.date || activity.nextActionDate;
      if (!baseDateStr) {
        // Se não houver base, apenas ignora
        return;
      }
      const base = new Date(baseDateStr);
      if (isNaN(base.getTime())) return;
      const newDate = new Date(base.getTime() + extra.addDays * 86400000);
      // Passamos um payload padronizado para o callback externo atualizar backend
      if (onKanbanStatusChange) {
        onKanbanStatusChange(activity, "scheduled", {
          rescheduled: true,
          oldDate: baseDateStr,
          newDate: newDate.toISOString(),
          addDays: extra.addDays,
        });
      }
      return;
    }
    // Fluxo normal
    onKanbanStatusChange && onKanbanStatusChange(activity, newStatus, extra);
  };
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-800/60 rounded w-1/2" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-800/40 rounded" />
          ))}
        </div>
        <div className="h-96 bg-slate-800/40 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-900/40 border border-red-700 rounded text-red-200">
        Ocorreu um erro ao carregar suas atividades: {error}
      </div>
    );
  }

  const hotLeadCount = leads.filter((l) => l.score >= 80).length;
  const pendingCount = pendingAppointments.filter(
    (a) => (a.status || "").toLowerCase() === "pendente"
  ).length;
  // Métricas adicionais
  const nowTs = Date.now();
  const scheduledActivities = (kanbanActivities || []).filter(
    (a) => a.status === "scheduled"
  );
  const overdueCount = scheduledActivities.filter(
    (a) => typeof a.overdueMinutes === "number" && a.overdueMinutes >= 1
  ).length;
  const nextAppt =
    scheduledActivities
      .filter(
        (a) => typeof a.timeLeftMinutes === "number" && a.timeLeftMinutes >= 0
      )
      .sort((a, b) => a.timeLeftMinutes - b.timeLeftMinutes)[0] || null;
  // Taxa de início no horário (usa localStorage started vs horário) - simples aproximação
  let onTimeRate = null;
  try {
    const raw = localStorage.getItem("crm_started_appointments");
    const startedMap = raw ? JSON.parse(raw) : {};
    let total = 0;
    let ontime = 0;
    (pendingAppointments || []).forEach((ap) => {
      const sid = startedMap[ap.id];
      if (sid) {
        total += 1;
        const startPlanned = ap.start ? new Date(ap.start).getTime() : null;
        const startReal = new Date(sid).getTime();
        if (startPlanned && Math.abs(startReal - startPlanned) <= 5 * 60000)
          ontime += 1; // dentro de 5 min
      }
    });
    if (total > 0) onTimeRate = Math.round((ontime / total) * 100);
  } catch (_) {
    // ignora erros de localStorage
  }
  // (Módulo de tendências removido para simplificar o dashboard.)

  // Classe base de "card" reutilizável com design melhorado
  const cardBase =
    "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 rounded-2xl shadow-xl backdrop-blur-sm hover:shadow-2xl transition-all duration-300 hover:border-slate-600/60";
  const cardPad = "p-6"; // Padding aumentado para melhor espaçamento

  // Blocos modularizados para reutilizar entre variantes
  const ResumoOperacionalCard = (
    <div
      className={`${cardBase} ${cardPad} space-y-6 relative overflow-hidden`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5"></div>
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Resumo Operacional
              </h2>
              <p className="text-slate-400 text-sm">
                Status atual e próximas ações
              </p>
            </div>
          </div>
          {overdueCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="relative inline-flex">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500/40"></span>
                <span className="relative inline-flex rounded-full bg-gradient-to-r from-red-500 to-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {overdueCount} atrasado{overdueCount > 1 ? "s" : ""}
                </span>
              </span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <div
            className="bg-gradient-to-br from-slate-900/60 to-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex flex-col hover:border-slate-600/60 transition-all group"
            title="Total de compromissos futuros ainda não iniciados."
          >
            <span className="text-slate-400 text-xs font-medium mb-2">
              Agendados
            </span>
            <span className="text-2xl font-bold text-white leading-none group-hover:text-blue-300 transition-colors">
              {scheduledActivities.length}
            </span>
          </div>
          <div
            className="bg-gradient-to-br from-red-900/40 to-red-800/40 border border-red-700/50 rounded-xl p-4 flex flex-col hover:border-red-600/60 transition-all group"
            title="Agendados cujo horário já passou e ainda não foram iniciados."
          >
            <span className="text-red-300 text-xs font-medium mb-2">
              Atrasados
            </span>
            <span className="text-2xl font-bold text-red-400 leading-none group-hover:text-red-300 transition-colors">
              {overdueCount}
            </span>
          </div>
          <div
            className="bg-gradient-to-br from-amber-900/40 to-orange-800/40 border border-amber-700/50 rounded-xl p-4 flex flex-col hover:border-amber-600/60 transition-all group"
            title="Compromissos que você já iniciou hoje."
          >
            <span className="text-amber-300 text-xs font-medium mb-2">
              Em Andamento
            </span>
            <span className="text-2xl font-bold text-amber-300 leading-none group-hover:text-amber-200 transition-colors">
              {
                (kanbanActivities || []).filter(
                  (a) => a.status === "inprogress"
                ).length
              }
            </span>
          </div>
          <div
            className="bg-gradient-to-br from-emerald-900/40 to-green-800/40 border border-emerald-700/50 rounded-xl p-4 flex flex-col hover:border-emerald-600/60 transition-all group"
            title="Total marcados como concluídos (sessão atual)."
          >
            <span className="text-emerald-300 text-xs font-medium mb-2">
              Concluídos
            </span>
            <span className="text-2xl font-bold text-emerald-300 leading-none group-hover:text-emerald-200 transition-colors">
              {
                (kanbanActivities || []).filter((a) => a.status === "done")
                  .length
              }
            </span>
          </div>
          <div
            className="bg-gradient-to-br from-blue-900/40 to-indigo-800/40 border border-blue-700/50 rounded-xl p-4 flex flex-col hover:border-blue-600/60 transition-all group"
            title="% de compromissos iniciados até 5 min do horário previsto."
          >
            <span className="text-blue-300 text-xs font-medium mb-2">
              On-Time (%)
            </span>
            <span className="text-2xl font-bold text-blue-300 leading-none group-hover:text-blue-200 transition-colors">
              {onTimeRate !== null ? onTimeRate + "%" : "—"}
            </span>
          </div>
          <div
            className="bg-gradient-to-br from-purple-900/40 to-violet-800/40 border border-purple-700/50 rounded-xl p-4 flex flex-col hover:border-purple-600/60 transition-all group"
            title="Próximo compromisso dentro da agenda."
          >
            <span className="text-purple-300 text-xs font-medium mb-2">
              Próximo
            </span>
            <span className="text-sm font-semibold text-white truncate group-hover:text-purple-200 transition-colors">
              {nextAppt
                ? `${nextAppt.leadName || ""} em ${
                    nextAppt.timeLeftMinutes === 0
                      ? "agora"
                      : nextAppt.timeLeftMinutes < 60
                      ? nextAppt.timeLeftMinutes + " min"
                      : Math.floor(nextAppt.timeLeftMinutes / 60) + "h"
                  }`
                : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const SugestoesCard = (
    <div
      className={`${cardBase} ${cardPad} space-y-6 relative overflow-hidden`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-blue-500/5"></div>
      <div className="relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                Sugestões Inteligentes
              </h3>
              <p className="text-slate-400 text-sm">
                Próximas ações recomendadas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {suggestions.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg">
                <svg
                  className="w-4 h-4 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <span className="text-green-300 text-xs font-medium">
                  {suggestions.length} sugestão
                  {suggestions.length > 1 ? "ões" : ""}
                </span>
              </div>
            )}
            {hiddenSuggestionCount > 0 && (
              <button
                onClick={() => onSuggestionResetAll && onSuggestionResetAll()}
                className="px-4 py-2 bg-gradient-to-r from-blue-500/80 to-blue-600/80 hover:from-blue-600/80 hover:to-blue-700/80 text-white text-xs font-medium rounded-lg transition-all shadow-lg hover:shadow-xl border border-blue-400/30"
              >
                <svg
                  className="w-3 h-3 inline mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Reexibir ({hiddenSuggestionCount})
              </button>
            )}
          </div>
        </div>
        <SuggestionList
          suggestions={suggestions}
          onSchedule={(s) => {
            handleSchedule(s);
          }}
          onSnooze={onSuggestionSnooze}
          onIgnore={onSuggestionIgnore}
          onOpenLead={(leadId) => {
            if (leadId) window.location.href = `/leads/${leadId}`;
          }}
        />
      </div>
    </div>
  );

  const KanbanCard = (
    <div
      id="kanban-section"
      className={`${cardBase} ${cardPad} space-y-6 relative overflow-hidden`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-indigo-500/5"></div>
      <div className="relative">
        {/* Painel de métricas resumidas (inline acima do título) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {/* Agendados Hoje */}
          <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 flex flex-col">
            <span className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase mb-1">
              Hoje
            </span>
            <span className="text-lg font-bold text-white leading-none">
              {
                (kanbanActivities || []).filter((a) => {
                  if (
                    a.status &&
                    ["done", "concluido", "concluído"].includes(
                      (a.status || "").toLowerCase()
                    )
                  )
                    return false;
                  const d = a.start || a.date || a.nextActionDate;
                  if (!d) return false;
                  const dt = new Date(d);
                  const now = new Date();
                  return (
                    dt.getDate() === now.getDate() &&
                    dt.getMonth() === now.getMonth() &&
                    dt.getFullYear() === now.getFullYear()
                  );
                }).length
              }
            </span>
            <span className="text-[10px] text-slate-500 mt-1">Agendados</span>
          </div>
          {/* Próx 7 dias */}
          <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 flex flex-col">
            <span className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase mb-1">
              Próx 7 dias
            </span>
            <span className="text-lg font-bold text-indigo-300 leading-none">
              {
                (kanbanActivities || []).filter((a) => {
                  if (
                    a.status &&
                    ["done", "concluido", "concluído"].includes(
                      (a.status || "").toLowerCase()
                    )
                  )
                    return false;
                  const d = a.start || a.date || a.nextActionDate;
                  if (!d) return false;
                  const dt = new Date(d);
                  const now = new Date();
                  const diff = (dt.getTime() - now.getTime()) / 86400000;
                  return diff >= 0 && diff <= 7;
                }).length
              }
            </span>
            <span className="text-[10px] text-slate-500 mt-1">Agendados</span>
          </div>
          {/* Atrasados */}
          <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 flex flex-col">
            <span className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase mb-1">
              Atrasados
            </span>
            <span className="text-lg font-bold text-red-400 leading-none">
              {overdueCount}
            </span>
            <span className="text-[10px] text-slate-500 mt-1">Pendentes</span>
          </div>
          {/* Taxa de Conclusão semana */}
          <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 flex flex-col">
            <span className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase mb-1">
              Conclusão (7d)
            </span>
            <span className="text-lg font-bold text-emerald-300 leading-none">
              {(() => {
                // taxa simples: done nos últimos 7 dias / total (done + nao realizados + scheduled que tinham data nesse range)
                const now = Date.now();
                const weekAgo = now - 7 * 86400000;
                let done = 0,
                  total = 0;
                (kanbanActivities || []).forEach((a) => {
                  const st = (a.status || "").toLowerCase();
                  const d =
                    a.updatedAt ||
                    a.completedAt ||
                    a.start ||
                    a.date ||
                    a.nextActionDate;
                  if (!d) return;
                  const ts = new Date(d).getTime();
                  if (isNaN(ts) || ts < weekAgo) return;
                  if (ts > now) return;
                  if (["done", "concluido", "concluído"].includes(st)) {
                    done++;
                    total++;
                  } else if (
                    [
                      "nao_realizado",
                      "não realizado",
                      "nao realizado",
                      "cancelado",
                      "cancelada",
                      "missed",
                    ].includes(st)
                  ) {
                    total++;
                  } else {
                    total++;
                  }
                });
                if (total === 0) return "—";
                return Math.round((done / total) * 100) + "%";
              })()}
            </span>
            <span className="text-[10px] text-slate-500 mt-1">Eficiência</span>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Minhas Atividades
              </h2>
              <p className="text-slate-400 text-sm">
                Gerencie seu fluxo de trabalho
              </p>
            </div>
          </div>

          {/* Controles em linha dupla para mobile, linha única para desktop */}
          <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 items-stretch sm:items-center">
            <div className="flex gap-3 flex-1 sm:flex-initial">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 sm:flex-initial sm:w-40 bg-slate-900/80 border border-slate-600/60 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
              >
                <option value="all">Todos os Status</option>
                <option value="scheduled">📅 Agendados</option>
                <option value="naorealizado">⚠ Não Realizado</option>
                <option value="done">✅ Concluídos</option>
              </select>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar atividades..."
                className="flex-1 sm:w-64 bg-slate-900/80 border border-slate-600/60 text-slate-200 text-sm rounded-lg px-3 py-2.5 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
              />
            </div>
            {/* Filtro de origem */}
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setOriginFilter(originFilter === "dica" ? "all" : "dica")
                }
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                  originFilter === "dica"
                    ? "bg-green-600/70 border-green-500 text-white shadow"
                    : "border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white"
                }`}
                title="Mostrar apenas atividades originadas de sugestões"
              >
                Dicas
              </button>
              <button
                onClick={() =>
                  setOriginFilter(originFilter === "manual" ? "all" : "manual")
                }
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                  originFilter === "manual"
                    ? "bg-indigo-600/70 border-indigo-500 text-white shadow"
                    : "border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white"
                }`}
                title="Mostrar apenas atividades criadas manualmente"
              >
                Manuais
              </button>
            </div>

            {(search || statusFilter !== "all") && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setOriginFilter("all");
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-slate-700/80 to-slate-600/80 hover:from-slate-600/80 hover:to-slate-500/80 text-slate-300 hover:text-white text-sm rounded-lg transition-all border border-slate-600/40 hover:border-slate-500/60 font-medium"
              >
                <svg
                  className="w-4 h-4 inline mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Status count indicators */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">
              Agendados
            </span>
            <span className="text-indigo-400 font-bold">
              {
                (kanbanActivities || []).filter((a) => a.status === "scheduled")
                  .length
              }
            </span>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">
              Não Realizado
            </span>
            <span className="text-amber-400 font-bold">
              {
                (kanbanActivities || []).filter((a) =>
                  [
                    "nao_realizado",
                    "não realizado",
                    "nao realizado",
                    "cancelado",
                    "cancelada",
                    "missed",
                  ].includes((a.status || "").toLowerCase())
                ).length
              }
            </span>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">
              Concluídos
            </span>
            <span className="text-emerald-400 font-bold">
              {
                (kanbanActivities || []).filter((a) => a.status === "done")
                  .length
              }
            </span>
          </div>
        </div>

        <ActivityKanbanBoard
          activities={filteredActivities}
          onStatusChange={handleKanbanStatusChange}
        />
      </div>
    </div>
  );

  const LeadsQuentesCard = (
    <div
      className={`${cardBase} ${cardPad} space-y-6 relative overflow-hidden`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-red-500/5"></div>
      <div className="relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Leads Quentes</h3>
              <p className="text-slate-400 text-sm">
                Oportunidades prioritárias
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hotLeadCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded-lg">
                <svg
                  className="w-4 h-4 text-orange-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                  />
                </svg>
                <span className="text-orange-300 text-xs font-medium">
                  {hotLeadCount} quente{hotLeadCount > 1 ? "s" : ""}
                </span>
              </div>
            )}
            <a
              href="/leads?hot=1"
              className="px-4 py-2 bg-gradient-to-r from-orange-500/80 to-red-600/80 hover:from-orange-600/80 hover:to-red-700/80 text-white text-xs font-medium rounded-lg transition-all shadow-lg hover:shadow-xl border border-orange-400/30"
            >
              <svg
                className="w-3 h-3 inline mr-1.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
              Ver todos
            </a>
          </div>
        </div>
        <HotLeads leads={leads} compact limit={6} />
      </div>
    </div>
  );

  const RelacionamentoCard =
    stalledDeals.length > 0 || hotLeadCount > 0 ? (
      <div
        className={`${cardBase} ${cardPad} space-y-4 relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-orange-500/5"></div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-white">
              Alertas Importantes
            </h4>
          </div>
          {stalledDeals.length > 0 && (
            <div className="bg-gradient-to-r from-yellow-900/60 to-orange-900/60 border border-yellow-700/50 text-yellow-200 px-4 py-3 rounded-xl text-sm font-medium shadow-lg">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  <strong>Atenção:</strong> {stalledDeals.length} lead(s) sem
                  contato há mais de 7 dias.
                </span>
              </div>
            </div>
          )}
          {hotLeadCount > 0 && (
            <div className="bg-gradient-to-r from-red-900/60 to-pink-900/60 border border-red-700/50 text-red-200 px-4 py-3 rounded-xl text-sm font-medium shadow-lg">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                  />
                </svg>
                <span>
                  <strong>Urgente:</strong> {hotLeadCount} lead(s) quente(s)
                  aguardando ação.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    ) : null;

  // Variante 2 colunas (desktop) cria blocos lado a lado para maior dinamismo.
  // Organização (em telas xl+):
  // Linha 1: Resumo (full width)
  // Linha 2: Sugestões | Leads Quentes
  // Linha 3: Kanban | Relacionamento (tendência + alertas)
  const TwoColumnsLayout = (
    <div className="space-y-12">
      {ResumoOperacionalCard}
      {/* Linha 2: Sugestões (mais larga) + Leads Quentes */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 items-start">
        <div className="xl:col-span-2 space-y-10">{SugestoesCard}</div>
        {LeadsQuentesCard}
      </div>
      {/* Linha 3: Kanban full width acima e relacionamento abaixo lado a lado quando grande */}
      <div className="space-y-10">
        {KanbanCard}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 items-start">
          <div className="xl:col-span-2">{RelacionamentoCard}</div>
          {/* Espaço reservado para futura expansão (ex: métricas extras) ou deixar vazio */}
          <div className="hidden xl:block" aria-hidden="true"></div>
        </div>
      </div>
    </div>
  );

  // Layout padrão (refatorado com cards e melhor respiro)
  const DefaultLayout = (
    <div className="space-y-12">
      <div className="flex flex-col xl:flex-row gap-12 items-start">
        <div className="flex-1 min-w-0 space-y-12">
          {ResumoOperacionalCard}
          {SugestoesCard}
        </div>
        <div className="w-full xl:w-[400px] space-y-10 flex-shrink-0">
          {RelacionamentoCard}
          {LeadsQuentesCard}
        </div>
      </div>
      {/* Kanban agora full width abaixo das duas colunas */}
      {KanbanCard}
    </div>
  );

  // Novo layout PRIORITIES
  const PrioritiesLayout = (
    <div className="space-y-12">
      {/* 1. Panorama de Leads */}
      <LeadPanoramaCard
        limit={12}
        initialOnlyPrioritary={true}
        agentId={user?.id || user?.agent_id || user?.usuario_id}
        onOpenLead={(lead) => {
          const id = lead?.id || lead;
          if (id) window.location.href = `/leads/${id}`;
        }}
      />
      {/* 3. Kanban Minhas Atividades */}
      {KanbanCard}
      {/* 4. Imóveis Disponíveis + 5. Recomendações Inteligentes (lado a lado) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-start">
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
          <AvailablePropertiesPanel
            properties={propertiesAvailable}
            onSelectProperty={(id) => {
              if (id) window.location.href = `/properties/${id}`;
            }}
            onSendWhatsApp={(propertyId) => {
              setWhatsContext({ propertyIds: [propertyId] });
              setWhatsModalOpen(true);
            }}
          />
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
          <IntelligentRecommendationsPanel
            recommendations={autoRecommendations}
            resolveLeadName={(id) =>
              leads.find((l) => String(l.id) === String(id))?.name ||
              "Lead " + id
            }
            resolvePropertyTitle={(id) =>
              propertiesAvailable.find((p) => String(p.id) === String(id))
                ?.title || "Imóvel " + id
            }
            onSelectRecommendation={(r) => {
              if (r?.leadId) window.location.href = `/leads/${r.leadId}`;
            }}
            onSendWhatsApp={(rec) => {
              if (!rec) return;
              setWhatsContext({
                recommendation: rec,
                leadId: rec.leadId,
                propertyIds: rec.propertyId ? [rec.propertyId] : [],
              });
              setWhatsModalOpen(true);
            }}
          />
        </div>
      </div>
      {/* 6. Metas & Performance */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
        <PerformancePanel
          goals={performanceGoals}
          metrics={performanceMetrics}
        />
      </div>
      {/* 7. Relacionamento / Alertas */}
      <div>{RelacionamentoCard}</div>
    </div>
  );

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Olá, {user?.name}
        </h1>
        <p className="text-slate-400 text-sm md:text-base">
          Sua área de execução: priorize atividades e converta oportunidades.
        </p>
      </header>

      {layoutVariant === "priorities"
        ? PrioritiesLayout
        : layoutVariant === "twoColumns"
        ? TwoColumnsLayout
        : DefaultLayout}

      <QuickScheduleModal
        open={quickOpen}
        suggestion={quickSuggestion}
        onClose={() => setQuickOpen(false)}
        onCreated={handleCreated}
      />
      <WhatsAppSendModal
        open={whatsModalOpen}
        onClose={() => setWhatsModalOpen(false)}
        context={whatsContext}
        resolveLeadName={(id) =>
          leads.find((l) => String(l.id) === String(id))?.name || ""
        }
        resolvePropertyTitle={(id) =>
          propertiesAvailable.find((p) => String(p.id) === String(id))?.title ||
          "Imóvel " + id
        }
        onSuccess={(res) => {
          try {
            console.log("[WHATSAPP SUCESSO]", res);
          } catch (_) {}
        }}
      />
    </div>
  );
}
