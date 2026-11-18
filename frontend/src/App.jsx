import Conveyor3D from "./Conveyor3D.jsx";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { calculateDemoAnalytics } from "./demoAnalytics.js";
import {
  visualSensorState,
  virtualDistanceCm,
  virtualTankPercent,
} from "./sensorVisual.js";
import {
  Activity,
  BarChart3,
  Box,
  Cpu,
  Database,
  Droplets,
  FlaskConical,
  Gauge,
  Layers3,
  PlayCircle,
  Radio,
  RefreshCw,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const formatTime = (date = new Date()) => date.toLocaleTimeString("pt-BR");

function cardClass(accent = "cyan") {
  const accents = {
    cyan: "border-cyan-500/25 shadow-[0_0_20px_rgba(34,211,238,0.08)]",
    emerald: "border-emerald-500/25 shadow-[0_0_20px_rgba(16,185,129,0.08)]",
    violet: "border-violet-500/25 shadow-[0_0_20px_rgba(168,85,247,0.08)]",
    amber: "border-amber-500/25 shadow-[0_0_20px_rgba(245,158,11,0.08)]",
  };
  return `bg-slate-900/70 border rounded-2xl ${accents[accent] ?? accents.cyan}`;
}

function StatCard({ icon: Icon, title, value, subtitle, accent = "cyan" }) {
  const iconColors = {
    cyan: "text-cyan-300 border-cyan-400/30 bg-cyan-500/10",
    emerald: "text-emerald-300 border-emerald-400/30 bg-emerald-500/10",
    violet: "text-violet-300 border-violet-400/30 bg-violet-500/10",
    amber: "text-amber-300 border-amber-400/30 bg-amber-500/10",
  };

  return (
    <div className={`${cardClass(accent)} p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
            {title}
          </div>
          <div className="text-4xl font-black mt-2 text-slate-100">{value}</div>
          <div className="text-sm mt-2 text-slate-400">{subtitle}</div>
        </div>
        <div
          className={`w-12 h-12 rounded-xl border flex items-center justify-center ${iconColors[accent]}`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function SensorPill({ title, code, description, active, accent, extra }) {
  const styles = {
    cyan: active
      ? "border-cyan-400 bg-cyan-500/18 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.35)]"
      : "border-cyan-500/20 bg-slate-950/70 text-slate-400",
    violet: active
      ? "border-violet-400 bg-violet-500/18 text-violet-200 shadow-[0_0_18px_rgba(168,85,247,0.35)]"
      : "border-violet-500/20 bg-slate-950/70 text-slate-400",
    amber: active
      ? "border-amber-400 bg-amber-500/18 text-amber-200 shadow-[0_0_18px_rgba(245,158,11,0.35)]"
      : "border-amber-500/20 bg-slate-950/70 text-slate-400",
  };

  return (
    <div
      className={`rounded-xl border px-4 py-4 transition-all ${styles[accent]}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold">
            {code}
          </div>
          <div className="text-sm font-bold mt-1">{title}</div>
        </div>
        <div
          className={`w-3 h-3 rounded-full ${active ? "bg-current animate-pulse" : "bg-slate-700"}`}
        />
      </div>
      <div className="text-xs mt-2 leading-relaxed">{description}</div>
      {extra ? (
        <div className="text-[11px] mt-3 opacity-85">{extra}</div>
      ) : null}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState(() =>
    window.location.hash === "#ra" ? "ra" : "overview",
  );
  const [demoMode, setDemoMode] = useState(
    () =>
      import.meta.env.BASE_URL !== "/" && !import.meta.env.VITE_API_BASE_URL,
  );
  const [demo, setDemo] = useState({
    metal: 0,
    nonmetal: 0,
    distanceCm: 50,
    last: null,
    logs: [],
    history: [],
    events: [],
    tankSamples: [0],
  });

  const [analytics, setAnalytics] = useState(null);
  const [sensorStatus, setSensorStatus] = useState(null);
  const [isConveyorRunning, setIsConveyorRunning] = useState(null);
  const [metallicCount, setMetallicCount] = useState(0);
  const [nonMetallicCount, setNonMetallicCount] = useState(0);
  const [tankLevel, setTankLevel] = useState(null);
  const [distanceCm, setDistanceCm] = useState(null);
  const [distanceHex, setDistanceHex] = useState(null);
  const [distanceStatus, setDistanceStatus] = useState("INDISPONÍVEL");
  const [activeSensorDetected, setActiveSensorDetected] = useState(null);
  const [lastItemType, setLastItemType] = useState(null);
  const [logs, setLogs] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [apiOnline, setApiOnline] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [apiError, setApiError] = useState("Aguardando API");

  const [animationQueue, setAnimationQueue] = useState([]);
  const [activePiece, setActivePiece] = useState(null);
  const previousCountsRef = useRef({ metal: 0, nonmetal: 0 });

  function queuePiece(type, source = "api") {
    setAnimationQueue((current) => [
      ...current,
      { id: `${Date.now()}-${Math.random()}`, type, source },
    ]);
  }

  useEffect(() => {
    if (activePiece || animationQueue.length === 0) return;
    const [next, ...rest] = animationQueue;
    setAnimationQueue(rest);
    setActivePiece({ ...next, progress: 0 });
  }, [animationQueue, activePiece]);

  // A posição da peça é a ÚNICA fonte dos sinais visuais.
  // Um temporizador avança o progresso; os sensores são derivados da posição,
  // para evitar divergência entre animação e indicadores.
  useEffect(() => {
    if (!activePiece?.id) return;
    const id = activePiece.id;
    const startedAt = performance.now();
    const durationMs = 5200;
    let completion;
    const timer = setInterval(() => {
      const progress = clamp(
        (performance.now() - startedAt) / durationMs,
        0,
        1,
      );
      setActivePiece((current) =>
        current?.id === id ? { ...current, progress } : current,
      );
      if (progress >= 1) {
        clearInterval(timer);
        completion = setTimeout(() => {
          setActivePiece((current) => (current?.id === id ? null : current));
        }, 450);
      }
    }, 50);
    return () => {
      clearInterval(timer);
      clearTimeout(completion);
    };
  }, [activePiece?.id]);

  useEffect(() => {
    let mounted = true;
    let controller;
    const base = import.meta.env.VITE_API_BASE_URL || "";

    async function updateDashboard() {
      if (demoMode) return;
      if (controller) controller.abort();
      controller = new AbortController();
      try {
        const response = await fetch(`${base}/api/dashboard`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!mounted) return;

        const newMetal = Number(data.metallicCount ?? 0);
        const newNonmetal = Number(data.nonMetallicCount ?? 0);
        const previous = previousCountsRef.current;

        if (newMetal > previous.metal) {
          for (let i = 0; i < newMetal - previous.metal; i += 1)
            queuePiece("metal", "api");
        }
        if (newNonmetal > previous.nonmetal) {
          for (let i = 0; i < newNonmetal - previous.nonmetal; i += 1)
            queuePiece("nonmetal", "api");
        }
        previousCountsRef.current = { metal: newMetal, nonmetal: newNonmetal };

        setSensorStatus(data.sensors ?? null);
        setMetallicCount(newMetal);
        setNonMetallicCount(newNonmetal);
        setTankLevel(
          data.tank?.levelPercent == null
            ? null
            : Number(data.tank.levelPercent),
        );
        setDistanceCm(
          data.tank?.distanceCm == null ? null : Number(data.tank.distanceCm),
        );
        setDistanceHex(data.tank?.rawHex ?? null);
        setDistanceStatus(data.tank?.status ?? "INDISPONÍVEL");
        setIsConveyorRunning(data.conveyorRunning ?? null);
        setActiveSensorDetected(data.activeSensor ?? null);
        setLastItemType(data.lastItemType ?? null);
        setLogs(Array.isArray(data.logs) ? data.logs : []);
        setHistoryData(Array.isArray(data.history) ? data.history : []);
        setApiOnline(true);
        setApiError("");
        setLastSync(formatTime());
      } catch (error) {
        if (error.name === "AbortError" || !mounted) return;
        setApiOnline(false);
        setApiError(error.message);
      }
    }

    async function updateAnalytics() {
      if (demoMode) return;
      try {
        const response = await fetch(`${base}/api/analytics/summary`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json();
        if (mounted) setAnalytics(data);
      } catch {
        // silently ignore analytics outages
      }
    }

    updateDashboard();
    updateAnalytics();
    const dashboardTimer = setInterval(updateDashboard, 2000);
    const analyticsTimer = setInterval(updateAnalytics, 12000);

    return () => {
      mounted = false;
      clearInterval(dashboardTimer);
      clearInterval(analyticsTimer);
      controller?.abort();
    };
  }, [demoMode]);

  function demoPiece(type) {
    const at = Date.now();
    const timestamp = formatTime(new Date(at));
    setDemo((current) => {
      const metal = current.metal + (type === "metal" ? 1 : 0);
      const nonmetal = current.nonmetal + (type === "nonmetal" ? 1 : 0);
      const distance = current.distanceCm;
      return {
        ...current,
        metal,
        nonmetal,
        last: type,
        events: [...current.events, { at, material: type }].slice(-1000),
        logs: [
          {
            id: Date.now(),
            timestamp,
            type: "DEMO",
            message: `Peça ${type === "metal" ? "metálica" : "não metálica"} simulada na esteira.`,
          },
          ...current.logs,
        ].slice(0, 20),
        history: [
          ...current.history,
          {
            time: timestamp,
            total: metal + nonmetal,
            metallic: metal,
            nonMetallic: nonmetal,
            tankLevel: Math.round(clamp(((50 - distance) / 45) * 100, 0, 100)),
          },
        ].slice(-12),
      };
    });
    queuePiece(type, "demo");
  }

  function resetDemo() {
    setDemo({
      metal: 0,
      nonmetal: 0,
      distanceCm: 50,
      last: null,
      logs: [],
      history: [],
      events: [],
      tankSamples: [0],
    });
    setAnimationQueue([]);
    setActivePiece(null);
  }

  const shownMetallicCount = demoMode ? demo.metal : metallicCount;
  const shownNonMetallicCount = demoMode ? demo.nonmetal : nonMetallicCount;
  // No modo demonstracao, a posicao da peca vira uma DISTANCIA FRONTAL
  // ilustrativa (sem substituir os dados reais do AL1300).
  // Inicio: 50 cm; proximo ao X01: 5 cm. Sem peca, volta ao slider didatico.
  const demoApproachCm = virtualDistanceCm(
    demoMode ? activePiece : null,
    demo.distanceCm,
  );
  const shownTankLevel = demoMode
    ? virtualTankPercent(demoApproachCm)
    : tankLevel;
  const shownDistanceCm = demoMode ? demoApproachCm : distanceCm;
  const shownDistanceHex = demoMode ? "SIMULADO" : distanceHex;
  const shownDistanceStatus = demoMode ? "SIMULAÇÃO" : distanceStatus;
  const shownLastItemType = demoMode ? demo.last : lastItemType;
  const shownLogs = demoMode ? demo.logs : logs;
  const shownHistory = demoMode ? demo.history : historyData;
  const shownConveyorRunning = demoMode ? true : isConveyorRunning;
  const demoAnalytics = useMemo(() => calculateDemoAnalytics(demo), [demo]);
  const shownAnalytics = demoMode ? demoAnalytics : analytics;

  const totalPieces = shownMetallicCount + shownNonMetallicCount;
  const connectionMode = demoMode || !apiOnline ? "SIM" : "ONLINE";
  const pieceTypeLabel =
    shownLastItemType === "metal"
      ? "Metálica"
      : shownLastItemType === "nonmetal"
        ? "Não metálica"
        : "Nenhuma";

  const pieData = useMemo(
    () => [
      { name: "Metálicas", value: shownMetallicCount, color: "#22d3ee" },
      { name: "Não metálicas", value: shownNonMetallicCount, color: "#a855f7" },
    ],
    [shownMetallicCount, shownNonMetallicCount],
  );

  const chartData = useMemo(() => {
    if (shownHistory?.length) return shownHistory;
    return [
      {
        time: "—",
        total: totalPieces,
        metallic: shownMetallicCount,
        nonMetallic: shownNonMetallicCount,
        tankLevel: shownTankLevel ?? 0,
      },
    ];
  }, [
    shownHistory,
    totalPieces,
    shownMetallicCount,
    shownNonMetallicCount,
    shownTankLevel,
  ]);

  const tabs = [
    { id: "overview", label: "Visão Geral", icon: Activity },
    { id: "conveyor", label: "Esteira & Sensores", icon: Radio },
    { id: "tank", label: "Nível do Tanque", icon: Droplets },
    { id: "ra", label: "RA", icon: Layers3 },
    { id: "analytics", label: "Ciência de Dados", icon: BarChart3 },
  ];

  // No modo conectado, pulsos físicos podem ser mais curtos que o polling
  // de 2 s. A animação é reconstruída de contagens da API, não é telemetria
  // de posição. Quando não há peça animada, o indicador usa a leitura HTTP.
  const animatedSensors = visualSensorState(activePiece);
  const sensorLive = {
    x03:
      animatedSensors.x03 ||
      (!demoMode && activeSensorDetected === "inductive"),
    x02:
      animatedSensors.x02 ||
      (!demoMode &&
        (activeSensorDetected === "capacitive" ||
          activeSensorDetected === "inductive")),
    x01:
      animatedSensors.x01 ||
      (!demoMode && distanceStatus === "OK" && distanceCm != null),
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-400 selection:text-slate-950">
      <header className="sticky top-0 z-40 border-b border-cyan-500/20 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 flex items-center justify-center text-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.25)]">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300">
                METALTECH 4.0
              </h1>
              <p className="text-sm text-slate-400">
                Plataforma Inteligente de Monitoramento Industrial
              </p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <nav className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id === "ra")
                        window.history.replaceState(null, "", "#ra");
                      else if (window.location.hash === "#ra")
                        window.history.replaceState(
                          null,
                          "",
                          window.location.pathname + window.location.search,
                        );
                    }}
                    className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all flex items-center gap-2 ${active ? "border-cyan-400 bg-cyan-500/15 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.22)]" : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-600"}`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
            <button
              onClick={() => setDemoMode((current) => !current)}
              className={`px-4 py-2 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-all ${demoMode ? "border-amber-400 bg-amber-500/15 text-amber-200" : "border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-400"}`}
            >
              <FlaskConical className="w-4 h-4" />
              {demoMode ? "Sair da demonstração" : "Modo demonstração"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <section
          className={`rounded-2xl border px-4 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 ${demoMode ? "border-amber-500/30 bg-amber-950/20 text-amber-200" : apiOnline ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-200" : "border-red-500/30 bg-red-950/20 text-red-200"}`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {demoMode ? (
              <FlaskConical className="w-4 h-4" />
            ) : apiOnline ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
            {demoMode
              ? "Demonstração ativa: a interface roda com dados simulados e animações locais."
              : apiOnline
                ? `API conectada com sucesso · última atualização ${lastSync}`
                : `API indisponível (${apiError}). O painel pode ser demonstrado no modo simulação.`}
          </div>
          <div className="text-xs text-slate-300/85 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Sensores lidos: X01 (distância), X02 (capacitivo), X03 (indutivo)
          </div>
        </section>

        {activeTab === "overview" && (
          <>
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              <StatCard
                icon={Box}
                title="Total de peças"
                value={totalPieces}
                subtitle="Contagem acumulada de classificação"
                accent="cyan"
              />
              <StatCard
                icon={Zap}
                title="Peças metálicas"
                value={shownMetallicCount}
                subtitle="Classificação validada via X03"
                accent="emerald"
              />
              <StatCard
                icon={Radio}
                title="Não metálicas"
                value={shownNonMetallicCount}
                subtitle="Presença sem resposta indutiva"
                accent="violet"
              />
              <StatCard
                icon={Droplets}
                title="Nível do tanque"
                value={shownTankLevel == null ? "—" : `${shownTankLevel}%`}
                subtitle={
                  shownDistanceCm == null
                    ? "Sem leitura de X01"
                    : `Distância atual: ${shownDistanceCm.toFixed(1)} cm`
                }
                accent="amber"
              />
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] gap-6">
              <div className={`${cardClass("cyan")} p-5`}>
                <div className="flex items-center justify-between mb-4 gap-4">
                  <div>
                    <h2 className="text-lg font-black flex items-center gap-2">
                      <Activity className="w-5 h-5 text-cyan-300" /> Fluxo
                      temporal de produção
                    </h2>
                    <p className="text-sm text-slate-400">
                      Histórico resumido vindo da API ou gerado no modo
                      demonstração.
                    </p>
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient
                          id="fillTotal"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#22d3ee"
                            stopOpacity={0.35}
                          />
                          <stop
                            offset="95%"
                            stopColor="#22d3ee"
                            stopOpacity={0.03}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                      <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#020617",
                          border: "1px solid #334155",
                          borderRadius: "16px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#22d3ee"
                        fill="url(#fillTotal)"
                        strokeWidth={2.5}
                      />
                      <Line
                        type="monotone"
                        dataKey="metallic"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="nonMetallic"
                        stroke="#a855f7"
                        strokeWidth={2}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-6">
                <div className={`${cardClass("violet")} p-5`}>
                  <h2 className="text-lg font-black flex items-center gap-2">
                    <Database className="w-5 h-5 text-violet-300" /> Logs de
                    eventos
                  </h2>
                  <div className="mt-4 space-y-2 max-h-80 overflow-auto pr-1">
                    {shownLogs.length ? (
                      shownLogs.map((log, index) => (
                        <div
                          key={log.id ?? `${log.timestamp}-${index}`}
                          className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-3"
                        >
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="font-semibold text-slate-200">
                              {log.type ?? "INFO"}
                            </span>
                            <span className="text-slate-500">
                              {log.timestamp ?? log.time ?? "—"}
                            </span>
                          </div>
                          <div className="text-sm text-slate-300 mt-1">
                            {log.message ?? "Evento sem mensagem."}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500 text-center">
                        Ainda não há eventos disponíveis.
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className={`${cardClass("emerald")} p-5 grid grid-cols-2 gap-4`}
                >
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Status da esteira
                    </div>
                    <div className="text-lg font-bold mt-2 text-slate-100">
                      {shownConveyorRunning == null
                        ? "Indisponível"
                        : shownConveyorRunning
                          ? "Em operação"
                          : "Parada"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Último item
                    </div>
                    <div className="text-lg font-bold mt-2 text-slate-100">
                      {pieceTypeLabel}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === "conveyor" && (
          <section className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-6">
            <div className={`${cardClass("cyan")} p-5 space-y-4`}>
              <h2 className="text-lg font-black flex items-center gap-2">
                <Radio className="w-5 h-5 text-cyan-300" /> Sensores da Esteira
              </h2>
              <SensorPill
                title="Sensor indutivo"
                code="X03"
                description="Responsável por identificar material metálico durante a passagem da peça."
                active={sensorLive.x03}
                accent="cyan"
                extra="Porta IO-Link: classificação de metálicas"
              />
              <SensorPill
                title="Sensor capacitivo"
                code="X02"
                description="Detecta a presença de peça independentemente do material."
                active={sensorLive.x02}
                accent="violet"
                extra="Porta IO-Link: presença geral"
              />
              <SensorPill
                title="Sensor de distância"
                code="X01"
                description="Usado como nível virtual do reservatório, a partir da conversão da leitura hexadecimal."
                active={sensorLive.x01}
                accent="amber"
                extra={`Hex: ${shownDistanceHex ?? "—"} · ${shownDistanceStatus}`}
              />
            </div>

            <div className={`${cardClass("emerald")} p-5`}>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-black flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-emerald-300" /> Histórico de
                    leitura
                  </h2>
                  <p className="text-sm text-slate-400">
                    Curvas principais do processo observadas pelo dashboard.
                  </p>
                </div>
              </div>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "#020617",
                        border: "1px solid #334155",
                        borderRadius: "16px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="metallic"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={false}
                      name="Metálicas"
                    />
                    <Line
                      type="monotone"
                      dataKey="nonMetallic"
                      stroke="#a855f7"
                      strokeWidth={2.5}
                      dot={false}
                      name="Não metálicas"
                    />
                    <Line
                      type="monotone"
                      dataKey="tankLevel"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      name="Nível virtual (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {activeTab === "tank" && (
          <section className="grid grid-cols-1 xl:grid-cols-[minmax(340px,0.55fr)_minmax(0,1fr)] gap-6">
            <div
              className={`${cardClass("amber")} p-6 flex flex-col items-center justify-center`}
            >
              <div className="text-sm uppercase tracking-[0.2em] text-slate-400 mb-6">
                Reservatório virtual via X01
              </div>
              <div className="w-52 h-80 rounded-[32px] border-2 border-slate-700 bg-slate-950 p-3 flex flex-col justify-end overflow-hidden shadow-[inset_0_0_24px_rgba(0,0,0,0.8)]">
                <div
                  className={`w-full rounded-[24px] transition-all duration-500 flex items-center justify-center font-black text-2xl ${shownTankLevel != null && shownTankLevel > 85 ? "bg-gradient-to-t from-red-600 to-orange-500 text-white" : "bg-gradient-to-t from-emerald-500 to-cyan-400 text-slate-950"}`}
                  style={{ height: `${shownTankLevel ?? 0}%` }}
                >
                  {shownTankLevel == null ? "—" : `${shownTankLevel}%`}
                </div>
              </div>
              <div className="mt-6 text-sm text-slate-400 text-center max-w-sm">
                Conversão adotada na demonstração:{" "}
                <span className="text-slate-200 font-semibold">
                  5 cm = cheio
                </span>{" "}
                e{" "}
                <span className="text-slate-200 font-semibold">
                  50 cm = vazio
                </span>
                , com interpolação linear.
              </div>
            </div>

            <div className={`${cardClass("cyan")} p-6 space-y-4`}>
              <h2 className="text-lg font-black flex items-center gap-2">
                <Droplets className="w-5 h-5 text-amber-300" /> Parâmetros do
                sensor de distância
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="text-slate-500 text-xs uppercase tracking-[0.16em]">
                    Distância atual
                  </div>
                  <div className="text-2xl font-black mt-2 text-slate-100">
                    {shownDistanceCm == null
                      ? "—"
                      : `${shownDistanceCm.toFixed(1)} cm`}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="text-slate-500 text-xs uppercase tracking-[0.16em]">
                    Leitura hexadecimal
                  </div>
                  <div className="text-2xl font-black mt-2 text-slate-100">
                    {shownDistanceHex ?? "—"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="text-slate-500 text-xs uppercase tracking-[0.16em]">
                    Status de leitura
                  </div>
                  <div className="text-2xl font-black mt-2 text-slate-100">
                    {shownDistanceStatus}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="text-slate-500 text-xs uppercase tracking-[0.16em]">
                    Alerta
                  </div>
                  <div
                    className={`text-2xl font-black mt-2 ${shownTankLevel != null && shownTankLevel > 85 ? "text-red-400" : "text-emerald-400"}`}
                  >
                    {shownTankLevel == null
                      ? "Sem leitura"
                      : shownTankLevel > 85
                        ? "Crítico"
                        : "Normal"}
                  </div>
                </div>
              </div>
              {demoMode ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-4">
                  <div className="text-sm text-amber-200 font-semibold mb-2">
                    Ajuste didático do nível virtual
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={demo.distanceCm}
                    onChange={(event) =>
                      setDemo((current) => {
                        const nextDistance = Number(event.target.value);
                        const nextLevel = Math.round(
                          clamp(((50 - nextDistance) / 45) * 100, 0, 100),
                        );
                        return {
                          ...current,
                          distanceCm: nextDistance,
                          tankSamples: [
                            ...current.tankSamples,
                            nextLevel,
                          ].slice(-250),
                          history: [
                            ...current.history,
                            {
                              time: formatTime(),
                              total: current.metal + current.nonmetal,
                              metallic: current.metal,
                              nonMetallic: current.nonmetal,
                              tankLevel: nextLevel,
                            },
                          ].slice(-12),
                        };
                      })
                    }
                    className="w-full"
                  />
                  <div className="text-xs text-slate-400 mt-2">
                    Use o slider para demonstrar a variação do reservatório sem
                    esteira física.
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        )}

        {activeTab === "ra" && (
          <Conveyor3D
            activePiece={activePiece}
            pulses={sensorLive}
            connectionMode={connectionMode}
            apiOnline={apiOnline}
            pieceTypeLabel={pieceTypeLabel}
            tankLevel={shownTankLevel}
            distanceCm={shownDistanceCm}
            demoMode={demoMode}
            onDemoMetal={() => demoPiece("metal")}
            onDemoNonMetal={() => demoPiece("nonmetal")}
            onDemoReset={resetDemo}
          />
        )}

        {activeTab === "analytics" && (
          <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-6">
            <div className={`${cardClass("violet")} p-5`}>
              <h2 className="text-lg font-black flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-violet-300" /> Proporção de
                classificação
              </h2>
              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={110}
                      paddingAngle={3}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#020617",
                        border: "1px solid #334155",
                        borderRadius: "16px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm mt-4">
                {pieData.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3"
                  >
                    <div className="text-slate-400 text-xs uppercase tracking-[0.16em]">
                      {item.name}
                    </div>
                    <div className="text-2xl font-black mt-1">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${cardClass("cyan")} p-5 space-y-4`}>
              <h2 className="text-lg font-black flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-300" /> Métricas de
                ciência de dados
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="text-slate-500 text-xs uppercase tracking-[0.16em]">
                    Média de produção/min
                  </div>
                  <div className="text-2xl font-black mt-2 text-slate-100">
                    {shownAnalytics?.piecesPerMinuteMean != null
                      ? shownAnalytics.piecesPerMinuteMean.toFixed(2)
                      : "—"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="text-slate-500 text-xs uppercase tracking-[0.16em]">
                    Desvio padrão
                  </div>
                  <div className="text-2xl font-black mt-2 text-slate-100">
                    {shownAnalytics?.piecesPerMinuteStdDev != null
                      ? shownAnalytics.piecesPerMinuteStdDev.toFixed(2)
                      : "—"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="text-slate-500 text-xs uppercase tracking-[0.16em]">
                    Mediana do reservatório
                  </div>
                  <div className="text-2xl font-black mt-2 text-slate-100">
                    {shownAnalytics?.tankMedian != null
                      ? `${shownAnalytics.tankMedian.toFixed(1)}%`
                      : "—"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="text-slate-500 text-xs uppercase tracking-[0.16em]">
                    Outliers detectados
                  </div>
                  <div className="text-2xl font-black mt-2 text-slate-100">
                    {shownAnalytics?.tankOutliers != null
                      ? shownAnalytics.tankOutliers
                      : "—"}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-400 leading-relaxed">
                {demoMode
                  ? "SIMULAÇÃO — métricas recalculadas no navegador a cada peça e ajuste de distância. Média e desvio padrão usam minutos com produção; a mediana usa as amostras do nível virtual e outliers seguem 1,5 × IQR (mínimo de quatro amostras). Nenhum dado simulado é enviado à API."
                  : "DADOS REAIS — métricas retornadas pela API de Ciência de Dados; indisponibilidade é indicada por um traço."}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
