/* formulas-utils.js (vanilla)
 * Reglas enterales: calcular mL/día y mL/h para cubrir requerimiento actual.
 * Redondeo: mL/h entero; mL/día entero.
 */

(function () {
  'use strict';

  function num(x) {
    const n = Number(x);
    return Number.isFinite(n) ? n : NaN;
  }

  function roundInt(x) {
    if (!Number.isFinite(x)) return NaN;
    return Math.round(x);
  }

  function safeDiv(a, b) {
    return (Number.isFinite(a) && Number.isFinite(b) && b !== 0) ? (a / b) : NaN;
  }

  function getKcalPerMl(formula) {
    const kcal = num(formula?.kcal_por_volumen);
    const vol = num(formula?.volumen_base_ml);
    return safeDiv(kcal, vol);
  }

  function getGramsPerMl(formula, key) {
    const g = num(formula?.[key]);
    const vol = num(formula?.volumen_base_ml);
    return safeDiv(g, vol);
  }

  /**
   * @param {number} reqKcalDay - requerimiento actual (kcal/día)
   * @param {object} formula - objeto formula desde window.FORMULAS
   */
  function calcEnteralPlan(reqKcalDay, formula) {
    const req = num(reqKcalDay);
    const kcalMl = getKcalPerMl(formula);

    if (!Number.isFinite(req) || !Number.isFinite(kcalMl) || kcalMl <= 0) {
      return { ok: false, reason: 'Datos insuficientes para calcular (requerimiento o densidad inválidos).' };
    }

    // volumen objetivo por día (sin redondeo)
    const mlDayRaw = req / kcalMl;
    const mlHrRaw = mlDayRaw / 24;

    // redondeo clínico (definido por ti)
    const mlHr = roundInt(mlHrRaw);
    const mlDay = roundInt(mlDayRaw);

    // aportes reales tras redondeo
    const kcalReal = kcalMl * mlDay;
    const covPct = (req > 0) ? (kcalReal / req) * 100 : NaN;

    const protMl = getGramsPerMl(formula, 'prote_g_por_volumen');
    const choMl = getGramsPerMl(formula, 'chos_g_por_volumen');
    const fatMl = getGramsPerMl(formula, 'grasa_g_por_volumen');
    const fibMl = getGramsPerMl(formula, 'fibra_g_por_volumen');

    const protG = Number.isFinite(protMl) ? protMl * mlDay : NaN;
    const choG = Number.isFinite(choMl) ? choMl * mlDay : NaN;
    const fatG = Number.isFinite(fatMl) ? fatMl * mlDay : NaN;
    const fibG = Number.isFinite(fibMl) ? fibMl * mlDay : 0;

    // kcal aportadas por macronutriente (convención)
    const protKcal = Number.isFinite(protG) ? protG * 4 : NaN;
    const choKcal = Number.isFinite(choG) ? choG * 4 : NaN;
    const fatKcal = Number.isFinite(fatG) ? fatG * 9 : NaN;

    return {
      ok: true,
      mlHr,
      mlDay,
      kcalMl,
      kcalReal,
      covPct,
      macros: {
        protG,
        protKcal,
        choG,
        choKcal,
        fatG,
        fatKcal,
        fibG,
      },
    };
  }

  function formatKcalMl(formula) {
    const kcalMl = getKcalPerMl(formula);
    return Number.isFinite(kcalMl) ? kcalMl.toFixed(2) : '—';
  }

  window.FormulasUtils = {
    calcEnteralPlan,
    getKcalPerMl,
    formatKcalMl,
  };
})();
