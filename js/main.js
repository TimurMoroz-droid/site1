/* ==========================================================
   Древо-Арт — интерактив лендинга (чистый JS, без зависимостей)
   Фильтры портфолио · Лайтбокс-слайдер · Слайдер отзывов ·
   Мобильное меню · Валидация и отправка форм · Reveal-анимации
   ========================================================== */
(function () {
  'use strict';

  /* ---------- Настройки интеграций (заменить при переносе на WP) ----------
     На WordPress формы подключаются к Elementor Forms / WPForms,
     которые дублируют заявки на e-mail заказчика и в Telegram-бот.
     Здесь — универсальный обработчик-заглушка с точкой интеграции. */
  var FORM_ENDPOINT = ''; // например: '/wp-json/drevo-art/v1/lead' или сервис-прокси

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ================= Мобильное меню ================= */
  var burger = $('#burger');
  var mobileMenu = $('#mobileMenu');
  if (burger && mobileMenu) {
    burger.addEventListener('click', function () {
      var open = mobileMenu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });
    $$('a', mobileMenu).forEach(function (link) {
      link.addEventListener('click', function () {
        mobileMenu.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ================= Изображения: lazy fallback =================
     Если фото заказчика ещё не загружены — плавно показываем
     крафтовый плейсхолдер вместо битой картинки. */
  function markImages() {
    $$('img').forEach(function (img) {
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add('loaded');
      } else {
        img.addEventListener('load', function () { img.classList.add('loaded'); });
        img.addEventListener('error', function () { img.classList.remove('loaded'); });
      }
    });
  }
  markImages();

  /* ================= Блок 3: Фильтры портфолио ================= */
  var filterBtns = $$('.filter-btn');
  var workCards = $$('.work-card');

  function applyFilter(cat) {
    workCards.forEach(function (card) {
      var show = cat === 'all' || card.dataset.category === cat;
      card.classList.toggle('hidden', !show);
    });
  }

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      applyFilter(btn.dataset.filter);
      buildVisibleList();
    });
  });

  /* ================= Лайтбокс с слайдером по видимым работам ========== */
  var lightbox = $('#lightbox');
  var lbImg = $('#lbImg');
  var lbCaption = $('#lbCaption');
  var lbClose = $('#lbClose');
  var lbPrev = $('#lbPrev');
  var lbNext = $('#lbNext');
  var visibleWorks = [];
  var lbIndex = 0;

  function buildVisibleList() {
    visibleWorks = workCards.filter(function (c) { return !c.classList.contains('hidden'); })
      .map(function (card) {
        var img = $('img', card);
        var title = $('h3', card);
        return { src: img.src, alt: img.alt, title: title ? title.textContent : '' };
      });
  }
  buildVisibleList();

  function showLb(i) {
    if (!visibleWorks.length) return;
    lbIndex = (i + visibleWorks.length) % visibleWorks.length;
    var w = visibleWorks[lbIndex];
    lbImg.src = w.src;
    lbImg.alt = w.alt;
    lbCaption.textContent = w.title;
  }

  $$('.work-open').forEach(function (btn) {
    btn.addEventListener('click', function () {
      buildVisibleList();
      var card = btn.closest('.work-card');
      var idx = visibleWorks.findIndex(function (w) {
        return w.src === $('img', card).src;
      });
      showLb(idx < 0 ? 0 : idx);
      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
      lbClose.focus();
    });
  });

  function closeLb() {
    lightbox.hidden = true;
    document.body.style.overflow = '';
  }
  if (lbClose) lbClose.addEventListener('click', closeLb);
  if (lbPrev) lbPrev.addEventListener('click', function () { showLb(lbIndex - 1); });
  if (lbNext) lbNext.addEventListener('click', function () { showLb(lbIndex + 1); });
  if (lightbox) {
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLb(); });
    document.addEventListener('keydown', function (e) {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') showLb(lbIndex - 1);
      if (e.key === 'ArrowRight') showLb(lbIndex + 1);
    });
  }

  /* Свайп лайтбокса на мобильных */
  if (lightbox) {
    var touchX = null;
    lightbox.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) showLb(lbIndex + (dx < 0 ? 1 : -1));
      touchX = null;
    }, { passive: true });
  }

  /* «Хочу такой же» → подставляем название в форму и скроллим */
  $$('.btn-mini[data-order]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var comment = $('#leadForm textarea[name="comment"]');
      if (comment) comment.value = 'Хочу такой же: ' + btn.dataset.order;
      var target = $('#lead-form');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
      setTimeout(function () { var n = $('#leadForm input[name="name"]'); if (n) n.focus(); }, 700);
    });
  });

  /* ================= Блок 7: Слайдер отзывов ================= */
  var track = $('#reviewsTrack');
  if (track) {
    var slides = $$('.review-card', track);
    var dotsWrap = $('#reviewsDots');
    var current = 0;
    var timer = null;

    slides.forEach(function (_, i) {
      var dot = document.createElement('button');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', 'Отзыв ' + (i + 1));
      dot.addEventListener('click', function () { go(i); restart(); });
      dotsWrap.appendChild(dot);
    });
    var dots = $$('button', dotsWrap);

    function go(i) {
      current = (i + slides.length) % slides.length;
      track.style.transform = 'translateX(-' + current * 100 + '%)';
      dots.forEach(function (d, di) { d.classList.toggle('active', di === current); });
    }
    function restart() {
      clearInterval(timer);
      timer = setInterval(function () { go(current + 1); }, 6500);
    }
    go(0); restart();

    $$('.slider-arrow', $('#reviewsSlider')).forEach(function (arr) {
      arr.addEventListener('click', function () { go(current + Number(arr.dataset.dir)); restart(); });
    });

    /* свайп отзывов */
    var startX = null;
    track.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 45) { go(current + (dx < 0 ? 1 : -1)); restart(); }
      startX = null;
    }, { passive: true });
  }

  /* ================= Формы: валидация + отправка ================= */
  function setStatus(form, text, ok) {
    var st = $('.form-status', form) || $('#formStatus');
    if (!st) return;
    st.textContent = text;
    st.className = 'form-status ' + (ok ? 'ok' : 'err');
  }

  function validate(form) {
    var valid = true;
    $$('input[required], textarea[required]', form).forEach(function (el) {
      el.classList.remove('field-error');
    });
    var consentEl = $('input[name="consent"]', form);
    if (consentEl && !consentEl.checked) {
      valid = false;
      setStatus(form, 'Отметьте согласие на обработку данных.', false);
      return false;
    }
    $$('input[required]', form).forEach(function (el) {
      if (el.type === 'checkbox') return;
      var v = (el.value || '').trim();
      var bad = !v;
      if (!bad && el.type === 'tel') {
        bad = v.replace(/\D/g, '').length < 9;
      }
      if (!bad && el.name === 'contact') {
        // телефон ИЛИ e-mail
        var isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v);
        var isPhone = v.replace(/\D/g, '').length >= 9;
        bad = !(isEmail || isPhone);
      }
      if (bad) { el.classList.add('field-error'); valid = false; }
    });
    if (!valid) setStatus(form, 'Проверьте выделенные поля.', false);
    return valid;
  }

  function submitLead(form, type) {
    if (!validate(form)) return;

    var data = {};
    new FormData(form).forEach(function (val, key) {
      if (val instanceof File) { data[key] = val.name || ''; }
      else data[key] = val;
    });
    data.leadType = type;               // catalog | consult | kp
    data.page = location.href;
    data.ts = new Date().toISOString();

    var statusTarget = form.id === 'kpForm' ? null : $('#formStatus');

    function success() {
      setStatus(form, '✅ Спасибо! Заявка отправлена — свяжемся в течение 15 минут в рабочее время.', true);
      form.reset();
      // Конверсионное событие для аналитики (GA4 / Яндекс.Метрика)
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'lead_submit', lead_type: type });
      if (window.gtag) gtag('event', 'generate_lead', { lead_type: type });
      if (window.ym && ym && ym.metrika && ym.metrika.reachGoal) ym('reachGoal', 'lead_' + type);
    }

    if (FORM_ENDPOINT) {
      fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (r) { if (!r.ok) throw new Error(); success(); })
        .catch(function () { setStatus(form, '⚠️ Не удалось отправить. Напишите нам в WhatsApp/Telegram — кнопки справа.', false); });
    } else {
      // Демо-режим без бэкенда: имитируем успешную отправку.
      console.info('[Древо-Арт] Заявка (демо):', data);
      setTimeout(success, 400);
    }
    if (statusTarget) statusTarget.textContent = '';
  }

  var leadForm = $('#leadForm');
  if (leadForm) {
    var lastType = 'catalog';
    var designerBtn = $('#designerBtn');
    if (designerBtn) {
      designerBtn.addEventListener('click', function () { submitLead(leadForm, 'consult'); });
    }
    leadForm.addEventListener('submit', function (e) {
      e.preventDefault();
      submitLead(leadForm, lastType);
    });
    $$('[data-submit-type]', leadForm).forEach(function (b) {
      b.addEventListener('mouseenter', function () { lastType = b.dataset.submitType; });
      b.addEventListener('focus', function () { lastType = b.dataset.submitType; });
      if (b.type === 'submit') lastType = lastType || b.dataset.submitType;
    });
  }

  var kpForm = $('#kpForm');
  if (kpForm) {
    kpForm.addEventListener('submit', function (e) {
      e.preventDefault();
      submitLead(kpForm, 'kp');
    });
  }

  /* ================= Reveal-анимации при скролле ================= */
  if ('IntersectionObserver' in window) {
    var revealTargets = $$('.card, .work-card, .price-item, .steps li, .section-head, .hero-badge');
    revealTargets.forEach(function (el) { el.classList.add('reveal'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    revealTargets.forEach(function (el) { io.observe(el); });
  }
})();
