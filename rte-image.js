/* ============================================================
   리치 에디터 본문 이미지 삽입 + 크기/정렬 조절
   bindImageInsert(editorEl, buttonEl)
   - 버튼 클릭 → 파일 선택 → /api/upload 업로드 → 커서 위치에 <img> 삽입
   - 본문의 이미지를 클릭하면 크기(작게/중간/크게/원본)·정렬 도구가 나타남
     (설정한 크기는 인라인 width 로 저장되어 공개 상세 페이지에도 그대로 반영)
   ============================================================ */
(function () {
  var bar = null, current = null;

  function ensureBar() {
    if (bar) return bar;
    bar = document.createElement('div');
    bar.id = 'rte-img-bar';
    bar.style.cssText = 'position:absolute;z-index:2147483000;display:none;gap:2px;padding:5px;'
      + 'background:#16181d;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.28);'
      + "font-family:'Noto Sans KR',sans-serif;white-space:nowrap;";
    var defs = [
      { w: '25%', t: '작게' }, { w: '50%', t: '중간' }, { w: '75%', t: '크게' }, { w: '', t: '원본' },
      { sep: 1 },
      { align: 'left', t: '좌' }, { align: 'center', t: '중앙' }, { align: 'right', t: '우' },
    ];
    defs.forEach(function (d) {
      if (d.sep) {
        var s = document.createElement('span');
        s.style.cssText = 'width:1px;margin:3px 2px;background:rgba(255,255,255,.22);display:inline-block;';
        bar.appendChild(s);
        return;
      }
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = d.t;
      b.style.cssText = 'height:28px;min-width:34px;padding:0 9px;border:0;border-radius:6px;'
        + 'background:transparent;color:#fff;font-size:12px;cursor:pointer;line-height:1;';
      b.addEventListener('mouseenter', function () { b.style.background = 'rgba(255,255,255,.16)'; });
      b.addEventListener('mouseleave', function () { b.style.background = 'transparent'; });
      b.addEventListener('mousedown', function (e) { e.preventDefault(); });
      b.addEventListener('click', function (e) {
        e.preventDefault();
        if (!current) return;
        if (d.align) setAlign(current, d.align);
        else setWidth(current, d.w);
        position(current);
        editorOf(current) && editorOf(current).dispatchEvent(new Event('input', { bubbles: true }));
      });
      bar.appendChild(b);
    });
    document.body.appendChild(bar);
    document.addEventListener('mousedown', function (e) {
      if (bar.contains(e.target)) return;
      if (e.target && e.target.tagName === 'IMG') return;
      hideBar();
    });
    window.addEventListener('scroll', function () { if (current) position(current); }, true);
    window.addEventListener('resize', function () { if (current) position(current); });
    return bar;
  }

  function editorOf(img) {
    var n = img;
    while (n && n !== document.body) { if (n.getAttribute && n.getAttribute('contenteditable') === 'true') return n; n = n.parentNode; }
    return null;
  }
  function setWidth(img, w) {
    img.style.maxWidth = '100%';
    if (w) img.style.width = w; else img.style.removeProperty('width');
    if (!/border-radius/.test(img.style.cssText)) img.style.borderRadius = '8px';
  }
  function setAlign(img, a) {
    img.style.display = 'block';
    if (a === 'center') img.style.margin = '10px auto';
    else if (a === 'right') img.style.margin = '10px 0 10px auto';
    else img.style.margin = '10px 0';
  }
  function position(img) {
    var r = img.getBoundingClientRect();
    bar.style.display = 'flex';
    var top = r.top + window.scrollY - bar.offsetHeight - 8;
    if (top < window.scrollY + 4) top = r.bottom + window.scrollY + 8;
    bar.style.top = top + 'px';
    bar.style.left = Math.max(8, r.left + window.scrollX) + 'px';
  }
  function showBar(img) {
    ensureBar();
    if (current && current !== img) current.style.outline = '';
    current = img;
    img.style.outline = '2px solid #0096d6';
    img.style.outlineOffset = '2px';
    position(img);
  }
  function hideBar() {
    if (bar) bar.style.display = 'none';
    if (current) { current.style.outline = ''; current.style.removeProperty('outline-offset'); current = null; }
  }

  function wireImageResize(editor) {
    if (!editor || editor._imgResizeWired) return;
    editor._imgResizeWired = true;
    editor.addEventListener('click', function (e) {
      var img = e.target && e.target.closest ? e.target.closest('img') : null;
      if (img && editor.contains(img)) showBar(img);
      else hideBar();
    });
  }

  function bindImageInsert(editor, btn) {
    if (!editor || !btn) return;
    wireImageResize(editor);
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
          // 방금 삽입한 이미지 자동 선택 → 바로 크기 조절 가능
          setTimeout(function () {
            var imgs = editor.querySelectorAll('img[src="' + d.url + '"]');
            var last = imgs[imgs.length - 1];
            if (last) showBar(last);
          }, 0);
        })
        .catch((err) => alert(err.message));
    });
  }
  window.bindImageInsert = bindImageInsert;
  window.wireImageResize = wireImageResize;
})();
