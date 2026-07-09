/* ============================================================
   표 편집기 — contenteditable 안의 <table> 조작
   - 행/열 추가·삭제, 병합/해제, 표 삭제, 경계 드래그
   - 공유 툴바: data-tt 버튼은 문서 위임
   - setActiveTableEditor(editor) 로 대상 전환 + 셀 하이라이트
   ============================================================ */
(function () {
  let activeEditor = null;
  let sharedToolbar = null;
  let delegated = false;
  let lastCell = null;
  let lastTable = null;

  function editorEl() {
    return activeEditor;
  }

  function currentCell() {
    const editor = editorEl();
    if (!editor) return null;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    let node = sel.getRangeAt(0).startContainer;
    if (node.nodeType === 3) node = node.parentNode;
    if (!node || !node.closest) return null;
    const cell = node.closest('td,th');
    if (cell && editor.contains(cell)) return cell;
    return null;
  }
  function tableOf(cell) {
    return cell ? cell.closest('table') : null;
  }

  function toast(msg) {
    const roots = [];
    if (sharedToolbar) roots.push(sharedToolbar);
    document.querySelectorAll('.tt-msg, .rte-float__status').forEach((el) => roots.push(el));
    const els = document.querySelectorAll('.rte-float__status, .tt-msg');
    els.forEach((el) => {
      el.textContent = msg || '';
      el.classList.toggle('is-error', !!msg);
      clearTimeout(el._t);
      if (msg) el._t = setTimeout(() => {
        el.textContent = '';
        el.classList.remove('is-error');
      }, 2200);
    });
  }

  function clearHighlights() {
    if (lastCell) lastCell.classList.remove('tt-cell-active');
    if (lastTable) lastTable.classList.remove('tt-table-active');
    lastCell = null;
    lastTable = null;
  }

  function updateHighlights() {
    clearHighlights();
    const cell = currentCell();
    if (!cell) return null;
    const table = tableOf(cell);
    cell.classList.add('tt-cell-active');
    if (table) table.classList.add('tt-table-active');
    lastCell = cell;
    lastTable = table;
    return cell;
  }

  function addRow(below) {
    const cell = currentCell();
    if (!cell) return toast('표 안 셀을 클릭한 뒤 사용하세요.');
    const tr = cell.parentNode;
    const cols = tr.children.length;
    const newTr = document.createElement('tr');
    for (let i = 0; i < cols; i++) newTr.appendChild(document.createElement('td')).textContent = '내용';
    tr.parentNode.insertBefore(newTr, below ? tr.nextSibling : tr);
    updateHighlights();
  }
  function deleteRow() {
    const cell = currentCell();
    if (!cell) return toast('표 안 셀을 클릭한 뒤 사용하세요.');
    const tr = cell.parentNode;
    const table = tableOf(cell);
    if (table.rows.length <= 1) return toast('마지막 행은 삭제할 수 없습니다.');
    tr.parentNode.removeChild(tr);
    clearHighlights();
  }
  function addCol(right) {
    const cell = currentCell();
    if (!cell) return toast('표 안 셀을 클릭한 뒤 사용하세요.');
    const idx = cell.cellIndex;
    const table = tableOf(cell);
    Array.from(table.rows).forEach((row) => {
      const ref = row.children[idx];
      const isHead = row.parentNode.tagName === 'THEAD';
      const c = document.createElement(isHead ? 'th' : 'td');
      c.textContent = isHead ? '제목' : '내용';
      if (right) row.insertBefore(c, ref ? ref.nextSibling : null);
      else row.insertBefore(c, ref || null);
    });
    updateHighlights();
  }
  function deleteCol() {
    const cell = currentCell();
    if (!cell) return toast('표 안 셀을 클릭한 뒤 사용하세요.');
    const idx = cell.cellIndex;
    const table = tableOf(cell);
    if (table.rows[0].children.length <= 1) return toast('마지막 열은 삭제할 수 없습니다.');
    Array.from(table.rows).forEach((row) => {
      if (row.children[idx]) row.removeChild(row.children[idx]);
    });
    clearHighlights();
  }

  function mergeRight() {
    const cell = currentCell();
    if (!cell) return toast('표 안 셀을 클릭한 뒤 사용하세요.');
    const next = cell.nextElementSibling;
    if (!next) return toast('오른쪽에 합칠 셀이 없습니다.');
    cell.colSpan = (cell.colSpan || 1) + (next.colSpan || 1);
    if (next.innerHTML.trim()) cell.innerHTML += ' ' + next.innerHTML;
    next.parentNode.removeChild(next);
    updateHighlights();
  }
  function mergeDown() {
    const cell = currentCell();
    if (!cell) return toast('표 안 셀을 클릭한 뒤 사용하세요.');
    const table = tableOf(cell);
    const tr = cell.parentNode;
    const rowIdx = tr.rowIndex;
    const colIdx = cell.cellIndex;
    const belowRow = table.rows[rowIdx + 1];
    if (!belowRow) return toast('아래에 합칠 셀이 없습니다.');
    const belowCell = belowRow.children[colIdx];
    if (!belowCell) return toast('아래에 합칠 셀이 없습니다.');
    cell.rowSpan = (cell.rowSpan || 1) + (belowCell.rowSpan || 1);
    if (belowCell.innerHTML.trim()) cell.innerHTML += ' ' + belowCell.innerHTML;
    belowRow.removeChild(belowCell);
    updateHighlights();
  }
  function unmerge() {
    const cell = currentCell();
    if (!cell) return toast('표 안 셀을 클릭한 뒤 사용하세요.');
    const cs = cell.colSpan || 1;
    const rs = cell.rowSpan || 1;
    if (cs === 1 && rs === 1) return toast('합쳐진 셀이 아닙니다.');
    const isHead = cell.parentNode.parentNode.tagName === 'THEAD';
    for (let i = 1; i < cs; i++) {
      const c = document.createElement(isHead ? 'th' : 'td');
      c.textContent = isHead ? '제목' : '내용';
      cell.parentNode.insertBefore(c, cell.nextSibling);
    }
    cell.colSpan = 1;
    if (rs > 1) {
      const table = tableOf(cell);
      const rowIdx = cell.parentNode.rowIndex;
      const colIdx = cell.cellIndex;
      for (let i = 1; i < rs; i++) {
        const row = table.rows[rowIdx + i];
        if (!row) continue;
        const c = document.createElement('td');
        c.textContent = '내용';
        row.insertBefore(c, row.children[colIdx] || null);
      }
      cell.rowSpan = 1;
    }
    updateHighlights();
  }

  function deleteTable() {
    const cell = currentCell();
    if (!cell) return toast('표 안 셀을 클릭한 뒤 사용하세요.');
    const table = tableOf(cell);
    if (!table) return;
    if (!confirm('이 표를 삭제할까요?')) return;
    table.parentNode.removeChild(table);
    clearHighlights();
    toast('표를 삭제했습니다.');
  }

  function bindResize(editor) {
    if (!editor || editor._ttResizeBound) return;
    editor._ttResizeBound = true;
    const EDGE = 6;
    let drag = null;
    function colCells(table, idx) {
      return Array.from(table.rows)
        .map((r) => r.children[idx])
        .filter(Boolean);
    }
    editor.addEventListener('mousemove', (e) => {
      if (drag) return;
      const cell = e.target.closest && e.target.closest('td,th');
      if (!cell || !editor.contains(cell)) {
        if (editor.style.cursor === 'col-resize' || editor.style.cursor === 'row-resize') editor.style.cursor = '';
        return;
      }
      const r = cell.getBoundingClientRect();
      if (r.right - e.clientX <= EDGE) editor.style.cursor = 'col-resize';
      else if (r.bottom - e.clientY <= EDGE) editor.style.cursor = 'row-resize';
      else editor.style.cursor = '';
    });
    editor.addEventListener('mousedown', (e) => {
      const cell = e.target.closest && e.target.closest('td,th');
      if (!cell || !editor.contains(cell)) return;
      const r = cell.getBoundingClientRect();
      const onRight = r.right - e.clientX <= EDGE;
      const onBottom = r.bottom - e.clientY <= EDGE;
      if (!onRight && !onBottom) return;
      e.preventDefault();
      const table = tableOf(cell);
      drag = onRight
        ? { mode: 'col', startX: e.clientX, startW: r.width, cells: colCells(table, cell.cellIndex) }
        : { mode: 'row', startY: e.clientY, startH: r.height, row: cell.parentNode };
      document.body.classList.add('tt-resizing');
    });
    document.addEventListener('mousemove', (e) => {
      if (!drag || activeEditor !== editor) return;
      if (drag.mode === 'col') {
        const w = Math.max(40, Math.round(drag.startW + (e.clientX - drag.startX)));
        drag.cells.forEach((c) => (c.style.width = w + 'px'));
      } else {
        const h = Math.max(24, Math.round(drag.startH + (e.clientY - drag.startY)));
        drag.row.style.height = h + 'px';
      }
    });
    document.addEventListener('mouseup', () => {
      if (!drag) return;
      drag = null;
      document.body.classList.remove('tt-resizing');
    });
  }

  function ensureDelegate() {
    if (delegated) return;
    delegated = true;
    document.addEventListener(
      'mousedown',
      (e) => {
        const btn = e.target.closest && e.target.closest('button[data-tt]');
        if (!btn) return;
        if (!btn.closest('.tt-toolbar, #table-toolbar, #react-table-toolbar')) return;
        e.preventDefault();
        const actions = {
          'row-add': () => addRow(true),
          'row-del': deleteRow,
          'col-add': () => addCol(true),
          'col-del': deleteCol,
          'merge-right': mergeRight,
          'merge-down': mergeDown,
          unmerge: unmerge,
          'table-del': deleteTable,
        };
        const fn = actions[btn.dataset.tt];
        if (fn) fn();
      },
      true
    );
  }

  function initTableEditor(editor, toolbar) {
    ensureDelegate();
    if (toolbar) sharedToolbar = toolbar;
    if (editor) {
      activeEditor = editor;
      bindResize(editor);
      updateHighlights();
    }
  }

  function setActiveTableEditor(editor) {
    if (!editor) return;
    ensureDelegate();
    activeEditor = editor;
    bindResize(editor);
    updateHighlights();
  }

  function isInTable() {
    return !!currentCell();
  }

  function refreshTableUi() {
    return !!updateHighlights();
  }

  function clearTableUi() {
    clearHighlights();
  }

  window.initTableEditor = initTableEditor;
  window.setActiveTableEditor = setActiveTableEditor;
  window.tableEditorInCell = isInTable;
  window.refreshTableEditorUi = refreshTableUi;
  window.clearTableEditorUi = clearTableUi;
})();
