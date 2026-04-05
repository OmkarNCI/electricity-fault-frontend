function Header({ health, areas, selectedArea, setSelectedArea }) {
  return (
    <header className="header">
      <div>
        <h1>Fog-Edge Electricity Fault Detection</h1>
        <p>Monitor summaries, alerts, and pole-level activity</p>
      </div>

      <div className="header-right">
        <div className={`health-badge ${health === "ok" ? "ok" : "down"}`}>
          Backend: {health}
        </div>

        <select
          value={selectedArea}
          onChange={(e) => setSelectedArea(e.target.value)}
          className="area-select"
        >
          {areas.length === 0 ? (
            <option value="">No Areas</option>
          ) : (
            areas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))
          )}
        </select>
      </div>
    </header>
  );
}

export default Header;