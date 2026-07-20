import { useCallback, useEffect, useState } from 'react';
import { adminApi, fmtDateTime, sizeStr } from '../api/client.js';

const STATUS = {
  new: '신규',
  reviewing: '검토중',
  replied: '회신완료',
  hold: '보류',
};

export default function InquiriesPage() {
  const [items, setItems] = useState([]);
  const [drafts, setDrafts] = useState({});

  const load = useCallback(async () => {
    const list = await adminApi.inquiries();
    const arr = Array.isArray(list) ? list : [];
    setItems(arr);
    const d = {};
    arr.forEach((i) => {
      const st = i.status || (i.read ? 'reviewing' : 'new');
      d[i.id] = { status: st, memo: i.memo || '' };
    });
    setDrafts(d);
  }, []);

  useEffect(() => {
    load().catch(() => setItems([]));
  }, [load]);

  const unread = items.filter((i) => (i.status || 'new') === 'new' || !i.read).length;

  function setDraft(id, key, val) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [key]: val } }));
  }

  async function save(id) {
    const d = drafts[id] || {};
    await adminApi.updateInquiry(id, { status: d.status, memo: d.memo });
    await load();
  }

  async function toggleRead(id) {
    await adminApi.inquiryRead(id);
    await load();
  }

  async function remove(id) {
    if (!confirm('이 문의를 삭제할까요?')) return;
    await adminApi.deleteInquiry(id);
    await load();
  }

  return (
    <>
      <p className="microlabel" style={{ marginBottom: 'var(--spacing-16)' }}>
        접수된 문의 · 총 {items.length}건 / 미확인 {unread}건
      </p>
      {!items.length ? (
        <p className="empty-note" style={{ padding: 'var(--spacing-32) 0' }}>
          접수된 문의가 없습니다.
        </p>
      ) : (
        items.map((i) => {
          const st = (drafts[i.id] && drafts[i.id].status) || i.status || 'new';
          return (
            <div className={`inq-card${i.read ? '' : ' is-unread'}`} key={i.id}>
              <div className="inq-card__head">
                <div>
                  <strong>{i.name}</strong>
                  {i.company ? ` · ${i.company}` : ''}
                  {i.type ? (
                    <span className="tag" style={{ marginLeft: 8 }}>
                      {i.type}
                    </span>
                  ) : null}
                  <span
                    className="tag"
                    style={{
                      marginLeft: 8,
                      background: st === 'new' ? 'var(--color-moss-veil)' : 'var(--color-lichen)',
                    }}
                  >
                    {STATUS[st] || st}
                  </span>
                </div>
                <span className="mono" style={{ color: 'var(--color-bark-brown)', fontSize: 12 }}>
                  {fmtDateTime(i.createdAt)}
                </span>
              </div>
              <div className="inq-card__meta mono">
                {i.email}
                {i.phone ? ` · ${i.phone}` : ''}
              </div>
              {i.productTitle ? (
                <div className="inq-card__meta mono">
                  제품 문의: {i.productTitle}
                  {i.productId ? ` · ${i.productId}` : ''}
                </div>
              ) : null}
              <p className="inq-card__msg">{i.message}</p>
              {(i.attachments || []).length ? (
                <div className="inq-card__actions" style={{ marginBottom: 'var(--spacing-16)' }}>
                  {i.attachments.map((a, idx) => {
                    // 신규(Firebase): 문자열 Storage URL / 구(서버): {originalName,size}
                    const url = typeof a === 'string'
                      ? a
                      : (a && a.url) || `/api/inquiries/${encodeURIComponent(i.id)}/attachments/${idx}`;
                    const name = (a && a.originalName)
                      || (() => { try { return decodeURIComponent(String(url).split('?')[0].split('/').pop()).replace(/^\d+-/, ''); } catch { return '첨부파일'; } })();
                    const size = a && a.size ? ` · ${sizeStr(a.size)}` : '';
                    return (
                      <a key={idx} className="btn btn--ghost btn--sm" href={url} target="_blank" rel="noreferrer">
                        {name}{size}
                      </a>
                    );
                  })}
                </div>
              ) : null}
              <div className="form__grid" style={{ marginBottom: 'var(--spacing-16)' }}>
                <div className="form__row">
                  <label>처리 상태</label>
                  <select
                    value={(drafts[i.id] && drafts[i.id].status) || 'new'}
                    onChange={(e) => setDraft(i.id, 'status', e.target.value)}
                  >
                    <option value="new">신규</option>
                    <option value="reviewing">검토중</option>
                    <option value="replied">회신완료</option>
                    <option value="hold">보류</option>
                  </select>
                </div>
                <div className="form__row">
                  <label>관리자 메모</label>
                  <input
                    type="text"
                    value={(drafts[i.id] && drafts[i.id].memo) || ''}
                    onChange={(e) => setDraft(i.id, 'memo', e.target.value)}
                    placeholder="내부 메모"
                  />
                </div>
              </div>
              <div className="inq-card__actions">
                <a
                  className="btn btn--ghost btn--sm"
                  href={`mailto:${encodeURIComponent(i.email)}?subject=${encodeURIComponent('[k.veritas] 문의 회신')}`}
                >
                  메일 회신
                </a>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => save(i.id)}>
                  상태 저장
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => toggleRead(i.id)}>
                  {i.read ? '미확인으로' : '확인함'}
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => remove(i.id)}>
                  삭제
                </button>
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
