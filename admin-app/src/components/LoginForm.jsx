import { useState } from 'react';
import { adminApi } from '../api/client.js';

export default function LoginForm({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg('');
    setLoading(true);
    try {
      await adminApi.login(password);
      setPassword('');
      onSuccess();
    } catch {
      setMsg('비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-wrap">
      <div className="admin-login">
        <div className="section-head">
          <p className="microlabel">LOGIN</p>
          <h1 className="section-title">관리자 로그인</h1>
        </div>
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
          <button type="submit" className="btn btn--primary form__submit" disabled={loading}>
            {loading ? '확인 중…' : '로그인'}
          </button>
          {msg ? <p className="admin__msg">{msg}</p> : null}
        </form>
      </div>
    </div>
  );
}
