// ─── Data ───────────────────────────────────────────────────────────────────

const WORKOUT_PLAN = {
  "Day 1 — Push": [
    { name: "Bench Press",           baseline: 100, unit: "lbs" },
    { name: "Overhead Press",        baseline: 60,  unit: "lbs" },
    { name: "Incline Dumbbell Press",baseline: 32,  unit: "lbs each" },
    { name: "Lateral Raises",        baseline: 11,  unit: "lbs each" },
    { name: "Tricep Pushdowns",      baseline: 45,  unit: "lbs" },
  ],
  "Day 2 — Pull": [
    { name: "Deadlift",      baseline: 125, unit: "lbs" },
    { name: "Barbell Row",   baseline: 85,  unit: "lbs" },
    { name: "Lat Pulldown",  baseline: 80,  unit: "lbs" },
    { name: "Face Pulls",    baseline: 35,  unit: "lbs" },
    { name: "Barbell Curl",  baseline: 45,  unit: "lbs" },
  ],
  "Day 3 — Legs": [
    { name: "Squat",              baseline: 105, unit: "lbs" },
    { name: "Romanian Deadlift",  baseline: 95,  unit: "lbs" },
    { name: "Leg Press",          baseline: 180, unit: "lbs" },
    { name: "Leg Curl",           baseline: 57,  unit: "lbs" },
    { name: "Calf Raises",        baseline: 105, unit: "lbs" },
  ],
};

const DAY_META = {
  "Day 1 — Push": { accent: "#FF6B35", tag: "PUSH" },
  "Day 2 — Pull": { accent: "#4ECDC4", tag: "PULL" },
  "Day 3 — Legs": { accent: "#FFE66D", tag: "LEGS" },
};

const STORAGE_KEY = "iron_log_v1";

// ─── State ──────────────────────────────────────────────────────────────────

let state = {
  activeDay: "Day 1 — Push",
  view: "log",           // log | history
  sessions: {},          // { [day]: [ { date, exercises: { [name]: { weight, completed, felt } } } ] }
  logData: {},           // current session being filled
  expandedSession: null,
  saved: false,
};

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

function persistSessions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.sessions));
}

function getSuggestion(history, baseline) {
  if (!history || history.length === 0) return baseline;
  const last = history[history.length - 1];
  if (last.completed && last.felt === "easy") return +(last.weight + 5).toFixed(1);
  if (last.completed && last.felt === "good") return +(last.weight + 2.5).toFixed(1);
  if (!last.completed || last.felt === "hard") return +(Math.max(last.weight - 5, baseline * 0.8)).toFixed(1);
  return last.weight;
}

function initLogData() {
  const exercises = WORKOUT_PLAN[state.activeDay];
  const daySessions = state.sessions[state.activeDay] || [];
  const data = {};
  exercises.forEach(ex => {
    const hist = daySessions.map(s => s.exercises[ex.name]).filter(Boolean);
    const suggested = getSuggestion(hist, ex.baseline);
    data[ex.name] = { weight: suggested, completed: true, felt: "good" };
  });
  state.logData = data;
}

// ─── Render ──────────────────────────────────────────────────────────────────

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function render() {
  const { activeDay, view, sessions, logData, expandedSession, saved } = state;
  const exercises = WORKOUT_PLAN[activeDay];
  const meta = DAY_META[activeDay];
  const daySessions = sessions[activeDay] || [];

  document.getElementById("app").innerHTML = `
    <div style="min-height:100dvh;background:#0d0d0d;color:#e0e0e0;font-family:'DM Mono','Courier New',monospace;">

      <!-- Header -->
      <div style="border-bottom:1px solid #1a1a1a;padding:env(safe-area-inset-top,16px) 20px 0;padding-top:max(env(safe-area-inset-top),16px)">
        <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:14px">
          <h1 style="font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:4px;color:${meta.accent};line-height:1">IRON LOG</h1>
          <span style="font-size:9px;color:#333;letter-spacing:3px">SESSION TRACKER</span>
        </div>

        <!-- Day tabs -->
        <div style="display:flex;gap:0;margin-bottom:14px;overflow-x:auto;scrollbar-width:none">
          ${Object.keys(WORKOUT_PLAN).map(day => {
            const m = DAY_META[day];
            const isActive = day === activeDay;
            return `<button onclick="selectDay('${day}')" style="
              cursor:pointer;padding:10px 18px;border:1px solid ${isActive ? m.accent : '#2a2a2a'};
              background:${isActive ? m.accent+'18' : '#111'};
              color:${isActive ? m.accent : '#555'};
              font-family:'Bebas Neue',sans-serif;letter-spacing:2px;font-size:14px;
              flex-shrink:0;transition:all 0.2s;-webkit-tap-highlight-color:transparent"
            >${m.tag}</button>`;
          }).join("")}
        </div>

        <!-- View toggle -->
        <div style="display:flex;gap:8px;padding-bottom:14px">
          ${["log","history"].map(v => `
            <button onclick="setView('${v}')" style="
              cursor:pointer;padding:7px 14px;background:${view===v?'#1a1a1a':'transparent'};
              border:1px solid ${view===v?'#555':'#2a2a2a'};
              color:${view===v?'#ccc':'#444'};
              font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;transition:all 0.2s">
              ${v === 'log' ? 'LOG SESSION' : `HISTORY (${daySessions.length})`}
            </button>`).join("")}
        </div>
      </div>

      <!-- Content -->
      <div style="padding:18px 20px;padding-bottom:max(env(safe-area-inset-bottom),24px)">
        ${view === "log" ? renderLog(exercises, meta, daySessions, logData, saved) : renderHistory(exercises, meta, daySessions, expandedSession)}
      </div>
    </div>
  `;

  attachEvents();
}

function renderLog(exercises, meta, daySessions, logData, saved) {
  const lastSession = daySessions.length ? daySessions[daySessions.length - 1] : null;
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:3px;color:#fff">${state.activeDay.toUpperCase()}</div>
        <div style="font-size:9px;color:#444;letter-spacing:2px;margin-top:2px">${new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}).toUpperCase()}</div>
      </div>
      ${lastSession ? `<div style="font-size:9px;color:#444;letter-spacing:1px;text-align:right">LAST SESSION<br><span style="color:#666">${formatDate(lastSession.date)}</span></div>` : ""}
    </div>

    ${exercises.map(ex => {
      const d = logData[ex.name] || { weight: ex.baseline, completed: true, felt: "good" };
      const hist = daySessions.map(s => s.exercises[ex.name]).filter(Boolean);
      const suggested = getSuggestion(hist, ex.baseline);
      return `
        <div style="background:#111;border:1px solid #1e1e1e;border-left:3px solid ${meta.accent};padding:14px 16px;margin-bottom:10px">
          <div style="display:flex;align-items:flex-start;gap:12px">
            <!-- Checkbox -->
            <div onclick="toggleComplete('${ex.name}')" style="
              width:22px;height:22px;flex-shrink:0;margin-top:3px;cursor:pointer;
              border:2px solid ${d.completed ? meta.accent : '#333'};
              background:${d.completed ? meta.accent : 'transparent'};
              display:flex;align-items:center;justify-content:center">
              ${d.completed ? `<span style="font-size:12px;color:#000;font-weight:700">✓</span>` : ""}
            </div>

            <div style="flex:1;min-width:0">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap">
                <div>
                  <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:2px;color:${d.completed?'#fff':'#444'}">${ex.name}</div>
                  <div style="font-size:9px;color:#444;letter-spacing:1px">${ex.unit}</div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
                  <input
                    type="number" inputmode="decimal"
                    data-ex="${ex.name}"
                    value="${d.weight}"
                    ${!d.completed ? "disabled" : ""}
                    style="
                      background:#0d0d0d;border:1px solid ${d.completed?'#2a2a2a':'#1a1a1a'};
                      color:${d.completed?'#fff':'#333'};
                      font-family:'Bebas Neue',sans-serif;font-size:26px;
                      width:100px;text-align:center;padding:5px 6px;
                      letter-spacing:2px;outline:none;"
                  />
                  <div style="display:inline-flex;align-items:center;gap:5px;background:#0a0a0a;border:1px dashed #2a2a2a;padding:2px 8px;font-size:9px;color:#555">
                    <span style="color:${meta.accent}">→</span> suggested ${suggested} lbs
                  </div>
                </div>
              </div>

              ${d.completed ? `
              <div style="display:flex;gap:6px;margin-top:10px;align-items:center;flex-wrap:wrap">
                <span style="font-size:9px;color:#333;letter-spacing:1px;margin-right:2px">FELT</span>
                ${["easy","good","hard"].map(f => {
                  const colors = { easy: ["#0f2a1a","#2d7a4f","#4ade80"], good: ["#1a1a0f","#7a6d2d","#fbbf24"], hard: ["#2a0f0f","#7a2d2d","#f87171"] };
                  const [bg, border, color] = d.felt === f ? colors[f] : ["transparent","#2a2a2a","#555"];
                  return `<button onclick="setFelt('${ex.name}','${f}')" style="
                    cursor:pointer;padding:5px 11px;font-size:9px;
                    border:1px solid ${border};background:${bg};
                    font-family:'DM Mono',monospace;letter-spacing:1px;color:${color}">${f.toUpperCase()}</button>`;
                }).join("")}
              </div>` : ""}
            </div>
          </div>
        </div>`;
    }).join("")}

    <div style="margin-top:20px">
      <button onclick="saveSession()" style="
        cursor:pointer;width:100%;padding:14px;
        background:${saved ? '#1a3a1a' : meta.accent};border:none;
        color:${saved ? '#4ade80' : '#000'};
        font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:3px">
        ${saved ? "✓ SESSION SAVED" : "SAVE SESSION"}
      </button>
    </div>
  `;
}

function renderHistory(exercises, meta, daySessions, expandedSession) {
  return `
    <div style="margin-bottom:18px">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:3px;color:#fff">SESSION HISTORY</div>
      <div style="font-size:9px;color:#444;letter-spacing:2px;margin-top:2px">${state.activeDay.toUpperCase()} · ${daySessions.length} SESSION${daySessions.length !== 1 ? "S" : ""}</div>
    </div>

    ${daySessions.length === 0 ? `
      <div style="text-align:center;padding:60px 0;color:#333;font-size:11px;letter-spacing:2px">NO SESSIONS LOGGED YET</div>
    ` : [...daySessions].reverse().map((session, i) => {
      const idx = daySessions.length - 1 - i;
      const isOpen = expandedSession === idx;
      const doneCount = Object.values(session.exercises).filter(e => e.completed).length;

      return `
        <div onclick="toggleSession(${idx})" style="
          background:#111;border:1px solid ${isOpen ? meta.accent : '#1e1e1e'};
          padding:14px 16px;margin-bottom:8px;cursor:pointer">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:2px;color:${isOpen ? meta.accent : '#ccc'}">${formatDate(session.date)}</div>
              <div style="font-size:9px;color:#444;margin-top:1px;letter-spacing:1px">SESSION #${daySessions.length - i}</div>
            </div>
            <div style="font-size:10px;color:#555;display:flex;align-items:center;gap:8px">
              ${doneCount}/${exercises.length} DONE
              <span style="color:#333">${isOpen ? "▲" : "▼"}</span>
            </div>
          </div>

          ${isOpen ? `
          <div style="margin-top:14px;border-top:1px solid #1a1a1a;padding-top:12px" onclick="event.stopPropagation()">
            ${exercises.map(ex => {
              const entry = session.exercises[ex.name];
              if (!entry) return "";
              const feltColors = { easy: "#4ade80", good: "#fbbf24", hard: "#f87171" };
              const feltBg = { easy: "#0f2a1a", good: "#1a1a0f", hard: "#2a0f0f" };
              return `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #0f0f0f">
                  <div style="font-family:'Bebas Neue',sans-serif;letter-spacing:1.5px;font-size:13px;color:${entry.completed?'#ccc':'#444'}">${ex.name}</div>
                  <div style="display:flex;gap:6px;align-items:center">
                    ${entry.completed ? `
                      <span style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:${meta.accent};letter-spacing:2px">${entry.weight}</span>
                      <span style="font-size:8px;color:#444">LBS</span>
                      <span style="padding:2px 7px;font-size:8px;letter-spacing:1px;background:${feltBg[entry.felt]||'#1a1a1a'};color:${feltColors[entry.felt]||'#ccc'}">${(entry.felt||"").toUpperCase()}</span>
                    ` : `<span style="padding:2px 7px;font-size:8px;letter-spacing:1px;background:#2a1a0f;color:#fb923c">SKIPPED</span>`}
                  </div>
                </div>`;
            }).join("")}

            <!-- Next session targets -->
            <div style="margin-top:14px;padding:12px;background:#0a0a0a;border:1px dashed ${meta.accent}22">
              <div style="font-size:9px;color:${meta.accent};letter-spacing:3px;margin-bottom:10px">NEXT SESSION TARGET</div>
              ${exercises.map(ex => {
                const histUpTo = daySessions.slice(0, idx + 1).map(s => s.exercises[ex.name]).filter(Boolean);
                const next = getSuggestion(histUpTo, ex.baseline);
                return `<div style="display:flex;justify-content:space-between;font-size:10px;padding:3px 0;color:#555">
                  <span>${ex.name}</span><span style="color:#888">${next} lbs</span>
                </div>`;
              }).join("")}
            </div>
          </div>` : ""}
        </div>`;
    }).join("")}
  `;
}

// ─── Event Handlers ──────────────────────────────────────────────────────────

function attachEvents() {
  document.querySelectorAll("input[data-ex]").forEach(input => {
    input.addEventListener("change", e => {
      const name = e.target.dataset.ex;
      state.logData[name] = { ...state.logData[name], weight: parseFloat(e.target.value) || 0 };
    });
    input.addEventListener("focus", e => {
      e.target.style.borderColor = DAY_META[state.activeDay].accent;
    });
    input.addEventListener("blur", e => {
      e.target.style.borderColor = "#2a2a2a";
    });
  });
}

window.selectDay = function(day) {
  state.activeDay = day;
  state.view = "log";
  state.expandedSession = null;
  state.saved = false;
  initLogData();
  render();
};

window.setView = function(v) {
  state.view = v;
  render();
};

window.toggleComplete = function(name) {
  state.logData[name] = { ...state.logData[name], completed: !state.logData[name].completed };
  render();
};

window.setFelt = function(name, felt) {
  state.logData[name] = { ...state.logData[name], felt };
  render();
};

window.toggleSession = function(idx) {
  state.expandedSession = state.expandedSession === idx ? null : idx;
  render();
};

window.saveSession = function() {
  const exercises = WORKOUT_PLAN[state.activeDay];
  const entry = { date: new Date().toISOString(), exercises: {} };
  exercises.forEach(ex => {
    const d = state.logData[ex.name];
    if (d) entry.exercises[ex.name] = { ...d, weight: parseFloat(d.weight) || 0 };
  });
  if (!state.sessions[state.activeDay]) state.sessions[state.activeDay] = [];
  state.sessions[state.activeDay].push(entry);
  persistSessions();
  state.saved = true;
  render();
  setTimeout(() => { state.saved = false; render(); }, 2500);
};

// ─── Boot ────────────────────────────────────────────────────────────────────

state.sessions = loadSessions();
initLogData();
render();
