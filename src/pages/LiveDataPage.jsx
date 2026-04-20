import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import Loader from "../components/Loader";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import {
  getPoleHistory,
  getSimulationStatus,
  changeScenario,
} from "../services/api";

import { wsService } from "../services/websocket";

function LiveDataPage() {
  const { selectedArea } = useOutletContext();

  const [poles, setPoles] = useState([]);
  const [poleId, setPoleId] = useState("");
  const [poleHistory, setPoleHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [iotStatus, setIotStatus] = useState("Disconnected");

  const [selectedScenario, setSelectedScenario] = useState("normal");
  const [currentScenario, setCurrentScenario] = useState("normal");

  // -----------------------------
  // INITIAL LOAD
  // -----------------------------
  useEffect(() => {
    if (!selectedArea) return;

    setLoading(false);
    setIotStatus("Connecting...");
  }, [selectedArea]);

  // -----------------------------
  // WEBSOCKET LIVE DATA
  // -----------------------------
  useEffect(() => {
    if (!selectedArea) return;

    wsService.connect((msg) => {
      if (!msg?.type) return;

      // ---------- ALERT ----------
      if (msg.type === "ALERT") {
        console.log("🚨 ALERT:", msg.data);
      }

      // ---------- SENSOR ----------
      if (msg.type === "SENSOR") {
        const event = msg.data;

        if (event.area_id !== selectedArea) return;

        // ✅ Add pole dynamically
        setPoles((prev) => {
          if (prev.includes(event.pole_id)) return prev;
          return [...prev, event.pole_id];
        });

        // ✅ Auto select pole
        setPoleId((prev) => prev || event.pole_id);

        // ✅ Update graph
        if (event.pole_id === poleId) {
          setPoleHistory((prev) => [
            {
              ...event,
              timestamp: new Date().toISOString(),
            },
            ...prev,
          ].slice(0, 100));
        }
      }

      // ---------- SUMMARY ----------
      if (msg.type === "SUMMARY") {
        console.log("📊 SUMMARY:", msg.data);
      }
    });

    setIotStatus("Live (WebSocket)");

    return () => {
      wsService.disconnect();
    };
  }, [selectedArea, poleId]);

  // -----------------------------
  // LOAD HISTORY (REST)
  // -----------------------------
  useEffect(() => {
    if (!poleId) return;

    let cancelled = false;

    const fetchHistory = async () => {
      try {
        const res = await getPoleHistory(poleId);

        if (cancelled) return;

        const history = Array.isArray(res.data)
          ? res.data
          : res.data?.history || [];

        setPoleHistory(history);
      } catch (err) {
        console.error("History fetch failed", err);
      }
    };

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [poleId]);

  // -----------------------------
  // SCENARIO POLLING
  // -----------------------------
  useEffect(() => {
    let cancelled = false;

    const fetchScenario = async () => {
      try {
        const res = await getSimulationStatus();

        if (!cancelled) {
          setCurrentScenario(res.data.current_scenario || "normal");
        }
      } catch {
        if (!cancelled) setCurrentScenario("unknown");
      }
    };

    fetchScenario();

    const interval = setInterval(fetchScenario, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // -----------------------------
  // CHANGE SCENARIO
  // -----------------------------
  const handleScenarioChange = async () => {
    try {
      await changeScenario(selectedScenario);
      setCurrentScenario(selectedScenario);
    } catch (err) {
      console.error("Scenario change failed", err);
    }
  };

  // -----------------------------
  // CHART DATA
  // -----------------------------
  const chartData = useMemo(() => {
    return (poleHistory || []).map((item, index) => ({
      index: index + 1,
      time: formatTime(item.timestamp),
      voltage_v: toNumber(item.voltage_v ?? item.voltage),
      current_a: toNumber(item.current_a ?? item.current),
      temperature_c: toNumber(item.temperature_c),
    }));
  }, [poleHistory]);

  // -----------------------------
  // UI
  // -----------------------------
  if (loading) return <Loader text="Loading live data..." />;

  return (
    <div className="live-page">

      {/* STATUS CARDS */}
      <div className="stats-grid">
        <Card title="Area" value={selectedArea} />
        <Card title="Pole" value={poleId || "-"} />
        <Card title="Scenario" value={currentScenario} />
        <Card title="Status" value={iotStatus} />
      </div>

      {/* SCENARIO CONTROL */}
      <div className="card">
        <h3>Change Scenario</h3>
        <select
          value={selectedScenario}
          onChange={(e) => setSelectedScenario(e.target.value)}
        >
          <option value="normal">Normal</option>
          <option value="fault">Fault</option>
          <option value="overload">Overload</option>
        </select>

        <button onClick={handleScenarioChange}>
          Apply
        </button>
      </div>

      {/* POLE SELECT */}
      <div className="card">
        <select
          value={poleId}
          onChange={(e) => setPoleId(e.target.value)}
        >
          {poles.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* CHARTS */}
      <Chart title="Voltage" data={chartData} dataKey="voltage_v" />
      <Chart title="Current" data={chartData} dataKey="current_a" />
      <Chart title="Temperature" data={chartData} dataKey="temperature_c" />
    </div>
  );
}

// -----------------------------
// REUSABLE COMPONENTS
// -----------------------------
function Card({ title, value }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  );
}

function Chart({ title, data, dataKey }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey={dataKey} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// -----------------------------
// HELPERS
// -----------------------------
function formatTime(ts) {
  return ts ? new Date(ts).toLocaleTimeString() : "-";
}

function toNumber(v) {
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export default LiveDataPage;