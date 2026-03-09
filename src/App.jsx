import { useState, useEffect, useRef, useCallback } from "react";

// ═══ CONSTANTS ═══
const EXAM = new Date("2026-06-01");
const SEM_START = new Date("2026-02-16");
const autoWk = () => Math.max(1, Math.ceil((new Date() - SEM_START) / 604800000));

// Muscu split: alternates Lower/Upper
const MUSCU_SPLIT = ["🦵 Bas du corps", "💪 Haut du corps"];
function getNextSplit(muscuLog2) {
  // Find last session to determine next
  const sorted = Object.entries(muscuLog2).filter(([_, v]) => v.status === "done").sort((a, b) => b[0].localeCompare(a[0]));
  if (!sorted.length) return 0; // start with lower
  return sorted[0][1].split === 0 ? 1 : 0;
}

// Dynamic Anki: starts at baseMin, +10min every 2 weeks
function dynamicAnki(baseMin) {
  const wk = autoWk();
  return Math.min(180, baseMin + Math.floor(wk / 2) * 10);
}

const DIFF = {
  easy: { label: "Facile", color: "#16a34a", bg: "#dcfce7", time: 1, emoji: "🟢" },
  medium: { label: "Moyen", color: "#d97706", bg: "#fef3c7", time: 1.5, emoji: "🟠" },
  hard: { label: "Difficile", color: "#dc2626", bg: "#fee2e2", time: 2, emoji: "🔴" },
};
const fH = h => { if (h === Math.floor(h)) return h + "h"; const hrs = Math.floor(h), mins = Math.round((h - hrs) * 60); return hrs > 0 ? `${hrs}h${String(mins).padStart(2, "0")}` : `${mins}min`; };
const UE_C = ["#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#8b5cf6", "#06b6d4", "#ef4444", "#10b981", "#f97316", "#3b82f6", "#84cc16", "#e11d48"];
const ueCol = (ue, l) => UE_C[l.indexOf(ue) % UE_C.length];

const DCFG = {
  1: { n: "Lundi", e: "💃", tag: "Danse soir", m: [{ t: "7h00–7h30", l: "Lever", tp: "routine" }], a: 450, ls: 720, le: 780, re: 960, ev: [{ t: "16h00–19h15", l: "Trajet danse", tp: "travel" }, { t: "19h15–21h15", l: "Danse", tp: "sport" }, { t: "21h30–23h00", l: "Dîner · Détente", tp: "routine" }] },
  2: { n: "Mardi", e: "🏋️", tag: "Muscu · Long", m: [{ t: "7h00–7h15", l: "Lever", tp: "routine" }, { t: "7h15–9h15", l: "Muscu (trajet)", tp: "sport" }], a: 570, ls: 750, le: 810, re: 1290, ev: [{ t: "21h30–23h00", l: "Dîner · Détente", tp: "routine" }] },
  3: { n: "Mercredi", e: "🏋️", tag: "Muscu · Long", m: [{ t: "7h00–7h15", l: "Lever", tp: "routine" }, { t: "7h15–9h15", l: "Muscu (trajet)", tp: "sport" }], a: 570, ls: 750, le: 810, re: 1290, ev: [{ t: "21h30–23h00", l: "Dîner · Détente", tp: "routine" }] },
  4: { n: "Jeudi", e: "💃", tag: "Danse soir", m: [{ t: "7h00–7h30", l: "Lever", tp: "routine" }], a: 450, ls: 720, le: 780, re: 960, ev: [{ t: "16h00–19h15", l: "Trajet danse", tp: "travel" }, { t: "19h15–20h15", l: "Danse", tp: "sport" }, { t: "20h30–23h00", l: "Dîner · Détente", tp: "routine" }] },
  5: { n: "Vendredi", e: "🏋️", tag: "Muscu · Long", m: [{ t: "7h00–7h15", l: "Lever", tp: "routine" }, { t: "7h15–9h15", l: "Muscu (trajet)", tp: "sport" }], a: 570, ls: 750, le: 810, re: 1290, ev: [{ t: "21h30–23h00", l: "Dîner · Détente", tp: "routine" }] },
  6: { n: "Samedi", e: "🛒", tag: "Muscu+Courses · Aprèm libre", m: [{ t: "7h00–7h15", l: "Lever", tp: "routine" }, { t: "7h15–9h15", l: "Muscu+Courses", tp: "sport" }], a: 570, ls: null, le: null, re: 780, ev: [{ t: "13h00–23h00", l: "LIBRE", tp: "free" }] },
  0: { n: "Dimanche", e: "☀️", tag: "OFF + Flashcards", m: [], a: null, ls: null, le: null, re: null, ev: [{ t: "Journée", l: "REPOS", tp: "off" }, { t: "3h", l: "Flashcards Anki", tp: "flashcard" }] },
};

const BS = { routine: { bg: "#f3e5f5", b: "#9C27B0", c: "#6A1B9A", i: "🌙" }, sport: { bg: "#e3f2fd", b: "#2196F3", c: "#1565C0", i: "💪" }, travel: { bg: "#eceff1", b: "#78909C", c: "#37474F", i: "🚌" }, anki: { bg: "#e0f2f1", b: "#009688", c: "#00695C", i: "🧠" }, lunch: { bg: "#fff8e1", b: "#FFC107", c: "#F57F17", i: "🍽️" }, free: { bg: "#fce4ec", b: "#E91E63", c: "#880E4F", i: "🎉" }, off: { bg: "#fffde7", b: "#FFEB3B", c: "#F57F17", i: "☀️" }, flashcard: { bg: "#fff3e0", b: "#FF9800", c: "#E65100", i: "📇" }, event: { bg: "#ede7f6", b: "#673AB7", c: "#4527A0", i: "📌" }, pause: { bg: "#f5f5f5", b: "#bdbdbd", c: "#757575", i: "☕" } };

// Helpers
const fm = m => { const h = Math.floor(m / 60), mn = m % 60; return `${h}h${mn > 0 ? String(mn).padStart(2, "0") : "00"}`; };
const addD = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const dk = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const gid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const MN = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const DN = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const DNF = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function ld(k, fb) { try { const v = localStorage.getItem("mp_" + k); return v ? JSON.parse(v) : fb; } catch { return fb; } }
function sv(k, d) { try { localStorage.setItem("mp_" + k, JSON.stringify(d)); } catch (e) { console.error(e); } }

function getMonthGrid(y, m) {
  const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
  let s = first.getDay(); s = s === 0 ? 6 : s - 1; const days = [];
  for (let i = s - 1; i >= 0; i--) days.push({ date: new Date(y, m, -i), ok: false });
  for (let i = 1; i <= last.getDate(); i++) days.push({ date: new Date(y, m, i), ok: true });
  while (days.length % 7) days.push({ date: new Date(y, m + 1, days.length - last.getDate() - s + 1), ok: false });
  return days;
}
function getWeekDates(d) { const dt = new Date(d); const day = dt.getDay(); const mon = new Date(dt); mon.setDate(dt.getDate() - (day === 0 ? 6 : day - 1)); mon.setHours(0, 0, 0, 0); return Array.from({ length: 7 }, (_, i) => addD(mon, i)); }

// ═══ SCHEDULER ═══
function scheduleAll(courses, events, overrides, start, end, ankiMin, muscuLog2) {
  const aM = Math.ceil(ankiMin / 15) * 15, long = new Set([2, 3, 5]), slots = {};
  const templateMuscu = new Set([2, 3, 5, 6]);
  let d = new Date(start);
  while (d <= end) {
    const dow = d.getDay(), k = dk(d), cfg = DCFG[dow], de = events.filter(e => e.date === k);

    let rm = 0;
    if (cfg.a != null && cfg.re != null) {
      const revStart = cfg.a + aM;
      const revEnd = cfg.re;
      const lunchDur = (cfg.ls && cfg.le) ? cfg.le - cfg.ls : 0;

      // Calculate actual free windows around timed events
      const timedEvts = de.filter(e => e.startMin != null).sort((a, b) => a.startMin - b.startMin);
      const untimedEvts = de.filter(e => e.startMin == null);
      const untimedMins = untimedEvts.reduce((s, e) => s + (e.hours || 0) * 60, 0);

      // Build list of blocked ranges within revision window
      const blocked = [];
      // Lunch is blocked
      if (cfg.ls && cfg.le) blocked.push({ s: cfg.ls, e: cfg.le });
      // Timed events are blocked
      timedEvts.forEach(ev => blocked.push({ s: ev.startMin, e: ev.startMin + ev.hours * 60 }));
      // Sort and merge overlapping blocks
      blocked.sort((a, b) => a.s - b.s);
      const merged = [];
      for (const b of blocked) {
        if (merged.length && b.s <= merged[merged.length - 1].e) {
          merged[merged.length - 1].e = Math.max(merged[merged.length - 1].e, b.e);
        } else merged.push({ ...b });
      }

      // Calculate free time = revision window minus blocked ranges
      let freeMin = 0;
      let cursor = revStart;
      for (const b of merged) {
        if (b.s > cursor) freeMin += Math.min(b.s, revEnd) - cursor;
        cursor = Math.max(cursor, b.e);
      }
      if (cursor < revEnd) freeMin += revEnd - cursor;
      rm = Math.max(0, freeMin - untimedMins);
    }

    // Adjust for actual muscu vs template
    const mRaw = muscuLog2?.[k];
    const mStatus = !mRaw ? null : (typeof mRaw === "string" ? mRaw : mRaw.status);
    const isTemplateMuscuDay = templateMuscu.has(dow);
    if (isTemplateMuscuDay && mStatus === "skipped") rm += 120;
    else if (!isTemplateMuscuDay && mStatus === "done") rm = Math.max(0, rm - 120);

    slots[k] = { date: new Date(d), dow, cfg, de, rm, assigned: [], used: 0, muscuDone: mStatus === "done", muscuSkipped: mStatus === "skipped", muscuPlanned: isTemplateMuscuDay };
    d = addD(d, 1);
  }

  // Apply overrides: remove skipped courses from pending
  const skippedIds = new Set();
  Object.values(overrides || {}).forEach(o => (o.skipped || []).forEach(id => skippedIds.add(id)));

  const pending = courses.filter(c => !c.completed && !skippedIds.has(c.id));
  const ueQ = {};
  pending.sort((a, b) => {
    if ((a.weekNum || 1) !== (b.weekNum || 1)) return (a.weekNum || 1) - (b.weekNum || 1);
    // Sort by course number extracted from name
    const numA = parseInt((a.pdfName || a.name).match(/\d+/)?.[0] || "999");
    const numB = parseInt((b.pdfName || b.name).match(/\d+/)?.[0] || "999");
    if (numA !== numB) return numA - numB;
    // (1/2) before (2/2)
    const partA = (a.pdfName || "").includes("(2/") ? 1 : 0;
    const partB = (b.pdfName || "").includes("(2/") ? 1 : 0;
    return partA - partB;
  }).forEach(c => { if (!ueQ[c.ue]) ueQ[c.ue] = []; ueQ[c.ue].push(c); });

  const MAX_PER_WEEK = 21;
  // Daily caps for even distribution: total = 4+4+4+3+4+2 = 21
  const DAY_CAP = { 1: 4, 2: 4, 3: 4, 4: 3, 5: 4, 6: 2 }; // Mon-Sat

  for (const slot of Object.values(slots).sort((a, b) => a.date - b.date)) {
    if (slot.dow === 0) continue;
    let space = slot.rm - slot.used; if (space < 60) continue;
    const isLong = long.has(slot.dow);
    const maxToday = DAY_CAP[slot.dow] || 3;

    // Count courses already assigned this week
    const weekMon = getWeekDates(slot.date)[0];
    const weekKey = dk(weekMon);
    let weekCount = 0;
    for (const s of Object.values(slots)) {
      if (dk(getWeekDates(s.date)[0]) === weekKey) weekCount += s.assigned.length;
    }

    while (space >= 60 && weekCount < MAX_PER_WEEK && slot.assigned.length < maxToday) {
      const avail = []; for (const ue of Object.keys(ueQ)) if (ueQ[ue].length) avail.push(ueQ[ue][0]);
      if (!avail.length) break;
      avail.sort((a, b) => { const da = DIFF[a.difficulty || "medium"].time, db = DIFF[b.difficulty || "medium"].time; return isLong ? db - da : da - db; });
      let picked = null;
      for (const c of avail) { const need = DIFF[c.difficulty || "medium"].time * 60; const last = slot.assigned[slot.assigned.length - 1]; const same = last && last.name === c.name && last.ue === c.ue; const pause = (slot.assigned.length && !same) ? 15 : 0; if (need + pause <= space) { picked = { ...c }; space -= need + pause; break; } }
      if (!picked) break;
      slot.assigned.push(picked); slot.used = slot.rm - space; weekCount++;
      const q = ueQ[picked.ue]; if (q?.length && q[0].id === picked.id) q.shift();
    }
    slot.assigned.sort((a, b) => DIFF[b.difficulty || "medium"].time - DIFF[a.difficulty || "medium"].time);
  }
  return slots;
}

function buildBlocks(slot, ankiMin) {
  const { cfg, dow, assigned, de, muscuDone, muscuSkipped, muscuPlanned } = slot;
  const aM = Math.ceil(ankiMin / 15) * 15;
  if (dow === 0) return [{ t: "Journée", l: "REPOS", tp: "off" }, { t: "3h", l: "Flashcards Anki", tp: "flashcard" }];
  const bl = [], ae = cfg.a + aM;

  // Morning blocks: adjust muscu display
  cfg.m.forEach(b => {
    if (b.tp === "sport" && b.l.includes("Muscu")) {
      bl.push(muscuSkipped ? { t: b.t, l: "Muscu annulée → +2h rév.", tp: "pause" } : { t: b.t, l: b.l, tp: b.tp });
    } else bl.push({ t: b.t, l: b.l, tp: b.tp });
  });
  if (!muscuPlanned && muscuDone) bl.push({ t: "7h15–9h15", l: "🏋️ Muscu (ajoutée)", tp: "sport" });

  bl.push({ t: `${fm(cfg.a)}–${fm(ae)}`, l: `Anki (${ankiMin}min)`, tp: "anki" });

  // Build sorted events with actual time positions
  const timedEvents = de.filter(ev => ev.startMin != null).sort((a, b) => a.startMin - b.startMin);
  const untimedEvents = de.filter(ev => ev.startMin == null);

  // Show untimed events as info blocks
  untimedEvents.forEach(ev => bl.push({ t: `${ev.hours}h`, l: `📌 ${ev.name}`, tp: "event" }));

  // Build timeline: interleave events and courses
  let cur = ae;
  let lunchDone = !cfg.ls;
  let eventIdx = 0;
  let courseIdx = 0;

  while (courseIdx < assigned.length || eventIdx < timedEvents.length) {
    const nextEvent = eventIdx < timedEvents.length ? timedEvents[eventIdx] : null;

    // If current cursor is inside an event, jump past it
    if (nextEvent && cur >= nextEvent.startMin && cur < nextEvent.startMin + nextEvent.hours * 60) {
      const evEnd = nextEvent.startMin + nextEvent.hours * 60;
      bl.push({ t: `${fm(nextEvent.startMin)}–${fm(evEnd)}`, l: `📌 ${nextEvent.name}`, tp: "event" });
      cur = evEnd;
      eventIdx++;
      continue;
    }

    // If next event starts before current cursor (already past), just show it and skip
    if (nextEvent && nextEvent.startMin < cur) {
      const evEnd = nextEvent.startMin + nextEvent.hours * 60;
      bl.push({ t: `${fm(nextEvent.startMin)}–${fm(evEnd)}`, l: `📌 ${nextEvent.name}`, tp: "event" });
      cur = Math.max(cur, evEnd);
      eventIdx++;
      continue;
    }

    // Next event is in the future — fill courses before it
    if (nextEvent && cur <= nextEvent.startMin) {
      while (courseIdx < assigned.length) {
        const c = assigned[courseIdx];
        const rm2 = DIFF[c.difficulty || "medium"].time * 60;
        const pauseMin = (courseIdx > 0 && !(assigned[courseIdx-1].name === c.name && assigned[courseIdx-1].ue === c.ue)) ? 15 : 0;
        const courseEnd = cur + pauseMin + rm2;

        if (courseEnd > nextEvent.startMin) break; // won't fit before event
        if (cfg.re && cur >= cfg.re) break;

        // Lunch check
        if (!lunchDone && cfg.ls && cur + pauseMin + rm2 > cfg.ls && cur <= cfg.ls) {
          bl.push({ t: `${fm(cfg.ls)}–${fm(cfg.le)}`, l: "Déjeuner + Marche", tp: "lunch" });
          cur = cfg.le; lunchDone = true; continue;
        }
        if (!lunchDone && cfg.ls && cur >= cfg.ls) {
          bl.push({ t: `${fm(cfg.ls)}–${fm(cfg.le)}`, l: "Déjeuner + Marche", tp: "lunch" });
          cur = cfg.le; lunchDone = true; continue;
        }

        if (pauseMin > 0) { bl.push({ t: `${fm(cur)}–${fm(cur + 15)}`, l: "Pause", tp: "pause" }); cur += 15; }
        const end2 = cfg.re ? Math.min(cur + rm2, cfg.re) : cur + rm2;
        if (end2 > nextEvent.startMin) break;

        bl.push({ t: `${fm(cur)}–${fm(end2)}`, l: c.pdfName || c.name, tp: "revision", course: c, diff: c.difficulty || "medium", hours: Math.round((end2 - cur) / 60 * 10) / 10 });
        cur = end2; courseIdx++;
      }

      // Place the event
      const evEnd = nextEvent.startMin + nextEvent.hours * 60;
      bl.push({ t: `${fm(nextEvent.startMin)}–${fm(evEnd)}`, l: `📌 ${nextEvent.name}`, tp: "event" });
      cur = Math.max(cur, evEnd);
      eventIdx++;
      continue;
    }

    // No more events: fill remaining courses
    if (courseIdx >= assigned.length) break;
    const c = assigned[courseIdx];
    const rm2 = DIFF[c.difficulty || "medium"].time * 60;
    if (cfg.re && cur >= cfg.re) break;

    if (!lunchDone && cfg.ls && cur >= cfg.ls) {
      bl.push({ t: `${fm(cfg.ls)}–${fm(cfg.le)}`, l: "Déjeuner + Marche", tp: "lunch" });
      cur = cfg.le; lunchDone = true; continue;
    }
    if (!lunchDone && cfg.ls && cur + rm2 > cfg.ls && cur <= cfg.ls) {
      bl.push({ t: `${fm(cfg.ls)}–${fm(cfg.le)}`, l: "Déjeuner + Marche", tp: "lunch" });
      cur = cfg.le; lunchDone = true; continue;
    }

    const pauseMin = (courseIdx > 0 && !(assigned[courseIdx-1].name === c.name && assigned[courseIdx-1].ue === c.ue)) ? 15 : 0;
    if (pauseMin > 0) { bl.push({ t: `${fm(cur)}–${fm(cur + 15)}`, l: "Pause", tp: "pause" }); cur += 15; }
    if (cfg.re && cur >= cfg.re) break;

    const end2 = cfg.re ? Math.min(cur + rm2, cfg.re) : cur + rm2;
    bl.push({ t: `${fm(cur)}–${fm(end2)}`, l: c.pdfName || c.name, tp: "revision", course: c, diff: c.difficulty || "medium", hours: Math.round((end2 - cur) / 60 * 10) / 10 });
    cur = end2; courseIdx++;
  }

  // Remaining events
  while (eventIdx < timedEvents.length) {
    const ev = timedEvents[eventIdx];
    const evEnd = ev.startMin + ev.hours * 60;
    bl.push({ t: `${fm(ev.startMin)}–${fm(evEnd)}`, l: `📌 ${ev.name}`, tp: "event" });
    eventIdx++;
  }

  if (!lunchDone && cfg.ls) bl.push({ t: `${fm(cfg.ls)}–${fm(cfg.le)}`, l: "Déjeuner + Marche", tp: "lunch" });
  if (!assigned.length && slot.rm > 0) bl.push({ t: `${fm(ae)}–...`, l: "Aucun cours", tp: "pause", empty: true });
  cfg.ev.forEach(b => bl.push({ t: b.t, l: b.l, tp: b.tp }));
  return bl;
}

// ═══ AI ═══
async function aiAnalyze(b64, isImg, mt, existing, apiKey) {
  const existingUEs = [...new Set(existing.map(c => c.ue))];
  const ueHint = existingUEs.length > 0 ? `\n\nIMPORTANT - UE déjà utilisées : ${existingUEs.join(", ")}. RÉUTILISE EXACTEMENT un de ces noms si le cours appartient à la même matière. Ne crée pas de variante (pas d'accent différent, pas d'abréviation différente).` : "";
  const ctx = existing.length > 0 ? `\nCours existants:\n${existing.slice(-20).map(c => `- ${c.pdfName || c.name} [${c.ue}] → ${c.difficulty}`).join("\n")}` : "";
  const r = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, messages: [{ role: "user", content: [{ type: isImg ? "image" : "document", source: { type: "base64", media_type: mt, data: b64 } }, { type: "text", text: `Cours de médecine. UE abrégé (MAJUSCULES, sans accents, court), nom PDF, difficulté: easy(1h)/medium(1h30)/hard(2h).${ueHint}${ctx}\nJSON sans backticks:\n{"ue":"NOM","courses":[{"name":"f.pdf","difficulty":"easy|medium|hard"}]${existing.length > 0 ? ',"rebalanced":[]' : ""}}` }] }] }) });
  if (!r.ok) throw new Error(`API ${r.status}`);
  const data = await r.json(); if (data.error) throw new Error(data.error.message);
  const raw = (data.content?.map(i => i.text || "").join("") || "").replace(/```json|```/g, "").trim();
  const m = raw.match(/\{[\s\S]*\}/); if (!m) throw new Error("No JSON"); return JSON.parse(m[0]);
}

async function aiRebalance(courses, apiKey) {
  const list = courses.filter(c => !c.completed).map(c => `- id:${c.id} | ${c.pdfName || c.name} [${c.ue}] → actuel: ${c.difficulty}`).join("\n");
  const r = await fetch("/api/claude", {
    method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 4000,
      messages: [{ role: "user", content: `Tu es un assistant pour une étudiante en médecine. Réévalue la difficulté RELATIVE de chaque cours en comparant TOUS les cours entre eux.

Critère principal : densité d'information à mémoriser.
- "easy" : les moins denses du lot (~30%) → 1h de révision/cours
- "medium" : densité moyenne (~40%) → 1h30 de révision/cours
- "hard" : les plus denses/complexes du lot (~30%) → 2h de révision/cours

Compare chaque cours aux autres. Un cours qui semblait "hard" peut devenir "medium" si d'autres cours sont encore plus denses.

Cours actuels :
${list}

Réponds en JSON UNIQUEMENT sans backticks :
{"rebalanced": [{"id": "id_du_cours", "difficulty": "easy|medium|hard"}]}
Inclus ABSOLUMENT TOUS les cours, même ceux dont la difficulté ne change pas.` }],
    })
  });
  if (!r.ok) throw new Error(`API ${r.status}`);
  const data = await r.json(); if (data.error) throw new Error(data.error.message);
  const raw = (data.content?.map(i => i.text || "").join("") || "").replace(/```json|```/g, "").trim();
  const m2 = raw.match(/\{[\s\S]*\}/); if (!m2) throw new Error("No JSON");
  return JSON.parse(m2[0]);
}

// ═══ ICS EXPORT ═══
function generateICS(slots, ankiMin) {
  let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//MedPlanner//FR\n";
  const pad = n => String(n).padStart(2, "0");
  const toICS = (d, mins) => { const dt = new Date(d); dt.setHours(Math.floor(mins / 60), mins % 60); return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`; };

  Object.values(slots).forEach(slot => {
    if (slot.dow === 0 || !slot.assigned.length) return;
    const cfg = slot.cfg; const aM = Math.ceil(ankiMin / 15) * 15;
    let cur = cfg.a + aM;
    slot.assigned.forEach(c => {
      const dur = DIFF[c.difficulty || "medium"].time * 60;
      const end = cur + dur;
      ics += `BEGIN:VEVENT\nDTSTART:${toICS(slot.date, cur)}\nDTEND:${toICS(slot.date, end)}\nSUMMARY:📖 ${c.pdfName || c.name} [${c.ue}]\nDESCRIPTION:${DIFF[c.difficulty || "medium"].emoji} ${DIFF[c.difficulty || "medium"].label} - ${fH(DIFF[c.difficulty || "medium"].time)}/cours\nEND:VEVENT\n`;
      cur = end + 15;
    });
  });
  ics += "END:VCALENDAR";
  return ics;
}

// ═══ APP ═══
export default function MedPlanner() {
  const [tab, setTab] = useState("dash");
  const [courses, setCourses] = useState([]);
  const [events, setEvents] = useState([]);
  const [overrides, setOverrides] = useState({}); // {dateKey: {skipped:[id], done:[id]}}
  const [ankiMin, setAnkiMin] = useState(30);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selDate, setSelDate] = useState(null);
  const [viewMode, setViewMode] = useState("month"); // month | week
  const [weekStart, setWeekStart] = useState(null);
  const [showMenu, setShowMenu] = useState(null); // courseId
  const [showTimeRecord, setShowTimeRecord] = useState(null); // courseId after completion
  const [dragItem, setDragItem] = useState(null);
  const [muscuLog, setMuscuLog] = useState({});
  const [stepsLog, setStepsLog] = useState({}); // {dateKey: number}
  const [toast, setToast] = useState(null);
  const [rebalancing, setRebalancing] = useState(false);

  // API key
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("mp_apikey") || "");

  // Queue
  const [queue, setQueue] = useState([]);
  const [pending, setPending] = useState([]);
  const procRef = useRef(false);
  const cRef = useRef(courses);
  useEffect(() => { cRef.current = courses; }, [courses]);
  const apiKeyRef = useRef(apiKey);
  useEffect(() => { apiKeyRef.current = apiKey; }, [apiKey]);

  // Pomodoro
  const [pomo, setPomo] = useState({ active: false, work: true, left: 50 * 60, total: 50 * 60, course: null });
  const pomoRef = useRef(null);

  // Events form
  const [showEvt, setShowEvt] = useState(false);
  const [mergeFrom, setMergeFrom] = useState(null); // UE name to merge from
  const [eN, setEN] = useState(""); const [eD, setED] = useState(""); const [eH, setEH] = useState(2); const [eT, setET] = useState("09:00");

  // Settings modal
  const [showSettings, setShowSettings] = useState(false);

  const fileRef = useRef(null);

  // Load/save
  useEffect(() => {
    setCourses(ld("mp8-c", [])); setEvents(ld("mp8-e", [])); setAnkiMin(ld("mp8-a", 30));
    setMuscuLog(ld("mp8-m", {})); setOverrides(ld("mp8-o", {})); setDark(ld("mp8-dark", false));
    setStepsLog(ld("mp8-steps", {})); setLoading(false);
  }, []);
  useEffect(() => { if (!loading) sv("mp8-c", courses); }, [courses, loading]);
  useEffect(() => { if (!loading) sv("mp8-e", events); }, [events, loading]);
  useEffect(() => { if (!loading) sv("mp8-a", ankiMin); }, [ankiMin, loading]);
  useEffect(() => { if (!loading) sv("mp8-m", muscuLog); }, [muscuLog, loading]);
  useEffect(() => { if (!loading) sv("mp8-o", overrides); }, [overrides, loading]);
  useEffect(() => { if (!loading) sv("mp8-dark", dark); }, [dark, loading]);
  useEffect(() => { if (!loading) sv("mp8-steps", stepsLog); }, [stepsLog, loading]);
  useEffect(() => { localStorage.setItem("mp_apikey", apiKey); }, [apiKey]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  // Pomodoro timer
  useEffect(() => {
    if (pomo.active) {
      pomoRef.current = setInterval(() => {
        setPomo(p => {
          if (p.left <= 1) {
            clearInterval(pomoRef.current);
            const isWork = p.work;
            return { ...p, active: false, work: !isWork, left: isWork ? 10 * 60 : 50 * 60, total: isWork ? 10 * 60 : 50 * 60 };
          }
          return { ...p, left: p.left - 1 };
        });
      }, 1000);
      return () => clearInterval(pomoRef.current);
    }
  }, [pomo.active]);

  // Queue processor
  const processQ = useCallback(async () => {
    if (procRef.current) return;
    const next = queue.find(q => q.s === "w"); if (!next) return;
    procRef.current = true;
    setQueue(q => q.map(i => i.id === next.id ? { ...i, s: "p" } : i));
    try {
      const res = await aiAnalyze(next.b64, next.isImg, next.mt, cRef.current, apiKeyRef.current);
      if (res.rebalanced?.length) setCourses(p => { let u = [...p]; res.rebalanced.forEach(r => { u = u.map(c => c.id === r.id ? { ...c, difficulty: r.difficulty } : c); }); return u; });
      setQueue(q => q.map(i => i.id === next.id ? { ...i, s: "d" } : i));
      setPending(p => [...p, { id: next.id, fn: next.fn, res }]);
      setToast(`✅ ${next.fn}`);
    } catch (err) {
      setQueue(q => q.map(i => i.id === next.id ? { ...i, s: "e", err: err.message } : i));
      setToast(`❌ ${next.fn}`);
    }
    procRef.current = false;
  }, [queue]);
  useEffect(() => { if (queue.some(q => q.s === "w") && !procRef.current) processQ(); }, [queue, processQ]);

  // Computed
  const ueList = [...new Set(courses.map(c => c.ue))].sort();
  const done = courses.filter(c => c.completed).length;
  const total = courses.length;
  const active = total - done;
  const dc = { easy: 0, medium: 0, hard: 0 }; courses.filter(c => !c.completed).forEach(c => dc[c.difficulty || "medium"]++);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const effectiveAnki = dynamicAnki(ankiMin);
  const sMap = scheduleAll(courses, events, overrides, today, EXAM, effectiveAnki, muscuLog);
  const daysLeft = Math.max(0, Math.ceil((EXAM - today) / 86400000));
  const totalRevHours = courses.filter(c => !c.completed).reduce((s, c) => s + DIFF[c.difficulty || "medium"].time, 0);
  const pct = total > 0 ? Math.round(done / total * 100) : 0;
  const pace = daysLeft > 0 ? (active / (daysLeft * 6 / 7)).toFixed(1) : 0;

  // Alert: behind pace?
  const weeklyTarget = 21;

  const qW = queue.filter(q => q.s === "w").length;
  const qP = queue.filter(q => q.s === "p").length;
  const isProc = qW > 0 || qP > 0;

  // Theme
  const bg = dark ? "#0f0f23" : "#f5f7fa";
  const bg2 = dark ? "#1a1a2e" : "white";
  const tx = dark ? "#e0e0e0" : "#333";
  const tx2 = dark ? "#aaa" : "#888";
  const brd = dark ? "#333" : "#eee";

  const crd = { background: bg2, borderRadius: 16, padding: "20px 24px", boxShadow: dark ? "none" : "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)", marginBottom: 14, border: dark ? "1px solid #333" : "none" };
  const btnP = { padding: "12px 20px", borderRadius: 12, border: "none", background: dark ? "#6366f1" : "#1a1a2e", color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "opacity 0.15s" };
  const btnS = { padding: "12px 20px", borderRadius: 12, border: `1.5px solid ${brd}`, background: bg2, color: tx, fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "opacity 0.15s" };
  const inp = { padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${brd}`, fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit", background: bg2, color: tx };

  // Handlers
  function toggle(id) {
    setCourses(p => p.map(c => {
      if (c.id !== id) return c;
      if (c.completed) return { ...c, completed: false, completedDate: null, actualTime: null };
      return { ...c, completed: true, completedDate: dk(new Date()) };
    }));
    // Show time recording popup if just completed
    const course = courses.find(c => c.id === id);
    if (course && !course.completed) setShowTimeRecord(id);
  }
  function del(id) { setCourses(p => p.filter(c => c.id !== id)); setShowMenu(null); }
  function changeDiff(id, d) { setCourses(p => p.map(c => c.id === id ? { ...c, difficulty: d } : c)); }

  // Record actual time spent on a course (in hours)
  function recordTime(id, hours) {
    setCourses(p => p.map(c => {
      if (c.id !== id) return c;
      const expected = DIFF[c.difficulty || "medium"].time;
      let newDiff = c.difficulty;
      // Auto-reclassify if actual time differs significantly
      if (hours <= 1.1) newDiff = "easy";
      else if (hours <= 1.7) newDiff = "medium";
      else newDiff = "hard";
      const changed = newDiff !== c.difficulty;
      if (changed) setToast(`⚖️ ${c.pdfName || c.name} → ${DIFF[newDiff].emoji} ${DIFF[newDiff].label} (${fH(hours)} réel)`);
      return { ...c, actualTime: hours, difficulty: newDiff };
    }));
  }

  function skipCourse(dateKey, courseId) {
    setOverrides(p => ({ ...p, [dateKey]: { ...p[dateKey], skipped: [...(p[dateKey]?.skipped || []), courseId] } }));
    setShowMenu(null); setToast("⏭️ Cours sauté — reporté auto");
  }

  function markDoneExtra(courseId) {
    setCourses(p => p.map(c => c.id === courseId ? { ...c, completed: true, completedDate: dk(new Date()) } : c));
    setToast("✅ Marqué comme fait");
  }

  function postpone(id) {
    setCourses(p => { const c = p.find(x => x.id === id); if (!c) return p; const mw = Math.max(...p.filter(x => x.ue === c.ue).map(x => x.weekNum || 1)); return p.map(x => x.id === id ? { ...x, weekNum: mw + 1 } : x); });
    setShowMenu(null); setToast("📅 Reporté");
  }

  // Muscu helpers (supports old string format and new object format)
  function mSt(k) { const v = muscuLog[k]; if (!v) return null; return typeof v === "string" ? v : v.status; }
  function mSp(k) { const v = muscuLog[k]; if (!v || typeof v === "string") return null; return v.split; }

  function markMuscu(k, s) {
    if (s === "done") {
      const nextSplit = getNextSplit(muscuLog);
      setMuscuLog(p => ({ ...p, [k]: { status: "done", split: nextSplit } }));
      setToast(`${MUSCU_SPLIT[nextSplit]} validé !`);
    } else {
      setMuscuLog(p => ({ ...p, [k]: { status: "skipped" } }));
      setToast("✕ Pas de muscu — pense à rattraper !");
    }
  }

  function addEvt() {
    if (!eN.trim() || !eD) return;
    const [hh, mm] = eT.split(":").map(Number);
    const startMin = hh * 60 + (mm || 0);
    setEvents(p => [...p, { id: gid(), name: eN.trim(), date: eD, hours: eH, startMin }]);
    setEN(""); setED(""); setShowEvt(false);
  }
  function delEvt(id) { setEvents(p => p.filter(e => e.id !== id)); }

  function mergeUE(fromUE, toUE) {
    setCourses(p => p.map(c => c.ue === fromUE ? { ...c, ue: toUE } : c));
    setMergeFrom(null);
    setToast(`🔗 "${fromUE}" fusionné dans "${toUE}"`);
  }

  function handleDrop(targetId, ue) {
    if (!dragItem || dragItem === targetId) { setDragItem(null); return; }
    setCourses(prev => {
      const ueCourses = prev.filter(c => c.ue === ue);
      const otherCourses = prev.filter(c => c.ue !== ue);
      const fromIdx = ueCourses.findIndex(c => c.id === dragItem);
      const toIdx = ueCourses.findIndex(c => c.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      // Move the dragged item to the target position
      const moved = ueCourses.splice(fromIdx, 1)[0];
      ueCourses.splice(toIdx, 0, moved);
      // Reassign weekNum to preserve order (use fractional to keep relative ordering)
      ueCourses.forEach((c, i) => { c.weekNum = i + 1; });
      return [...otherCourses, ...ueCourses];
    });
    setDragItem(null);
    setToast("↕️ Ordre modifié");
  }

  async function handleRebalance() {
    const active2 = courses.filter(c => !c.completed);
    if (active2.length < 3) { setToast("⚠️ Il faut au moins 3 cours pour rééquilibrer"); return; }
    setRebalancing(true);
    try {
      const result = await aiRebalance(courses, apiKey);
      if (result.rebalanced?.length) {
        let changed = 0;
        setCourses(prev => {
          let u = [...prev];
          result.rebalanced.forEach(r => {
            const old = u.find(c => c.id === r.id);
            if (old && old.difficulty !== r.difficulty) changed++;
            u = u.map(c => c.id === r.id ? { ...c, difficulty: r.difficulty } : c);
          });
          return u;
        });
        setToast(`⚖️ ${result.rebalanced.length} cours analysés, ${changed} modifié${changed > 1 ? "s" : ""}`);
      }
    } catch (err) { console.error(err); setToast(`❌ Erreur: ${err.message}`); }
    setRebalancing(false);
  }

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []); if (!files.length) return;
    if (!apiKey) { setToast("🔑 Ajoute ta clé API dans ⚙️ Paramètres"); setShowSettings(true); if (fileRef.current) fileRef.current.value = ""; return; }
    const items = [];
    for (const f of files) {
      const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(f); });
      const isImg = f.type.startsWith("image/");
      items.push({ id: gid(), fn: f.name, b64, isImg, mt: isImg ? f.type : "application/pdf", s: "w" });
    }
    setQueue(q => [...q, ...items]); setToast(`📄 ${files.length} en file d'attente`);
    if (fileRef.current) fileRef.current.value = "";
  }

  function acceptRes(pid, dur) {
    const item = pending.find(p => p.id === pid); if (!item) return;
    const wk = autoWk(); const items = [];
    item.res.courses.forEach(c => { for (let i = 0; i < dur; i++) items.push({ id: gid(), pdfName: (item.fn || c.name) + (dur > 1 ? ` (${i + 1}/${dur})` : ""), name: c.name, ue: item.res.ue.toUpperCase(), duration: 1, difficulty: c.difficulty || "medium", weekNum: wk, completed: false }); });
    setCourses(p => [...p, ...items]); setPending(p => p.filter(r => r.id !== pid)); setToast(`✅ +${items.length} cours`);
  }

  function exportBackup() {
    const data = JSON.stringify({ courses, events, overrides, muscuLog, stepsLog, ankiMin }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `medplanner-backup-${dk(new Date())}.json`; a.click(); URL.revokeObjectURL(url);
    setToast("💾 Backup exporté");
  }

  function importBackup(e) {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => {
      try { const d = JSON.parse(r.result); if (d.courses) setCourses(d.courses); if (d.events) setEvents(d.events); if (d.overrides) setOverrides(d.overrides); if (d.muscuLog) setMuscuLog(d.muscuLog); if (d.stepsLog) setStepsLog(d.stepsLog); if (d.ankiMin) setAnkiMin(d.ankiMin); setToast("📥 Backup importé !"); } catch { setToast("❌ Fichier invalide"); }
    }; r.readAsText(f);
  }

  function exportICS() {
    const ics = generateICS(sMap, effectiveAnki);
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "medplanner.ics"; a.click(); URL.revokeObjectURL(url);
    setToast("📅 Calendrier exporté (.ics)");
  }

  // Pomodoro
  const pomoMin = Math.floor(pomo.left / 60), pomoSec = pomo.left % 60;
  const pomoPct = pomo.total > 0 ? ((pomo.total - pomo.left) / pomo.total * 100) : 0;

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Chargement...</div>;

  // Selected day
  const selKey = selDate ? dk(selDate) : null;
  const selSlot = selKey ? sMap[selKey] : null;
  const selBlocks = selSlot ? buildBlocks(selSlot, effectiveAnki) : null;
  const weekDates = weekStart ? getWeekDates(weekStart) : null;

  return (
    <div style={{ fontFamily: "-apple-system, 'Segoe UI', sans-serif", minHeight: "100vh", background: dark ? "#0a0a1a" : "#f0f2f5", padding: "32px 24px", maxWidth: 860, margin: "0 auto", color: tx }}>

      {toast && <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: "#1a1a2e", color: "white", padding: "10px 24px", borderRadius: 12, fontSize: 13, fontWeight: 600, zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>{toast}</div>}

      {/* Processing indicator */}
      {(isProc || pending.length > 0) && <div style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", background: bg2, borderRadius: 14, padding: "10px 20px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", zIndex: 998, display: "flex", alignItems: "center", gap: 10, fontSize: 13, border: `1px solid ${brd}` }}>
        {isProc ? <><div style={{ width: 14, height: 14, border: "3px solid #eee", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 1s linear infinite" }} /><span style={{ fontWeight: 600 }}>🧠 Analyse en cours...</span><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></> :
          <span style={{ fontWeight: 600, cursor: "pointer", color: "#d97706" }} onClick={() => setTab("cours")}>📋 {pending.length} à confirmer →</span>}
      </div>}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: dark ? "#fff" : "#1a1a2e", margin: 0, letterSpacing: "-0.5px" }}>🩺 MedPlanner</h1>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setDark(!dark)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>{dark ? "☀️" : "🌙"}</button>
          <button onClick={() => setShowSettings(!showSettings)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>⚙️</button>
        </div>
      </div>

      {/* Progress */}
      <div style={{ textAlign: "center", marginBottom: 12, fontSize: 12, color: tx2 }}>J-{daysLeft} · {done}/{total} ({pct}%)</div>
      <div style={{ height: 8, background: dark ? "#333" : "#e0e0e0", borderRadius: 4, overflow: "hidden", marginBottom: 4 }}><div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#16a34a,#84cc16)", borderRadius: 4, transition: "width 0.4s" }} /></div>
      {active > 0 && <div style={{ display: "flex", height: 5, borderRadius: 3, overflow: "hidden", marginBottom: 12 }}><div style={{ width: `${dc.easy / active * 100}%`, background: DIFF.easy.color }} /><div style={{ width: `${dc.medium / active * 100}%`, background: DIFF.medium.color }} /><div style={{ width: `${dc.hard / active * 100}%`, background: DIFF.hard.color }} /></div>}

      {/* Settings modal */}
      {showSettings && <div style={{ ...crd, border: `2px solid ${dark ? "#6366f1" : "#1a1a2e"}` }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, display: "flex", justifyContent: "space-between" }}><span>⚙️ Paramètres</span><button onClick={() => setShowSettings(false)} style={{ background: "none", border: "none", color: tx2, cursor: "pointer", fontSize: 16 }}>✕</button></div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}><span>🧠</span><div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Anki base : {ankiMin} min → <strong style={{ color: "#009688" }}>Cette semaine : {effectiveAnki} min</strong> (S{autoWk()})</div><input type="range" min={15} max={120} step={15} value={ankiMin} onChange={e => setAnkiMin(parseInt(e.target.value))} style={{ width: "100%", accentColor: "#009688" }} /><div style={{ fontSize: 10, color: tx2, marginTop: 2 }}>+10 min toutes les 2 semaines (auto)</div></div></div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>🔑 Clé API Anthropic {apiKey ? <span style={{ color: "#16a34a" }}>✓</span> : <span style={{ color: "#dc2626" }}>requise pour l'analyse PDF</span>}</div>
          <input type="password" placeholder="sk-ant-..." value={apiKey} onChange={e => setApiKey(e.target.value)} style={{ ...inp, fontSize: 12 }} />
          <div style={{ fontSize: 10, color: tx2, marginTop: 2 }}>Obtiens ta clé sur <a href="https://console.anthropic.com/settings/keys" target="_blank" style={{ color: "#6366f1" }}>console.anthropic.com</a> — stockée localement uniquement</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={exportBackup} style={{ ...btnS, flex: 1, fontSize: 12 }}>💾 Export backup</button>
          <label style={{ ...btnS, flex: 1, fontSize: 12, textAlign: "center", cursor: "pointer" }}>📥 Import<input type="file" accept=".json" onChange={importBackup} style={{ display: "none" }} /></label>
          <button onClick={exportICS} style={{ ...btnS, flex: 1, fontSize: 12 }}>📅 Export .ics</button>
        </div>
      </div>}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 18, background: bg2, borderRadius: 14, padding: 4, boxShadow: dark ? "none" : "0 2px 8px rgba(0,0,0,0.08)", border: dark ? `1px solid #333` : "none" }}>
        {[["dash", "📊", "Stats"], ["plan", "📅", "Planning"], ["cours", "📚", "Cours"], ["pomo", "⏱️", "Timer"], ["events", "📌", "RDV"]].map(([k, ic, lb]) => (
          <button key={k} onClick={() => { setTab(k); setSelDate(null); setViewMode("month"); }} style={{ flex: 1, padding: "12px 8px", border: "none", borderRadius: 10, background: tab === k ? (dark ? "#6366f1" : "#1a1a2e") : "transparent", color: tab === k ? "white" : tx2, fontWeight: tab === k ? 700 : 500, fontSize: 14, cursor: "pointer", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>{ic}</span>
            <span>{lb}</span>
            {k === "cours" && pending.length > 0 && <span style={{ position: "absolute", top: 4, right: 8, width: 18, height: 18, borderRadius: 9, background: "#dc2626", color: "white", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{pending.length}</span>}
          </button>
          </button>
        ))}
      </div>

      {/* ═══ DASHBOARD ═══ */}
      {tab === "dash" && (<div>
        {/* Anki dynamic info */}
        <div style={{ ...crd, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>🧠</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Anki : <strong style={{ color: "#009688" }}>{effectiveAnki} min/jour</strong> <span style={{ color: tx2, fontWeight: 400 }}>(base {ankiMin} + S{autoWk()})</span></div>
            <div style={{ height: 4, background: dark ? "#333" : "#e0e0e0", borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
              <div style={{ width: `${effectiveAnki / 180 * 100}%`, height: "100%", background: "#009688", borderRadius: 2 }} />
            </div>
          </div>
        </div>
        {/* This week stats */}
        {(() => {
          const todayKey = dk(new Date());
          const thisWeek = getWeekDates(new Date());
          const doneToday = courses.filter(c => c.completedDate === todayKey).length;
          const doneThisWeek = courses.filter(c => c.completedDate && thisWeek.some(d => dk(d) === c.completedDate)).length;
          const dailyDone = thisWeek.map(d => ({ day: DN[d.getDay()], date: d.getDate(), count: courses.filter(c => c.completedDate === dk(d)).length }));
          const weekTarget = weeklyTarget;
          const weekPct = Math.min(100, Math.round(doneThisWeek / weekTarget * 100));

          return (
            <div style={{ ...crd, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: dark ? "#fff" : "#1a1a2e" }}>📖 Cours révisés</div>
              {/* Weekly progress */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ textAlign: "center", minWidth: 60 }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: doneThisWeek >= weekTarget ? "#16a34a" : doneThisWeek >= weekTarget * 0.5 ? "#d97706" : "#dc2626" }}>{doneThisWeek}</div>
                  <div style={{ fontSize: 10, color: tx2 }}>/{weekTarget}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Objectif semaine : {weekTarget} cours
                    {doneThisWeek >= weekTarget && <span style={{ color: "#16a34a", marginLeft: 6 }}>✓ Atteint !</span>}
                  </div>
                  <div style={{ height: 10, background: dark ? "#333" : "#e0e0e0", borderRadius: 5, overflow: "hidden" }}>
                    <div style={{ width: `${weekPct}%`, height: "100%", background: doneThisWeek >= weekTarget ? "#16a34a" : doneThisWeek >= weekTarget * 0.5 ? "#d97706" : "#dc2626", borderRadius: 5, transition: "width 0.4s" }} />
                  </div>
                  <div style={{ fontSize: 10, color: tx2, marginTop: 2 }}>Aujourd'hui : <strong>{doneToday}</strong> cours</div>
                </div>
              </div>
              {/* Mini bar chart of the week */}
              <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 60 }}>
                {dailyDone.map((d2, i) => {
                  const maxH = Math.max(...dailyDone.map(x => x.count), 4, 1);
                  const h = d2.count > 0 ? Math.max(8, (d2.count / maxH) * 50) : 4;
                  const isToday2 = dk(thisWeek[i]) === todayKey;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: d2.count > 0 ? "#16a34a" : tx2 }}>{d2.count || ""}</span>
                      <div style={{ width: "100%", height: h, borderRadius: 4, background: d2.count > 0 ? "#16a34a" : (dark ? "#333" : "#e0e0e0"), transition: "height 0.3s" }} />
                      <span style={{ fontSize: 9, fontWeight: isToday2 ? 800 : 500, color: isToday2 ? (dark ? "#6366f1" : "#1a1a2e") : tx2 }}>{d2.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[[done, "Terminés", "#16a34a"], [active, "Restants", "#d97706"], [Math.round(totalRevHours), "Heures restantes", "#6366f1"], [`${weeklyTarget}/sem`, "Objectif hebdo", "#14b8a6"]].map(([v, l, c]) => (
            <div key={l} style={{ ...crd, textAlign: "center", padding: "14px 10px" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: c }}>{v}</div>
              <div style={{ fontSize: 11, color: tx2 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Weekly fitness */}
        {(() => {
          const thisWeek = getWeekDates(new Date());
          const muscuCount = thisWeek.filter(d => mSt(dk(d)) === "done").length;
          const stepsArr = thisWeek.map(d => stepsLog[dk(d)] || 0);
          const stepsAvg = Math.round(stepsArr.reduce((a, b) => a + b, 0) / 7);
          const daysOver10k = stepsArr.filter(s => s >= 10000).length;
          return (
            <div style={{ ...crd }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: dark ? "#fff" : "#1a1a2e" }}>🏃 Cette semaine</div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: muscuCount >= 4 ? "#16a34a" : muscuCount >= 2 ? "#d97706" : "#dc2626" }}>{muscuCount}/4</div>
                  <div style={{ fontSize: 10, color: tx2 }}>🏋️ Muscu</div>
                  <div style={{ display: "flex", gap: 2, justifyContent: "center", marginTop: 4 }}>{[0, 1, 2, 3].map(i => <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: i < muscuCount ? "#16a34a" : (dark ? "#333" : "#e0e0e0") }} />)}</div>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: stepsAvg >= 10000 ? "#16a34a" : stepsAvg >= 7000 ? "#d97706" : "#dc2626" }}>{(stepsAvg / 1000).toFixed(1)}k</div>
                  <div style={{ fontSize: 10, color: tx2 }}>👟 Moy. pas/jour</div>
                  <div style={{ fontSize: 10, color: tx2, marginTop: 2 }}>{daysOver10k}/7 jours à 10k+</div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* UE Progress */}
        <div style={{ ...crd }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: dark ? "#fff" : "#1a1a2e" }}>📈 Progression par UE</div>
          {ueList.length === 0 && <div style={{ fontSize: 13, color: tx2 }}>Ajoute des cours pour voir ta progression</div>}
          {ueList.map(ue => {
            const uC = courses.filter(c => c.ue === ue), uD = uC.filter(c => c.completed).length, p2 = uC.length > 0 ? Math.round(uD / uC.length * 100) : 0;
            return (
              <div key={ue} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, color: ueCol(ue, ueList) }}>{ue}</span>
                  <span style={{ color: tx2 }}>{uD}/{uC.length} ({p2}%)</span>
                </div>
                <div style={{ height: 8, background: dark ? "#333" : "#e0e0e0", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${p2}%`, height: "100%", background: ueCol(ue, ueList), borderRadius: 4, transition: "width 0.4s" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Historical progression */}
        {(() => {
          // Build weekly data from semester start
          const weeks = [];
          let wStart = new Date(SEM_START);
          while (wStart <= new Date()) {
            const wEnd = addD(wStart, 6);
            const wDates = Array.from({ length: 7 }, (_, i) => dk(addD(wStart, i)));
            const doneInWeek = courses.filter(c => c.completedDate && wDates.includes(c.completedDate)).length;
            const weekNum = Math.ceil((wStart - SEM_START) / 604800000) + 1;
            weeks.push({ weekNum, doneInWeek, start: new Date(wStart) });
            wStart = addD(wStart, 7);
          }
          if (weeks.length < 2) return null;

          const maxDone = Math.max(...weeks.map(w => w.doneInWeek), 20);
          const cumulative = [];
          let cumTotal = 0;
          weeks.forEach(w => { cumTotal += w.doneInWeek; cumulative.push(cumTotal); });
          const maxCum = Math.max(cumTotal, 1);

          return (
            <div style={{ ...crd }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: dark ? "#fff" : "#1a1a2e" }}>📊 Historique de progression</div>

              {/* Weekly bar chart */}
              <div style={{ fontSize: 11, fontWeight: 600, color: tx2, marginBottom: 6 }}>Cours/semaine</div>
              <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 80, marginBottom: 12 }}>
                {weeks.map((w, i) => {
                  const h = w.doneInWeek > 0 ? Math.max(6, (w.doneInWeek / maxDone) * 70) : 3;
                  const isCurrent = i === weeks.length - 1;
                  const onTarget = w.doneInWeek >= weeklyTarget;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 0 }}>
                      {w.doneInWeek > 0 && <span style={{ fontSize: 8, fontWeight: 700, color: onTarget ? "#16a34a" : "#d97706" }}>{w.doneInWeek}</span>}
                      <div style={{ width: "100%", height: h, borderRadius: 3, background: isCurrent ? "#6366f1" : onTarget ? "#16a34a" : w.doneInWeek > 0 ? "#d97706" : (dark ? "#333" : "#e0e0e0"), transition: "height 0.3s", minWidth: 4 }} />
                      <span style={{ fontSize: 7, color: isCurrent ? "#6366f1" : tx2, fontWeight: isCurrent ? 700 : 400 }}>S{w.weekNum}</span>
                    </div>
                  );
                })}
              </div>
              {/* Target line */}
              <div style={{ fontSize: 10, color: tx2, textAlign: "center", marginBottom: 12 }}>— objectif 21/semaine —</div>

              {/* Cumulative line */}
              <div style={{ fontSize: 11, fontWeight: 600, color: tx2, marginBottom: 6 }}>Progression cumulée</div>
              <svg width="100%" height="60" viewBox={`0 0 ${weeks.length * 30} 60`} style={{ overflow: "visible" }}>
                {/* Background grid */}
                <line x1="0" y1="59" x2={weeks.length * 30} y2="59" stroke={dark ? "#333" : "#e0e0e0"} strokeWidth="1" />
                {/* Cumulative line */}
                <polyline
                  fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  points={cumulative.map((v, i) => `${i * 30 + 15},${58 - (v / maxCum * 50)}`).join(" ")}
                />
                {/* Dots */}
                {cumulative.map((v, i) => (
                  <circle key={i} cx={i * 30 + 15} cy={58 - (v / maxCum * 50)} r="3" fill={i === cumulative.length - 1 ? "#6366f1" : (dark ? "#fff" : "#1a1a2e")} />
                ))}
              </svg>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: tx2, marginTop: 4 }}>
                <span>S1</span>
                <span style={{ fontWeight: 700, color: "#6366f1" }}>{cumTotal} cours total</span>
                <span>S{weeks.length}</span>
              </div>
            </div>
          );
        })()}

        {/* Quick info */}
        <div style={{ ...crd, background: dark ? "#1a1a3e" : "#1a1a2e", color: "white" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>📋 Récurrent</div>
          <div style={{ fontSize: 11, lineHeight: 1.8, color: "#ccc" }}>• Lun/Jeu — Danse (stop 16h) · Mar/Mer/Ven/Sam — Muscu 7h15<br />• Sam aprèm libre · Dim OFF + 3h flashcards · Fin max 21h30</div>
        </div>
      </div>)}

      {/* ═══ PLANNING ═══ */}
      {tab === "plan" && !selDate && (<div>
        {/* View toggle */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <button onClick={() => setViewMode("month")} style={{ ...viewMode === "month" ? btnP : btnS, flex: 1, padding: "8px" }}>Mois</button>
          <button onClick={() => { setViewMode("week"); setWeekStart(getWeekDates(new Date())[0]); }} style={{ ...viewMode === "week" ? btnP : btnS, flex: 1, padding: "8px" }}>Semaine</button>
        </div>

        {viewMode === "month" && <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} style={{ ...btnS, padding: "8px 12px" }}>←</button>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{MN[viewMonth.getMonth()]} {viewMonth.getFullYear()}</span>
            <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} style={{ ...btnS, padding: "8px 12px" }}>→</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 6 }}>{["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d, i) => <div key={i} style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: tx2, padding: 4 }}>{d}</div>)}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
            {getMonthGrid(viewMonth.getFullYear(), viewMonth.getMonth()).map((cell, i) => {
              const k = dk(cell.date), slot = sMap[k], nC = slot?.assigned?.length || 0, de2 = events.filter(e => e.date === k);
              const isT = k === dk(new Date()), isE = k === dk(EXAM), isS = cell.date.getDay() === 0;
              const diffs = slot?.assigned?.map(c => c.difficulty || "medium") || [];
              const doneHere = courses.filter(c => c.completedDate === k).length;
              return (
                <button key={i} onClick={() => { if (cell.ok) setSelDate(cell.date); }} style={{ background: isT ? (dark ? "#6366f1" : "#1a1a2e") : isE ? "#dc2626" : isS ? (dark ? "#1a1a2e" : "#fffde7") : bg2, border: `1px solid ${brd}`, borderRadius: 10, padding: "8px 4px", minHeight: 80, cursor: cell.ok ? "pointer" : "default", opacity: cell.ok ? 1 : 0.3, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: 15, fontWeight: isT ? 800 : 600, color: (isT || isE) ? "white" : tx }}>{cell.date.getDate()}</span>
                  {nC > 0 && <div style={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center" }}>{diffs.slice(0, 4).map((d, j) => <div key={j} style={{ width: 5, height: 5, borderRadius: 3, background: DIFF[d]?.color }} />)}{nC > 4 && <span style={{ fontSize: 7, color: tx2 }}>+{nC - 4}</span>}</div>}
                  {doneHere > 0 && cell.ok && <span style={{ fontSize: 8, fontWeight: 800, color: "#16a34a" }}>✓{doneHere}</span>}
                  {de2.length > 0 && <div style={{ width: 5, height: 5, borderRadius: 3, background: "#673AB7" }} />}
                  {mSt(k) && cell.ok && <span style={{ fontSize: 7 }}>{mSt(k) === "done" ? (mSp(k) === 0 ? "🦵" : "💪") : "❌"}</span>}
                  {stepsLog[k] >= 10000 && cell.ok && <span style={{ fontSize: 7 }}>👟</span>}
                  {isS && cell.ok && <span style={{ fontSize: 7, color: "#F57F17" }}>OFF</span>}
                </button>
              );
            })}
          </div>
        </>}

        {viewMode === "week" && weekDates && <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <button onClick={() => setWeekStart(addD(weekStart, -7))} style={{ ...btnS, padding: "8px 12px" }}>←</button>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{weekDates[0].getDate()} — {weekDates[6].getDate()} {MN[weekDates[6].getMonth()]}</span>
            <button onClick={() => setWeekStart(addD(weekStart, 7))} style={{ ...btnS, padding: "8px 12px" }}>→</button>
          </div>
          {weekDates.map(date => {
            const k = dk(date), slot = sMap[k], nC = slot?.assigned?.length || 0, isT = k === dk(new Date()), dow = date.getDay();
            const cfg = DCFG[dow], totH = slot?.assigned?.reduce((s, c) => s + DIFF[c.difficulty || "medium"].time, 0) || 0;
            const doneHere2 = courses.filter(c => c.completedDate === k).length;
            return (
              <button key={k} onClick={() => setSelDate(date)} style={{ ...crd, width: "100%", textAlign: "left", cursor: "pointer", borderLeft: isT ? "4px solid #6366f1" : "4px solid transparent", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
                <div style={{ width: 44, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: tx2, fontWeight: 600 }}>{DN[dow]}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: isT ? "#6366f1" : tx }}>{date.getDate()}</div>
                  {mSt(k) && <span style={{ fontSize: 9 }}>{mSt(k) === "done" ? (mSp(k) === 0 ? "🦵" : "💪") : "❌"}</span>}
                  {stepsLog[k] >= 10000 && <span style={{ fontSize: 9 }}>👟</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: tx2, marginBottom: 2 }}>{cfg.e} {cfg.tag}</div>
                  {nC > 0 ? <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{slot.assigned.slice(0, 3).map((c, j) => { const d = DIFF[c.difficulty || "medium"]; return <span key={j} style={{ fontSize: 11, padding: "2px 6px", borderRadius: 6, background: d.bg, color: d.color, fontWeight: 600 }}>{d.emoji} {(c.pdfName || c.name).slice(0, 20)}</span>; })}{nC > 3 && <span style={{ fontSize: 11, color: tx2 }}>+{nC - 3}</span>}</div> :
                    dow === 0 ? <span style={{ fontSize: 12, color: "#F57F17" }}>☀️ OFF + Flashcards</span> : <span style={{ fontSize: 12, color: tx2, fontStyle: "italic" }}>Pas de cours</span>}
                </div>
                <div style={{ textAlign: "right", minWidth: 44 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: dark ? "#fff" : "#1a1a2e" }}>{nC}</div>
                  <div style={{ fontSize: 9, color: tx2 }}>{fH(totH)}</div>
                  {doneHere2 > 0 && <div style={{ fontSize: 10, fontWeight: 700, color: "#16a34a" }}>✓{doneHere2}</div>}
                </div>
              </button>
            );
          })}
        </>}
      </div>)}

      {/* ═══ DAY DETAIL ═══ */}
      {tab === "plan" && selDate && (<div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={() => setSelDate(null)} style={{ ...btnS, padding: "8px 12px" }}>← Retour</button>
          <button onClick={() => setSelDate(addD(selDate, -1))} style={{ ...btnS, padding: "8px 12px" }}>◀ Veille</button>
          <button onClick={() => setSelDate(addD(selDate, 1))} style={{ ...btnS, padding: "8px 12px" }}>Lendemain ▶</button>
        </div>

        {selSlot ? (<div>
          {(() => {
            // Weekly muscu counter
            const weekDays2 = getWeekDates(selDate);
            const muscuThisWeek = weekDays2.filter(d => mSt(dk(d)) === "done").length;
            const muscuToday = mSt(selKey);
            const muscuSplit = mSp(selKey);
            const nextSplit = getNextSplit(muscuLog);
            const weekDoneCount = weekDays2.reduce((s, d) => s + courses.filter(c => c.completedDate === dk(d)).length, 0);
            const dayDoneCount = courses.filter(c => c.completedDate === selKey).length;
            return <>
              <div style={crd}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><span style={{ fontSize: 18 }}>{selSlot.cfg.e}</span> <span style={{ fontWeight: 700, fontSize: 17 }}>{selSlot.cfg.n} {selDate.getDate()} {MN[selDate.getMonth()]}</span><div style={{ fontSize: 11, color: tx2, marginTop: 2 }}>{selSlot.cfg.tag}</div></div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{selSlot.assigned.length}</div>
                    <div style={{ fontSize: 10, color: tx2 }}>cours prévus</div>
                  </div>
                </div>
                {/* Completion stats */}
                <div style={{ display: "flex", gap: 12, marginTop: 10, padding: "8px 0", borderTop: `1px solid ${brd}` }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: dayDoneCount > 0 ? "#16a34a" : tx2 }}>{dayDoneCount}</span>
                    <span style={{ fontSize: 11, color: tx2 }}>fait{dayDoneCount > 1 ? "s" : ""} aujourd'hui</span>
                  </div>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: weekDoneCount >= 21 ? "#16a34a" : weekDoneCount > 0 ? "#6366f1" : tx2 }}>{weekDoneCount}</span>
                    <span style={{ fontSize: 11, color: tx2 }}>/21 semaine</span>
                  </div>
                </div>
              </div>

              {/* Muscu tracker - any day */}
              {selSlot.dow !== 0 && (
                <div style={{ ...crd, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🏋️</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: muscuToday === "done" ? "#16a34a" : tx }}>
                        {muscuToday === "done" ? `${MUSCU_SPLIT[muscuSplit]} ✓` : muscuToday === "skipped" ? "Muscu ✕ ratée" : `Prochaine : ${MUSCU_SPLIT[nextSplit]}`}
                      </div>
                      <div style={{ fontSize: 11, color: tx2 }}>
                        Cette semaine : <strong style={{ color: muscuThisWeek >= 4 ? "#16a34a" : muscuThisWeek >= 2 ? "#d97706" : "#dc2626" }}>{muscuThisWeek}/4</strong>
                        {" "}{[0, 1, 2, 3].map(i => i < muscuThisWeek ? "🟩" : "⬜").join("")}
                      </div>
                      {muscuToday === "done" && <div style={{ fontSize: 10, color: tx2, marginTop: 2 }}>⏰ 7h15–9h15 (2h avec trajet)</div>}
                      {muscuToday === "skipped" && selSlot.muscuPlanned && <div style={{ fontSize: 10, color: "#16a34a", marginTop: 2 }}>+2h de révisions récupérées</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {!muscuToday && <>
                      <button onClick={() => markMuscu(selKey, "done")} style={{ padding: "6px 12px", borderRadius: 8, border: "2px solid #16a34a", background: "transparent", color: "#16a34a", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>✓ Faite</button>
                      <button onClick={() => markMuscu(selKey, "skipped")} style={{ padding: "6px 12px", borderRadius: 8, border: "2px solid #dc2626", background: "transparent", color: "#dc2626", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>✕ Pas faite</button>
                    </>}
                    {muscuToday && <button onClick={() => { setMuscuLog(p => { const n = { ...p }; delete n[selKey]; return n; }); }} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${brd}`, background: "transparent", color: tx2, fontSize: 12, cursor: "pointer" }}>↺ Annuler</button>}
                  </div>
                </div>
              )}

              {/* Steps tracker */}
              {selSlot.dow !== 0 && (() => {
                const todaySteps = stepsLog[selKey] || 0;
                const stepsTarget = 10000;
                const stepsPct = Math.min(100, Math.round(todaySteps / stepsTarget * 100));
                const weekDays3 = getWeekDates(selDate);
                const weekAvg = Math.round(weekDays3.reduce((s, d2) => s + (stepsLog[dk(d2)] || 0), 0) / 7);
                return (
                  <div style={{ ...crd, padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 18 }}>👟</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: todaySteps >= stepsTarget ? "#16a34a" : tx }}>
                            {todaySteps > 0 ? `${todaySteps.toLocaleString()} pas` : "Pas enregistrés"} {todaySteps >= stepsTarget && "✓"}
                          </div>
                          <div style={{ fontSize: 10, color: tx2 }}>Objectif : 10 000 · Moy. semaine : {weekAvg.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 6, background: dark ? "#333" : "#e0e0e0", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
                      <div style={{ width: `${stepsPct}%`, height: "100%", background: todaySteps >= stepsTarget ? "#16a34a" : "#d97706", borderRadius: 3, transition: "width 0.3s" }} />
                    </div>
                    {/* Quick add buttons + input */}
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <input type="number" placeholder="Nombre de pas" value={todaySteps || ""} onChange={e => { const v = parseInt(e.target.value) || 0; setStepsLog(p => ({ ...p, [selKey]: v })); }}
                        style={{ ...inp, width: 120, padding: "6px 10px", fontSize: 13 }} />
                      {[5000, 8000, 10000, 12000].map(v => (
                        <button key={v} onClick={() => setStepsLog(p => ({ ...p, [selKey]: v }))}
                          style={{ padding: "4px 10px", borderRadius: 8, border: todaySteps === v ? "2px solid #16a34a" : `1px solid ${brd}`, background: todaySteps === v ? "#dcfce7" : "transparent", fontSize: 11, cursor: "pointer", fontWeight: 600, color: todaySteps === v ? "#16a34a" : tx2 }}>
                          {(v / 1000)}k
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>;
          })()}

          {selBlocks.map((b, i) => {
            const course = b.course, diff = b.diff ? DIFF[b.diff] : null;
            const sty = diff ? { bg: diff.bg, b: diff.color, c: diff.color } : (BS[b.tp] || BS.pause);
            const isSkipped = course && overrides[selKey]?.skipped?.includes(course.id);

            return (<div key={i}>
              <div style={{ display: "flex", marginBottom: 3, opacity: (course?.completed || isSkipped) ? 0.4 : 1 }}>
                <div style={{ width: 72, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6 }}><span style={{ fontSize: 10, fontWeight: 600, color: tx2 }}>{b.t}</span></div>
                <div style={{ flex: 1, background: dark ? (diff ? `${diff.color}15` : `${sty.b}10`) : sty.bg, borderLeft: `4px solid ${sty.b}`, borderRadius: 10, padding: b.tp === "pause" ? "5px 10px" : "9px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, minHeight: b.tp === "off" || b.tp === "free" ? 44 : b.tp === "pause" ? 24 : 34 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                    {course && <button onClick={() => toggle(course.id)} style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${course.completed ? "#16a34a" : brd}`, background: course.completed ? "#16a34a" : "transparent", color: "white", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{course.completed && "✓"}</button>}
                    {!course && <span style={{ fontSize: b.tp === "pause" ? 11 : 14 }}>{sty.i}</span>}
                    <span style={{ fontSize: b.tp === "pause" ? 11 : 12, fontWeight: b.tp === "pause" ? 500 : 600, color: sty.c, textDecoration: (course?.completed || isSkipped) ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.l}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                    {course && <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 6, background: `${ueCol(course.ue, ueList)}18`, color: ueCol(course.ue, ueList) }}>{course.ue}</span>}
                    {diff && <span style={{ fontSize: 11 }}>{diff.emoji}</span>}
                    {b.hours > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: sty.c }}>{fH(b.hours)}</span>}
                    {course && !course.completed && <button onClick={() => setShowMenu(showMenu === course.id ? null : course.id)} style={{ background: "none", border: "none", fontSize: 13, cursor: "pointer", color: tx2 }}>⋯</button>}
                    {/* Start pomodoro on this course */}
                    {course && !course.completed && <button onClick={() => { setPomo({ active: false, work: true, left: DIFF[course.difficulty || "medium"].time * 3600, total: DIFF[course.difficulty || "medium"].time * 3600, course: course.pdfName || course.name }); setTab("pomo"); }} style={{ background: "none", border: "none", fontSize: 11, cursor: "pointer", color: tx2 }}>⏱️</button>}
                  </div>
                </div>
              </div>
              {course && showMenu === course.id && (
                <div style={{ marginLeft: 72, marginBottom: 6, display: "flex", gap: 4, flexWrap: "wrap", padding: "6px 0" }}>
                  <button onClick={() => { skipCourse(selKey, course.id); }} style={{ ...btnS, padding: "6px 12px", fontSize: 11 }}>⏭️ Sauter</button>
                  <button onClick={() => postpone(course.id)} style={{ ...btnS, padding: "6px 12px", fontSize: 11 }}>📅 Reporter</button>
                  <button onClick={() => del(course.id)} style={{ ...btnS, padding: "6px 12px", fontSize: 11, color: "#dc2626" }}>🗑️</button>
                  <button onClick={() => setShowMenu(null)} style={{ background: "none", border: "none", color: tx2, cursor: "pointer", fontSize: 11 }}>Annuler</button>
                </div>
              )}
              {/* Time recording after completion */}
              {course && showTimeRecord === course.id && course.completed && (
                <div style={{ marginLeft: 72, marginBottom: 6, padding: "8px 12px", background: dark ? "#1a2a1a" : "#dcfce7", borderRadius: 10, borderLeft: "4px solid #16a34a" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#16a34a", marginBottom: 6 }}>✓ Fait ! Combien de temps ça t'a pris ?</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {[0.5, 1, 1.5, 2, 2.5, 3].map(h => (
                      <button key={h} onClick={() => { recordTime(course.id, h); setShowTimeRecord(null); }}
                        style={{ padding: "5px 12px", borderRadius: 8, border: `2px solid ${h <= DIFF.easy.time ? DIFF.easy.color : h <= DIFF.medium.time ? DIFF.medium.color : DIFF.hard.color}`, background: "transparent", fontSize: 12, fontWeight: 700, cursor: "pointer", color: h <= DIFF.easy.time ? DIFF.easy.color : h <= DIFF.medium.time ? DIFF.medium.color : DIFF.hard.color }}>
                        {fH(h)}
                      </button>
                    ))}
                    <button onClick={() => setShowTimeRecord(null)} style={{ padding: "5px 8px", borderRadius: 8, border: `1px solid ${brd}`, background: "transparent", fontSize: 11, cursor: "pointer", color: tx2 }}>Passer</button>
                  </div>
                  <div style={{ fontSize: 10, color: tx2, marginTop: 4 }}>La difficulté sera ajustée automatiquement si besoin</div>
                </div>
              )}
            </div>);
          })}
        </div>) : <div style={{ ...crd, textAlign: "center", color: tx2, padding: 30 }}>Pas de données</div>}
      </div>)}

      {/* ═══ COURS ═══ */}
      {tab === "cours" && (<div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
          {[[total, "ajoutés", dark ? "#fff" : "#1a1a2e"], [done, "terminés", "#16a34a"], [active, "restants", "#d97706"]].map(([n, l, c]) => <div key={l} style={{ ...crd, textAlign: "center", padding: "10px 6px" }}><div style={{ fontSize: 20, fontWeight: 800, color: c }}>{n}</div><div style={{ fontSize: 10, color: tx2 }}>{l}</div></div>)}
        </div>

        <label style={{ ...btnP, width: "100%", marginBottom: 8, textAlign: "center", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 15, padding: "14px 20px", boxSizing: "border-box" }}>
          📄 Ajouter des cours (multi-PDF) <input ref={fileRef} type="file" accept=".pdf,image/*" multiple onChange={handleFiles} style={{ display: "none" }} />
        </label>

        <button onClick={handleRebalance} disabled={rebalancing || active < 3} style={{ ...btnS, width: "100%", marginBottom: 12, background: rebalancing ? (dark ? "#333" : "#f5f5f5") : (dark ? "linear-gradient(135deg,#1a3a1a,#3a3a1a,#3a1a1a)" : "linear-gradient(135deg,#dcfce7,#fef3c7,#fee2e2)"), opacity: active < 3 ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxSizing: "border-box" }}>
          {rebalancing ? "⏳ Rééquilibrage en cours..." : `⚖️ Rééquilibrer les difficultés (IA comparative — ${active} cours)`}
        </button>

        {/* Queue */}
        {queue.length > 0 && <div style={{ ...crd, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}><span style={{ fontSize: 12, fontWeight: 700 }}>📄 File ({queue.filter(q => q.s === "d").length}/{queue.length})</span>{!isProc && <button onClick={() => setQueue([])} style={{ background: "none", border: "none", color: tx2, cursor: "pointer", fontSize: 11 }}>Vider</button>}</div>
          <div style={{ height: 5, background: dark ? "#333" : "#e0e0e0", borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${queue.filter(q => q.s === "d" || q.s === "e").length / queue.length * 100}%`, height: "100%", background: "#16a34a", borderRadius: 3, transition: "width 0.4s" }} /></div>
          <div style={{ marginTop: 6, maxHeight: 100, overflow: "auto" }}>{queue.map(q => <div key={q.id} style={{ fontSize: 11, padding: "2px 0", display: "flex", alignItems: "center", gap: 4, color: q.s === "e" ? "#dc2626" : tx2 }}><span>{q.s === "d" ? "✅" : q.s === "e" ? "❌" : q.s === "p" ? "⏳" : "⏸️"}</span><span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.fn}</span></div>)}</div>
        </div>}

        {/* Pending */}
        {pending.map(item => <div key={item.id} style={{ ...crd, borderLeft: "4px solid #d97706" }}>
          <div style={{ fontWeight: 700, color: "#166534", marginBottom: 4 }}>✨ {item.res.ue} · <span style={{ fontWeight: 500, color: tx2 }}>{item.fn}</span></div>
          {item.res.courses?.map((c, i) => { const d = DIFF[c.difficulty || "medium"]; return <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", fontSize: 12 }}><span>{d.emoji}</span><span style={{ flex: 1 }}>{c.name}</span><span style={{ color: d.color, fontWeight: 600, fontSize: 11 }}>{d.label}→{fH(d.time)}</span></div>; })}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => acceptRes(item.id, 1)} style={{ ...btnP, flex: 1 }}>1h (1 cours)</button>
            <button onClick={() => acceptRes(item.id, 2)} style={{ ...btnS, flex: 1, fontWeight: 700 }}>2h (2 cours)</button>
            <button onClick={() => setPending(p => p.filter(r => r.id !== item.id))} style={{ ...btnS, padding: "8px 12px", color: tx2 }}>✕</button>
          </div>
        </div>)}

        {/* UE list */}
        {ueList.map(ue => {
          const uC = courses.filter(c => c.ue === ue).sort((a, b) => {
            // Extract course number from name for proper ordering
            const numA = parseInt((a.pdfName || a.name).match(/\d+/)?.[0] || "999");
            const numB = parseInt((b.pdfName || b.name).match(/\d+/)?.[0] || "999");
            if (numA !== numB) return numA - numB;
            // Same number: (1/2) before (2/2)
            const partA = (a.pdfName || "").includes("(2/") ? 1 : 0;
            const partB = (b.pdfName || "").includes("(2/") ? 1 : 0;
            return partA - partB;
          });
          const uD = uC.filter(c => c.completed).length;
          return <div key={ue} style={{ ...crd, borderLeft: `4px solid ${ueCol(ue, ueList)}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontWeight: 700, color: ueCol(ue, ueList), fontSize: 13 }}>{ue}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: tx2 }}>{uD}/{uC.length}</span>
                {ueList.length > 1 && <button onClick={() => setMergeFrom(mergeFrom === ue ? null : ue)} style={{ background: "none", border: "none", color: tx2, cursor: "pointer", fontSize: 11 }}>🔗</button>}
              </div>
            </div>
            {/* Merge picker */}
            {mergeFrom === ue && (
              <div style={{ padding: "8px 0", marginBottom: 6, borderBottom: `1px solid ${brd}` }}>
                <div style={{ fontSize: 11, color: tx2, marginBottom: 6 }}>Fusionner "{ue}" dans :</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {ueList.filter(u => u !== ue).map(target => (
                    <button key={target} onClick={() => mergeUE(ue, target)} style={{ padding: "4px 10px", borderRadius: 8, border: `2px solid ${ueCol(target, ueList)}`, background: "transparent", color: ueCol(target, ueList), fontWeight: 700, fontSize: 11, cursor: "pointer" }}>{target}</button>
                  ))}
                  <button onClick={() => setMergeFrom(null)} style={{ padding: "4px 8px", borderRadius: 8, border: `1px solid ${brd}`, background: "transparent", color: tx2, fontSize: 11, cursor: "pointer" }}>Annuler</button>
                </div>
              </div>
            )}
            {uC.map(c => { const d = DIFF[c.difficulty || "medium"]; const isDragging = dragItem === c.id; return <div key={c.id}
              draggable
              onDragStart={() => setDragItem(c.id)}
              onDragEnd={() => setDragItem(null)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleDrop(c.id, ue); }}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 0", borderBottom: `1px solid ${brd}`, opacity: isDragging ? 0.4 : 1, cursor: "grab", borderTop: isDragging ? "none" : undefined, background: dragItem && dragItem !== c.id ? `${ueCol(ue, ueList)}08` : "transparent", borderRadius: 4, transition: "background 0.15s" }}>
              <span style={{ fontSize: 10, color: tx2, cursor: "grab", padding: "0 2px", userSelect: "none" }}>⠿</span>
              <button onClick={() => toggle(c.id)} style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${c.completed ? "#16a34a" : brd}`, background: c.completed ? "#16a34a" : "transparent", color: "white", fontSize: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{c.completed && "✓"}</button>
              <div style={{ display: "flex", gap: 1 }}>{Object.entries(DIFF).map(([k, v]) => <button key={k} onClick={() => changeDiff(c.id, k)} style={{ width: 16, height: 16, borderRadius: 8, border: c.difficulty === k ? `2px solid ${v.color}` : `1px solid ${brd}`, background: c.difficulty === k ? v.bg : "transparent", fontSize: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{v.emoji}</button>)}</div>
              <span style={{ flex: 1, fontSize: 11, color: c.completed ? tx2 : tx, textDecoration: c.completed ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.pdfName}</span>
              <span style={{ fontSize: 9, color: tx2 }}>{fH(d.time)}</span>
              <button onClick={() => del(c.id)} style={{ background: "none", border: "none", color: tx2, cursor: "pointer", fontSize: 12 }}>×</button>
            </div>; })}
          </div>;
        })}
        {!total && !pending.length && <div style={{ textAlign: "center", padding: 40, color: tx2 }}><div style={{ fontSize: 40 }}>📚</div>Upload tes PDF !</div>}
      </div>)}

      {/* ═══ POMODORO ═══ */}
      {tab === "pomo" && (<div>
        <div style={{ ...crd, textAlign: "center", padding: 30 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: pomo.work ? "#dc2626" : "#16a34a", marginBottom: 6 }}>{pomo.work ? "📖 TRAVAIL" : "☕ PAUSE"}</div>
          {pomo.course && <div style={{ fontSize: 12, color: tx2, marginBottom: 12 }}>{pomo.course}</div>}
          {/* Circular progress */}
          <div style={{ position: "relative", width: 200, height: 200, margin: "0 auto 20px" }}>
            <svg width="200" height="200" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="100" cy="100" r="90" fill="none" stroke={dark ? "#333" : "#e0e0e0"} strokeWidth="8" />
              <circle cx="100" cy="100" r="90" fill="none" stroke={pomo.work ? "#dc2626" : "#16a34a"} strokeWidth="8" strokeDasharray={565.5} strokeDashoffset={565.5 * (1 - pomoPct / 100)} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
            </svg>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 40, fontWeight: 800, color: dark ? "#fff" : "#1a1a2e" }}>
              {String(pomoMin).padStart(2, "0")}:{String(pomoSec).padStart(2, "0")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={() => setPomo(p => ({ ...p, active: !p.active }))} style={{ ...btnP, padding: "12px 30px", fontSize: 15, background: pomo.active ? "#dc2626" : (dark ? "#6366f1" : "#1a1a2e") }}>
              {pomo.active ? "⏸ Pause" : "▶ Start"}
            </button>
            <button onClick={() => setPomo({ active: false, work: true, left: 50 * 60, total: 50 * 60, course: null })} style={{ ...btnS, padding: "12px 20px" }}>↺ Reset</button>
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 16 }}>
            {[25, 50, 90].map(m => <button key={m} onClick={() => setPomo(p => ({ ...p, active: false, work: true, left: m * 60, total: m * 60 }))} style={{ ...btnS, padding: "6px 14px", fontSize: 12 }}>{m}min</button>)}
          </div>
        </div>
      </div>)}

      {/* ═══ EVENTS ═══ */}
      {tab === "events" && (<div>
        <button onClick={() => setShowEvt(!showEvt)} style={{ ...btnP, width: "100%", marginBottom: 12, boxSizing: "border-box" }}>+ Obligation / RDV</button>
        {showEvt && <div style={crd}><div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input placeholder="RDV, partiel, cours présentiel..." value={eN} onChange={e => setEN(e.target.value)} style={inp} />
          <div style={{ display: "flex", gap: 8 }}>
            <input type="date" value={eD} onChange={e => setED(e.target.value)} style={{ ...inp, flex: 1 }} />
            <input type="time" value={eT} onChange={e => setET(e.target.value)} style={{ ...inp, width: 100 }} />
            <select value={eH} onChange={e => setEH(parseInt(e.target.value))} style={{ ...inp, width: 80 }}>
              {[1, 2, 3, 4, 8].map(h => <option key={h} value={h}>{h === 8 ? "Journée" : h + "h"}</option>)}
            </select>
          </div>
          <button onClick={addEvt} style={btnP}>Ajouter</button>
        </div></div>}
        {events.sort((a, b) => a.date.localeCompare(b.date)).map(ev => <div key={ev.id} style={{ ...crd, display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontWeight: 600, fontSize: 13 }}>📌 {ev.name}</div><div style={{ fontSize: 11, color: tx2 }}>{new Date(ev.date + "T12:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}{ev.startMin != null ? ` · ${fm(ev.startMin)}–${fm(ev.startMin + ev.hours * 60)}` : ""} · {ev.hours}h</div></div><button onClick={() => delEvt(ev.id)} style={{ background: dark ? "#3a1a1a" : "#fee", border: "none", color: "#E91E63", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontWeight: 600 }}>✕</button></div>)}
        {!events.length && <div style={{ textAlign: "center", padding: 40, color: tx2 }}><div style={{ fontSize: 40 }}>📌</div>Aucune obligation</div>}
      </div>)}
    </div>
  );
}
