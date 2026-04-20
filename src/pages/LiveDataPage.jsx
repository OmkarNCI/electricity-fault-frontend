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
  Legend,
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
  const [alerts, setAlerts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState("Disconnected");

  const [selectedScenario, setSelectedScenario] = useState("normal");
  const [currentScenario, setCurrentScenario] = useState("normal");

  // ============================================
  // INITIAL LOAD
  // ============================================
  useEffect(() => {
    if (!selectedArea) return;
    setLoading(false);
  }, [selectedArea]);

  // ============================================
  // WEBSOCKET CONNECTION + FALLBACK POLLING
  // ============================================
  useEffect(() => {
    if (!selectedArea) return;

    // WebSocket message handler
    const handleWSMessage = (msg) => {
      if (!msg) return;

      // ---------- ALERT ----------
      if (msg.type === "ALERT") {
        console.log("🚨 ALERT:", msg.data);
        setAlerts((prev) => [
          {
            ...msg.data,
            id: msg.data.alert_id || `${Date.now()}-${Math.random()}`,
            receivedAt: new Date().toLocaleTimeString(),
          },
          ...prev,
        ].slice(0, 50)); // Keep last 50 alerts
      }

      // ---------- SENSOR ----------
      if (msg.type === "SENSOR" || msg.type === "sensor") {
        const event = msg.data;

        if (!event?.area_id) return;
        if (event.area_id !== selectedArea) return;

        // ✅ Add pole dynamically
        setPoles((prev) => {
          if (prev.includes(event.pole_id)) return prev;
          return [...prev, event.pole_id];
        });

        // ✅ Auto select first pole
        setPoleId((prev) => prev || event.pole_id);

        // ✅ Update graph if this pole is selected
        if (event.pole_id === poleId) {
          setPoleHistory((prev) => [
            {
              ...event,
              timestamp: event.timestamp || new Date().toISOString(),
              time: formatTime(event.timestamp),
            },
            ...prev,
          ].slice(0, 100)); // Keep last 100 readings
        }
      }

      // ---------- SUMMARY ----------
      if (msg.type === "AREA_SUMMARY" || msg.type === "summary") {
        console.log("📊 SUMMARY:", msg.data);
      }
    };

    // Status handler
    const handleWSStatus = (status) => {
      console.log("WS Status:", status);
      setWsStatus(
        status === "connected"
          ? "🟢 Live (WebSocket)"
          : status === "error"
          ? "🔴 Error (Polling)"
          : "🟠 Connecting..."
      );
    };

    // Start WebSocket
    wsService.connect(handleWSMessage, handleWSStatus);

    // Fallback: Poll for data if WebSocket fails
    const pollInterval = setInterval(() => {
      if (!wsService.isConnectedToServer()) {
        console.log("WebSocket down, using polling...");
        fetchLatestData();
      }
    }, 2000);

    return () => {
      clearInterval(pollInterval);
      wsService.disconnect();
    };
  }, [selectedArea, poleId]);

  // ============================================
  // FETCH LATEST DATA (Fallback)
  // ============================================
  const fetchLatestData = async () => {
    if (!poleId) return;

    try {
      const res = await getPoleHistory(poleId);
      const history = Array.isArray(res.data) ? res.data : res.data?.history || [];

      if (history.length > 0) {
        const latestReading = history[0];
        if (!poleHistory.some((h) => h.timestamp === latestReading.timestamp)) {
          setPoleHistory((prev) => [latestReading, ...prev].slice(0, 100));
        }
      }
    } catch (err) {
      console.error("Polling failed:", err);
    }
  };

  // ============================================
  // LOAD INITIAL HISTORY
  // ============================================
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

        setPoleHistory(
          history.map((item) => ({
            ...item,
            time: formatTime(item.timestamp),
          }))
        );
      } catch (err) {
        console.error("History fetch failed:", err);
      }
    };

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [poleId]);

  // ============================================
  // SCENARIO POLLING
  // ============================================
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

  // ============================================
  // CHANGE SCENARIO
  // ============================================
  const handleScenarioChange = async () => {
    try {
      await changeScenario(selectedScenario);
      setCurrentScenario(selectedScenario);
    } catch (err) {
      console.error("Scenario change failed:", err);
    }
  };

  // ============================================
  // CHART DATA
  // ============================================
  const chartData = useMemo(() => {
    return (poleHistory || [])
      .map((item) => ({
        time: item.time || formatTime(item.timestamp),
        voltage: toNumber(item.voltage_v ?? item.voltage),
        current: toNumber(item.current_a ?? item.current),
        temperature: toNumber(item.temperature_c ?? item.temperature),
        timestamp: item.timestamp,
      }))
      .filter((item) => item.voltage || item.current || item.temperature);
  }, [poleHistory]);

  // ============================================
  // CURRENT VALUES (Latest)
  // ============================================
  const currentValues = useMemo(() => {
    if (poleHistory.length === 0) return {};
    return {
      voltage: toNumber(poleHistory[0].voltage_v ?? poleHistory[0].voltage),
      current: toNumber(poleHistory[0].current_a ?? poleHistory[0].current),
      temperature: toNumber(poleHistory[0].temperature_c ?? poleHistory[0].temperature),
      time: poleHistory[0].time || formatTime(poleHistory[0].timestamp),
    };
  }, [poleHistory]);

  // ============================================
  // RENDER
  // ============================================
  if (loading) return <Loader text="Loading live data..." />;

  return (
    <div className="live-page" style={{ padding: "20px" }}>
      {/* ===== STATUS BAR ===== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "15px",
          marginBottom: "20px",
        }}
      >
        <Card title="Area" value={selectedArea || "-"} />
        <Card title="Pole" value={poleId || "-"} />
        <Card title="Scenario" value={currentScenario} />
        <Card
          title="Connection"
          value={wsStatus}
          color={wsStatus.includes("Live") ? "#22c55e" : "#f97316"}
        />
      </div>

      {/* ===== CURRENT VALUES ===== */}
      {Object.keys(currentValues).length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "15px",
            marginBottom: "20px",
          }}
        >
          <Card
            title="Voltage"
            value={`${currentValues.voltage?.toFixed(2) || "-"} V`}
            color="#3b82f6"
          />
          <Card
            title="Current"
            value={`${currentValues.current?.toFixed(2) || "-"} A`}
            color="#f59e0b"
          />
          <Card
            title="Temperature"
            value={`${currentValues.temperature?.toFixed(2) || "-"} °C`}
            color={currentValues.temperature > 60 ? "#ef4444" : "#10b981"}
          />
          <Card title="Last Update" value={currentValues.time} />
        </div>
      )}

      {/* ===== CONTROLS ===== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "15px",
          marginBottom: "20px",
        }}
      >
        {/* Scenario Selector */}
        <div
          style={{
            padding: "15px",
            borderRadius: "8px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
          }}
        >
          <h4 style={{ marginTop: 0 }}>Change Scenario</h4>
          <div style={{ display: "flex", gap: "10px" }}>
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              style={{
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #cbd5e1",
                flex: 1,
              }}
            >
              <option value="normal">Normal</option>
              <option value="fault">Fault</option>
              <option value="overload">Overload</option>
            </select>
            <button
              onClick={handleScenarioChange}
              style={{
                padding: "8px 16px",
                borderRadius: "4px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              Apply
            </button>
          </div>
        </div>

        {/* Pole Selector */}
        <div
          style={{
            padding: "15px",
            borderRadius: "8px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
          }}
        >
          <h4 style={{ marginTop: 0 }}>Select Pole</h4>
          <select
            value={poleId}
            onChange={(e) => setPoleId(e.target.value)}
            style={{
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #cbd5e1",
              width: "100%",
            }}
          >
            <option value="">-- Select Pole --</option>
            {poles.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ===== CHARTS ===== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        <Chart title="Voltage (V)" data={chartData} dataKey="voltage" stroke="#3b82f6" />
        <Chart title="Current (A)" data={chartData} dataKey="current" stroke="#f59e0b" />
        <Chart
          title="Temperature (°C)"
          data={chartData}
          dataKey="temperature"
          stroke="#ef4444"
        />
      </div>

      {/* ===== ALERTS SECTION ===== */}
      <div
        style={{
          padding: "15px",
          borderRadius: "8px",
          background: "#fef2f2",
          border: "2px solid #fecaca",
        }}
      >
        <h3 style={{ marginTop: 0, color: "#dc2626" }}>
          🚨 Live Alerts ({alerts.length})
        </h3>

        {alerts.length === 0 ? (
          <p style={{ color: "#64748b" }}>No alerts detected</p>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "10px",
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            {alerts.map((alert) => (
              <div
                key={alert.id}
                style={{
                  padding: "12px",
                  background: "white",
                  borderLeft: "4px solid #dc2626",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              >
                <strong>{alert.alert_type || "UNKNOWN"}</strong>
                <br />
                <span style={{ color: "#64748b", fontSize: "12px" }}>
                  Area: {alert.area_id} | Pole: {alert.pole_id} | {alert.receivedAt}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// REUSABLE COMPONENTS
// ============================================
function Card({ title, value, color = "#64748b" }) {
  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "8px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        textAlign: "center",
      }}
    >
      <h4 style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#64748b" }}>
        {title}
      </h4>
      <p
        style={{
          margin: 0,
          fontSize: "20px",
          fontWeight: "bold",
          color: color,
          wordBreak: "break-word",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function Chart({ title, data, dataKey, stroke }) {
  return (
    <div
      style={{
        padding: "15px",
        borderRadius: "8px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
      }}
    >
      <h4 style={{ marginTop: 0 }}>{title}</h4>
      {data.length === 0 ? (
        <p style={{ color: "#64748b", textAlign: "center" }}>No data yet...</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={stroke}
              dot={false}
              strokeWidth={2}
              name={title}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ============================================
// HELPERS
// ============================================
function formatTime(ts) {
  try {
    const date = new Date(ts);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "-";
  }
}

function toNumber(v) {
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export default LiveDataPage;