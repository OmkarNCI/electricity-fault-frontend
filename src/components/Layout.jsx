import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import api from "../services/api";

function Layout() {
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState("");
  const [health, setHealth] = useState("checking");

  useEffect(() => {
    fetchHealth();
    fetchAreas();
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await api.get("/health");
      setHealth(res.data.status || "ok");
    } catch (error) {
      setHealth("down");
    }
  };

  const fetchAreas = async () => {
    try {
      const res = await api.get("/areas");
      setAreas(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedArea(res.data[0]);
      }
    } catch (error) {
      console.error("Failed to fetch areas", error);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Header
          health={health}
          areas={areas}
          selectedArea={selectedArea}
          setSelectedArea={setSelectedArea}
        />
        <div className="page-content">
          <Outlet context={{ areas, selectedArea, setSelectedArea, health }} />
        </div>
      </div>
    </div>
  );
}

export default Layout;