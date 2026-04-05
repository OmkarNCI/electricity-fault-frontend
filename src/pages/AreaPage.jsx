import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../services/api";
import SummaryCard from "../components/SummaryCard";
import Loader from "../components/Loader";

function AreaPage() {
  const { selectedArea } = useOutletContext();
  const [latestSummary, setLatestSummary] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedArea) return;
    fetchAreaData();
  }, [selectedArea]);

  const fetchAreaData = async () => {
    setLoading(true);
    try {
      const [latestRes, summariesRes] = await Promise.all([
        api.get(`/areas/${selectedArea}/latest-summary`),
        api.get(`/areas/${selectedArea}/summaries?limit=20`),
      ]);

      setLatestSummary(latestRes.data);
      setSummaries(summariesRes.data || []);
    } catch (error) {
      console.error("Error loading area data", error);
      setLatestSummary(null);
      setSummaries([]);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedArea) return <Loader text="Loading area..." />;
  if (loading) return <Loader text="Loading area details..." />;

  return (
    <div>
      <SummaryCard summary={latestSummary} />
      <br />
      <div className="card">
        <h3>Summary History</h3>
        {summaries.length === 0 ? (
          <p>No summaries found.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {Object.keys(summaries[0]).map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summaries.map((item, index) => (
                  <tr key={index}>
                    {Object.keys(summaries[0]).map((col) => (
                      <td key={col}>{String(item[col] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AreaPage;