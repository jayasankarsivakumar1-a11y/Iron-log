// ─── Exercise Library ────────────────────────────────────────────────────────

const EXERCISES = {
  push: [
    { name: "Bench Press",             baseline: 100 },
    { name: "Incline Bench Press",     baseline: 85  },
    { name: "Overhead Press",          baseline: 60  },
    { name: "Incline Dumbbell Press",  baseline: 65  },
    { name: "Cable Chest Fly",         baseline: 40  },
    { name: "Dumbbell Shoulder Press", baseline: 50  },
    { name: "Lateral Raises",          baseline: 22  },
    { name: "Front Raises",            baseline: 20  },
    { name: "Tricep Pushdowns",        baseline: 45  },
    { name: "Overhead Tricep Ext.",    baseline: 35  },
    { name: "Skull Crushers",          baseline: 40  },
    { name: "Dips",                    baseline: 0   },
  ],
  pull: [
    { name: "Deadlift",                baseline: 125 },
    { name: "Barbell Row",             baseline: 85  },
    { name: "Lat Pulldown",            baseline: 80  },
    { name: "Seated Cable Row",        baseline: 70  },
    { name: "Pull-ups",                baseline: 0   },
    { name: "Face Pulls",              baseline: 35  },
    { name: "Dumbbell Row",            baseline: 55  },
    { name: "Barbell Curl",            baseline: 45  },
    { name: "Hammer Curl",             baseline: 35  },
    { name: "Incline Dumbbell Curl",   baseline: 25  },
    { name: "Cable Curl",              baseline: 40  },
    { name: "Reverse Curl",            baseline: 30  },
  ],
  legs: [
    { name: "Squat",                   baseline: 105 },
    { name: "Romanian Deadlift",       baseline: 95  },
    { name: "Leg Press",               baseline: 180 },
    { name: "Leg Curl",                baseline: 57  },
    { name: "Leg Extension",           baseline: 60  },
    { name: "Bulgarian Split Squat",   baseline: 40  },
    { name: "Calf Raises",             baseline: 105 },
    { name: "Hip Thrust",              baseline: 95  },
    { name: "Hack Squat",              baseline: 90  },
    { name: "Sumo Deadlift",           baseline: 115 },
    { name: "Goblet Squat",            baseline: 50  },
    { name: "Walking Lunges",          baseline: 30  },
  ],
};

const DAY_CONFIG = {
  push: { label: "Push", color: "#d4541a", light: "#fff0eb", border: "#f5c4ae", icon: "↑" },
  pull: { label: "Pull", color: "#1a7a6e", light: "#e8f5f3", border: "#a8ddd8", icon: "↓" },
  legs: { label: "Legs", color: "#6b4fa0", light: "#f0ebf8", border: "#c9b8e8", icon: "⟳" },
};

const STORAGE_KEY = "iron_log_v2";

// ─── State ───────────────────────────────────────────────────────────────────

let S = {
  page: "home",          // home | session | calendar | session-detail
  activeDay: null,       // push | pull | legs
  sessions: {},          // { "YYYY-MM-DD": { day, exercises: [ {name, sets:[{weight,reps,felt}]} ] } }
  // session builder
  selectedExercises: [], // [ { name, sets: [{weight, reps, felt}] } ]
  calendarMonth: new Date(),
  detailDate: null,
  toast: null,
};

function load() {
  try { S.sessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { S.sessions = {}; }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(S.sessions));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dateKey(d) {
  return d.toISOString().slice(0, 10);
}

function formatDate(iso) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// Progressive overload suggestion
function getSuggestion(exName, day) {
  // find all past sessions for this exercise
  const entries = [];
  Object.values(S.sessions).forEach(sess => {
    if (sess.day !== day) return;
    const ex = sess.exercises.find(e => e.name === exName);
    if (ex && ex.sets && ex.sets.length) entries.push(ex);
  });
  if (!entries.length) {
    const lib = EXERCISES[day].find(e => e.name === exName);
    return lib ? lib.baseline : 45;
  }
  const last = entries[entries.length - 1];
  const lastSet = last.sets[last.sets.length - 1];
  const w = parseFloat(lastSet.weight) || 0;
  if (lastSet.felt === "easy") return +(w + 5).toFixed(1);
  if (lastSet.felt === "good") return +(w + 2.5).toFixed(1);
  if (lastSet.felt === "hard") return +(Math.max(w - 5, 0)).toFixed(1);
  return w;
}

function showToast(msg) {
  S.toast = msg;
  render();
  setTimeout(() => { S.toast = null; render(); }, 2200);
}

// ─── Render helpers ──────────────────────────────────────────────────────────

function el(tag, attrs, ...children) {
  const e = document.createElement(tag);
  if (attrs) Object.entries(attrs).forEach(([k, v]) => {
    if (k === "style" && typeof v === "object") Object.assign(e.style, v);
    else if (k.startsWith("on")) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  });
  children.forEach(c => {
    if (c == null) return;
    e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return e;
}

function div(style, ...children) { return el("div", { style }, ...children); }
function span(style, text) { return el("span", { style }, text); }

// ─── Pages ───────────────────────────────────────────────────────────────────

function renderHome() {
  const recentDates = Object.keys(S.sessions).sort().reverse().slice(0, 3);
  const cfg = DAY_CONFIG;

  return div({ background: "var(--off-white)", minHeight: "100dvh", paddingBottom: "32px" },
    // Hero header
    div({
      background: "var(--white)",
      padding: "max(env(safe-area-inset-top),24px) 24px 28px",
      borderBottom: "1px solid var(--border)",
      boxShadow: "var(--shadow-sm)",
    },
      el("h1", { style: { fontFamily: "'Playfair Display', serif", fontSize: "34px", fontWeight: "900", color: "var(--text-dark)", letterSpacing: "-0.5px", lineHeight: "1.1", marginBottom: "4px" } }, "Iron Log"),
      span({ fontSize: "13px", color: "var(--text-light)", letterSpacing: "0.5px" }, "Track. Progress. Get stronger.")
    ),

    // Choose day section
    div({ padding: "28px 20px 16px" },
      span({ fontSize: "11px", fontWeight: "600", color: "var(--text-light)", letterSpacing: "2px", textTransform: "uppercase" }, "Choose your session"),
    ),

    div({ padding: "0 20px", display: "flex", flexDirection: "column", gap: "12px" },
      ...["push","pull","legs"].map(day => {
        const c = cfg[day];
        return el("button", {
          style: {
            width: "100%", padding: "20px 22px", borderRadius: "var(--radius)",
            background: "var(--white)", border: `1.5px solid var(--border)`,
            display: "flex", alignItems: "center", gap: "16px",
            boxShadow: "var(--shadow-sm)", textAlign: "left", transition: "all 0.18s",
          },
          onmousedown: e => e.currentTarget.style.transform = "scale(0.98)",
          onmouseup: e => e.currentTarget.style.transform = "scale(1)",
          onclick: () => startSession(day),
        },
          div({
            width: "48px", height: "48px", borderRadius: "12px",
            background: c.light, border: `1.5px solid ${c.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "22px", flexShrink: "0", color: c.color,
          }, c.icon),
          div({ flex: "1" },
            div({ fontSize: "18px", fontWeight: "600", color: "var(--text-dark)", marginBottom: "2px" }, c.label + " Day"),
            div({ fontSize: "12px", color: "var(--text-light)" }, EXERCISES[day].length + " exercises available"),
          ),
          span({ fontSize: "18px", color: "var(--muted)" }, "›")
        );
      })
    ),

    // Recent sessions
    recentDates.length ? div({ padding: "32px 20px 0" },
      span({ fontSize: "11px", fontWeight: "600", color: "var(--text-light)", letterSpacing: "2px", textTransform: "uppercase" }, "Recent sessions"),
      div({ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" },
        ...recentDates.map(date => {
          const sess = S.sessions[date];
          const c = DAY_CONFIG[sess.day];
          return el("button", {
            style: {
              width: "100%", padding: "14px 16px", borderRadius: "var(--radius-sm)",
              background: "var(--white)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", gap: "12px",
              boxShadow: "var(--shadow-sm)", textAlign: "left",
            },
            onclick: () => { S.detailDate = date; S.page = "session-detail"; render(); }
          },
            div({
              width: "8px", height: "8px", borderRadius: "50%",
              background: c.color, flexShrink: "0",
            }),
            div({ flex: "1" },
              div({ fontSize: "13px", fontWeight: "500", color: "var(--text-dark)" }, formatDate(date)),
              div({ fontSize: "11px", color: "var(--text-light)", marginTop: "1px" },
                c.label + " · " + sess.exercises.length + " exercise" + (sess.exercises.length !== 1 ? "s" : "")
              ),
            ),
            span({ fontSize: "14px", color: "var(--muted)" }, "›")
          );
        })
      )
    ) : null,

    // Calendar button
    div({ padding: "24px 20px 0" },
      el("button", {
        style: {
          width: "100%", padding: "14px", borderRadius: "var(--radius-sm)",
          background: "var(--cream)", border: "1px solid var(--border)",
          fontSize: "14px", fontWeight: "500", color: "var(--text)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
        },
        onclick: () => { S.page = "calendar"; render(); }
      }, "📅  View Calendar")
    )
  );
}

function startSession(day) {
  S.activeDay = day;
  S.selectedExercises = [];
  S.page = "session";
  render();
}

function renderSession() {
  const day = S.activeDay;
  const c = DAY_CONFIG[day];
  const exList = EXERCISES[day];

  return div({ background: "var(--off-white)", minHeight: "100dvh", paddingBottom: "40px" },
    // Header
    div({
      background: "var(--white)",
      padding: "max(env(safe-area-inset-top),16px) 20px 16px",
      borderBottom: "1px solid var(--border)",
      boxShadow: "var(--shadow-sm)",
      display: "flex", alignItems: "center", gap: "12px",
    },
      el("button", {
        style: { fontSize: "22px", color: "var(--text-light)", padding: "4px 8px 4px 0", lineHeight: "1" },
        onclick: () => { S.page = "home"; render(); }
      }, "←"),
      div({
        width: "36px", height: "36px", borderRadius: "9px",
        background: c.light, border: `1.5px solid ${c.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "16px", color: c.color, flexShrink: "0",
      }, c.icon),
      div({},
        div({ fontFamily: "'Playfair Display', serif", fontSize: "20px", fontWeight: "700", color: "var(--text-dark)" }, c.label + " Day"),
        div({ fontSize: "11px", color: "var(--text-light)" }, new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})),
      )
    ),

    // Add exercise
    div({ padding: "20px 20px 8px" },
      span({ fontSize: "11px", fontWeight: "600", color: "var(--text-light)", letterSpacing: "2px", textTransform: "uppercase" }, "Add exercises"),
    ),
    div({ padding: "0 20px" },
      div({
        background: "var(--white)", borderRadius: "var(--radius)",
        border: "1.5px solid var(--border)", padding: "4px",
        boxShadow: "var(--shadow-sm)", display: "flex", gap: "8px", alignItems: "center",
      },
        el("select", {
          id: "ex-select",
          style: {
            flex: "1", padding: "10px 12px", border: "none", outline: "none",
            background: "transparent", fontSize: "14px", color: "var(--text)",
            appearance: "none", WebkitAppearance: "none",
          }
        },
          el("option", { value: "" }, "— Select exercise —"),
          ...exList.map(ex => el("option", { value: ex.name }, ex.name))
        ),
        el("button", {
          style: {
            padding: "10px 16px", borderRadius: "8px",
            background: c.color, color: "#fff",
            fontSize: "14px", fontWeight: "600", flexShrink: "0",
          },
          onclick: addExercise,
        }, "+ Add")
      )
    ),

    // Selected exercises
    S.selectedExercises.length === 0
      ? div({ padding: "40px 20px", textAlign: "center", color: "var(--muted)", fontSize: "14px" },
          "Select exercises above to build your session"
        )
      : div({ padding: "20px 20px 0", display: "flex", flexDirection: "column", gap: "14px" },
          ...S.selectedExercises.map((ex, ei) => renderExerciseCard(ex, ei, c))
        ),

    // Save
    S.selectedExercises.length > 0
      ? div({ padding: "24px 20px 0" },
          el("button", {
            style: {
              width: "100%", padding: "16px", borderRadius: "var(--radius)",
              background: c.color, color: "#fff",
              fontSize: "16px", fontWeight: "600", letterSpacing: "0.3px",
              boxShadow: `0 4px 16px ${c.color}44`,
            },
            onclick: saveSession,
          }, "Save Session")
        )
      : null
  );
}

function addExercise() {
  const sel = document.getElementById("ex-select");
  const name = sel.value;
  if (!name) return;
  if (S.selectedExercises.find(e => e.name === name)) {
    showToast("Already added!");
    return;
  }
  const suggested = getSuggestion(name, S.activeDay);
  S.selectedExercises.push({
    name,
    sets: [{ weight: suggested, reps: 10, felt: "good" }],
  });
  sel.value = "";
  render();
}

function renderExerciseCard(ex, ei, c) {
  const card = div({
    background: "var(--white)", borderRadius: "var(--radius)",
    border: "1.5px solid var(--border)",
    boxShadow: "var(--shadow-sm)", overflow: "hidden",
  },
    // Card header
    div({
      padding: "14px 16px 12px",
      borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    },
      div({},
        div({ fontSize: "15px", fontWeight: "600", color: "var(--text-dark)" }, ex.name),
        div({ fontSize: "11px", color: "var(--text-light)", marginTop: "1px" },
          "Suggested: " + getSuggestion(ex.name, S.activeDay) + " lbs"
        ),
      ),
      el("button", {
        style: { fontSize: "18px", color: "var(--muted)", padding: "4px 8px" },
        onclick: () => { S.selectedExercises.splice(ei, 1); render(); }
      }, "×")
    ),

    // Sets
    div({ padding: "0 16px" },
      ...ex.sets.map((set, si) => renderSetRow(set, ei, si, c)),
    ),

    // Add set button
    el("button", {
      style: {
        width: "100%", padding: "10px", fontSize: "12px", fontWeight: "500",
        color: c.color, borderTop: "1px solid var(--border)",
        background: c.light, letterSpacing: "0.5px",
      },
      onclick: () => {
        const lastSet = ex.sets[ex.sets.length - 1];
        S.selectedExercises[ei].sets.push({ ...lastSet });
        render();
      }
    }, "+ Add Set")
  );
  return card;
}

function renderSetRow(set, ei, si, c) {
  const row = div({
    display: "flex", alignItems: "center", gap: "8px",
    padding: "10px 0", borderBottom: "1px solid var(--border)",
  },
    // Set label
    div({
      width: "28px", height: "28px", borderRadius: "50%",
      background: c.light, color: c.color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "11px", fontWeight: "700", flexShrink: "0",
    }, String(si + 1)),

    // Weight
    div({ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px" },
      el("input", {
        type: "number", inputmode: "decimal",
        value: set.weight,
        style: {
          width: "70px", padding: "7px 6px", textAlign: "center",
          border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)",
          fontSize: "16px", fontWeight: "600", color: "var(--text-dark)",
          background: "var(--off-white)", outline: "none",
        },
        oninput: e => { S.selectedExercises[ei].sets[si].weight = e.target.value; },
        onfocus: e => e.target.style.borderColor = c.color,
        onblur: e => e.target.style.borderColor = "var(--border)",
      }),
      span({ fontSize: "9px", color: "var(--text-light)", letterSpacing: "0.5px" }, "LBS")
    ),

    // Reps
    div({ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px" },
      el("input", {
        type: "number", inputmode: "numeric",
        value: set.reps,
        style: {
          width: "56px", padding: "7px 6px", textAlign: "center",
          border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)",
          fontSize: "16px", fontWeight: "600", color: "var(--text-dark)",
          background: "var(--off-white)", outline: "none",
        },
        oninput: e => { S.selectedExercises[ei].sets[si].reps = e.target.value; },
        onfocus: e => e.target.style.borderColor = c.color,
        onblur: e => e.target.style.borderColor = "var(--border)",
      }),
      span({ fontSize: "9px", color: "var(--text-light)", letterSpacing: "0.5px" }, "REPS")
    ),

    // Felt
    div({ display: "flex", gap: "4px", flex: "1", justifyContent: "flex-end" },
      ...["easy","good","hard"].map(f => {
        const feltColors = { easy: ["#e6f9ef","#16a34a"], good: ["#fffbeb","#d97706"], hard: ["#fef2f2","#dc2626"] };
        const isActive = set.felt === f;
        return el("button", {
          style: {
            padding: "5px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "500",
            background: isActive ? feltColors[f][0] : "transparent",
            color: isActive ? feltColors[f][1] : "var(--muted)",
            border: `1px solid ${isActive ? feltColors[f][1] + "44" : "var(--border)"}`,
            letterSpacing: "0.3px",
          },
          onclick: () => { S.selectedExercises[ei].sets[si].felt = f; render(); }
        }, f.charAt(0).toUpperCase() + f.slice(1));
      })
    ),

    // Remove set
    si > 0 ? el("button", {
      style: { fontSize: "16px", color: "var(--muted)", padding: "4px", flexShrink: "0" },
      onclick: () => { S.selectedExercises[ei].sets.splice(si, 1); render(); }
    }, "×") : div({ width: "24px" })
  );
  return row;
}

function saveSession() {
  const key = todayKey();
  const sess = {
    day: S.activeDay,
    exercises: S.selectedExercises.map(ex => ({
      name: ex.name,
      sets: ex.sets.map(s => ({
        weight: parseFloat(s.weight) || 0,
        reps: parseInt(s.reps) || 0,
        felt: s.felt,
      }))
    }))
  };
  S.sessions[key] = sess;
  save();
  S.page = "home";
  render();
  showToast("Session saved! 💪");
}

// ─── Calendar ────────────────────────────────────────────────────────────────

function renderCalendar() {
  const month = S.calendarMonth;
  const year = month.getFullYear();
  const mo = month.getMonth();
  const firstDay = new Date(year, mo, 1).getDay();
  const daysInMonth = new Date(year, mo + 1, 0).getDate();
  const todayStr = todayKey();

  const monthName = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return div({ background: "var(--off-white)", minHeight: "100dvh", paddingBottom: "32px" },
    // Header
    div({
      background: "var(--white)",
      padding: "max(env(safe-area-inset-top),16px) 20px 16px",
      borderBottom: "1px solid var(--border)",
      boxShadow: "var(--shadow-sm)",
      display: "flex", alignItems: "center", gap: "12px",
    },
      el("button", {
        style: { fontSize: "22px", color: "var(--text-light)", padding: "4px 8px 4px 0", lineHeight: "1" },
        onclick: () => { S.page = "home"; render(); }
      }, "←"),
      div({ fontFamily: "'Playfair Display', serif", fontSize: "22px", fontWeight: "700", color: "var(--text-dark)" }, "Calendar"),
    ),

    div({ padding: "20px" },
      // Month nav
      div({
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "20px",
      },
        el("button", {
          style: {
            width: "36px", height: "36px", borderRadius: "50%",
            background: "var(--white)", border: "1px solid var(--border)",
            fontSize: "16px", color: "var(--text)", boxShadow: "var(--shadow-sm)",
          },
          onclick: () => { S.calendarMonth = new Date(year, mo - 1, 1); render(); }
        }, "‹"),
        span({ fontSize: "16px", fontWeight: "600", color: "var(--text-dark)" }, monthName),
        el("button", {
          style: {
            width: "36px", height: "36px", borderRadius: "50%",
            background: "var(--white)", border: "1px solid var(--border)",
            fontSize: "16px", color: "var(--text)", boxShadow: "var(--shadow-sm)",
          },
          onclick: () => { S.calendarMonth = new Date(year, mo + 1, 1); render(); }
        }, "›"),
      ),

      // Day labels
      div({
        display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
        gap: "4px", marginBottom: "8px",
      },
        ...["Su","Mo","Tu","We","Th","Fr","Sa"].map(d =>
          div({ textAlign: "center", fontSize: "11px", fontWeight: "600", color: "var(--text-light)", padding: "4px 0" }, d)
        )
      ),

      // Calendar grid
      div({
        display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
        gap: "4px",
      },
        ...cells.map((d, i) => {
          if (!d) return div({});
          const key = `${year}-${String(mo+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const sess = S.sessions[key];
          const isToday = key === todayStr;
          const c = sess ? DAY_CONFIG[sess.day] : null;

          return el("button", {
            style: {
              aspectRatio: "1", borderRadius: "10px",
              background: c ? c.light : (isToday ? "var(--cream)" : "var(--white)"),
              border: `1.5px solid ${c ? c.border : (isToday ? "var(--border)" : "var(--border)")}`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: "2px", cursor: sess ? "pointer" : "default",
              boxShadow: isToday ? "var(--shadow-sm)" : "none",
            },
            onclick: sess ? () => { S.detailDate = key; S.page = "session-detail"; render(); } : undefined,
          },
            span({
              fontSize: "13px", fontWeight: isToday ? "700" : "400",
              color: c ? c.color : (isToday ? "var(--text-dark)" : "var(--text)"),
            }, String(d)),
            c ? div({
              width: "6px", height: "6px", borderRadius: "50%", background: c.color,
            }) : null
          );
        })
      ),

      // Legend
      div({ marginTop: "20px", display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" },
        ...["push","pull","legs"].map(day => {
          const c = DAY_CONFIG[day];
          return div({ display: "flex", alignItems: "center", gap: "6px" },
            div({ width: "8px", height: "8px", borderRadius: "50%", background: c.color }),
            span({ fontSize: "12px", color: "var(--text-light)" }, c.label)
          );
        })
      ),

      // Sessions this month
      div({ marginTop: "28px" },
        span({ fontSize: "11px", fontWeight: "600", color: "var(--text-light)", letterSpacing: "2px", textTransform: "uppercase" },
          "Sessions this month"
        ),
        div({ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" },
          ...Object.entries(S.sessions)
            .filter(([key]) => key.startsWith(`${year}-${String(mo+1).padStart(2,"0")}`))
            .sort(([a],[b]) => b.localeCompare(a))
            .map(([key, sess]) => {
              const c = DAY_CONFIG[sess.day];
              return el("button", {
                style: {
                  width: "100%", padding: "12px 14px", borderRadius: "var(--radius-sm)",
                  background: "var(--white)", border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", gap: "10px",
                  boxShadow: "var(--shadow-sm)", textAlign: "left",
                },
                onclick: () => { S.detailDate = key; S.page = "session-detail"; render(); }
              },
                div({ width: "8px", height: "8px", borderRadius: "50%", background: c.color, flexShrink: "0" }),
                div({ flex: "1" },
                  div({ fontSize: "13px", fontWeight: "500", color: "var(--text-dark)" }, formatDate(key)),
                  div({ fontSize: "11px", color: "var(--text-light)", marginTop: "1px" },
                    c.label + " · " + sess.exercises.length + " exercise" + (sess.exercises.length !== 1 ? "s" : "")
                  ),
                ),
                span({ fontSize: "14px", color: "var(--muted)" }, "›")
              );
            })
        ),
        Object.keys(S.sessions).filter(k => k.startsWith(`${year}-${String(mo+1).padStart(2,"0")}`)).length === 0
          ? div({ padding: "24px 0", textAlign: "center", color: "var(--muted)", fontSize: "13px" }, "No sessions logged this month")
          : null
      )
    )
  );
}

// ─── Session Detail ───────────────────────────────────────────────────────────

function renderSessionDetail() {
  const date = S.detailDate;
  const sess = S.sessions[date];
  if (!sess) { S.page = "home"; render(); return div({}); }
  const c = DAY_CONFIG[sess.day];
  const fromPage = S.calendarMonth ? "calendar" : "home";

  return div({ background: "var(--off-white)", minHeight: "100dvh", paddingBottom: "40px" },
    div({
      background: "var(--white)",
      padding: "max(env(safe-area-inset-top),16px) 20px 16px",
      borderBottom: "1px solid var(--border)",
      boxShadow: "var(--shadow-sm)",
      display: "flex", alignItems: "center", gap: "12px",
    },
      el("button", {
        style: { fontSize: "22px", color: "var(--text-light)", padding: "4px 8px 4px 0", lineHeight: "1" },
        onclick: () => { S.page = S.prevPage || "home"; render(); }
      }, "←"),
      div({},
        div({ fontFamily: "'Playfair Display', serif", fontSize: "20px", fontWeight: "700", color: c.color }, c.label + " Day"),
        div({ fontSize: "11px", color: "var(--text-light)" }, formatDate(date)),
      )
    ),

    div({ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" },
      ...sess.exercises.map(ex => {
        return div({
          background: "var(--white)", borderRadius: "var(--radius)",
          border: "1.5px solid var(--border)", overflow: "hidden",
          boxShadow: "var(--shadow-sm)",
        },
          div({
            padding: "12px 16px", borderBottom: "1px solid var(--border)",
            background: c.light,
          },
            div({ fontSize: "15px", fontWeight: "600", color: "var(--text-dark)" }, ex.name)
          ),
          div({ padding: "4px 0" },
            ...ex.sets.map((set, si) => {
              const feltColors = { easy: "#16a34a", good: "#d97706", hard: "#dc2626" };
              const feltBg = { easy: "#e6f9ef", good: "#fffbeb", hard: "#fef2f2" };
              return div({
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 16px", borderBottom: si < ex.sets.length - 1 ? "1px solid var(--border)" : "none",
              },
                div({ display: "flex", alignItems: "center", gap: "10px" },
                  div({
                    width: "24px", height: "24px", borderRadius: "50%",
                    background: c.light, color: c.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontWeight: "700",
                  }, String(si+1)),
                  div({},
                    span({ fontSize: "16px", fontWeight: "700", color: "var(--text-dark)" }, set.weight + " lbs"),
                    span({ fontSize: "13px", color: "var(--text-light)", marginLeft: "6px" }, "× " + set.reps + " reps"),
                  )
                ),
                set.felt ? div({
                  padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "500",
                  background: feltBg[set.felt] || "#f5f5f5",
                  color: feltColors[set.felt] || "var(--text-light)",
                }, set.felt.charAt(0).toUpperCase() + set.felt.slice(1)) : null
              );
            })
          )
        );
      }),

      // Delete session
      el("button", {
        style: {
          width: "100%", padding: "12px", borderRadius: "var(--radius-sm)",
          background: "transparent", border: "1px solid #fca5a5",
          color: "#dc2626", fontSize: "13px", fontWeight: "500", marginTop: "8px",
        },
        onclick: () => {
          if (confirm("Delete this session?")) {
            delete S.sessions[date];
            save();
            S.page = "calendar";
            render();
          }
        }
      }, "Delete Session")
    )
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function renderToast() {
  if (!S.toast) return null;
  return div({
    position: "fixed", bottom: "32px", left: "50%", transform: "translateX(-50%)",
    background: "var(--text-dark)", color: "#fff",
    padding: "12px 24px", borderRadius: "100px",
    fontSize: "14px", fontWeight: "500", boxShadow: "var(--shadow-lg)",
    zIndex: "1000", whiteSpace: "nowrap",
    animation: "fadeUp 0.25s ease",
  }, S.toast);
}

// ─── Main render ─────────────────────────────────────────────────────────────

function render() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  const style = document.createElement("style");
  style.textContent = `
    @keyframes fadeUp { from { opacity:0; transform:translateX(-50%) translateY(8px);} to { opacity:1; transform:translateX(-50%) translateY(0);} }
    input[type=number]::-webkit-inner-spin-button { opacity: 0; }
    input[type=number] { -moz-appearance: textfield; }
    select option { background: #fff; color: #2c2a27; }
  `;
  app.appendChild(style);

  let page;
  if (S.page === "home") page = renderHome();
  else if (S.page === "session") page = renderSession();
  else if (S.page === "calendar") page = renderCalendar();
  else if (S.page === "session-detail") page = renderSessionDetail();
  else page = renderHome();

  app.appendChild(page);

  const toast = renderToast();
  if (toast) app.appendChild(toast);
}

// ─── Boot ────────────────────────────────────────────────────────────────────

load();
render();
