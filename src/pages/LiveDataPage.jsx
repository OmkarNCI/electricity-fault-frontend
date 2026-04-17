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
  getAreaLiveData,
  getPoleHistory,
  getSimulationStatus,
  changeScenario,
  uploadLogFile,
} from "../services/api";
import { subscribeToTopic, buildAreaTopics } from "../services/iot";

function LiveDataPage() {
  const { selectedArea } = useOutletContext();

  const [areaLive, setAreaLive] = useState(null);
  const [poleId, setPoleId] = useState("");
  const [poleHistory, setPoleHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedScenario, setSelectedScenario] = useState("normal");
  const [currentScenario, setCurrentScenario] = useState("normal");
  const [scenarioMessage, setScenarioMessage] = useState("");
  const [scenarioLoading, setScenarioLoading] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");

  const [iotStatus, setIotStatus] = useState("Disconnected");
  const [lastLiveMessage, setLastLiveMessage] = useState(null);

  const availablePoles = useMemo(() => {
    if (!areaLive) return [];
    if (Array.isArray(areaLive.poles)) return areaLive.poles;
    if (Array.isArray(areaLive.pole_ids)) return areaLive.pole_ids;
    if (Array.isArray(areaLive.available_poles)) return areaLive.available_poles;
    if (
      areaLive.latest_pole_events &&
      typeof areaLive.latest_pole_events === "object"
    ) {
      return Object.keys(areaLive.latest_pole_events);
    }
    return [];
  }, [areaLive]);

  useEffect(() => {
  if (!selectedArea) return;

  const fetchLive = async () => {
    try {
      const res = await getAreaLiveData(selectedArea);
      setAreaLive(res.data);

      if (poleId && res.data.latest_pole_events?.[poleId]) {
        setPoleHistory((prev) => [
          {
            ...res.data.latest_pole_events[poleId],
            timestamp: new Date().toISOString(),
          },
          ...(prev || []),
        ].slice(0, 100));
      }

      setIotStatus("Live (Polling)");
    } catch (err) {
      setIotStatus("Disconnected");
    }
  };

  fetchLive();
  const interval = setInterval(fetchLive, 3000); // every 3 sec

  return () => clearInterval(interval);
}, [selectedArea, poleId]);

  useEffect(() => {
    if (!poleId) {
      setPoleHistory([]);
      return;
    }

    let cancelled = false;

    const fetchPoleHistoryData = async () => {
      try {
        const res = await getPoleHistory(poleId);
        if (cancelled) return;

        const history = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.history)
          ? res.data.history
          : [];

        setPoleHistory(history);
        setError("");
      } catch (err) {
        if (!cancelled) {
          setPoleHistory([]);
          setError("Failed to load pole history");
        }
      }
    };

    fetchPoleHistoryData();

    return () => {
      cancelled = true;
    };
  }, [poleId]);

  useEffect(() => {
    let cancelled = false;

    const fetchScenarioStatusData = async () => {
      try {
        const res = await getSimulationStatus();
        if (!cancelled) {
          setCurrentScenario(res.data.current_scenario || "normal");
        }
      } catch (err) {
        if (!cancelled) {
          setCurrentScenario("unknown");
        }
      }
    };

    fetchScenarioStatusData();
    const interval = setInterval(fetchScenarioStatusData, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!selectedArea) return;

    const subscriptions = [];
    setIotStatus("Connecting...");

    const topics = buildAreaTopics(selectedArea, poleId);

    topics.forEach((topic) => {
      const sub = subscribeToTopic(
        topic,
        (message) => {
          setIotStatus("Connected");
          setLastLiveMessage({ topic, message });

          if (topic === `area/${selectedArea}/summaries`) {
            setAreaLive((prev) => mergeAreaSummary(prev, message));
          }

          if (topic === `area/${selectedArea}/aggregates/${poleId}`) {
            setAreaLive((prev) => mergePoleAggregate(prev, poleId, message));
            setPoleHistory((prev) => prependLiveHistory(prev, message));
          }

          if (topic === `area/${selectedArea}/alerts/${poleId}`) {
            setPoleHistory((prev) => prependLiveHistory(prev, message));
          }
        },
        () => {
          setIotStatus("Connection error");
        }
      );

      subscriptions.push(sub);
    });

    return () => {
      subscriptions.forEach((sub) => sub?.unsubscribe?.());
      setIotStatus("Disconnected");
    };
  }, [selectedArea, poleId]);

  const handleScenarioChange = async () => {
    setScenarioLoading(true);
    setScenarioMessage("");

    try {
      const res = await changeScenario(selectedScenario);
      setScenarioMessage(res.data?.message || `Scenario changed to ${selectedScenario}`);
      setCurrentScenario(selectedScenario);
    } catch (err) {
      setScenarioMessage("Failed to change scenario");
    } finally {
      setScenarioLoading(false);
    }
  };

  const handleFileSelection = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setUploadMessage("");
    setUploadError("");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select a log file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setUploadLoading(true);
    setUploadMessage("");
    setUploadError("");

    try {
      const res = await uploadLogFile(formData);
      setUploadMessage(`Uploaded successfully: ${res.data.key}`);
      setSelectedFile(null);
    } catch (err) {
      setUploadError(
        err?.response?.data?.detail || "Upload failed. Please try again."
      );
    } finally {
      setUploadLoading(false);
    }
  };

  const chartData = useMemo(() => {
    return (poleHistory || []).map((item, index) => ({
      index: index + 1,
      time: formatTime(item.timestamp),
      voltage_v: numberOrNull(item.voltage_v ?? item.voltage),
      current_a: numberOrNull(item.current_a ?? item.current),
      tilt_deg: numberOrNull(item.tilt_deg),
      temperature_c: numberOrNull(item.temperature_c),
      smart_meter_kw: numberOrNull(item.smart_meter_kw),
      line_fault_indicator: numberOrNull(item.line_fault_indicator),
      power_status: numberOrNull(item.power_status),
    }));
  }, [poleHistory]);

  if (loading) return <Loader text="Loading live sensor data..." />;

  return (
    <div className="live-page">
      <div className="stats-grid">
        <div className="card">
          <h3>Selected Area</h3>
          <p className="stat-value">{selectedArea || "-"}</p>
        </div>

        <div className="card">
          <h3>Selected Pole</h3>
          <p className="stat-value">{poleId || "-"}</p>
        </div>

        <div className="card">
          <h3>Current Scenario</h3>
          <p className="stat-value">{currentScenario || "-"}</p>
        </div>

        <div className="card">
          <h3>AWS IoT Status</h3>
          <p className="stat-value">{iotStatus}</p>
        </div>
      </div>

      <div className="card">
        <h3>Scenario Control</h3>
        <div className="search-form">
          <select
            className="area-select"
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value)}
          >
            <option value="normal">normal</option>
            <option value="load_shedding">load_shedding</option>
            <option value="double_pole_failure">double_pole_failure</option>
          </select>

          <button onClick={handleScenarioChange} disabled={scenarioLoading}>
            {scenarioLoading ? "Updating..." : "Change Scenario"}
          </button>
        </div>

        {scenarioMessage && <p className="success-text">{scenarioMessage}</p>}
      </div>

      <div className="card">
        <h3>Upload Log File to S3</h3>

        <div className="upload-box">
          <input
            type="file"
            accept=".log,.txt,.csv,.json"
            onChange={handleFileSelection}
          />

          <button onClick={handleUpload} disabled={uploadLoading}>
            {uploadLoading ? "Uploading..." : "Upload Log"}
          </button>
        </div>

        {selectedFile && (
          <p className="file-info">
            Selected file: <strong>{selectedFile.name}</strong>
          </p>
        )}

        {uploadMessage && <p className="success-text">{uploadMessage}</p>}
        {uploadError && <p className="error-text">{uploadError}</p>}
      </div>

      <div className="card">
        <h3>Live Controls</h3>

        {error && <p className="error-text">{error}</p>}

        <div className="search-form">
          <select
            className="area-select"
            value={poleId}
            onChange={(e) => setPoleId(e.target.value)}
          >
            {availablePoles.length === 0 ? (
              <option value="">No poles available</option>
            ) : (
              availablePoles.map((pole) => (
                <option key={pole} value={pole}>
                  {pole}
                </option>
              ))
            )}
          </select>
        </div>

        {lastLiveMessage && (
          <p className="file-info">
            Live topic: <strong>{lastLiveMessage.topic}</strong>
          </p>
        )}
      </div>

      <MetricChart
        title="Voltage Trend (V)"
        data={chartData}
        dataKey="voltage_v"
        color="#2563eb"
      />

      <MetricChart
        title="Current Trend (A)"
        data={chartData}
        dataKey="current_a"
        color="#dc2626"
      />

      <MetricChart
        title="Tilt Trend (deg)"
        data={chartData}
        dataKey="tilt_deg"
        color="#7c3aed"
      />

      <MetricChart
        title="Temperature Trend (°C)"
        data={chartData}
        dataKey="temperature_c"
        color="#ea580c"
      />

      <MetricChart
        title="Smart Meter Power (kW)"
        data={chartData}
        dataKey="smart_meter_kw"
        color="#059669"
      />
    </div>
  );
}

function MetricChart({ title, data, dataKey, color }) {
  return (
    <div className="card chart-card">
      <h3>{title}</h3>

      {!data || data.length === 0 ? (
        <p>No chart data available.</p>
      ) : (
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                dot={false}
                name={dataKey}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function mergeAreaSummary(prev, incoming) {
  if (!prev) return incoming;
  return {
    ...prev,
    ...incoming,
  };
}

function mergePoleAggregate(prev, poleId, incoming) {
  if (!prev) return prev;

  const updated = { ...prev };

  if (updated.latest_pole_events && typeof updated.latest_pole_events === "object") {
    updated.latest_pole_events = {
      ...updated.latest_pole_events,
      [poleId]: {
        ...(updated.latest_pole_events[poleId] || {}),
        ...incoming,
      },
    };
  }

  return updated;
}

function prependLiveHistory(prev, incoming) {
  const next = [
    {
      ...incoming,
      timestamp: incoming.timestamp || new Date().toISOString(),
    },
    ...(prev || []),
  ];

  return next.slice(0, 100);
}

function formatTime(timestamp) {
  if (!timestamp) return "-";
  try {
    return new Date(timestamp).toLocaleTimeString();
  } catch {
    return timestamp;
  }
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

export default LiveDataPage;