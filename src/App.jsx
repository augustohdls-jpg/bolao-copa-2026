import { useState, useEffect, createContext, useContext } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://umfxyxkavcolyfyagbia.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtZnh5eGthdmNvbHlmeWFnYmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NTQ4MjcsImV4cCI6MjA5NjUzMDgyN30.C-SgPgn0XdnEs6s9_8r2wexKMkyojlSk0HnW1eJ7Ur4";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const AppContext = createContext(null);
const useApp = () => useContext(AppContext);

const C = {
  bg: "#0a0f1e", bgDeep: "#05070f", field: "#0d2818",
  surface: "#10182b", surface2: "#161f36",
  border: "rgba(34,197,94,0.18)", borderSoft: "rgba(255,255,255,0.06)",
  neon: "#22c55e", neonSoft: "#16a34a", gold: "#facc15", goldSoft: "#eab308",
  text: "#f5f7fb", textSoft: "#9aa6bd", danger: "#f87171",
  display: "'Archivo Black', system-ui, sans-serif",
  body: "'Hind', system-ui, sans-serif",
  glow: "0 0 0 1px rgba(34,197,94,0.25), 0 12px 40px -12px rgba(34,197,94,0.55)",
  glowGold: "0 0 0 1px rgba(250,204,21,0.35), 0 10px 30px -10px rgba(250,204,21,0.55)",
};

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
    " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  const [tab, setTab] = useState("home");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState({});
  const [groups, setGroups] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [groupPredictions, setGroupPredictions] = useState({});
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    loadPublicData();
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (user) { loadProfile(); loadUserPredictions(); } }, [user]);

  async function loadPublicData() {
    setLoading(true);
    const [matchRes, teamRes, groupRes, scoreRes] = await Promise.all([
      supabase.from("matches").select("*").order("match_date"),
      supabase.from("teams").select("*"),
      supabase.from("groups").select("*").order("id"),
      supabase.from("scores").select("*, profiles(name)").order("total_points", { ascending: false }),
    ]);
    setMatches(matchRes.data || []);
    const teamMap = {};
    (teamRes.data || []).forEach(t => teamMap[t.id] = t);
    setTeams(teamMap);
    setGroups(groupRes.data || []);
    setScores(scoreRes.data || []);
    setLoading(false);
  }

  async function loadProfile() {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(data);
  }

  async function loadUserPredictions() {
    const [predRes, gpRes] = await Promise.all([
      supabase.from("predictions").select("*").eq("user_id", user.id),
      supabase.from("group_predictions").select("*").eq("user_id", user.id),
    ]);
    const predMap = {}; (predRes.data || []).forEach(p => predMap[p.match_id] = p); setPredictions(predMap);
    const gpMap = {}; (gpRes.data || []).forEach(gp => gpMap[gp.group_id] = gp); setGroupPredictions(gpMap);
  }

  const competitionStarted = matches.length > 0 && matches[0].status !== "upcoming";
  const ctx = { user, profile, matches, teams, groups, predictions, groupPredictions, scores, supabase, competitionStarted, loadPublicData, loadUserPredictions, setPredictions, setGroupPredictions };
  const tabs = [
    { id: "home", label: "Início", icon: "🏆" },
    { id: "groups", label: "Grupos", icon: "🌐" },
    { id: "predictions", label: "Palpites", icon: "⚡" },
    { id: "ranking", label: "Ranking", icon: "🥇" },
    { id: "rules", label: "Regulamento", icon: "📋" },
  ];

  return (
    <AppContext.Provider value={ctx}>
      <div style={{ minHeight: "100vh", background: `radial-gradient(1200px 600px at 80% -10%, rgba(34,197,94,0.18), transparent 60%), radial-gradient(900px 500px at -10% 10%, rgba(250,204,21,0.10), transparent 60%), ${C.bgDeep}`, color: C.text, fontFamily: C.body }}>
        <header style={{ background: "linear-gradient(180deg, rgba(10,15,30,0.95) 0%, rgba(10,15,30,0.85) 100%)", backdropFilter: "blur(14px)", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 0" }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${C.neon}, ${C.gold})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, boxShadow: C.glow }}>⚽</div>
              <div>
                <div style={{ fontFamily: C.display, fontSize: 18, letterSpacing: "0.02em", color: C.text, lineHeight: 1 }}>BOLÃO <span style={{ color: C.neon }}>COPA</span> 2026 <span style={{ color: C.gold }}>AGROTIS</span></div>
                <div style={{ fontSize: 11, color: C.textSoft, marginTop: 4, letterSpacing: "0.15em", textTransform: "uppercase" }}>USA · Canadá · México</div>
              </div>
            </div>
            <AuthArea />
          </div>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.25rem", display: "flex", gap: 6, overflowX: "auto" }}>
            {tabs.map(t => {
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ position: "relative", background: "transparent", color: active ? C.neon : C.textSoft, border: "none", cursor: "pointer", padding: "14px 18px", fontFamily: C.display, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", transition: "color 0.2s", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: 15, fontFamily: C.body }}>{t.icon}</span>
                  <span>{t.label}</span>
                  {active && <span style={{ position: "absolute", left: 12, right: 12, bottom: -1, height: 3, background: `linear-gradient(90deg, ${C.neon}, ${C.gold})`, borderRadius: 3, boxShadow: `0 0 12px ${C.neon}` }} />}
                </button>
              );
            })}
          </div>
        </header>

        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "5rem 1rem", color: C.textSoft }}>
              <div style={{ fontFamily: C.display, letterSpacing: "0.2em", textTransform: "uppercase", fontSize: 13 }}>Carregando...</div>
            </div>
          ) : (
            <>
              {tab === "home" && <HomeTab />}
              {tab === "groups" && <GroupsTab />}
              {tab === "predictions" && <PredictionsTab />}
              {tab === "ranking" && <RankingTab />}
              {tab === "rules" && <RulesTab />}
            </>
          )}
        </main>
      </div>
    </AppContext.Provider>
  );
}

function AuthArea() {
  const { user, profile, supabase } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    setLoading(true); setError("");
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message); else setShowModal(false);
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
        if (error) setError(error.message); else setError("Verifique seu email para confirmar o cadastro!");
      }
    } finally { setLoading(false); }
  }

  if (user) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg, ${C.neon}, ${C.gold})`, color: C.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.display, fontSize: 15 }}>{(profile?.name || user.email)?.[0]?.toUpperCase()}</div>
        <span style={{ fontSize: 13, color: C.textSoft, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.name || user.email}</span>
        <button onClick={() => supabase.auth.signOut()} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.textSoft, cursor: "pointer", padding: "7px 12px", borderRadius: 8, fontSize: 12 }}>Sair</button>
      </div>
    );
  }

  return (
    <>
      <button onClick={() => setShowModal(true)} style={{ background: `linear-gradient(135deg, ${C.neon}, ${C.neonSoft})`, color: C.bgDeep, border: "none", cursor: "pointer", padding: "10px 22px", borderRadius: 10, fontFamily: C.display, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", boxShadow: C.glow }}>Entrar</button>

      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 20,
              padding: 32,
              width: "calc(100% - 32px)",
              maxWidth: 400,
              boxShadow: C.glow,
              position: "relative",
            }}
          >
            <h2 style={{ margin: "0 0 6px", fontFamily: C.display, fontSize: 24, color: C.text, letterSpacing: "0.02em" }}>
              {mode === "login" ? "ENTRAR" : "CRIAR CONTA"}
            </h2>
            <p style={{ margin: "0 0 22px", color: C.textSoft, fontSize: 13 }}>
              {mode === "login" ? "Acesse sua conta para palpitar." : "Junte-se ao bolão."}
            </p>
            {mode === "register" && (
              <input placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
            )}
            <input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            <input placeholder="Senha" type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
            {error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <button onClick={handleAuth} disabled={loading} style={{ width: "100%", background: `linear-gradient(135deg, ${C.neon}, ${C.neonSoft})`, color: C.bgDeep, border: "none", padding: "14px", borderRadius: 10, fontFamily: C.display, fontSize: 14, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", boxShadow: C.glow }}>
              {loading ? "..." : mode === "login" ? "Entrar" : "Cadastrar"}
            </button>
            <div style={{ textAlign: "center", marginTop: 18, color: C.textSoft, fontSize: 13 }}>
              {mode === "login" ? "Não tem conta? " : "Já tem conta? "}
              <span onClick={() => setMode(mode === "login" ? "register" : "login")} style={{ color: C.neon, cursor: "pointer", fontWeight: 600 }}>
                {mode === "login" ? "Cadastre-se" : "Entrar"}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.borderSoft}`, color: C.text, fontSize: 14, marginBottom: 12, fontFamily: C.body, boxSizing: "border-box", outline: "none" };

function HomeTab() {
  const { matches, teams, scores, groups } = useApp();
  const upcoming = matches.filter(m => m.status === "upcoming").slice(0, 5);
  const recent = matches.filter(m => m.status === "finished").slice(-3);
  const top3 = scores.slice(0, 3);
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={{ position: "relative", overflow: "hidden", background: `linear-gradient(135deg, ${C.field} 0%, ${C.surface} 60%, ${C.bg} 100%)`, border: `1px solid ${C.border}`, borderRadius: 24, padding: "3rem 2rem", boxShadow: C.glow }}>
        <div style={{ position: "relative", textAlign: "center" }}>
          <div style={{ display: "inline-block", padding: "6px 14px", borderRadius: 999, background: "rgba(34,197,94,0.12)", border: `1px solid ${C.border}`, color: C.neon, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: C.display, marginBottom: 18 }}>● Edição 2026</div>
          <h1 style={{ margin: "0 0 12px", fontFamily: C.display, fontSize: "clamp(2.5rem, 7vw, 4.5rem)", lineHeight: 0.95, letterSpacing: "-0.02em", color: C.text }}>
            COPA DO <span style={{ background: `linear-gradient(135deg, ${C.neon}, ${C.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>MUNDO</span>
          </h1>
          <p style={{ margin: "0 0 28px", color: C.textSoft, fontSize: 15, letterSpacing: "0.05em" }}>Estados Unidos · Canadá · México — 11/Jun a 19/Jul</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Stat value={matches.length} label="Jogos" />
            <Stat value={groups.length} label="Grupos" />
            <Stat value={scores.length} label="Participantes" />
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <Card title="Próximos Jogos" accent={C.neon} icon="📅">
          {upcoming.length === 0 ? <Empty>Nenhum jogo agendado</Empty> : upcoming.map(m => <MatchRow key={m.id} match={m} teams={teams} />)}
        </Card>
        <Card title="Pódio" accent={C.gold} icon="🏆">
          {top3.length === 0 ? <Empty>Sem participantes ainda</Empty> : top3.map((s, i) => (
            <div key={s.user_id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: i < top3.length - 1 ? `1px solid ${C.borderSoft}` : "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: i === 0 ? `linear-gradient(135deg, ${C.gold}, #f59e0b)` : i === 1 ? "linear-gradient(135deg,#cbd5e1,#94a3b8)" : "linear-gradient(135deg,#d97706,#92400e)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.display, color: C.bgDeep, fontSize: 16 }}>{i + 1}</div>
              <span style={{ flex: 1, fontWeight: 600 }}>{s.profiles?.name}</span>
              <span style={{ fontFamily: C.display, color: C.neon, fontSize: 18 }}>{s.total_points}</span>
            </div>
          ))}
        </Card>
      </div>
      {recent.length > 0 && (
        <Card title="Resultados Recentes" accent={C.neon} icon="⚽">
          {recent.map(m => <MatchRow key={m.id} match={m} teams={teams} showScore />)}
        </Card>
      )}
    </div>
  );
}

function Empty({ children }) { return <div style={{ color: C.textSoft, textAlign: "center", padding: "1.5rem", fontSize: 13 }}>{children}</div>; }
function Stat({ value, label }) {
  return (
    <div style={{ padding: "14px 22px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, minWidth: 110 }}>
      <div style={{ fontFamily: C.display, fontSize: 30, color: C.neon, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.textSoft, marginTop: 6, letterSpacing: "0.15em", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function MatchRow({ match, teams, showScore }) {
  const home = teams[match.home_team_id]; const away = teams[match.away_team_id];
  if (!home || !away) return null;
  const finished = showScore && match.status === "finished";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: `1px solid ${C.borderSoft}`, fontSize: 14 }}>
      <span style={{ width: 22, fontSize: 18 }}>{home.flag}</span>
      <span style={{ flex: 1, textAlign: "right", fontSize: 13, color: C.text }}>{home.name}</span>
      <span style={{ padding: "5px 12px", background: finished ? `linear-gradient(135deg, ${C.neon}, ${C.neonSoft})` : "rgba(255,255,255,0.05)", borderRadius: 8, fontFamily: C.display, minWidth: 64, textAlign: "center", color: finished ? C.bgDeep : C.textSoft, fontSize: 12, border: finished ? "none" : `1px solid ${C.borderSoft}` }}>
        {finished ? `${match.home_score} - ${match.away_score}` : formatDate(match.match_date)}
      </span>
      <span style={{ flex: 1, fontSize: 13, color: C.text }}>{away.name}</span>
      <span style={{ width: 22, fontSize: 18 }}>{away.flag}</span>
    </div>
  );
}

function GroupsTab() {
  const { groups, teams, matches } = useApp();
  return (
    <div>
      <SectionTitle eyebrow="Fase 1" title="Grupos" />
      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))" }}>
        {groups.map(g => {
          const groupTeams = Object.values(teams).filter(t => t.group_id === g.id);
          const groupMatches = matches.filter(m => m.group_id === g.id);
          return (
            <div key={g.id} style={{ background: `linear-gradient(180deg, ${C.surface}, ${C.surface2})`, border: `1px solid ${C.border}`, borderRadius: 18, padding: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${C.borderSoft}` }}>
                <span style={{ fontFamily: C.display, color: C.text, fontSize: 18, letterSpacing: "0.05em" }}>{g.name}</span>
                <span style={{ fontSize: 10, color: C.neon, letterSpacing: "0.2em", textTransform: "uppercase" }}>{groupTeams.length} times</span>
              </div>
              {groupTeams.map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", fontSize: 14 }}>
                  <span style={{ fontSize: 18 }}>{t.flag}</span>
                  <span style={{ color: C.text }}>{t.name}</span>
                </div>
              ))}
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.borderSoft}` }}>
                {groupMatches.map(m => {
                  const h = teams[m.home_team_id]; const a = teams[m.away_team_id];
                  return (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, fontSize: 12, padding: "5px 0", color: C.textSoft }}>
                      <span>{h?.flag} {h?.name}</span>
                      <span style={{ background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 6, fontFamily: C.display, color: C.text, fontSize: 11 }}>{m.status === "finished" ? `${m.home_score}×${m.away_score}` : formatDate(m.match_date)}</span>
                      <span>{a?.name} {a?.flag}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PredictionsTab() {
  const { user, matches, teams, groups, predictions, groupPredictions, competitionStarted, supabase, loadUserPredictions } = useApp();
  const [activeGroup, setActiveGroup] = useState(null);
  const [saving, setSaving] = useState({});
  const [localPreds, setLocalPreds] = useState({});
  const [localGP, setLocalGP] = useState({});

  useEffect(() => { setLocalPreds({ ...predictions }); setLocalGP({ ...groupPredictions }); }, [predictions, groupPredictions]);

  if (!user) return <EmptyState icon="🔒" title="Acesso Restrito" desc='Faça login no botão "Entrar" no topo para palpitar.' />;
  if (competitionStarted) return <EmptyState icon="🔒" title="Palpites Encerrados" desc="A competição começou. Seus palpites foram congelados." />;

  async function savePrediction(matchId, home, away) {
    setSaving(s => ({ ...s, [matchId]: true }));
    const existing = predictions[matchId];
    if (existing) await supabase.from("predictions").update({ home_score: parseInt(home), away_score: parseInt(away), updated_at: new Date().toISOString() }).eq("id", existing.id);
    else await supabase.from("predictions").insert({ user_id: user.id, match_id: matchId, home_score: parseInt(home), away_score: parseInt(away) });
    await loadUserPredictions();
    setSaving(s => ({ ...s, [matchId]: false }));
  }

  async function saveGroupPred(groupId, first, second) {
    if (!first || !second || first === second) return;
    const existing = groupPredictions[groupId];
    if (existing) await supabase.from("group_predictions").update({ first_place: first, second_place: second, updated_at: new Date().toISOString() }).eq("id", existing.id);
    else await supabase.from("group_predictions").insert({ user_id: user.id, group_id: groupId, first_place: first, second_place: second });
    await loadUserPredictions();
  }

  const matchesByGroup = {};
  matches.filter(m => m.stage === "group").forEach(m => {
    if (!matchesByGroup[m.group_id]) matchesByGroup[m.group_id] = [];
    matchesByGroup[m.group_id].push(m);
  });

  return (
    <div>
      <SectionTitle eyebrow="Seus" title="Palpites" />
      <div style={{ background: "rgba(250,204,21,0.08)", border: `1px solid rgba(250,204,21,0.3)`, borderRadius: 12, padding: "14px 18px", marginBottom: 20, fontSize: 13, color: C.gold, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 16 }}>⚠️</span> Palpites podem ser editados até o início do primeiro jogo (11/06/2026).
      </div>
      {groups.map(g => {
        const gMatches = matchesByGroup[g.id] || [];
        const gTeams = Object.values(teams).filter(t => t.group_id === g.id);
        const isOpen = activeGroup === g.id;
        const filled = gMatches.filter(m => predictions[m.id]).length;
        return (
          <div key={g.id} style={{ marginBottom: 14, background: `linear-gradient(180deg, ${C.surface}, ${C.surface2})`, border: `1px solid ${isOpen ? C.border : C.borderSoft}`, borderRadius: 16, overflow: "hidden", boxShadow: isOpen ? C.glow : "none" }}>
            <div onClick={() => setActiveGroup(isOpen ? null : g.id)} style={{ padding: "18px 22px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: C.display, color: C.text, fontSize: 16, letterSpacing: "0.05em" }}>{g.name}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 11, color: C.textSoft }}>
                  <span style={{ color: filled === gMatches.length && gMatches.length > 0 ? C.neon : C.gold, fontFamily: C.display }}>{filled}</span> / {gMatches.length}
                </span>
                <span style={{ color: C.neon, fontSize: 18, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>▾</span>
              </div>
            </div>
            {isOpen && (
              <div style={{ padding: "0 22px 22px" }}>
                <div style={{ background: "rgba(34,197,94,0.06)", border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
                  <div style={{ fontFamily: C.display, marginBottom: 14, fontSize: 12, color: C.neon, letterSpacing: "0.15em", textTransform: "uppercase" }}>🏅 Classificação do Grupo</div>
                  <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
                    {["first_place", "second_place"].map((pos, i) => (
                      <div key={pos}>
                        <label style={{ fontSize: 11, color: C.textSoft, display: "block", marginBottom: 6, letterSpacing: "0.1em", textTransform: "uppercase" }}>{i === 0 ? "🥇 1º Lugar" : "🥈 2º Lugar"}</label>
                        <select value={localGP[g.id]?.[pos] || ""} onChange={e => { const updated = { ...localGP[g.id], [pos]: e.target.value }; setLocalGP(prev => ({ ...prev, [g.id]: updated })); saveGroupPred(g.id, pos === "first_place" ? e.target.value : localGP[g.id]?.first_place, pos === "second_place" ? e.target.value : localGP[g.id]?.second_place); }} style={{ ...inputStyle, marginBottom: 0, padding: "10px" }}>
                          <option value="">Selecione</option>
                          {gTeams.map(t => <option key={t.id} value={t.id}>{t.flag} {t.name}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
                {gMatches.map(m => {
                  const home = teams[m.home_team_id]; const away = teams[m.away_team_id];
                  const pred = localPreds[m.id] || { home_score: "", away_score: "" };
                  const saved = !!predictions[m.id];
                  return (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 0", borderBottom: `1px solid ${C.borderSoft}` }}>
                      <div style={{ flex: 1, textAlign: "right", fontSize: 13 }}>
                        <span style={{ fontSize: 17, marginRight: 6 }}>{home?.flag}</span><span>{home?.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="number" min="0" max="99" value={pred.home_score ?? ""} onChange={e => setLocalPreds(prev => ({ ...prev, [m.id]: { ...prev[m.id], home_score: e.target.value } }))} style={scoreInputStyle} />
                        <span style={{ color: C.neon, fontFamily: C.display, fontSize: 16 }}>×</span>
                        <input type="number" min="0" max="99" value={pred.away_score ?? ""} onChange={e => setLocalPreds(prev => ({ ...prev, [m.id]: { ...prev[m.id], away_score: e.target.value } }))} style={scoreInputStyle} />
                      </div>
                      <div style={{ flex: 1, fontSize: 13 }}>
                        <span>{away?.name}</span><span style={{ fontSize: 17, marginLeft: 6 }}>{away?.flag}</span>
                      </div>
                      <button onClick={() => savePrediction(m.id, pred.home_score, pred.away_score)} disabled={saving[m.id] || pred.home_score === "" || pred.away_score === ""} style={{ background: saved ? "rgba(34,197,94,0.15)" : `linear-gradient(135deg, ${C.neon}, ${C.neonSoft})`, color: saved ? C.neon : C.bgDeep, border: saved ? `1px solid ${C.border}` : "none", padding: "8px 14px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: C.display, letterSpacing: "0.1em", textTransform: "uppercase", minWidth: 76 }}>
                        {saving[m.id] ? "..." : saved ? "✓ OK" : "Salvar"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const scoreInputStyle = { width: 48, background: C.bgDeep, border: `1px solid ${C.border}`, color: C.text, textAlign: "center", padding: "8px", borderRadius: 8, fontSize: 18, fontFamily: C.display, outline: "none" };

function EmptyState({ icon, title, desc }) {
  return (
    <div style={{ textAlign: "center", padding: "5rem 2rem", background: `linear-gradient(180deg, ${C.surface}, ${C.surface2})`, border: `1px solid ${C.border}`, borderRadius: 20 }}>
      <div style={{ fontSize: 56, marginBottom: 18 }}>{icon}</div>
      <div style={{ fontFamily: C.display, fontSize: 22, color: C.text, marginBottom: 8, letterSpacing: "0.02em" }}>{title}</div>
      <div style={{ color: C.textSoft, fontSize: 14 }}>{desc}</div>
    </div>
  );
}

function RankingTab() {
  const { scores, user } = useApp();
  return (
    <div>
      <SectionTitle eyebrow="Disputa" title="Ranking" />
      <div style={{ background: `linear-gradient(180deg, ${C.surface}, ${C.surface2})`, border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr style={{ background: "rgba(34,197,94,0.08)" }}>
                <th style={th}>#</th>
                <th style={{ ...th, textAlign: "left" }}>Participante</th>
                <th style={th}>Pts</th>
                <th style={th}>Exato</th>
                <th style={th}>Result.</th>
                <th style={th}>Saldo</th>
                <th style={th}>Grupos</th>
              </tr>
            </thead>
            <tbody>
              {scores.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: C.textSoft }}>Ranking disponível após início da competição</td></tr>
              ) : scores.map((s, i) => {
                const isMe = s.user_id === user?.id;
                return (
                  <tr key={s.user_id} style={{ borderBottom: `1px solid ${C.borderSoft}`, background: isMe ? "rgba(34,197,94,0.1)" : "transparent" }}>
                    <td style={{ ...td, fontFamily: C.display, color: i < 3 ? C.gold : C.textSoft, fontSize: 15 }}>{["🥇","🥈","🥉"][i] || i+1}</td>
                    <td style={{ ...td, textAlign: "left", fontWeight: isMe ? 700 : 500 }}>
                      {s.profiles?.name}
                      {isMe && <span style={{ fontSize: 10, color: C.neon, marginLeft: 8, padding: "2px 8px", background: "rgba(34,197,94,0.15)", borderRadius: 999 }}>você</span>}
                    </td>
                    <td style={{ ...td, fontFamily: C.display, color: C.neon, fontSize: 18 }}>{s.total_points}</td>
                    <td style={td}>{s.exact_scores || 0}</td>
                    <td style={td}>{s.correct_results || 0}</td>
                    <td style={td}>{s.goal_diff_bonus || 0}</td>
                    <td style={td}>{s.group_points || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const th = { padding: "14px 16px", color: C.textSoft, fontSize: 11, fontFamily: C.display, letterSpacing: "0.15em", textTransform: "uppercase", textAlign: "center" };
const td = { padding: "14px 16px", fontSize: 14, textAlign: "center", color: C.text };

function RulesTab() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <SectionTitle eyebrow="Como funciona" title="Regulamento" />
      <Section title="⏰ Prazo dos Palpites">
        <p>Palpites podem ser enviados e editados livremente até o início do primeiro jogo.</p>
        <p>Após o início da competição, todos os palpites são <strong style={{ color: C.danger }}>congelados</strong>.</p>
        <p>Nenhum palpite poderá ser alterado, criado ou removido depois disso.</p>
      </Section>
      <Section title="⚽ Pontuação — Jogos">
        <PointRow pts={5} label="Placar exato" desc="Acertou o resultado exato do jogo" />
        <PointRow pts={3} label="Vencedor / empate" desc="Acertou quem ganhou ou que seria empate" />
        <PointRow pts={1} label="Saldo de gols" desc="Acertou a diferença de gols entre os times" />
        <div style={{ background: "rgba(34,197,94,0.06)", border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginTop: 14, fontSize: 13, color: C.textSoft }}>
          <strong style={{ color: C.neon, letterSpacing: "0.1em", textTransform: "uppercase", fontSize: 11, fontFamily: C.display }}>Exemplos</strong>
          <div style={{ marginTop: 8 }}>• Real: 2×1 | Palpite: 2×1 → <strong style={{ color: C.neon }}>+5 pts</strong></div>
          <div>• Real: 2×1 | Palpite: 1×0 → <strong style={{ color: C.gold }}>+4 pts</strong></div>
          <div>• Real: 2×1 | Palpite: 3×0 → <strong style={{ color: C.gold }}>+3 pts</strong></div>
          <div>• Real: 2×1 | Palpite: 0×1 → <strong style={{ color: C.danger }}>+0 pts</strong></div>
        </div>
      </Section>
      <Section title="🏅 Pontuação — Classificação dos Grupos">
        <PointRow pts={5} label="Time classificado" desc="O time avança para as oitavas" />
        <PointRow pts={3} label="Posição correta" desc="Acertou se o time termina em 1º ou 2º" />
      </Section>
      <Section title="⚖️ Critérios de Desempate">
        {["Total de pontos", "Saldo de gols nos palpites", "Gols pró", "Confronto direto"].map((c, i) => (
          <div key={i} style={{ display: "flex", gap: 14, padding: "10px 0", borderBottom: `1px solid ${C.borderSoft}`, fontSize: 14 }}>
            <span style={{ color: C.neon, fontFamily: C.display, minWidth: 20 }}>{i + 1}</span>
            <span>{c}</span>
          </div>
        ))}
      </Section>
    </div>
  );
}

function SectionTitle({ eyebrow, title }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, color: C.neon, letterSpacing: "0.25em", textTransform: "uppercase", fontFamily: C.display, marginBottom: 6 }}>● {eyebrow}</div>
      <h2 style={{ margin: 0, fontFamily: C.display, fontSize: "clamp(1.8rem, 4vw, 2.6rem)", letterSpacing: "-0.01em", color: C.text }}>{title}</h2>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: `linear-gradient(180deg, ${C.surface}, ${C.surface2})`, border: `1px solid ${C.border}`, borderRadius: 16, padding: "1.5rem", marginBottom: 18 }}>
      <h3 style={{ margin: "0 0 16px", color: C.text, fontSize: 16, fontFamily: C.display, letterSpacing: "0.02em" }}>{title}</h3>
      <div style={{ color: C.textSoft, lineHeight: 1.7, fontSize: 14 }}>{children}</div>
    </div>
  );
}

function PointRow({ pts, label, desc }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "10px 0", borderBottom: `1px solid ${C.borderSoft}` }}>
      <span style={{ background: `linear-gradient(135deg, ${C.neon}, ${C.gold})`, color: C.bgDeep, fontFamily: C.display, fontSize: 13, padding: "4px 12px", borderRadius: 999, minWidth: 44, textAlign: "center" }}>+{pts}</span>
      <div>
        <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{label}</div>
        <div style={{ fontSize: 13, color: C.textSoft, marginTop: 2 }}>{desc}</div>
      </div>
    </div>
  );
}

function Card({ title, accent = "#22c55e", icon, children }) {
  return (
    <div style={{ position: "relative", overflow: "hidden", background: `linear-gradient(180deg, ${C.surface}, ${C.surface2})`, border: `1px solid ${C.border}`, borderRadius: 18, padding: "1.5rem" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent}, transparent)` }} />
      <h3 style={{ margin: "0 0 16px", fontSize: 13, color: C.text, fontFamily: C.display, letterSpacing: "0.1em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 10 }}>
        {icon && <span style={{ fontSize: 16, fontFamily: C.body }}>{icon}</span>}{title}
      </h3>
      {children}
    </div>
  );
}
