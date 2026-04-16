import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../services/api";
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

function LiveDataPage() {
  const { selectedArea } = useOutletContext();

  const [areaLive, setAreaLive] = useState(null);
  const [poleId, setPoleId] = useState("");
  const [poleHistory, setPoleHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");

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

    if (Array.isArray(areaLive.data)) {
      return areaLive.data
        .map((item) => item?.pole_id || item?.pole || item?.id)
        .filter(Boolean);
    }

    return [];
  }, [areaLive]);

  useEffect(() => {
    if (!selectedArea) {
      setAreaLive(null);
      setPoleId("");
      setPoleHistory([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchAreaLive = async () => {
      try {
        const res = await api.get(`/live/areas/${selectedArea}`);
        if (cancelled) return;

        const data = res.data;
        setAreaLive(data);

        const poles = Array.isArray(data?.poles)
          ? data.poles
          : Array.isArray(data?.pole_ids)
          ? data.pole_ids
          : Array.isArray(data?.available_poles)
          ? data.available_poles
          : data?.latest_pole_events && typeof data.latest_pole_events === "object"
          ? Object.keys(data.latest_pole_events)
          : Array.isArray(data?.data)
          ? data.data
              .map((item) => item?.pole_id || item?.pole || item?.id)
              .filter(Boolean)
          : [];

        if (poles.length > 0) {
          setPoleId((prev) => (prev && poles.includes(prev) ? prev : poles[0]));
        } else {
          setPoleId("");
        }

        setError("");
      } catch (err) {
        if (!cancelled) {
          setAreaLive(null);
          setPoleId("");
          setError("Failed to load live area data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    fetchAreaLive();
    const interval = setInterval(fetchAreaLive, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedArea]);

  useEffect(() => {
    if (!poleId) {
      setPoleHistory([]);
      return;
    }

    let cancelled = false;

    const fetchPoleHistoryData = async () => {
      try {
        const res = await api.get(`/live/poles/${poleId}/history`);
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
    const interval = setInterval(fetchPoleHistoryData, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [poleId]);

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
      const res = await api.post("/upload-log", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
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