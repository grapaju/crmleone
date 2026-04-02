// DEPRECATED: Este componente foi substituído pelo ProjectUnitsWizard e não é mais usado.
import React, { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Bot, FileUp, UploadCloud } from "lucide-react";
import { unitService } from "@/services/unitService";
import { unitTypeService } from "@/services/unitTypeService";

const ProjectFormUnitsBatch = ({
  towers,
  onUnitsGenerated,
  existingUnits,
  projectId,
  autoPersist = true,
  onPersistResult,
}) => {
  const [isPersisting, setIsPersisting] = useState(false);
  const [lastGenerated, setLastGenerated] = useState([]);
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  // Funções de máscara decimal
  const formatDecimal = (value) => {
    if (value === "" || value == null) return "";
    const num = Number(
      String(value)
        .replace(/[^0-9.-]+/g, "")
        .replace(/,/g, ".")
    );
    if (isNaN(num)) return "";
    return num.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const parseDecimal = (masked) => {
    if (!masked && masked !== 0) return "";
    const cleaned = String(masked)
      .replace(/\./g, "")
      .replace(/,/g, ".")
      .replace(/[^0-9.-]+/g, "");
    const n = Number(cleaned);
    return isNaN(n) ? "" : n;
  };

  const firstTower = towers[0] || {};
  const [generator, setGenerator] = useState({
    towerId: firstTower?.id || "",
    floors: firstTower?.floors || 10,
    unitsPerFloor: firstTower?.unitsPerFloor || 4,
    unitType: "2 quartos",
    area: formatDecimal(70),
    price: formatDecimal(400000),
    // mapas por final (pilha). Ex: { '1': '75,00', '2': '72,50' }
    areasByStack: {},
    typesByStack: {},
    bedrooms: 2,
    parking: 1,
    bedroomsByStack: {},
    parkingByStack: {},
    pricesByStack: {},
    cubReferencia: "",
    id_cubAtual: "",
    // unit types (relacional)
    unitTypeId: "", // default unit_type_id
    unitTypesByStack: {}, // mapping final => unit_type_id
  });

  // estados "raw" para permitir digitação parcial sem perder conteúdo
  const [rawAreasByStack, setRawAreasByStack] = useState("");
  const [rawTypesByStack, setRawTypesByStack] = useState("");
  const [rawBedroomsByStack, setRawBedroomsByStack] = useState("");
  const [rawParkingByStack, setRawParkingByStack] = useState("");
  const [rawPricesByStack, setRawPricesByStack] = useState("");
  const [rawUnitTypesByStack, setRawUnitTypesByStack] = useState("");

  // lista de tipos de unidade (unit_types table)
  const [unitTypes, setUnitTypes] = useState([]);
  const [loadingUnitTypes, setLoadingUnitTypes] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadTypes = async () => {
      setLoadingUnitTypes(true);
      try {
        const resp = await unitTypeService.list();
        const list = resp?.data || resp || [];
        if (mounted) setUnitTypes(list);
      } catch (e) {
        toast({
          title: "Tipos de unidade",
          description: e.message || "Falha ao carregar",
          variant: "destructive",
        });
      } finally {
        if (mounted) setLoadingUnitTypes(false);
      }
    };
    loadTypes();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // inicializa raw quando carregar torre ou generator inicial
  useEffect(() => {
    if (generator.areasByStack && Object.keys(generator.areasByStack).length) {
      setRawAreasByStack(
        Object.entries(generator.areasByStack)
          .map(([k, v]) => `${k}=${v}`)
          .join(",")
      );
    }
    if (generator.typesByStack && Object.keys(generator.typesByStack).length) {
      setRawTypesByStack(
        Object.entries(generator.typesByStack)
          .map(([k, v]) => `${k}=${v}`)
          .join(",")
      );
    }
    if (
      generator.bedroomsByStack &&
      Object.keys(generator.bedroomsByStack).length
    ) {
      setRawBedroomsByStack(
        Object.entries(generator.bedroomsByStack)
          .map(([k, v]) => `${k}=${v}`)
          .join(",")
      );
    }
    if (
      generator.parkingByStack &&
      Object.keys(generator.parkingByStack).length
    ) {
      setRawParkingByStack(
        Object.entries(generator.parkingByStack)
          .map(([k, v]) => `${k}=${v}`)
          .join(",")
      );
    }
    if (
      generator.pricesByStack &&
      Object.keys(generator.pricesByStack).length
    ) {
      setRawPricesByStack(
        Object.entries(generator.pricesByStack)
          .map(([k, v]) => `${k}=${v}`)
          .join(",")
      );
    }
    if (
      generator.unitTypesByStack &&
      Object.keys(generator.unitTypesByStack).length
    ) {
      setRawUnitTypesByStack(
        Object.entries(generator.unitTypesByStack)
          .map(([k, v]) => `${k}=${v}`)
          .join(",")
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parseKeyValueList = (raw, { numericValues = false } = {}) => {
    const map = {};
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((pair) => {
        const [k, ...rest] = pair.split("=");
        if (!k || !rest.length) return; // exige ter '=' e algo após
        const vRaw = rest.join("=").trim();
        if (!vRaw) return;
        map[k.trim()] = numericValues ? vRaw.replace(/[^0-9,\.]/g, "") : vRaw; // armazenar valor cru, area parse será feito depois
      });
    return map;
  };

  const handleGeneratorChange = (field, value) => {
    if (["area", "price", "cubReferencia"].includes(field)) {
      // Permite digitar, mas só números, vírgula e ponto
      const cleaned = String(value).replace(/[^0-9,\.]/g, "");
      setGenerator((prev) => ({ ...prev, [field]: cleaned }));
    } else {
      setGenerator((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleDecimalBlur = (field, value) => {
    const parsed = parseDecimal(value);
    setGenerator((prev) => ({ ...prev, [field]: formatDecimal(parsed) }));
  };

  // tabela de fatores por andar (centralizada para reutilizar no import)
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
    return 1; // fallback improvável
  };

  const handleGenerateUnits = () => {
    let {
      towerId,
      floors,
      unitsPerFloor,
      unitType,
      area,
      price,
      areasByStack,
      typesByStack,
      bedrooms,
      parking,
      bedroomsByStack,
      parkingByStack,
      pricesByStack,
      cubReferencia,
      id_cubAtual,
      unitTypeId,
      unitTypesByStack,
    } = generator;
    area = parseDecimal(area);
    price = parseDecimal(price);
    const cubRefNum = parseDecimal(cubReferencia) || 0;
    // ensure towerId is numeric when possible
    const towerIdNum =
      towerId == null
        ? null
        : Number(towerId) || (typeof towerId === "number" ? towerId : null);
    if (!towerId) {
      toast({
        title: "Erro",
        description: "Selecione uma torre.",
        variant: "destructive",
      });
      return;
    }

    // convert to numbers in case inputs are strings
    floors = Number(floors) || 0;
    unitsPerFloor = Number(unitsPerFloor) || 0;

    const towerObj = towers.find((t) => String(t.id) === String(towerId));
    const initialFloorProp = Number(towerObj?.initialFloor) || 1;
    // Sample de unidade inicial informado pelo usuário (ex: 201, 1101, 0301)
    const initialUnitSample = String(towerObj?.initialUnitStart || "101");
    const unitWidth = initialUnitSample.length; // manter zeros à esquerda se houver
    const suffixLength = 2; // convencionado (01, 02 ...)
    // Tentar deduzir o andar inicial a partir do sample: remover os últimos dígitos do sufixo
    let derivedInitialFloor = initialFloorProp;
    if (initialUnitSample && initialUnitSample.length > suffixLength) {
      const floorPart = initialUnitSample.slice(
        0,
        initialUnitSample.length - suffixLength
      );
      const parsedFloorPart = parseInt(floorPart.replace(/^0+/, "") || "0", 10);
      if (!isNaN(parsedFloorPart) && parsedFloorPart > 0) {
        derivedInitialFloor = parsedFloorPart; // prioriza o que o usuário digitou em "Primeira Unidade"
      }
    }

    // helper para obter tipo selecionado (default ou por pilha)
    const findUnitType = (id) =>
      unitTypes.find((t) => String(t.id) === String(id));

    const newUnits = [];
    for (let fIndex = 0; fIndex < floors; fIndex++) {
      const floorNumber = derivedInitialFloor + fIndex; // andar real (derivado do sample ou prop)
      for (let unitNum = 1; unitNum <= unitsPerFloor; unitNum++) {
        const stack = String(unitNum); // pilha = número sequencial por andar
        const unitSuffix = String(unitNum).padStart(suffixLength, "0");
        // constrói unidade: <floorNumber><unitSuffix>
        const unitIdRaw = `${floorNumber}${unitSuffix}`;
        // ajustar largura se sample tinha mais dígitos
        const unitId = unitIdRaw.padStart(unitWidth, "0");
  // Derivar tipo pela pilha (sufixo) apenas se NÃO houver unit_type_id
  const derivedTypeNumber = parseInt(unitSuffix, 10);
        // unit_type_id definido? considerar override por pilha
        let appliedUnitTypeId = null;
        if (unitTypesByStack && unitTypesByStack[stack] != null) {
          appliedUnitTypeId = unitTypesByStack[stack];
        } else if (unitTypeId) {
          appliedUnitTypeId = unitTypeId;
        }
        const selectedType = appliedUnitTypeId
          ? findUnitType(appliedUnitTypeId)
          : null;
        const baseAreaFromType = selectedType?.area != null ? Number(selectedType.area) : null;
        const baseBedroomsFromType = selectedType?.bedrooms ?? null;
        const baseParkingFromType = selectedType?.parking_spots ?? null;
        const basePriceFromType = selectedType?.base_price != null ? Number(selectedType.base_price) : null;
        const specificArea =
          areasByStack && areasByStack[stack] != null
            ? parseDecimal(areasByStack[stack])
            : baseAreaFromType != null
            ? baseAreaFromType
            : area;
        const specificBedrooms =
          bedroomsByStack && bedroomsByStack[stack] != null
            ? bedroomsByStack[stack]
            : baseBedroomsFromType != null
            ? baseBedroomsFromType
            : bedrooms; // permitir texto (ex: 1 Suíte + 2 Dorm.)
        const specificParking =
          parkingByStack && parkingByStack[stack] != null
            ? Number(parkingByStack[stack])
            : baseParkingFromType != null
            ? Number(baseParkingFromType)
            : Number(parking);
        const specificPrice =
          pricesByStack && pricesByStack[stack] != null
            ? parseDecimal(pricesByStack[stack])
            : basePriceFromType != null
            ? basePriceFromType
            : price;
        const floorFactor = resolveFactor(floorNumber);
        const valorAtualizado =
          specificArea && cubRefNum
            ? Number((specificArea * cubRefNum * floorFactor).toFixed(2))
            : 0;

        const isDuplicate =
          Array.isArray(existingUnits) &&
          existingUnits.some((u) => {
            const matchTower =
              String(u.torre_id) === String(towerIdNum) ||
              String(u.tower_id) === String(towerIdNum);
            const matchUnitNumber =
              String(u.numero_unidade) === String(unitId) ||
              String(u.unit_number) === String(unitId);
            return matchTower && matchUnitNumber;
          });
        if (isDuplicate) continue;

        const unit_type_id_clean = appliedUnitTypeId ? Number(appliedUnitTypeId) : null;
        // Se há unit_type_id, priorizar label do tipo em 'tipo'/'type' (string) para visualização;
        // caso contrário usar derivedTypeNumber.
        const visualType = unit_type_id_clean && selectedType ? selectedType.position : derivedTypeNumber;

        newUnits.push({
          id: `gen_${towerId}_${unitId}`,
          // Português (legacy)
          obra_id: null,
            torre_id: towerIdNum,
          numero_unidade: unitId,
          pavimento: `${floorNumber}º andar`,
          tipo: visualType,
          area_privativa: specificArea,
          area_total: specificArea,
          status_venda: "disponível",
          valor: specificPrice,
          caracteristicas_especificas: "",
          // Inglês (schema units)
          project_id: null,
          tower_id: towerIdNum,
          unit_number: unitId,
          floor: floorNumber,
          type: visualType,
          area_private: specificArea,
          bedrooms: specificBedrooms || null,
          bathrooms: null,
          parking: specificParking || null,
          price: specificPrice,
          sale_status: "disponível",
          specific_features: "",
          // Relação & fatores
          unit_type_id: unit_type_id_clean,
          floor_factor: floorFactor,
          cubReferencia: cubRefNum || null,
          id_cubAtual: id_cubAtual || null,
          valor_atualizado: valorAtualizado || null,
          __unit_type_label: selectedType ? selectedType.position : null,
        });
      }
    }

    if (newUnits.length === 0) {
      toast({
        title: "Aviso",
        description: `Nenhuma unidade nova foi gerada. Verifique duplicatas ou parâmetros.`,
        variant: "warning",
      });
      return;
    }

    setLastGenerated(newUnits);
    onUnitsGenerated(newUnits);
    const totalDisponivel = newUnits.filter(
      (u) => (u.sale_status || u.status_venda) === "disponível"
    ).length;
    const totalReservado = newUnits.filter(
      (u) => (u.sale_status || u.status_venda) === "reservado"
    ).length;
    toast({
      title: "✅ Sucesso",
      description: `${newUnits.length} unidades geradas. Disponíveis: ${totalDisponivel}. Reservadas: ${totalReservado}.`,
    });

    if (autoPersist && projectId) {
      persistUnits(newUnits);
    } else if (!projectId) {
      toast({
        title: "ℹ️ Projeto não salvo",
        description:
          "As unidades foram geradas localmente. Salve o projeto para persistir.",
        variant: "default",
      });
    }
  };

  const persistUnits = async (units) => {
    if (!projectId) {
      toast({
        title: "⚠️ Projeto ausente",
        description: "Não é possível salvar sem projectId.",
        variant: "destructive",
      });
      return;
    }
    if (!Array.isArray(units) || units.length === 0) {
      toast({
        title: "Nada a salvar",
        description: "Gere ou importe unidades primeiro.",
      });
      return;
    }
    setIsPersisting(true);
    try {
      const prepared = units.map((u) => ({
        ...u,
        project_id: projectId,
        obra_id: projectId,
      }));
      const results = await unitService.saveUnitsBulk(prepared);
      const ok = results.filter((r) => r.ok).length;
      const fail = results.length - ok;
      toast({
        title: "📤 Persistência concluída",
        description: `${ok} salvas, ${fail} falharam.`,
      });
      if (onPersistResult) onPersistResult(results);
    } catch (e) {
      toast({
        title: "❌ Erro ao salvar",
        description: e.message || "Falha inesperada",
        variant: "destructive",
      });
    } finally {
      setIsPersisting(false);
    }
  };


  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const importedUnits = jsonData
          .map((row, index) => {
            const towerName = row["Torre"] || towers[0]?.name;
            const tower = towers.find((t) => t.name === towerName);

            if (!tower) return null;

            const unitId = String(row["Unidade"]);
            const isDuplicate = existingUnits.some((u) => {
              const matchTower =
                String(u.torre_id) === String(tower.id) ||
                String(u.tower_id) === String(tower.id);
              const matchUnitNumber =
                String(u.numero_unidade) === unitId ||
                String(u.unit_number) === unitId;
              return matchTower && matchUnitNumber;
            });
            if (isDuplicate) return null;

            // Pavimento pode vir como '10' ou '10º andar' etc
            let rawFloorVal = row["Pavimento"];
            let parsedFloor = null;
            if (rawFloorVal != null) {
              if (typeof rawFloorVal === "number") parsedFloor = rawFloorVal;
              else {
                const onlyDigitsMatch = String(rawFloorVal).match(/(\d+)/);
                if (onlyDigitsMatch) parsedFloor = parseInt(onlyDigitsMatch[1]);
              }
            }
            const towerIdNum =
              tower.id != null ? Number(tower.id) || null : null;

            const cubRef =
              row["cubReferencia"] ||
              row["CUB Referencia"] ||
              row["CUB"] ||
              row["cub_ref"] ||
              null;
            const idCubAtual =
              row["id_cubAtual"] || row["idCubAtual"] || row["ID CUB"] || null;
            const areaPriv =
              parseDecimal(row["Área Privativa"]) ||
              parseDecimal(row["Area Privativa"]) ||
              null;
            const cubRefNum = cubRef ? parseDecimal(cubRef) : 0;
            // tentar casar unit_type
            let unitTypeId = null;
            const tipoRaw = row["Tipo"];
            if (tipoRaw != null && unitTypes.length) {
              const tipoStr = String(tipoRaw).trim().toLowerCase();
              if (/^\d+$/.test(tipoStr)) {
                // numérico pode ser id diretamente
                const num = parseInt(tipoStr, 10);
                if (unitTypes.some((t) => Number(t.id) === num)) unitTypeId = num;
              }
              if (unitTypeId == null) {
                const byPosition = unitTypes.find(
                  (t) => String(t.position).toLowerCase() === tipoStr
                );
                if (byPosition) unitTypeId = byPosition.id;
              }
            }
            const selectedType = unitTypeId
              ? unitTypes.find((t) => Number(t.id) === Number(unitTypeId))
              : null;
            // Se planilha não trouxe area_privativa usar area do unitType
            const finalAreaPriv =
              areaPriv || (selectedType?.area != null ? Number(selectedType.area) : null);
            const floorFactor = parsedFloor ? resolveFactor(parsedFloor) : null;
            const valorAtualizado =
              finalAreaPriv && cubRefNum && floorFactor
                ? Number((finalAreaPriv * cubRefNum * floorFactor).toFixed(2))
                : null;

            return {
              id: `import_${Date.now()}_${index}`,
              // Portuguese keys
              obra_id: null,
              torre_id: towerIdNum,
              numero_unidade: unitId,
              pavimento: row["Pavimento"],
              tipo: row["Tipo"],
              area_privativa: finalAreaPriv,
              area_total: row["Área Total"],
              status_venda: row["Status"]?.toLowerCase() || "disponível",
              valor: row["Valor"],
              caracteristicas_especificas: row["Características"],
              // English keys for backend
              project_id: null,
              tower_id: towerIdNum,
              unit_number: unitId,
              floor: parsedFloor,
              type: row["Tipo"],
              area_private: finalAreaPriv,
              bedrooms: null,
              bathrooms: null,
              price: row["Valor"],
              sale_status: row["Status"]?.toLowerCase() || "disponível",
              specific_features: row["Características"],
              cubReferencia: cubRefNum || null,
              id_cubAtual: idCubAtual || null,
              valor_atualizado: valorAtualizado,
              floor_factor: floorFactor,
              unit_type_id: unitTypeId,
              __unit_type_label: selectedType ? selectedType.position : null,
            };
          })
          .filter(Boolean); // Remove nulls (duplicates or invalid towers)

        onUnitsGenerated(importedUnits);
        toast({
          title: "✅ Sucesso",
          description: `${importedUnits.length} unidades importadas da planilha.`,
        });
      } catch (error) {
        toast({
          title: "❌ Erro na Importação",
          description: "Não foi possível ler o arquivo. Verifique o formato.",
          variant: "destructive",
        });
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null; // Reset input
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="glass-effect border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Bot className="mr-2" /> Geração Automática
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Torre</Label>
            <Select
              value={String(generator.towerId)}
              onValueChange={(value) => handleGeneratorChange("towerId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a torre" />
              </SelectTrigger>
              <SelectContent>
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
              <Label>Nº Andares</Label>
              <Input
                type="number"
                value={generator.floors}
                onChange={(e) =>
                  handleGeneratorChange("floors", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Unidades p/ Andar</Label>
              <Input
                type="number"
                value={generator.unitsPerFloor}
                onChange={(e) =>
                  handleGeneratorChange("unitsPerFloor", e.target.value)
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tipo Padrão</Label>
            <Input
              value={generator.unitType}
              onChange={(e) =>
                handleGeneratorChange("unitType", e.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Unit Type (relacional) padrão</Label>
            <Select
              value={generator.unitTypeId ? String(generator.unitTypeId) : "none"}
              onValueChange={(val) =>
                handleGeneratorChange("unitTypeId", val === "none" ? "" : val)
              }
              disabled={loadingUnitTypes}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingUnitTypes ? "Carregando..." : "Opcional"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(Nenhum)</SelectItem>
                {unitTypes.map((ut) => (
                  <SelectItem key={ut.id} value={String(ut.id)}>
                    {ut.position} {ut.area ? `(${ut.area} m²)` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Área (m²)</Label>
              <Input
                type="text"
                value={generator.area}
                onChange={(e) => handleGeneratorChange("area", e.target.value)}
                onBlur={(e) => handleDecimalBlur("area", e.target.value)}
                placeholder="70,00"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="text"
                value={generator.price}
                onChange={(e) => handleGeneratorChange("price", e.target.value)}
                onBlur={(e) => handleDecimalBlur("price", e.target.value)}
                placeholder="400.000,00"
                inputMode="decimal"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CUB Referência (R$ / m²)</Label>
              <Input
                type="text"
                value={generator.cubReferencia}
                onChange={(e) =>
                  handleGeneratorChange("cubReferencia", e.target.value)
                }
                onBlur={(e) =>
                  handleDecimalBlur("cubReferencia", e.target.value)
                }
                placeholder="2300,00"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-2">
              <Label>ID CUB Atual</Label>
              <Input
                type="text"
                value={generator.id_cubAtual}
                onChange={(e) =>
                  handleGeneratorChange("id_cubAtual", e.target.value)
                }
                placeholder="5"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dormitórios (base)</Label>
              <Input
                type="number"
                value={generator.bedrooms}
                onChange={(e) =>
                  handleGeneratorChange("bedrooms", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Vagas (base)</Label>
              <Input
                type="number"
                value={generator.parking}
                onChange={(e) =>
                  handleGeneratorChange("parking", e.target.value)
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Áreas por Final (pilha)</Label>
              <div className="space-y-2 text-xs border border-slate-600 rounded p-2">
                <p className="text-slate-400">
                  Informe pares final=área (m²) separados por vírgula. Ex:
                  1=75,00,2=72,50
                </p>
                <Input
                  placeholder="1=75,00,2=72,50"
                  value={rawAreasByStack}
                  onChange={(e) => setRawAreasByStack(e.target.value)}
                  onBlur={() => {
                    const map = parseKeyValueList(rawAreasByStack);
                    setGenerator((prev) => ({ ...prev, areasByStack: map }));
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipos por Final (pilha)</Label>
              <div className="space-y-2 text-xs border border-slate-600 rounded p-2">
                <p className="text-slate-400">
                  Informe pares final=tipo separados por vírgula. Ex: 1=2
                  quartos,2=3 quartos
                </p>
                <Input
                  placeholder="1=2 quartos,2=3 quartos"
                  value={rawTypesByStack}
                  onChange={(e) => setRawTypesByStack(e.target.value)}
                  onBlur={() => {
                    const map = parseKeyValueList(rawTypesByStack);
                    setGenerator((prev) => ({ ...prev, typesByStack: map }));
                  }}
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preços por Final (pilha)</Label>
              <div className="space-y-2 text-xs border border-slate-600 rounded p-2">
                <p className="text-slate-400">
                  Informe pares final=preço separados por vírgula. Ex:
                  1=800000,2=850000
                </p>
                <Input
                  placeholder="1=800000,2=850000"
                  value={rawPricesByStack}
                  onChange={(e) => setRawPricesByStack(e.target.value)}
                  onBlur={() => {
                    const map = parseKeyValueList(rawPricesByStack);
                    setGenerator((prev) => ({ ...prev, pricesByStack: map }));
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Unit Types por Final (pilha)</Label>
              <div className="space-y-2 text-xs border border-slate-600 rounded p-2">
                <p className="text-slate-400">
                  Informe pares final=unit_type_id. Ex: 1=3,2=5. Aceita id ou deixa vazio.
                </p>
                <Input
                  placeholder="1=3,2=5"
                  value={rawUnitTypesByStack}
                  onChange={(e) => setRawUnitTypesByStack(e.target.value)}
                  onBlur={() => {
                    const map = parseKeyValueList(rawUnitTypesByStack);
                    setGenerator((prev) => ({ ...prev, unitTypesByStack: map }));
                  }}
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dormitórios por Final</Label>
              <div className="space-y-2 text-xs border border-slate-600 rounded p-2">
                <p className="text-slate-400">
                  Ex: 1=2,2=3 (final 1 tem 2 dorms, final 2 tem 3)
                </p>
                <Input
                  placeholder="1=2,2=3"
                  value={rawBedroomsByStack}
                  onChange={(e) => setRawBedroomsByStack(e.target.value)}
                  onBlur={() => {
                    const map = parseKeyValueList(rawBedroomsByStack, {
                      numericValues: true,
                    });
                    setGenerator((prev) => ({ ...prev, bedroomsByStack: map }));
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Vagas por Final</Label>
              <div className="space-y-2 text-xs border border-slate-600 rounded p-2">
                <p className="text-slate-400">
                  Ex: 1=1,2=2 (final 1 tem 1 vaga, final 2 tem 2)
                </p>
                <Input
                  placeholder="1=1,2=2"
                  value={rawParkingByStack}
                  onChange={(e) => setRawParkingByStack(e.target.value)}
                  onBlur={() => {
                    const map = parseKeyValueList(rawParkingByStack, {
                      numericValues: true,
                    });
                    setGenerator((prev) => ({ ...prev, parkingByStack: map }));
                  }}
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              onClick={handleGenerateUnits}
              className="w-full"
              disabled={isPersisting}
            >
              Gerar Unidades
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPersisting || !lastGenerated.length || !projectId}
              onClick={() => persistUnits(lastGenerated)}
              className="w-full flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />{" "}
              {isPersisting ? "Salvando..." : "Salvar na API"}
            </Button>
          </div>

          {/* Exibição de prévia das unidades geradas (se houver lastGenerated) */}
          {lastGenerated.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-white mb-2">
                Unidades Geradas (Prévia)
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {lastGenerated.map((unit) => (
                  <div
                    key={unit.id}
                    className="bg-slate-800 p-4 rounded-lg border border-slate-700"
                  >
                    <div className="flex justify-between text-sm text-slate-400">
                      <span>
                        {unit.pavimento} - {unit.numero_unidade}
                      </span>
                      <span>{unit.__unit_type_label}</span>
                    </div>
                    <div className="text-white">
                      Área Privativa: {unit.area_privativa} m²
                    </div>
                    <div className="text-white">
                      Valor: R$ {formatDecimal(unit.valor)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-effect border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <FileUp className="mr-2" /> Importar Planilha
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-4 h-full">
          <p className="text-slate-400 text-center">
            Importe um arquivo .xlsx ou .csv com as colunas: Torre, Unidade,
            Pavimento, Tipo, Área Privativa, Área Total, Status, Valor,
            Características, cubReferencia, id_cubAtual.
          </p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            accept=".xlsx, .csv"
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current.click()}
            variant="outline"
            className="w-full"
          >
            <FileUp className="w-4 h-4 mr-2" /> Selecionar Arquivo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectFormUnitsBatch;
