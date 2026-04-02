import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Edit, Save, X, Loader2 } from "lucide-react";
import UnitForm from "./UnitForm";
import { useToast } from "@/components/ui/use-toast";
import { towerService } from "@/services/towerService";
import { unitService } from "@/services/unitService";
import { cubService } from "@/services/cubService";
import { useEffect, useState } from "react";
import { useTowerPreview } from "@/hooks/useTowerPreview";

const ProjectFormTowers = ({
  towers = [],
  onTowersChange,
  projectType,
  units = [],
  onUnitsChange,
  projectId,
}) => {
  const { toast } = useToast();
  const [savingTowerId, setSavingTowerId] = useState(null);
  const [deletingTowerId, setDeletingTowerId] = useState(null);
  const [deletingUnitId, setDeletingUnitId] = useState(null);

  const handleAddTower = () => {
    const tempId = `new_${Date.now()}`;
    const newTower = {
      id: tempId,
      name: `Torre ${String.fromCharCode(65 + towers.length)}`,
      floors: "",
      unitsPerFloor: "",
      initialFloor: 1,
      initialUnitStart: "101",
      _dirty: true,
    };
    onTowersChange([...towers, newTower]);
  };

  const handleRemoveTower = (id) => {
    onTowersChange(towers.filter((t) => t.id !== id));
  };

  const handleTowerInputChange = (id, field, value) => {
    onTowersChange(
      towers.map((t) =>
        t.id === id ? { ...t, [field]: value, _dirty: true } : t
      )
    );
  };

  const handleSaveTower = async (tower) => {
    if (!projectId) {
      toast({
        title: "⚠️ Salve o projeto primeiro",
        description: "As torres só podem ser salvas após o projeto existir.",
        variant: "destructive",
      });
      return;
    }
    setSavingTowerId(tower.id);
    try {
      const payload = { ...tower, project_id: projectId };
      if (String(tower.id).startsWith("new_")) delete payload.id;
      const saved = await towerService.saveTower(payload);
      const savedTower = saved && saved.data ? saved.data : saved;
      const finalTower = { ...tower, ...savedTower, _dirty: false };
      if (savedTower && savedTower.id) finalTower.id = savedTower.id;
      // update towers in parent
      onTowersChange(towers.map((t) => (t.id === tower.id ? finalTower : t)));

      // save units that belong to this tower (matching torre_id)
      const relatedUnits = units.filter(
        (u) =>
          String(u.torre_id) === String(tower.id) || u.torre_id === tower.id
      );
      if (relatedUnits.length > 0) {
        const updatedUnits = [...units];
        for (const unit of relatedUnits) {
          try {
            const unitPayload = {
              ...unit,
              torre_id: finalTower.id,
              obra_id: projectId,
            };
            if (String(unit.id).startsWith("new_")) delete unitPayload.id;
            const savedUnitRes = await unitService.saveUnit(unitPayload);
            const savedUnit =
              savedUnitRes && savedUnitRes.data
                ? savedUnitRes.data
                : savedUnitRes;
            const finalUnit = { ...unit, ...normalizeUnit(savedUnit) };
            // replace in updatedUnits
            const idx = updatedUnits.findIndex((u) => u.id === unit.id);
            if (idx !== -1) updatedUnits[idx] = finalUnit;
          } catch (ue) {
            // continue but notify
            toast({
              title: "⚠️ Erro ao salvar unidade",
              description: ue.message || String(ue),
              variant: "destructive",
            });
          }
        }
        onUnitsChange(updatedUnits);
      }

      toast({
        title: "✅ Torre salva",
        description: finalTower.name || "Torre salva com sucesso.",
      });
    } catch (e) {
      toast({
        title: "❌ Erro",
        description: e.message || "Erro ao salvar torre",
        variant: "destructive",
      });
    } finally {
      setSavingTowerId(null);
    }
  };

  const handleDeleteTower = async (tower) => {
    const ok = window.confirm(
      `Confirma remo\u00e7\u00e3o da torre "${tower.name}"? Esta a\u00e7\u00e3o n\u00e3o pode ser desfeita.`
    );
    if (!ok) return;

    // if it's a newly created local tower (temp id), just remove locally
    if (String(tower.id).startsWith("new_")) {
      onTowersChange(towers.filter((t) => t.id !== tower.id));
      return;
    }

    setDeletingTowerId(tower.id);
    try {
      await towerService.deleteTower(tower.id);
      onTowersChange(towers.filter((t) => t.id !== tower.id));
      // also remove units belonging to this tower
      onUnitsChange(
        units.filter((u) => String(u.torre_id) !== String(tower.id))
      );
      toast({
        title: "🗑️ Torre removida",
        description: tower.name || "Torre removida com sucesso.",
      });
    } catch (e) {
      toast({
        title: "❌ Erro",
        description: e.message || "Erro ao remover torre",
        variant: "destructive",
      });
    } finally {
      setDeletingTowerId(null);
    }
  };

  // normalize unit object returned by API to frontend shape
  function normalizeUnit(u) {
    if (!u || typeof u !== "object") return u;
    return {
      id: u.id ?? u.ID ?? u.unit_id ?? null,
      obra_id: u.obra_id ?? u.project_id ?? u.projectId ?? u.project_id ?? null,
      project_id: u.project_id ?? u.obra_id ?? null,
      torre_id: u.torre_id ?? u.tower_id ?? u.torreId ?? null,
      unit_number: u.unit_number ?? u.numero_unidade ?? u.unitNumber ?? null,
      numero_unidade: u.numero_unidade ?? u.unit_number ?? u.unitNumber ?? null,
      pavimento: u.pavimento ?? u.floor ?? null,
      floor: u.floor ?? u.pavimento ?? null,
      tipo: u.tipo ?? u.type ?? null,
      type: u.type ?? u.tipo ?? null,
      area_privativa: u.area_privativa ?? u.area_private ?? null,
      area_private: u.area_private ?? u.area_privativa ?? null,
      area_total: u.area_total ?? null,
      status_venda: u.status_venda ?? u.sale_status ?? null,
      sale_status: u.sale_status ?? u.status_venda ?? null,
      valor: u.valor ?? u.price ?? null,
      price: u.price ?? u.valor ?? null,
      caracteristicas_especificas:
        u.caracteristicas_especificas ?? u.specific_features ?? null,
      specific_features:
        u.specific_features ?? u.caracteristicas_especificas ?? null,
      ...u,
    };
  }

  // load towers and units when projectId is provided (edit mode)
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      let towersData = [];
      try {
        const remoteTowers = await towerService.getTowersByProject(projectId);
        towersData =
          remoteTowers && remoteTowers.data ? remoteTowers.data : remoteTowers;
        if (Array.isArray(towersData)) onTowersChange(towersData);
      } catch (e) {
        // ignore quietly but notify
        toast({
          title: "⚠️ Não foi possível carregar torres",
          description: e.message || String(e),
          variant: "destructive",
        });
      }

      // only load units if we actually have towers for this project
      if (Array.isArray(towersData) && towersData.length > 0) {
        try {
          const remoteUnits = await unitService.getUnitsByProject(projectId);
          const unitsData =
            remoteUnits && remoteUnits.data ? remoteUnits.data : remoteUnits;
          if (Array.isArray(unitsData)) {
            // normalize units so frontend can use expected keys
            const normalized = unitsData.map((u) => normalizeUnit(u));
            onUnitsChange(normalized);
          }
        } catch (e) {
          // ignore quietly but notify
          toast({
            title: "⚠️ Não foi possível carregar unidades",
            description: e.message || String(e),
            variant: "destructive",
          });
        }
      } else {
        // ensure units list is empty when there are no towers
        onUnitsChange([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleAddUnit = (towerId) => {
    const currentUnits = Array.isArray(units) ? units : [];
    const newUnit = {
      id: `new_${Date.now()}`,
      obra_id: null,
      torre_id: towerId,
      numero_unidade: "",
      pavimento: "",
      tipo: "",
      area_privativa: "",
      area_total: "",
      status_venda: "disponível",
      valor: "",
      caracteristicas_especificas: "",
      isEditing: true,
    };
    onUnitsChange([...currentUnits, newUnit]);
  };

  const handleUnitChange = (unitData) => {
    // update local immediately
    onUnitsChange(units.map((u) => (u.id === unitData.id ? unitData : u)));

    // if project exists, try to persist this unit immediately
    (async () => {
      if (!projectId) return; // cannot persist without project id

      try {
        // ensure tower is persisted
        let towerId =
          unitData.torre_id ?? unitData.tower_id ?? unitData.torreId ?? null;
        if (towerId && String(towerId).startsWith("new_")) {
          const towerObj = towers.find((t) => t.id === towerId);
          if (towerObj) {
            const payloadTower = { ...towerObj, project_id: projectId };
            if (String(payloadTower.id).startsWith("new_"))
              delete payloadTower.id;
            const savedT = await towerService.saveTower(payloadTower);
            const savedTower = savedT && savedT.id ? savedT : savedT;
            const newId = savedTower.id ?? savedTower.__raw?.id ?? savedTower;
            // update towers list and remap units referencing old tower id
            onTowersChange(
              towers.map((t) =>
                t.id === towerObj.id ? { ...t, ...savedTower, id: newId } : t
              )
            );
            // compute new units array from current units to avoid passing a function to onUnitsChange
            onUnitsChange(
              units.map((u) =>
                u.torre_id === towerObj.id ? { ...u, torre_id: newId } : u
              )
            );
            towerId = newId;
          }
        }

        // prepare payload for unit
        const payloadUnit = { ...unitData };
        // set project id
        payloadUnit.obra_id =
          payloadUnit.obra_id ?? payloadUnit.project_id ?? projectId;
        // map tower id if we have new towerId
        if (towerId) payloadUnit.torre_id = towerId;
        // remove temp id so backend treats as create
        if (payloadUnit.id && String(payloadUnit.id).startsWith("new_"))
          delete payloadUnit.id;

        const savedUres = await unitService.saveUnit(payloadUnit);
        const savedU = savedUres && savedUres.data ? savedUres.data : savedUres;
        if (savedU) {
          const norm = normalizeUnit(savedU);
          // update units with returned saved unit
          // update units by mapping current units array
          onUnitsChange(
            units.map((u) =>
              u.id === unitData.id ? { ...u, ...norm, id: norm.id ?? norm } : u
            )
          );
          toast({
            title: "\u2705 Unidade salva",
            description: "Unidade persistida no servidor.",
          });
        }
      } catch (e) {
        toast({
          title: "\u26a0\ufe0f Erro ao salvar unidade",
          description: e.message || String(e),
          variant: "destructive",
        });
      }
    })();
  };

  const handleRemoveUnit = async (unitId) => {
    const unit = units.find((u) => String(u.id) === String(unitId));
    if (!unit) return;

    const ok = window.confirm(
      `Confirma remo\u00e7\u00e3o da unidade "${
        unit.numero_unidade || unit.unit_number || unitId
      }"? Esta ac\u00e7\u00e3o n\u00e3o pode ser desfeita.`
    );
    if (!ok) return;

    const idStr = String(unit.id ?? "");
    const isTempUnit =
      idStr.startsWith("new_") ||
      idStr.startsWith("gen_") ||
      idStr.startsWith("import_") ||
      !/^[0-9]+$/.test(idStr);

    // If temp unit (created client-side) just remove locally
    if (isTempUnit) {
      onUnitsChange(units.filter((u) => u.id !== unitId));
      toast({
        title: "🗑️ Unidade removida",
        description: `Unidade ${
          unit.numero_unidade || unit.unit_number || unitId
        } removida localmente.`,
      });
      return;
    }

    // Persisted unit: call API to delete
    setDeletingUnitId(unitId);
    try {
      await unitService.deleteUnit(unitId);
      onUnitsChange(units.filter((u) => u.id !== unitId));
      toast({
        title: "🗑️ Unidade removida",
        description: `Unidade ${
          unit.numero_unidade || unit.unit_number || unitId
        } removida.`,
      });
    } catch (e) {
      toast({
        title: "❌ Erro",
        description: e.message || "Erro ao remover unidade",
        variant: "destructive",
      });
    } finally {
      setDeletingUnitId(null);
    }
  };

  const renderTowers = () => {
    // defensive: ensure units is an array to avoid runtime errors
    const safeUnits = Array.isArray(units) ? units : [];
    if (!Array.isArray(units)) {
      console.warn("ProjectFormTowers: expected units to be array, got", units);
    }

    return towers.map((tower) => {
      const towerUnits = safeUnits.filter((u) => u.torre_id === tower.id);
      return (
        <TowerCardWithPreview
          key={tower.id}
          tower={tower}
          towers={towers}
          units={units}
          towerUnits={towerUnits}
          deletingUnitId={deletingUnitId}
          onSaveTower={handleSaveTower}
          onDeleteTower={handleDeleteTower}
          onTowerInputChange={handleTowerInputChange}
          onAddUnit={handleAddUnit}
          onUnitChange={handleUnitChange}
          onRemoveUnit={handleRemoveUnit}
          onUnitsChange={onUnitsChange}
          projectId={projectId}
        />
      );
    });
  };

  return (
    <div className="space-y-6">
      {towers && towers.length > 0 ? (
        renderTowers()
      ) : (
        <Card className="glass-effect border-slate-700 p-6">
          <CardHeader>
            <CardTitle className="text-white">
              Nenhuma torre cadastrada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300 mb-4">
              Ainda não há torres para este projeto. Clique em "Adicionar Torre"
              para criar a primeira.
            </p>
            {projectType === "torres_blocos" && (
              <Button type="button" variant="outline" onClick={handleAddTower}>
                <PlusCircle className="w-4 h-4 mr-2" />
                Adicionar Torre
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      {projectType === "torres_blocos" && (
        <Button type="button" variant="outline" onClick={handleAddTower}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Adicionar Torre
        </Button>
      )}
    </div>
  );
};

export default ProjectFormTowers;

// Componente isolado para usar hooks sem quebrar regras dentro de loops
function TowerCardWithPreview({
  tower,
  towers,
  units,
  towerUnits,
  deletingUnitId,
  onSaveTower,
  onDeleteTower,
  onTowerInputChange,
  onAddUnit,
  onUnitChange,
  onRemoveUnit,
  onUnitsChange,
  projectId,
}) {
  const preview = useTowerPreview(tower, towers, units);
  const { toast } = useToast();
  const [isRecomputingCub, setIsRecomputingCub] = useState(false);
  const [showCubModal, setShowCubModal] = useState(false);
  const [cubValor, setCubValor] = useState("");
  const [cubVigencia, setCubVigencia] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [cubVariacao, setCubVariacao] = useState("");
  const [savingCub, setSavingCub] = useState(false);
  const [latestCub, setLatestCub] = useState(null);
  const [loadingCubInfo, setLoadingCubInfo] = useState(false);
  const cubBtnRef = React.useRef(null);
  const [modalPos, setModalPos] = useState({ top: 120, left: null });

  const openCubModal = React.useCallback(() => {
    // Centralizado horizontalmente, alguns px abaixo do topo visível
    const top = window.scrollY + 120;
    setModalPos({ top, left: null });
    setShowCubModal(true);
    setTimeout(() => {
      const first = document.getElementById("cubValorInput");
      if (first) first.focus();
    }, 50);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingCubInfo(true);
      try {
        const r = await cubService.latest();
        if (!cancelled) setLatestCub(r?.data || null);
      } catch (e) {
        if (!cancelled) setLatestCub(null);
      } finally {
        if (!cancelled) setLoadingCubInfo(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ensureCurrentCubOrAsk = async () => {
    try {
      const latest = await cubService.latest();
      const row = latest?.data;
      if (!row) {
        openCubModal();
        return false;
      }
      // guarda local para exibição e sincroniza campos do modal
      setLatestCub(row);
      if (row.valorAtual && !cubValor) setCubValor(String(row.valorAtual));
      if (row.vigencia) {
        const v = row.vigencia.slice(0, 7);
        if (!cubVigencia) setCubVigencia(v);
      }
      // verifica se vigencia é do mês atual
      const now = new Date();
      const ymNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      const vigRaw = row.vigencia || "";
      let ymRow = vigRaw.slice(0, 7);
      // se mês for diferente mas valor existente pode ainda permitir recompute sem forçar cadastro
      if (ymRow !== ymNow) {
        // Apenas sugerir (toast) ao invés de forçar modal
        toast({
          title: "ℹ️ CUB diferente do mês atual",
          description: `Vigência atual cadastrada: ${ymRow}. Você pode cadastrar o mês ${ymNow} se desejar atualizar.`,
        });
        return true; // permitir seguir com recompute usando CUB existente
      }
      return true; // já existe CUB válido
    } catch (e) {
      openCubModal();
      return false;
    }
  };

  const handleSaveCub = async () => {
    if (!cubValor || !cubVigencia) {
      toast({
        title: "⚠️ Preencha CUB",
        description: "Informe valor e vigência.",
        variant: "destructive",
      });
      return;
    }
    setSavingCub(true);
    try {
      const valorNum = parseFloat(
        String(cubValor)
          .replace(/[^0-9.,]/g, "")
          .replace(/\./g, "")
          .replace(/,/g, ".")
      );
      if (isNaN(valorNum) || valorNum <= 0) throw new Error("Valor inválido");
      const variacaoNum = cubVariacao
        ? parseFloat(String(cubVariacao).replace(/,/g, "."))
        : null;
      await cubService.save({
        valorAtual: valorNum,
        vigencia: cubVigencia,
        variacao: variacaoNum,
      });
      try {
        const r = await cubService.latest();
        setLatestCub(r?.data || null);
      } catch (_) {}
      toast({
        title: "💾 CUB salvo",
        description: "Valor cadastrado com sucesso.",
      });
      setShowCubModal(false);
      // após salvar chama recompute
      await handleRecomputeCubTower(true);
    } catch (e) {
      toast({
        title: "❌ Erro",
        description: e.message || "Falha ao salvar CUB",
        variant: "destructive",
      });
    } finally {
      setSavingCub(false);
    }
  };

  const handleRecomputeCubTower = async (skipEnsure = false) => {
    if (!projectId) {
      toast({
        title: "⚠️ Projeto não salvo",
        description: "Salve o projeto antes de recalcular CUB.",
        variant: "destructive",
      });
      return;
    }
    if (!tower?.id || String(tower.id).startsWith("new_")) {
      toast({
        title: "⚠️ Torre não salva",
        description: "Salve a torre antes de recalcular CUB.",
        variant: "destructive",
      });
      return;
    }
    if (!skipEnsure) {
      const ok = await ensureCurrentCubOrAsk();
      if (!ok) return; // modal aberto para inserir novo CUB
    }
    setIsRecomputingCub(true);
    try {
      const res = await unitService.recomputeCub(tower.id);
      const payload = res?.data || res;
      const updated = payload?.updated ?? payload?.data?.updated;
      const cubValor = payload?.cubValor;
      const message = payload?.message || payload?.data?.message || "";
      // Apenas abrir modal se REALMENTE faltar dado de CUB (sem registro ou tabela). Se apenas as colunas não existem, não faz sentido pedir cadastro.
      const faltaCubRegex =
        /Nenhum registro CUB encontrado|Tabela cub não encontrada/i;
      console.debug("[Recompute CUB] payload=", payload);
      if (faltaCubRegex.test(message) && !latestCub) {
        openCubModal();
        toast({
          title: "ℹ️ CUB necessário",
          description: "Cadastre o valor do CUB atual para recalcular.",
          variant: "default",
        });
      } else {
        // Caso updated === 0 mas não seja falta de CUB, tratar como nenhum ajuste necessário
        toast({
          title: updated === 0 ? "Sem alterações" : "🧮 CUB Recalculado",
          description:
            updated === 0
              ? `Nenhuma unidade precisou ser atualizada (valores já alinhados).${
                  cubValor ? " CUB " + cubValor : ""
                }`
              : `${updated} unidade(s) atualizadas${
                  cubValor != null ? " (CUB " + cubValor + ")" : ""
                } na torre ${tower.name}.`,
        });
      }
      // Reload units for project to reflect new values
      try {
        const remoteUnits = await unitService.getUnitsByProject(projectId);
        const list =
          remoteUnits && remoteUnits.data ? remoteUnits.data : remoteUnits;
        if (Array.isArray(list)) {
          onUnitsChange(
            list.map((u) => ({
              id: u.id ?? u.ID ?? null,
              obra_id: u.obra_id ?? u.project_id ?? null,
              project_id: u.obra_id ?? u.project_id ?? null,
              torre_id: u.torre_id ?? u.tower_id ?? null,
              tower_id: u.torre_id ?? u.tower_id ?? null,
              numero_unidade: u.numero_unidade ?? u.unit_number ?? null,
              unit_number: u.numero_unidade ?? u.unit_number ?? null,
              pavimento: u.pavimento ?? u.floor ?? null,
              floor: u.pavimento ?? u.floor ?? null,
              tipo: u.tipo ?? u.type ?? null,
              type: u.tipo ?? u.type ?? null,
              area_privativa: u.area_privativa ?? u.area_private ?? null,
              area_private: u.area_privativa ?? u.area_private ?? null,
              area_total: u.area_total ?? null,
              status_venda: u.status_venda ?? u.sale_status ?? null,
              sale_status: u.status_venda ?? u.sale_status ?? null,
              valor: u.valor ?? u.price ?? null,
              price: u.valor ?? u.price ?? null,
              caracteristicas_especificas:
                u.caracteristicas_especificas ?? u.specific_features ?? null,
              specific_features:
                u.caracteristicas_especificas ?? u.specific_features ?? null,
              cubReferencia: u.cubReferencia ?? null,
              id_cubAtual: u.id_cubAtual ?? null,
              valor_atualizado: u.valor_atualizado ?? null,
              dormitorios: u.dormitorios ?? u.bedrooms ?? null,
              bedrooms: u.dormitorios ?? u.bedrooms ?? null,
              vagas: u.vagas ?? u.parking ?? null,
              parking: u.vagas ?? u.parking ?? null,
              __raw: u,
            }))
          );
        }
      } catch (e) {
        console.warn("Falha ao recarregar unidades após recompute CUB", e);
      }
    } catch (e) {
      toast({
        title: "❌ Erro",
        description: e.message || "Falha ao recalcular CUB da torre",
        variant: "destructive",
      });
    } finally {
      setIsRecomputingCub(false);
    }
  };
  return (
    <Card className="glass-effect border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white">{tower.name}</CardTitle>
        <div className="flex items-center space-x-2">
          <div className="flex items-center gap-2">
            <div className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-200 border border-slate-600 whitespace-nowrap">
              {loadingCubInfo
                ? "CUB: ..."
                : latestCub
                ? `CUB ${latestCub.vigencia?.slice(0, 7)} = R$ ${Number(
                    latestCub.valorAtual
                  ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                : "Sem CUB"}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              ref={cubBtnRef}
              onClick={openCubModal}
              title="Cadastrar / Editar CUB"
            >
              {latestCub ? "Editar CUB" : "Cadastrar CUB"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRecomputeCubTower}
              disabled={isRecomputingCub}
              title="Recalcular valores (CUB) desta torre"
            >
              {isRecomputingCub ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : null}
              {isRecomputingCub ? "Recalculando..." : "CUB Torre"}
            </Button>
          </div>
          {tower._dirty && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onSaveTower(tower)}
            >
              <Save className="w-4 h-4 text-green-400" />
            </Button>
          )}
          {towers.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onDeleteTower(tower)}
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showCubModal && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setShowCubModal(false)}
            />
            <div
              className="absolute w-[340px] md:w-[380px] bg-slate-800 border border-slate-600 rounded-lg p-5 space-y-4 shadow-xl left-1/2 -translate-x-1/2"
              style={{ top: modalPos.top }}
            >
              <h3 className="text-lg font-semibold text-slate-100">
                Cadastrar CUB do Mês
              </h3>
              <div className="space-y-2">
                <Label>Vigência (AAAA-MM)</Label>
                <Input
                  value={cubVigencia}
                  onChange={(e) => setCubVigencia(e.target.value)}
                  placeholder="2025-10"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Atual (R$/m²)</Label>
                <Input
                  id="cubValorInput"
                  value={cubValor}
                  onChange={(e) => setCubValor(e.target.value)}
                  placeholder="2350,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Variação (%)</Label>
                <Input
                  value={cubVariacao}
                  onChange={(e) => setCubVariacao(e.target.value)}
                  placeholder="0.85"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setShowCubModal(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={savingCub}
                  onClick={handleSaveCub}
                >
                  {savingCub ? "Salvando..." : "Salvar & Recalcular"}
                </Button>
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-1">
            <Label htmlFor={`tower-name-${tower.id}`}>Nome da Torre</Label>
            <Input
              id={`tower-name-${tower.id}`}
              value={tower.name}
              onChange={(e) =>
                onTowerInputChange(tower.id, "name", e.target.value)
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`tower-floors-${tower.id}`}>Nº de Andares</Label>
            <Input
              id={`tower-floors-${tower.id}`}
              type="number"
              value={tower.floors}
              onChange={(e) =>
                onTowerInputChange(tower.id, "floors", e.target.value)
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`tower-units-per-floor-${tower.id}`}>
              Unidades p/ Andar
            </Label>
            <Input
              id={`tower-units-per-floor-${tower.id}`}
              type="number"
              value={tower.unitsPerFloor}
              onChange={(e) =>
                onTowerInputChange(tower.id, "unitsPerFloor", e.target.value)
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`tower-initial-floor-${tower.id}`}>
              Andar Inicial
            </Label>
            <Input
              id={`tower-initial-floor-${tower.id}`}
              type="number"
              value={tower.initialFloor ?? ""}
              onChange={(e) =>
                onTowerInputChange(tower.id, "initialFloor", e.target.value)
              }
              placeholder="1"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`tower-initial-unit-${tower.id}`}>
              Primeira Unidade
            </Label>
            <Input
              id={`tower-initial-unit-${tower.id}`}
              value={tower.initialUnitStart ?? ""}
              onChange={(e) =>
                onTowerInputChange(tower.id, "initialUnitStart", e.target.value)
              }
              placeholder="101"
            />
          </div>
        </div>
        {/* Campos opcionais de estrutura: manter apenas Mezanino conforme solicitado */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3">
          <div className="flex items-center gap-2 mt-6">
            <input
              id={`tower-has-mezzanine-${tower.id}`}
              type="checkbox"
              checked={!!tower.hasMezzanine}
              onChange={(e) => onTowerInputChange(tower.id, "hasMezzanine", e.target.checked)}
            />
            <Label htmlFor={`tower-has-mezzanine-${tower.id}`}>Mezanino</Label>
          </div>
        </div>
        {/* Preview / validação da torre */}
        <div className="mt-2 border border-slate-700/70 rounded-md p-3 bg-slate-800/30 text-xs space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-200">Preview:</span>
            {preview.errors.length === 0 && preview.total > 0 && (
              <>
                <span className="text-slate-300">
                  {preview.total} unidades previstas
                </span>
                <span className="text-slate-500">
                  Ex.: {preview.sample.join(", ")}
                  {preview.total > preview.sample.length ? "…" : ""}
                </span>
              </>
            )}
            {preview.errors.length === 0 && preview.total === 0 && (
              <span className="text-slate-400">
                Informe parâmetros para ver o preview.
              </span>
            )}
          </div>
          {preview.baseSuffix && (
            <div className="text-slate-500">
              Sufixo base: {preview.baseSuffix} | Andar inicial do número:{" "}
              {preview.floorFromStartNumber}
            </div>
          )}
          {preview.errors.length > 0 && (
            <ul className="text-red-400 list-disc ml-5 space-y-0.5">
              {preview.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
          {preview.warnings.length > 0 && preview.errors.length === 0 && (
            <ul className="text-amber-400 list-disc ml-5 space-y-0.5">
              {preview.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
          {preview.duplicatesWithOtherTowers.length > 0 && (
            <div className="text-amber-500">
              Duplicados (outras torres):{" "}
              {preview.duplicatesWithOtherTowers.join(", ")}
              {preview.duplicatesWithOtherTowers.length === 20 ? "…" : ""}
            </div>
          )}
        </div>
        <div className="pt-4">
          <h4 className="font-semibold text-slate-200 mb-2">Unidades</h4>
          {towerUnits.map((unit) => (
            <UnitForm
              key={unit.id}
              unit={unit}
              onSave={onUnitChange}
              onRemove={onRemoveUnit}
              isDeleting={String(deletingUnitId) === String(unit.id)}
              towers={towers}
            />
          ))}
          <div className="mt-6 border border-slate-700/70 rounded-md p-4 bg-slate-800/40 space-y-4">
            <h5 className="text-slate-200 font-semibold text-sm">
              Ações em Massa por Final (Pilha)
            </h5>
            <p className="text-xs text-slate-400 leading-relaxed">
              Informe os finais (pilhas) separados por vírgula. Ex: 1,2,3. O
              sistema identifica o final pelas últimas 2 casas da unidade (ex:
              601 → pilha 1, 602 → pilha 2). Pode aplicar alterações de Área,
              Tipo e/ou Valor, ou excluir todas as unidades dessas pilhas.
            </p>
            <BulkStackEditor
              tower={tower}
              units={towerUnits}
              allUnits={units}
              onUnitsChange={onUnitsChange}
              projectId={projectId}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-2"
            onClick={() => onAddUnit(tower.id)}
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Adicionar Unidade
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// --- BulkStackEditor sub-component ---
import { useState as useStateBulk } from "react";

function BulkStackEditor({ tower, units, allUnits, onUnitsChange, projectId }) {
  const { toast } = useToast();
  const [stacksInput, setStacksInput] = useStateBulk("");
  const [areaValue, setAreaValue] = useStateBulk("");
  const [typeValue, setTypeValue] = useStateBulk("");
  const [priceValue, setPriceValue] = useStateBulk("");
  const [bedroomsValue, setBedroomsValue] = useStateBulk("");
  const [parkingValue, setParkingValue] = useStateBulk("");
  const [isApplying, setIsApplying] = useStateBulk(false);
  const [deleteMode, setDeleteMode] = useStateBulk(false);

  const parseStacks = () => {
    return stacksInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/^0+/, "")); // remove zeros à esquerda para comparar
  };

  const getStackOfUnit = (u) => {
    const raw = String(u.numero_unidade || u.unit_number || "");
    if (!raw) return null;
    const suffix = raw.slice(-2); // duas últimas casas (01..99)
    return String(parseInt(suffix, 10)); // normaliza 01 -> 1
  };

  const handleApply = async () => {
    const stacks = parseStacks();
    if (!stacks.length) {
      toast({
        title: "⚠️ Informe os finais",
        description: "Digite ao menos um final (pilha).",
        variant: "destructive",
      });
      return;
    }
    const targetUnits = units.filter((u) => stacks.includes(getStackOfUnit(u)));
    if (!targetUnits.length) {
      toast({
        title: "Sem correspondências",
        description: "Nenhuma unidade encontrada para os finais informados.",
      });
      return;
    }

    if (deleteMode) {
      const ok = window.confirm(
        `Remover ${targetUnits.length} unidade(s) das pilhas: ${stacks.join(
          ", "
        )}?`
      );
      if (!ok) return;
    }

    setIsApplying(true);
    try {
      let updatedAll = [...allUnits];
      const successes = [];
      const failures = [];
      for (const u of targetUnits) {
        if (deleteMode) {
          // remover
          const idStr = String(u.id || "");
          const isTemp =
            idStr.startsWith("new_") ||
            idStr.startsWith("gen_") ||
            idStr.startsWith("import_") ||
            !/^[0-9]+$/.test(idStr);
          if (isTemp) {
            updatedAll = updatedAll.filter((x) => x.id !== u.id);
            successes.push(u);
          } else {
            try {
              await unitService.deleteUnit(u.id);
              updatedAll = updatedAll.filter((x) => x.id !== u.id);
              successes.push(u);
            } catch (e) {
              failures.push({ u, e });
            }
          }
          continue;
        }
        // edição
        const newObj = { ...u };
        let changed = false;
        const parseDecimal = (val) => {
          if (val == null || val === "") return val;
          const cleaned = String(val)
            .replace(/\./g, "")
            .replace(/,/g, ".")
            .replace(/[^0-9.-]+/g, "");
          const n = Number(cleaned);
          return isNaN(n) ? null : n;
        };
        if (areaValue) {
          const parsed = parseDecimal(areaValue);
          if (parsed != null) {
            const rounded = Math.round(parsed * 100) / 100;
            newObj.area_privativa = rounded;
            newObj.area_private = rounded;
            newObj.area_total = newObj.area_total || rounded;
            changed = true;
          }
        }
        if (typeValue) {
          newObj.tipo = typeValue;
          newObj.type = typeValue;
          changed = true;
        }
        if (priceValue) {
          const parsed = parseDecimal(priceValue);
          if (parsed != null) {
            newObj.valor = parsed;
            newObj.price = parsed;
            changed = true;
          }
        }
        if (bedroomsValue) {
          const b = Number(bedroomsValue);
          if (!isNaN(b)) {
            newObj.bedrooms = b;
            changed = true;
          }
        }
        if (parkingValue) {
          const p = Number(parkingValue);
          if (!isNaN(p)) {
            newObj.parking = p;
            changed = true;
          }
        }
        if (!changed) {
          continue;
        }
        // atualizar local
        updatedAll = updatedAll.map((x) => (x.id === u.id ? newObj : x));
        // persistir se possível
        try {
          if (projectId) {
            const payload = { ...newObj };
            if (String(payload.id || "").startsWith("new_")) delete payload.id; // criação se for novo
            payload.obra_id =
              payload.obra_id || payload.project_id || projectId;
            payload.torre_id = payload.torre_id || tower.id;
            await unitService.saveUnit(payload);
          }
          successes.push(newObj);
        } catch (e) {
          failures.push({ u, e });
        }
      }
      onUnitsChange(updatedAll);
      if (deleteMode) {
        toast({
          title: "🗑️ Remoção em massa",
          description: `${successes.length} removidas. ${
            failures.length ? failures.length + " falhas" : "Sem falhas."
          }`,
        });
      } else {
        toast({
          title: "✅ Edição em massa",
          description: `${successes.length} atualizadas. ${
            failures.length ? failures.length + " falhas" : "Sem falhas."
          }`,
        });
      }
    } finally {
      setIsApplying(false);
    }
  };

  const disableApply =
    !stacksInput.trim() ||
    (!deleteMode &&
      !areaValue &&
      !typeValue &&
      !priceValue &&
      !bedroomsValue &&
      !parkingValue);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Finais (pilhas)</Label>
          <Input
            value={stacksInput}
            onChange={(e) => setStacksInput(e.target.value)}
            placeholder="1,2,3"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Área (m²)</Label>
          <Input
            value={areaValue}
            onChange={(e) => {
              const raw = e.target.value;
              const cleaned = raw.replace(/[^0-9.,]/g, "");
              setAreaValue(cleaned);
            }}
            onBlur={(e) => {
              const raw = e.target.value;
              if (!raw) {
                setAreaValue("");
                return;
              }
              const normalized = raw.replace(/\./g, "").replace(/,/g, ".");
              const num = parseFloat(normalized);
              if (!isNaN(num)) {
                const rounded = Math.round(num * 100) / 100;
                setAreaValue(
                  rounded.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                );
              } else {
                setAreaValue("");
              }
            }}
            placeholder="75,00"
            className="h-8 text-sm"
            disabled={deleteMode}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <Input
            value={typeValue}
            onChange={(e) => setTypeValue(e.target.value)}
            placeholder="2 quartos"
            className="h-8 text-sm"
            disabled={deleteMode}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Valor (R$)</Label>
          <Input
            value={priceValue}
            onChange={(e) => setPriceValue(e.target.value)}
            placeholder="400000"
            className="h-8 text-sm"
            disabled={deleteMode}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Dorms</Label>
          <Input
            value={bedroomsValue}
            onChange={(e) => setBedroomsValue(e.target.value)}
            placeholder="2"
            className="h-8 text-sm"
            disabled={deleteMode}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Vagas</Label>
          <Input
            value={parkingValue}
            onChange={(e) => setParkingValue(e.target.value)}
            placeholder="1"
            className="h-8 text-sm"
            disabled={deleteMode}
          />
        </div>
        <div className="flex items-end space-x-2">
          <Button
            type="button"
            variant={deleteMode ? "destructive" : "outline"}
            size="sm"
            className="h-8"
            onClick={() => setDeleteMode((m) => !m)}
          >
            {deleteMode ? "Modo Excluir" : "Modo Editar"}
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8"
            disabled={disableApply || isApplying}
            onClick={handleApply}
          >
            {isApplying ? "Aplicando..." : deleteMode ? "Excluir" : "Aplicar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
