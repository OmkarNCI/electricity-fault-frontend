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

import {} from "../services/api";

import { wsService } from "../services/websocket";

function LiveDataPage() {
  const { selectedArea } = useOutletContext();

  const [areaLive, setAreaLive] = useState(null);
  const [poleId, setPoleId] = useState("");
  const [poleHistory, setPoleHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedScenario, setSelectedScenario] = useState("normal");
  const [currentScenario, setCurrentScenario] = useState("normal");

  const [iotStatus, setIotStatus] = useState("Disconnected");

  // ===== Derived Poles & Filtering =====
  // Extract available poles from area data structure
  const availablePoles = useMemo(() => {
    if (!areaLive) return [];
    if (Array.isArray(areaLive.poles)) return areaLive.poles;
    if (areaLive.latest_pole_events) {
      return Object.keys(areaLive.latest_pole_events);
    }
    return [];
  }, [areaLive]);

  // ===== Initial Page Load =====
  // Load area data from API when component mounts or area changes
  useEffect(() => {
    if (!selectedArea) return;

    let cancelled = false;

    const loadInitialData = async () => {
      try {
        setLoading(true);

        // Fetch live area data from REST API
        const res = await getAreaLiveData(selectedArea);

        if (cancelled) return;

        setAreaLive(res.data);

        const poles =
          res.data?.poles ||
          Object.keys(res.data?.latest_pole_events || {});

        if (poles.length > 0 && !poleId) {
          setPoleId(poles[0]);
        }

        setIotStatus("Connected (WebSocket Ready)");
        setLoading(false);
      } catch (err) {
        console.error(err);
        setIotStatus("Disconnected");
        setLoading(false);
      }
    };

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [selectedArea]);

  // ===== WebSocket Real-Time Updates =====
  // Connect to WebSocket for streaming sensor and alert data
  useEffect(() => {
    if (!selectedArea) return;

    wsService.connect((msg) => {
      if (!msg?.type) return;

      // ===== ALERT MESSAGE =====
      if (msg.type === "ALERT") {
        console.log("🚨 ALERT:", msg.data);
      }

      // ===== SENSOR READING =====
      if (msg.type === "SENSOR") {
        const event = msg.data;

        if (event.area_id !== selectedArea) return;

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

      // ===== AREA SUMMARY =====
      if (msg.type === "SUMMARY") {
        console.log("📊 SUMMARY:", msg.data);
      }
    });

    setIotStatus("Live (WebSocket)");

    return () => {
      wsService.disconnect();
    };
  }, [selectedArea, poleId]);

  // ===== Load Pole History =====
  // Fetch historical sensor readings when pole selection changes
  useEffect(() => {
    if (!poleId) {
      setPoleHistory([]);
      return;
    }

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
        console.error("Failed to load history", err);
      }
    };

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [poleId]);

  // ===== Scenario Status Polling =====
  // Poll backend periodically to check if simulation scenario has changed
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

  // ===== Handle Scenario Changes =====
  // Send new scenario selection to backend and update UI
  const handleScenarioChange = async () => {
    try {
      await changeScenario(selectedScenario);
      setCurrentScenario(selectedScenario);
    } catch (err) {
      console.error("Scenario change failed", err);
    }
  };

  // ===== Chart Data Transformation =====
  // Prepare pole history data for chart visualization
  const chartData = useMemo(() => {
    return (poleHistory || []).map((item, index) => ({
      index: index + 1,
      time: formatTime(item.timestamp),
      voltage_v: numberOrNull(item.voltage_v ?? item.voltage),
      current_a: numberOrNull(item.current_a ?? item.current),
      tilt_deg: numberOrNull(item.tilt_deg),
      temperature_c: numberOrNull(item.temperature_c),
      smart_meter_kw: numberOrNull(item.smart_meter_kw),
    }));
  }, [poleHistory]);

  // Show loading state while fetching initial data
  if (loading) return <Loader text="Loading live sensor data..." />;

  return (
    <div className="live-page">

      {/* Display current area, pole, scenario, and IoT connection status */}
      <div className="stats-grid">
        <div className="card">
          <h3>Selected Area</h3>
          <p>{selectedArea}</p>
        </div>

        <div className="card">
          <h3>Selected Pole</h3>
          <p>{poleId}</p>
        </div>

        <div className="card">
          <h3>Scenario</h3>
          <p>{currentScenario}</p>
        </div>

        <div className="card">
          <h3>Status</h3>
          <p>{iotStatus}</p>
        </div>
      </div>

      {/* Pole selection dropdown */}
      <div className="card">
        <select
          value={poleId}
          onChange={(e) => setPoleId(e.target.value)}
        >
          {availablePoles.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* Display real-time metric charts */}
      <MetricChart title="Voltage" data={chartData} dataKey="voltage_v" />
      <MetricChart title="Current" data={chartData} dataKey="current_a" />
      <MetricChart title="Temperature" data={chartData} dataKey="temperature_c" />
    </div>
  );
}

// ===== Chart Component for Metrics =====
// Reusable line chart component for displaying sensor metrics over time
function MetricChart({ title, data, dataKey }) {
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

// ===== Utility Functions =====
// Helper functions for data transformation and formatting
function formatTime(ts) {
  return ts ? new Date(ts).toLocaleTimeString() : "-";
}

function numberOrNull(v) {
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export default LiveDataPage;