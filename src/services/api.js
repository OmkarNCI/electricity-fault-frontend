import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

export const getAreaLiveData = (areaId) => api.get(`/live/areas/${areaId}`);

export const getPoleHistory = (poleId) => api.get(`/live/poles/${poleId}/history`);

export const getSimulationStatus = () => api.get("/simulation/status");

export const changeScenario = (scenario) =>
  api.post(`/simulation/scenario/${scenario}`);

export const uploadLogFile = (formData) =>
  api.post("/upload-log", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export default api;