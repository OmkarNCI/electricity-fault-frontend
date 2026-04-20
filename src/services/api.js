import axios from "axios";

// --------------------------------
// AXIOS INSTANCE
// --------------------------------
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// --------------------------------
// GLOBAL ERROR HANDLER
// --------------------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("❌ API Error:", error?.response || error.message);
    return Promise.reject(error);
  }
);

// --------------------------------
// HEALTH
// --------------------------------
export const getHealth = () => api.get("/health");

// --------------------------------
// AREAS
// --------------------------------
export const getAreas = () => api.get("/areas");

// --------------------------------
// LIVE DATA
// --------------------------------
export const getAreaLiveData = (areaId) =>
  api.get(`/live/areas/${areaId}`);

export const getPoleHistory = (poleId) =>
  api.get(`/live/poles/${poleId}/history`);

// --------------------------------
// ALERTS
// --------------------------------
export const getAreaAlerts = (areaId, limit = 20) =>
  api.get(`/areas/${areaId}/alerts?limit=${limit}`);

export const getPoleAlerts = (poleId, limit = 20) =>
  api.get(`/poles/${poleId}/alerts?limit=${limit}`);

// --------------------------------
// SUMMARIES
// --------------------------------
export const getLatestSummary = (areaId) =>
  api.get(`/areas/${areaId}/latest-summary`);

export const getAreaSummaries = (areaId, limit = 20) =>
  api.get(`/areas/${areaId}/summaries?limit=${limit}`);

// --------------------------------
// SIMULATION
// --------------------------------
export const changeScenario = (scenario) =>
  api.post(`/simulation/scenario/${scenario}`);

export const getSimulationStatus = () =>
  api.get("/simulation/status");

// --------------------------------
// FILE UPLOAD
// --------------------------------
export const uploadLogFile = (formData) =>
  api.post("/upload-log", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

// --------------------------------
// EXPORT DEFAULT
// --------------------------------
export default api;