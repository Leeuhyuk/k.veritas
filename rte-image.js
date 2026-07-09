/* ============================================================
   리치 에디터 본문 이미지 삽입
   bindImageInsert(editorEl, buttonEl)
   버튼 클릭 → 파일 선택 → /api/upload 업로드 → 커서 위치에 <img> 삽입
   ============================================================ */
(function () {
  function bindImageInsert(editor, btn) {
    if (!editor || !btn) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    let savedRange = null;

    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const sel = window.getSelection();
      if (sel && sel.rangeCount && editor.contains(sel.anchorNode)) savedRange = sel.getRangeAt(0);
      else savedRange = null;
      input.click();
    });

    input.addEventListener('change', () => {
      const f = input.files[0];
      if (!f) return;
      const fd = new FormData();
      fd.append('image', f);
      fetch('/api/upload', { method: 'POST', body: fd })
        .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.message || '업로드 실패'); return d; })
        .then((d) => {
          editor.focus();
          const s = window.getSelection();
          if (savedRange) { s.removeAllRanges(); s.addRange(savedRange); }
          else if (!(s.rangeCount && editor.contains(s.anchorNode))) {
            const r = document.createRange(); r.selectNodeContents(editor); r.collapse(false);
            s.removeAllRanges(); s.addRange(r);
          }
          document.execCommand('insertHTML', false, '<img src="' + d.url + '" style="max-width:100%;border-radius:8px" />');
          input.value = '';
        })
        .catch((err) => alert(err.message));
    });
  }
  window.bindImageInsert = bindImageInsert;
})();
