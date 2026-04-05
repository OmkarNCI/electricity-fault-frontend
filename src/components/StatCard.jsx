function StatCard({ title, value, subtitle }) {
  return (
    <div className="card stat-card">
      <h3>{title}</h3>
      <p className="stat-value">{value}</p>
      {subtitle && <p className="stat-subtitle">{subtitle}</p>}
    </div>
  );
}

export default StatCard;