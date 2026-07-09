import { useState } from 'react';
import { adminApi } from '../api/client.js';

export default function CategoryManager({ categories, onChange }) {
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');

  async function add() {
    const n = name.trim();
    if (!n) return;
    try {
      const cats = await adminApi.addCategory(n);
      setName('');
      setMsg('추가되었습니다.');
      onChange(cats);
      setTimeout(() => setMsg(''), 2000);
    } catch (e) {
      setMsg(e.message || '추가 실패');
    }
  }

  async function remove(cat) {
    if (!confirm(`카테고리 "${cat}"을(를) 삭제할까요?\n(이미 등록된 제품 값은 유지됩니다)`)) return;
    try {
      const cats = await adminApi.deleteCategory(cat);
      onChange(cats);
    } catch (e) {
      setMsg(e.message || '삭제 실패');
    }
  }

  return (
    <div className="admin__cats">
      <p className="microlabel" style={{ marginBottom: 'var(--spacing-16)' }}>
        카테고리 관리
      </p>
      <div style={{ display: 'flex', gap: 'var(--spacing-8)', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="새 카테고리 입력"
          style={{ flex: 1, minWidth: 180 }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn btn--ghost" onClick={add}>
          추가
        </button>
      </div>
      <div className="img-chips" style={{ marginTop: 'var(--spacing-16)' }}>
        {categories.length
          ? categories.map((c) => (
              <span className="cat-chip" key={c}>
                {c}
                <button type="button" aria-label="삭제" onClick={() => remove(c)}>
                  ×
                </button>
              </span>
            ))
          : (
              <span className="admin__msg">등록된 카테고리가 없습니다.</span>
            )}
      </div>
      {msg ? <span className="admin__msg">{msg}</span> : null}
    </div>
  );
}
