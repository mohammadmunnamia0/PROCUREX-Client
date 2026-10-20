import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { FiMenu } from "react-icons/fi";
import Sidebar, { BrandMark } from "./Sidebar";
import SaveStatus from "./SaveStatus";
import StorageBanner from "./StorageBanner";

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="app-layout">
      <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}>
        Skip to content
      </a>
      <header className="topbar">
        <button type="button" className="btn-icon topbar-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen}>
          <FiMenu />
        </button>
        <span className="topbar-brand">
          <BrandMark /> PROCUREX
        </span>
        <SaveStatus />
      </header>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
      <main className="main-content" id="main" tabIndex={-1}>
        <div className="main-inner">
          <StorageBanner />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
