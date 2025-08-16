import React, { useEffect, useRef, useState } from "react";

/* ---------------------------------------------------
   No external CDNs. Inline SVG icons + simple show/hide.
   Guards + ErrorBoundary. Starts on "Now" tab.
   Seeds one sample task if empty. Importer + tests.
--------------------------------------------------- */

// ---- tiny storage helpers ----
function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function saveJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
const uid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : (Date.now().toString(36) + Math.random().toString(36).slice(2));

// -------------------- Local Icons --------------------
const Icon = ({ children, className = "w-5 h-5", ...rest }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       className={className} {...rest}>{children}</svg>
);
const Play = (p) => <Icon {...p}><polygon points="6 4 20 12 6 20 6 4" /></Icon>;
const Pause = (p) => <Icon {...p}><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></Icon>;
const Check = (p) => <Icon {...p}><polyline points="20 6 9 17 4 12" /></Icon>;
const X = (p) => <Icon {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Icon>;
const Forward = (p) => <Icon {...p}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></Icon>;
const Clock = (p) => <Icon {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Icon>;
const Trash = (p) => <Icon {...p}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></Icon>;
const Mail = (p) => <Icon {...p}><path d="M4 4h16v16H4z" /><path d="M22 6l-10 7L2 6" /></Icon>;
const MessageCircle = (p) => <Icon {...p}><path d="M21 11.5a8.38 8.38 0 0 1-9 8.5 8.5 8.5 0 1 1 9-8.5z" /><path d="M8 21l1-3-3-1" /></Icon>;
const Timer = (p) => <Icon {...p}><circle cx="12" cy="13" r="9" /><line x1="12" y1="2" x2="12" y2="5" /><polyline points="12 13 15 10" /></Icon>;
const Brain = (p) => <Icon {...p}><path d="M8.5 8a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" /><path d="M15.5 8a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" /><path d="M2 14a4 4 0 0 1 4-4h12a4 4 0 0 1 0 8H6a4 4 0 0 1-4-4z" /></Icon>;
const Calendar = (p) => <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Icon>;
const Dumbbell = (p) => <Icon {...p}><rect x="1" y="9" width="4" height="6" /><rect x="19" y="9" width="4" height="6" /><rect x="7" y="10" width="10" height="4" /></Icon>;
const Zap = (p) => <Icon {...p}><polyline points="13 2 3 14 11 14 11 22 21 10 13 10 13 2" /></Icon>;
const Heart = (p) => <Icon {...p}><path d="M20.8 7.5a5.5 5.5 0 0 0-9-1.8L12 6l.2-.3a5.5 5.5 0 0 0-9 1.8c-1.2 3 1 6 3.4 7.7L12 22l5.4-6.8c2.4-1.7 4.6-4.7 3.4-7.7z" /></Icon>;
const Inbox = (p) => <Icon {...p}><path d="M22 12l-3-7H5l-3 7v6h6l2 3h4l2-3h6v-6z" /><path d="M3 12h5l2 3h4l2-3h5" /></Icon>;

// -------------------- App Data --------------------
const dopaminePrompts = [
  "What would feel satisfying to finish in 20 minutes?",
  "Want a quick win or a big swing today?",
  "Pick one: ✅ Send / 🧠 Think / 🔁 Move it forward.",
  "Whose day could you make 1% easier right now?",
  "Tell me the sticky part—I’ll carry the heavy bit.",
  "Want an indulgent deep-dive or lightning sprint?",
];

const microStepTemplates = [
  ["Open the file/tab", "Write the first messy line", "Send a draft/ask"],
  ["Skim the brief (2 min)", "Outline 3 bullets", "Ship a placeholder"],
  ["Find the last saved version", "Name the task out loud", "Do the smallest next click"],
  ["Reply with availability", "Add calendar block", "Move email to 'Waiting'"],
];

const sampleEmails = [
  { id: "e1", from: "Grants Desk", subject: "Proposal clarification due today", summary: "They want a 2-line scope + budget headline.", priority: 92 },
  { id: "e2", from: "Operations", subject: "Vendor invoice pending", summary: "Forward PO + confirm payment date.", priority: 78 },
  { id: "e3", from: "University Partner", subject: "Meeting notes & next steps", summary: "Pick lab slots; send materials list.", priority: 65 },
];

// Recall ideas & default task seeds
const recallSeeds = [
  "Book: Portuguese trade & ‘canvas’←cannabis fun‑fact opener",
  "Book: Indian Hemp Drugs Commission (1894) → revenue controls",
  "Article: Mass Tourism → Risk‑Priced Tourism framework",
  "Project: NTTM hemp‑wool pilot — consumables list & Top‑5 risks",
  "Project: Hemp‑bamboo compostable sanitary pads — 1‑page concept",
  "Website: PROBHAV.org — Vision page draft",
  "Video: Vision Hemp 2030 — 15‑clip script pass",
  "Podcast: Humans of Hemp S2 — guest shortlist",
  "AI: Vaidh.AI intake form — 1‑screen mock",
  "IIAS: shortlist 3 fellows/papers + one intro email",
];

// -------------------- UI Primitives --------------------
function Chip({ icon: IconComp, label, onClick, hotkey }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:scale-[.99] transition text-sm">
      {IconComp && <IconComp className="w-4 h-4" />}
      <span className="font-medium">{label}</span>
      {hotkey && <span className="ml-1 text-xs text-gray-400">{hotkey}</span>}
    </button>
  );
}

function Section({ title, icon: IconComp, action, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 md:p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {IconComp && <IconComp className="w-5 h-5" />}
          <h2 className="text-lg md:text-xl font-semibold">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// Error boundary to catch unexpected UI errors
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { try { console.error("UI error", error, info); } catch {} }
  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-3xl mx-auto p-4">
          <Section title="Something went wrong" icon={X}
            action={<button onClick={() => this.setState({ hasError: false, error: null })}
                            className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Try again</button>}>
            <div className="text-sm text-gray-600 break-words">{String(this.state.error)}</div>
          </Section>
        </div>
      );
    }
    return this.props.children;
  }
}

// interval hook
function useInterval(callback, delay) {
  const savedRef = useRef(null);
  useEffect(() => { savedRef.current = callback; }, [callback]);
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedRef.current && savedRef.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

const clamp = (n, min, max) => Math.max(min, Math.min(n, max));

function SprintPlayer({ running = false, seconds = 20 * 60, onToggle = () => {}, onReset = () => {} }) {
  const total = 20 * 60;
  const safeSeconds = Number.isFinite(seconds) ? clamp(seconds, 0, total) : total;
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  const pct = Math.round(((total - safeSeconds) / total) * 100);
  const circumference = 2 * Math.PI * 32;

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r="32" stroke="#eee" strokeWidth="6" fill="none" />
          <circle cx="36" cy="36" r="32" stroke="#111" strokeWidth="6" fill="none"
                  strokeDasharray={`${circumference}`}
                  strokeDashoffset={`${circumference * (1 - pct / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.5s ease" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-semibold">
          {mins}:{secs.toString().padStart(2, "0")}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onToggle} className="px-4 py-2 rounded-xl bg-black text-white flex items-center gap-2 shadow-sm active:scale-95">
          {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {running ? "Pause" : "Start"}
        </button>
        <button onClick={onReset} className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Reset</button>
      </div>
    </div>
  );
}

function MovementNudge({ visible, onClose }) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] md:w-[560px] bg-white border border-gray-200 shadow-xl rounded-2xl p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Dumbbell className="w-5 h-5" />
        <div>
          <div className="font-semibold">30‑second movement?</div>
          <div className="text-sm text-gray-500">Sip water • neck roll • stand + stretch</div>
        </div>
      </div>
      <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-50"><X className="w-4 h-4" /></button>
    </div>
  );
}

function CircleBackNudge({ visible, item, onStart, onClose }) {
  if (!visible || !item) return null;
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[92%] md:w-[560px] bg-white border border-gray-200 shadow-xl rounded-2xl p-3">
      <div className="flex items-start gap-3">
        <Brain className="w-5 h-5 mt-1" />
        <div className="flex-1">
          <div className="font-semibold">Circle back to an interesting thread?</div>
          <div className="text-sm text-gray-600 mt-1">{item.text || String(item)}</div>
          <div className="mt-2 flex gap-2">
            <button onClick={onStart} className="px-3 py-2 rounded-xl bg-black text-white">Start 20‑min</button>
            <button onClick={onClose} className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Later</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Utilities & Tests ----
// Split on bullet, hyphen, en dash, em dash, black dot, pipe, newline/CRLF
const SPLIT_REGEX = /[•\-\u2013\u2014\u2022\|\n\r]+/g;
function splitTasks(text) {
  return (text || "")
    .split(SPLIT_REGEX)
    .map((s) => s.trim())
    .filter(Boolean);
}

function TestPanel() {
  const cases = [
    { name: "newlines", input: "a\nb\nc", expected: ["a", "b", "c"] },
    { name: "CRLF", input: "a\r\nb\r\nc", expected: ["a", "b", "c"] },
    { name: "bullets", input: "• a • b • c", expected: ["a", "b", "c"] },
    { name: "hyphens", input: "- a - b - c", expected: ["a", "b", "c"] },
    { name: "en dash", input: "– a – b – c", expected: ["a", "b", "c"] },
    { name: "em dash", input: "— a — b — c", expected: ["a", "b", "c"] },
    { name: "pipes", input: "a|b|c", expected: ["a", "b", "c"] },
    { name: "mixed", input: "a — b • c – d", expected: ["a", "b", "c", "d"] },
    { name: "leading/trailing", input: "| a \n b • ", expected: ["a", "b"] },
    { name: "spaces-only ignored", input: "   \n  •   ", expected: [] },
    { name: "empty", input: "", expected: [] },
  ];

  const results = cases.map((t) => {
    const out = splitTasks(t.input);
    const pass = JSON.stringify(out) === JSON.stringify(t.expected);
    return { ...t, out, pass };
  });

  return (
    <Section title="Dev Tests — Task Splitter" icon={Check}>
      <div className="text-sm text-gray-600 mb-3">
        Validates that pasted chat/email text splits into individual tasks correctly.
      </div>
      <div className="space-y-2">
        {results.map((r) => (
          <div key={r.name}
               className={`p-2 rounded-lg border ${r.pass ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
            <div className="font-medium">{r.name}: {r.pass ? "PASS" : "FAIL"}</div>
            <div className="text-xs text-gray-600">input: <code>{r.input}</code></div>
            <div className="text-xs text-gray-600">expected: <code>[{r.expected.join(", ")}]</code></div>
            <div className="text-xs text-gray-600">got: <code>[{r.out.join(", ")}]</code></div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// -------------------- App --------------------
export default function App() {
  // Start on "now" tab
  const [tab, setTab] = useState("now");
  const [oneThing, setOneThing] = useState("");
  const [prompt, setPrompt] = useState(dopaminePrompts[0]);
  const [showTests, setShowTests] = useState(false);

  // Sprint
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(20 * 60);
  const [steps, setSteps] = useState(microStepTemplates[0]);

  // Nudges
  const [nudge, setNudge] = useState(false);
  useInterval(() => setNudge(true), 1000 * 60 * 45); // every 45 mins

  useInterval(() => {
    setSeconds((s) => {
      if (!running) return s;
      const next = s > 0 ? s - 1 : 0;
      if (next === 0 && running) setRunning(false);
      return next;
    });
  }, 1000);

  const shuffleSteps = () => {
    const next = microStepTemplates[Math.floor(Math.random() * microStepTemplates.length)] || microStepTemplates[0];
    setSteps(Array.isArray(next) ? next : microStepTemplates[0]);
  };

  // Tasks & Chat capture
  const [tasks, setTasks] = useState(() => loadJSON("focus_tasks", []));
  const [chatText, setChatText] = useState("");
  const [importText, setImportText] = useState("");

  // Seed one friendly sample task if empty
  useEffect(() => {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      const seeded = [{
        id: uid(),
        status: "todo",
        createdAt: Date.now(),
        text: "Write 100 messy words (Book: Portuguese trade — canvas←cannabis opener)"
      }];
      setTasks(seeded);
      saveJSON("focus_tasks", seeded);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist tasks
  useEffect(() => { saveJSON("focus_tasks", tasks); }, [tasks]);

  // Circle-back nudge state
  const [cb, setCb] = useState({ visible: false, item: null });
  useInterval(() => {
    const pool = (Array.isArray(tasks) && tasks.length)
      ? tasks.filter((t) => t && t.status !== "done")
      : recallSeeds.map((text) => ({ text }));
    if (pool && pool.length) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setCb({ visible: true, item: pick });
    }
  }, 1000 * 60 * 50); // every 50 mins

  const addTask = (text, source = "manual") => {
    if (!text || !text.trim()) return;
    setTasks((t) => [{ id: uid(), text: text.trim(), status: "todo", source }, ...(Array.isArray(t) ? t : [])]);
  };
  const importFromText = (text) => {
    splitTasks(text).forEach((l) => addTask(l, "chat"));
  };

  const EmailCard = ({ mail = {} }) => (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50">
      <Mail className="w-4 h-4 mt-1" />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="font-semibold">{mail.subject || "(no subject)"}</div>
          <span className="text-xs px-2 py-1 rounded-full bg-black text-white">{mail.priority ?? 0}</span>
        </div>
        <div className="text-sm text-gray-600">{mail.from || "Unknown"} • {mail.summary || "—"}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip icon={Play} label="Do" onClick={() => { setOneThing(mail.summary || ""); setTab("sprint"); setRunning(true); }} />
          <Chip icon={Forward} label="Delegate" onClick={() => alert("Drafting handoff…")} />
          <Chip icon={Clock} label="Defer" onClick={() => alert("I’ll block 30–60 mins on your calendar.")} />
          <Chip icon={Trash} label="Delete" onClick={() => alert("Moved to Later.")} />
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><Zap className="w-5 h-5" /><span className="font-semibold">Focus Agent</span></div>
            <nav className="flex items-center gap-1">
              {[
                { id: "now", label: "Now" },
                { id: "inbox", label: "Inbox" },
                { id: "tasks", label: "Tasks" },
                { id: "chat", label: "Chat" },
                { id: "goals", label: "Goals" },
                { id: "sprint", label: "Sprint" },
              ].map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                        className={`px-3 py-1.5 rounded-xl text-sm ${tab === t.id ? "bg-black text-white" : "hover:bg-gray-100"}`}>
                  {t.label}
                </button>
              ))}
            </nav>
            <button onClick={() => setShowTests((s) => !s)}
                    className="text-xs px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-50">
              {showTests ? "Hide tests" : "Show tests"}
            </button>
          </div>
        </header>

        <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
          {/* NOW */}
          {tab === "now" && (
            <Section title="What’s the one thing to move right now?" icon={Brain}
                     action={<button onClick={() => setPrompt(dopaminePrompts[Math.floor(Math.random() * dopaminePrompts.length)])}
                                     className="text-sm px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">New prompt</button>}>
              <div className="text-sm text-gray-600 mb-3">{prompt}</div>
              <div className="flex items-center gap-2">
                <input value={oneThing} onChange={(e) => setOneThing(e.target.value)}
                       placeholder="Type or paste the smallest next step…"
                       className="flex-1 px-3 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-300 outline-none" />
                <button onClick={() => { setTab("sprint"); setRunning(true); }}
                        className="px-4 py-3 rounded-xl bg-black text-white">Start 20‑min</button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Chip icon={Play} label="Do" onClick={() => { setTab("sprint"); setRunning(true); }} hotkey="D" />
                <Chip icon={Forward} label="Delegate" onClick={() => alert("Draft handoff…")} hotkey="G" />
                <Chip icon={Clock} label="Defer" onClick={() => alert("Block 30–60 mins…")} hotkey="F" />
                <Chip icon={Trash} label="Delete" onClick={() => alert("Archived for now.")} hotkey="X" />
              </div>
            </Section>
          )}

          {/* INBOX */}
          {tab === "inbox" && (
            <Section title="Top‑5 Urgent" icon={Inbox}>
              <div className="space-y-3">{sampleEmails.map((m) => (<EmailCard key={m.id} mail={m} />))}</div>
            </Section>
          )}

          {/* TASKS */}
          {tab === "tasks" && (
            <Section title="Tasks (quick capture + triage)" icon={Check}
                     action={<button onClick={() => setTab("now")} className="text-sm px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Focus now</button>}>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input value={oneThing} onChange={(e) => setOneThing(e.target.value)}
                         placeholder="Quick capture — type a task and press +"
                         className="flex-1 px-3 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-300 outline-none" />
                  <button onClick={() => { addTask(oneThing); setOneThing(""); }}
                          className="px-4 py-3 rounded-xl bg-black text-white">+</button>
                </div>
                <div className="p-3 rounded-xl border border-gray-200">
                  <div className="text-sm text-gray-600 mb-2">Import from chat — paste text and extract tasks</div>
                  <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={3}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-300 outline-none" />
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => { importFromText(importText); setImportText(""); alert("Imported lines to Tasks"); }}
                            className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm">Extract</button>
                    <button onClick={() => setImportText("")}
                            className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm">Clear</button>
                  </div>
                </div>
                <div className="space-y-2">
                  {(!Array.isArray(tasks) || tasks.length === 0) && (
                    <div className="text-sm text-gray-500">No tasks yet. Try “Capture: send grant scope” in Chat.</div>
                  )}
                  {Array.isArray(tasks) && tasks.map((t) => (
                    <div key={t.id} className="flex items-start gap-2 p-3 rounded-xl border border-gray-200">
                      <input type="checkbox" className="mt-1"
                             onChange={() => setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, status: x.status === "done" ? "todo" : "done" } : x)))}
                             checked={t.status === "done"} />
                      <div className="flex-1">
                        <div className={`font-medium ${t.status === "done" ? "line-through text-gray-400" : ""}`}>{t.text}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Chip icon={Play} label="Do" onClick={() => { setOneThing(t.text); setTab("sprint"); setRunning(true); }} />
                          <Chip icon={Forward} label="Delegate" onClick={() => alert("Drafting handoff…")} />
                          <Chip icon={Clock} label="Defer" onClick={() => alert("Blocking 30–60 mins on calendar…")} />
                          <Chip icon={Trash} label="Delete" onClick={() => setTasks((ts) => ts.filter((x) => x.id !== t.id))} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* CHAT */}
          {tab === "chat" && (
            <Section title="Assistant" icon={MessageCircle}>
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700">
                  "Hey! Want a quick win or something indulgent? Type <b>Indulge me</b> for a deep‑dive,
                  or start your message with <b>Capture:</b> to save a task."
                </div>
                <div className="flex items-center gap-2">
                  <input value={chatText} onChange={(e) => setChatText(e.target.value)}
                         placeholder="Type 'Capture: …' to save a task, or 'Indulge me'…"
                         className="flex-1 px-3 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-300 outline-none" />
                  <button onClick={() => {
                    let t = (chatText || "").trim();
                    const lower = t.toLowerCase();
                    if (lower.startsWith("capture")) {
                      t = t.slice(7);
                      while (t.startsWith(":" ) || t.startsWith("-") || t.startsWith(" ")) t = t.slice(1);
                      addTask(t, "chat");
                      alert("Captured to Tasks");
                      setChatText("");
                    } else {
                      alert("Got it. I’ll suggest a 3‑step plan.");
                    }
                  }} className="px-4 py-3 rounded-xl bg-black text-white">Send</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {["Indulge me", "I need a quick win", "Draft my reply", "Make a 3‑step plan", "Block 30 mins", "Pep talk"].map((b) => (
                    <button key={b} onClick={() => setChatText(b)}
                            className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm">{b}</button>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* GOALS */}
          {tab === "goals" && (
            <Section title="Goal Garden (water a few each day)" icon={Heart}
                     action={<button onClick={() => alert("Add/edit goals coming soon.")}
                                     className="text-sm px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Edit goals</button>}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  "Finish my book",
                  "Build a wellness D2C brand",
                  "Finish my Doctorate thesis",
                  "Build a wellness AI product (Vaidh.AI / OverpowerADHD.AI)",
                  "Pursue IIAS Fellowship – take concrete steps"
                ].map((g, i) => (
                  <div key={g} className="p-3 rounded-xl border border-gray-200 bg-white">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{g}</span>
                      <span className="text-xs text-gray-500">{(Math.random() * 100) | 0}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-black" style={{ width: `${40 + i * 8}%` }} />
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs hover:bg-gray-50">Nudge</button>
                      <button className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs hover:bg-gray-50">Log 1 step</button>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* SPRINT */}
          {tab === "sprint" && (
            <Section title="20‑min Focus Sprint" icon={Timer}
                     action={<button onClick={shuffleSteps}
                                     className="text-sm px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">New 3‑step plan</button>}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <SprintPlayer running={!!running}
                              seconds={Number.isFinite(seconds) ? seconds : 20 * 60}
                              onToggle={() => setRunning((r) => !r)}
                              onReset={() => { setSeconds(20 * 60); setRunning(false); }} />
                <div>
                  <div className="text-sm text-gray-600 mb-1">Working on</div>
                  <div className="font-semibold mb-3">{oneThing || "Your chosen task"}</div>
                  <ol className="space-y-2 list-decimal list-inside">
                    {(Array.isArray(steps) ? steps : []).map((s, i) => (
                      <li key={`${i}-${String(s)}`} className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Chip icon={Calendar} label="Block 30 mins" onClick={() => alert("Time blocked tomorrow 11:30–12:00.")} />
                    <Chip icon={Forward} label="Delegate" onClick={() => alert("Drafted handoff to Riya with context.")} />
                    <Chip icon={MessageCircle} label="Ask for help" onClick={() => alert("I’ll draft the question to send.")} />
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-xl bg-gray-50 text-sm text-gray-700">
                Tip: When stuck, say "Carry the heavy part" and I’ll propose the first sentence,
                a starter file name, and who to loop in.
              </div>
            </Section>
          )}

          {/* DEV TESTS */}
          {showTests && <TestPanel />}
        </main>

        <MovementNudge visible={nudge} onClose={() => setNudge(false)} />
        <CircleBackNudge visible={cb.visible} item={cb.item}
          onStart={() => { setOneThing((cb.item && cb.item.text) || ""); setTab("sprint"); setCb({ visible: false, item: null }); setRunning(true); }}
          onClose={() => setCb({ visible: false, item: null })} />

        <footer className="py-8 text-center text-xs text-gray-400">
          Built for time blindness • Big buttons, one decision per screen • IST‑friendly
        </footer>
      </div>
    </ErrorBoundary>
  );
}
