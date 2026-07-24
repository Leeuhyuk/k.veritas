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
          const attachments = i.attachments || [];
          return (
            <div className={`inq-card${i.read ? '' : ' is-unread'}`} key={i.id}>
              <div className="inq-card__head">
                <div className="inq-card__who">
                  <span className="inq-card__name">{i.name || '(이름 없음)'}</span>
                  {i.company ? <span className="inq-card__company">{i.company}</span> : null}
                </div>
                <time className="inq-card__time">{fmtDateTime(i.createdAt)}</time>
              </div>

              <div className="inq-card__chips">
                {i.type ? <span className="inq-chip inq-chip--type">{i.type}</span> : null}
                <span className={`inq-chip inq-chip--${st}`}>{STATUS[st] || st}</span>
                {i.productTitle ? (
                  <span className="inq-chip inq-chip--product">제품 · {i.productTitle}</span>
                ) : null}
              </div>

              <div className="inq-card__contact">
                {i.email ? <a href={`mailto:${i.email}`}>✉ {i.email}</a> : null}
                {i.phone ? <span>☎ {i.phone}</span> : null}
              </div>

              <p className="inq-card__msg">{i.message || '(내용 없음)'}</p>

              {attachments.length ? (
                <div className="inq-card__files">
                  {attachments.map((a, idx) => {
                    const url = typeof a === 'string' ? a : (a && (a.url || a.file)) || '#';
                    let raw = (a && (a.originalName || a.name)) || '';
                    if (!raw) {
                      try { raw = decodeURIComponent(String(url).split('?')[0].split('/').pop()).replace(/^\d+-/, ''); }
                      catch { raw = ''; }
                    }
                    const extMatch = String(raw || url).split('?')[0].match(/\.([a-z0-9]{1,5})$/i);
                    const ext = extMatch ? extMatch[1].toUpperCase() : 'FILE';
                    const clean = raw && /[^_.\s]/.test(raw.replace(/\.[a-z0-9]+$/i, '')) ? raw : `첨부파일 ${idx + 1}.${ext.toLowerCase()}`;
                    const size = a && a.size ? sizeStr(a.size) : '';
                    return (
                      <a key={idx} className="inq-file" href={url} target="_blank" rel="noreferrer" title={clean}>
                        <span className="inq-file__ext">{ext}</span>
                        <span className="inq-file__name">{clean}</span>
                        {size ? <span className="inq-file__size">{size}</span> : null}
                      </a>
                    );
                  })}
                </div>
              ) : null}

              <div className="inq-card__admin">
                <label>
                  <span className="microcap">처리 상태</span>
                  <select
                    value={(drafts[i.id] && drafts[i.id].status) || 'new'}
                    onChange={(e) => setDraft(i.id, 'status', e.target.value)}
                  >
                    <option value="new">신규</option>
                    <option value="reviewing">검토중</option>
                    <option value="replied">회신완료</option>
                    <option value="hold">보류</option>
                  </select>
                </label>
                <label>
                  <span className="microcap">관리자 메모</span>
                  <input
                    type="text"
                    value={(drafts[i.id] && drafts[i.id].memo) || ''}
                    onChange={(e) => setDraft(i.id, 'memo', e.target.value)}
                    placeholder="내부 메모"
                  />
                </label>
              </div>

              <div className="inq-card__actions">
                <a
                  className="btn btn--primary btn--sm"
                  href={`mailto:${i.email || ''}?subject=${encodeURIComponent('[k.veritas] 문의 회신')}`}
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
