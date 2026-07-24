import { useCallback, useEffect, useState } from 'react';
import { adminApi, fmtDate } from '../api/client.js';
import RichEditor from './RichEditor.jsx';
import FileDropzone from './FileDropzone.jsx';
import ImagePreviewList from './ImagePreviewList.jsx';
import SeoFields from './SeoFields.jsx';

const empty = {
  title: '',
  category: '',
  status: 'published',
  isPopup: false,
  body: '',
  seoTitle: '',
  seoDescription: '',
  ogImage: '',
};

export default function NewsPage() {
  const [items, setItems] = useState([]);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(empty);
  const [keptImages, setKeptImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [msg, setMsg] = useState('');
  const [formKey, setFormKey] = useState(0);

  const load = useCallback(async () => {
    const list = await adminApi.newsList();
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
    setKeptImages([]);
    setFiles([]);
    setFormKey((k) => k + 1);
    setMsg('');
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setMsg('제목을 입력하세요.');
      return;
    }
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('category', form.category || '');
    fd.append('status', form.status);
    fd.append('isPopup', form.isPopup ? 'true' : 'false');
    fd.append('body', form.body || '');
    fd.append('seoTitle', form.seoTitle);
    fd.append('seoDescription', form.seoDescription);
    fd.append('ogImage', form.ogImage);
    files.forEach((f) => fd.append('images', f));
    if (editId) fd.append('keepImages', JSON.stringify(keptImages));
    setMsg('저장 중…');
    try {
      if (editId) await adminApi.updateNews(editId, fd);
      else await adminApi.createNews(fd);
      setMsg('저장되었습니다.');
      reset();
      await load();
      setTimeout(() => setMsg(''), 2500);
    } catch (err) {
      setMsg(err.message || '저장 실패');
    }
  }

  async function onEdit(id) {
    try {
      const n = await adminApi.newsOne(id);
      setEditId(n.id);
      setForm({
        title: n.title || '',
        category: n.category || '',
        status: n.status === 'draft' ? 'draft' : 'published',
        isPopup: !!n.isPopup,
        body: n.body || '',
        seoTitle: n.seoTitle || '',
        seoDescription: n.seoDescription || '',
        ogImage: n.ogImage || '',
      });
      setKeptImages((n.images || []).slice());
      setFiles([]);
      setFormKey((k) => k + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      alert(e.message || '불러오기 실패');
    }
  }

  async function onDelete(id) {
    if (!confirm('이 공지를 삭제할까요?')) return;
    await adminApi.deleteNews(id);
    if (editId === id) reset();
    await load();
  }

  async function onResetExamples() {
    if (!confirm('등록된 공지를 모두 삭제하고 시험 장비 예제 10개로 교체할까요? 되돌릴 수 없습니다.')) return;
    setMsg('예제로 초기화 중…');
    try {
      const r = await adminApi.resetNewsToExamples();
      await load();
      setMsg(`예제 ${r?.added ?? ''}개로 초기화되었습니다.`);
      setTimeout(() => setMsg(''), 2500);
    } catch (err) {
      setMsg(err.message || '초기화 실패');
    }
  }

  return (
    <>
      <form className="form" onSubmit={onSubmit}>
        <div className="form__row">
          <label htmlFor="n-title">제목 *</label>
          <input
            id="n-title"
            required
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="공지 제목"
          />
        </div>
        <div className="form__row">
          <label htmlFor="n-category">분류 (선택)</label>
          <input
            id="n-category"
            value={form.category}
            onChange={(e) => setField('category', e.target.value)}
            placeholder="예: 공지 · 인증 · 설비 · 생산 · 안내"
            list="n-category-list"
          />
          <datalist id="n-category-list">
            <option value="공지" />
            <option value="인증" />
            <option value="설비" />
            <option value="생산" />
            <option value="안내" />
          </datalist>
        </div>
        <div className="form__row">
          <label htmlFor="n-status">공개 상태</label>
          <select id="n-status" value={form.status} onChange={(e) => setField('status', e.target.value)}>
            <option value="published">게시</option>
            <option value="draft">비공개</option>
          </select>
        </div>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 'var(--text-body-sm)',
            color: 'var(--color-bark-brown)',
          }}
        >
          <input
            type="checkbox"
            checked={form.isPopup}
            onChange={(e) => setField('isPopup', e.target.checked)}
            style={{ width: 'auto' }}
          />
          <span>공지 팝업으로 노출</span>
        </label>
        <SeoFields
          idPrefix="news-seo"
          seoTitle={form.seoTitle}
          seoDescription={form.seoDescription}
          ogImage={form.ogImage}
          onChange={setField}
          titleFallback="공지 제목"
          imageFallback="첨부한 대표 사진"
        />
        <div className="form__row">
          <label>내용</label>
          <RichEditor key={formKey} value={form.body} onChange={(html) => setField('body', html)} />
        </div>
        <div className="form__row">
          <label>사진 첨부</label>
          <FileDropzone
            accept="image/*"
            multiple
            maxFiles={8}
            files={files}
            onChange={setFiles}
            label="사진을 끌어다 놓으세요"
            sublabel="또는 클릭해서 탐색기에서 여러 장 선택"
          />
        </div>
        {keptImages.length ? (
          <div className="form__row">
            <label>기존 사진 (클릭 확대 · × 로 제외)</label>
            <ImagePreviewList
              urls={keptImages}
              labelPrefix="기존 사진"
              ariaLabel="기존 사진"
              onRemove={(i) => setKeptImages((a) => a.filter((_, j) => j !== i))}
            />
          </div>
        ) : null}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 'var(--spacing-16)' }}>
          <p className="microlabel" style={{ margin: 0 }}>등록된 공지</p>
          {adminApi.isStatic ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={onResetExamples}>
              예제로 초기화
            </button>
          ) : null}
        </div>
        {!items.length ? (
          <p className="empty-note" style={{ padding: 'var(--spacing-32) 0' }}>
            등록된 공지가 없습니다.
          </p>
        ) : (
          items.map((n) => (
            <div className="admin__row" key={n.id}>
              {n.images && n.images[0] ? <img src={n.images[0]} alt="" /> : <div className="ph" />}
              <div className="admin__row-main">
                <strong>{n.title}</strong>
                <span>
                  {n.status === 'draft' ? '비공개' : '게시'}
                  {n.isPopup ? ' · 팝업' : ''} · {fmtDate(n.createdAt)}
                </span>
              </div>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onEdit(n.id)}>
                수정
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDelete(n.id)}>
                삭제
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
