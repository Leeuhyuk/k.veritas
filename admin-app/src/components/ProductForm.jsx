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

// 스펙 표 초기값: 저장된 specs 우선, 없으면 기존 필드(소재·가공·산업)에서 이관, 그것도 없으면 기본 행
function seedSpecs(initial) {
  if (initial && Array.isArray(initial.specs) && initial.specs.length) {
    return initial.specs.map((s) => ({ label: s.label || '', value: s.value || '' }));
  }
  if (initial) {
    const legacy = [
      ['소재', initial.material],
      ['가공', initial.process],
      ['산업', initial.industry],
    ].filter((r) => r[1]);
    if (legacy.length) return legacy.map(([label, value]) => ({ label, value }));
  }
  return [
    { label: '소재', value: '' },
    { label: '가공', value: '' },
    { label: '산업', value: '' },
  ];
}

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
  const [saving, setSaving] = useState(false);
  const [extraCats, setExtraCats] = useState([]);
  const [specs, setSpecs] = useState(() => seedSpecs(initial));

  // 수정 클릭 등으로 initial/editId 가 바뀌면 폼을 기존 등록 내용으로 다시 채움
  // (key 리마운트에만 의존하지 않도록 보강)
  useEffect(() => {
    setForm({ ...emptyForm, ...(initial || {}) });
    setKeptImages(initial && initial.images ? [...initial.images] : []);
    setSpecs(seedSpecs(initial));
    setFiles([]);
    setMsg('');
  }, [editId, initial]);

  function setSpec(i, key, val) {
    setSpecs((rows) => rows.map((r, j) => (j === i ? { ...r, [key]: val } : r)));
  }
  function addSpec() {
    setSpecs((rows) => [...rows, { label: '', value: '' }]);
  }
  function removeSpec(i) {
    setSpecs((rows) => rows.filter((_, j) => j !== i));
  }

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
    fd.append('specs', JSON.stringify(specs.filter((s) => s.label.trim() || s.value.trim())));
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

  const previewThumb = files[0] ? URL.createObjectURL(files[0]) : keptImages[0] || '';

  return (
    <form className="form pf-detail" onSubmit={handleSubmit}>
      <p className="pf-detail__hint">
        실제 <b>상세 페이지</b>와 동일한 화면입니다. 각 칸을 클릭해 바로 입력하고 저장하면 그대로 게시됩니다.
      </p>

      {/* ── 상단: 이미지(좌) + 정보(우) — 상세 페이지 미러링 ── */}
      <div className="pf-detail__top">
        <div className="pf-detail__media">
          {previewThumb ? (
            <img className="pf-detail__cover" src={previewThumb} alt="" />
          ) : (
            <div className="pf-detail__cover pf-detail__cover--ph">대표 이미지</div>
          )}
          <FileDropzone
            id="images"
            accept="image/*"
            multiple
            maxFiles={8}
            files={files}
            onChange={setFiles}
            label="사진 추가 (여러 장 · 첫 장이 대표)"
            sublabel="끌어다 놓거나 클릭해서 선택"
          />
        </div>

        <div className="pf-detail__info">
          {/* 카테고리 태그 + 공개 상태 */}
          <div className="pf-detail__tagrow">
            <select
              className="pf-detail__cat"
              value={form.category}
              onChange={(e) => setField('category', e.target.value)}
              title="카테고리 (태그로 표시)"
            >
              <option value="">카테고리 선택</option>
              {catList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button type="button" className="btn btn--ghost btn--sm" onClick={addCategory}>＋ 새 분류</button>
            <span className="pf-detail__grow" />
            <input
              className="pf-detail__model"
              type="text"
              placeholder="모델 코드 (예: KV-PT 400)"
              value={form.model}
              onChange={(e) => setField('model', e.target.value)}
              title="카드 상단 MODEL 표시"
            />
            <select
              className="pf-detail__status"
              value={form.status}
              onChange={(e) => setField('status', e.target.value)}
              title="공개 상태"
            >
              <option value="published">게시</option>
              <option value="draft">비공개</option>
            </select>
          </div>

          <input
            className="pf-detail__title"
            type="text"
            required
            placeholder="제품명을 입력하세요 *"
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
          />
          <textarea
            className="pf-detail__lead"
            rows={2}
            placeholder="요약 (상세 페이지 부제 · 여러 줄 가능)"
            value={form.summary}
            onChange={(e) => setField('summary', e.target.value)}
          />

          <dl className="pf-detail__spec pf-detail__spec--edit">
            {specs.map((row, i) => (
              <div key={i}>
                <dt>
                  <input
                    type="text"
                    className="pf-detail__spec-label"
                    placeholder="항목명"
                    value={row.label}
                    onChange={(e) => setSpec(i, 'label', e.target.value)}
                  />
                </dt>
                <dd>
                  <input
                    type="text"
                    placeholder="값"
                    value={row.value}
                    onChange={(e) => setSpec(i, 'value', e.target.value)}
                  />
                  <button
                    type="button"
                    className="pf-detail__spec-del"
                    title="이 항목 삭제"
                    onClick={() => removeSpec(i)}
                  >
                    ×
                  </button>
                </dd>
              </div>
            ))}
          </dl>
          <button type="button" className="btn btn--ghost btn--sm pf-detail__spec-add" onClick={addSpec}>
            ＋ 스펙 항목 추가
          </button>
        </div>
      </div>

      {/* ── 상세 정보 (본문) ── */}
      <div className="pf-detail__body-sec">
        <h2 className="pf-detail__sec-title">상세 정보</h2>
        <RichEditor
          value={form.body}
          onChange={(html) => setField('body', html)}
          placeholder="제품 상세 소개를 작성하세요. (표·이미지 삽입 가능)"
        />
      </div>

      {keptImages.length ? (
        <div className="pf-detail__gallery-sec">
          <h2 className="pf-detail__sec-title">등록된 사진 (첫 장이 대표)</h2>
          <ImagePreviewList
            urls={keptImages}
            labelPrefix="사진"
            ariaLabel="등록된 사진"
            onRemove={(i) => setKeptImages((arr) => arr.filter((_, j) => j !== i))}
          />
        </div>
      ) : null}

      <div className="pf-detail__actions">
        <button type="submit" className="btn btn--primary form__submit" disabled={saving}>
          {editId ? '수정 저장' : '등록하기'}
        </button>
        {editId ? (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => { resetLocal(); onCancel(); }}
          >
            취소
          </button>
        ) : null}
        {msg ? <span className="admin__msg">{msg}</span> : null}
      </div>
    </form>
  );
}
