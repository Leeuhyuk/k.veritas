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

function AuthGate() {
  const [auth, setAuth] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
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

  if (auth === null) {
    return (
      <div className="admin-shell">
        <header className="admin-app-nav">
          <a className="admin-app-nav__brand" href="/">
            k.veritas
            <span className="admin-app-nav__brand-sub">Admin</span>
          </a>
        </header>
        <p className="empty-note">세션 확인 중…</p>
      </div>
    );
  }

  if (!auth) {
    return (
      <div className="admin-shell">
        <header className="admin-app-nav">
          <a className="admin-app-nav__brand" href="/">
            k.veritas
            <span className="admin-app-nav__brand-sub">Admin</span>
          </a>
          <a className="admin-app-nav__ext" href="/" style={{ fontSize: 12, textDecoration: 'none', color: 'inherit' }}>
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
    <BrowserRouter basename="/admin">
      <AuthGate />
    </BrowserRouter>
  );
}
