/**
 * 상세 페이지 이미지 확대 보기
 * - 마우스 휠: 확대/축소
 * - 클릭 후 드래그: 위치 이동
 * 사용: DetailLightbox.bind(containerElement)
 */
(function (global) {
  'use strict';

  var SELECTOR = 'img.detail__cover, .detail__gallery img, .detail__body img';
  var MIN_SCALE = 0.5;
  var MAX_SCALE = 6;
  var overlay = null;
  var keyHandler = null;
  var wheelHandler = null;

  function esc(s) {
    return String(s || '').replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function close() {
    if (keyHandler) {
      document.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }
    if (wheelHandler && overlay) {
      overlay.removeEventListener('wheel', wheelHandler);
      wheelHandler = null;
    }
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    overlay = null;
    document.body.style.overflow = '';
  }

  function open(items, startIndex) {
    if (!items || !items.length) return;
    close();

    var index = Math.min(Math.max(0, startIndex | 0), items.length - 1);
    var canNav = items.length > 1;

    var scale = 1;
    var tx = 0;
    var ty = 0;
    var dragging = false;
    var startX = 0;
    var startY = 0;
    var originTx = 0;
    var originTy = 0;

    overlay = document.createElement('div');
    overlay.className = 'site-lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '이미지 확대 보기');
    overlay.innerHTML =
      '<div class="site-lightbox__panel">' +
      '  <div class="site-lightbox__bar">' +
      '    <p class="site-lightbox__title"></p>' +
      '    <div class="site-lightbox__tools">' +
      '      <button type="button" class="btn btn--ghost btn--sm site-lightbox__zoom-out" aria-label="축소">−</button>' +
      '      <span class="site-lightbox__zoom-label">100%</span>' +
      '      <button type="button" class="btn btn--ghost btn--sm site-lightbox__zoom-in" aria-label="확대">+</button>' +
      '      <button type="button" class="btn btn--ghost btn--sm site-lightbox__zoom-reset" aria-label="원래 크기">맞춤</button>' +
      '      <button type="button" class="btn btn--ghost btn--sm site-lightbox__close">닫기</button>' +
      '    </div>' +
      '  </div>' +
      '  <div class="site-lightbox__stage">' +
      (canNav
        ? '<button type="button" class="site-lightbox__nav site-lightbox__nav--prev" aria-label="이전 사진">‹</button>'
        : '') +
      '    <div class="site-lightbox__viewport">' +
      '      <img class="site-lightbox__img" alt="" draggable="false" />' +
      '    </div>' +
      (canNav
        ? '<button type="button" class="site-lightbox__nav site-lightbox__nav--next" aria-label="다음 사진">›</button>'
        : '') +
      '  </div>' +
      (items.length
        ? '  <div class="site-lightbox__thumbs" role="list" aria-label="사진 목록"></div>'
        : '') +
      '  <p class="site-lightbox__hint">' +
      '휠로 확대·축소 · 드래그로 이동 · 더블클릭 확대/맞춤' +
      (canNav ? ' · ← → 넘기기' : '') +
      ' · Esc 닫기</p>' +
      '</div>';

    var titleEl = overlay.querySelector('.site-lightbox__title');
    var imgEl = overlay.querySelector('.site-lightbox__img');
    var viewport = overlay.querySelector('.site-lightbox__viewport');
    var thumbsEl = overlay.querySelector('.site-lightbox__thumbs');
    var zoomLabel = overlay.querySelector('.site-lightbox__zoom-label');
    var closeBtn = overlay.querySelector('.site-lightbox__close');
    var zoomInBtn = overlay.querySelector('.site-lightbox__zoom-in');
    var zoomOutBtn = overlay.querySelector('.site-lightbox__zoom-out');
    var zoomResetBtn = overlay.querySelector('.site-lightbox__zoom-reset');
    var prevBtn = overlay.querySelector('.site-lightbox__nav--prev');
    var nextBtn = overlay.querySelector('.site-lightbox__nav--next');

    // 하단 썸네일 생성
    if (thumbsEl) {
      items.forEach(function (item, i) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'site-lightbox__thumb';
        btn.setAttribute('role', 'listitem');
        btn.setAttribute('aria-label', (item.name || '사진') + ' ' + (i + 1));
        btn.setAttribute('data-index', String(i));
        var thumbImg = document.createElement('img');
        thumbImg.src = item.src;
        thumbImg.alt = '';
        thumbImg.draggable = false;
        btn.appendChild(thumbImg);
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          show(i);
        });
        thumbsEl.appendChild(btn);
      });
    }

    function updateThumbs() {
      if (!thumbsEl) return;
      var buttons = thumbsEl.querySelectorAll('.site-lightbox__thumb');
      for (var t = 0; t < buttons.length; t++) {
        var active = t === index;
        buttons[t].classList.toggle('is-active', active);
        buttons[t].setAttribute('aria-current', active ? 'true' : 'false');
        if (active) {
          try {
            buttons[t].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          } catch (err) {
            buttons[t].scrollIntoView(false);
          }
        }
      }
    }

    function applyTransform() {
      imgEl.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + scale + ')';
      zoomLabel.textContent = Math.round(scale * 100) + '%';
      viewport.classList.toggle('is-zoomed', scale > 1.02);
      viewport.classList.toggle('is-dragging', dragging);
    }

    function resetView() {
      scale = 1;
      tx = 0;
      ty = 0;
      applyTransform();
    }

    function clampScale(s) {
      return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
    }

    function zoomAt(nextScale, clientX, clientY) {
      var rect = viewport.getBoundingClientRect();
      var cx = clientX != null ? clientX - rect.left - rect.width / 2 : 0;
      var cy = clientY != null ? clientY - rect.top - rect.height / 2 : 0;
      var prev = scale;
      var next = clampScale(nextScale);
      if (next === prev) return;

      // 커서 기준으로 확대되도록 오프셋 보정
      tx = cx - ((cx - tx) * next) / prev;
      ty = cy - ((cy - ty) * next) / prev;
      scale = next;
      if (scale <= 1.02) {
        scale = 1;
        tx = 0;
        ty = 0;
      }
      applyTransform();
    }

    function show(i) {
      index = (i + items.length) % items.length;
      var item = items[index];
      imgEl.src = item.src;
      imgEl.alt = item.name || '확대 이미지';
      titleEl.innerHTML =
        esc(item.name || '이미지') +
        (items.length > 1
          ? ' <span class="site-lightbox__count">· ' + (index + 1) + ' / ' + items.length + '</span>'
          : '');
      resetView();
      updateThumbs();
    }

    function go(delta) {
      if (!canNav) return;
      show(index + delta);
    }

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    closeBtn.addEventListener('click', close);
    zoomInBtn.addEventListener('click', function () {
      zoomAt(scale * 1.25);
    });
    zoomOutBtn.addEventListener('click', function () {
      zoomAt(scale / 1.25);
    });
    zoomResetBtn.addEventListener('click', resetView);
    if (prevBtn) prevBtn.addEventListener('click', function (e) { e.stopPropagation(); go(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function (e) { e.stopPropagation(); go(1); });

    wheelHandler = function (e) {
      e.preventDefault();
      var factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAt(scale * factor, e.clientX, e.clientY);
    };
    // 오버레이 전체에서 휠 동작 (스크롤 방지)
    overlay.addEventListener('wheel', wheelHandler, { passive: false });

    viewport.addEventListener('dblclick', function (e) {
      e.preventDefault();
      if (scale > 1.1) resetView();
      else zoomAt(2.5, e.clientX, e.clientY);
    });

    viewport.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      // 네비 버튼 영역은 제외
      if (e.target.closest && e.target.closest('.site-lightbox__nav')) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      originTx = tx;
      originTy = ty;
      try {
        viewport.setPointerCapture(e.pointerId);
      } catch (err) { /* ignore */ }
      applyTransform();
    });

    viewport.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      tx = originTx + dx;
      ty = originTy + dy;
      applyTransform();
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      applyTransform();
      try {
        if (e && e.pointerId != null) viewport.releasePointerCapture(e.pointerId);
      } catch (err) { /* ignore */ }
    }
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);

    // 확대 상태 드래그 중 텍스트 선택 방지
    viewport.addEventListener('dragstart', function (e) {
      e.preventDefault();
    });

    keyHandler = function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'ArrowLeft' && !e.altKey) {
        e.preventDefault();
        go(-1);
      } else if (e.key === 'ArrowRight' && !e.altKey) {
        e.preventDefault();
        go(1);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomAt(scale * 1.2);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomAt(scale / 1.2);
      } else if (e.key === '0') {
        e.preventDefault();
        resetView();
      }
    };
    document.addEventListener('keydown', keyHandler);
    document.body.style.overflow = 'hidden';
    document.body.appendChild(overlay);
    show(index);
    closeBtn.focus();
  }

  function collect(root) {
    var nodes = Array.prototype.slice.call(root.querySelectorAll(SELECTOR));
    var items = [];
    var map = [];
    nodes.forEach(function (img) {
      var src = img.getAttribute('src') || img.currentSrc || '';
      if (!src || img.classList.contains('is-ph')) {
        map.push(-1);
        return;
      }
      map.push(items.length);
      items.push({
        src: src,
        name: img.getAttribute('alt') || '',
      });
    });
    return { nodes: nodes, items: items, map: map };
  }

  function bind(root) {
    if (!root) return;
    var data = collect(root);
    if (!data.items.length) return;

    data.nodes.forEach(function (img, i) {
      var itemIndex = data.map[i];
      if (itemIndex < 0) return;

      img.classList.add('is-zoomable');
      if (!img.hasAttribute('tabindex')) img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      var label = (img.getAttribute('alt') || '이미지') + ' 크게 보기';
      img.setAttribute('aria-label', label);

      function openHere(e) {
        e.preventDefault();
        e.stopPropagation();
        var fresh = collect(root);
        var src = img.getAttribute('src') || img.currentSrc || '';
        var idx = 0;
        for (var j = 0; j < fresh.items.length; j++) {
          if (fresh.items[j].src === src) {
            idx = j;
            break;
          }
        }
        open(fresh.items, idx);
      }

      img.addEventListener('click', openHere);
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openHere(e);
        }
      });
    });
  }

  global.DetailLightbox = {
    bind: bind,
    close: close,
  };
})(window);
