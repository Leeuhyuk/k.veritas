import { useState } from 'react';
import { adminApi } from '../api/client.js';

export default function SettingsPage() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (next !== confirm) {
      setErr(true);
      setMsg('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (String(next).length < 8) {
      setErr(true);
      setMsg('새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    setErr(false);
    setMsg('변경 중…');
    try {
      await adminApi.changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setMsg('비밀번호가 변경되었습니다.');
      setTimeout(() => setMsg(''), 3000);
    } catch (e2) {
      setErr(true);
      setMsg(e2.message || '변경에 실패했습니다.');
    }
  }

  return (
    <form className="form" onSubmit={onSubmit} style={{ maxWidth: 520, gap: 'var(--spacing-16)' }}>
      <div className="form__row">
        <label htmlFor="pw-current">현재 비밀번호</label>
        <input
          id="pw-current"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </div>
      <div className="form__row">
        <label htmlFor="pw-next">새 비밀번호 (8자 이상)</label>
        <input
          id="pw-next"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </div>
      <div className="form__row">
        <label htmlFor="pw-confirm">새 비밀번호 확인</label>
        <input
          id="pw-confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="submit" className="btn btn--primary form__submit">
          비밀번호 변경
        </button>
        {msg ? (
          <span className="admin__msg" style={err ? { color: 'var(--color-warm-loam)' } : undefined}>
            {msg}
          </span>
        ) : null}
      </div>
    </form>
  );
}
