import { NavLink } from "react-router-dom";

function Sidebar() {
  return (
    <aside className="sidebar">
      <h2 className="logo">Power Fault Dashboard</h2>

      <nav className="nav-links">
        <NavLink to="/">Overview</NavLink>
        <NavLink to="/area">Area Details</NavLink>
        <NavLink to="/alerts">Alerts</NavLink>
        <NavLink to="/pole-search">Pole Search</NavLink>
        <NavLink to="/live-data">Live Data</NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;