/* app.js (vanilla)
 * Orquesta UI: navegación por pasos + recalculo en vivo.
 */

(function () {
  'use strict';

  // ---------- helpers DOM ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function setText(id, text) {
    const el = typeof id === 'string' ? $(id) : id;
    if (el) el.textContent = String(text);
  }

  function show(el, yes) {
    if (!el) return;
    el.hidden = !yes;
  }

  function fmt(n, digits = 0) {
    const v = Number(n);
    if (!Number.isFinite(v)) return '—';
    return v.toFixed(digits);
  }

  function fmtPct0(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return '—';
    return `${v.toFixed(0)}%`;
  }

  function fmtPct1(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return '—';
    return `${v.toFixed(1)}%`;
  }

  // ---------- state ----------
  const state = {
    step: 1,
    tallaEstimada: false,
    selectedFormulaId: null,

    // Cobertura
    targetPct: 80,
    targetMode: 'slider', // 'slider' | 'manual'
  };

  // ---------- elements ----------
  const stepButtons = $$('#stepper .step');
  const panels = $$('[data-panel]');

  const btnPrev = $('#btnPrev');
  const btnNext = $('#btnNext');
  const btnReset = $('#btnReset');

  // MST
  const mstWeightLoss = $('#mstWeightLoss');
  const mstKgWrap = $('#mstKgWrap');
  const mstKg = $('#mstKg');
  const mstLessIntake = $('#mstLessIntake');

  // Datos
  const edad = $('#edad');
  const sexo = $('#sexo');
  const peso = $('#peso');
  const talla = $('#talla');
  const btnUseKnee = $('#btnUseKnee');
  const kneeWrap = $('#kneeWrap');
  const rodilla = $('#rodilla');
  const kneeBadge = $('#kneeBadge');
  const globalNotes = $('#globalNotes');

  // GLIM
  const glimWL = $('#glimWL');
  const glimLowBMI = $('#glimLowBMI');
  const glimLowMM = $('#glimLowMM');
  const glimLowIntake = $('#glimLowIntake');
  const glimInflamm = $('#glimInflamm');
  const glimSeverity = $('#glimSeverity');

  // Basal
  const basalMethod = $('#basalMethod');
  const kcalKgWrap = $('#kcalKgWrap');
  const kcalKg = $('#kcalKg');
  const factorEstres = $('#factorEstres');

  // Enteral
  const formulaSelect = $('#formulaSelect');
  const enteralAlert = $('#enteralAlert');
  const covSlider = $('#covSlider');
  const covInput = $('#covInput');

  // Resumen
  const summary = $('#summary');
  const btnCopy = $('#btnCopy');
  const copyOk = $('#copyOk');

  // ---------- navigation ----------
  function goToStep(step) {
    const s = Math.max(1, Math.min(7, Number(step) || 1));
    state.step = s;

    panels.forEach((p) => (p.hidden = Number(p.dataset.panel) !== s));

    stepButtons.forEach((b) => {
      const isActive = Number(b.dataset.step) === s;
      b.classList.toggle('is-active', isActive);
    });

    btnPrev.disabled = s === 1;
    btnNext.textContent = s === 7 ? 'Listo' : 'Siguiente';
  }

  stepButtons.forEach((b) => {
    b.addEventListener('click', () => goToStep(b.dataset.step));
  });

  btnPrev.addEventListener('click', () => goToStep(state.step - 1));
  btnNext.addEventListener('click', () => {
    if (state.step < 7) goToStep(state.step + 1);
  });

  // ---------- MST UI ----------
  mstWeightLoss.addEventListener('change', () => {
    show(mstKgWrap, mstWeightLoss.value === 'yes');
    recalcAll();
  });
  mstKg.addEventListener('input', recalcAll);
  mstLessIntake.addEventListener('change', recalcAll);

  // ---------- Talla estimada ----------
  btnUseKnee.addEventListener('click', () => {
    state.tallaEstimada = !state.tallaEstimada;
    show(kneeWrap, state.tallaEstimada);
    show(kneeBadge, state.tallaEstimada);

    if (state.tallaEstimada) {
      talla.value = '';
      talla.disabled = true;
      try { rodilla.focus(); } catch {}
    } else {
      talla.disabled = false;
      rodilla.value = '';
    }

    recalcAll();
  });
  [edad, sexo, peso, talla, rodilla].forEach((el) => el.addEventListener('input', recalcAll));
  sexo.addEventListener('change', recalcAll);

  // ---------- GLIM ----------
  [glimWL, glimLowBMI, glimLowMM, glimLowIntake, glimInflamm].forEach((el) => el.addEventListener('change', recalcAll));
  glimSeverity.addEventListener('change', recalcAll);

  // ---------- Basal ----------
  basalMethod.addEventListener('change', () => {
    show(kcalKgWrap, basalMethod.value === 'kcalkg');
    recalcAll();
  });
  [kcalKg, factorEstres].forEach((el) => el.addEventListener('input', recalcAll));

  // ---------- Enteral ----------
  formulaSelect.addEventListener('change', () => {
    state.selectedFormulaId = formulaSelect.value || null;
    state.targetMode = 'slider';
    recalcAll();
  });

  // Cobertura: slider / input
  if (covSlider) {
    covSlider.addEventListener('input', () => {
      state.targetMode = 'slider';
      state.targetPct = Number(covSlider.value);
      recalcAll();
    });
  }

  if (covInput) {
    covInput.addEventListener('input', () => {
      const v = Number(covInput.value);
      if (Number.isFinite(v)) {
        state.targetMode = 'manual';
        state.targetPct = v;
        recalcAll();
      }
    });
  }

  // ---------- Reset ----------
  btnReset.addEventListener('click', () => {
    document.querySelectorAll('input, select, textarea').forEach((el) => {
      if (el.tagName === 'SELECT') {
        el.selectedIndex = 0;
      } else if (el.type === 'checkbox') {
        el.checked = false;
      } else {
        el.value = '';
      }
    });

    factorEstres.value = '1.2';
    kcalKg.value = '25';
    state.tallaEstimada = false;
    state.selectedFormulaId = null;

    state.targetPct = 80;
    state.targetMode = 'slider';
    if (covSlider) covSlider.value = '80';
    if (covInput) covInput.value = '80';

    show(kneeWrap, false);
    show(kneeBadge, false);
    show(mstKgWrap, false);
    enteralAlert.hidden = true;
    goToStep(1);
    initFormulasSelect();
    recalcAll();
  });

  // ---------- Formulas ----------
  function initFormulasSelect() {
    const formulas = Array.isArray(window.FORMULAS) ? window.FORMULAS : [];
    formulaSelect.innerHTML = '';

    const opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = formulas.length ? 'Selecciona una fórmula…' : 'No hay fórmulas cargadas';
    formulaSelect.appendChild(opt0);

    formulas
      .slice()
      .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'))
      .forEach((f) => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = `${f.nombre} · ${f.laboratorio || '—'} · ${f.densidad_kcal_ml ?? '—'} kcal/mL`;
        formulaSelect.appendChild(opt);
      });

    state.selectedFormulaId = null;
  }

  function getSelectedFormula() {
    const formulas = Array.isArray(window.FORMULAS) ? window.FORMULAS : [];
    const id = state.selectedFormulaId;
    if (!id) return null;
    return formulas.find((f) => f.id === id) || null;
  }

  // Slider-mode: buscar porcentaje que corresponda a mL/h entero cercano a approxPct
  function findPctForClosedMlh(reqActual, formula, approxPct) {
    const base = window.FormulasUtils.calcEnteralPlan(reqActual, formula);
    if (!base.ok) return null;

    const ml100 = Number(base.mlHr);
    if (!Number.isFinite(ml100) || ml100 <= 0) return null;

    const start = Math.max(1, Math.floor(ml100 * 0.3));
    const end = Math.max(start, Math.ceil(ml100 * 1.5));

    let best = null;
    for (let ml = start; ml <= end; ml++) {
      const pct = (ml / ml100) * 100;
      const diff = Math.abs(pct - approxPct);
      if (!best || diff < best.diff) best = { ml, pct, diff, ml100 };
    }
    return best;
  }

  // ---------- Recalculo central ----------
  function recalcAll() {
    // MST
    const mst = window.Calc.mstScore(mstWeightLoss.value, mstKg.value, mstLessIntake.value);
    setText('#mstScore', mst.total);
    setText('#mstRisk', mst.risk);

    // Talla usada
    let tallaCm = Number(talla.value);
    if (state.tallaEstimada) {
      const est = window.Calc.estimateHeightCm({ edad: edad.value, sexo: sexo.value, rodillaCm: rodilla.value });
      if (Number.isFinite(est)) tallaCm = est;
    }
    setText('#tallaUsada', Number.isFinite(tallaCm) ? `${tallaCm.toFixed(1)} cm${state.tallaEstimada ? ' (estimada)' : ''}` : '—');

    // IMC
    const imc = window.Calc.bmi(peso.value, tallaCm);
    setText('#imc', Number.isFinite(imc) ? imc.toFixed(1) : '—');
    setText('#imcCat', window.Calc.bmiCategory(imc));

    // GLIM
    const phenos = [glimWL.checked, glimLowBMI.checked, glimLowMM.checked];
    const etios = [glimLowIntake.checked, glimInflamm.checked];
    const glim = window.Calc.glimDx({ phenos, etios, severityOverride: glimSeverity.value || '' });
    setText('#glimDx', glim.dx ? 'Desnutrición (GLIM +)' : 'No cumple');
    setText('#glimSev', glim.dx ? glim.sev : '—');

    // Requerimientos
    const req = window.Calc.calcRequerimientos({
      method: basalMethod.value,
      sexo: sexo.value,
      edad: edad.value,
      pesoKg: peso.value,
      tallaCm,
      kcalKg: kcalKg.value,
      factorEstres: factorEstres.value,
    });

    setText('#reqBasal', Number.isFinite(req.basal) ? `${Math.round(req.basal)} kcal/día` : '—');
    setText('#reqActual', Number.isFinite(req.actual) ? `${Math.round(req.actual)} kcal/día` : '—');

    // Enteral
    const formula = getSelectedFormula();
    let planForNotes = null;

    if (formula) {
      setText('#fDens', `${window.FormulasUtils.getKcalPerMl(formula).toFixed(2)} kcal/mL`);
      setText('#fOsm', (formula.osmolaridad != null && Number.isFinite(Number(formula.osmolaridad))) ? `${Number(formula.osmolaridad).toFixed(0)} mOsm/L` : '—');
      setText('#fTipo', formula.tipo || '—');
      setText('#fLab', formula.laboratorio || '—');

      let pctToUse = Number(state.targetPct);
      if (!Number.isFinite(pctToUse)) pctToUse = 80;

      if (state.targetMode === 'slider') {
        const best = (Number.isFinite(req.actual) && req.actual > 0) ? findPctForClosedMlh(req.actual, formula, pctToUse) : null;
        if (best) pctToUse = best.pct;
      }

      // Sincronizar controles
      if (covInput) covInput.value = Number.isFinite(pctToUse) ? pctToUse.toFixed(1) : '80.0';
      if (covSlider) covSlider.value = String(Math.round(pctToUse));
      state.targetPct = pctToUse;

      const kcalTarget = Number.isFinite(req.actual) ? (req.actual * (pctToUse / 100)) : NaN;
      const plan = window.FormulasUtils.calcEnteralPlan(kcalTarget, formula);
      planForNotes = plan;

      if (!plan.ok) {
        show(enteralAlert, true);
        enteralAlert.textContent = plan.reason;
        setText('#mlh', '—');
        setText('#mld', '—');
        setText('#kcalReal', '—');
        setText('#covPct', '—');
        setText('#pG', '—');
        setText('#pK', '—');
        setText('#cG', '—');
        setText('#cK', '—');
        setText('#gG', '—');
        setText('#gK', '—');
        setText('#fG', '—');
      } else {
        show(enteralAlert, false);
        setText('#mlh', `${plan.mlHr} mL/h`);
        setText('#mld', `${plan.mlDay} mL/día`);
        setText('#kcalReal', `${Math.round(plan.kcalReal)} kcal/día`);

        const covOverall = (Number.isFinite(req.actual) && req.actual > 0)
          ? (plan.kcalReal / req.actual) * 100
          : NaN;
        setText('#covPct', fmtPct1(covOverall));

        setText('#pG', Number.isFinite(plan.macros.protG) ? plan.macros.protG.toFixed(1) : '—');
        setText('#pK', Number.isFinite(plan.macros.protKcal) ? `${Math.round(plan.macros.protKcal)} kcal` : '—');
        setText('#cG', Number.isFinite(plan.macros.choG) ? plan.macros.choG.toFixed(1) : '—');
        setText('#cK', Number.isFinite(plan.macros.choKcal) ? `${Math.round(plan.macros.choKcal)} kcal` : '—');
        setText('#gG', Number.isFinite(plan.macros.fatG) ? plan.macros.fatG.toFixed(1) : '—');
        setText('#gK', Number.isFinite(plan.macros.fatKcal) ? `${Math.round(plan.macros.fatKcal)} kcal` : '—');
        setText('#fG', Number.isFinite(plan.macros.fibG) ? plan.macros.fibG.toFixed(1) : '0.0');

        const alerts = [];
        if (plan.mlHr > 200) alerts.push('Velocidad alta (>200 mL/h): verificar tolerancia / datos.');
        if (plan.mlHr < 10) alerts.push('Velocidad muy baja (<10 mL/h): verificar objetivo / datos.');
        if (alerts.length) {
          show(enteralAlert, true);
          enteralAlert.textContent = alerts.join(' ');
        }
      }
    } else {
      setText('#fDens', '—');
      setText('#fOsm', '—');
      setText('#fTipo', '—');
      setText('#fLab', '—');
      show(enteralAlert, false);
      setText('#mlh', '—');
      setText('#mld', '—');
      setText('#kcalReal', '—');
      setText('#covPct', '—');
      setText('#pG', '—');
      setText('#pK', '—');
      setText('#cG', '—');
      setText('#cK', '—');
      setText('#gG', '—');
      setText('#gK', '—');
      setText('#fG', '—');
    }

    // Notas/advertencias
    renderGlobalNotes({ formula, plan: planForNotes, reqActual: req.actual });

    // Resumen
    renderSummary({ mst, tallaCm, imc, glim, req, formula });
  }

  function renderGlobalNotes({ formula, plan, reqActual }) {
    if (!globalNotes) return;
    const notes = [];

    if (!formula) {
      notes.push({ kind: 'note', text: 'Selecciona una fórmula para ver recomendaciones (osmolaridad, densidad, velocidad y tolerancia).', });
    } else {
      const osm = Number(formula.osmolaridad);
      const dens = window.FormulasUtils.getKcalPerMl(formula);

      if (Number.isFinite(osm)) {
        if (osm >= 400) notes.push({ kind: 'danger', text: `Osmolaridad alta (${Math.round(osm)} mOsm/L): mayor riesgo de intolerancia; vigilar y considerar ajustes.`, });
        else if (osm >= 300) notes.push({ kind: 'warn', text: `Osmolaridad intermedia (${Math.round(osm)} mOsm/L): vigilar tolerancia (diarrea, distensión, residuo).`, });
      }

      if (Number.isFinite(dens) && dens >= 1.5) {
        notes.push({ kind: 'warn', text: `Alta densidad (${dens.toFixed(2)} kcal/mL): ajustar velocidad e hidratación; vigilar tolerancia.`, });
      }

      if (plan && plan.ok) {
        if (plan.mlHr > 200) notes.push({ kind: 'danger', text: `Velocidad elevada (${plan.mlHr} mL/h): verificar tolerancia y revisar datos/objetivo.`, });
        if (plan.mlHr < 10) notes.push({ kind: 'warn', text: `Velocidad muy baja (${plan.mlHr} mL/h): revisar objetivo; puede ser poco práctica.`, });

        const covOverall = (Number.isFinite(reqActual) && reqActual > 0) ? (plan.kcalReal / reqActual) * 100 : NaN;
        if (Number.isFinite(covOverall)) {
          const diff = Math.abs(covOverall - state.targetPct);
          if (diff > 10) notes.push({ kind: 'warn', text: `Cobertura real (${covOverall.toFixed(1)}%) difiere del objetivo (${Number(state.targetPct).toFixed(1)}%) por redondeo.`, });
        }
      }

      if (!Number.isFinite(Number(reqActual))) {
        notes.push({ kind: 'warn', text: 'Requerimiento actual inválido: completa basal y factor de estrés para prescripción enteral.', });
      }
    }

    globalNotes.innerHTML = '';
    notes.forEach((n) => {
      const div = document.createElement('div');
      const cls = n.kind === 'danger' ? 'note note--danger' : (n.kind === 'warn' ? 'note note--warn' : 'note');
      div.className = cls;
      div.textContent = n.text;
      globalNotes.appendChild(div);
    });
  }

  function renderSummary({ mst, tallaCm, imc, glim, req, formula }) {
    const lines = [];
    lines.push(`MST: ${mst.total} (${mst.risk})`);
    if (Number.isFinite(tallaCm)) lines.push(`Talla: ${tallaCm.toFixed(1)} cm${state.tallaEstimada ? ' (estimada)' : ''}`);
    if (Number.isFinite(imc)) lines.push(`IMC: ${imc.toFixed(1)} (${window.Calc.bmiCategory(imc)})`);
    lines.push(`GLIM: ${glim.dx ? 'Positivo' : 'No cumple'}${glim.dx ? ` · ${glim.sev}` : ''}`);
    if (Number.isFinite(req.basal)) lines.push(`Basal: ${Math.round(req.basal)} kcal/día (${basalMethod.options[basalMethod.selectedIndex].text})`);
    if (Number.isFinite(req.actual)) lines.push(`Actual: ${Math.round(req.actual)} kcal/día (factor estrés ${fmt(req.factorEstres, 1)})`);

    if (formula) {
      const dens = window.FormulasUtils.getKcalPerMl(formula);
      const osm = formula.osmolaridad;
      lines.push('---');
      lines.push(`Enteral: ${formula.nombre} · ${formula.laboratorio || '—'} · ${Number.isFinite(dens) ? dens.toFixed(2) : '—'} kcal/mL · ${Number.isFinite(Number(osm)) ? Number(osm).toFixed(0) : '—'} mOsm/L`);

      const kcalTarget = (Number.isFinite(req.actual) && Number.isFinite(state.targetPct))
        ? (req.actual * (Number(state.targetPct) / 100))
        : req.actual;

      const plan = window.FormulasUtils.calcEnteralPlan(kcalTarget, formula);
      if (plan.ok) {
        const covOverall = (Number.isFinite(req.actual) && req.actual > 0) ? (plan.kcalReal / req.actual) * 100 : NaN;
        lines.push(`Prescripción: ${plan.mlHr} mL/h (${plan.mlDay} mL/día)`);
        lines.push(`Aporte real: ${Math.round(plan.kcalReal)} kcal/día (${fmtPct1(covOverall)}) · Objetivo ${Number(state.targetPct).toFixed(1)}%`);
        lines.push(`Macros (g/d): P ${Number.isFinite(plan.macros.protG) ? plan.macros.protG.toFixed(1) : '—'} · CHO ${Number.isFinite(plan.macros.choG) ? plan.macros.choG.toFixed(1) : '—'} · G ${Number.isFinite(plan.macros.fatG) ? plan.macros.fatG.toFixed(1) : '—'} · Fibra ${Number.isFinite(plan.macros.fibG) ? plan.macros.fibG.toFixed(1) : '0.0'}`);
      }
    }

    summary.innerHTML = '';
    lines.forEach((t) => {
      const row = document.createElement('div');
      row.className = 'result__row';
      const left = document.createElement('span');
      left.textContent = t;
      row.appendChild(left);
      summary.appendChild(row);
    });

    summary.dataset.copyText = lines.join('\n');
  }

  // Copy
  btnCopy.addEventListener('click', async () => {
    const txt = summary.dataset.copyText || '';
    try {
      await navigator.clipboard.writeText(txt);
      show(copyOk, true);
      setTimeout(() => show(copyOk, false), 1200);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      show(copyOk, true);
      setTimeout(() => show(copyOk, false), 1200);
    }
  });

  // ---------- init ----------
  function init() {
    initFormulasSelect();
    show(kcalKgWrap, basalMethod.value === 'kcalkg');
    show(mstKgWrap, mstWeightLoss.value === 'yes');

    if (covSlider) covSlider.value = '80';
    if (covInput) covInput.value = '80';

    goToStep(1);
    recalcAll();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
