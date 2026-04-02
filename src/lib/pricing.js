// Utilities for unit pricing based on CUB with per-stack (final) coefficients
// Contract:
// - computeFactorKR({ finalSuffix, floor, baseFloor, krConfig }) => multiplier to apply on (area * CUB)
// - computePriceKR({ area, cub, finalSuffix, floor, baseFloor, krConfig }) => price in R$
//
// krConfig shape:
// {
//   baseFloor: 6, // default floor for base k
//   finals: {
//     '01': { k: 3.861, r: 0.0423, exceptions: { 7:0.0424, 8:0.0424, 9:0.0423, 10:0.0423, 11:0.0423, 12:0.0424, 13:0.0423, 14:0.03, 15:0.0423, 16:0.0423, 17:0.0352 } },
//     '02': { k: 3.815, r: 0.03 },
//     ...
//   }
// }

export function computeFactorKR({ finalSuffix, floor, baseFloor = 6, krConfig }) {
  if (!finalSuffix || !krConfig) return 1;
  const finals = krConfig.finals || {};
  const key = String(finalSuffix).padStart(2, '0');
  const cfg = finals[key];
  if (!cfg || !cfg.k) return 1;

  const f = Number(floor);
  const base = Number(krConfig.baseFloor ?? baseFloor ?? 6);
  if (!Number.isFinite(f) || !Number.isFinite(base)) return cfg.k;

  if (f <= base) return cfg.k; // below or at base uses k only

  const steps = f - base;
  const rDefault = Number(cfg.r ?? 0);
  const exceptions = cfg.exceptions || {};

  // compound growth across steps from (base+1 .. f)
  let growth = 1;
  for (let i = 1; i <= steps; i++) {
    const targetFloor = base + i; // e.g., 7, 8, ..., f
    const rStep = (exceptions[targetFloor] != null) ? Number(exceptions[targetFloor]) : rDefault;
    growth *= (1 + (rStep || 0));
  }
  return cfg.k * growth;
}

export function computePriceKR({ area, cub, finalSuffix, floor, baseFloor = 6, krConfig }) {
  const a = Number(area || 0);
  const c = Number(cub || 0);
  if (!a || !c) return 0;
  const factor = computeFactorKR({ finalSuffix, floor, baseFloor, krConfig });
  return a * c * factor;
}

export function roundMoney(v) {
  return Math.round(Number(v || 0) * 100) / 100;
}
