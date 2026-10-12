"use client";

import Link from "next/link";
import type { AdminTab } from "@/components/admin/types";

type AdminSidebarProps = {
  activeTab: AdminTab;
  applicationCount: number;
  busy: boolean;
  email: string;
  jobCount: number;
  onSelectTab: (tab: AdminTab) => void;
  onSignOut: () => void;
};

export default function AdminSidebar({
  activeTab,
  applicationCount,
  busy,
  email,
  jobCount,
  onSelectTab,
  onSignOut,
}: AdminSidebarProps) {
  return (
    <aside className="admin-sidebar">
      <Link className="brand admin-brand" href="/">
      <span className="brand-light">Skullvi</span>
      </Link>
     
      <nav className="admin-nav" aria-label="Navigation du tableau de bord">
        <button
          className={activeTab === "applications" ? "admin-nav-item active" : "admin-nav-item"}
          onClick={() => onSelectTab("applications")}
        >
          <span className="nav-icon">▤</span> Candidatures <span className="nav-count">{applicationCount}</span>
        </button>
        <button
          className={activeTab === "jobs" ? "admin-nav-item active" : "admin-nav-item"}
          onClick={() => onSelectTab("jobs")}
        >
          <span className="nav-icon">◈</span> Mes offres <span className="nav-count">{jobCount}</span>
        </button>
      </nav>
      <div className="sidebar-bottom">
        <div className="admin-profile">
          <span className="profile-avatar">{email.slice(0, 1).toUpperCase()}</span>
          <span className="profile-info"><strong>Administrateur</strong><small>{email}</small></span>
        </div>
        <button className="sign-out-button" disabled={busy} onClick={onSignOut}>
          ↪ <span>Se déconnecter</span>
        </button>
      </div>
    </aside>
  );
}
