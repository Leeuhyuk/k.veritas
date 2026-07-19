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

  const previewThumb = files[0] ? URL.createObjectURL(files[0]) : keptImages[0] || '';

  // 스펙 표(상세 페이지와 동일: 소재·가공·산업 + 모델)
  const specRows = [
    ['모델', 'model', 'KV-PT 400'],
    ['소재', 'material', 'BIFMA X5.1 · 반복하중'],
    ['가공', 'process', '시험기 설계·제작 / 설치·교정'],
    ['산업', 'industry', '자동차, 반도체'],
  ];

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
          {keptImages.length ? (
            <ImagePreviewList
              urls={keptImages}
              labelPrefix="기존 사진"
              ariaLabel="기존 사진"
              onRemove={(i) => setKeptImages((arr) => arr.filter((_, j) => j !== i))}
            />
          ) : null}
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
          <input
            className="pf-detail__lead"
            type="text"
            placeholder="한 줄 요약 (상세 페이지 부제)"
            value={form.summary}
            onChange={(e) => setField('summary', e.target.value)}
          />

          <dl className="pf-detail__spec">
            {specRows.map(([label, key, ph]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>
                  <input
                    type="text"
                    placeholder={ph}
                    value={form[key]}
                    onChange={(e) => setField(key, e.target.value)}
                  />
                </dd>
              </div>
            ))}
          </dl>
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
