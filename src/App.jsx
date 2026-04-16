import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import OverviewPage from "./pages/OverviewPage";
import AreaPage from "./pages/AreaPage";
import AlertsPage from "./pages/AlertsPage";
import PoleSearchPage from "./pages/PoleSearchPage";
import LiveDataPage from "./pages/LiveDataPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<OverviewPage />} />
        <Route path="area" element={<AreaPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="pole-search" element={<PoleSearchPage />} />
        <Route path="live-data" element={<LiveDataPage />} />
      </Route>
    </Routes>
  );
}

export default App;