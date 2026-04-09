import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, ChevronLeft, ChevronRight, PlusCircle, Trash2, UploadCloud } from "lucide-react";
import { unitTypeService } from "@/services/unitTypeService";
import { cubService } from "@/services/cubService";
import { computeFactorKR, computePriceKR, roundMoney } from "@/lib/pricing";

/**
 * ProjectUnitsWizard
 * 3 etapas:
 * 1) Dados gerais (por torre): floors, unitsPerFloor, typical floors, special floors, CUB
 * 2) Tipologias (nome/área/dorms/suites/vagas/fator/andares/posição/quantidade por pavimento)
 * 3) Regras de valorização e Geração
 *
 * Props:
 * - towers: array de torres
 * - existingUnits: unidades já existentes (para evitar duplicadas)
 * - onUnitsGenerated(newUnits)
 * - projectId (opcional)
 */
const ProjectUnitsWizard = ({
  towers = [],
  existingUnits = [],
  onUnitsGenerated,
  projectId,
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [unitTypes, setUnitTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [isPersisting, setIsPersisting] = useState(false);
  const [isSavingCub, setIsSavingCub] = useState(false);
  const [lastGenerated, setLastGenerated] = useState([]);
  const [confirmAgreed, setConfirmAgreed] = useState(false);
  // CUBs
  const [cubList, setCubList] = useState([]);
  const [loadingCubs, setLoadingCubs] = useState(false);
  const [selectedCubId, setSelectedCubId] = useState("");
  const [newCub, setNewCub] = useState({ valor: "", vigencia: "" });
  const [savingNewCub, setSavingNewCub] = useState(false);

  // Etapa 1 - parâmetros por torre (permitindo escolher 1 torre por vez)
  const [general, setGeneral] = useState(() => {
    const first = towers?.[0] || {};
    return {
      towerId: first?.id ? String(first.id) : "",
      floors: String(first?.floors ?? ''),
      unitsPerFloor: String(first?.unitsPerFloor ?? ''),
      initialFloor: String(first?.initialFloor ?? ''),
      initialUnitStart: String(first?.initialUnitStart ?? ""),
      // campos removidos do UI: pavimentos tipo / térreo / cobertura
      hasMezzanine: false,
      cubValue: "", // R$/m²
      cubDate: "", // YYYY-MM (opcional)
    };
  });

  // Etapa 2 - tipologias
  const [typologies, setTypologies] = useState([]);
  // Mapeamento final (sufixo) -> tipologia (por id)
  const [finalTypologyMap, setFinalTypologyMap] = useState({});

  // Etapa 3 - regras de valorização
  const [rules, setRules] = useState({
    highFloors: { enabled: true, aboveFloor: 5, percentPerFloor: 2 }, // 2% por andar acima do 5º
    penthouse: { enabled: false, percent: 0 },
    groundGarden: { enabled: false, percent: 0 },
    cornerUnit: { enabled: false, percent: 5 },
  });

  // Modo de precificação
  const [pricingMode, setPricingMode] = useState('coeff'); // 'coeff' como padrão
  const [krConfig, setKrConfig] = useState({
    baseFloor: 6,
    finals: {}
  });
  const [coeffConfig, setCoeffConfig] = useState({
    vuv: '', // R$/m²
    floor: { baseFloor: '', percentPerFloor: '' }, // CANDAR
    positionFactors: { 'Frente Mar': '1,10', 'Lateral': '1,05', 'Fundos': '1,00' }, // CPOSIÇÃO
    garage: { method: 'factor', factors: { '1': '1,00', '2': '1,05' }, addPerSpot: '0' } // CGARAGEM
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingTypes(true);
      try {
        const resp = await unitTypeService.list();
        const list = resp?.data || resp || [];
        if (mounted) setUnitTypes(list);
      } catch (e) {
        toast({ title: "Tipos de unidade", description: e.message || "Falha ao carregar", variant: "destructive" });
      } finally {
        if (mounted) setLoadingTypes(false);
      }
      // carregar CUBs cadastrados
      setLoadingCubs(true);
      try {
        const res = await cubService.list();
        const rows = res?.data || res || [];
        if (mounted) {
          setCubList(rows);
          if (rows.length) {
            const latest = rows[0];
            setSelectedCubId(String(latest.id ?? latest.ID ?? ''));
            if (latest.valorAtual != null) setGeneral((p)=> ({...p, cubValue: String(latest.valorAtual).replace('.', ',') }));
            if (latest.vigencia) setGeneral((p)=> ({...p, cubDate: String(latest.vigencia).slice(0,7) }));
          }
        }
      } catch (e) {
        // silencioso
      } finally {
        if (mounted) setLoadingCubs(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTower = useMemo(() => {
    if (!general.towerId || general.towerId === 'ALL') return null;
    return towers.find((t) => String(t.id) === String(general.towerId));
  }, [towers, general.towerId]);

  useEffect(() => {
    // ao trocar torre, preenche padrões SOMENTE se o usuário ainda não digitou
    if (!selectedTower) return;
    setGeneral((prev) => {
      const next = { ...prev };
      if (!prev.floors) next.floors = String(selectedTower.floors ?? prev.floors ?? '');
      if (!prev.unitsPerFloor) next.unitsPerFloor = String(selectedTower.unitsPerFloor ?? prev.unitsPerFloor ?? '');
      if (!prev.initialFloor) next.initialFloor = String(selectedTower.initialFloor ?? prev.initialFloor ?? '');
      if (!prev.initialUnitStart) next.initialUnitStart = String(selectedTower.initialUnitStart ?? prev.initialUnitStart ?? '');
      return next;
    });
  }, [selectedTower]);

  const addTypology = useCallback(() => {
    setTypologies((prev) => [
      ...prev,
      {
        id: `new_${Date.now()}`,
        name: "Tipo A",
        unit_type_id: "",
        area: "70,00",
        // manter como strings para evitar perda de foco/caret em inputs controlados
        bedrooms: "",
        suites: "",
        parking: "",
        appreciation_factor: "1,00",
        floors_start: String(Math.max(1, Number(general.initialFloor || 1))),
        floors_end: String(Number(general.floors || 10)),
        position: "frente",
        per_floor_quantity: "1",
      },
    ]);
  }, [general.initialFloor, general.floors]);

  const removeTypology = useCallback((id) => {
    setTypologies((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateTypology = useCallback((id, field, value) => {
    setTypologies((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  }, []);

  const parseFloorNumber = (value) => {
    if (value == null || value === '') return null;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
    const parsed = parseInt(String(value).replace(/[^0-9-]/g, ''), 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  // helpers
  const parseDecimal = (masked) => {
    if (!masked && masked !== 0) return 0;
    let s = String(masked).trim();
    if (!s) return 0;

    s = s.replace(/\s+/g, '').replace(/[^0-9,.-]+/g, '');
    const hasComma = s.includes(',');
    const hasDot = s.includes('.');

    if (hasComma && hasDot) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        s = s.replace(/,/g, '');
      }
    } else if (hasComma) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (hasDot) {
      const parts = s.split('.');
      if (parts.length > 2) {
        const dec = parts.pop();
        s = parts.join('') + '.' + dec;
      } else {
        const [intPart, decPart] = parts;
        if (decPart != null && decPart.length === 3) {
          s = intPart + decPart;
        } else {
          s = intPart + (decPart != null ? `.${decPart}` : '');
        }
      }
    }

    const n = Number(s);
    return isNaN(n) ? 0 : n;
  };
  const formatDecimal = (value) => {
    if (value === "" || value == null) return "";
    const num = parseDecimal(value);
    if (!Number.isFinite(num) || Number.isNaN(num)) return "";
    return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const parseAreaDecimal = (value) => {
    if (!value && value !== 0) return 0;
    const raw = String(value).trim();
    if (!raw) return 0;

    if (/[,.]/.test(raw)) {
      return parseDecimal(raw);
    }

    const digits = raw.replace(/[^0-9-]/g, '');
    if (!digits) return 0;
    const n = Number(digits);
    if (!Number.isFinite(n) || Number.isNaN(n)) return 0;
    if (digits.length >= 4) return Number((n / 100).toFixed(2));
    return n;
  };
  const formatAreaDecimal = (value) => {
    if (value === "" || value == null) return "";
    const parsed = parseAreaDecimal(value);
    if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return "";
    return parsed.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const typologySignature = (tp) => {
    const unitTypeId = String(tp?.unit_type_id ?? '').trim();
    if (unitTypeId) return `ut:${unitTypeId}`;
    const name = String(tp?.name ?? '').trim().toLowerCase();
    const area = parseAreaDecimal(tp?.area ?? 0).toFixed(2);
    const bedrooms = String(tp?.bedrooms ?? '').trim();
    const suites = String(tp?.suites ?? '').trim();
    const parking = String(tp?.parking ?? '').trim();
    return `nm:${name}|a:${area}|d:${bedrooms}|s:${suites}|v:${parking}`;
  };

  const recoverTypologiesFromExistingUnits = ({ merge = false } = {}) => {
    const targetTowerId = String(general.towerId || '').trim();
    const source = (Array.isArray(existingUnits) ? existingUnits : []).filter((u) => {
      if (!targetTowerId || targetTowerId === 'ALL') return true;
      return String(u?.torre_id ?? u?.tower_id ?? '').trim() === targetTowerId;
    });

    if (!source.length) {
      toast({ title: 'Sem unidades para recuperar', description: 'Não há unidades salvas para a torre selecionada.' });
      return;
    }

    const groups = new Map();
    source.forEach((u) => {
      const unitTypeId = u?.unit_type_id != null ? String(u.unit_type_id).trim() : '';
      const typeName = String(u?.type ?? u?.tipo ?? '').trim();
      const areaNum = parseAreaDecimal(u?.area_private ?? u?.area_privativa ?? u?.area_total ?? 0);
      const bedrooms = String(u?.bedrooms ?? u?.dormitorios ?? '').trim();
      const suites = String(u?.suites ?? '').trim();
      const parking = String(u?.parking ?? u?.vagas ?? '').trim();
      const floor = parseFloorNumber(u?.floor ?? u?.pavimento);
      const key = unitTypeId
        ? `ut:${unitTypeId}`
        : `sig:${typeName.toLowerCase()}|${areaNum.toFixed(2)}|${bedrooms}|${suites}|${parking}`;

      if (!groups.has(key)) {
        groups.set(key, {
          unitTypeId,
          typeName,
          areaNum,
          bedrooms,
          suites,
          parking,
          floors: [],
          byFloorCount: {},
        });
      }

      const g = groups.get(key);
      if (Number.isFinite(floor)) {
        g.floors.push(floor);
        g.byFloorCount[floor] = (g.byFloorCount[floor] || 0) + 1;
      }
    });

    const defaultStart = String(Math.max(1, Number(general.initialFloor || 1)));
    const defaultEnd = String(Number(general.floors || 10));

    const recovered = Array.from(groups.values()).map((g, idx) => {
      const minFloor = g.floors.length ? Math.min(...g.floors) : Number(defaultStart);
      const maxFloor = g.floors.length ? Math.max(...g.floors) : Number(defaultEnd);
      const perFloor = Object.values(g.byFloorCount || {}).length
        ? Math.max(...Object.values(g.byFloorCount))
        : 1;

      const posSource = `${g.typeName}`.toLowerCase();
      let position = 'frente';
      if (/fundo/.test(posSource)) position = 'fundos';
      else if (/lateral/.test(posSource)) position = 'lateral';
      else if (/canto/.test(posSource)) position = 'canto';

      const fallbackName = g.unitTypeId
        ? (unitTypes.find((ut) => String(ut.id) === String(g.unitTypeId))?.name || unitTypes.find((ut) => String(ut.id) === String(g.unitTypeId))?.position || '')
        : '';
      const name = g.typeName || fallbackName || `Tipo ${String.fromCharCode(65 + (idx % 26))}`;

      return {
        id: `recovered_${Date.now()}_${idx}`,
        name,
        unit_type_id: g.unitTypeId || '',
        area: g.areaNum > 0 ? formatAreaDecimal(g.areaNum) : '',
        bedrooms: g.bedrooms,
        suites: g.suites,
        parking: g.parking,
        appreciation_factor: '1,00',
        floors_start: String(minFloor),
        floors_end: String(maxFloor),
        position,
        per_floor_quantity: String(perFloor),
      };
    });

    setTypologies((prev) => {
      if (!merge) return recovered;
      const out = [...prev];
      const seen = new Set(prev.map((tp) => typologySignature(tp)));
      recovered.forEach((tp) => {
        const sig = typologySignature(tp);
        if (!seen.has(sig)) {
          seen.add(sig);
          out.push(tp);
        }
      });
      return out;
    });

    toast({
      title: 'Tipologias recuperadas',
      description: merge
        ? `${recovered.length} tipologia(s) analisada(s) e mesclada(s) com a lista atual.`
        : `${recovered.length} tipologia(s) recuperada(s) das unidades já salvas.`,
    });
  };

  // máscara monetária pt-BR leve: só dígitos e vírgula, uma vírgula, 2 casas decimais
  const maskMoneyBR = (val) => {
    if (val == null) return '';
    let s = String(val).replace(/\./g, ','); // normaliza ponto -> vírgula
    // remove caracteres inválidos
    s = s.replace(/[^0-9,]/g, '');
    // mantém apenas a primeira vírgula
    const parts = s.split(',');
    const intPart = parts[0] || '';
    let decPart = parts[1] || '';
    if (parts.length > 2) {
      // se houver mais vírgulas, junta o resto e ignora vírgulas extras
      decPart = (parts.slice(1).join('')).replace(/[^0-9]/g, '');
    }
    // limita a 2 casas
    decPart = decPart.slice(0, 2);
    return decPart.length ? `${intPart},${decPart}` : intPart;
  };

  // máscara simples para YYYY-MM (aceita só números, insere '-')
  const maskYearMonth = (val) => {
    const digits = String(val || '').replace(/[^0-9]/g, '').slice(0, 6);
    if (digits.length <= 4) return digits;
    return digits.slice(0, 4) + '-' + digits.slice(4, 6);
  };
  const isValidYearMonth = (s) => {
    if (!/^\d{4}-\d{2}$/.test(s)) return false;
    const y = Number(s.slice(0, 4));
    const m = Number(s.slice(5, 7));
    return y >= 1900 && y <= 9999 && m >= 1 && m <= 12;
  };
  const maskInteger = (val) => String(val || '').replace(/[^0-9]/g, '');
  // máscara decimal leve: mantém apenas dígitos e um separador (vírgula ou ponto)
  const maskDecimalLoose = (val) => {
    let s = String(val || '');
    s = s.replace(/[^0-9,\.]/g, '');
    // manter apenas o primeiro separador
    const comma = s.indexOf(',');
    const dot = s.indexOf('.');
    let sepIndex = -1;
    if (comma === -1) sepIndex = dot; else if (dot === -1) sepIndex = comma; else sepIndex = Math.min(comma, dot);
    if (sepIndex !== -1) {
      const intPart = s.slice(0, sepIndex).replace(/[^0-9]/g, '');
      const decPart = s.slice(sepIndex + 1).replace(/[^0-9]/g, '');
      const sep = s[sepIndex] === '.' ? '.' : ',';
      return decPart.length ? `${intPart}${sep}${decPart}` : intPart + sep;
    }
    return s.replace(/[^0-9]/g, '');
  };
  // máscara para fator com até 4 casas decimais, preservando o separador digitado ("," ou ".")
  const maskDecimal4 = (val) => {
    let s = String(val || '');
    s = s.replace(/[^0-9,\.]/g, '');
    const comma = s.indexOf(',');
    const dot = s.indexOf('.');
    let sepIndex = -1;
    if (comma === -1) sepIndex = dot; else if (dot === -1) sepIndex = comma; else sepIndex = Math.min(comma, dot);
    if (sepIndex !== -1) {
      const intPart = s.slice(0, sepIndex).replace(/[^0-9]/g, '');
      const sep = s[sepIndex]; // mantém o separador que foi digitado
      const decPart = s.slice(sepIndex + 1).replace(/[^0-9]/g, '').slice(0, 4);
      return decPart.length ? `${intPart}${sep}${decPart}` : intPart + sep;
    }
    return s.replace(/[^0-9]/g, '');
  };
  // máscara para área com até 2 casas decimais (apenas vírgula como separador decimal)
  const maskDecimal2 = (val) => {
    let s = String(val || '');
    // apenas dígitos e vírgula
    s = s.replace(/[^0-9,]/g, '');
    const sepIndex = s.indexOf(',');
    if (sepIndex !== -1) {
      const intPart = s.slice(0, sepIndex).replace(/[^0-9]/g, '');
      const decPart = s.slice(sepIndex + 1).replace(/[^0-9]/g, '').slice(0, 2);
      return decPart.length ? `${intPart},${decPart}` : intPart + ',';
    }
    return s.replace(/[^0-9]/g, '');
  };
  // normaliza exibição do fator para usar vírgula e no máximo 4 casas
  const formatFactorDisplay = (val) => {
    const s = maskDecimal4(val);
    return s.replace('.', ',');
  };

  // fatores por andar (mesma tabela do batch atual)
  const floorFactors = {
    6: 3.81,
    7: 3.90,
    8: 4.0,
    9: 4.17,
    10: 4.35,
    11: 4.53,
    12: 4.73,
    13: 4.93,
    14: 5.09,
    15: 5.30,
    16: 5.52,
    17: 5.72,
  };
  const resolveFactor = (floorNumber) => {
    if (floorNumber in floorFactors) return floorFactors[floorNumber];
    if (floorNumber < 6) return floorFactors[6];
    if (floorNumber > 17) return floorFactors[17];
    return 1;
  };

  const applyRules = ({ basePrice, floorNumber, isPenthouse, isGround, isCorner, appreciationFactor }) => {
    let price = basePrice;
    // fator da tipologia
    if (appreciationFactor && appreciationFactor !== 1) price = price * Number(appreciationFactor);
    // altos: +% por andar acima do N (apenas no modo floorFactor para não duplicar crescimento)
    if (pricingMode === 'floorFactor' && rules.highFloors.enabled && floorNumber > Number(rules.highFloors.aboveFloor)) {
      const extraFloors = floorNumber - Number(rules.highFloors.aboveFloor);
      const pct = Number(rules.highFloors.percentPerFloor || 0) / 100;
      price = price * (1 + pct * extraFloors);
    }
    if (rules.penthouse.enabled && isPenthouse) {
      price = price * (1 + Number(rules.penthouse.percent || 0) / 100);
    }
    if (rules.groundGarden.enabled && isGround) {
      price = price * (1 + Number(rules.groundGarden.percent || 0) / 100);
    }
    if (rules.cornerUnit.enabled && isCorner) {
      price = price * (1 + Number(rules.cornerUnit.percent || 0) / 100);
    }
    return price;
  };

  const generateUnits = async (opts = {}) => {
    const silent = !!opts.silent;
    const emitToParent = opts.emitToParent === true;
    const ignoreExistingUnits = !!opts.ignoreExistingUnits;
    const target = general.towerId;
    if (!target) {
      toast({ title: "Erro", description: "Selecione uma torre.", variant: "destructive" });
      return;
    }

  const cub = parseDecimal(general.cubValue || 0);
  const vuv = parseDecimal(coeffConfig.vuv || 0); // R$/m² para modo coeficientes
    // Persistir CUB (valor/vigência) se informado
    const selectedCubNum = Number(selectedCubId);
    const savedCubId = Number.isFinite(selectedCubNum) && selectedCubNum > 0 ? selectedCubNum : null;
    const generated = [];
    const seen = new Set(); // evitar duplicatas dentro da mesma execução

    const towerList = target === 'ALL' ? towers : towers.filter((t) => String(t.id) === String(target));
    // normalizar krConfig para garantir números no cálculo
    const normalizeKr = (cfg) => {
      const out = { baseFloor: Number(cfg?.baseFloor || 6), finals: {} };
      const finals = cfg?.finals || {};
      Object.keys(finals).forEach((sfx) => {
        const c = finals[sfx] || {};
        const excIn = c.exceptions || {};
        const excOut = {};
        Object.keys(excIn).forEach((k) => {
          const fk = Number(k);
          const fv = Number(excIn[k]);
          if (!isNaN(fk) && !isNaN(fv)) excOut[fk] = fv;
        });
        out.finals[sfx] = {
          k: Number(c.k || 0),
          r: Number(c.r || 0),
          exceptions: excOut,
        };
      });
      return out;
    };
    const normalizedKr = normalizeKr(krConfig);
    if (!towerList.length) {
      toast({ title: "Erro", description: "Nenhuma torre encontrada.", variant: "destructive" });
      return;
    }

  const utLabel = (id) => unitTypes.find((ut) => String(ut.id) === String(id))?.position || null;

    const genForTower = (t) => {
      const unitsPerFloor = Number(t.unitsPerFloor ?? general.unitsPerFloor ?? 0);
      const floorsCount = Number(t.floors ?? general.floors ?? 0);
      const initialFloor = Number(t.initialFloor ?? general.initialFloor ?? 1);
      const initialUnitStart = String(t.initialUnitStart ?? general.initialUnitStart ?? '101');
      const unitWidth = initialUnitStart.length;
      const suffixLength = 2;

      let derivedInitialFloor = initialFloor;
      if (initialUnitStart && initialUnitStart.length > suffixLength) {
        const floorPart = initialUnitStart.slice(0, initialUnitStart.length - suffixLength);
        const parsed = parseInt(floorPart.replace(/^0+/, "") || "0", 10);
        if (!isNaN(parsed) && parsed > 0) derivedInitialFloor = parsed;
      }

  const typicalStart = derivedInitialFloor;
  const typicalEnd = derivedInitialFloor + floorsCount - 1;
      const topFloor = derivedInitialFloor + floorsCount - 1;
  const hasPent = true;
  const hasGround = true;

      const unmapped = new Set();
      for (let fIndex = 0; fIndex < floorsCount; fIndex++) {
        const floorNumber = derivedInitialFloor + fIndex;
        const isPenthouse = hasPent && floorNumber === topFloor;
        const isGround = hasGround && floorNumber === derivedInitialFloor;

        // Lista de tipologias aplicáveis por andar (respeita floors_start/end)
        const tipologiasNoAndar = typologies.filter((tp) => {
          const start = Number(tp.floors_start || typicalStart);
          const end = Number(tp.floors_end || typicalEnd);
          return floorNumber >= start && floorNumber <= end;
        });

        for (let unitNum = 1; unitNum <= unitsPerFloor; unitNum++) {
          const unitSuffix = String(unitNum).padStart(suffixLength, '0');
          const unitIdRaw = `${floorNumber}${unitSuffix}`;
          const unitId = unitIdRaw.padStart(unitWidth, '0');

          // escolher tipologia pelo final
          const mappedId = finalTypologyMap[unitSuffix];
          let tip = mappedId ? typologies.find((tpp) => String(tpp.id) === String(mappedId)) : null;
          if (!tip) {
            unmapped.add(unitSuffix);
            tip = typologies[0] || null;
          }
          // se tip mapeada não aplicável ao andar, tentar fallback para outra aplicável
          if (tip) {
            const start = Number(tip.floors_start || typicalStart);
            const end = Number(tip.floors_end || typicalEnd);
            if (!(floorNumber >= start && floorNumber <= end)) {
              const fallback = tipologiasNoAndar[0] || tip;
              tip = fallback;
            }
          }
          if (!tip) continue; // sem tipologias definidas

          const key = `${t.id}::${unitId}`;
          const duplicateExisting = !ignoreExistingUnits && Array.isArray(existingUnits) && existingUnits.some((u) => {
            const matchTower = String(u.torre_id ?? u.tower_id) === String(t.id);
            const matchUnit = String(u.numero_unidade ?? u.unit_number) === String(unitId);
            return matchTower && matchUnit;
          });
          if (duplicateExisting || seen.has(key)) continue;

          const area = parseAreaDecimal(tip.area || 0);
          // cálculo base por modo
          let ff = 1;
          let basePrice = 0;
          if (pricingMode === 'kr') {
            ff = computeFactorKR({ finalSuffix: unitSuffix, floor: floorNumber, baseFloor: normalizedKr.baseFloor, krConfig: normalizedKr });
            basePrice = area && cub ? computePriceKR({ area, cub, finalSuffix: unitSuffix, floor: floorNumber, baseFloor: normalizedKr.baseFloor, krConfig: normalizedKr }) : 0;
          } else if (pricingMode === 'floorFactor') {
            ff = resolveFactor(floorNumber);
            basePrice = area && cub ? Number((area * cub * ff).toFixed(2)) : 0;
          } else if (pricingMode === 'coeff') {
            // Base: área * VUV (preço da unidade padrão no andar base)
            basePrice = area && vuv ? Number((area * vuv).toFixed(2)) : 0;
            // CANDAR: +% por andar acima do baseFloor
            const baseFloorC = Number(coeffConfig.floor?.baseFloor || 1);
            const pctFloor = Number(String(coeffConfig.floor?.percentPerFloor || '0').replace(',', '.')) / 100;
            const floorsAbove = Math.max(0, floorNumber - baseFloorC);
            const candar = 1 + (pctFloor > 0 ? pctFloor * floorsAbove : 0);
            // CPLANTA: usar appreciation_factor da tipologia (string com vírgula)
            const cplanta = Number(String(tip.appreciation_factor ?? '1').replace(',', '.')) || 1;
            // CPOSIÇÃO: mapear pela posição da tipologia
            const posKey = String(tip.position || '').trim().toLowerCase();
            const findPosFactor = () => {
              const entries = Object.entries(coeffConfig.positionFactors || {});
              // match insensível
              for (const [label, fac] of entries) {
                if (String(label).trim().toLowerCase().includes(posKey) || posKey.includes(String(label).trim().toLowerCase())) {
                  return Number(String(fac).replace(',', '.')) || 1;
                }
              }
              // heurísticas simples
              if (/frente/.test(posKey)) return Number(String(coeffConfig.positionFactors['Frente Mar'] || '1').replace(',', '.')) || 1;
              if (/lateral/.test(posKey)) return Number(String(coeffConfig.positionFactors['Lateral'] || '1').replace(',', '.')) || 1;
              if (/fundo/.test(posKey)|/fundos/.test(posKey)) return Number(String(coeffConfig.positionFactors['Fundos'] || '1').replace(',', '.')) || 1;
              return 1;
            };
            const cpos = posKey ? findPosFactor() : 1;
            // CGARAGEM: multiplicador por nº de vagas OU adição fixa por vaga
            let cgar = 1;
            let addGarage = 0;
            const parkingSpots = Number(tip.parking ?? 0);
            if (coeffConfig.garage?.method === 'factor') {
              const f = (coeffConfig.garage?.factors || {})[String(parkingSpots)];
              cgar = f != null ? (Number(String(f).replace(',', '.')) || 1) : 1;
            } else if (coeffConfig.garage?.method === 'add') {
              const per = parseDecimal(coeffConfig.garage?.addPerSpot || 0);
              addGarage = per * parkingSpots;
            }
            let priceC = basePrice * candar * cplanta * cpos * cgar + addGarage;
            basePrice = Number(priceC.toFixed(2));
          }
          const isCorner = typeof tip.position === 'string' && /canto/i.test(tip.position);
          const appreciation = Number(String(tip.appreciation_factor ?? 1).replace(',', '.'));
          const finalPrice = pricingMode === 'coeff'
            ? basePrice
            : applyRules({ basePrice, floorNumber, isPenthouse, isGround, isCorner, appreciationFactor: appreciation });
          const visualType = tip.name || (tip.unit_type_id ? (utLabel(tip.unit_type_id) || 'Tipo') : 'Tipo');

          generated.push({
            id: `gen_${t.id}_${unitId}`,
            obra_id: projectId || null,
            torre_id: t.id,
            numero_unidade: unitId,
            pavimento: `${floorNumber}º andar`,
            tipo: visualType,
            area_privativa: area,
            area_total: area,
            status_venda: 'disponível',
            valor: roundMoney(finalPrice),
            caracteristicas_especificas: '',
            project_id: projectId || null,
            tower_id: t.id,
            unit_number: unitId,
            floor: floorNumber,
            type: visualType,
            area_private: area,
            bedrooms: tip.bedrooms ?? null,
            bathrooms: null,
            parking: tip.parking ?? null,
            price: roundMoney(finalPrice),
            sale_status: 'disponível',
            specific_features: '',
            unit_type_id: tip.unit_type_id ? Number(tip.unit_type_id) : null,
            floor_factor: ff,
            cubReferencia: pricingMode==='coeff' ? null : (cub || null),
            id_cubAtual: savedCubId,
            valor_atualizado: roundMoney(finalPrice),
            __unit_type_label: tip.unit_type_id ? (utLabel(tip.unit_type_id)) : null,
          });
          seen.add(key);
        }
      }
      if (unmapped.size > 0) {
        const list = Array.from(unmapped).sort().join(', ');
        toast({ title: 'Mapeamento incompleto', description: `Finais sem tipologia: ${list}. Foi usada a tipologia padrão para estes finais.`, variant: 'default' });
      }
    };

    towerList.forEach(genForTower);

    if (!generated.length) {
      if (!silent) toast({ title: 'Aviso', description: 'Nenhuma unidade gerada. Verifique os parâmetros.', variant: 'warning' });
      return;
    }

    setLastGenerated(generated);
    if (emitToParent) {
      await onUnitsGenerated(generated, { persistToDb: false, approved: false });
    }
    if (!silent) toast({ title: '✅ Unidades geradas', description: `${generated.length} unidades criadas a partir das tipologias.` });
    setConfirmAgreed(false);
  };

  const persistGenerated = async () => {
    if (!lastGenerated.length) {
      toast({ title: 'Nada a salvar', description: 'Gere unidades primeiro.' });
      return;
    }
    if (!confirmAgreed) {
      toast({ title: 'Aprovação pendente', description: 'Marque a confirmação antes de salvar.' });
      return;
    }
    setIsPersisting(true);
    try {
      await onUnitsGenerated(lastGenerated, { persistToDb: !!projectId, approved: true });
      if (!projectId) {
        toast({ title: '✅ Unidades aprovadas', description: 'As unidades foram aprovadas e serão salvas ao salvar a obra.' });
      }
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: e.message || 'Falha inesperada', variant: 'destructive' });
    } finally {
      setIsPersisting(false);
    }
  };

  const canNext = () => {
    if (step === 1) return Boolean(general.towerId);
    if (step === 2) return typologies.length > 0;
    return true;
  };

  const StepHeader = ({ title, icon }) => (
    <CardHeader>
      <CardTitle className="text-white flex items-center gap-2">
        {icon} {title}
      </CardTitle>
    </CardHeader>
  );

  const renderStep1 = () => (
    <Card className="glass-effect border-slate-700">
      <StepHeader title="Etapa 1 — Dados gerais" icon={<Bot className="w-5 h-5" />} />
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Torre</Label>
          <Select value={String(general.towerId)} onValueChange={(v) => setGeneral((p) => ({ ...p, towerId: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a torre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as torres</SelectItem>
              {towers.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Número de pavimentos</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={general.floors}
              onChange={(e) => setGeneral((p) => ({ ...p, floors: maskInteger(e.target.value) }))}
              placeholder="10"
            />
          </div>
          <div className="space-y-2">
            <Label>Unidades por pavimento</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={general.unitsPerFloor}
              onChange={(e) => setGeneral((p) => ({ ...p, unitsPerFloor: maskInteger(e.target.value) }))}
              placeholder="4"
            />
          </div>
        </div>
        {/* Campos de CUB foram movidos para a Etapa 3 (Regras/Coeficientes) */}
      </CardContent>
    </Card>
  );

  const TypologyCard = React.memo(({ t }) => {
    const [local, setLocal] = useState(() => ({
      name: t.name || '',
      unit_type_id: t.unit_type_id ? String(t.unit_type_id) : 'none',
      area: formatAreaDecimal(t.area),
      bedrooms: String(t.bedrooms ?? ''),
      suites: String(t.suites ?? ''),
      parking: String(t.parking ?? ''),
      appreciation_factor: String(t.appreciation_factor ?? ''),
      floors_start: String(t.floors_start ?? ''),
      floors_end: String(t.floors_end ?? ''),
      position: t.position ?? '',
      per_floor_quantity: String(t.per_floor_quantity ?? ''),
    }));

    // sincroniza quando troca a tipologia (id diferente)
    useEffect(() => {
      setLocal({
        name: t.name || '',
        unit_type_id: t.unit_type_id ? String(t.unit_type_id) : 'none',
        area: formatAreaDecimal(t.area),
        bedrooms: String(t.bedrooms ?? ''),
        suites: String(t.suites ?? ''),
        parking: String(t.parking ?? ''),
        appreciation_factor: String(t.appreciation_factor ?? ''),
        floors_start: String(t.floors_start ?? ''),
        floors_end: String(t.floors_end ?? ''),
        position: t.position ?? '',
        per_floor_quantity: String(t.per_floor_quantity ?? ''),
      });
    }, [t.id]);

    return (
      <div className="border border-slate-700 rounded p-3 space-y-3">
        <div className="flex justify-between items-center">
          <div className="font-semibold text-white">{local.name || t.name}</div>
          <Button type="button" variant="ghost" size="icon" onClick={() => removeTypology(t.id)} title="Remover tipologia">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input
              value={local.name}
              onChange={(e) => setLocal((p) => ({ ...p, name: e.target.value }))}
              onBlur={(e) => updateTypology(t.id, 'name', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Unit Type (opcional)</Label>
            <Select
              value={local.unit_type_id}
              onValueChange={(v) => {
                setLocal((p) => ({ ...p, unit_type_id: v }));
                updateTypology(t.id, 'unit_type_id', v === 'none' ? '' : v);
              }}
              disabled={loadingTypes}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingTypes ? 'Carregando...' : 'Selecione'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(Nenhum)</SelectItem>
                {unitTypes.map((ut) => (
                  <SelectItem key={ut.id} value={String(ut.id)}>
                    {ut.position} {ut.area ? `(${ut.area} m²)` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Área privativa (m²)</Label>
            <Input
              value={local.area}
              onChange={(e) => setLocal((p) => ({ ...p, area: maskDecimal2(e.target.value) }))}
              onBlur={(e) => {
                const v = formatAreaDecimal(e.target.value);
                setLocal((p) => ({ ...p, area: v }));
                updateTypology(t.id, 'area', v);
              }}
              placeholder="70,00"
            />
          </div>
          <div className="space-y-1">
            <Label>Dormitórios</Label>
            <Select
              value={local.bedrooms && /^(?:[1-5])$/.test(local.bedrooms) ? local.bedrooms : 'none'}
              onValueChange={(v) => {
                const val = v === 'none' ? '' : v;
                setLocal((p) => ({ ...p, bedrooms: val }));
                updateTypology(t.id, 'bedrooms', val);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(Selecione)</SelectItem>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Suítes</Label>
            <Select
              value={local.suites && /^(?:[1-5])$/.test(local.suites) ? local.suites : 'none'}
              onValueChange={(v) => {
                const val = v === 'none' ? '' : v;
                setLocal((p) => ({ ...p, suites: val }));
                updateTypology(t.id, 'suites', val);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(Selecione)</SelectItem>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Vagas</Label>
            <Select
              value={local.parking && /^(?:[1-5])$/.test(local.parking) ? local.parking : 'none'}
              onValueChange={(v) => {
                const val = v === 'none' ? '' : v;
                setLocal((p) => ({ ...p, parking: val }));
                updateTypology(t.id, 'parking', val);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(Selecione)</SelectItem>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Fator de valorização (x)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={local.appreciation_factor}
              onChange={(e) => setLocal((p) => ({ ...p, appreciation_factor: maskDecimal4(e.target.value) }))}
              onBlur={(e) => { const v = formatFactorDisplay(e.target.value); setLocal((p)=>({ ...p, appreciation_factor: v })); updateTypology(t.id, 'appreciation_factor', v); }}
              placeholder="1,00"
            />
          </div>
          <div className="space-y-1">
            <Label>Andares aplicáveis (início)</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={local.floors_start}
              onChange={(e) => setLocal((p) => ({ ...p, floors_start: maskInteger(e.target.value) }))}
              onBlur={(e) => updateTypology(t.id, 'floors_start', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Andares aplicáveis (fim)</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={local.floors_end}
              onChange={(e) => setLocal((p) => ({ ...p, floors_end: maskInteger(e.target.value) }))}
              onBlur={(e) => updateTypology(t.id, 'floors_end', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Posição no pavimento</Label>
            <Input
              value={local.position}
              onChange={(e) => setLocal((p) => ({ ...p, position: e.target.value }))}
              onBlur={(e) => updateTypology(t.id, 'position', e.target.value)}
              placeholder="frente / lateral / fundo / canto"
            />
          </div>
          <div className="space-y-1">
            <Label>Qtd. por pavimento</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={local.per_floor_quantity}
              onChange={(e) => setLocal((p) => ({ ...p, per_floor_quantity: maskInteger(e.target.value) }))}
              onBlur={(e) => updateTypology(t.id, 'per_floor_quantity', e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  });

  const renderStep2 = () => (
    <Card className="glass-effect border-slate-700">
      <StepHeader title="Etapa 2 — Tipologias" icon={<Bot className="w-5 h-5" />} />
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-slate-300">Cadastre os modelos que se repetem em vários pavimentos.</div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={addTypology}>
              <PlusCircle className="w-4 h-4 mr-2" /> Adicionar tipologia
            </Button>
            <Button type="button" variant="secondary" onClick={() => recoverTypologiesFromExistingUnits({ merge: false })}>
              Recuperar tipologias
            </Button>
            <Button type="button" variant="ghost" onClick={() => recoverTypologiesFromExistingUnits({ merge: true })}>
              Mesclar recuperadas
            </Button>
            <Button type="button" onClick={async ()=>{
              try{
                // Salvar/atualizar tipologias como unit_types
                const saved = [];
                const savedByLocalId = {};
                for (const tp of typologies){
                  const parsedArea = parseAreaDecimal(tp.area);
                  const payload = {
                    id: tp.unit_type_id && String(tp.unit_type_id).match(/^\d+$/) ? Number(tp.unit_type_id) : undefined,
                    name: tp.name || null,
                    position: tp.position || (tp.name || null),
                    bedrooms: tp.bedrooms ?? '',
                    parking_spots: tp.parking ?? 0,
                    area: parsedArea > 0 ? parsedArea : null,
                    valuation_factor: tp.appreciation_factor != null && tp.appreciation_factor !== '' ? parseDecimal(tp.appreciation_factor) : null,
                    base_price: null
                  };
                  const res = await unitTypeService.save(payload);
                  const data = res?.data || res;
                  const savedRow = data?.data || data;
                  if (savedRow) {
                    saved.push(savedRow);
                    if (savedRow.id != null) {
                      savedByLocalId[String(tp.id)] = String(savedRow.id);
                    }
                  }
                }
                // Recarregar lista de tipos e vincular IDs às tipologias
                const listRes = await unitTypeService.list();
                const list = listRes?.data || listRes || [];
                setUnitTypes(list);
                setTypologies(prev => prev.map(tp => {
                  if (savedByLocalId[String(tp.id)]) {
                    return { ...tp, unit_type_id: Number(savedByLocalId[String(tp.id)]) };
                  }
                  const areaParsed = parseAreaDecimal(tp.area);
                  const match = list.find(ut => String(ut.name||ut.position||'').trim() === String(tp.name||'').trim() && Number(ut.area||0) === areaParsed);
                  return match ? { ...tp, unit_type_id: match.id } : tp;
                }));
                toast({ title:'Tipologias salvas', description:`${saved.length} registro(s) em unit_types.`});
              } catch(e){
                toast({ title:'Erro ao salvar tipologias', description: e.message || 'Falha inesperada', variant:'destructive' });
              }
            }}>Salvar tipologias</Button>
            <Button type="button" variant="secondary" onClick={() => {
              try {
                const headers = ['id','name','unit_type_id','area','bedrooms','suites','parking','appreciation_factor','floors_start','floors_end','position','per_floor_quantity'];
                const rows = typologies.map(t => [
                  t.id,
                  (t.name||'').toString().replaceAll(';',','),
                  t.unit_type_id ?? '',
                  t.area ?? '',
                  t.bedrooms ?? '',
                  t.suites ?? '',
                  t.parking ?? '',
                  (t.appreciation_factor ?? 1),
                  t.floors_start ?? '',
                  t.floors_end ?? '',
                  (t.position||'').toString().replaceAll(';',','),
                  t.per_floor_quantity ?? ''
                ]);
                const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tipologias_fatores_${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (e) {
                toast({ title: 'Falha ao exportar', description: e.message || 'Erro inesperado', variant: 'destructive' });
              }
            }}>
              Exportar fatores (CSV)
            </Button>
          </div>
        </div>
        {typologies.length === 0 && (
          <div className="text-slate-400">Nenhuma tipologia adicionada ainda.</div>
        )}
        <div className="space-y-3">
          {typologies.map((t) => (
            <TypologyCard key={t.id} t={t} />
          ))}
        </div>

        {/* Mapeamento por final (pilha) */}
        <div className="mt-4 border border-slate-700 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white font-semibold">Tipologia por Final (pilha)</h4>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // autopreencher: 01->tip[0], 02->tip[1], looping
                  const ups = (() => {
                    if (general.towerId === 'ALL') {
                      const max = towers.reduce((m, t) => Math.max(m, Number(t.unitsPerFloor || 0)), 0);
                      return max || Number(general.unitsPerFloor || 0) || 0;
                    }
                    const tsel = towers.find((t) => String(t.id) === String(general.towerId));
                    return Number(tsel?.unitsPerFloor || general.unitsPerFloor || 0);
                  })();
                  const map = {};
                  for (let i = 1; i <= ups; i++) {
                    const sfx = String(i).padStart(2, '0');
                    const tip = typologies[(i - 1) % Math.max(1, typologies.length)];
                    if (tip) map[sfx] = String(tip.id);
                  }
                  setFinalTypologyMap(map);
                }}
                disabled={typologies.length === 0}
              >
                Autopreencher
              </Button>
              <Button type="button" variant="ghost" onClick={() => setFinalTypologyMap({})}>Limpar</Button>
            </div>
          </div>
          <p className="text-slate-400 text-sm mb-3">Defina qual tipologia se aplica a cada final (ex.: 01 → Tipo A, 02 → Tipo B). O gerador usará esse mapeamento para todos os pavimentos.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {(() => {
              const ups = (() => {
                if (general.towerId === 'ALL') {
                  const max = towers.reduce((m, t) => Math.max(m, Number(t.unitsPerFloor || 0)), 0);
                  return max || Number(general.unitsPerFloor || 0) || 0;
                }
                const tsel = towers.find((t) => String(t.id) === String(general.towerId));
                return Number(tsel?.unitsPerFloor || general.unitsPerFloor || 0);
              })();
              const items = [];
              for (let i = 1; i <= ups; i++) {
                const sfx = String(i).padStart(2, '0');
                items.push(
                  <div key={sfx} className="space-y-1">
                    <Label>Final {sfx}</Label>
                    <Select
                      value={finalTypologyMap[sfx] ? String(finalTypologyMap[sfx]) : 'none'}
                      onValueChange={(val) => setFinalTypologyMap((prev) => ({ ...prev, [sfx]: val === 'none' ? '' : val }))}
                      disabled={typologies.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={typologies.length ? 'Selecione' : 'Adicione tipologias primeiro'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">(Nenhuma)</SelectItem>
                        {typologies.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }
              return items;
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep3 = () => (
    <Card className="glass-effect border-slate-700">
      <StepHeader title="Etapa 3 — Regras de valorização" icon={<Bot className="w-5 h-5" />} />
      <CardContent className="space-y-4">
          {/* Configuração de coeficientes (fatores) */}
            <div className="space-y-4">
              {/* CUB: seleção e cadastro */}
              <div className="border border-slate-700 rounded p-3 space-y-2">
                <div className="text-white font-semibold">CUB — Seleção e Cadastro</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Selecionar CUB</Label>
                    <select className="h-10 w-full bg-slate-900 border border-slate-700 rounded px-2" value={selectedCubId} onChange={(e)=>{
                      const id = e.target.value; setSelectedCubId(id);
                      const row = (cubList||[]).find(r => String(r.id ?? r.ID) === String(id));
                      if (row) {
                        setGeneral((p)=> ({...p, cubValue: row.valorAtual != null ? String(row.valorAtual).replace('.', ',') : '', cubDate: row.vigencia ? String(row.vigencia).slice(0,7) : '' }));
                        generateUnits({ silent: true, emitToParent: false, ignoreExistingUnits: true });
                      }
                    }} disabled={loadingCubs || !cubList.length}>
                      {!cubList.length && <option>Sem CUB cadastrado</option>}
                      {cubList.map(r => (
                        <option key={r.id ?? r.ID} value={String(r.id ?? r.ID)}>{`R$ ${(Number(r.valorAtual)||0).toLocaleString('pt-BR', { minimumFractionDigits:2 })} (${String(r.vigencia||'').slice(0,7)})`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Novo CUB (R$/m²)</Label>
                    <Input type="text" value={newCub.valor} onChange={(e)=> setNewCub((p)=> ({...p, valor: maskDecimal2(e.target.value)}))} onBlur={(e)=> setNewCub((p)=> ({...p, valor: formatDecimal(e.target.value)}))} placeholder="ex.: 2.850,00" />
                  </div>
                  <div className="space-y-1">
                    <Label>Vigência (YYYY-MM)</Label>
                    <Input type="text" value={newCub.vigencia} onChange={(e)=> setNewCub((p)=> ({...p, vigencia: maskYearMonth(e.target.value)}))} placeholder="2025-10" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="button" variant="outline" disabled={savingNewCub || !newCub.valor || !newCub.vigencia} onClick={async ()=>{
                    const v = parseDecimal(newCub.valor||0); if(!v || !newCub.vigencia) return;
                    setSavingNewCub(true);
                    try{
                      const saved = await cubService.save({ valorAtual: v, vigencia: newCub.vigencia, variacao: null });
                      toast({ title:'CUB salvo', description:`R$ ${v.toLocaleString('pt-BR', {minimumFractionDigits:2})} (${newCub.vigencia})` });
                      // reload list
                      const res = await cubService.list();
                      const rows = res?.data || res || [];
                      setCubList(rows);
                      const last = rows[0];
                      if (last) { setSelectedCubId(String(last.id ?? last.ID)); setGeneral((p)=> ({...p, cubValue: last.valorAtual != null ? String(last.valorAtual).replace('.', ',') : '', cubDate: last.vigencia ? String(last.vigencia).slice(0,7) : '' })); }
                      setNewCub({ valor:'', vigencia:'' });
                      generateUnits({ silent: true, emitToParent: false, ignoreExistingUnits: true });
                    }catch(e){
                      toast({ title:'Erro ao salvar CUB', description: e.message || 'Falha inesperada', variant:'destructive' });
                    }finally{
                      setSavingNewCub(false);
                    }
                  }}>{savingNewCub? 'Salvando...' : 'Salvar novo CUB'}</Button>
                </div>
              </div>

              {/* Base (coeficientes) */}
              <div className="border border-slate-700 rounded p-3 space-y-2">
                <div className="text-white font-semibold">1) Preço Base</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>VUV — Valor unitário (R$/m²)</Label>
                    <Input type="text" value={coeffConfig.vuv} onChange={(e)=> setCoeffConfig((p)=> ({...p, vuv: maskDecimal2(e.target.value)}))} onBlur={(e)=> setCoeffConfig((p)=> ({...p, vuv: formatDecimal(e.target.value)}))} placeholder="ex.: 8.500,00" />
                  </div>
                  <div className="space-y-1">
                    <Label>Área é por tipologia</Label>
                    <div className="h-10 flex items-center text-slate-400 text-sm">Usaremos a área da tipologia em cada unidade</div>
                  </div>
                </div>
              </div>

              {/* Fatores */}
              <div className="border border-slate-700 rounded p-3 space-y-3">
                <div className="text-white font-semibold">2) Fatores de valorização</div>
                {/* CANDAR */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Andar base (CANDAR)</Label>
                    <Input type="text" inputMode="numeric" value={String(coeffConfig.floor.baseFloor ?? '')} onChange={(e)=> setCoeffConfig((p)=> ({...p, floor: { ...p.floor, baseFloor: maskInteger(e.target.value) }}))} placeholder="ex.: 1" />
                  </div>
                  <div className="space-y-1">
                    <Label>+% por andar acima do base</Label>
                    <Input type="text" inputMode="decimal" value={String(coeffConfig.floor.percentPerFloor ?? '')} onChange={(e)=> setCoeffConfig((p)=> ({...p, floor: { ...p.floor, percentPerFloor: maskDecimal4(e.target.value) }}))} placeholder="ex.: 3" />
                  </div>
                  <div className="space-y-1">
                    <Label>Observação</Label>
                    <div className="h-10 flex items-center text-slate-400 text-sm">Preço = Base × (1 + % × andares acima)</div>
                  </div>
                </div>

                {/* CPOSIÇÃO */}
                <div className="space-y-2">
                  <Label>Posição (CPOSIÇÃO) — fatores</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {Object.entries(coeffConfig.positionFactors || {}).map(([label, val]) => (
                      <div key={label} className="flex items-center gap-2">
                        <Input className="h-9" defaultValue={label} onBlur={(e)=>{
                          const old = label;
                          const v = String(e.target.value || '').trim();
                          if (!v || v === old) return;
                          setCoeffConfig((p)=>{
                            const pf = { ...(p.positionFactors || {}) };
                            const current = pf[old];
                            delete pf[old];
                            pf[v] = current;
                            return { ...p, positionFactors: pf };
                          });
                        }} />
                        <Input className="h-9" value={val} onChange={(e)=> setCoeffConfig((p)=> ({...p, positionFactors: { ...(p.positionFactors||{}), [label]: maskDecimal4(e.target.value) }}))} />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={()=> setCoeffConfig((p)=> ({...p, positionFactors: { ...(p.positionFactors||{}), 'Nova posição': '1,00' }}))}>Adicionar posição</Button>
                    <Button type="button" variant="ghost" onClick={()=> setCoeffConfig((p)=> ({...p, positionFactors: { 'Frente Mar': '1,10', 'Lateral': '1,05', 'Fundos': '1,00' }}))}>Restaurar padrão</Button>
                  </div>
                </div>

                {/* CGARAGEM */}
                <div className="space-y-2">
                  <Label>Vagas de Garagem (CGARAGEM)</Label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="radio" name="garageMode" checked={coeffConfig.garage.method==='factor'} onChange={()=> setCoeffConfig((p)=> ({...p, garage: { ...p.garage, method: 'factor' }}))} /> Multiplicador por nº de vagas
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="radio" name="garageMode" checked={coeffConfig.garage.method==='add'} onChange={()=> setCoeffConfig((p)=> ({...p, garage: { ...p.garage, method: 'add' }}))} /> Soma valor por vaga
                    </label>
                  </div>
                  {coeffConfig.garage.method==='factor' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {Object.entries(coeffConfig.garage.factors || {}).map(([spots, fac]) => (
                        <div key={spots} className="flex items-center gap-2">
                          <Input className="h-9" defaultValue={spots} onBlur={(e)=>{
                            const old = spots;
                            const v = maskInteger(e.target.value) || '0';
                            if (!v || v === old) return;
                            setCoeffConfig((p)=>{
                              const fs = { ...(p.garage.factors || {}) };
                              const cur = fs[old];
                              delete fs[old];
                              fs[v] = cur;
                              return { ...p, garage: { ...p.garage, factors: fs } };
                            });
                          }} />
                          <Input className="h-9" value={fac} onChange={(e)=> setCoeffConfig((p)=> ({...p, garage: { ...p.garage, factors: { ...(p.garage.factors||{}), [spots]: maskDecimal4(e.target.value) } }}))} />
                        </div>
                      ))}
                      <Button type="button" variant="outline" onClick={()=> setCoeffConfig((p)=> ({...p, garage: { ...p.garage, factors: { ...(p.garage.factors||{}), ['3']: '1,10' } }}))}>Adicionar (3→1,10)</Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label>Valor por vaga (R$)</Label>
                        <Input type="text" value={coeffConfig.garage.addPerSpot} onChange={(e)=> setCoeffConfig((p)=> ({...p, garage: { ...p.garage, addPerSpot: maskDecimal2(e.target.value) }}))} onBlur={(e)=> setCoeffConfig((p)=> ({...p, garage: { ...p.garage, addPerSpot: formatDecimal(e.target.value) }}))} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>


        {/* Pré-visualização e confirmação */}
        <div className="border border-slate-700 rounded p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-white font-semibold">Pré-visualização</div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => generateUnits({ silent: true, emitToParent: false, ignoreExistingUnits: true })}>Recalcular com parâmetros atuais</Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>CUB selecionado</Label>
              <div className="h-10 flex items-center text-slate-300">
                {selectedCubId
                  ? (()=>{ const r=(cubList||[]).find(x=> String(x.id??x.ID)===String(selectedCubId)); return r? `R$ ${(Number(r.valorAtual)||0).toLocaleString('pt-BR',{minimumFractionDigits:2})} (${String(r.vigencia||'').slice(0,7)})` : '-'; })()
                  : '-' }
              </div>
            </div>
            <div className="space-y-1">
              <Label>Torre selecionada</Label>
              <div className="h-10 flex items-center text-slate-300">{selectedTower ? (selectedTower.name || selectedTower.id) : (general.towerId==='ALL' ? 'Todas' : '-')}</div>
            </div>
            <div className="space-y-1">
              <Label>Resumo</Label>
              <div className="h-10 flex items-center text-slate-300">{lastGenerated.length} unidade(s)</div>
            </div>
          </div>

          {lastGenerated.length > 0 ? (
            <div className="max-h-80 overflow-auto border border-slate-800 rounded">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 text-slate-300">
                  <tr>
                    <th className="text-left p-2">Unidade</th>
                    <th className="text-left p-2">Pavimento</th>
                    <th className="text-left p-2">Tipo</th>
                    <th className="text-right p-2">Área (m²)</th>
                    <th className="text-right p-2">Valor (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {lastGenerated.slice(0, 50).map((u) => (
                    <tr key={u.id} className="odd:bg-slate-900/40">
                      <td className="p-2 text-white">{u.numero_unidade}</td>
                      <td className="p-2 text-slate-300">{u.pavimento}</td>
                      <td className="p-2 text-slate-300">{u.tipo}</td>
                      <td className="p-2 text-right text-slate-200">{u.area_privativa}</td>
                      <td className="p-2 text-right text-blue-300">{Number(u.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {lastGenerated.length > 50 && (
                <div className="text-center text-slate-400 text-xs py-2">Mostrando 50 de {lastGenerated.length} itens</div>
              )}
            </div>
          ) : (
            <div className="text-slate-400 text-sm">Gere as unidades para visualizar a prévia.</div>
          )}

          <div className="flex items-center gap-2">
            <input id="confirmAgree" type="checkbox" checked={confirmAgreed} onChange={(e) => setConfirmAgreed(e.target.checked)} />
            <Label htmlFor="confirmAgree">Confirmo que revisei a prévia e os valores estão corretos.</Label>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
          <Button type="button" onClick={() => generateUnits()}>Gerar unidades</Button>
          <Button type="button" variant="outline" className="flex items-center gap-2" disabled={!lastGenerated.length || isPersisting || !confirmAgreed} onClick={persistGenerated}>
            <UploadCloud className="w-4 h-4" /> {isPersisting ? 'Salvando...' : (projectId ? 'Confirmar e salvar na API' : 'Confirmar para salvar com a obra')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}

      <div className="flex justify-between items-center">
        <Button type="button" variant="outline" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <div className="text-slate-400">Etapa {step} de 3</div>
        {step < 3 ? (
          <Button type="button" disabled={!canNext()} onClick={() => setStep((s) => Math.min(3, s + 1))}>
            Avançar <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={generateUnits}>
            Gerar unidades
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProjectUnitsWizard;
