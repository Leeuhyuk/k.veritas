import { useEffect, useRef, useState } from 'react';
import { adminApi } from '../api/client.js';

const GRID_MAX = 6;

/**
 * contentEditable 리치 에디터
 * — 서식 | 표 모드 전환, 표 그리드 피커, table-editor 연동
 */
export default function RichEditor({ value, onChange, placeholder }) {
  const wrapRef = useRef(null);
  const editorRef = useRef(null);
  const toolbarRef = useRef(null);
  const savedRange = useRef(null);
  const lastExternal = useRef(value);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('format'); // format | table
  const [inTable, setInTable] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hoverSize, setHoverSize] = useState({ r: 3, c: 3 });

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (value !== lastExternal.current && value !== el.innerHTML) {
      el.innerHTML = value || '';
      lastExternal.current = value;
    }
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    const tick = () => {
      placeToolbar();
      refreshTableState();
    };
    window.addEventListener('scroll', tick, true);
    window.addEventListener('resize', tick);
    document.addEventListener('selectionchange', refreshTableState);
    tick();
    return () => {
      window.removeEventListener('scroll', tick, true);
      window.removeEventListener('resize', tick);
      document.removeEventListener('selectionchange', refreshTableState);
    };
  }, [open, mode]);

  function ensureTableEditor() {
    const editor = editorRef.current;
    if (!editor) return;
    if (!window.initTableEditor) {
      if (!window.__tableEditorLoading) {
        window.__tableEditorLoading = true;
        const s = document.createElement('script');
        s.src = '/table-editor.js';
        s.onload = () => {
          window.__tableEditorLoading = false;
          ensureTableEditor();
        };
        document.head.appendChild(s);
      }
      return;
    }
    window.initTableEditor(editor, document.getElementById('react-table-toolbar'));
    if (window.setActiveTableEditor) window.setActiveTableEditor(editor);
  }

  function refreshTableState() {
    const on = !!(window.refreshTableEditorUi
      ? window.refreshTableEditorUi()
      : window.tableEditorInCell && window.tableEditorInCell());
    setInTable(on);
    // 표 셀 안에서도 서식 탭 유지 — 자동으로「표」모드로 넘기지 않음
  }

  function placeToolbar() {
    const editor = editorRef.current;
    const bar = toolbarRef.current;
    if (!editor || !bar || !open) return;
    const rect = editor.getBoundingClientRect();
    const pad = 8;
    const h = bar.offsetHeight || 100;
    const w = bar.offsetWidth || 520;
    let top = rect.top - h - pad;
    let left = rect.left;
    if (top < 8) top = rect.bottom + pad;
    if (left + w > window.innerWidth - 8) left = Math.max(8, window.innerWidth - w - 8);
    if (left < 8) left = 8;
    bar.style.top = `${Math.round(top)}px`;
    bar.style.left = `${Math.round(left)}px`;
  }

  function saveSelection() {
    const sel = window.getSelection();
    const el = editorRef.current;
    if (sel && sel.rangeCount && el && el.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0);
    }
  }

  function restoreSelection() {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    if (savedRange.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  }

  function emit() {
    const html = editorRef.current ? editorRef.current.innerHTML : '';
    lastExternal.current = html;
    onChange(html);
  }

  function exec(cmd, val) {
    restoreSelection();
    try {
      document.execCommand('styleWithCSS', false, true);
    } catch {
      /* ignore */
    }
    document.execCommand(cmd, false, val ?? null);
    saveSelection();
    emit();
    ensureTableEditor();
    placeToolbar();
    refreshTableState();
  }

  function onInput() {
    emit();
    refreshTableState();
  }

  function onFocus() {
    saveSelection();
    setOpen(true);
    ensureTableEditor();
    requestAnimationFrame(() => {
      placeToolbar();
      refreshTableState();
    });
  }

  function onBlur(e) {
    const next = e.relatedTarget;
    if (next && toolbarRef.current && toolbarRef.current.contains(next)) return;
    if (next && wrapRef.current && wrapRef.current.contains(next)) return;
    setTimeout(() => {
      const ae = document.activeElement;
      if (toolbarRef.current && toolbarRef.current.contains(ae)) return;
      if (editorRef.current && editorRef.current === ae) return;
      setOpen(false);
      setPickerOpen(false);
      if (window.clearTableEditorUi) window.clearTableEditorUi();
    }, 160);
  }

  async function insertImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        const d = await adminApi.uploadImage(file);
        restoreSelection();
        document.execCommand(
          'insertHTML',
          false,
          `<img src="${d.url}" style="max-width:100%;border-radius:8px" alt="" />`
        );
        emit();
        placeToolbar();
      } catch (err) {
        alert(err.message || '이미지 업로드 실패');
      }
    };
    input.click();
  }

  function insertTableAt(rows, cols) {
    let html = '<table><thead><tr>';
    for (let c = 0; c < cols; c++) html += `<th>제목${c + 1}</th>`;
    html += '</tr></thead><tbody>';
    for (let r = 0; r < rows - 1; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) html += '<td>내용</td>';
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';
    restoreSelection();
    document.execCommand('insertHTML', false, html);
    emit();
    setPickerOpen(false);
    setMode('table');
    ensureTableEditor();
    placeToolbar();
    refreshTableState();
  }

  function insertLink() {
    const url = prompt('링크 주소(URL)', 'https://');
    if (url) exec('createLink', url);
  }

  const cells = [];
  for (let r = 1; r <= GRID_MAX; r++) {
    for (let c = 1; c <= GRID_MAX; c++) {
      cells.push({ r, c });
    }
  }

  return (
    <div className={`rte-wrap${open ? ' is-open' : ''}`} ref={wrapRef}>
      {open ? (
        <div
          className="rte-float is-open"
          ref={toolbarRef}
          role="toolbar"
          aria-label="텍스트 서식"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="rte-float__panel" data-mode={mode}>
            <div className="rte-float__modes">
              <button
                type="button"
                className={`rte-mode${mode === 'format' ? ' is-active' : ''}`}
                onClick={() => setMode('format')}
              >
                서식
              </button>
              <button
                type="button"
                className={`rte-mode${mode === 'table' ? ' is-active' : ''}${inTable ? ' has-table' : ''}`}
                onClick={() => setMode('table')}
              >
                표
              </button>
              <span className="rte-float__grow" />
              <button
                type="button"
                className="rte-btn rte-float__close"
                title="닫기"
                onClick={() => {
                  setOpen(false);
                  setPickerOpen(false);
                }}
              >
                ×
              </button>
            </div>

            {mode === 'format' ? (
              <div className="rte-float__pane">
                <div className="rte-float__inner rte-toolbar">
                  <button type="button" className="rte-btn" onClick={() => exec('undo')} title="실행 취소">
                    ↶
                  </button>
                  <button type="button" className="rte-btn" onClick={() => exec('redo')} title="다시 실행">
                    ↷
                  </button>
                  <span className="rte-sep" />
                  <button type="button" className="rte-btn" onClick={() => exec('bold')} title="굵게">
                    <b>B</b>
                  </button>
                  <button type="button" className="rte-btn" onClick={() => exec('italic')} title="기울임">
                    <i>I</i>
                  </button>
                  <button type="button" className="rte-btn" onClick={() => exec('underline')} title="밑줄">
                    <u>U</u>
                  </button>
                  <button type="button" className="rte-btn" onClick={() => exec('strikeThrough')} title="취소선">
                    <s>S</s>
                  </button>
                  <span className="rte-sep" />
                  <button type="button" className="rte-btn" onClick={() => exec('formatBlock', '<h2>')} title="제목">
                    제목
                  </button>
                  <button type="button" className="rte-btn" onClick={() => exec('formatBlock', '<h3>')} title="소제목">
                    소제목
                  </button>
                  <button type="button" className="rte-btn" onClick={() => exec('formatBlock', '<p>')} title="본문">
                    본문
                  </button>
                  <span className="rte-sep" />
                  <button type="button" className="rte-btn" onClick={() => exec('justifyLeft')} title="왼쪽">
                    왼쪽
                  </button>
                  <button type="button" className="rte-btn" onClick={() => exec('justifyCenter')} title="가운데">
                    가운데
                  </button>
                  <button type="button" className="rte-btn" onClick={() => exec('justifyRight')} title="오른쪽">
                    오른쪽
                  </button>
                  <span className="rte-sep" />
                  <button type="button" className="rte-btn" onClick={() => exec('insertUnorderedList')} title="목록">
                    • 목록
                  </button>
                  <button type="button" className="rte-btn" onClick={() => exec('insertOrderedList')} title="번호">
                    1.
                  </button>
                  <span className="rte-sep" />
                  <button type="button" className="rte-btn" onClick={insertLink} title="링크">
                    링크
                  </button>
                  <button type="button" className="rte-btn" onClick={() => exec('insertHorizontalRule')} title="구분선">
                    구분선
                  </button>
                  <button type="button" className="rte-btn" onClick={insertImage} title="이미지">
                    이미지
                  </button>
                  <div className="rte-table-wrap">
                    <button
                      type="button"
                      className="rte-btn rte-btn--accent"
                      onClick={() => setPickerOpen((v) => !v)}
                      title="표 삽입"
                    >
                      표 삽입 ▾
                    </button>
                    {pickerOpen ? (
                      <div className="rte-table-picker">
                        <p className="rte-table-picker__title">표 크기 선택</p>
                        <div
                          className="rte-table-picker__grid"
                          style={{ gridTemplateColumns: `repeat(${GRID_MAX}, 18px)` }}
                        >
                          {cells.map(({ r, c }) => (
                            <button
                              key={`${r}-${c}`}
                              type="button"
                              className={`rte-table-picker__cell${
                                r <= hoverSize.r && c <= hoverSize.c ? ' is-on' : ''
                              }`}
                              onMouseEnter={() => setHoverSize({ r, c })}
                              onClick={() => insertTableAt(r, c)}
                              aria-label={`${r}행 ${c}열`}
                            />
                          ))}
                        </div>
                        <p className="rte-table-picker__size">
                          {hoverSize.r} × {hoverSize.c} (첫 줄 제목)
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className={`rte-float__pane${inTable ? ' is-in-cell' : ''}`}>
                <div className="rte-float__inner rte-toolbar tt-toolbar is-active" id="react-table-toolbar">
                  <button type="button" className="rte-btn" data-tt="row-add" title="아래에 행 추가">
                    행 추가
                  </button>
                  <button type="button" className="rte-btn" data-tt="row-del" title="현재 행 삭제">
                    행 삭제
                  </button>
                  <button type="button" className="rte-btn" data-tt="col-add" title="오른쪽에 열 추가">
                    열 추가
                  </button>
                  <button type="button" className="rte-btn" data-tt="col-del" title="현재 열 삭제">
                    열 삭제
                  </button>
                  <span className="rte-sep" />
                  <button type="button" className="rte-btn" data-tt="merge-right" title="오른쪽 셀과 합치기">
                    → 합치기
                  </button>
                  <button type="button" className="rte-btn" data-tt="merge-down" title="아래 셀과 합치기">
                    ↓ 합치기
                  </button>
                  <button type="button" className="rte-btn" data-tt="unmerge" title="합치기 해제">
                    합치기 해제
                  </button>
                  <span className="rte-sep" />
                  <button type="button" className="rte-btn rte-btn--danger" data-tt="table-del" title="표 전체 삭제">
                    표 삭제
                  </button>
                </div>
                <p className="rte-float__hint">
                  {inTable
                    ? '선택한 셀 기준으로 행·열을 조절합니다. 셀 오른쪽/아래 경계를 드래그해 크기를 바꿀 수 있습니다. 첫 줄은 제목 행입니다.'
                    : '표 안 셀을 클릭하면 행·열·합치기 도구를 사용할 수 있습니다. 표 삽입은 「서식」탭에서 하세요.'}
                </p>
              </div>
            )}

            <p className="rte-float__status" aria-live="polite" />
          </div>
        </div>
      ) : null}
      <div
        ref={editorRef}
        className={`rte-editor${open ? ' is-editing' : ''}`}
        contentEditable
        data-placeholder={placeholder}
        onInput={onInput}
        onKeyUp={() => {
          saveSelection();
          ensureTableEditor();
          refreshTableState();
        }}
        onMouseUp={() => {
          saveSelection();
          ensureTableEditor();
          refreshTableState();
        }}
        onFocus={onFocus}
        onBlur={onBlur}
        suppressContentEditableWarning
      />
    </div>
  );
}
