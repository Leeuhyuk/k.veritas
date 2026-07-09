import { useState } from 'react';
import RichEditor from './RichEditor.jsx';
import FileDropzone from './FileDropzone.jsx';
import ImagePreviewList from './ImagePreviewList.jsx';
import SeoFields from './SeoFields.jsx';
import { adminApi } from '../api/client.js';

const emptyForm = {
  title: '',
  category: '',
  status: 'published',
  industry: '',
  material: '',
  process: '',
  summary: '',
  body: '',
  seoTitle: '',
  seoDescription: '',
  ogImage: '',
};

export default function ProductForm({
  categories,
  editId,
  initial,
  onSaved,
  onCancel,
}) {
  const [form, setForm] = useState(() => ({ ...emptyForm, ...(initial || {}) }));
  const [keptImages, setKeptImages] = useState(() => (initial && initial.images ? [...initial.images] : []));
  const [files, setFiles] = useState([]);
  const [msg, setMsg] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function resetLocal() {
    setForm({ ...emptyForm });
    setKeptImages([]);
    setFiles([]);
    setMsg('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setMsg('제품명을 입력하세요.');
      return;
    }
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('category', form.category);
    fd.append('status', form.status);
    fd.append('industry', form.industry);
    fd.append('material', form.material);
    fd.append('process', form.process);
    fd.append('summary', form.summary);
    fd.append('body', form.body || '');
    fd.append('seoTitle', form.seoTitle);
    fd.append('seoDescription', form.seoDescription);
    fd.append('ogImage', form.ogImage);
    files.forEach((f) => fd.append('images', f));
    if (editId) fd.append('keepImages', JSON.stringify(keptImages));

    setSaving(true);
    setMsg('저장 중…');
    try {
      if (editId) await adminApi.updateProduct(editId, fd);
      else await adminApi.createProduct(fd);
      setMsg('저장되었습니다.');
      if (!editId) resetLocal();
      onSaved();
      setTimeout(() => setMsg(''), 2500);
    } catch (err) {
      setMsg(err.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  const tags = [form.category, form.industry, form.material, form.process].filter(Boolean);

  return (
    <>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form__grid">
          <div className="form__row">
            <label htmlFor="title">제품명 *</label>
            <input
              id="title"
              type="text"
              required
              placeholder="예: 정밀 가공 브라켓"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
            />
          </div>
          <div className="form__row">
            <label htmlFor="category">카테고리</label>
            <select
              id="category"
              value={form.category}
              onChange={(e) => setField('category', e.target.value)}
            >
              <option value="">(선택 안 함)</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {form.category && !categories.includes(form.category) ? (
                <option value={form.category}>{form.category} (목록 외)</option>
              ) : null}
            </select>
          </div>
        </div>
        <div className="form__grid">
          <div className="form__row">
            <label htmlFor="status">공개 상태</label>
            <select id="status" value={form.status} onChange={(e) => setField('status', e.target.value)}>
              <option value="published">게시</option>
              <option value="draft">비공개</option>
            </select>
          </div>
          <div className="form__row">
            <label htmlFor="industry">산업군</label>
            <input
              id="industry"
              type="text"
              placeholder="예: 자동차, 반도체"
              value={form.industry}
              onChange={(e) => setField('industry', e.target.value)}
            />
          </div>
        </div>
        <div className="form__grid">
          <div className="form__row">
            <label htmlFor="material">소재</label>
            <input
              id="material"
              type="text"
              value={form.material}
              onChange={(e) => setField('material', e.target.value)}
            />
          </div>
          <div className="form__row">
            <label htmlFor="process">공정</label>
            <input
              id="process"
              type="text"
              value={form.process}
              onChange={(e) => setField('process', e.target.value)}
            />
          </div>
        </div>
        <div className="form__row">
          <label htmlFor="summary">한 줄 요약</label>
          <input
            id="summary"
            type="text"
            placeholder="목록 카드에 표시될 짧은 소개"
            value={form.summary}
            onChange={(e) => setField('summary', e.target.value)}
          />
        </div>
        <SeoFields
          idPrefix="product-seo"
          seoTitle={form.seoTitle}
          seoDescription={form.seoDescription}
          ogImage={form.ogImage}
          onChange={setField}
          titleFallback="제품명"
          imageFallback="첨부한 대표 사진"
        />
        <div className="form__row">
          <label>소개 내용</label>
          <RichEditor
            value={form.body}
            onChange={(html) => setField('body', html)}
            placeholder="제품 소개를 작성하세요."
          />
        </div>
        <div className="form__row">
          <label>사진 첨부 (여러 장 · 첫 장이 대표)</label>
          <FileDropzone
            id="images"
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
              onRemove={(i) => setKeptImages((arr) => arr.filter((_, j) => j !== i))}
            />
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: 'var(--spacing-16)', alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn--primary form__submit" disabled={saving}>
            {editId ? '수정 저장' : '등록하기'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setPreviewOpen(true)}>
            미리보기
          </button>
          {editId ? (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                resetLocal();
                onCancel();
              }}
            >
              취소
            </button>
          ) : null}
          {msg ? <span className="admin__msg">{msg}</span> : null}
        </div>
      </form>

      {previewOpen ? (
        <div
          className="preview-modal"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewOpen(false);
          }}
        >
          <div className="preview-modal__panel">
            <div className="admin__bar">
              <h2 className="section-title" style={{ textAlign: 'left', fontSize: 28, letterSpacing: '-1px' }}>
                제품 미리보기
              </h2>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPreviewOpen(false)}>
                닫기
              </button>
            </div>
            <div className="detail">
              <div style={{ display: 'flex', gap: 'var(--spacing-8)', flexWrap: 'wrap', marginBottom: 'var(--spacing-16)' }}>
                {tags.map((t) => (
                  <span className="tag" key={t}>
                    {t}
                  </span>
                ))}
                <span className="tag">{form.status === 'draft' ? '비공개' : '게시'}</span>
              </div>
              <h1 className="section-title" style={{ textAlign: 'left', marginBottom: 'var(--spacing-32)' }}>
                {form.title.trim() || '제품명 미입력'}
              </h1>
              {keptImages[0] ? (
                <img className="detail__cover" src={keptImages[0]} alt="" />
              ) : (
                <div className="detail__cover is-ph">
                  <span className="show-ph">NO IMAGE</span>
                </div>
              )}
              <div
                className="detail__body"
                dangerouslySetInnerHTML={{
                  __html: form.body || '<p class="empty-note" style="text-align:left">소개 내용이 없습니다.</p>',
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
