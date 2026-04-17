import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ✅ Get all areas (overview/dashboard)
export const getAreas = () => {
  return axios.get(`${API_BASE_URL}/areas`);
};

// ✅ Get LIVE area data
export const getAreaLiveData = (areaId) => {
  return axios.get(`${API_BASE_URL}/live/areas/${areaId}`);
};

// ✅ Get pole history
export const getPoleHistory = (poleId) => {
  return axios.get(`${API_BASE_URL}/live/poles/${poleId}/history`);
};

// ✅ Scenario control
export const changeScenario = (scenario) => {
  return axios.post(`${API_BASE_URL}/simulation/scenario/${scenario}`);
};

// ✅ Upload logs
export const uploadLogFile = (formData) => {
  return axios.post(`${API_BASE_URL}/upload-log`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};