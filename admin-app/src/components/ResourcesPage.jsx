import { useCallback, useEffect, useState } from 'react';
import { adminApi, fmtDate, sizeStr } from '../api/client.js';
import RichEditor from './RichEditor.jsx';
import FileDropzone from './FileDropzone.jsx';
import SeoFields from './SeoFields.jsx';

const CATS = ['카탈로그', '사용설명서', '인증서', '도면(CAD)', '시험성적서', '기타'];
const empty = {
  title: '',
  category: '카탈로그',
  status: 'published',
  isBrochure: false,
  description: '',
  body: '',
  seoTitle: '',
  seoDescription: '',
  ogImage: '',
};

export default function ResourcesPage() {
  const [items, setItems] = useState([]);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState(null);
  const [fileHint, setFileHint] = useState('');
  const [msg, setMsg] = useState('');
  const [formKey, setFormKey] = useState(0);

  const load = useCallback(async () => {
    const list = await adminApi.resources();
    setItems(Array.isArray(list) ? list : []);
  }, []);

  useEffect(() => {
    load().catch(() => setItems([]));
  }, [load]);

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function reset() {
    setEditId(null);
    setForm(empty);
    setFile(null);
    setFileHint('');
    setFormKey((k) => k + 1);
    setMsg('');
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setMsg('제목을 입력하세요.');
      return;
    }
    if (!editId && !file) {
      setMsg('파일을 첨부해 주세요.');
      return;
    }
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('category', form.category);
    fd.append('description', form.description);
    fd.append('body', form.body || '');
    fd.append('seoTitle', form.seoTitle);
    fd.append('seoDescription', form.seoDescription);
    fd.append('ogImage', form.ogImage);
    fd.append('status', form.status);
    fd.append('isBrochure', form.isBrochure ? 'true' : 'false');
    if (file) fd.append('file', file);
    setMsg('저장 중…');
    try {
      if (editId) await adminApi.updateResource(editId, fd);
      else await adminApi.createResource(fd);
      setMsg('저장되었습니다.');
      reset();
      await load();
      setTimeout(() => setMsg(''), 2500);
    } catch (err) {
      setMsg(err.message || '저장 실패');
    }
  }

  function onEdit(r) {
    setEditId(r.id);
    setForm({
      title: r.title || '',
      category: r.category || '기타',
      status: r.status === 'draft' ? 'draft' : 'published',
      isBrochure: !!r.isBrochure,
      description: r.description || '',
      body: r.body || '',
      seoTitle: r.seoTitle || '',
      seoDescription: r.seoDescription || '',
      ogImage: r.ogImage || '',
    });
    setFile(null);
    setFileHint(`(현재: ${r.originalName || ''} — 새 파일 선택 시에만 교체)`);
    setFormKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function onDelete(id) {
    if (!confirm('이 자료를 삭제할까요?')) return;
    await adminApi.deleteResource(id);
    if (editId === id) reset();
    await load();
  }

  return (
    <>
      <form className="form" onSubmit={onSubmit}>
        <div className="form__grid">
          <div className="form__row">
            <label>제목 *</label>
            <input required value={form.title} onChange={(e) => setField('title', e.target.value)} />
          </div>
          <div className="form__row">
            <label>분류</label>
            <input
              list="res-cat-options"
              value={form.category}
              onChange={(e) => setField('category', e.target.value)}
              placeholder="선택하거나 새 분류를 입력하세요"
              autoComplete="off"
            />
            <datalist id="res-cat-options">
              {Array.from(new Set([...CATS, ...items.map((r) => (r.category || '').trim()).filter(Boolean)])).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <span className="admin__msg" style={{ fontSize: '11px' }}>기존 분류를 고르거나 새 분류명을 입력하면 추가됩니다.</span>
          </div>
        </div>
        <div className="form__grid">
          <div className="form__row">
            <label>공개 상태</label>
            <select value={form.status} onChange={(e) => setField('status', e.target.value)}>
              <option value="published">게시</option>
              <option value="draft">비공개</option>
            </select>
          </div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              paddingTop: 26,
              fontSize: 'var(--text-body-sm)',
              color: 'var(--color-bark-brown)',
            }}
          >
            <input
              type="checkbox"
              checked={form.isBrochure}
              onChange={(e) => setField('isBrochure', e.target.checked)}
              style={{ width: 'auto' }}
            />
            <span>회사소개서 받기 버튼에 연결</span>
          </label>
        </div>
        <div className="form__row">
          <label>설명</label>
          <input value={form.description} onChange={(e) => setField('description', e.target.value)} />
        </div>
        <SeoFields
          idPrefix="resource-seo"
          seoTitle={form.seoTitle}
          seoDescription={form.seoDescription}
          ogImage={form.ogImage}
          onChange={setField}
          titleFallback="자료 제목"
          imageFallback="기본 공유 이미지"
        />
        <div className="form__row">
          <label>상세 내용</label>
          <RichEditor key={formKey} value={form.body} onChange={(html) => setField('body', html)} />
        </div>
        <div className="form__row">
          <label>
            첨부 파일{' '}
            <span style={{ fontSize: 12, color: 'var(--color-bark-brown)' }}>{fileHint}</span>
          </label>
          <FileDropzone
            multiple={false}
            required={!editId && !file}
            files={file ? [file] : []}
            onChange={(list) => setFile(list[0] || null)}
            label="파일을 끌어다 놓으세요"
            sublabel={editId ? '또는 클릭해서 새 파일로 교체' : '또는 클릭해서 탐색기에서 선택'}
          />
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="submit" className="btn btn--primary form__submit">
            {editId ? '수정 저장' : '등록하기'}
          </button>
          {editId ? (
            <button type="button" className="btn btn--ghost" onClick={reset}>
              취소
            </button>
          ) : null}
          {msg ? <span className="admin__msg">{msg}</span> : null}
        </div>
      </form>

      <div className="admin__list">
        <p className="microlabel" style={{ marginBottom: 'var(--spacing-16)' }}>
          등록된 자료
        </p>
        {!items.length ? (
          <p className="empty-note" style={{ padding: 'var(--spacing-32) 0' }}>
            등록된 자료가 없습니다.
          </p>
        ) : (
          items.map((r) => (
            <div className="admin__row" key={r.id}>
              <div className="admin__row-main">
                <strong>{r.title}</strong>
                <span>
                  {r.status === 'draft' ? '비공개' : '게시'}
                  {r.isBrochure ? ' · 회사소개서' : ''} · {r.category || '기타'} · {r.originalName || ''}{' '}
                  {r.size ? `· ${sizeStr(r.size)}` : ''} · 다운로드 {r.downloads || 0} · {fmtDate(r.createdAt)}
                </span>
              </div>
              <a className="btn btn--ghost btn--sm" href={`/api/resources/${encodeURIComponent(r.id)}/download`}>
                받기
              </a>
              <a
                className="btn btn--ghost btn--sm"
                href={`/resource-detail.html?id=${encodeURIComponent(r.id)}`}
                target="_blank"
                rel="noreferrer"
              >
                보기
              </a>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onEdit(r)}>
                수정
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDelete(r.id)}>
                삭제
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
