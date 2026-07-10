import { useEffect, useState } from 'react';
import { adminApi } from '../api/client.js';
import { signInWithGoogle, signOutGoogle } from '../lib/firebaseClient.js';

export default function LoginForm({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    adminApi
      .firebaseConfig()
      .then((d) => setGoogleEnabled(!!d.enabled))
      .catch(() => setGoogleEnabled(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg('');
    setLoading(true);
    try {
      await adminApi.login(password);
      setPassword('');
      onSuccess();
    } catch (err) {
      setMsg(err.message || '비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setMsg('');
    setGoogleLoading(true);
    try {
      const { idToken } = await signInWithGoogle();
      await adminApi.loginGoogle(idToken);
      try {
        await signOutGoogle();
      } catch {
        /* 세션은 서버 쿠키로 유지 */
      }
      onSuccess();
    } catch (err) {
      const code = err && err.code;
      if (code === 'auth/popup-closed-by-user') {
        setMsg('구글 로그인 창이 닫혔습니다.');
      } else if (code === 'auth/unauthorized-domain') {
        setMsg(
          '이 도메인이 Firebase 승인된 도메인에 없습니다. 콘솔 → Authentication → Settings → Authorized domains 에 localhost 를 추가하세요.'
        );
      } else {
        setMsg(err.message || '구글 로그인에 실패했습니다.');
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="admin-login-wrap">
      <div className="admin-login">
        <div className="section-head">
          <p className="microlabel">LOGIN</p>
          <h1 className="section-title">관리자 로그인</h1>
        </div>

        {googleEnabled ? (
          <div style={{ marginBottom: 20 }}>
            <button
              type="button"
              className="btn btn--primary form__submit"
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                background: '#fff',
                color: '#1f1f1f',
                border: '1px solid var(--color-lichen, #e0e5d5)',
              }}
              disabled={googleLoading || loading}
              onClick={handleGoogle}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path
                  fill="#FFC107"
                  d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 44c5.2 0 10-2 13.6-5.3l-6.3-5.2C29.2 35.2 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3.1 5.2-5.9 6.5l.1.1 6.3 5.2C37.5 41.1 44 36 44 24c0-1.3-.1-2.5-.4-3.5z"
                />
              </svg>
              {googleLoading ? '구글 로그인 중…' : 'Google 계정으로 로그인'}
            </button>
            <p
              style={{
                margin: '12px 0 0',
                textAlign: 'center',
                fontSize: 12,
                color: 'var(--color-bark-brown)',
              }}
            >
              또는 비밀번호로 로그인
            </p>
          </div>
        ) : null}

        <form className="form" onSubmit={handleSubmit}>
          <div className="form__row">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              placeholder="비밀번호"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn--primary form__submit" disabled={loading || googleLoading}>
            {loading ? '확인 중…' : '비밀번호 로그인'}
          </button>
          {msg ? <p className="admin__msg">{msg}</p> : null}
          {!googleEnabled ? (
            <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--color-bark-brown)', lineHeight: 1.5 }}>
              구글 로그인을 쓰려면 서버 <code>.env</code>에{' '}
              <code>FIREBASE_WEB_API_KEY</code>와 <code>ADMIN_GOOGLE_EMAILS</code>를 설정하세요.
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
