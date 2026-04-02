import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Activity, Target, Lightbulb, Hourglass, Zap, CheckCircle2, CircleOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function LeadDetails() {
  const { id: leadId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterActivity, setFilterActivity] = useState("all");
  const [tipsView, setTipsView] = useState("ativas"); // 'ativas' | 'todas'

  useEffect(() => {
    if (!leadId) {
      setError("ID do lead não encontrado na URL.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost/v4/api/php-api-crm/public/lead-details.php?id=${leadId}`);
        if (!res.ok) throw new Error("Erro na resposta da API");
        const data = await res.json();
        setLead(data);
      } catch (err) {
        setError("Erro ao carregar detalhes do lead. " + (err?.message || ""));
      } finally {
        setLoading(false);
      }
    })();
  }, [leadId]);

  const activitiesFiltered = useMemo(() => {
    if (!lead?.activities) return [];
    if (filterActivity === 'all') return lead.activities;
    return lead.activities.filter(a => a.type === filterActivity);
  }, [lead, filterActivity]);

  const activeTips = useMemo(() => lead?.tips?.filter(t => t.ativa) || [], [lead]);
  const allTips = lead?.tips || [];
  const tipsToShow = tipsView === 'ativas' ? activeTips : allTips;

  const scoreValue = lead?.scoreDetails?.score ?? lead?.score;
  const scoreComponents = lead?.scoreDetails?.components || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Carregando detalhes do lead...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <div className="p-6 rounded-lg border border-red-500/30 bg-red-900/10 text-red-300">
          {error}
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <div className="p-6 rounded-lg border border-slate-700 bg-slate-800/40 text-slate-300">
          Nenhum dado encontrado.
        </div>
      </div>
    );
  }

  const toggleTip = async (tip) => {
    // Estado otimista
    const previous = lead.tips;
    const newActive = !tip.ativa;
    setLead(l => ({
      ...l,
      tips: l.tips.map(t => t.id === tip.id ? { ...t, ativa: newActive } : t)
    }));

    try {
      const res = await fetch(`/api/lead-tip-toggle.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: Number(leadId), tipId: tip.id, ativa: newActive }),
      });
      const data = await res.json().catch(() => ({ success: false }));
      if (!res.ok || data.success !== true) {
        throw new Error(data.error || 'Falha ao atualizar');
      }
      toast({
        title: newActive ? "Dica ativada" : "Dica desativada",
        description: tip.description,
      });
    } catch (e) {
      // Rollback
      setLead(l => ({ ...l, tips: previous }));
      toast({
        title: "Erro ao alternar dica",
        description: e.message || 'Tente novamente',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/leads')} className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">{lead.name}</h1>
              <p className="text-slate-400">Detalhes do lead</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/leads/edit/${lead.id}`}>
            <Button variant="outline" className="border-slate-600 hover:bg-slate-700/50">Editar</Button>
          </Link>
          {/* Placeholder para ação futura */}
          <Button variant="outline" className="border-slate-600 text-red-400 hover:bg-red-600/20">Arquivar</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Score */}
          <div className="p-6 rounded-xl border border-slate-700 bg-slate-800/60 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Score & Engajamento</h2>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-blue-400 leading-none">{scoreValue}</span>
                <p className="text-xs text-slate-400">pontuação atual</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {scoreComponents.map((c, i) => (
                <div key={i} className="flex items-start justify-between p-3 rounded-lg bg-slate-900/40 border border-slate-700">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{c.label}</p>
                    <p className="text-xs text-slate-500">Contribuição</p>
                  </div>
                  <span className="text-sm font-semibold text-blue-400">+{c.value}</span>
                </div>
              ))}
              {scoreComponents.length === 0 && (
                <div className="col-span-full text-sm text-slate-500">Sem componentes detalhados.</div>
              )}
            </div>
          </div>

          {/* Atividades */}
            <div className="p-6 rounded-xl border border-slate-700 bg-slate-800/60 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-green-400" />
                  <h2 className="text-lg font-semibold text-white">Atividades</h2>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <select
                    value={filterActivity}
                    onChange={(e) => setFilterActivity(e.target.value)}
                    className="bg-slate-900/60 border border-slate-600 rounded-md px-2 py-1 text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">Todas</option>
                    {/* Sugestão: dinamicamente gerar tipos */}
                    {[...new Set(lead.activities?.map(a => a.type))].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <ul className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {activitiesFiltered.map((a, i) => (
                  <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/40 border border-slate-700">
                    <div className="mt-0.5">
                      <Hourglass className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-200">{a.type} - {a.description}</p>
                      <p className="text-[11px] text-slate-500 mt-1">{a.created_at}</p>
                    </div>
                  </li>
                ))}
                {activitiesFiltered.length === 0 && (
                  <li className="text-sm text-slate-500">Nenhuma atividade.</li>
                )}
              </ul>
            </div>

          {/* Dicas */}
          <div className="p-6 rounded-xl border border-slate-700 bg-slate-800/60 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-white">Dicas & Ações Sugeridas</h2>
              </div>
              <div className="flex gap-2 text-xs">
                <Button variant={tipsView === 'ativas' ? 'default' : 'outline'} size="sm" onClick={() => setTipsView('ativas')}>
                  Ativas
                </Button>
                <Button variant={tipsView === 'todas' ? 'default' : 'outline'} size="sm" onClick={() => setTipsView('todas')}>
                  Todas
                </Button>
              </div>
            </div>
            <ul className="space-y-3">
              {tipsToShow.map((tip) => {
                // Normalização defensiva da prioridade (pode vir número, null, objeto, etc.)
                let rawPriority = tip.priority;
                if (rawPriority && typeof rawPriority === 'object') {
                  if ('value' in rawPriority) rawPriority = rawPriority.value; // Ex: { value: 'Alta' }
                  else if ('label' in rawPriority) rawPriority = rawPriority.label; // Ex: { label: 'Alta' }
                }
                const priorityKey = typeof rawPriority === 'string'
                  ? rawPriority.trim().toLowerCase()
                  : String(rawPriority ?? '').trim().toLowerCase();
                const priorityColor = {
                  alta: 'text-red-400 border-red-500/30',
                  altaa: 'text-red-400 border-red-500/30', // tolerância a erros ortográficos
                  media: 'text-amber-400 border-amber-500/30',
                  média: 'text-amber-400 border-amber-500/30',
                  baixa: 'text-green-400 border-green-500/30'
                }[priorityKey] || 'text-slate-300 border-slate-600';
                return (
                  <li key={tip.id} className={`p-4 rounded-lg bg-slate-900/40 border ${priorityColor} flex flex-col gap-2`}> 
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {tip.ativa ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <CircleOff className="w-4 h-4 text-slate-500" />}
                        <span className="font-medium text-slate-200">{tip.category}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300">{tip.type}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300">Prioridade: {tip.priority}</span>
                      </div>
                      <Button
                        variant={tip.ativa ? 'outline' : 'default'}
                        size="sm"
                        className={tip.ativa ? 'border-slate-600 text-slate-300' : ''}
                        onClick={() => toggleTip(tip)}
                      >
                        {tip.ativa ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
                    <p className={`text-sm ${tip.ativa ? 'text-slate-300' : 'text-slate-500 line-through'}`}>{tip.description}</p>
                  </li>
                );
              })}
              {tipsToShow.length === 0 && (
                <li className="text-sm text-slate-500">Nenhuma dica para exibir.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-slate-700 bg-slate-800/60 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-white mb-4">Resumo Rápido</h2>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><span className="text-slate-500">Status:</span> <span className="font-medium text-white">{lead.status}</span></li>
              <li><span className="text-slate-500">Score:</span> <span className="font-medium text-white">{scoreValue}</span></li>
              <li><span className="text-slate-500">Dicas Ativas:</span> {activeTips.length}</li>
              <li><span className="text-slate-500">Total Atividades:</span> {lead.activities?.length || 0}</li>
            </ul>
            <div className="mt-4">
              <p className="text-xs text-slate-500 mb-2">Ação sugerida imediata</p>
              {activeTips[0] ? (
                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700 text-xs text-slate-300 flex items-start gap-2">
                  <Zap className="w-4 h-4 text-amber-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-200 mb-1">{activeTips[0].category}</p>
                    <p>{activeTips[0].description}</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700 text-xs text-slate-500">Sem ações imediatas.</div>
              )}
            </div>
          </div>

          <div className="p-6 rounded-xl border border-slate-700 bg-slate-800/60 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-white mb-4">Próximos Passos</h2>
            <ol className="list-decimal ml-5 space-y-2 text-sm text-slate-300">
              {activeTips.slice(0,3).map(t => (
                <li key={t.id}>{t.description}</li>
              ))}
              {activeTips.length === 0 && <li className="text-slate-500 list-none">Nenhum passo definido.</li>}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
