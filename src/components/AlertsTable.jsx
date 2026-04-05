function AlertsTable({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="card">
        <h3>Alerts</h3>
        <p>No alerts found.</p>
      </div>
    );
  }

  const columns = Object.keys(alerts[0]);

  return (
    <div className="card">
      <h3>Alerts</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert, index) => (
              <tr key={index}>
                {columns.map((col) => (
                  <td key={col}>{String(alert[col] ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AlertsTable;