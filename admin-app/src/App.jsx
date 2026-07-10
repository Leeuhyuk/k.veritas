import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
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
    subtitle: '실제 생산 제품을 사진과 함께 등록·수정합니다.',
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

/** React Router basename (로컬 /admin · GH /k.veritas/admin) */
function adminBasename() {
  if (typeof window === 'undefined') return '/admin';
  const path = window.location.pathname || '';
  if (path.indexOf('/k.veritas') === 0) return '/k.veritas/admin';
  return '/admin';
}

function siteHomeHref() {
  if (typeof window === 'undefined') return '/';
  const path = window.location.pathname || '';
  if (path.indexOf('/k.veritas') === 0) return '/k.veritas/';
  return '/';
}

function StaticAdminNotice() {
  const home = siteHomeHref();
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
      <div className="form" style={{ maxWidth: 560, margin: '48px auto', gap: 16 }}>
        <h1 className="section-title" style={{ fontSize: 28, textAlign: 'left', marginBottom: 8 }}>
          관리자는 서버가 필요합니다
        </h1>
        <p style={{ color: 'var(--color-bark-brown)', lineHeight: 1.6, margin: 0 }}>
          지금 보시는 주소는 <strong>GitHub Pages(정적 호스팅)</strong>입니다.
          로그인·제품 등록·문의 확인 같은 관리 기능은 Node 서버의 API가 있어야 동작합니다.
        </p>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20, color: 'var(--color-bark-brown)', lineHeight: 1.7 }}>
          <li>
            로컬: 프로젝트 폴더에서 <code>npm start</code> 후{' '}
            <a href="http://localhost:3000/admin/">http://localhost:3000/admin/</a>
          </li>
          <li>
            공개 사이트(목록·사진)는 Pages에서 볼 수 있습니다 →{' '}
            <a href={home}>사이트로 이동</a>
          </li>
          <li>
            전체 기능을 인터넷에 올리려면 VPS 등 <strong>Node 호스팅</strong>이 필요합니다 (
            <code>docs/HOSTING.md</code>)
          </li>
        </ul>
      </div>
    </div>
  );
}

function AuthGate() {
  const [auth, setAuth] = useState(null);
  const navigate = useNavigate();
  const home = siteHomeHref();

  useEffect(() => {
    if (isStaticHost()) {
      setAuth(false);
      return;
    }
    adminApi
      .me()
      .then((d) => setAuth(!!d.admin))
      .catch(() => setAuth(false));
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

  if (isStaticHost()) {
    return <StaticAdminNotice />;
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
  const basename = adminBasename();
  return (
    <BrowserRouter basename={basename}>
      <AuthGate />
    </BrowserRouter>
  );
}
