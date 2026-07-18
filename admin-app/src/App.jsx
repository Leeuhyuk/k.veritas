import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { adminApi } from './api/client.js';
import LoginForm from './components/LoginForm.jsx';
import AdminShell from './components/AdminShell.jsx';
import ProductsPage from './components/ProductsPage.jsx';
import NewsPage from './components/NewsPage.jsx';
import ResourcesPage from './components/ResourcesPage.jsx';
import InquiriesPage from './components/InquiriesPage.jsx';
import SettingsPage from './components/SettingsPage.jsx';

const PAGE_META = {
  products: {
    title: '제품 관리',
    subtitle: '맞춤 시험 장비를 사진과 함께 등록·수정합니다.',
  },
  news: {
    title: '공지 관리',
    subtitle: '공지사항·소식을 작성하면 공개 페이지에 바로 게시됩니다.',
  },
  resources: {
    title: '자료실 관리',
    subtitle: '카탈로그·설명서·인증서 등 자료를 등록합니다.',
  },
  inquiries: {
    title: '문의 내역',
    subtitle: '고객지원 폼으로 접수된 문의를 확인·처리합니다.',
  },
  settings: {
    title: '관리자 설정',
    subtitle: '비밀번호 등 계정 보안을 관리합니다.',
  },
};

function AuthedApp({ onLogout }) {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AdminShell {...PAGE_META.products} onLogout={onLogout}>
            <ProductsPage />
          </AdminShell>
        }
      />
      <Route
        path="/news"
        element={
          <AdminShell {...PAGE_META.news} onLogout={onLogout}>
            <NewsPage />
          </AdminShell>
        }
      />
      <Route
        path="/resources"
        element={
          <AdminShell {...PAGE_META.resources} onLogout={onLogout}>
            <ResourcesPage />
          </AdminShell>
        }
      />
      <Route
        path="/inquiries"
        element={
          <AdminShell {...PAGE_META.inquiries} onLogout={onLogout}>
            <InquiriesPage />
          </AdminShell>
        }
      />
      <Route
        path="/settings"
        element={
          <AdminShell {...PAGE_META.settings} onLogout={onLogout}>
            <SettingsPage />
          </AdminShell>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** GitHub Pages 등 API 없는 정적 호스팅 여부 */
function isStaticHost() {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname || '';
  return /\.github\.io$/i.test(h) || window.FORCE_STATIC_ADMIN === true;
}

/**
 * GitHub Pages는 /admin/news 같은 SPA 하위 경로를 파일로 찾지 못해 404가 납니다.
 * HashRouter → /admin/#/news 형태로 항상 admin/index.html 을 로드합니다.
 */
function siteHomeHref() {
  if (typeof window === 'undefined') return '/';
  const path = window.location.pathname || '';
  if (path.indexOf('/k.veritas') === 0) return '/k.veritas/';
  return '/';
}

function AuthGate() {
  const [auth, setAuth] = useState(null);
  const navigate = useNavigate();
  const home = siteHomeHref();

  useEffect(() => {
    let cancelled = false;
    // 로컬: 서버 세션 / GitHub Pages: Firebase Auth 상태
    adminApi
      .me()
      .then((d) => {
        if (!cancelled) setAuth(!!d.admin);
      })
      .catch(() => {
        if (!cancelled) setAuth(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    try {
      await adminApi.logout();
    } catch {
      /* ignore */
    }
    setAuth(false);
    navigate('/');
  }

  if (auth === null) {
    return (
      <div className="admin-shell">
        <header className="admin-app-nav">
          <a className="admin-app-nav__brand" href={home}>
            k.veritas
            <span className="admin-app-nav__brand-sub">Admin</span>
          </a>
        </header>
        <div className="list-skeleton list-skeleton--list" style={{ maxWidth: 480, margin: '40px auto' }} aria-busy="true">
          <div className="list-skeleton__news">
            <span className="list-skeleton__bar list-skeleton__bar--sm" />
            <span className="list-skeleton__bar list-skeleton__bar--lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!auth) {
    return (
      <div className="admin-shell">
        <header className="admin-app-nav">
          <a className="admin-app-nav__brand" href={home}>
            k.veritas
            <span className="admin-app-nav__brand-sub">Admin</span>
          </a>
          <a className="admin-app-nav__ext" href={home} style={{ fontSize: 12, textDecoration: 'none', color: 'inherit' }}>
            사이트로
          </a>
        </header>
        <LoginForm onSuccess={() => setAuth(true)} />
      </div>
    );
  }

  return <AuthedApp onLogout={logout} />;
}

export default function App() {
  return (
    <HashRouter>
      <AuthGate />
    </HashRouter>
  );
}
