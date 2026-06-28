import { useState, useEffect, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://umfxyxkavcolyfyagbia.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtZnh5eGthdmNvbHlmeWFnYmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NTQ4MjcsImV4cCI6MjA5NjUzMDgyN30.C-SgPgn0XdnEs6s9_8r2wexKMkyojlSk0HnW1eJ7Ur4";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const ADMIN_EMAIL = "augustohdls@gmail.com";
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

const TZ = "America/Sao_Paulo";

const KNOCKOUT_STAGES = [
  { key: "r32", label: "Rodada de 32", short: "R32" },
  { key: "r16", label: "Oitavas de Final", short: "Oitavas" },
  { key: "qf", label: "Quartas de Final", short: "Quartas" },
  { key: "sf", label: "Semifinal", short: "Semi" },
  { key: "3p", label: "3º Lugar", short: "3º Lugar" },
  { key: "final", label: "Final", short: "Final" },
];

const STAGE_LABEL = { r32: "Rodada de 32", r16: "Oitavas", qf: "Quartas", sf: "Semifinal", "3p": "3º Lugar", final: "Final" };

const FIFA_ISO2 = {
  MEX:"mx",RSA:"za",KOR:"kr",CZE:"cz",CAN:"ca",BIH:"ba",QAT:"qa",SUI:"ch",
  BRA:"br",MAR:"ma",HAI:"ht",SCO:"gb-sct",USA:"us",PAR:"py",AUS:"au",TUR:"tr",
  GER:"de",CUW:"cw",CIV:"ci",ECU:"ec",NED:"nl",JAP:"jp",SWE:"se",TUN:"tn",
  BEL:"be",EGY:"eg",IRN:"ir",NZL:"nz",ESP:"es",CPV:"cv",SAU:"sa",URU:"uy",
  FRA:"fr",SEN:"sn",IRQ:"iq",NOR:"no",ARG:"ar",ALG:"dz",AUT:"at",JOR:"jo",
  POR:"pt",COD:"cd",UZB:"uz",COL:"co",ENG:"gb-eng",CRO:"hr",GHA:"gh",PAN:"pa",
};

function FlagImg({ id, size = 22 }) {
  const iso = FIFA_ISO2[id];
  if (!iso) return null;
  return <img src={`https://flagcdn.com/w40/${iso}.png`} alt={id} style={{ width: size, height: "auto", display: "inline-block", borderRadius: 2, verticalAlign: "middle" }} />;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: TZ }) +
    " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
}

function getPickDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("sv-SE", { timeZone: TZ });
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
  const [doublePicks, setDoublePicks] = useState({});
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clockOffset, setClockOffset] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    loadPublicData();
    supabase.rpc("server_now").then(({ data }) => {
      if (data) setClockOffset(new Date(data).getTime() - Date.now());
    });
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
    const [predRes, gpRes, dpRes] = await Promise.all([
      supabase.from("predictions").select("*").eq("user_id", user.id),
      supabase.from("group_predictions").select("*").eq("user_id", user.id),
      supabase.from("double_picks").select("*").eq("user_id", user.id),
    ]);
    const predMap = {}; (predRes.data || []).forEach(p => predMap[p.match_id] = p); setPredictions(predMap);
    const gpMap = {}; (gpRes.data || []).forEach(gp => gpMap[gp.group_id] = gp); setGroupPredictions(gpMap);
    const dpMap = {}; (dpRes.data || []).forEach(dp => dpMap[dp.match_id] = dp); setDoublePicks(dpMap);
  }

  const ctx = { user, profile, matches, teams, groups, predictions, groupPredictions, doublePicks, scores, supabase, clockOffset, loadPublicData, loadUserPredictions, setPredictions, setGroupPredictions };
  const isAdmin = user?.email === ADMIN_EMAIL;
  const tabs = [
    { id: "home", label: "Início", icon: "🏆" },
    { id: "groups", label: "Grupos", icon: "🌐" },
    { id: "predictions", label: "Palpites", icon: "⚡" },
    { id: "ranking", label: "Ranking", icon: "🥇" },
    { id: "resumo", label: "Resumo", icon: "📰" },
    { id: "rules", label: "Regulamento", icon: "📋" },
    ...(isAdmin ? [{ id: "admin", label: "Admin", icon: "⚙️" }] : []),
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
              {tab === "resumo" && <ResumoTab />}
              {tab === "rules" && <RulesTab />}
              {tab === "admin" && isAdmin && <AdminTab />}
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
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
        if (error) setError(error.message);
        else if (data.session) setShowModal(false);
        else setError("Cadastro realizado! Verifique seu email para confirmar.");
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
      {showModal && createPortal(
        <div onClick={() => setShowModal(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "24px 16px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, width: "100%", maxWidth: 400, boxShadow: C.glow, position: "relative", margin: "auto" }}>
            <h2 style={{ margin: "0 0 6px", fontFamily: C.display, fontSize: 24, color: C.text }}>{mode === "login" ? "ENTRAR" : "CRIAR CONTA"}</h2>
            <p style={{ margin: "0 0 22px", color: C.textSoft, fontSize: 13 }}>{mode === "login" ? "Acesse sua conta para palpitar." : "Junte-se ao bolão."}</p>
            {mode === "register" && <input placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />}
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
      , document.body)}
    </>
  );
}

const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.borderSoft}`, color: C.text, fontSize: 14, marginBottom: 12, fontFamily: C.body, boxSizing: "border-box", outline: "none" };

// ─── HOME TAB ────────────────────────────────────────────────────────────────

function HomeTab() {
  const { matches, teams, scores, groups, user } = useApp();
  const upcoming = matches.filter(m => m.status === "upcoming" && m.home_team_id && m.away_team_id).slice(0, 8);
  const recent = matches.filter(m => m.status === "finished").slice(-3);
  const top3 = scores.slice(0, 3);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Hero */}
      <div style={{ position: "relative", overflow: "hidden", background: `linear-gradient(135deg, ${C.field} 0%, ${C.surface} 60%, ${C.bg} 100%)`, border: `1px solid ${C.border}`, borderRadius: 24, padding: "3rem 2rem", boxShadow: C.glow }}>
        <div style={{ position: "relative", textAlign: "center" }}>
          <div style={{ display: "inline-block", padding: "6px 14px", borderRadius: 999, background: "rgba(34,197,94,0.12)", border: `1px solid ${C.border}`, color: C.neon, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: C.display, marginBottom: 18 }}>● Edição 2026</div>
          <h1 style={{ margin: "0 0 12px", fontFamily: C.display, fontSize: "clamp(2.5rem, 7vw, 4.5rem)", lineHeight: 0.95, letterSpacing: "-0.02em", color: C.text }}>
            COPA DO <span style={{ background: `linear-gradient(135deg, ${C.neon}, ${C.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>MUNDO</span>
          </h1>
          <p style={{ margin: "0 0 28px", color: C.textSoft, fontSize: 15, letterSpacing: "0.05em" }}>Estados Unidos · Canadá · México — 11/Jun a 19/Jul</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Stat value={matches.filter(m => m.stage === "group").length} label="Fase de Grupos" />
            <Stat value={matches.filter(m => m.stage !== "group").length} label="Eliminatórias" />
            <Stat value={scores.length} label="Participantes" />
          </div>
        </div>
      </div>

      {/* Prêmio */}
      <div style={{ position: "relative", overflow: "hidden", background: `linear-gradient(135deg, rgba(250,204,21,0.12), rgba(34,197,94,0.10))`, border: `1px solid rgba(250,204,21,0.4)`, borderRadius: 20, padding: "1.75rem 2rem", boxShadow: C.glowGold, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: C.gold, letterSpacing: "0.25em", textTransform: "uppercase", fontFamily: C.display, marginBottom: 10 }}>💰 Prêmio Acumulado</div>
        <div style={{ fontFamily: C.display, fontSize: "clamp(2.2rem, 6vw, 3.5rem)", lineHeight: 1, background: `linear-gradient(135deg, ${C.gold}, ${C.neon})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          R$ {(scores.length * 50).toLocaleString("pt-BR")}
        </div>
        <div style={{ fontSize: 12, color: C.textSoft, marginTop: 10 }}>{scores.length} participante{scores.length === 1 ? "" : "s"} × R$ 50,00</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          {[
            { pos: "🥇 1º", pct: 0.7, grad: `linear-gradient(135deg, ${C.gold}, #f59e0b)` },
            { pos: "🥈 2º", pct: 0.2, grad: "linear-gradient(135deg,#cbd5e1,#94a3b8)" },
            { pos: "🥉 3º", pct: 0.1, grad: "linear-gradient(135deg,#d97706,#92400e)" },
          ].map(p => (
            <div key={p.pos} style={{ flex: "1 1 120px", maxWidth: 160, background: "rgba(0,0,0,0.25)", border: `1px solid ${C.borderSoft}`, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, color: C.textSoft, marginBottom: 6 }}>{p.pos} lugar · {p.pct * 100}%</div>
              <div style={{ fontFamily: C.display, fontSize: 20, background: p.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                R$ {(scores.length * 50 * p.pct).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Palpite Dobrado */}
      <div style={{ position: "relative", overflow: "hidden", background: `linear-gradient(120deg, rgba(250,204,21,0.14), rgba(34,197,94,0.10))`, border: `1px solid rgba(250,204,21,0.5)`, borderRadius: 20, padding: "1.75rem 2rem", textAlign: "center", boxShadow: C.glowGold }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>⭐</div>
        <div style={{ fontFamily: C.display, fontSize: "clamp(1.2rem, 3vw, 1.8rem)", lineHeight: 1.2, color: C.text, marginBottom: 10 }}>
          PALPITE <span style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.neon})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>DOBRADO</span>
        </div>
        <div style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.7, maxWidth: 460, margin: "0 auto 16px" }}>
          Cada jogador pode escolher <strong style={{ color: C.gold }}>1 jogo por dia</strong> para pontuar em dobro! Toque em ⭐ ao lado do jogo desejado na aba Palpites. Escolha com sabedoria — só é permitido um por dia.
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ background: "rgba(250,204,21,0.12)", border: "1px solid rgba(250,204,21,0.3)", borderRadius: 999, padding: "4px 14px", fontSize: 12, color: C.gold }}>Placar exato: 10 pts</span>
          <span style={{ background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 999, padding: "4px 14px", fontSize: 12, color: C.neon }}>Resultado correto: 6 pts</span>
          <span style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "4px 14px", fontSize: 12, color: C.textSoft }}>Saldo de gols: 2 pts</span>
        </div>
      </div>

      {/* Próximos Jogos */}
      <Card title={user ? "Próximos Jogos · Palpite aqui" : "Próximos Jogos"} accent={C.neon} icon="📅">
        {!user && <div style={{ fontSize: 12, color: C.gold, marginBottom: 8 }}>Entre na sua conta para palpitar direto por aqui.</div>}
        {upcoming.length === 0 ? <Empty>Nenhum jogo agendado com times definidos</Empty> : upcoming.map(m => <HomePredictRow key={m.id} match={m} />)}
      </Card>

      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
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

      {/* Bracket na Home */}
      <EliminationBracket />
    </div>
  );
}

// ─── BRACKET ─────────────────────────────────────────────────────────────────

function EliminationBracket() {
  const { matches, teams } = useApp();
  const knockoutMatches = matches.filter(m => m.stage !== "group");

  if (knockoutMatches.length === 0) return null;

  const byStage = {};
  knockoutMatches.forEach(m => {
    if (!byStage[m.stage]) byStage[m.stage] = [];
    byStage[m.stage].push(m);
  });
  Object.keys(byStage).forEach(k => byStage[k].sort((a, b) => new Date(a.match_date) - new Date(b.match_date)));

  const stagesPresent = KNOCKOUT_STAGES.filter(s => byStage[s.key]);

  return (
    <div style={{ position: "relative", background: `linear-gradient(180deg, ${C.surface}, ${C.surface2})`, border: `1px solid ${C.border}`, borderRadius: 18, padding: "1.5rem", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.gold}, ${C.neon})` }} />
      <h3 style={{ margin: "0 0 16px", fontFamily: C.display, fontSize: 13, color: C.text, letterSpacing: "0.1em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 16 }}>🏆</span> Chaveamento · Eliminatórias
      </h3>
      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        <div style={{ display: "flex", gap: 10, minWidth: "max-content", alignItems: "flex-start" }}>
          {stagesPresent.map(stage => (
            <div key={stage.key} style={{ width: 200, flexShrink: 0 }}>
              <div style={{
                background: stage.key === "final" ? `linear-gradient(135deg, ${C.gold}, ${C.goldSoft})` : stage.key === "3p" ? "rgba(255,255,255,0.06)" : "rgba(34,197,94,0.1)",
                border: `1px solid ${stage.key === "final" ? "rgba(250,204,21,0.5)" : C.borderSoft}`,
                borderRadius: 8, padding: "6px 10px", marginBottom: 10, textAlign: "center"
              }}>
                <div style={{ fontFamily: C.display, fontSize: 10, color: stage.key === "final" ? C.bgDeep : C.neon, letterSpacing: "0.15em", textTransform: "uppercase" }}>{stage.label}</div>
                <div style={{ fontSize: 10, color: stage.key === "final" ? C.bgDeep : C.textSoft, marginTop: 1 }}>
                  {byStage[stage.key].length} jogo{byStage[stage.key].length !== 1 ? "s" : ""}
                </div>
              </div>
              {byStage[stage.key].map(m => <BracketMatchCard key={m.id} match={m} />)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BracketMatchCard({ match }) {
  const { teams } = useApp();
  const home = teams[match.home_team_id];
  const away = teams[match.away_team_id];
  const finished = match.status === "finished";
  const homeWin = finished && match.home_score > match.away_score;
  const awayWin = finished && match.away_score > match.home_score;

  return (
    <div style={{ background: C.bgDeep, border: `1px solid ${finished ? C.border : C.borderSoft}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
      <BracketTeamLine team={home} score={finished ? match.home_score : null} winner={homeWin} />
      <div style={{ height: 1, background: C.borderSoft, margin: "5px 0" }} />
      <BracketTeamLine team={away} score={finished ? match.away_score : null} winner={awayWin} />
      <div style={{ fontSize: 10, color: C.textSoft, marginTop: 6, textAlign: "center" }}>
        {finished ? `${match.home_score} × ${match.away_score}` : formatDate(match.match_date)}
      </div>
    </div>
  );
}

function BracketTeamLine({ team, score, winner }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 18, flexShrink: 0, display: "flex", alignItems: "center" }}>
        {team ? <FlagImg id={team.id} size={16} /> : <span style={{ fontSize: 11, color: C.textSoft }}>?</span>}
      </div>
      <span style={{ flex: 1, fontSize: 12, color: winner ? C.text : C.textSoft, fontWeight: winner ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {team?.name || "A definir"}
      </span>
      {score != null && <span style={{ fontFamily: C.display, fontSize: 13, color: winner ? C.neon : C.textSoft }}>{score}</span>}
    </div>
  );
}

// ─── DOUBLE PICK BUTTON ───────────────────────────────────────────────────────

function DoublePickBtn({ match }) {
  const { user, doublePicks, supabase, loadUserPredictions, clockOffset } = useApp();
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const now = new Date(Date.now() + (clockOffset || 0));
  const locked = match.status !== "upcoming" || now >= new Date(match.match_date);
  const isMyDouble = !!doublePicks[match.id];

  if (locked) {
    return isMyDouble ? <span title="Palpite dobrado" style={{ fontSize: 14, opacity: 0.8 }}>⭐</span> : null;
  }

  const pickDate = getPickDate(match.match_date);
  const sameDay = Object.values(doublePicks).find(dp => dp.pick_date === pickDate && dp.match_id !== match.id);

  async function toggle() {
    setBusy(true);
    if (isMyDouble) {
      await supabase.from("double_picks").delete().eq("user_id", user.id).eq("match_id", match.id);
    } else {
      await supabase.from("double_picks").upsert(
        { user_id: user.id, match_id: match.id, pick_date: pickDate },
        { onConflict: "user_id,pick_date" }
      );
    }
    await loadUserPredictions();
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={isMyDouble ? "Remover palpite dobrado" : sameDay ? "Trocar palpite dobrado do dia" : "Dobrar pontos neste jogo"}
      style={{
        background: isMyDouble ? "rgba(250,204,21,0.2)" : "transparent",
        border: `1px solid ${isMyDouble ? "rgba(250,204,21,0.5)" : C.borderSoft}`,
        color: isMyDouble ? C.gold : C.textSoft,
        width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontSize: 13,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        transition: "all 0.15s",
      }}
    >
      {busy ? "…" : "⭐"}
    </button>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

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
      <FlagImg id={home.id} size={22} />
      <span style={{ flex: 1, textAlign: "right", fontSize: 13, color: C.text }}>{home.name}</span>
      <span style={{ padding: "5px 12px", background: finished ? `linear-gradient(135deg, ${C.neon}, ${C.neonSoft})` : "rgba(255,255,255,0.05)", borderRadius: 8, fontFamily: C.display, minWidth: 64, textAlign: "center", color: finished ? C.bgDeep : C.textSoft, fontSize: 12, border: finished ? "none" : `1px solid ${C.borderSoft}` }}>
        {finished ? `${match.home_score} - ${match.away_score}` : formatDate(match.match_date)}
      </span>
      <span style={{ flex: 1, fontSize: 13, color: C.text }}>{away.name}</span>
      <FlagImg id={away.id} size={22} />
    </div>
  );
}

function HomePredictRow({ match }) {
  const { user, teams, predictions, supabase, clockOffset, loadUserPredictions } = useApp();
  const home = teams[match.home_team_id]; const away = teams[match.away_team_id];
  const saved = predictions[match.id];
  const [h, setH] = useState(saved?.home_score ?? "");
  const [a, setA] = useState(saved?.away_score ?? "");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setH(saved?.home_score ?? ""); setA(saved?.away_score ?? ""); }, [saved]);

  if (!home || !away) return null;
  const now = new Date(Date.now() + (clockOffset || 0));
  const locked = match.status !== "upcoming" || now >= new Date(match.match_date);
  const dirty = !saved || String(h) !== String(saved.home_score ?? "") || String(a) !== String(saved.away_score ?? "");
  const isSaved = !!saved && !dirty;

  async function save() {
    if (locked || h === "" || a === "") return;
    setSaving(true);
    if (saved) await supabase.from("predictions").update({ home_score: parseInt(h), away_score: parseInt(a), updated_at: new Date().toISOString() }).eq("id", saved.id);
    else await supabase.from("predictions").insert({ user_id: user.id, match_id: match.id, home_score: parseInt(h), away_score: parseInt(a) });
    await loadUserPredictions();
    setSaving(false);
  }

  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${C.borderSoft}` }}>
      <div style={{ fontSize: 11, color: locked ? C.danger : C.textSoft, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        <DoublePickBtn match={match} />
        🗓️ {formatDate(match.match_date)}
        {match.stage !== "group" && <span style={{ color: C.gold, fontFamily: C.display, fontSize: 10, textTransform: "uppercase" }}>· {STAGE_LABEL[match.stage] || match.stage}</span>}
        {locked && <span style={{ fontFamily: C.display, fontSize: 10, textTransform: "uppercase" }}>· Encerrado</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, fontSize: 13, textAlign: "right" }}>
          <span style={{ color: C.text }}>{home.name}</span><FlagImg id={home.id} size={20} />
        </div>
        {!user || locked ? (
          <span style={{ minWidth: 64, textAlign: "center", padding: "5px 12px", background: "rgba(255,255,255,0.05)", borderRadius: 8, fontFamily: C.display, fontSize: 12, color: C.textSoft, border: `1px solid ${C.borderSoft}` }}>
            {saved ? `${saved.home_score} × ${saved.away_score}` : (locked ? "🔒" : "—")}
          </span>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="number" min="0" max="99" value={h} onChange={e => setH(e.target.value)} style={scoreInputStyle} />
            <span style={{ color: C.neon, fontFamily: C.display, fontSize: 16 }}>×</span>
            <input type="number" min="0" max="99" value={a} onChange={e => setA(e.target.value)} style={scoreInputStyle} />
          </div>
        )}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <FlagImg id={away.id} size={20} /><span style={{ color: C.text }}>{away.name}</span>
        </div>
        {user && !locked && (
          <button onClick={save} disabled={saving || h === "" || a === "" || !dirty} style={{ background: isSaved ? "rgba(34,197,94,0.15)" : `linear-gradient(135deg, ${C.neon}, ${C.neonSoft})`, color: isSaved ? C.neon : C.bgDeep, border: isSaved ? `1px solid ${C.border}` : "none", padding: "8px 14px", borderRadius: 8, fontSize: 11, cursor: dirty ? "pointer" : "default", fontFamily: C.display, letterSpacing: "0.1em", textTransform: "uppercase", minWidth: 76, opacity: (h === "" || a === "") ? 0.5 : 1 }}>
            {saving ? "..." : isSaved ? "✓ OK" : "Salvar"}
          </button>
        )}
      </div>
    </div>
  );
}

function computeStandings(teamsArr, matchesArr) {
  const tbl = {};
  teamsArr.forEach(t => { tbl[t.id] = { team: t, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0 }; });
  matchesArr.forEach(m => {
    if (m.status !== "finished" || m.home_score == null || m.away_score == null) return;
    const h = tbl[m.home_team_id], a = tbl[m.away_team_id];
    if (!h || !a) return;
    h.j++; a.j++;
    h.gp += m.home_score; h.gc += m.away_score;
    a.gp += m.away_score; a.gc += m.home_score;
    if (m.home_score > m.away_score) { h.v++; h.pts += 3; a.d++; }
    else if (m.home_score < m.away_score) { a.v++; a.pts += 3; h.d++; }
    else { h.e++; a.e++; h.pts++; a.pts++; }
  });
  return Object.values(tbl).map(r => ({ ...r, sg: r.gp - r.gc }))
    .sort((x, y) => y.pts - x.pts || y.sg - x.sg || y.gp - x.gp || x.team.name.localeCompare(y.team.name));
}

// ─── GROUPS TAB ──────────────────────────────────────────────────────────────

function GroupsTab() {
  const { groups, teams, matches } = useApp();
  return (
    <div>
      {/* Chaveamento primeiro */}
      <EliminationBracket />

      <SectionTitle eyebrow="Fase 1" title="Grupos · Classificação" />
      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))" }}>
        {groups.map(g => {
          const groupTeams = Object.values(teams).filter(t => t.group_id === g.id);
          const groupMatches = matches.filter(m => m.group_id === g.id);
          const standings = computeStandings(groupTeams, groupMatches);
          return (
            <div key={g.id} style={{ background: `linear-gradient(180deg, ${C.surface}, ${C.surface2})`, border: `1px solid ${C.border}`, borderRadius: 18, padding: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${C.borderSoft}` }}>
                <span style={{ fontFamily: C.display, color: C.text, fontSize: 18, letterSpacing: "0.05em" }}>{g.name}</span>
                <span style={{ fontSize: 10, color: C.neon, letterSpacing: "0.2em", textTransform: "uppercase" }}>Classificação</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", fontSize: 10, color: C.textSoft, letterSpacing: "0.05em", textTransform: "uppercase", padding: "0 0 6px", borderBottom: `1px solid ${C.borderSoft}` }}>
                <span style={{ width: 18 }}>#</span>
                <span style={{ flex: 1 }}>Seleção</span>
                <span style={{ width: 24, textAlign: "center" }}>J</span>
                <span style={{ width: 30, textAlign: "center" }}>SG</span>
                <span style={{ width: 30, textAlign: "center", color: C.neon }}>Pts</span>
              </div>
              {standings.map((r, i) => (
                <div key={r.team.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 0", fontSize: 13, borderBottom: `1px solid ${C.borderSoft}`, background: i < 2 ? "rgba(34,197,94,0.06)" : "transparent" }}>
                  <span style={{ width: 18, fontFamily: C.display, fontSize: 12, color: i < 2 ? C.neon : C.textSoft }}>{i + 1}</span>
                  <span style={{ flex: 1, display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                    <FlagImg id={r.team.id} size={18} />
                    <span style={{ color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.team.name}</span>
                  </span>
                  <span style={{ width: 24, textAlign: "center", color: C.textSoft }}>{r.j}</span>
                  <span style={{ width: 30, textAlign: "center", color: C.textSoft }}>{r.sg > 0 ? `+${r.sg}` : r.sg}</span>
                  <span style={{ width: 30, textAlign: "center", fontFamily: C.display, color: C.neon }}>{r.pts}</span>
                </div>
              ))}
              <div style={{ fontSize: 10, color: C.textSoft, marginTop: 8 }}>🟢 Zona de classificação (1º e 2º)</div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.borderSoft}` }}>
                {groupMatches.map(m => {
                  const h = teams[m.home_team_id]; const a = teams[m.away_team_id];
                  return (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, fontSize: 12, padding: "5px 0", color: C.textSoft }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}><FlagImg id={h?.id} size={16} /> {h?.name}</span>
                      <span style={{ background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 6, fontFamily: C.display, color: C.text, fontSize: 11 }}>{m.status === "finished" ? `${m.home_score}×${m.away_score}` : formatDate(m.match_date)}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>{a?.name} <FlagImg id={a?.id} size={16} /></span>
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

// ─── PREDICTIONS TAB ──────────────────────────────────────────────────────────

function PredictionsTab() {
  const { user, matches, teams, groups, predictions, groupPredictions, supabase, clockOffset, loadUserPredictions } = useApp();
  const [section, setSection] = useState("grupos");
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeStage, setActiveStage] = useState(null);
  const [saving, setSaving] = useState({});
  const [localPreds, setLocalPreds] = useState({});
  const [localGP, setLocalGP] = useState({});

  useEffect(() => { setLocalPreds(prev => ({ ...predictions, ...prev })); setLocalGP(prev => ({ ...groupPredictions, ...prev })); }, [predictions, groupPredictions]);

  const now = new Date(Date.now() + (clockOffset || 0));
  const matchLocked = (m) => m.status !== "upcoming" || now >= new Date(m.match_date);
  const groupLocked = (groupId) => {
    const gMs = matches.filter(m => m.group_id === groupId && m.stage === "group").sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
    return gMs.length > 0 && matchLocked(gMs[0]);
  };

  if (!user) return <EmptyState icon="🔒" title="Acesso Restrito" desc='Faça login no botão "Entrar" no topo para palpitar.' />;

  async function savePrediction(matchId, home, away) {
    const match = matches.find(m => m.id === matchId);
    if (!match || matchLocked(match)) return;
    setSaving(s => ({ ...s, [matchId]: true }));
    const existing = predictions[matchId];
    if (existing) await supabase.from("predictions").update({ home_score: parseInt(home), away_score: parseInt(away), updated_at: new Date().toISOString() }).eq("id", existing.id);
    else await supabase.from("predictions").insert({ user_id: user.id, match_id: matchId, home_score: parseInt(home), away_score: parseInt(away) });
    await loadUserPredictions();
    setSaving(s => ({ ...s, [matchId]: false }));
  }

  async function saveGroupPred(groupId, first, second) {
    if (!first || !second || first === second || groupLocked(groupId)) return;
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

  const knockoutMatches = matches.filter(m => m.stage !== "group" && m.home_team_id && m.away_team_id);
  const knockoutByStage = {};
  knockoutMatches.forEach(m => {
    if (!knockoutByStage[m.stage]) knockoutByStage[m.stage] = [];
    knockoutByStage[m.stage].push(m);
  });
  Object.keys(knockoutByStage).forEach(k => knockoutByStage[k].sort((a, b) => new Date(a.match_date) - new Date(b.match_date)));
  const knockoutStagesPresent = KNOCKOUT_STAGES.filter(s => knockoutByStage[s.key]);

  const totalKnockoutFilled = knockoutMatches.filter(m => predictions[m.id]).length;

  return (
    <div>
      <SectionTitle eyebrow="Seus" title="Palpites" />

      {/* Aviso dobrado */}
      <div style={{ background: "rgba(250,204,21,0.08)", border: `1px solid rgba(250,204,21,0.3)`, borderRadius: 12, padding: "12px 18px", marginBottom: 16, fontSize: 13, color: C.gold, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 16 }}>⭐</span> Marque um jogo por dia com ⭐ para pontuar em dobro!
      </div>
      <div style={{ background: "rgba(250,204,21,0.06)", border: `1px solid rgba(250,204,21,0.2)`, borderRadius: 12, padding: "12px 18px", marginBottom: 20, fontSize: 13, color: C.gold, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 16 }}>⚠️</span> Cada palpite se encerra individualmente no horário de início do jogo (horário de Brasília).
      </div>

      {/* Seletor de seção */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { id: "grupos", label: "Fase de Grupos", icon: "🌐" },
          { id: "eliminatorias", label: "Eliminatórias", icon: "🏆", badge: knockoutMatches.length > 0 ? `${totalKnockoutFilled}/${knockoutMatches.length}` : null },
        ].map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{ background: section === s.id ? `linear-gradient(135deg, ${C.neon}, ${C.neonSoft})` : "transparent", color: section === s.id ? C.bgDeep : C.textSoft, border: `1px solid ${section === s.id ? "transparent" : C.borderSoft}`, padding: "10px 20px", borderRadius: 10, fontSize: 13, cursor: "pointer", fontFamily: C.display, letterSpacing: "0.05em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
            <span>{s.icon}</span> {s.label}
            {s.badge && <span style={{ fontSize: 10, background: "rgba(0,0,0,0.2)", borderRadius: 999, padding: "2px 8px" }}>{s.badge}</span>}
          </button>
        ))}
      </div>

      {/* GRUPOS */}
      {section === "grupos" && groups.map(g => {
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
                <div style={{ background: "rgba(34,197,94,0.06)", border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 18, opacity: groupLocked(g.id) ? 0.55 : 1 }}>
                  <div style={{ fontFamily: C.display, marginBottom: 14, fontSize: 12, color: C.neon, letterSpacing: "0.15em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
                    🏅 Classificação do Grupo {groupLocked(g.id) && <span style={{ fontSize: 14 }}>🔒</span>}
                  </div>
                  <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
                    {["first_place", "second_place"].map((pos, i) => (
                      <div key={pos}>
                        <label style={{ fontSize: 11, color: C.textSoft, display: "block", marginBottom: 6, letterSpacing: "0.1em", textTransform: "uppercase" }}>{i === 0 ? "🥇 1º Lugar" : "🥈 2º Lugar"}</label>
                        <select disabled={groupLocked(g.id)} value={localGP[g.id]?.[pos] || ""} onChange={e => { const updated = { ...localGP[g.id], [pos]: e.target.value }; setLocalGP(prev => ({ ...prev, [g.id]: updated })); saveGroupPred(g.id, pos === "first_place" ? e.target.value : localGP[g.id]?.first_place, pos === "second_place" ? e.target.value : localGP[g.id]?.second_place); }} style={{ ...inputStyle, marginBottom: 0, padding: "10px", background: C.surface2, color: C.text, cursor: groupLocked(g.id) ? "not-allowed" : "default" }}>
                          <option value="" style={{ background: C.surface2, color: C.textSoft }}>Selecione</option>
                          {gTeams.map(t => <option key={t.id} value={t.id} style={{ background: C.surface2, color: C.text }}>{t.flag} {t.name}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
                {gMatches.map(m => {
                  const home = teams[m.home_team_id]; const away = teams[m.away_team_id];
                  const pred = localPreds[m.id] || { home_score: "", away_score: "" };
                  const savedPred = predictions[m.id];
                  const isDirty = !savedPred || String(pred.home_score ?? "") !== String(savedPred.home_score ?? "") || String(pred.away_score ?? "") !== String(savedPred.away_score ?? "");
                  const saved = !!savedPred && !isDirty;
                  const locked = matchLocked(m);
                  return (
                    <div key={m.id} style={{ padding: "12px 0", borderBottom: `1px solid ${C.borderSoft}`, opacity: locked ? 0.55 : 1 }}>
                      <div style={{ textAlign: "center", fontSize: 11, color: locked ? C.danger : C.textSoft, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <DoublePickBtn match={m} />
                        <span>🗓️</span> {formatDate(m.match_date)} {locked && <span style={{ color: C.danger, fontFamily: C.display, fontSize: 10, textTransform: "uppercase" }}>· Encerrado</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1, textAlign: "right", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                          <span>{home?.name}</span><FlagImg id={home?.id} size={20} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {locked ? (
                            <span style={{ color: C.textSoft, fontSize: 12, padding: "6px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 8, border: `1px solid ${C.borderSoft}` }}>
                              {saved ? `${pred.home_score ?? "?"} × ${pred.away_score ?? "?"}` : "🔒"}
                            </span>
                          ) : (
                            <>
                              <input type="number" min="0" max="99" value={pred.home_score ?? ""} onChange={e => setLocalPreds(prev => ({ ...prev, [m.id]: { ...prev[m.id], home_score: e.target.value } }))} style={scoreInputStyle} />
                              <span style={{ color: C.neon, fontFamily: C.display, fontSize: 16 }}>×</span>
                              <input type="number" min="0" max="99" value={pred.away_score ?? ""} onChange={e => setLocalPreds(prev => ({ ...prev, [m.id]: { ...prev[m.id], away_score: e.target.value } }))} style={scoreInputStyle} />
                            </>
                          )}
                        </div>
                        <div style={{ flex: 1, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                          <FlagImg id={away?.id} size={20} /><span>{away?.name}</span>
                        </div>
                        {!locked && (
                          <button onClick={() => savePrediction(m.id, pred.home_score, pred.away_score)} disabled={saving[m.id] || pred.home_score === "" || pred.away_score === "" || !isDirty} style={{ background: saved ? "rgba(34,197,94,0.15)" : `linear-gradient(135deg, ${C.neon}, ${C.neonSoft})`, color: saved ? C.neon : C.bgDeep, border: saved ? `1px solid ${C.border}` : "none", padding: "8px 14px", borderRadius: 8, fontSize: 11, cursor: isDirty ? "pointer" : "default", fontFamily: C.display, letterSpacing: "0.1em", textTransform: "uppercase", minWidth: 76, opacity: (pred.home_score === "" || pred.away_score === "") ? 0.5 : 1 }}>
                            {saving[m.id] ? "..." : saved ? "✓ OK" : "Salvar"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* ELIMINATÓRIAS */}
      {section === "eliminatorias" && (
        <div>
          {knockoutStagesPresent.length === 0 && (
            <EmptyState icon="⏳" title="Times ainda não definidos" desc="Aguardando o fim da fase de grupos. Os confrontos serão liberados em breve!" />
          )}
          {knockoutStagesPresent.map(stage => {
            const stageMatches = knockoutByStage[stage.key] || [];
            const isOpen = activeStage === stage.key;
            const filled = stageMatches.filter(m => predictions[m.id]).length;
            return (
              <div key={stage.key} style={{ marginBottom: 14, background: `linear-gradient(180deg, ${C.surface}, ${C.surface2})`, border: `1px solid ${isOpen ? C.border : C.borderSoft}`, borderRadius: 16, overflow: "hidden", boxShadow: isOpen ? C.glow : "none" }}>
                <div onClick={() => setActiveStage(isOpen ? null : stage.key)} style={{ padding: "18px 22px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontFamily: C.display, color: C.text, fontSize: 16, letterSpacing: "0.05em" }}>{stage.label}</span>
                    <span style={{ fontSize: 10, color: C.gold, marginLeft: 10, letterSpacing: "0.15em", textTransform: "uppercase" }}>Eliminatória</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ fontSize: 11, color: C.textSoft }}>
                      <span style={{ color: filled === stageMatches.length && stageMatches.length > 0 ? C.neon : C.gold, fontFamily: C.display }}>{filled}</span> / {stageMatches.length}
                    </span>
                    <span style={{ color: C.neon, fontSize: 18, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>▾</span>
                  </div>
                </div>
                {isOpen && (
                  <div style={{ padding: "0 22px 22px" }}>
                    {stageMatches.map(m => {
                      const home = teams[m.home_team_id]; const away = teams[m.away_team_id];
                      const pred = localPreds[m.id] || { home_score: "", away_score: "" };
                      const savedPred = predictions[m.id];
                      const isDirty = !savedPred || String(pred.home_score ?? "") !== String(savedPred.home_score ?? "") || String(pred.away_score ?? "") !== String(savedPred.away_score ?? "");
                      const saved = !!savedPred && !isDirty;
                      const locked = matchLocked(m);
                      return (
                        <div key={m.id} style={{ padding: "12px 0", borderBottom: `1px solid ${C.borderSoft}`, opacity: locked ? 0.55 : 1 }}>
                          <div style={{ textAlign: "center", fontSize: 11, color: locked ? C.danger : C.textSoft, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                            <DoublePickBtn match={m} />
                            <span>🗓️</span> {formatDate(m.match_date)} {locked && <span style={{ color: C.danger, fontFamily: C.display, fontSize: 10, textTransform: "uppercase" }}>· Encerrado</span>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ flex: 1, textAlign: "right", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                              <span>{home?.name}</span><FlagImg id={home?.id} size={20} />
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {locked ? (
                                <span style={{ color: C.textSoft, fontSize: 12, padding: "6px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 8, border: `1px solid ${C.borderSoft}` }}>
                                  {saved ? `${pred.home_score ?? "?"} × ${pred.away_score ?? "?"}` : "🔒"}
                                </span>
                              ) : (
                                <>
                                  <input type="number" min="0" max="99" value={pred.home_score ?? ""} onChange={e => setLocalPreds(prev => ({ ...prev, [m.id]: { ...prev[m.id], home_score: e.target.value } }))} style={scoreInputStyle} />
                                  <span style={{ color: C.neon, fontFamily: C.display, fontSize: 16 }}>×</span>
                                  <input type="number" min="0" max="99" value={pred.away_score ?? ""} onChange={e => setLocalPreds(prev => ({ ...prev, [m.id]: { ...prev[m.id], away_score: e.target.value } }))} style={scoreInputStyle} />
                                </>
                              )}
                            </div>
                            <div style={{ flex: 1, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                              <FlagImg id={away?.id} size={20} /><span>{away?.name}</span>
                            </div>
                            {!locked && (
                              <button onClick={() => savePrediction(m.id, pred.home_score, pred.away_score)} disabled={saving[m.id] || pred.home_score === "" || pred.away_score === "" || !isDirty} style={{ background: saved ? "rgba(34,197,94,0.15)" : `linear-gradient(135deg, ${C.neon}, ${C.neonSoft})`, color: saved ? C.neon : C.bgDeep, border: saved ? `1px solid ${C.border}` : "none", padding: "8px 14px", borderRadius: 8, fontSize: 11, cursor: isDirty ? "pointer" : "default", fontFamily: C.display, letterSpacing: "0.1em", textTransform: "uppercase", minWidth: 76, opacity: (pred.home_score === "" || pred.away_score === "") ? 0.5 : 1 }}>
                                {saving[m.id] ? "..." : saved ? "✓ OK" : "Salvar"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const scoreInputStyle = { width: 48, background: C.bgDeep, border: `1px solid ${C.border}`, color: C.text, textAlign: "center", padding: "8px", borderRadius: 8, fontSize: 18, fontFamily: C.display, outline: "none" };

// ─── RESUMO TAB ───────────────────────────────────────────────────────────────

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function renderResumoImage(round, rows) {
  return new Promise((resolve) => {
    const top = rows.slice(0, 12);
    const W = 1080; const H = 360 + top.length * 92 + 110;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const x = cv.getContext("2d");
    const g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#05070f"); g.addColorStop(1, "#0c1f16");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = "#22c55e"; x.font = "bold 36px Arial"; x.textAlign = "center";
    x.fillText("⚽ BOLÃO COPA 2026 · AGROTIS", W / 2, 95);
    x.fillStyle = "#f5f7fb"; x.font = "bold 78px Arial";
    x.fillText(`RESUMO · RODADA ${round}`, W / 2, 185);
    x.fillStyle = "#9aa6bd"; x.font = "30px Arial";
    x.fillText("Maiores pontuadores da rodada", W / 2, 240);
    let y = 340;
    const medals = ["🥇", "🥈", "🥉"];
    top.forEach((r, i) => {
      x.fillStyle = i === 0 ? "rgba(250,204,21,0.16)" : "rgba(255,255,255,0.05)";
      roundRectPath(x, 70, y - 52, W - 140, 78, 16); x.fill();
      x.textAlign = "left"; x.fillStyle = "#f5f7fb"; x.font = "bold 42px Arial";
      const pos = medals[i] || `${i + 1}º`;
      const name = r.name && r.name.length > 22 ? r.name.slice(0, 21) + "…" : (r.name || "—");
      x.fillText(`${pos}  ${name}`, 110, y);
      x.textAlign = "right"; x.fillStyle = "#22c55e"; x.font = "bold 46px Arial";
      x.fillText(`${r.pontos} pts`, W - 110, y);
      if (r.exatos > 0) { x.fillStyle = "#9aa6bd"; x.font = "24px Arial"; x.fillText(`${r.exatos} exato${r.exatos > 1 ? "s" : ""}`, W - 110, y + 30); }
      y += 92;
    });
    x.textAlign = "center"; x.fillStyle = "#9aa6bd"; x.font = "26px Arial";
    x.fillText("bolao-copa-2026-two-pink.vercel.app", W / 2, H - 45);
    cv.toBlob((b) => resolve(b), "image/png");
  });
}

function ResumoTab() {
  const { supabase, matches, teams } = useApp();
  const [rounds, setRounds] = useState([]);
  const [sel, setSel] = useState(null);
  const [rows, setRows] = useState([]);
  const [preds, setPreds] = useState([]);
  const [openPlayer, setOpenPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    supabase.rpc("rounds_status").then(({ data }) => {
      const rs = data || [];
      setRounds(rs);
      const withFin = rs.filter(r => r.finalizados > 0);
      setSel(withFin.length ? withFin[withFin.length - 1].round : (rs[0]?.round ?? 1));
    });
  }, []);

  useEffect(() => {
    if (sel == null) return;
    setLoading(true); setOpenPlayer(null);
    Promise.all([
      supabase.rpc("round_summary", { p_round: sel }),
      supabase.rpc("round_predictions", { p_round: sel }),
    ]).then(([sumRes, predRes]) => {
      setRows(sumRes.data || []); setPreds(predRes.data || []); setLoading(false);
    });
  }, [sel]);

  const roundLabels = { 1: "Rodada 1", 2: "Rodada 2", 3: "Rodada 3", 4: "Rodada de 32", 5: "Oitavas", 6: "Quartas", 7: "Semifinal", 8: "Final" };
  const info = rounds.find(r => r.round === sel);
  const matchById = {}; matches.forEach(m => { matchById[m.id] = m; });

  async function share() {
    setSharing(true);
    try {
      const blob = await renderResumoImage(sel, rows);
      const file = new File([blob], `resumo-rodada-${sel}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Resumo Rodada ${sel}`, text: `Bolão Copa 2026 — Resumo da Rodada ${sel}` });
      } else {
        const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = file.name; a.click(); URL.revokeObjectURL(url);
      }
    } catch (e) {}
    setSharing(false);
  }

  return (
    <div>
      <SectionTitle eyebrow="Por rodada" title="Resumo" />
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {rounds.map(r => (
          <button key={r.round} onClick={() => setSel(r.round)} style={{ background: sel === r.round ? `linear-gradient(135deg, ${C.neon}, ${C.neonSoft})` : "transparent", color: sel === r.round ? C.bgDeep : C.textSoft, border: `1px solid ${sel === r.round ? "transparent" : C.borderSoft}`, padding: "10px 18px", borderRadius: 10, fontSize: 12, cursor: "pointer", fontFamily: C.display, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {roundLabels[r.round] || `Rodada ${r.round}`}
            <span style={{ display: "block", fontSize: 10, opacity: 0.8, marginTop: 2 }}>{r.finalizados}/{r.total} jogos</span>
          </button>
        ))}
      </div>
      <div style={{ background: `linear-gradient(180deg, ${C.surface}, ${C.surface2})`, border: `1px solid ${C.border}`, borderRadius: 18, padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: C.display, fontSize: 20, color: C.text }}>{roundLabels[sel] || `Rodada ${sel}`}</div>
            <div style={{ fontSize: 12, color: C.textSoft, marginTop: 2 }}>{info ? `${info.finalizados} de ${info.total} jogos finalizados` : ""}</div>
          </div>
          <button onClick={share} disabled={sharing || rows.length === 0} style={{ background: rows.length === 0 ? "rgba(255,255,255,0.06)" : `linear-gradient(135deg, ${C.neon}, ${C.neonSoft})`, color: rows.length === 0 ? C.textSoft : C.bgDeep, border: "none", padding: "12px 20px", borderRadius: 10, fontSize: 12, cursor: rows.length === 0 ? "default" : "pointer", fontFamily: C.display, letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
            📲 {sharing ? "Gerando..." : "Compartilhar no WhatsApp"}
          </button>
        </div>
        {loading ? <Empty>Carregando...</Empty> : rows.length === 0 ? <Empty>Ainda não há jogos finalizados nesta rodada.</Empty> : rows.map((r, i) => {
          const isOpen = openPlayer === r.name;
          const myPreds = preds.filter(p => p.user_name === r.name);
          return (
            <div key={r.name} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${C.borderSoft}` : "none" }}>
              <div onClick={() => setOpenPlayer(isOpen ? null : r.name)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", cursor: "pointer" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.display, fontSize: 16, background: i === 0 ? `linear-gradient(135deg, ${C.gold}, #f59e0b)` : i === 1 ? "linear-gradient(135deg,#cbd5e1,#94a3b8)" : i === 2 ? "linear-gradient(135deg,#d97706,#92400e)" : "rgba(255,255,255,0.06)", color: i < 3 ? C.bgDeep : C.textSoft }}>{["🥇","🥈","🥉"][i] || i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: C.text }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: C.textSoft, marginTop: 2 }}>{r.jogos} jogo{r.jogos > 1 ? "s" : ""} · {r.exatos} placar{r.exatos === 1 ? "" : "es"} exato{r.exatos === 1 ? "" : "s"}</div>
                </div>
                <div style={{ fontFamily: C.display, color: C.neon, fontSize: 22 }}>{r.pontos}<span style={{ fontSize: 12, color: C.textSoft, marginLeft: 4 }}>pts</span></div>
                <span style={{ color: C.neon, fontSize: 16, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
              </div>
              {isOpen && (
                <div style={{ padding: "4px 0 16px", display: "grid", gap: 8 }}>
                  {myPreds.length === 0 ? <div style={{ fontSize: 12, color: C.textSoft, padding: "8px 0" }}>Sem palpites em jogos já finalizados.</div> : myPreds.map(p => {
                    const m = matchById[p.match_id]; if (!m) return null;
                    const h = teams[m.home_team_id]; const a = teams[m.away_team_id];
                    return (
                      <div key={p.match_id} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", border: `1px solid ${p.doubled ? "rgba(250,204,21,0.3)" : C.borderSoft}`, borderRadius: 10, padding: "8px 12px", fontSize: 13 }}>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, textAlign: "right" }}>
                          <span style={{ color: C.textSoft }}>{h?.name}</span><FlagImg id={m.home_team_id} size={16} />
                        </div>
                        <span style={{ fontFamily: C.display, color: C.text, minWidth: 38, textAlign: "center", background: "rgba(34,197,94,0.12)", borderRadius: 6, padding: "2px 6px" }}>{p.pred_home}×{p.pred_away}</span>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 5 }}>
                          <FlagImg id={m.away_team_id} size={16} /><span style={{ color: C.textSoft }}>{a?.name}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 72 }}>
                          <span style={{ fontSize: 10, color: C.textSoft }}>real {m.home_score}×{m.away_score}</span>
                          <span style={{ fontFamily: C.display, fontSize: 13, color: p.pts >= 5 ? C.neon : p.pts > 0 ? C.gold : C.danger }}>
                            {p.doubled && "⭐"} +{p.pts} pts
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ADMIN TAB ────────────────────────────────────────────────────────────────

function AdminTab() {
  const { matches, teams, supabase, loadPublicData } = useApp();
  const [adminSection, setAdminSection] = useState("resultados");
  const [local, setLocal] = useState({});
  const [localTeams, setLocalTeams] = useState({});
  const [saving, setSaving] = useState({});
  const [filter, setFilter] = useState("all");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const init = {};
    matches.forEach(m => { init[m.id] = { h: m.home_score ?? "", a: m.away_score ?? "" }; });
    setLocal(init);
    const initT = {};
    matches.filter(m => m.stage !== "group").forEach(m => { initT[m.id] = { home: m.home_team_id || "", away: m.away_team_id || "" }; });
    setLocalTeams(initT);
  }, [matches]);

  async function saveResult(m) {
    const v = local[m.id];
    if (v?.h === "" || v?.a === "" || v?.h == null || v?.a == null) return;
    setSaving(s => ({ ...s, [m.id]: true })); setMsg("");
    const { error } = await supabase.rpc("set_result", { p_match_id: m.id, p_home: parseInt(v.h), p_away: parseInt(v.a) });
    if (error) setMsg("Erro ao salvar: " + error.message);
    else { setMsg(`✓ Resultado salvo: ${teams[m.home_team_id]?.name || "?"} ${v.h} x ${v.a} ${teams[m.away_team_id]?.name || "?"}`); await loadPublicData(); }
    setSaving(s => ({ ...s, [m.id]: false }));
  }

  async function reopen(m) {
    setSaving(s => ({ ...s, [m.id]: true })); setMsg("");
    const { error } = await supabase.rpc("reopen_match", { p_match_id: m.id });
    if (error) setMsg("Erro: " + error.message);
    else { setMsg("↩️ Jogo reaberto."); await loadPublicData(); }
    setSaving(s => ({ ...s, [m.id]: false }));
  }

  async function saveTeams(m) {
    const v = localTeams[m.id] || { home: "", away: "" };
    setSaving(s => ({ ...s, [m.id]: true })); setMsg("");
    const { error } = await supabase.rpc("set_match_teams", { p_match_id: m.id, p_home: v.home, p_away: v.away });
    if (error) setMsg("Erro: " + error.message);
    else { setMsg("✓ Times definidos!"); await loadPublicData(); }
    setSaving(s => ({ ...s, [m.id]: false }));
  }

  const allTeamsList = Object.values(teams).sort((a, b) => a.name.localeCompare(b.name));
  const groupMatches = matches.filter(m => m.stage === "group");
  const knockoutMatches = matches.filter(m => m.stage !== "group").sort((a, b) => new Date(a.match_date) - new Date(b.match_date));

  const filteredGroup = groupMatches.filter(m =>
    filter === "all" ? true : filter === "finished" ? m.status === "finished" : m.status !== "finished"
  );

  return (
    <div>
      <SectionTitle eyebrow="Painel" title="Admin" />

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["resultados","Resultados","⚽"],["times","Definir Times","🏳️"]].map(([id,label,icon]) => (
          <button key={id} onClick={() => setAdminSection(id)} style={{ background: adminSection === id ? `linear-gradient(135deg, ${C.neon}, ${C.neonSoft})` : "transparent", color: adminSection === id ? C.bgDeep : C.textSoft, border: `1px solid ${adminSection === id ? "transparent" : C.borderSoft}`, padding: "10px 20px", borderRadius: 10, fontSize: 13, cursor: "pointer", fontFamily: C.display, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {msg && <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: C.neon }}>{msg}</div>}

      {/* Resultados */}
      {adminSection === "resultados" && (
        <>
          <div style={{ background: "rgba(34,197,94,0.08)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px", marginBottom: 18, fontSize: 13, color: C.text }}>
            Digite o placar final e clique em <strong>Lançar</strong>. Pontuação recalculada automaticamente. {matches.filter(m => m.status === "finished").length} de {matches.length} jogos finalizados.
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            {[["all","Todos"],["upcoming","A realizar"],["finished","Finalizados"]].map(([id,label]) => (
              <button key={id} onClick={() => setFilter(id)} style={{ background: filter===id ? `linear-gradient(135deg, ${C.neon}, ${C.neonSoft})` : "transparent", color: filter===id ? C.bgDeep : C.textSoft, border: `1px solid ${filter===id ? "transparent" : C.borderSoft}`, padding: "8px 16px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: C.display, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</button>
            ))}
          </div>
          <div style={{ background: `linear-gradient(180deg, ${C.surface}, ${C.surface2})`, border: `1px solid ${C.border}`, borderRadius: 16, padding: "0.5rem 1.25rem", marginBottom: 24 }}>
            <div style={{ padding: "10px 0", fontSize: 11, color: C.neon, fontFamily: C.display, letterSpacing: "0.15em", textTransform: "uppercase" }}>Fase de Grupos</div>
            {filteredGroup.map(m => {
              const home = teams[m.home_team_id]; const away = teams[m.away_team_id];
              const v = local[m.id] || { h: "", a: "" };
              const isFinished = m.status === "finished";
              return (
                <div key={m.id} style={{ padding: "14px 0", borderBottom: `1px solid ${C.borderSoft}` }}>
                  <div style={{ fontSize: 11, color: C.textSoft, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>🗓️ {formatDate(m.match_date)}</span>
                    <span>· Grupo {m.group_id}</span>
                    {isFinished && <span style={{ color: C.neon, fontFamily: C.display, fontSize: 10, textTransform: "uppercase" }}>· Finalizado</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 120, textAlign: "right", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}><span>{home?.name}</span><FlagImg id={home?.id} size={20} /></div>
                    <input type="number" min="0" max="99" value={v.h} onChange={e => setLocal(p => ({ ...p, [m.id]: { ...p[m.id], h: e.target.value } }))} style={scoreInputStyle} />
                    <span style={{ color: C.neon, fontFamily: C.display }}>×</span>
                    <input type="number" min="0" max="99" value={v.a} onChange={e => setLocal(p => ({ ...p, [m.id]: { ...p[m.id], a: e.target.value } }))} style={scoreInputStyle} />
                    <div style={{ flex: 1, minWidth: 120, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}><FlagImg id={away?.id} size={20} /><span>{away?.name}</span></div>
                    <button onClick={() => saveResult(m)} disabled={saving[m.id] || v.h === "" || v.a === ""} style={{ background: `linear-gradient(135deg, ${C.neon}, ${C.neonSoft})`, color: C.bgDeep, border: "none", padding: "9px 16px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: C.display, letterSpacing: "0.08em", textTransform: "uppercase", minWidth: 80, opacity: (v.h === "" || v.a === "") ? 0.5 : 1 }}>
                      {saving[m.id] ? "..." : isFinished ? "Atualizar" : "Lançar"}
                    </button>
                    {isFinished && <button onClick={() => reopen(m)} disabled={saving[m.id]} style={{ background: "transparent", color: C.danger, border: `1px solid ${C.borderSoft}`, padding: "9px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: C.display, letterSpacing: "0.08em", textTransform: "uppercase" }}>Reabrir</button>}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Eliminatórias resultados */}
          <div style={{ background: `linear-gradient(180deg, ${C.surface}, ${C.surface2})`, border: `1px solid ${C.border}`, borderRadius: 16, padding: "0.5rem 1.25rem" }}>
            <div style={{ padding: "10px 0", fontSize: 11, color: C.gold, fontFamily: C.display, letterSpacing: "0.15em", textTransform: "uppercase" }}>Eliminatórias</div>
            {knockoutMatches.map(m => {
              const home = teams[m.home_team_id]; const away = teams[m.away_team_id];
              const v = local[m.id] || { h: "", a: "" };
              const isFinished = m.status === "finished";
              if (!home || !away) return (
                <div key={m.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.borderSoft}`, fontSize: 12, color: C.textSoft, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: C.gold }}>{STAGE_LABEL[m.stage] || m.stage}</span>
                  <span>{formatDate(m.match_date)}</span>
                  <span style={{ color: C.textSoft }}>· Times não definidos</span>
                </div>
              );
              return (
                <div key={m.id} style={{ padding: "14px 0", borderBottom: `1px solid ${C.borderSoft}` }}>
                  <div style={{ fontSize: 11, color: C.textSoft, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>🗓️ {formatDate(m.match_date)}</span>
                    <span style={{ color: C.gold }}>· {STAGE_LABEL[m.stage] || m.stage}</span>
                    {isFinished && <span style={{ color: C.neon, fontFamily: C.display, fontSize: 10, textTransform: "uppercase" }}>· Finalizado</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 120, textAlign: "right", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}><span>{home?.name}</span><FlagImg id={home?.id} size={20} /></div>
                    <input type="number" min="0" max="99" value={v.h} onChange={e => setLocal(p => ({ ...p, [m.id]: { ...p[m.id], h: e.target.value } }))} style={scoreInputStyle} />
                    <span style={{ color: C.neon, fontFamily: C.display }}>×</span>
                    <input type="number" min="0" max="99" value={v.a} onChange={e => setLocal(p => ({ ...p, [m.id]: { ...p[m.id], a: e.target.value } }))} style={scoreInputStyle} />
                    <div style={{ flex: 1, minWidth: 120, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}><FlagImg id={away?.id} size={20} /><span>{away?.name}</span></div>
                    <button onClick={() => saveResult(m)} disabled={saving[m.id] || v.h === "" || v.a === ""} style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldSoft})`, color: C.bgDeep, border: "none", padding: "9px 16px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: C.display, letterSpacing: "0.08em", textTransform: "uppercase", minWidth: 80, opacity: (v.h === "" || v.a === "") ? 0.5 : 1 }}>
                      {saving[m.id] ? "..." : isFinished ? "Atualizar" : "Lançar"}
                    </button>
                    {isFinished && <button onClick={() => reopen(m)} disabled={saving[m.id]} style={{ background: "transparent", color: C.danger, border: `1px solid ${C.borderSoft}`, padding: "9px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: C.display, textTransform: "uppercase" }}>Reabrir</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Definir Times */}
      {adminSection === "times" && (
        <div style={{ background: `linear-gradient(180deg, ${C.surface}, ${C.surface2})`, border: `1px solid ${C.border}`, borderRadius: 16, padding: "0.5rem 1.25rem" }}>
          <div style={{ padding: "10px 0 6px", fontSize: 12, color: C.textSoft }}>
            Defina os times para cada jogo das eliminatórias conforme o chaveamento for definido.
          </div>
          {knockoutMatches.map(m => {
            const v = localTeams[m.id] || { home: m.home_team_id || "", away: m.away_team_id || "" };
            return (
              <div key={m.id} style={{ padding: "14px 0", borderBottom: `1px solid ${C.borderSoft}` }}>
                <div style={{ fontSize: 11, color: C.textSoft, marginBottom: 8 }}>
                  <span style={{ color: C.gold }}>{STAGE_LABEL[m.stage] || m.stage}</span> · {formatDate(m.match_date)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <select value={v.home} onChange={e => setLocalTeams(p => ({ ...p, [m.id]: { ...p[m.id], home: e.target.value } }))}
                    style={{ ...inputStyle, marginBottom: 0, padding: "8px 10px", background: C.surface2, color: C.text, flex: 1, minWidth: 140 }}>
                    <option value="">A definir</option>
                    {allTeamsList.map(t => <option key={t.id} value={t.id} style={{ background: C.surface2 }}>{t.flag} {t.name}</option>)}
                  </select>
                  <span style={{ color: C.neon, fontFamily: C.display, fontSize: 16 }}>×</span>
                  <select value={v.away} onChange={e => setLocalTeams(p => ({ ...p, [m.id]: { ...p[m.id], away: e.target.value } }))}
                    style={{ ...inputStyle, marginBottom: 0, padding: "8px 10px", background: C.surface2, color: C.text, flex: 1, minWidth: 140 }}>
                    <option value="">A definir</option>
                    {allTeamsList.map(t => <option key={t.id} value={t.id} style={{ background: C.surface2 }}>{t.flag} {t.name}</option>)}
                  </select>
                  <button onClick={() => saveTeams(m)} disabled={saving[m.id]}
                    style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldSoft})`, color: C.bgDeep, border: "none", padding: "9px 18px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: C.display, letterSpacing: "0.08em", textTransform: "uppercase", minWidth: 80 }}>
                    {saving[m.id] ? "..." : "Salvar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── OTHER TABS ───────────────────────────────────────────────────────────────

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
        <p>Cada palpite pode ser enviado e editado livremente até o <strong style={{ color: C.text }}>início daquele jogo</strong>.</p>
        <p>No momento em que a partida começa, o palpite daquele jogo é <strong style={{ color: C.danger }}>congelado</strong> automaticamente.</p>
        <p>O palpite de classificação do grupo (1º e 2º lugar) trava quando o primeiro jogo daquele grupo começa.</p>
      </Section>
      <Section title="⭐ Palpite Dobrado">
        <p>Cada jogador pode escolher <strong style={{ color: C.gold }}>1 jogo por dia</strong> para pontuar em dobro.</p>
        <PointRow pts={10} label="Placar exato dobrado" desc="Acertou o placar exato no jogo escolhido" />
        <PointRow pts={6} label="Resultado dobrado" desc="Acertou vencedor/empate no jogo escolhido" />
        <PointRow pts={2} label="Saldo de gols dobrado" desc="Acertou a diferença de gols no jogo escolhido" />
        <p style={{ marginTop: 14 }}>Marque o jogo com ⭐ na aba <strong style={{ color: C.text }}>Palpites</strong> antes do início da partida. Você pode trocar até o apito inicial.</p>
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
