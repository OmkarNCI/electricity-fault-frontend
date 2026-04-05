import { useState } from "react";
import api from "../services/api";
import AlertsTable from "../components/AlertsTable";
import Loader from "../components/Loader";

function PoleSearchPage() {
  const [poleId, setPoleId] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!poleId.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const res = await api.get(`/poles/${poleId.trim()}/alerts?limit=20`);
      setAlerts(res.data || []);
    } catch (error) {
      console.error("Error loading pole alerts", error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="card">
        <h3>Search Pole Alerts</h3>
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Enter pole ID"
            value={poleId}
            onChange={(e) => setPoleId(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>
      </div>

      <br />

      {loading && <Loader text="Searching pole alerts..." />}

      {!loading && searched && <AlertsTable alerts={alerts} />}
    </div>
  );
}

export default PoleSearchPage;