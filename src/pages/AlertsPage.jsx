import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../services/api";
import AlertsTable from "../components/AlertsTable";
import Loader from "../components/Loader";

function AlertsPage() {
  const { selectedArea } = useOutletContext();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedArea) return;
    fetchAlerts();
  }, [selectedArea]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/areas/${selectedArea}/alerts?limit=20`);
      setAlerts(res.data || []);
    } catch (error) {
      console.error("Error loading alerts", error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedArea) return <Loader text="Loading alerts..." />;
  if (loading) return <Loader text="Fetching alerts..." />;

  return (
    <div>
      <AlertsTable alerts={alerts} />
    </div>
  );
}

export default AlertsPage;