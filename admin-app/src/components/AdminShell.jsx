import { NavLink } from 'react-router-dom';
import { siteBase } from '../lib/staticMode.js';

const TABS = [
  { to: '/', end: true, label: '제품' },
  { to: '/news', label: '공지사항' },
  { to: '/resources', label: '자료실' },
  { to: '/inquiries', label: '문의 내역' },
  { to: '/settings', label: '관리자' },
];

export default function AdminShell({ title, subtitle, onLogout, children, extraTab }) {
  // GitHub Pages: /k.veritas/… · 로컬: /…
  const root = siteBase() || '';
  const homeHref = root ? `${root}/` : '/';
  const pagesHref = `${root}/admin-pages.html`;
  const showcaseHref = `${root}/showcase.html`;

  return (
    <div className="admin-shell">
      <header className="admin-app-nav">
        <div className="admin-app-nav__left">
          <a className="admin-app-nav__brand" href={homeHref}>
            k.veritas
            <span className="admin-app-nav__brand-sub">Admin</span>
          </a>
          <nav className="admin-app-nav__links" aria-label="관리 메뉴">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) => (isActive ? 'is-active' : undefined)}
              >
                {t.label}
              </NavLink>
            ))}
            <a href={pagesHref}>페이지 편집</a>
            <a href={showcaseHref} target="_blank" rel="noreferrer" className="admin-app-nav__ext">
              쇼케이스 ↗
            </a>
            {extraTab}
          </nav>
        </div>
        {onLogout ? (
          <button type="button" className="btn btn--ghost btn--sm admin-app-nav__logout" onClick={onLogout}>
            로그아웃
          </button>
        ) : null}
      </header>

      <main className="admin-shell__main">
        <div className="admin admin--split">
          <div className="admin__bar">
            <div className="admin__bar-text">
              <h1 className="admin__page-title">{title}</h1>
              {subtitle ? <p className="admin__page-sub">{subtitle}</p> : null}
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
