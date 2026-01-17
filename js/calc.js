/* calc.js (vanilla)
 * Cálculos clínicos del MVP: MST, talla estimada, IMC, GLIM (regla), basal + actual.
 */

(function () {
  'use strict';

  function n(x) {
    const v = Number(x);
    return Number.isFinite(v) ? v : NaN;
  }

  function clamp(v, a, b) {
    if (!Number.isFinite(v)) return NaN;
    return Math.min(b, Math.max(a, v));
  }

  // ---------- MST ----------
  // MST clásico: pérdida de peso (según kg) + disminución de ingesta.
  // Si "unsure" en pérdida de peso => +2.
  function mstScore(weightLossMode, kgLost, lessIntakeYesNo) {
    let s1 = 0;
    if (weightLossMode === 'no') s1 = 0;
    else if (weightLossMode === 'unsure') s1 = 2;
    else if (weightLossMode === 'yes') {
      const kg = n(kgLost);
      // Rangos típicos MST:
      // 1-5 kg => 1, 6-10 => 2, 11-15 => 3, >15 => 4.
      if (!Number.isFinite(kg) || kg <= 0) s1 = 0;
      else if (kg <= 5) s1 = 1;
      else if (kg <= 10) s1 = 2;
      else if (kg <= 15) s1 = 3;
      else s1 = 4;
    }

    const s2 = (lessIntakeYesNo === 'yes') ? 1 : 0;
    const total = s1 + s2;
    return {
      total,
      risk: total >= 2 ? 'En riesgo' : 'Sin riesgo',
    };
  }

  // ---------- Talla estimada (altura talón-rodilla) ----------
  function estimateHeightCm({ edad, sexo, rodillaCm }) {
    const age = n(edad);
    const knee = n(rodillaCm);
    if (!Number.isFinite(age) || !Number.isFinite(knee) || knee <= 0) return NaN;

    // Validación pedida: solo 18-90.
    if (age < 18 || age > 90) return NaN;

    const isMale = String(sexo).toUpperCase() === 'M';

    // 60-90:
    if (age >= 60) {
      if (isMale) return (2.02 * knee) - (0.04 * age) + 64.19;
      return (1.83 * knee) - (0.24 * age) + 84.88;
    }

    // 18-60:
    if (isMale) return (1.88 * knee) + 71.85;
    return (1.87 * knee) - (0.06 * age) + 70.25;
  }

  // ---------- IMC ----------
  function bmi(pesoKg, tallaCm) {
    const w = n(pesoKg);
    const hcm = n(tallaCm);
    if (!Number.isFinite(w) || !Number.isFinite(hcm) || w <= 0 || hcm <= 0) return NaN;
    const hm = hcm / 100;
    return w / (hm * hm);
  }

  function bmiCategory(bmiVal) {
    const b = n(bmiVal);
    if (!Number.isFinite(b)) return '—';
    if (b < 18.5) return 'Bajo peso';
    if (b < 25) return 'Normal';
    if (b < 30) return 'Sobrepeso';
    return 'Obesidad';
  }

  // ---------- GLIM (regla mínima) ----------
  function glimDx({ phenos, etios, severityOverride }) {
    const phen = Array.isArray(phenos) ? phenos.filter(Boolean).length : 0;
    const eti = Array.isArray(etios) ? etios.filter(Boolean).length : 0;
    const dx = (phen >= 1 && eti >= 1);

    let sev = '—';
    if (dx) sev = 'No especificada';
    if (dx && severityOverride) sev = severityOverride;

    return { dx, sev };
  }

  // ---------- Requerimiento basal ----------
  // Nota: MVP, adulto. Si quieres pediatría o ajustes, lo hacemos en la fase 2.
  function basalMSJ({ sexo, edad, pesoKg, tallaCm }) {
    const age = n(edad), w = n(pesoKg), h = n(tallaCm);
    if (![age, w, h].every(Number.isFinite)) return NaN;
    if (age <= 0 || w <= 0 || h <= 0) return NaN;
    // MSJ: 10w + 6.25h - 5a + s ; s=+5 hombre, -161 mujer
    const s = String(sexo).toUpperCase() === 'M' ? 5 : -161;
    return (10 * w) + (6.25 * h) - (5 * age) + s;
  }

  function basalHB({ sexo, edad, pesoKg, tallaCm }) {
    const age = n(edad), w = n(pesoKg), h = n(tallaCm);
    if (![age, w, h].every(Number.isFinite)) return NaN;
    if (age <= 0 || w <= 0 || h <= 0) return NaN;

    // Harris-Benedict revisada (Roza & Shizgal) - versión común:
    const isMale = String(sexo).toUpperCase() === 'M';
    if (isMale) return 88.362 + (13.397 * w) + (4.799 * h) - (5.677 * age);
    return 447.593 + (9.247 * w) + (3.098 * h) - (4.330 * age);
  }

  function basalKcalKg({ pesoKg, kcalKg }) {
    const w = n(pesoKg);
    const k = n(kcalKg);
    if (![w, k].every(Number.isFinite) || w <= 0 || k <= 0) return NaN;
    return w * k;
  }

  function calcRequerimientos({ method, sexo, edad, pesoKg, tallaCm, kcalKg, factorEstres }) {
    let basal = NaN;
    if (method === 'msj') basal = basalMSJ({ sexo, edad, pesoKg, tallaCm });
    else if (method === 'hb') basal = basalHB({ sexo, edad, pesoKg, tallaCm });
    else if (method === 'kcalkg') basal = basalKcalKg({ pesoKg, kcalKg });

    const fe = clamp(n(factorEstres), 0.5, 3.0);
    const actual = Number.isFinite(basal) && Number.isFinite(fe) ? basal * fe : NaN;

    return { basal, actual, factorEstres: fe };
  }

  window.Calc = {
    mstScore,
    estimateHeightCm,
    bmi,
    bmiCategory,
    glimDx,
    calcRequerimientos,
  };
})();
