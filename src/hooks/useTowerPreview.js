import { useMemo } from 'react';

/**
 * Gera um preview dos números de unidades que seriam criados para uma torre
 * sem realmente persistir/criar os registros. Também expõe validações e
 * possíveis conflitos com unidades já existentes em outras torres.
 *
 * Regras assumidas:
 * - initialUnitStart: Ex: "101" => prefixo (floor) + sufixo de 2 dígitos (pilha)
 * - O sufixo (últimos 2 dígitos) é incrementado para cada unidade no mesmo andar
 * - O prefixo (andar) parte de initialFloor e incrementa até (initialFloor + floors - 1)
 * - Número final = <andar><sufixoBase + indiceUnidade(0..unitsPerFloor-1)>
 *
 * Limitações / Futuras extensões:
 * - Não trata subsolos ou andares não sequenciais
 * - Assume sempre 2 dígitos de sufixo (compatível com lógica de pilhas existente)
 */
export function useTowerPreview(tower, allTowers, allUnits) {
  return useMemo(() => {
    const result = {
      units: [], // todos os números previstos
      sample: [], // amostra para UI
      total: 0,
      errors: [],
      warnings: [],
      duplicatesWithOtherTowers: [],
      baseSuffix: null,
      floorFromStartNumber: null,
      isValid: true,
    };

    if (!tower) {
      result.errors.push('Torre inválida.');
      result.isValid = false;
      return result;
    }

    const floors = parseInt(tower.floors, 10);
    const unitsPerFloor = parseInt(tower.unitsPerFloor, 10);
    const initialFloor = parseInt(tower.initialFloor ?? tower.initial_floor ?? 1, 10);
    const initialUnitStart = String(tower.initialUnitStart ?? tower.initial_unit_start ?? '').trim();

    if (!floors || floors < 1) {
      result.errors.push('Informe o número de andares (>0).');
    }
    if (!unitsPerFloor || unitsPerFloor < 1) {
      result.errors.push('Informe as unidades por andar (>0).');
    }
    if (!initialUnitStart) {
      result.errors.push('Informe a primeira unidade (ex: 101).');
    }

    if (result.errors.length) {
      result.isValid = false;
      return result;
    }

    // Extrair sufixo (2 últimas casas) e prefixo (andar declarado no número inicial)
    const suffix = initialUnitStart.slice(-2);
    const prefixPart = initialUnitStart.slice(0, -2);
    let floorFromStartNumber = parseInt(prefixPart, 10);
    if (isNaN(floorFromStartNumber)) {
      // fallback: usar initialFloor se prefixo não parseável
      floorFromStartNumber = initialFloor;
      result.warnings.push('Prefixo do número inicial não pôde ser interpretado; usando andar inicial informado.');
    }
    result.baseSuffix = suffix;
    result.floorFromStartNumber = floorFromStartNumber;

    if (floorFromStartNumber !== initialFloor) {
      result.warnings.push(`Andar do número inicial (${floorFromStartNumber}) diferente do campo "Andar Inicial" (${initialFloor}).`);
    }
    if (!/^[0-9]{2}$/.test(suffix)) {
      result.errors.push('A primeira unidade deve terminar com dois dígitos (ex: 101, 1201 não suportado).');
    }

    const numericSuffix = parseInt(suffix, 10);
    if (numericSuffix + unitsPerFloor - 1 > 99) {
      result.errors.push('Sufixo + unidades por andar excede 2 dígitos (máx 99).');
    }

    if (result.errors.length) {
      result.isValid = false;
      return result;
    }

    const generated = [];
    for (let f = 0; f < floors; f++) {
      const floorNumber = initialFloor + f;
      for (let u = 0; u < unitsPerFloor; u++) {
        const unitNumber = `${floorNumber}${String(numericSuffix + u).padStart(2, '0')}`;
        generated.push(unitNumber);
      }
    }
    result.units = generated;
    result.total = generated.length;
    result.sample = generated.slice(0, Math.min(8, generated.length));

    // Detectar duplicados com outras torres (olhar units existentes com torre diferente)
    const otherUnits = (allUnits || []).filter(u => String(u.torre_id) !== String(tower.id));
    const otherNumbers = new Set(
      otherUnits
        .map(u => String(u.numero_unidade || u.unit_number || ''))
        .filter(Boolean)
    );
    const duplicates = generated.filter(num => otherNumbers.has(String(num)));
    if (duplicates.length) {
      result.duplicatesWithOtherTowers = duplicates.slice(0, 20); // limitar
      result.warnings.push(`${duplicates.length} número(s) já existem em outras torres.`);
    }

    // Checar interseção com números já presentes nesta torre (possível re-geração)
    const thisTowerExisting = (allUnits || [])
      .filter(u => String(u.torre_id) === String(tower.id))
      .map(u => String(u.numero_unidade || u.unit_number || ''))
      .filter(Boolean);
    if (thisTowerExisting.length) {
      const existingSet = new Set(thisTowerExisting);
      const overlap = generated.filter(n => existingSet.has(n));
      if (overlap.length) {
        result.warnings.push(`${overlap.length} número(s) já cadastrados nesta torre serão reutilizados se gerar novamente.`);
      }
    }

    return result;
  }, [tower, allTowers, allUnits]);
}

export default useTowerPreview;
