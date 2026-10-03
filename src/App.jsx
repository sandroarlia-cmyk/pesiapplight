import React, { useState, useEffect, useMemo } from "react";
import { Dumbbell, Plus, Trash2, Search, X, ChevronRight, ChevronLeft, Save } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { loadGymData, saveWorkoutDoc, deleteWorkoutDoc, saveConfigDoc } from "./firebaseClient";

// ---------- Dati di base (identici all'app principale) ----------

const MUSCLE_GROUPS = ["Petto", "Spalle", "Dorso", "Gambe", "Bicipiti", "Tricipiti", "Calisthenics", "Addome"];
const DAYS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
const MONTHS_IT = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const RECUPERO_OPTIONS = ["30 sec", "1 min", "1,5 min", "2 min", "2,5 min", "3 min"];

const TAB_ORDER = ["muscoli", "settimana", "serie", "forza"];
const SWIPE_SKIP_SELECTOR = "input, select, textarea, .settimana-popup-overlay";

// Cerca l'elemento scorrevole in orizzontale più vicino al punto toccato.
function findHScroller(el) {
  while (el && el !== document.body) {
    if (el.scrollWidth > el.clientWidth + 1) {
      const ox = getComputedStyle(el).overflowX;
      if (ox === "auto" || ox === "scroll") return el;
    }
    el = el.parentElement;
  }
  return null;
}

const MUSCLE_DARK_COLORS = {
  Petto: "#7a1f1f", Spalle: "#8a5a00", Dorso: "#1a3d7c", Gambe: "#6b6b00",
  Bicipiti: "#8a3b12", Tricipiti: "#0f6b6b", Calisthenics: "#8a1a52", Addome: "#4a5568", Altro: "#555555"
};

const REQUIRED_EXERCISES = {
  Petto: ["Panca piana", "Panca inclinata bilanciere", "Panca inclinata manubri", "Croci ai cavi alti verso il basso", "Dip alle parallele (petto)", "Panca piana manubri", "Croci ai cavi bassi verso l'alto (upper chest)", "Push up / Piegamenti a corpo libero"],
  Dorso: ["Lat Machine presa larga", "Lat Machine presa supina", "Lat Machine presa singola", "Trazioni a presa larga", "Trazioni presa supina", "Trazioni presa neutra", "Pulley basso al cavo", "Pulley basso presa singola", "Rematore Low Row", "Rematore con bilanciere", "Rematore con manubrio", "T-Bar Row con bilanciere", "Pulldown a braccia tese barra", "Pulldown a braccia tese corda"],
  Spalle: ["Military Press bilanciere", "Military Press manubri", "Shoulder Press macchina", "Arnold Press", "Landmine Press a un braccio", "Alzate laterali con manubri", "Alzate laterali ai cavi", "Alzate laterali macchina", "Alzate frontali con manubri", "Alzate frontali con bilanciere", "Alzate frontali ai cavi", "Alzate frontali con disco", "Alzate frontali con kettlebell", "Reverse Pec Deck", "Alzate posteriori con manubri", "Reverse Fly ai cavi", "Reverse Fly con manubri", "Face Pull", "Tirate al mento con bilanciere", "Tirate al mento con manubri"],
  Tricipiti: ["Push Down ai cavi con barra", "Push Down ai cavi con corda", "Push Down ai cavi presa inversa", "Estensioni sopra la testa ai cavi con corda", "French Press con bilanciere EZ", "French Press con manubrio", "Estensioni dietro la testa con manubrio", "Estensioni dietro la testa al cavo", "Dip alle parallele", "Dip alla macchina assistita", "Panca presa stretta", "Kickback Manubrio inclinato in avanti", "Kickback Cavi inclinato in avanti", "Diamond Push-Up"],
  Bicipiti: ["Curl bilanciere EZ", "Curl bilanciere dritto", "Curl manubri", "Curl manubri su panca inclinata", "Curl ai cavi con barra", "Curl ai cavi con corda", "Curl ai cavi unilaterale", "Curl alla panca Scott EZ", "Curl alla panca Scott manubri", "Bayesian Curl ai cavi"],
  Gambe: ["Squat bilanciere", "Squat Multipower", "Squat Macchina verticale", "Leg Press 45° Pressa", "Leg Press orizzontale Pressa", "Leg Extension", "Affondi manubri", "Bulgarian Split Squat", "Leg Curl sdraiato", "Leg Curl seduto", "Stacco da terra", "Pressa Polpacci", "Stacco rumeno bilanciere", "Stacco rumeno manubri", "Hip Thrust bilanciere", "Abductor Machine", "Adductor Machine", "Kickback cavo", "Calf Raise Polpacci seduto macchina", "Calf Raise Polpacci manubri", "Calf Raise polpacci in piedi Multipower"],
  Addome: ["Crunch a terra", "Crunch ai cavi", "Crunch alla macchina", "Reverse Crunch", "Leg Raise alla sbarra", "Knee Raise alla sbarra", "Hanging Leg Raise", "Sollevamento gambe su panca", "Plank", "Plank laterale", "Russian Twist", "Woodchopper al cavo", "Pallof Press al cavo", "Ab Wheel", "Mountain Climber", "Side Bend manubrio"],
  Calisthenics: ["Push Up", "Diamond Push Up", "Dip assistite", "Australian Pull Up", "Trazioni con elastico", "Dead Hang", "Scapular Pull Up", "Bodyweight Squat", "Split Squat corpo libero", "Step Up", "Glute Bridge", "Calf Raise corpo libero", "Plank", "Side Plank", "Dead Bug", "Bird Dog", "Hollow Hold", "Leg Raise terra"]
};

const DEFAULT_EXERCISES = Object.entries(REQUIRED_EXERCISES).flatMap(([muscle, names]) =>
  names.map((name) => ({ id: uid(), name, muscle, secondary: "", equipment: "", favorite: false }))
);

// ---------- Funzioni di supporto (identiche all'app principale) ----------

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dayNameFromDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return DAYS[(d.getDay() + 6) % 7];
}
function formatDateShort(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" });
}
function formatDateLong(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function getMonday(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function isoOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function round1(n) { return Math.round(n * 10) / 10; }
function setVolume(s) { return (Number(s.weight) || 0) * (Number(s.reps) || 0); }
function itemVolume(item) { return item.sets.reduce((a, s) => a + setVolume(s), 0); }
function datesForExercise(workouts, exerciseId) {
  return workouts.filter((w) => w.exercises.some((it) => it.exerciseId === exerciseId)).map((w) => w.date).sort((a, b) => (a < b ? 1 : -1));
}
function orderedExerciseList(exercises, group) {
  const order = REQUIRED_EXERCISES[group] || [];
  const orderMap = new Map(order.map((name, i) => [name.trim().toLowerCase(), i]));
  return exercises.filter((e) => e.muscle === group).sort((a, b) => {
    const ai = orderMap.has(a.name.trim().toLowerCase()) ? orderMap.get(a.name.trim().toLowerCase()) : Infinity;
    const bi = orderMap.has(b.name.trim().toLowerCase()) ? orderMap.get(b.name.trim().toLowerCase()) : Infinity;
    return ai - bi;
  });
}
function mergeRequiredExercises(list) {
  const result = [...list];
  Object.entries(REQUIRED_EXERCISES).forEach(([muscle, names]) => {
    const existing = new Set(result.filter((e) => e.muscle === muscle).map((e) => e.name.trim().toLowerCase()));
    names.forEach((name) => {
      if (!existing.has(name.trim().toLowerCase())) {
        result.push({ id: uid(), name, muscle, secondary: "", equipment: "", favorite: false });
        existing.add(name.trim().toLowerCase());
      }
    });
  });
  return result;
}
function weeklyMuscleStats(workouts, exercises, weekStartISO, weekEndISO) {
  const stats = {}; MUSCLE_GROUPS.forEach((m) => (stats[m] = { sets: 0, reps: 0, volume: 0 }));
  workouts.filter((w) => w.date >= weekStartISO && w.date <= weekEndISO).forEach((w) => {
    w.exercises.forEach((it) => {
      const ex = exercises.find((e) => e.id === it.exerciseId);
      if (!ex) return;
      const m = stats[ex.muscle] || (stats[ex.muscle] = { sets: 0, reps: 0, volume: 0 });
      it.sets.forEach((s) => {
        m.sets += 1;
        m.reps += Number(s.reps) || 0;
        m.volume += setVolume(s);
      });
    });
  });
  return stats;
}

function dedupeExercisesAndRemapWorkouts(exercisesList, workoutsList) {
  const canonicalByKey = new Map();
  const idRemap = new Map();
  const result = [];
  exercisesList.forEach((e) => {
    const key = e.muscle + "::" + e.name.trim().toLowerCase();
    if (canonicalByKey.has(key)) idRemap.set(e.id, canonicalByKey.get(key));
    else { canonicalByKey.set(key, e.id); result.push(e); }
  });
  if (idRemap.size === 0) return { exercises: exercisesList, workouts: workoutsList };
  const remappedWorkouts = workoutsList.map((w) => ({
    ...w,
    exercises: w.exercises.map((it) => (idRemap.has(it.exerciseId) ? { ...it, exerciseId: idRemap.get(it.exerciseId) } : it))
  }));
  return { exercises: result, workouts: remappedWorkouts };
}

// ---------- Componenti riutilizzabili ----------

function DateItalianPicker({ value, onChange }) {
  const d = new Date(value + "T00:00:00");
  const day = d.getDate(), month = d.getMonth(), year = d.getFullYear();
  const thisYear = new Date().getFullYear();
  const years = [];
  for (let y = thisYear + 1; y >= thisYear - 15; y--) years.push(y);
  const days = Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1);
  function update(newDay, newMonth, newYear) {
    const safeDay = Math.min(newDay, daysInMonth(newYear, newMonth));
    onChange(`${newYear}-${String(newMonth + 1).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`);
  }
  return (
    <div className="date-it-picker">
      <select className="input" style={{ flex: "0 0 62px" }} value={day} onChange={(e) => update(Number(e.target.value), month, year)}>
        {days.map((dd) => <option key={dd} value={dd}>{dd}</option>)}
      </select>
      <select className="input" style={{ flex: "1 1 auto", minWidth: 0 }} value={month} onChange={(e) => update(day, Number(e.target.value), year)}>
        {MONTHS_IT.map((m, i) => <option key={m} value={i}>{m}</option>)}
      </select>
      <select className="input" style={{ flex: "0 0 86px" }} value={year} onChange={(e) => update(day, month, Number(e.target.value))}>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

function DeleteButton({ onConfirm, small }) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 2500);
    return () => clearTimeout(t);
  }, [confirming]);
  if (confirming) {
    return (
      <button className="btn btn-danger" onClick={() => { onConfirm(); setConfirming(false); }}>Conferma</button>
    );
  }
  return (
    <button className="btn-icon delete-icon-btn" title="Elimina" onClick={() => setConfirming(true)}>
      <Trash2 size={small ? 20 : 24} />
    </button>
  );
}

function PinnedTooltip({ active, payload, label, labelFormatter, formatter, valueColor, onClose }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="pinned-tooltip-box" style={{ background: "var(--surface-2)", border: "1px solid var(--border-c)", borderRadius: 8, padding: "18px 22px", minWidth: 200 }}>
      <div style={{ color: "var(--text-dim)", fontSize: 15, marginBottom: 8 }}>
        {labelFormatter ? labelFormatter(label, payload) : label}
      </div>
      {payload.map((entry, i) => {
        const [val, name] = formatter ? formatter(entry.value, entry.name, entry) : [entry.value, entry.name];
        return (
          <div key={i} style={{ color: valueColor || "#ffffff", fontWeight: 700, fontSize: 20, marginBottom: 3 }}>
            {name}: {val}
          </div>
        );
      })}
    </div>
  );
}

function Section({ title, right, children }) {
  return (
    <div className="card">
      <div className="section-head">
        <h2 className="section-title">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

// ---------- Muscoli: inserimento + elenco con modifica/cancella ----------

function MuscleScreen({ muscle, exercises, setExercises, workouts, setWorkouts }) {
  const draftKey = "gym-lite-draft-" + muscle;
  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  };
  const draft = loadDraft();
  const [date, setDate] = useState(draft && draft.date ? draft.date : todayISO());
  const [items, setItems] = useState(draft && draft.items ? draft.items : []);

  useEffect(() => {
    try {
      if (items.length === 0) localStorage.removeItem(draftKey);
      else localStorage.setItem(draftKey, JSON.stringify({ date, items }));
    } catch { /* storage non disponibile: la bozza semplicemente non persiste */ }
  }, [date, items, draftKey]);
  const [query, setQuery] = useState("");
  const [openExId, setOpenExId] = useState(null);
  const [openDateKeys, setOpenDateKeys] = useState(() => new Set());
  function toggleDateKey(key) {
    setOpenDateKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  const [editingKey, setEditingKey] = useState(null);
  const [openDatesFor, setOpenDatesFor] = useState(() => new Set());

  function toggleDatesFor(exId) {
    setOpenDatesFor((prev) => {
      const next = new Set(prev);
      if (next.has(exId)) next.delete(exId); else next.add(exId);
      return next;
    });
  }
  function lastExecution(exerciseId) {
    const past = workouts.filter((w) => w.date <= date && w.exercises.some((it) => it.exerciseId === exerciseId)).sort((a, b) => (a.date < b.date ? 1 : -1));
    if (!past.length) return null;
    const it = past[0].exercises.find((it) => it.exerciseId === exerciseId);
    if (!it || !it.sets.length) return null;
    return { date: past[0].date, sets: it.sets };
  }
  function secondLastExecution(exerciseId) {
    const past = workouts.filter((w) => w.date <= date && w.exercises.some((it) => it.exerciseId === exerciseId)).sort((a, b) => (a.date < b.date ? 1 : -1));
    if (past.length < 2) return null;
    const it = past[1].exercises.find((it) => it.exerciseId === exerciseId);
    if (!it || !it.sets.length) return null;
    return { date: past[1].date, sets: it.sets };
  }
  function rowsForExercise(exId) {
    return workouts.filter((w) => w.exercises.some((it) => it.exerciseId === exId))
      .map((w) => ({ workoutId: w.id, date: w.date, item: w.exercises.find((it) => it.exerciseId === exId) }))
      .sort((a, b) => (a.date > b.date ? -1 : 1));
  }

  const groupList = orderedExerciseList(exercises, muscle);
  const addedList = groupList.filter((ex) => items.some((it) => it.exerciseId === ex.id));
  const q = query.trim().toLowerCase();
  const availableList = groupList.filter((ex) => !items.some((it) => it.exerciseId === ex.id)).filter((ex) => !q || ex.name.toLowerCase().includes(q));

  function addExerciseToSession(ex) {
    if (items.some((it) => it.exerciseId === ex.id)) return;
    setItems([...items, { id: uid(), exerciseId: ex.id, sets: [{ weight: "", reps: "", rir: "", discs: "", recupero: "", notes: "" }] }]);
  }
  function addCustomExercise(text) {
    if (!text.trim()) return;
    const newEx = { id: uid(), name: text.trim(), muscle, secondary: "", equipment: "", favorite: false };
    setExercises([...exercises, newEx]);
    setItems([...items, { id: uid(), exerciseId: newEx.id, sets: [{ weight: "", reps: "", rir: "", discs: "", recupero: "", notes: "" }] }]);
  }
  function removeExercise(itemId) { setItems(items.filter((it) => it.id !== itemId)); }
  function addSet(itemId) {
    setItems(items.map((it) => (it.id === itemId && it.sets.length < 10 ? { ...it, sets: [...it.sets, { weight: "", reps: "", rir: "", discs: "", recupero: "", notes: "" }] } : it)));
  }
  function updateSet(itemId, idx, field, value) {
    setItems(items.map((it) => (it.id === itemId ? { ...it, sets: it.sets.map((s, i) => (i === idx ? { ...s, [field]: value } : s)) } : it)));
  }
  function removeSet(itemId, idx) {
    setItems(items.map((it) => (it.id === itemId ? { ...it, sets: it.sets.filter((_, i) => i !== idx) } : it)));
  }
  function save() {
    if (!items.length) return;
    setWorkouts([...workouts, { id: uid(), date, exercises: items }]);
    setItems([]);
  }
  function saveOne(itemId) {
    const item = items.find((it) => it.id === itemId);
    if (!item || !item.sets.length) return;
    setWorkouts([...workouts, { id: uid(), date, exercises: [item] }]);
    setItems(items.filter((it) => it.id !== itemId));
  }
  const totalVolume = items.reduce((a, it) => a + itemVolume(it), 0);

  // Storico: elenco già salvato per questo muscolo, per esercizio e data
  const relevantIds = useMemo(() => {
    const ids = new Set();
    workouts.forEach((w) => w.exercises.forEach((it) => {
      const ex = exercises.find((e) => e.id === it.exerciseId);
      if (ex && ex.muscle === muscle) ids.add(it.exerciseId);
    }));
    return ids;
  }, [workouts, exercises, muscle]);
  const orderedIds = orderedExerciseList(exercises, muscle).map((e) => e.id).filter((id) => relevantIds.has(id));

  function updateWorkoutDate(workoutId, newDate) {
    setWorkouts(workouts.map((w) => (w.id === workoutId ? { ...w, date: newDate } : w)));
  }
  function updateSetField(workoutId, exId, idx, field, value) {
    setWorkouts(workouts.map((w) => w.id !== workoutId ? w : {
      ...w, exercises: w.exercises.map((it) => it.exerciseId !== exId ? it : { ...it, sets: it.sets.map((s, i) => i === idx ? { ...s, [field]: value } : s) })
    }));
  }
  function addSetToRow(workoutId, exId) {
    setWorkouts(workouts.map((w) => w.id !== workoutId ? w : {
      ...w, exercises: w.exercises.map((it) => (it.exerciseId !== exId || it.sets.length >= 10) ? it : { ...it, sets: [...it.sets, { weight: "", reps: "", rir: "", discs: "", recupero: "", notes: "" }] })
    }));
  }
  function removeSetFromRow(workoutId, exId, idx) {
    setWorkouts(workouts.map((w) => w.id !== workoutId ? w : {
      ...w, exercises: w.exercises.map((it) => it.exerciseId !== exId ? it : { ...it, sets: it.sets.filter((_, i) => i !== idx) })
    }));
  }
  function deleteEntireEntry(workoutId, exId) {
    const updated = workouts.map((w) => (w.id === workoutId ? { ...w, exercises: w.exercises.filter((it) => it.exerciseId !== exId) } : w)).filter((w) => w.exercises.length > 0);
    setWorkouts(updated);
  }

  function renderDateDetail(exId, r) {
    const key = exId + "-" + r.workoutId;
    const isOpen = openDateKeys.has(key);
    const isEditing = editingKey === key;
    return (
      <div key={key} className="history-date-card">
        <div className="history-date-head row" style={{ justifyContent: "space-between" }} onClick={() => toggleDateKey(key)}>
          <div className="row" style={{ gap: 8 }}>
            <span className="box-date">{formatDateShort(r.date)}</span>
            <span className="box-serie">{r.item.sets.length} serie</span>
          </div>
          {isOpen && (
            <div className="row" style={{ gap: 6 }} onClick={(e) => e.stopPropagation()}>
              <button className="btn btn-ghost" onClick={() => setEditingKey(isEditing ? null : key)}>{isEditing ? "Fatto" : "Modifica"}</button>
              <DeleteButton small onConfirm={() => deleteEntireEntry(r.workoutId, exId)} />
            </div>
          )}
        </div>
        {isOpen && (
          <div className="col" style={{ gap: 8, marginTop: 8 }}>
            {isEditing && (
              <div>
                <label className="label">Data</label>
                <input type="date" className="input" value={r.date} onChange={(e) => updateWorkoutDate(r.workoutId, e.target.value)} />
              </div>
            )}
            <div className="set-table">
              <div className="set-row set-row-head"><span>#</span><span>Kg</span><span>Rip</span><span>RIR</span><span>Dischi Kg</span><span>Min.</span><span>Note</span>{isEditing && <span></span>}</div>
              {r.item.sets.map((s, idx) => (
                <div className="set-row" key={idx}>
                  <span className="set-idx">{idx + 1}</span>
                  {isEditing ? (
                    <>
                      <input className="input input-kg" type="number" value={s.weight} onChange={(e) => updateSetField(r.workoutId, exId, idx, "weight", e.target.value)} />
                      <input className="input input-rip" type="number" value={s.reps} onChange={(e) => updateSetField(r.workoutId, exId, idx, "reps", e.target.value)} />
                      <input className="input input-rir" type="number" value={s.rir} onChange={(e) => updateSetField(r.workoutId, exId, idx, "rir", e.target.value)} />
                      <input className="input input-discs" type="number" step="0.001" value={s.discs} onChange={(e) => updateSetField(r.workoutId, exId, idx, "discs", e.target.value)} />
                      <select className="input input-rir" value={s.recupero || ""} onChange={(e) => updateSetField(r.workoutId, exId, idx, "recupero", e.target.value)}>
                        <option value="">—</option>
                        {RECUPERO_OPTIONS.map((rc) => <option key={rc} value={rc}>{rc}</option>)}
                      </select>
                      <input className="input input-note" value={s.notes} onChange={(e) => updateSetField(r.workoutId, exId, idx, "notes", e.target.value)} />
                      <button className="btn-icon" onClick={() => removeSetFromRow(r.workoutId, exId, idx)}><X size={18} /></button>
                    </>
                  ) : (
                    <>
                      <span className="box-kg">{s.weight || 0}</span>
                      <span className="box-rip">{s.reps || 0}</span>
                      <span className="box-rir">{s.rir !== undefined && s.rir !== "" ? s.rir : ""}</span>
                      <span className="box-discs">{s.discs || ""}</span>
                      <span className="box-rir">{s.recupero || ""}</span>
                      <span className="box-note">{s.notes || ""}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
            {isEditing && (
              <button className="btn btn-ghost" disabled={r.item.sets.length >= 10} onClick={() => addSetToRow(r.workoutId, exId)}>
                <Plus size={18} /> Aggiungi serie
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="col" style={{ gap: 16 }}>
      <Section title={`Nuovo allenamento — ${muscle}`}>
        <div className="col" style={{ gap: 16 }}>
          <div>
            <label className="label">Data</label>
            <DateItalianPicker value={date} onChange={setDate} />
            <div className="hint" style={{ marginTop: 6 }}>{dayNameFromDate(date)} {formatDateLong(date)}</div>
          </div>

          {addedList.length > 0 && (
            <div className="col" style={{ gap: 14 }}>
              {addedList.map((ex) => {
                const item = items.find((it) => it.exerciseId === ex.id);
                const last = lastExecution(ex.id);
                const secondLast = secondLastExecution(ex.id);
                const pastDates = datesForExercise(workouts, ex.id);
                const datesOpen = openDatesFor.has(ex.id);
                return (
                  <div key={ex.id} className="exercise-block">
                    <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                      <strong className="exercise-name">{ex.name}</strong>
                      <div className="row" style={{ gap: 6 }}>
                        <button className="btn btn-primary" disabled={!item.sets.length} onClick={() => saveOne(item.id)}>
                          <Save size={16} /> Salva
                        </button>
                        <DeleteButton small onConfirm={() => removeExercise(item.id)} />
                      </div>
                    </div>

                    {pastDates.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <button className="dates-count-btn" onClick={() => toggleDatesFor(ex.id)}>
                          {pastDates.length} allenamenti passati <ChevronRight size={16} className={"chevron" + (datesOpen ? " open" : "")} />
                        </button>
                        {datesOpen && (
                          <div className="col" style={{ gap: 6, marginTop: 8 }}>
                            {rowsForExercise(ex.id).map((r) => renderDateDetail(ex.id, r))}
                          </div>
                        )}
                      </div>
                    )}

                    {secondLast && (
                      <div className="last-time-block">
                        <div className="hint">Volta precedente ({formatDateShort(secondLast.date)}):</div>
                        <div className="set-table" style={{ marginTop: 6 }}>
                          <div className="set-row set-row-head"><span>#</span><span>Kg</span><span>Rip</span><span>RIR</span><span>Dischi Kg</span><span>Min.</span><span>Note</span><span></span></div>
                          {secondLast.sets.map((s, i) => (
                            <div className="set-row" key={i}>
                              <span className="set-idx">{i + 1}</span>
                              <span className="box-kg">{s.weight || 0}</span>
                              <span className="box-rip">{s.reps || 0}</span>
                              <span className="box-rir">{s.rir !== undefined && s.rir !== "" ? s.rir : ""}</span>
                              <span className="box-discs">{s.discs || ""}</span>
                              <span className="box-rir">{s.recupero || ""}</span>
                              <span className="box-note">{s.notes || ""}</span>
                              <span></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {last && (
                      <div className="last-time-block">
                        <div className="hint">Ultima volta ({formatDateShort(last.date)}):</div>
                        <div className="set-table" style={{ marginTop: 6 }}>
                          <div className="set-row set-row-head"><span>#</span><span>Kg</span><span>Rip</span><span>RIR</span><span>Dischi Kg</span><span>Min.</span><span>Note</span><span></span></div>
                          {last.sets.map((s, i) => (
                            <div className="set-row" key={i}>
                              <span className="set-idx">{i + 1}</span>
                              <span className="box-kg">{s.weight || 0}</span>
                              <span className="box-rip">{s.reps || 0}</span>
                              <span className="box-rir">{s.rir !== undefined && s.rir !== "" ? s.rir : ""}</span>
                              <span className="box-discs">{s.discs || ""}</span>
                              <span className="box-rir">{s.recupero || ""}</span>
                              <span className="box-note">{s.notes || ""}</span>
                              <span></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.sets.length > 0 && (
                      <div className="set-table">
                        <div className="set-row set-row-head"><span>#</span><span>Kg</span><span>Rip</span><span>RIR</span><span>Dischi Kg</span><span>Min.</span><span>Note</span><span></span></div>
                        {item.sets.map((s, idx) => (
                          <div className="set-row" key={idx}>
                            <span className="set-idx">{idx + 1}</span>
                            <input className="input input-kg" type="number" value={s.weight} onChange={(e) => updateSet(item.id, idx, "weight", e.target.value)} />
                            <input className="input input-rip" type="number" value={s.reps} onChange={(e) => updateSet(item.id, idx, "reps", e.target.value)} />
                            <input className="input input-rir" type="number" value={s.rir} onChange={(e) => updateSet(item.id, idx, "rir", e.target.value)} />
                            <input className="input input-discs" type="number" step="0.001" value={s.discs} onChange={(e) => updateSet(item.id, idx, "discs", e.target.value)} />
                            <select className="input input-rir" value={s.recupero} onChange={(e) => updateSet(item.id, idx, "recupero", e.target.value)}>
                              <option value="">—</option>
                              {RECUPERO_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <input className="input input-note" value={s.notes} onChange={(e) => updateSet(item.id, idx, "notes", e.target.value)} />
                            <button className="btn-icon" onClick={() => removeSet(item.id, idx)}><X size={18} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button className="btn btn-ghost" style={{ marginTop: 8 }} disabled={item.sets.length >= 10} onClick={() => addSet(item.id)}>
                      <Plus size={18} /> Aggiungi serie
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <label className="label">Cerca in {muscle}</label>
            <div className="search-wrap">
              <Search size={20} className="search-icon" />
              <input className="input" style={{ paddingLeft: 42 }} placeholder={`Cerca esercizio di ${muscle}...`} value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>

          <div className="group-ex-list">
            {availableList.map((ex) => {
              const hasHistory = datesForExercise(workouts, ex.id).length > 0;
              return (
                <div key={ex.id} className={"group-ex-row" + (hasHistory ? " group-ex-row-done" : "")} onClick={() => addExerciseToSession(ex)}>
                  <span>{ex.name}</span><Plus size={20} />
                </div>
              );
            })}
            {availableList.length === 0 && <p className="muted">Nessun esercizio trovato.</p>}
          </div>

          <CustomSlot onAdd={addCustomExercise} />

          <div className="save-bar">
            <div className="plate"><div className="plate-val">{round1(totalVolume)}</div><div className="plate-label">volume kg</div></div>
            <button className="btn btn-primary" disabled={!items.length} onClick={save}><Save size={20} /> Salva allenamento</button>
          </div>
        </div>
      </Section>

      {orderedIds.length > 0 && (
        <Section title={`Storico ${muscle}`}>
          <div className="col" style={{ gap: 10 }}>
            {orderedIds.map((exId) => {
              const ex = exercises.find((e) => e.id === exId);
              const rows = rowsForExercise(exId);
              const exOpen = openExId === exId;
              return (
                <div key={exId} className="history-ex-card">
                  <div className="history-ex-title-row" onClick={() => setOpenExId(exOpen ? null : exId)}>
                    <strong>{ex ? ex.name : "?"}</strong>
                    <ChevronRight size={20} className={"chevron" + (exOpen ? " open" : "")} />
                  </div>
                  {exOpen && rows.map((r) => renderDateDetail(exId, r))}
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

function CustomSlot({ onAdd }) {
  const [text, setText] = useState("");
  function submit() { if (!text.trim()) return; onAdd(text); setText(""); }
  return (
    <div className="row" style={{ gap: 8 }}>
      <input className="input" placeholder="Esercizio personalizzato" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
      <button className="btn-icon" onClick={submit}><Plus size={22} /></button>
    </div>
  );
}

function MuscoliTab({ onSelectMuscle }) {
  return (
    <div className="card">
      <div className="muscoli-grid">
        {MUSCLE_GROUPS.map((m) => (
          <div key={m} className="muscoli-tile" style={{ background: MUSCLE_DARK_COLORS[m] }} onClick={() => onSelectMuscle(m)}>{m.toUpperCase()}</div>
        ))}
      </div>
    </div>
  );
}

// ---------- Serie Settimanali: unico modulo, identico all'app principale ----------

function SerieSettimanaliTab({ workouts, exercises }) {
  const [mode, setMode] = useState("settimana");
  const [weekStart, setWeekStart] = useState(getMonday(todayISO()));
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [year, setYear] = useState(todayISO().slice(0, 4));

  const weekEnd = addDays(weekStart, 6);
  const weekStartISO = isoOf(weekStart), weekEndISO = isoOf(weekEnd);

  const weekStats = useMemo(() => weeklyMuscleStats(workouts, exercises, weekStartISO, weekEndISO), [workouts, exercises, weekStartISO, weekEndISO]);
  const monthStats = useMemo(() => weeklyMuscleStats(workouts, exercises, month + "-01", month + "-31"), [workouts, exercises, month]);
  const yearStats = useMemo(() => weeklyMuscleStats(workouts, exercises, year + "-01-01", year + "-12-31"), [workouts, exercises, year]);

  const activeStats = mode === "settimana" ? weekStats : mode === "mese" ? monthStats : yearStats;
  const activeRows = Object.entries(activeStats).filter(([, v]) => v.sets > 0);

  return (
    <div className="statistiche-dark">
      <Section title="Statistiche">
        <div className="mode-btn-row">
          {["settimana", "mese", "anno"].map((m) => (
            <button key={m} className={"btn " + (mode === m ? "btn-primary" : "btn-ghost")} onClick={() => setMode(m)}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        {mode === "settimana" && (
          <div className="week-nav">
            <button className="btn-icon" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft size={22} /></button>
            <span>{formatDateShort(weekStartISO)} – {formatDateShort(weekEndISO)}</span>
            <button className="btn-icon" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight size={22} /></button>
          </div>
        )}
        {mode === "mese" && (
          <input type="month" className="input" style={{ maxWidth: 200 }} value={month} onChange={(e) => setMonth(e.target.value)} />
        )}
        {mode === "anno" && (
          <input type="number" className="input" style={{ maxWidth: 140 }} value={year} onChange={(e) => setYear(e.target.value)} />
        )}

        <div className="stats-table" style={{ marginTop: 14 }}>
          <div className="stats-row stats-row-head">
            <span>Gruppo muscolare</span><span>Serie</span><span>RIP</span><span>Volume (kg)</span>
          </div>
          {activeRows.length === 0 && <p className="muted" style={{ padding: "10px 0" }}>Nessun dato per questo periodo.</p>}
          {activeRows.map(([m, v]) => (
            <div className="stats-row" key={m}>
              <span>{m}</span><span>{v.sets}</span><span>{v.reps}</span><span className="volume-badge">{round1(v.volume)}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ---------- Analisi della Forza: e1RM stimato, identico all'app principale ----------

function AnalisiForzaTab({ workouts, exercises }) {
  const usedExerciseIds = [...new Set(workouts.flatMap((w) => w.exercises.map((it) => it.exerciseId)))];
  const usableExercises = exercises.filter((e) => usedExerciseIds.includes(e.id));

  const [e1rmExId, setE1rmExId] = useState("");
  const [e1rmMode, setE1rmMode] = useState("kg");
  const [pinnedE1rm, setPinnedE1rm] = useState(null);

  function togglePinned(current, setCurrent, key, x, y) {
    setCurrent((prev) => (prev && prev.key === key ? null : { key, x, y }));
  }

  useEffect(() => {
    function handleOutsideClick(e) {
      if (!e.target.closest(".chart-relative-wrap")) setPinnedE1rm(null);
    }
    document.addEventListener("click", handleOutsideClick, true);
    return () => document.removeEventListener("click", handleOutsideClick, true);
  }, []);

  const e1rmExIdAttivo = usableExercises.some((e) => e.id === e1rmExId) ? e1rmExId : (usableExercises[0] ? usableExercises[0].id : "");

  const e1rmWeeklyData = useMemo(() => {
    if (!e1rmExIdAttivo) return [];
    const weekMap = {};
    workouts.forEach((w) => {
      const it = w.exercises.find((it) => it.exerciseId === e1rmExIdAttivo);
      if (!it) return;
      it.sets.forEach((s) => {
        const reps = Number(s.reps) || 0;
        const weight = Number(s.weight) || 0;
        if (reps < 1 || reps > 6 || weight <= 0) return;
        const e1rm = weight * (1 + reps / 30);
        const weekStart = isoOf(getMonday(w.date));
        if (!weekMap[weekStart] || e1rm > weekMap[weekStart]) weekMap[weekStart] = e1rm;
      });
    });
    const weeks = Object.keys(weekMap).sort();
    if (weeks.length === 0) return [];
    const iniziale = weekMap[weeks[0]];
    return weeks.map((wk, idx) => {
      const val = weekMap[wk];
      return { settimana: `S${idx + 1}`, periodo: formatDateShort(wk), e1rm: round1(val), percento: round1((val / iniziale) * 100) };
    });
  }, [workouts, e1rmExIdAttivo]);

  return (
    <div className="progressi-dark">
      <div className="chart-uniform-wrap">
        <Section title={e1rmMode === "kg" ? "Progressione della forza — e1RM stimato" : "Progressione della forza — variazione percentuale"} right={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select className="input input-sm-w" value={e1rmExIdAttivo} onChange={(e) => setE1rmExId(e.target.value)}>
              {usableExercises.length === 0 && <option value="">Nessun dato</option>}
              {usableExercises.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <div style={{ display: "flex", gap: 6 }}>
              <button className={"btn " + (e1rmMode === "kg" ? "btn-primary" : "btn-ghost")} onClick={() => setE1rmMode("kg")}>e1RM (kg)</button>
              <button className={"btn " + (e1rmMode === "percent" ? "btn-primary" : "btn-ghost")} onClick={() => setE1rmMode("percent")}>Progressione (%)</button>
            </div>
          </div>
        }>
          <p className="hint" style={{ marginBottom: 10 }}>
            Calcolato con la formula di Epley (peso × (1 + rip/30)) sulle serie da 1 a 6 ripetizioni; per ogni settimana viene preso il valore più alto.
          </p>
          {e1rmWeeklyData.length === 0 ? <p className="muted">Nessuna serie valida (1-6 ripetizioni) trovata per questo esercizio.</p> : (
            <div className="chart-relative-wrap" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={e1rmWeeklyData}
                  onClick={(state) => { if (state && state.activeLabel) togglePinned(pinnedE1rm, setPinnedE1rm, state.activeLabel, state.chartX, state.chartY); }}>
                  <CartesianGrid stroke="var(--border-c)" strokeDasharray="3 3" />
                  <XAxis dataKey="settimana" stroke="var(--text-dim)" fontSize={11} label={{ value: "Settimana", position: "insideBottom", offset: -3, fill: "var(--text-dim)", fontSize: 11 }} />
                  <YAxis stroke="var(--text-dim)" fontSize={11} label={{ value: e1rmMode === "kg" ? "1RM stimato (kg)" : "Performance (%)", angle: -90, position: "insideLeft", fill: "var(--text-dim)", fontSize: 11 }} />
                  <Tooltip
                    active={pinnedE1rm ? true : undefined}
                    payload={pinnedE1rm ? (() => {
                      const p = e1rmWeeklyData.find((d) => d.settimana === pinnedE1rm.key);
                      return p ? [{
                        name: e1rmMode === "kg" ? "e1RM (kg)" : "Performance (%)",
                        value: e1rmMode === "kg" ? p.e1rm : p.percento,
                        dataKey: e1rmMode === "kg" ? "e1rm" : "percento",
                        payload: p, color: "var(--accent)"
                      }] : undefined;
                    })() : undefined}
                    label={pinnedE1rm ? pinnedE1rm.key : undefined}
                    coordinate={pinnedE1rm ? { x: pinnedE1rm.x, y: pinnedE1rm.y } : undefined}
                    wrapperStyle={{ pointerEvents: "auto" }}
                    content={(props) => <PinnedTooltip {...props} onClose={() => setPinnedE1rm(null)}
                      labelFormatter={(label, payload) => (payload && payload[0] ? `${label} (${payload[0].payload.periodo})` : label)}
                      formatter={(value) => e1rmMode === "kg" ? [`${value} kg`, "e1RM"] : [`${value}%`, "Performance"]} />}
                  />
                  <Line type="monotone" dataKey={e1rmMode === "kg" ? "e1rm" : "percento"} stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} name={e1rmMode === "kg" ? "e1RM (kg)" : "Performance (%)"} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

// ---------- Settimana: identica funzionalmente e nei colori all'app principale ----------

function AllenamentiTab({ workouts, exercises }) {
  const [popup, setPopup] = useState(null);
  const [openPopupItem, setOpenPopupItem] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const weeks = useMemo(() => {
    const byWeek = {};
    workouts.forEach((w) => {
      const monday = isoOf(getMonday(w.date));
      if (!byWeek[monday]) byWeek[monday] = {};
      if (!byWeek[monday][w.date]) byWeek[monday][w.date] = new Set();
      w.exercises.forEach((it) => {
        const ex = exercises.find((e) => e.id === it.exerciseId);
        if (ex) byWeek[monday][w.date].add(ex.muscle);
      });
    });
    const currentMonday = isoOf(getMonday(todayISO()));
    if (!byWeek[currentMonday]) byWeek[currentMonday] = {};
    return Object.keys(byWeek).sort((a, b) => (a < b ? 1 : -1)).map((monday) => {
      const days = DAYS.map((dayName, idx) => {
        const dateIso = isoOf(addDays(new Date(monday + "T00:00:00"), idx));
        const muscles = byWeek[monday][dateIso] ? [...byWeek[monday][dateIso]] : [];
        return { dayName, dateIso, muscles };
      });
      const sunday = isoOf(addDays(new Date(monday + "T00:00:00"), 6));
      return { monday, sunday, days };
    });
  }, [workouts, exercises]);

  const popupExercises = useMemo(() => {
    if (!popup) return [];
    const result = [];
    workouts.filter((w) => w.date === popup.dateIso).forEach((w) => {
      w.exercises.forEach((it) => {
        const ex = exercises.find((e) => e.id === it.exerciseId);
        if (!ex || ex.muscle !== popup.muscle) return;
        const kgMax = it.sets.length ? Math.max(...it.sets.map((s) => Number(s.weight) || 0)) : 0;
        const repsAtMax = it.sets.filter((s) => (Number(s.weight) || 0) === kgMax).reduce((max, s) => Math.max(max, Number(s.reps) || 0), 0);
        result.push({ name: ex.name, kgMax, repsAtMax, setsCount: it.sets.length, sets: it.sets });
      });
    });
    return result;
  }, [popup, workouts, exercises]);

  return (
    <div className="col" style={{ gap: 20 }}>
      <h2 className="promemoria-title">PROMEMORIA ALLENAMENTI</h2>
      {weeks.length === 0 && <div className="card"><p className="muted">Nessun allenamento registrato ancora.</p></div>}
      {weeks.map((week) => (
        <div key={week.monday} className="card settimana-card">
          <div className="settimana-range">{formatDateShort(week.monday)} — {formatDateShort(week.sunday)}</div>
          <div className="promemoria-grid">
            {week.days.map((d) => (
              <div key={d.dateIso} className="promemoria-col">
                <div className="promemoria-col-head">{d.dayName.toUpperCase()}</div>
                <div className="promemoria-col-date">{formatDateShort(d.dateIso)}</div>
                <div className="promemoria-list">
                  {d.muscles.map((m) => (
                    <div key={m} className="promemoria-muscle-box" style={{ background: MUSCLE_DARK_COLORS[m] || MUSCLE_DARK_COLORS.Altro, cursor: "pointer" }}
                      onClick={() => { setPopup({ dateIso: d.dateIso, muscle: m }); setOpenPopupItem(null); }}>
                      {m.toUpperCase()}
                    </div>
                  ))}
                  {d.muscles.length === 0 && <div className="promemoria-empty">—</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {popup && (
        <div className="settimana-popup-overlay" onClick={() => setPopup(null)}>
          <div className="settimana-popup" onClick={(e) => e.stopPropagation()}>
            <div className="settimana-popup-head">
              <span>{popup.muscle.toUpperCase()} — {formatDateShort(popup.dateIso)}</span>
              <button className="btn-icon" onClick={() => setPopup(null)}><X size={22} /></button>
            </div>
            <div className="settimana-popup-list">
              {popupExercises.map((e, i) => (
                <div key={i} className="settimana-popup-item" onClick={() => setOpenPopupItem(openPopupItem === i ? null : i)} style={{ cursor: "pointer" }}>
                  <div className="settimana-popup-item-name">{e.name}</div>
                  <div className="settimana-popup-item-stats">
                    <span className="settimana-popup-badge settimana-popup-badge-kg">{e.kgMax} kg x {e.repsAtMax}</span>
                    <span className="settimana-popup-badge settimana-popup-badge-serie">{e.setsCount} serie</span>
                  </div>
                  {openPopupItem === i && (
                    <div onClick={(ev) => ev.stopPropagation()} style={{ marginTop: 12 }}>
                      <div className="set-table">
                        <div className="set-row set-row-head"><span>#</span><span>Kg</span><span>Rip</span><span>RIR</span><span>Dischi Kg</span><span>Min.</span><span>Note</span><span></span></div>
                        {e.sets.map((s, idx) => (
                          <div key={idx} className="set-row">
                            <span className="set-idx">{idx + 1}</span>
                            <span className="box-kg">{s.weight || 0}</span>
                            <span className="box-rip">{s.reps || 0}</span>
                            <span className="box-rir">{s.rir !== undefined && s.rir !== "" ? s.rir : ""}</span>
                            <span className="box-discs">{s.discs || ""}</span>
                            <span className="box-rir">{s.recupero || ""}</span>
                            <span className="box-note">{s.notes || ""}</span>
                            <span></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {popupExercises.length === 0 && <p className="muted">Nessun esercizio trovato.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- App ----------

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [tab, setTab] = useState("muscoli");
  const [activeMuscle, setActiveMuscle] = useState(null);
  const [exercises, setExercises] = useState(DEFAULT_EXERCISES);
  const [splits, setSplits] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const prevWorkoutsRef = React.useRef([]);
  const firstConfigSave = React.useRef(true);

  useEffect(() => {
    (async () => {
      const data = await loadGymData();
      if (!data) { setLoadFailed(true); setLoaded(true); return; }
      const loadedExercises = data.exercises && data.exercises.length ? data.exercises : DEFAULT_EXERCISES;
      const { exercises: deduped, workouts: remapped } = dedupeExercisesAndRemapWorkouts(loadedExercises, data.workouts || []);
      setExercises(mergeRequiredExercises(deduped));
      setSplits(data.splits || []);
      setWorkouts(remapped);
      prevWorkoutsRef.current = remapped;
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded || loadFailed) return;
    if (firstConfigSave.current) { firstConfigSave.current = false; return; }
    saveConfigDoc(exercises, splits);
  }, [exercises, splits, loaded, loadFailed]);

  useEffect(() => {
    if (!loaded || loadFailed) return;
    const prev = prevWorkoutsRef.current;
    const prevById = new Map(prev.map((w) => [w.id, w]));
    const currIds = new Set(workouts.map((w) => w.id));
    (async () => {
      for (const w of prev) if (!currIds.has(w.id)) await deleteWorkoutDoc(w.id);
      for (const w of workouts) {
        const old = prevById.get(w.id);
        if (!old || JSON.stringify(old) !== JSON.stringify(w)) await saveWorkoutDoc(w);
      }
      prevWorkoutsRef.current = workouts;
    })();
  }, [workouts, loaded, loadFailed]);

  const mainRef = React.useRef(null);
  const contentRef = React.useRef(null);
  const tabRef = React.useRef(tab);
  tabRef.current = tab;
  const [slideDir, setSlideDir] = useState("none");

  function goTab(next, dir) {
    setSlideDir(dir);
    setTab(next);
  }
  function selectTab(next) {
    const from = TAB_ORDER.indexOf(tab);
    const to = TAB_ORDER.indexOf(next);
    if (next !== tab) goTab(next, to > from ? "next" : "prev");
    if (next === "muscoli") setActiveMuscle(null);
  }

  // Swipe tra le schede. Listener nativi (touchmove NON passivo) per poter
  // bloccare lo scorrimento orizzontale del browser, che altrimenti si prende
  // il gesto in un verso e lo annulla.
  useEffect(() => {
    const root = mainRef.current;
    if (!root) return undefined;
    let g = null;

    const clearStyles = () => {
      const el = contentRef.current;
      if (el) { el.style.transition = ""; el.style.transform = ""; el.style.opacity = ""; el.style.willChange = ""; }
    };
    const snapBack = () => {
      const el = contentRef.current;
      if (!el) return;
      el.style.transition = "transform 180ms ease-out, opacity 180ms ease-out";
      el.style.transform = "translate3d(0,0,0)";
      el.style.opacity = "1";
      setTimeout(() => { if (!g) clearStyles(); }, 200);
    };
    const applyMove = () => {
      if (!g) return;
      g.raf = 0;
      const el = contentRef.current;
      if (!el) return;
      const idx = TAB_ORDER.indexOf(tabRef.current);
      const blocked = (g.dx > 0 && idx <= 0) || (g.dx < 0 && idx >= TAB_ORDER.length - 1);
      el.style.transform = "translate3d(" + g.dx * (blocked ? 0.15 : 0.5) + "px,0,0)";
    };

    const onStart = (e) => {
      if (e.touches.length !== 1 || e.target.closest(SWIPE_SKIP_SELECTOR)) { g = null; return; }
      const t = e.touches[0];
      g = { x: t.clientX, y: t.clientY, t0: Date.now(), axis: null, native: false, dx: 0, raf: 0, scroller: findHScroller(e.target) };
    };
    const onMove = (e) => {
      if (!g || g.native) return;
      const t = e.touches[0];
      const dx = t.clientX - g.x;
      const dy = t.clientY - g.y;
      if (!g.axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dx) > Math.abs(dy) * 1.2) {
          g.axis = "x";
          const s = g.scroller;
          if (s) {
            const canBack = s.scrollLeft > 0;
            const canForward = s.scrollLeft < s.scrollWidth - s.clientWidth - 1;
            if ((dx > 0 && canBack) || (dx < 0 && canForward)) { g.native = true; return; }
          }
          const el = contentRef.current;
          if (el) { el.style.transition = "none"; el.style.willChange = "transform"; }
        } else { g.axis = "y"; return; }
      }
      if (g.axis !== "x") return;
      if (e.cancelable) e.preventDefault();
      g.dx = dx;
      if (!g.raf) g.raf = requestAnimationFrame(applyMove);
    };
    const onEnd = () => {
      const cur = g;
      g = null;
      if (cur && cur.raf) cancelAnimationFrame(cur.raf);
      if (!cur || cur.axis !== "x" || cur.native) { clearStyles(); return; }
      const idx = TAB_ORDER.indexOf(tabRef.current);
      const goNext = cur.dx < 0 && idx < TAB_ORDER.length - 1;
      const goPrev = cur.dx > 0 && idx > 0;
      const quick = Date.now() - cur.t0 < 300 && Math.abs(cur.dx) > 40;
      const far = Math.abs(cur.dx) > Math.min(90, window.innerWidth * 0.2);
      if ((goNext || goPrev) && (far || quick)) {
        const el = contentRef.current;
        if (el) {
          el.style.transition = "transform 120ms ease-out, opacity 120ms ease-out";
          el.style.transform = "translate3d(" + (goNext ? "-" : "") + "50px,0,0)";
          el.style.opacity = "0";
        }
        const target = TAB_ORDER[idx + (goNext ? 1 : -1)];
        setTimeout(() => { setSlideDir(goNext ? "next" : "prev"); setTab(target); }, 110);
      } else {
        snapBack();
      }
    };
    const onCancel = () => {
      const cur = g;
      g = null;
      if (cur && cur.raf) cancelAnimationFrame(cur.raf);
      if (cur && cur.axis === "x" && !cur.native) snapBack(); else clearStyles();
    };

    root.addEventListener("touchstart", onStart, { passive: true });
    root.addEventListener("touchmove", onMove, { passive: false });
    root.addEventListener("touchend", onEnd, { passive: true });
    root.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      root.removeEventListener("touchstart", onStart);
      root.removeEventListener("touchmove", onMove);
      root.removeEventListener("touchend", onEnd);
      root.removeEventListener("touchcancel", onCancel);
    };
  }, [loaded, loadFailed]);

  if (!loaded) return <div className="loading-screen">Caricamento...</div>;
  if (loadFailed) return <div className="loading-screen">Impossibile connettersi al database.</div>;

  return (
    <div className="gt-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;500;600;700&display=swap');
        *{ box-sizing:border-box; }
        .gt-root{
          --bg:#E6ECF2; --surface:#FFFFFF; --surface-2:#F0F0EE; --border-c:#C9D4DF;
          --text:#1a1a1a; --text-dim:#6b6b66; --accent:#3E7191;
          background:var(--bg); color:var(--text); font-family:'Comfortaa','Segoe UI',Candara,Arial,sans-serif;
          min-height:100vh; text-transform:uppercase;
        }
        .loading-screen{ min-height:100vh; display:flex; align-items:center; justify-content:center; font-family:'Comfortaa',sans-serif; color:#6b6b66; }
        .col{ display:flex; flex-direction:column; }
        .row{ display:flex; align-items:center; }
        .gt-header{ display:flex; align-items:center; gap:10px; padding:16px 18px; border-bottom:1px solid var(--border-c); background:var(--surface); }
        .gt-title{ font-weight:700; font-size:20px; }
        .gt-nav{ display:flex; gap:8px; padding:10px 18px; background:var(--surface); border-bottom:1px solid var(--border-c); }
        .gt-nav-item{ display:flex; align-items:center; gap:6px; padding:8px 14px; border-radius:8px; cursor:pointer; font-weight:700; color:var(--text-dim); font-size:14px; }
        .gt-nav-item.active{ background:#e8f0f5; color:var(--accent); }
        .gt-main{ padding:16px; max-width:640px; margin:0 auto; touch-action:pan-y pinch-zoom; overflow-x:hidden; overflow-x:clip; }
        .swipe-in-next{ animation:swipeInNext 200ms ease-out; }
        .swipe-in-prev{ animation:swipeInPrev 200ms ease-out; }
        @keyframes swipeInNext{ from{ opacity:0; transform:translate3d(50px,0,0); } to{ opacity:1; transform:translate3d(0,0,0); } }
        @keyframes swipeInPrev{ from{ opacity:0; transform:translate3d(-50px,0,0); } to{ opacity:1; transform:translate3d(0,0,0); } }
        @media (prefers-reduced-motion: reduce){ .swipe-in-next, .swipe-in-prev{ animation:none; } }
        .card{ background:var(--surface); border:1px solid var(--border-c); border-radius:10px; padding:16px; }
        .section-head{ display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
        .section-title{ font-size:18px; margin:0; font-weight:700; color:var(--text); }
        .label{ display:block; font-size:12px; color:var(--text-dim); margin-bottom:5px; text-transform:uppercase; letter-spacing:0.03em; }
        .hint{ color:var(--text-dim); font-size:13px; }
        .muted{ color:var(--text-dim); font-size:14px; }
        .input{ width:100%; background:var(--surface-2); border:1px solid var(--border-c); color:var(--text); border-radius:6px; padding:8px 10px; font-size:15px; font-family:inherit; }
        .btn{ display:inline-flex; align-items:center; gap:5px; background:transparent; border:1px solid var(--border-c); color:var(--text); padding:8px 14px; border-radius:6px; font-size:14px; cursor:pointer; font-family:inherit; font-weight:700; }
        .btn-primary{ background:var(--accent); border-color:var(--accent); color:#fff; }
        .btn-ghost{ border-color:transparent; color:var(--accent); padding:5px 8px; }
        .btn-danger{ background:#c0392b; border-color:#c0392b; color:#fff; }
        .btn:disabled{ opacity:0.4; cursor:not-allowed; }
        .btn-icon{ background:transparent; border:none; color:var(--text-dim); cursor:pointer; padding:4px; display:flex; }
        .delete-icon-btn{ background:#fff; border:1px solid var(--border-c); border-radius:6px; padding:5px; color:#c0392b; }
        .search-wrap{ position:relative; }
        .search-icon{ position:absolute; left:10px; top:11px; color:var(--text-dim); }
        .date-it-picker{ display:flex; gap:6px; }
        .exercise-block{ border:1px solid var(--border-c); border-radius:8px; padding:12px; background:#E6ECF2; }
        .exercise-name{ font-size:16px; }
        .set-table{ margin-top:8px; display:flex; flex-direction:column; gap:6px; }
        .set-row{ display:grid; grid-template-columns:20px 1fr 1fr 0.8fr 1fr 1fr 1.2fr 24px; gap:5px; align-items:center; }
        .set-row-head{ font-size:11px; color:var(--text); text-transform:uppercase; }
        .set-idx{ font-size:13px; color:var(--text-dim); text-align:center; }
        .input-kg{ background:#8b1a1a; color:#fff; border-color:#8b1a1a; font-weight:700; font-size:20px; }
        .input-rip{ background:#aef000; color:#000; border-color:#aef000; font-weight:700; font-size:20px; }
        .input-rir{ background:#ffffff; color:#000; border-color:#ddd; font-weight:700; }
        .input-note{ background:#ffffff; color:#000; border-color:#ddd; }
        .input-discs{ background:#ffffff; color:#000; border-color:#ddd; font-weight:700; }
        .box-kg{ background:#8b1a1a; color:#fff; font-weight:700; text-align:center; padding:8px 4px; border-radius:6px; font-size:20px; display:flex; align-items:center; justify-content:center; min-height:40px; box-sizing:border-box; }
        .box-rip{ background:#aef000; color:#000; font-weight:700; text-align:center; padding:8px 4px; border-radius:6px; font-size:20px; display:flex; align-items:center; justify-content:center; min-height:40px; box-sizing:border-box; }
        .box-rir{ background:#ffffff; color:#000; font-weight:700; text-align:center; padding:8px 4px; border-radius:6px; border:1px solid #ddd; display:flex; align-items:center; justify-content:center; min-height:40px; box-sizing:border-box; }
        .box-note{ background:#ffffff; color:#000; text-align:left; padding:8px 6px; border-radius:6px; border:1px solid #ddd; overflow-x:auto; white-space:nowrap; display:flex; align-items:center; min-height:40px; box-sizing:border-box; }
        .box-discs{ background:#ffffff; color:#000; font-weight:700; text-align:center; padding:8px 4px; border-radius:6px; border:1px solid #ddd; display:flex; align-items:center; justify-content:center; min-height:40px; box-sizing:border-box; }
        .save-bar{ display:flex; align-items:center; justify-content:space-between; border-top:1px solid var(--border-c); padding-top:14px; }
        .plate-val{ font-weight:700; font-size:26px; color:var(--accent); }
        .plate-label{ font-size:11px; color:var(--text-dim); text-transform:uppercase; }
        .group-ex-list{ display:flex; flex-direction:column; gap:4px; }
        .group-ex-row{ display:flex; justify-content:space-between; align-items:center; padding:9px 12px; border-radius:6px; cursor:pointer; font-size:15px; background:#E6ECF2; border:1px solid var(--border-c); }
        .group-ex-row-done span{ font-weight:700; color:#c0392b; }
        .dates-count-btn{ display:flex; align-items:center; gap:4px; background:#ececea; border:1px solid var(--border-c); color:var(--text); font-weight:700; font-size:13px; padding:6px 10px; border-radius:6px; cursor:pointer; font-family:inherit; }
        .last-time-block{ margin-bottom:10px; }
        .muscoli-grid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:12px; }
        .muscoli-tile{ padding:22px 14px; border-radius:8px; color:#fff; font-weight:700; font-size:16px; text-align:center; cursor:pointer; }
        .history-ex-card{ border:1px solid var(--border-c); border-radius:8px; overflow:hidden; }
        .history-ex-title-row{ display:flex; justify-content:space-between; align-items:center; padding:10px 14px; cursor:pointer; background:#E6ECF2; }
        .chevron{ transition:transform 0.15s; }
        .chevron.open{ transform:rotate(90deg); }
        .history-date-card{ padding:10px 14px; border-top:1px solid var(--border-c); }
        .history-date-head{ cursor:pointer; font-weight:700; font-size:14px; }
        .box-date{ background:#ececea; color:#1a1a1a; font-weight:700; padding:8px 4px; border-radius:6px; border:1px solid var(--border-c); width:84px; text-align:center; box-sizing:border-box; }
        .box-serie{ background:#3E7191; color:#fff; font-weight:700; padding:8px 4px; border-radius:6px; width:84px; text-align:center; box-sizing:border-box; }

        /* Settimana — identica all'app principale */
        .promemoria-title{ font-size:22px; text-align:center; letter-spacing:0.5px; }
        .settimana-card{ padding:16px; }
        .settimana-range{ font-weight:700; font-size:14px; color:var(--text-dim); text-align:center; margin-bottom:14px; text-transform:uppercase; }
        .promemoria-grid{ display:grid; grid-template-columns:repeat(7, 1fr); gap:10px; }
        .promemoria-col{ background:var(--surface-2); border:1px solid var(--border-c); border-radius:10px; padding:10px; display:flex; flex-direction:column; gap:8px; min-height:110px; }
        .promemoria-col-head{ font-weight:700; font-size:12px; text-align:center; color:var(--accent); text-transform:uppercase; }
        .promemoria-col-date{ font-size:11px; text-align:center; color:var(--text-dim); padding-bottom:6px; border-bottom:1px solid var(--border-c); }
        .promemoria-list{ display:flex; flex-direction:column; gap:6px; flex:1; }
        .promemoria-muscle-box{ border-radius:6px; padding:6px 7px; font-size:11px; font-weight:700; color:#fff; text-align:center; }
        .promemoria-empty{ text-align:center; color:var(--text-dim); font-size:12px; opacity:0.5; }
        .settimana-popup-overlay{ position:fixed; inset:0; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:100; padding:20px; }
        .settimana-popup{ background:var(--surface); border-radius:12px; padding:20px; max-width:420px; width:100%; max-height:80vh; overflow-y:auto; }
        .settimana-popup-head{ display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; font-size:17px; font-weight:700; }
        .settimana-popup-list{ display:flex; flex-direction:column; gap:12px; }
        .settimana-popup-item{ background:var(--surface-2); border-radius:8px; padding:12px 14px; }
        .settimana-popup-item-name{ font-weight:700; margin-bottom:8px; }
        .settimana-popup-item-stats{ display:flex; gap:10px; flex-wrap:wrap; }
        .settimana-popup-badge{ padding:6px 12px; border-radius:6px; font-weight:700; font-size:13px; }
        .settimana-popup-badge-kg{ background:#c0392b; color:#fff; }
        .settimana-popup-badge-serie{ background:#aef000; color:#000; }
        .nuovo-allenamento-dark{ background:#000; border-radius:12px; padding:16px; }

        /* Serie Settimanali — identica all'app principale */
        .statistiche-dark{
          --bg:#161915; --surface:#1c1f1a; --surface-2:#242821; --border-c:#38402f;
          --text:#ffffff; --text-dim:#ffffff; --accent:#7be08a; --accent-dim:#2c3126;
          background:var(--bg); border-radius:12px; padding:16px;
        }
        .statistiche-dark .btn-primary{ color:#0f1310; }
        .stats-table{ display:flex; flex-direction:column; gap:4px; }
        .stats-row{ display:grid; grid-template-columns:1.6fr 0.7fr 0.7fr 1.5fr; gap:4px; padding:9px 4px; font-size:17px; border-bottom:1px solid var(--border-c); color:var(--text); }
        .stats-row span{ text-align:left; }
        .stats-row-head{ color:var(--text-dim); font-size:14px; text-transform:uppercase; border-bottom:1px solid var(--border-c); }
        .week-nav{ display:flex; align-items:center; gap:14px; margin-bottom:8px; font-weight:700; color:var(--text); font-size:19px; }
        .progressi-dark{
          --bg:#161915; --surface:#1c1f1a; --surface-2:#242821; --border-c:#38402f;
          --text:#e8ece5; --text-dim:#9fb89a; --accent:#7be08a; --accent-dim:#2c3126;
          background:var(--bg); border-radius:12px; padding:16px;
        }
        .progressi-dark .btn-primary{ color:#0f1310; }
        .progressi-dark .hint, .progressi-dark .muted{ color:var(--text); }
        .chart-relative-wrap{ position:relative; }
        .input-sm-w{ width:auto; max-width:320px; }
        .volume-badge{ display:inline-flex; align-items:center; justify-content:center; width:92px; max-width:100%; box-sizing:border-box; background:#1f6b3a; color:#ffffff; font-weight:700; padding:3px 6px; border-radius:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .mode-btn-row{ display:flex; gap:6px; justify-content:flex-start; flex-wrap:wrap; margin-bottom:10px; }
        .mode-btn-row .btn{ font-size:17px; padding:8px 16px; }


        @media (min-width: 641px){
          .gt-main-settimana{ max-width:980px; }
        }

        @media (max-width: 640px){
          .mode-btn-row{ flex-wrap:nowrap; justify-content:flex-start; }
          .mode-btn-row .btn{ padding:7px 10px; font-size:15px; }
          .stats-row-head{ font-size:11px; }
          .stats-row-head span{ text-align:left; white-space:normal; }
          .volume-badge{ width:78px; font-size:13px; }
          .input-kg, .box-kg{ font-size:22px; }
          .group-ex-row span{ font-weight:700; }
          .input-discs, .box-discs{ background:#ffd9d3; font-weight:700; font-size:18px; }
          .gt-nav{ overflow-x:auto; flex-wrap:nowrap; }
          .gt-nav-item{ flex-shrink:0; white-space:nowrap; }
          .progressi-dark{ padding:10px; border-radius:8px; max-width:100%; box-sizing:border-box; overflow-x:hidden; }
          .chart-uniform-wrap{ width:100% !important; max-width:100% !important; box-sizing:border-box !important; }
          .chart-uniform-wrap .card{ width:100% !important; max-width:100% !important; box-sizing:border-box !important; overflow-x:hidden !important; }
          .chart-uniform-wrap .section-head{ flex-wrap:wrap !important; }
          .chart-uniform-wrap .section-head > div{ min-width:0 !important; max-width:100% !important; flex-wrap:wrap !important; }
          .chart-uniform-wrap select.input-sm-w{ min-width:0 !important; max-width:100% !important; }
          .chart-uniform-wrap > div[style]{ height:260px !important; }
          .input-kg, .input-rip, .input-rir, .input-discs, .input-note,
          .box-kg, .box-rip, .box-rir, .box-discs, .box-note{ min-height:44px; box-sizing:border-box; }
          .gt-main{ padding:10px; min-height:75vh; }
          .set-row{ grid-template-columns:18px 130px 50px 44px 70px 50px 200px 22px; min-width:640px; }
          .set-table{ overflow-x:auto; }
          .promemoria-grid{ grid-template-columns:repeat(7, 118px); overflow-x:auto; padding-bottom:6px; }
          .progressi-dark{ padding:10px; border-radius:8px; max-width:100%; box-sizing:border-box; overflow-x:hidden; }
        }
      `}</style>

      <div className="gt-header">
        <Dumbbell size={22} color="var(--accent)" />
        <div className="gt-title">Gym Lite</div>
      </div>

      <div className="gt-nav">
        <div className={"gt-nav-item" + (tab === "muscoli" ? " active" : "")} onClick={() => selectTab("muscoli")}>Muscoli</div>
        <div className={"gt-nav-item" + (tab === "settimana" ? " active" : "")} onClick={() => selectTab("settimana")}>Settimana</div>
        <div className={"gt-nav-item" + (tab === "serie" ? " active" : "")} onClick={() => selectTab("serie")}>Serie Settimanali</div>
        <div className={"gt-nav-item" + (tab === "forza" ? " active" : "")} onClick={() => selectTab("forza")}>Analisi della Forza</div>
      </div>

      <div ref={mainRef} className={"gt-main" + (tab === "settimana" ? " gt-main-settimana" : "")}>
        <div key={tab} ref={contentRef} className={"swipe-content swipe-in-" + slideDir}>
          {tab === "muscoli" && !activeMuscle && <MuscoliTab onSelectMuscle={setActiveMuscle} />}
          {tab === "muscoli" && activeMuscle && (
            <div className="col" style={{ gap: 12 }}>
              <button className="btn btn-ghost" style={{ width: "fit-content" }} onClick={() => setActiveMuscle(null)}><ChevronLeft size={18} /> Torna ai muscoli</button>
              <MuscleScreen muscle={activeMuscle} exercises={exercises} setExercises={setExercises} workouts={workouts} setWorkouts={setWorkouts} />
            </div>
          )}
          {tab === "settimana" && <AllenamentiTab workouts={workouts} exercises={exercises} />}
          {tab === "serie" && <SerieSettimanaliTab workouts={workouts} exercises={exercises} />}
          {tab === "forza" && <AnalisiForzaTab workouts={workouts} exercises={exercises} />}
        </div>
      </div>
    </div>
  );
}
