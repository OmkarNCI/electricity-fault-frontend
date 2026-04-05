function SummaryCard({ summary }) {
  if (!summary) {
    return (
      <div className="card">
        <h3>Latest Summary</h3>
        <p>No summary data available.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>Latest Summary</h3>
      <div className="summary-grid">
        {Object.entries(summary).map(([key, value]) => (
          <div key={key} className="summary-item">
            <span className="summary-key">{key}</span>
            <span className="summary-value">{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SummaryCard;