import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../services/api";
import StatCard from "../components/StatCard";
import SummaryCard from "../components/SummaryCard";
import AlertsTable from "../components/AlertsTable";
import Loader from "../components/Loader";

function OverviewPage() {
  const { areas, selectedArea, health } = useOutletContext();
  const [latestSummary, setLatestSummary] = useState(null);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedArea) return;
    fetchOverviewData();
  }, [selectedArea]);

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      const [summaryRes, alertsRes] = await Promise.all([
        api.get(`/areas/${selectedArea}/latest-summary`),
        api.get(`/areas/${selectedArea}/alerts?limit=5`),
      ]);

      setLatestSummary(summaryRes.data);
      setRecentAlerts(alertsRes.data || []);
    } catch (error) {
      console.error("Error loading overview data", error);
      setLatestSummary(null);
      setRecentAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedArea) return <Loader text="Loading areas..." />;
  if (loading) return <Loader text="Loading overview..." />;

  return (
    <div>
      <div className="stats-grid">
        <StatCard title="Backend Health" value={health} />
        <StatCard title="Total Areas" value={areas.length} />
        <StatCard title="Selected Area" value={selectedArea} />
        <StatCard title="Recent Alerts" value={recentAlerts.length} />
      </div>
      <br />

      <SummaryCard summary={latestSummary} />
      <br />
      <AlertsTable alerts={recentAlerts} />
    </div>
  );
}

export default OverviewPage;