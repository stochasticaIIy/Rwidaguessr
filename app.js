(() => {
  const $ = (id) => document.getElementById(id);
  const ui = {
    start: $('start-screen'), game: $('game-screen'), result: $('result-screen'), final: $('final-screen'),
    duration: $('duration'), dataNote: $('data-note'), roundLabel: $('round-label'), dots: $('round-dots'),
    title: $('vehicle-title'), kind: $('vehicle-kind'), timer: $('timer'), progress: $('progress-value'),
    facts: $('quick-facts'), summary: $('summary'), features: $('features'), options: $('options'),
    image: $('vehicle-image'), fallback: $('vehicle-fallback'), emoji: $('vehicle-emoji'), visual: $('vehicle-visual'), gallery: $('gallery-controls'), imageActions: $('image-actions'), imageCount: $('image-count'), previousImage: $('image-prev'), nextImage: $('image-next'), zoomImage: $('image-zoom'), fullscreenImage: $('image-fullscreen'), guess: $('guess'),
    form: $('guess-form'), error: $('form-error'), resultTitle: $('result-title'), actual: $('actual-price'),
    guessed: $('your-guess'), difference: $('difference'), score: $('round-score'), message: $('result-message'),
    source: $('source-link'), next: $('next-round'), total: $('total-score'), breakdown: $('score-breakdown')
  };
  const copy = {
    en: { howTo:'How to play', eyebrow:'Cars & motorbikes · Morocco', heroTitle:'What’s the price<br /><em>of this vehicle?</em>', intro:'Five listings, their full details, and zero price clues. Estimate the listed price in dirhams.', durationLabel:'Maximum time per guess', oneMinute:'1 minute', twoMinutes:'2 minutes', fiveMinutes:'5 minutes', tenMinutes:'10 minutes', thirtyMinutes:'30 minutes (maximum)', durationNote:'Time is capped at 30 minutes for every listing.', start:'Start 5 rounds <span>→</span>', priceHidden:'Price hidden', summaryHeading:'Listing summary', featuresHeading:'Features', optionsHeading:'Equipment & options', yourGuess:'Your guess', submit:'Submit <span>→</span>', result:'Result', listedPrice:'Listed price', difference:'Difference', points:'Points', viewSource:'View source listing ↗', gameOver:'Game complete', finalTitle:'You’ve got an eye for it.', outOfFive:'points out of 5,000', playAgain:'Play again <span>↻</span>', rules:'Rules', rulesTitle:'Five prices to estimate.', rulesCopy1:'For every listing, study the vehicle, its details, and every option. Enter the price you think is listed. The closer you are, the more points you earn.', rulesCopy2:'A timer begins each round and can never be longer than 30 minutes.', ready:'Ready to play', round:'Round {n} of 5', complete:'Game complete', vehicle:'Vehicle listing', car:'Car listing', bike:'Motorbike listing', invalidGuess:'Enter a valid price in MAD.', failedGuess:'We could not validate that guess. Please try again.', loading:'Loading listings…', liveData:'Verified listings — prices reveal after each guess.', previewData:'Preview mode — add the Cloudflare secrets to load your authorized listings.', insufficient:'At least five valid listings are needed to play.', preparing:'Preparing…', next:'Next round →', finalNext:'See my final score →', timeUp:'Time is up', expired:'Time is up — the price is revealed, but this round earns no points.', excellent:'Impressive: your estimate was extremely close.', great:'Great instinct — you are in the right range.', okay:'Not bad. The vehicle details made the difference.', tough:'That one was difficult. Every round counts.', noOptions:'No options listed', timeRemaining:'Time remaining', switchLanguage:'Switch to Arabic', useDark:'Use dark mode', useLight:'Use light mode', previousPhoto:'Previous photo', nextPhoto:'Next photo', zoomIn:'Zoom in', zoomOut:'Zoom out', openFullscreen:'Open fullscreen', exitFullscreen:'Exit fullscreen' },
    ar: { howTo:'طريقة اللعب', eyebrow:'سيارات ودراجات نارية · المغرب', heroTitle:'كم يبلغ سعر<br /><em>هذه المركبة؟</em>', intro:'خمس إعلانات وتفاصيلها الكاملة من دون أي تلميح للسعر. قدّر السعر المعروض بالدرهم.', durationLabel:'الوقت الأقصى لكل تخمين', oneMinute:'دقيقة واحدة', twoMinutes:'دقيقتان', fiveMinutes:'5 دقائق', tenMinutes:'10 دقائق', thirtyMinutes:'30 دقيقة (الحد الأقصى)', durationNote:'الوقت لا يتجاوز 30 دقيقة لكل إعلان.', start:'ابدأ 5 جولات <span>→</span>', priceHidden:'السعر مخفي', summaryHeading:'ملخص الإعلان', featuresHeading:'المواصفات', optionsHeading:'التجهيزات والخيارات', yourGuess:'تخمينك', submit:'إرسال <span>→</span>', result:'النتيجة', listedPrice:'السعر المعروض', difference:'الفارق', points:'النقاط', viewSource:'عرض الإعلان المصدر ↗', gameOver:'انتهت اللعبة', finalTitle:'لديك عين خبيرة.', outOfFive:'نقطة من أصل 5,000', playAgain:'العب مجددًا <span>↻</span>', rules:'القواعد', rulesTitle:'خمسة أسعار لتخمينها.', rulesCopy1:'في كل إعلان، تفحّص المركبة وتفاصيلها وكل خيار فيها. أدخل السعر الذي تعتقد أنه معروض. كلما اقتربت، ربحت نقاطًا أكثر.', rulesCopy2:'يبدأ مؤقت مع كل جولة ولا يمكن أن يتجاوز 30 دقيقة.', ready:'جاهز للعب', round:'الجولة {n} من 5', complete:'انتهت اللعبة', vehicle:'إعلان مركبة', car:'إعلان سيارة', bike:'إعلان دراجة نارية', invalidGuess:'أدخل سعرًا صحيحًا بالدرهم.', failedGuess:'تعذّر التحقق من التخمين. حاول مرة أخرى.', loading:'جارٍ تحميل الإعلانات…', liveData:'إعلانات موثقة — يظهر السعر بعد كل تخمين.', previewData:'وضع المعاينة — أضف أسرار Cloudflare لتحميل إعلاناتك المصرح بها.', insufficient:'يلزم خمسة إعلانات صالحة على الأقل للعب.', preparing:'جارٍ التحضير…', next:'الجولة التالية ←', finalNext:'عرض نتيجتي النهائية ←', timeUp:'انتهى الوقت', expired:'انتهى الوقت — تم كشف السعر، لكن هذه الجولة لا تمنح نقاطًا.', excellent:'مذهل: كان تخمينك قريبًا جدًا.', great:'حدس رائع — أنت ضمن النطاق الصحيح.', okay:'ليس سيئًا. تفاصيل المركبة أحدثت الفرق.', tough:'كانت هذه صعبة. كل الجولات مهمة.', noOptions:'لا توجد خيارات مذكورة', timeRemaining:'الوقت المتبقي', switchLanguage:'التبديل إلى الإنجليزية', useDark:'استخدم الوضع الداكن', useLight:'استخدم الوضع الفاتح', previousPhoto:'الصورة السابقة', nextPhoto:'الصورة التالية', zoomIn:'تكبير الصورة', zoomOut:'تصغير الصورة', openFullscreen:'فتح ملء الشاشة', exitFullscreen:'الخروج من ملء الشاشة' }
  };
  const state = { listings: [], current: 0, results: [], deadline: 0, duration: 120, timer: null, live: false, submitting: false, imageIndex: 0, language: localStorage.getItem('rwida-language') || 'en', theme: localStorage.getItem('rwida-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') };
  const t = (key, replacements = {}) => Object.entries(replacements).reduce((text, [name, value]) => text.replace(`{${name}}`, value), copy[state.language][key] || key);
  const localized = (value) => value && typeof value === 'object' && !Array.isArray(value) ? (value[state.language] || value.en || value.ar || '') : (value ?? '');
  const money = (value) => `${new Intl.NumberFormat(state.language === 'ar' ? 'ar-MA' : 'en-MA').format(Math.round(value))} MAD`;
  const formatSeconds = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const escape = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);

  function selectFive(items) {
    return [...items].sort(() => Math.random() - .5).slice(0, 5);
  }
  function setScreen(name) {
    for (const [key, element] of Object.entries({ start: ui.start, game: ui.game, result: ui.result, final: ui.final })) {
      element.classList.toggle('hidden', key !== name);
    }
  }
  function applyPreferences() {
    document.documentElement.lang = state.language;
    document.documentElement.dir = state.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dataset.theme = state.theme;
    document.querySelectorAll('[data-i18n]').forEach((element) => { element.textContent = t(element.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach((element) => { element.innerHTML = t(element.dataset.i18nHtml); });
    ui.guess.placeholder = state.language === 'ar' ? 'مثال: 185 000' : 'e.g. 185,000';
    $('language-toggle').textContent = state.language === 'en' ? 'العربية' : 'English';
    $('language-toggle').setAttribute('aria-label', t('switchLanguage'));
    $('theme-toggle').innerHTML = `<span aria-hidden="true">${state.theme === 'dark' ? '☀' : '☾'}</span>`;
    $('theme-toggle').setAttribute('aria-label', t(state.theme === 'dark' ? 'useLight' : 'useDark'));
    ui.timer.setAttribute('aria-label', t('timeRemaining'));
    ui.previousImage.setAttribute('aria-label', t('previousPhoto')); ui.nextImage.setAttribute('aria-label', t('nextPhoto'));
    ui.zoomImage.setAttribute('aria-label', t(ui.visual.classList.contains('is-zoomed') ? 'zoomOut' : 'zoomIn'));
    ui.fullscreenImage.setAttribute('aria-label', t(document.fullscreenElement ? 'exitFullscreen' : 'openFullscreen'));
    if (!state.listings.length) { ui.roundLabel.textContent = t('ready'); ui.dataNote.textContent = t('loading'); }
    else if (state.current >= state.listings.length) ui.roundLabel.textContent = t('complete');
    else { renderDots(); renderListing(state.listings[state.current]); }
  }
  function renderDots() {
    ui.dots.innerHTML = Array.from({ length: 5 }, (_, index) => `<i class="${index < state.current ? 'done' : index === state.current ? 'active' : ''}"></i>`).join('');
    ui.roundLabel.textContent = state.current < 5 ? t('round', { n: state.current + 1 }) : t('complete');
  }
  function listingImages(item) {
    const candidates = Array.isArray(item.images) ? item.images : item.imageUrl ? [item.imageUrl] : [];
    return candidates.filter((image) => typeof image === 'string' && /^https:\/\//.test(image));
  }
  function renderImage(item, resetZoom = true) {
    const images = listingImages(item);
    if (resetZoom) ui.visual.classList.remove('is-zoomed');
    if (!images.length) {
      ui.image.removeAttribute('src'); ui.image.classList.add('hidden'); ui.fallback.classList.remove('hidden');
      ui.gallery.classList.add('hidden'); ui.imageActions.classList.add('hidden'); return;
    }
    state.imageIndex = ((state.imageIndex % images.length) + images.length) % images.length;
    ui.image.src = images[state.imageIndex]; ui.image.alt = localized(item.title);
    ui.image.classList.remove('hidden'); ui.fallback.classList.add('hidden'); ui.imageActions.classList.remove('hidden');
    ui.gallery.classList.toggle('hidden', images.length < 2);
    ui.imageCount.textContent = `${state.imageIndex + 1} / ${images.length}`;
    ui.previousImage.disabled = images.length < 2; ui.nextImage.disabled = images.length < 2;
  }
  function renderListing(item) {
    ui.title.textContent = localized(item.title);
    ui.kind.textContent = item.kind === 'Moto' || item.kind === 'Motorbike' ? t('bike') : t('car');
    ui.facts.innerHTML = (item.quickFacts || []).map((fact) => `<span>${escape(localized(fact))}</span>`).join('');
    ui.summary.textContent = localized(item.summary);
    const featureEntries = Array.isArray(item.features) ? item.features.map((feature) => [feature.label, feature.value]) : Object.entries(item.features || {});
    ui.features.innerHTML = featureEntries.map(([label, value]) => `<div><dt>${escape(localized(label))}</dt><dd>${escape(localized(value))}</dd></div>`).join('');
    ui.options.innerHTML = (item.options || []).length ? item.options.map((option) => `<span>${escape(localized(option))}</span>`).join('') : `<span>${t('noOptions')}</span>`;
    ui.emoji.textContent = item.kind === 'Moto' || item.kind === 'Motorbike' ? '🏍️' : '🚗';
    renderImage(item);
  }
  function startTimer() {
    window.clearInterval(state.timer);
    state.deadline = Date.now() + state.duration * 1000;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000));
      ui.timer.textContent = formatSeconds(remaining);
      ui.timer.classList.toggle('urgent', remaining <= 20);
      ui.progress.style.width = `${Math.max(0, (remaining / state.duration) * 100)}%`;
      if (remaining === 0) {
        window.clearInterval(state.timer);
        submitGuess(null, true);
      }
    };
    tick();
    state.timer = window.setInterval(tick, 250);
  }
  function startRound() {
    const item = state.listings[state.current];
    if (!item) return finishGame();
    state.submitting = false; state.imageIndex = 0;
    ui.guess.value = '';
    ui.error.classList.add('hidden');
    renderDots(); renderListing(item); setScreen('game'); startTimer();
    window.setTimeout(() => ui.guess.focus(), 80);
  }
  function calculateDemo(item, guess) {
    const error = guess === null ? 1 : Math.abs(guess - item.price) / item.price;
    return { actualPrice: item.price, score: Math.max(0, Math.round(1000 * (1 - Math.min(1, error)))), difference: guess === null ? null : Math.abs(guess - item.price) };
  }
  async function submitGuess(guess, timedOut = false) {
    if (state.submitting) return;
    const item = state.listings[state.current];
    if (!timedOut && (guess === null || !Number.isFinite(guess) || guess < 0)) {
      ui.error.textContent = t('invalidGuess'); ui.error.classList.remove('hidden'); return;
    }
    state.submitting = true; window.clearInterval(state.timer);
    let result;
    try {
      if (state.live) {
        const response = await fetch('/api/guess', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: item.token, guess }) });
        if (!response.ok) throw new Error('La validation a échoué.');
        result = await response.json();
      } else result = calculateDemo(item, guess);
    } catch (error) {
      state.submitting = false; ui.error.textContent = t('failedGuess'); ui.error.classList.remove('hidden'); startTimer(); return;
    }
    showResult(item, { ...result, guess, timedOut });
  }
  function scoreCopy(result) {
    if (result.timedOut) return t('expired');
    if (result.score >= 900) return t('excellent');
    if (result.score >= 700) return t('great');
    if (result.score >= 400) return t('okay');
    return t('tough');
  }
  function showResult(item, result) {
    const guessText = result.timedOut ? t('timeUp') : money(result.guess);
    state.results.push({ title: item.title, score: result.score, actual: result.actualPrice, guess: result.guess });
    ui.resultTitle.textContent = localized(item.title);
    ui.actual.textContent = money(result.actualPrice);
    ui.guessed.textContent = guessText;
    ui.difference.textContent = result.difference === null ? '—' : money(result.difference);
    ui.score.textContent = `${result.score} / 1 000`;
    ui.message.textContent = scoreCopy(result);
    ui.source.classList.toggle('hidden', !item.sourceUrl);
    if (item.sourceUrl) ui.source.href = item.sourceUrl;
    ui.next.textContent = state.current === 4 ? t('finalNext') : t('next');
    setScreen('result');
  }
  function nextRound() { state.current += 1; startRound(); }
  function finishGame() {
    window.clearInterval(state.timer); renderDots();
    const total = state.results.reduce((sum, result) => sum + result.score, 0);
    ui.total.textContent = new Intl.NumberFormat(state.language === 'ar' ? 'ar-MA' : 'en-MA').format(total);
    ui.breakdown.innerHTML = state.results.map((result, index) => `<div><small>M${index + 1}</small><br>${result.score}</div>`).join('');
    setScreen('final');
  }
  function cleanGuess(value) { return Number(String(value).replace(/[^\d]/g, '')); }
  function changeImage(delta) {
    const item = state.listings[state.current];
    const images = item && listingImages(item);
    if (!images || images.length < 2) return;
    state.imageIndex += delta; renderImage(item);
  }
  function toggleZoom() {
    if (ui.image.classList.contains('hidden')) return;
    ui.visual.classList.toggle('is-zoomed');
    ui.zoomImage.setAttribute('aria-label', t(ui.visual.classList.contains('is-zoomed') ? 'zoomOut' : 'zoomIn'));
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await ui.visual.requestFullscreen();
    } catch (_) { /* Fullscreen can be blocked by the host browser; the gallery remains usable. */ }
  }
  async function loadGame() {
    const seconds = Math.min(1800, Math.max(30, Number(ui.duration.value)));
    try {
      const response = await fetch(`/api/game?seconds=${seconds}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('no game endpoint');
      const payload = await response.json();
      if (!Array.isArray(payload.round) || payload.round.length < 5) throw new Error('not enough listings');
      state.listings = payload.round; state.live = true;
      ui.dataNote.textContent = t('liveData');
    } catch (_) {
      state.listings = selectFive(window.DEMO_LISTINGS || []); state.live = false;
      ui.dataNote.textContent = t('previewData');
    }
  }
  $('start-game').addEventListener('click', async () => {
    $('start-game').disabled = true; $('start-game').textContent = t('preparing');
    state.duration = Math.min(1800, Math.max(30, Number(ui.duration.value)));
    await loadGame();
    $('start-game').disabled = false; $('start-game').innerHTML = t('start');
    if (state.listings.length < 5) { ui.dataNote.textContent = t('insufficient'); return; }
    state.current = 0; state.results = []; startRound();
  });
  ui.form.addEventListener('submit', (event) => { event.preventDefault(); submitGuess(cleanGuess(ui.guess.value)); });
  ui.next.addEventListener('click', nextRound);
  $('play-again').addEventListener('click', () => { setScreen('start'); loadGame(); });
  $('how-to-play').addEventListener('click', () => $('rules-dialog').showModal());
  $('close-rules').addEventListener('click', () => $('rules-dialog').close());
  ui.previousImage.addEventListener('click', () => changeImage(-1));
  ui.nextImage.addEventListener('click', () => changeImage(1));
  ui.zoomImage.addEventListener('click', toggleZoom);
  ui.image.addEventListener('click', toggleZoom);
  ui.fullscreenImage.addEventListener('click', toggleFullscreen);
  ui.image.addEventListener('error', () => { ui.image.classList.add('hidden'); ui.fallback.classList.remove('hidden'); ui.gallery.classList.add('hidden'); ui.imageActions.classList.add('hidden'); });
  document.addEventListener('fullscreenchange', () => ui.fullscreenImage.setAttribute('aria-label', t(document.fullscreenElement ? 'exitFullscreen' : 'openFullscreen')));
  document.addEventListener('keydown', (event) => {
    if (document.activeElement === ui.guess || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowLeft') changeImage(document.documentElement.dir === 'rtl' ? 1 : -1);
    if (event.key === 'ArrowRight') changeImage(document.documentElement.dir === 'rtl' ? -1 : 1);
  });
  $('language-toggle').addEventListener('click', () => {
    state.language = state.language === 'en' ? 'ar' : 'en';
    localStorage.setItem('rwida-language', state.language); applyPreferences();
  });
  $('theme-toggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('rwida-theme', state.theme); applyPreferences();
  });
  applyPreferences();
  loadGame();
})();
