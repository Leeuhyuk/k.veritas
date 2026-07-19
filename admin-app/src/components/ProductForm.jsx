import { useState, useEffect } from 'react';
import RichEditor from './RichEditor.jsx';
import FileDropzone from './FileDropzone.jsx';
import ImagePreviewList from './ImagePreviewList.jsx';
import { adminApi } from '../api/client.js';

const emptyForm = {
  title: '',
  model: '',
  category: '',
  status: 'published',
  industry: '',
  material: '',
  process: '',
  summary: '',
  body: '',
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
  const [extraCats, setExtraCats] = useState([]);

  // 수정 클릭 등으로 initial/editId 가 바뀌면 폼을 기존 등록 내용으로 다시 채움
  // (key 리마운트에만 의존하지 않도록 보강)
  useEffect(() => {
    setForm({ ...emptyForm, ...(initial || {}) });
    setKeptImages(initial && initial.images ? [...initial.images] : []);
    setFiles([]);
    setMsg('');
  }, [editId, initial]);

  // 관리 카테고리 + 추가한 분류 + 현재 선택값(목록 외 포함)
  const catList = Array.from(new Set([
    ...(categories || []),
    ...extraCats,
    ...(form.category ? [form.category] : []),
  ]));

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function addCategory() {
    const name = (window.prompt('추가할 카테고리명을 입력하세요') || '').trim();
    if (!name) return;
    setExtraCats((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setField('category', name);
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
    fd.append('model', form.model);
    fd.append('category', form.category);
    fd.append('status', form.status);
    fd.append('industry', form.industry);
    fd.append('material', form.material);
    fd.append('process', form.process);
    fd.append('summary', form.summary);
    fd.append('body', form.body || '');
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

  // 카드 미리보기용 파생값 (공개 카드 로직과 동일)
  const modelPreview = (form.model || '').trim().toUpperCase() || 'KV-01';
  const featPreview = (form.material || '')
    .split(/[·,/]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  const specPreview = [
    ['분야', form.category || form.industry],
    ['공정', form.process],
  ].filter((r) => r[1]);
  const previewThumb = files[0] ? URL.createObjectURL(files[0]) : keptImages[0] || '';

  return (
    <>
      <form className="form" onSubmit={handleSubmit}>
        {/* ── 카드 상단: 모델 · 제목 · 분야 ── */}
        <div className="form__section">
          <p className="form__section-label">카드 · 상세 기본</p>
          <p className="form__section-desc">카드 상단(MODEL·제목)과 분야 태그·스펙에 표시됩니다.</p>
        </div>
        <div className="form__grid">
          <div className="form__row">
            <label htmlFor="title">제품명 *</label>
            <input
              id="title"
              type="text"
              required
              placeholder="예: 의자·좌석 내구성 시험기"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
            />
            <span className="form__hint">카드·상세 페이지의 제목</span>
          </div>
          <div className="form__row">
            <label htmlFor="model">모델 코드</label>
            <input
              id="model"
              type="text"
              placeholder="예: KV-PT 400"
              value={form.model}
              onChange={(e) => setField('model', e.target.value)}
            />
            <span className="form__hint">카드 상단 “MODEL ___”. 비우면 자동(KV-번호)</span>
          </div>
        </div>
        <div className="form__grid">
          <div className="form__row">
            <label htmlFor="category">분야 (카테고리)</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                id="category"
                value={form.category}
                onChange={(e) => setField('category', e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">(선택 안 함)</option>
                {catList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn--ghost btn--sm" onClick={addCategory}>＋ 새 분류</button>
            </div>
            <span className="form__hint">카드 스펙 ‘분야’ + 태그로 표시</span>
          </div>
          <div className="form__row">
            <label htmlFor="status">공개 상태</label>
            <select id="status" value={form.status} onChange={(e) => setField('status', e.target.value)}>
              <option value="published">게시</option>
              <option value="draft">비공개</option>
            </select>
            <span className="form__hint">비공개면 공개 목록에서 숨겨집니다</span>
          </div>
        </div>

        {/* ── 카드 스펙(데이터시트): 특징 불릿 · 공정 ── */}
        <div className="form__section">
          <p className="form__section-label">카드 스펙 (데이터시트)</p>
          <p className="form__section-desc">카드의 특징 불릿과 스펙 표에 표시되는 항목입니다.</p>
        </div>
        <div className="form__row">
          <label htmlFor="material">핵심 특징 (규격·방식)</label>
          <input
            id="material"
            type="text"
            placeholder="예: BIFMA X5.1 · 반복하중 · ±0.5%"
            value={form.material}
            onChange={(e) => setField('material', e.target.value)}
          />
          <span className="form__hint">카드에 오렌지 사각 불릿으로 표시. “ · ”로 여러 개 구분(최대 3개)</span>
        </div>
        <div className="form__grid">
          <div className="form__row">
            <label htmlFor="process">공정</label>
            <input
              id="process"
              type="text"
              placeholder="예: 시험기 설계·제작 / 설치·교정"
              value={form.process}
              onChange={(e) => setField('process', e.target.value)}
            />
            <span className="form__hint">카드 스펙 표의 ‘공정’ 값</span>
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
            <span className="form__hint">분야를 비우면 카드 분류로 대체 사용</span>
          </div>
        </div>
        <div className="form__row">
          <label htmlFor="summary">한 줄 요약</label>
          <input
            id="summary"
            type="text"
            placeholder="핵심 특징이 없을 때 카드에 표시될 짧은 소개"
            value={form.summary}
            onChange={(e) => setField('summary', e.target.value)}
          />
          <span className="form__hint">핵심 특징을 입력하면 카드엔 특징 불릿이 우선 표시됩니다</span>
        </div>

        {/* ── 상세 페이지: 사진 · 소개 ── */}
        <div className="form__section">
          <p className="form__section-label">상세 페이지</p>
          <p className="form__section-desc">카드 이미지와 상세 페이지 본문입니다.</p>
        </div>
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
            {/* 카탈로그 카드 미리보기 (데이터시트) */}
            <p className="form__section-label" style={{ marginBottom: 8 }}>카탈로그 카드</p>
            <div style={{ maxWidth: 300, marginBottom: 'var(--spacing-32)' }}>
              <span className="prod-card" style={{ cursor: 'default' }}>
                {previewThumb ? (
                  <span className="prod-card__media"><img src={previewThumb} alt="" /></span>
                ) : (
                  <span className="prod-card__media"><span className="prod-card__ph">NO IMAGE</span></span>
                )}
                <span className="prod-card__b">
                  <span className="prod-card__model">MODEL {modelPreview}</span>
                  <h3>{form.title.trim() || '제품명 미입력'}</h3>
                  {featPreview.length ? (
                    <ul className="prod-card__feats">
                      {featPreview.map((f) => <li key={f}>{f}</li>)}
                    </ul>
                  ) : (form.summary ? <p>{form.summary}</p> : null)}
                  {specPreview.length ? (
                    <dl className="prod-card__spec">
                      {specPreview.map((r) => (
                        <div key={r[0]}><dt>{r[0]}</dt><dd>{r[1]}</dd></div>
                      ))}
                    </dl>
                  ) : null}
                </span>
              </span>
            </div>
            <p className="form__section-label" style={{ marginBottom: 8 }}>상세 페이지</p>
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
