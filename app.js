// ==========================================================================
// app.js · CCI Frontend — Tek kullanımlık oturum, backend proxy
// ==========================================================================

(function () {
  'use strict';

  var MIN_WORDS = 120;
  var TOTAL_QUESTIONS = 5;
  var STORAGE_KEY_THEME = 'cci_theme';
  var STORAGE_KEY_COMPLETED = 'cci_completed';
  var STORAGE_KEY_SESSION = 'cci_session_id';

  var QUESTIONS = [
    'Büyürken kime hayrandınız? Onun hakkında bana biraz anlatır mısınız?',
    'Düzenli olarak takip ettiğiniz web sayfaları, YouTube kanalları ya da sosyal medya hesapları var mı? Bunlarda ne tarz içerikler üretiyorsunuz ve hangi yönlerini seviyorsunuz?',
    'En sevdiğiniz kitap ya da film hangisi? Hikâyesini bana anlatır mısınız?',
    'En sevdiğiniz söz ya da motto nedir?',
    'En erken anılarınız neler? Üç ile altı yaşları arasında başınıza geldiğini hatırladığınız üç olay.'
  ];

  var PLACEHOLDERS = [
    'Aklınıza gelen ilk kişiyi anlatın. Onun hangi yönü size çekici geliyordu? Sizi ondan ne ayırıyor, ne benzer kılıyordu?',
    'Takip ettiğiniz sayfaları, kanalları ya da hesapları yazın. Ne tarz içerikler üretiyorlar? Sizi onlara çeken ortak şey ne?',
    'Hikâyenin başını, ortasını ve sonunu kendi sözlerinizle anlatın. Sizi en çok hangi sahne ya da karakter etkiledi?',
    'Sıkça aklınıza gelen, sıkıştığınızda kendinize hatırlattığınız bir cümle. Nereden geldi? Sizin için neden anlamlı?',
    'Üç ayrı anı yazın. Her birinde nerede olduğunuzu, kim vardı, ne hissettiğinizi mümkün olduğunca detaylı paylaşın.'
  ];

  var state = {
    currentPage: 0,
    answers: ['', '', '', '', ''],
    saveTimers: [null, null, null, null, null],
    consentGiven: false
  };

  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return document.querySelectorAll(sel); };

  // ---------- Oturum ID ----------
  function getSessionId() {
    var id = localStorage.getItem(STORAGE_KEY_SESSION);
    if (!id) {
      id = 'cci_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem(STORAGE_KEY_SESSION, id);
    }
    return id;
  }

  function isCompleted() {
    return localStorage.getItem(STORAGE_KEY_COMPLETED) === 'true';
  }

  function markCompleted() {
    localStorage.setItem(STORAGE_KEY_COMPLETED, 'true');
  }

  // ==========================================================================
  // Init
  // ==========================================================================
  document.addEventListener('DOMContentLoaded', function () {
    loadTheme();
    buildProgressBar();
    buildQuestionPages();
    bindGlobalEvents();

    if (isCompleted()) {
      goToPage(7);
    } else {
      updatePage();
    }
  });

  // ==========================================================================
  // Theme
  // ==========================================================================
  function loadTheme() {
    var saved = localStorage.getItem(STORAGE_KEY_THEME);
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEY_THEME, next);
    updateThemeIcon(next);
  }

  function updateThemeIcon(theme) {
    $$('.icon-sun').forEach(function (el) { el.style.display = theme === 'dark' ? 'none' : ''; });
    $$('.icon-moon').forEach(function (el) { el.style.display = theme === 'dark' ? '' : 'none'; });
  }

  // ==========================================================================
  // UI Build
  // ==========================================================================
  function buildProgressBar() {
    var bar = $('#progressBar');
    bar.innerHTML = '';
    for (var i = 0; i < TOTAL_QUESTIONS; i++) {
      var step = document.createElement('div');
      step.className = 'progress-step';
      step.dataset.step = String(i + 1);
      bar.appendChild(step);
    }
  }

  function buildQuestionPages() {
    for (var i = 1; i <= TOTAL_QUESTIONS; i++) {
      var page = document.querySelector('.page[data-page="' + i + '"]');
      if (!page) continue;
      var section = page.querySelector('.answer-section');
      section.innerHTML =
        '<div class="textarea-wrapper">' +
          '<textarea class="answer-textarea" data-question="' + i + '" placeholder="' + escapeAttr(PLACEHOLDERS[i - 1]) + '"></textarea>' +
          '<div class="textarea-meta">' +
            '<div class="word-count">' +
              '<span class="word-count-num">0</span>' +
              '<span>/</span>' +
              '<span>' + MIN_WORDS + ' kelime</span>' +
              '<div class="word-count-bar"><div class="word-count-fill"></div></div>' +
            '</div>' +
            '<span class="save-status">kaydedildi</span>' +
          '</div>' +
        '</div>';

      var textarea = section.querySelector('textarea');
      (function (idx) {
        textarea.addEventListener('input', function (e) { onTextareaInput(e, idx); });
      })(i - 1);
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ==========================================================================
  // Events
  // ==========================================================================
  function bindGlobalEvents() {
    $('#themeToggle').addEventListener('click', toggleTheme);

    var consentCheck = $('#consentCheck');
    consentCheck.addEventListener('change', function () {
      state.consentGiven = consentCheck.checked;
      updateStartButton();
    });

    $('#startBtn').addEventListener('click', function () {
      if (state.consentGiven) goToPage(1);
    });
    $('#prevBtn').addEventListener('click', function () { goToPage(state.currentPage - 1); });
    $('#nextBtn').addEventListener('click', function () {
      if (state.currentPage >= 1 && state.currentPage <= TOTAL_QUESTIONS) {
        goToPage(state.currentPage + 1);
      }
    });
  }

  function updateStartButton() {
    $('#startBtn').disabled = !state.consentGiven;
  }

  function onTextareaInput(e, index) {
    var text = e.target.value;
    state.answers[index] = text;

    if (state.saveTimers[index]) clearTimeout(state.saveTimers[index]);
    state.saveTimers[index] = setTimeout(function () {
      showSaveStatus(index);
    }, 600);

    updateWordCount(index);
    updateNavButton();
  }

  function showSaveStatus(index) {
    var page = document.querySelector('.page[data-page="' + (index + 1) + '"]');
    if (!page) return;
    var status = page.querySelector('.save-status');
    status.classList.add('visible');
    setTimeout(function () { status.classList.remove('visible'); }, 1800);
  }

  function countWords(text) {
    return (text.trim().match(/\S+/g) || []).length;
  }

  function updateWordCount(index) {
    var page = document.querySelector('.page[data-page="' + (index + 1) + '"]');
    if (!page) return;
    var count = countWords(state.answers[index] || '');
    var numEl = page.querySelector('.word-count-num');
    var fillEl = page.querySelector('.word-count-fill');
    if (numEl) numEl.textContent = count;
    if (fillEl) {
      var pct = Math.min(100, (count / MIN_WORDS) * 100);
      fillEl.style.width = pct + '%';
      fillEl.classList.toggle('complete', count >= MIN_WORDS);
    }
  }

  // ==========================================================================
  // Page Navigation
  // ==========================================================================
  function goToPage(pageNum) {
    if (pageNum < 0) pageNum = 0;
    if (pageNum > 7) pageNum = 7;
    state.currentPage = pageNum;
    updatePage();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Yansıtma sayfasına gelince otomatik tetikle
    if (pageNum === 6) {
      runInsight();
    }

    setTimeout(function () {
      var active = document.querySelector('.page.active textarea');
      if (active) active.focus({ preventScroll: true });
    }, 200);
  }

  function updatePage() {
    $$('.page').forEach(function (p) {
      var num = Number(p.dataset.page);
      p.classList.toggle('active', num === state.currentPage);
    });

    $$('.progress-step').forEach(function (step, idx) {
      var stepNum = idx + 1;
      step.classList.remove('active', 'completed');
      if (state.currentPage > stepNum) step.classList.add('completed');
      else if (state.currentPage === stepNum) step.classList.add('active');
    });

    var labels = ['Giriş', 'Soru 1 · Kahraman', 'Soru 2 · Sahneler', 'Soru 3 · Senaryo', 'Soru 4 · Motto', 'Soru 5 · Erken Anılar', 'Yansıtma', 'Tamamlandı'];
    $('#progressLabel').textContent = labels[state.currentPage] || '';

    var showFooter = state.currentPage >= 1 && state.currentPage <= TOTAL_QUESTIONS;
    $('#navFooter').style.display = showFooter ? 'flex' : 'none';

    if (showFooter) {
      $('#prevBtn').disabled = state.currentPage <= 1;
      $('#navMeta').textContent = state.currentPage + ' / ' + TOTAL_QUESTIONS;
      updateNavButton();

      var nextLabel = $('#nextBtn').querySelector('.btn-label');
      nextLabel.textContent = state.currentPage === TOTAL_QUESTIONS
        ? 'Görüşmeyi tamamla'
        : 'Kaydet ve devam et';
    }
  }

  function updateNavButton() {
    if (state.currentPage < 1 || state.currentPage > TOTAL_QUESTIONS) return;
    var idx = state.currentPage - 1;
    var count = countWords(state.answers[idx] || '');
    $('#nextBtn').disabled = count < MIN_WORDS;
  }

  // ==========================================================================
  // Insight — Tek seferlik, otomatik tetiklenir
  // ==========================================================================
  var insightRunning = false;

  async function runInsight() {
    if (insightRunning) return;
    insightRunning = true;

    var card = $('#insightCard');
    var content = $('#insightContent');

    card.classList.add('visible');
    content.innerHTML = '<div class="insight-loading">Cevaplarınız okunuyor ve yansıtma hazırlanıyor…</div>';

    try {
      var sessionId = getSessionId();
      var answers = QUESTIONS.map(function (q, i) {
        return { question: q, answer: state.answers[i] || '(boş)' };
      });

      var response = await fetch('/api/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answers, sessionId: sessionId })
      });

      var data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sunucu hatası (' + response.status + ')');
      }

      content.innerHTML = formatReflection(data.reflection);
      markCompleted();

    } catch (err) {
      console.error(err);
      content.innerHTML =
        '<div style="color: #b91c1c;">' +
          '<strong>Yansıtma alınamadı.</strong><br>' +
          escapeHtml(err.message || 'Bilinmeyen hata.') +
        '</div>';
      insightRunning = false;
    }
  }

  function formatReflection(text) {
    var safe = escapeHtml(text);
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    var paragraphs = safe.split(/\n\s*\n/).map(function (p) {
      return '<p style="margin-bottom: 0.85rem">' + p.replace(/\n/g, '<br>') + '</p>';
    });
    return paragraphs.join('');
  }

})();
