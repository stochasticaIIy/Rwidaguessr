(() => {
  const $ = (id) => document.getElementById(id);
  const ui = {
    start: $('start-screen'), game: $('game-screen'), result: $('result-screen'), final: $('final-screen'),
    duration: $('duration'), dataNote: $('data-note'), roundLabel: $('round-label'), dots: $('round-dots'),
    title: $('vehicle-title'), kind: $('vehicle-kind'), timer: $('timer'), progress: $('progress-value'),
    facts: $('quick-facts'), summary: $('summary'), features: $('features'), options: $('options'),
    image: $('vehicle-image'), fallback: $('vehicle-fallback'), emoji: $('vehicle-emoji'), visual: $('vehicle-visual'), gallery: $('gallery-controls'), imageActions: $('image-actions'), imageCount: $('image-count'), previousImage: $('image-prev'), nextImage: $('image-next'), zoomImage: $('image-zoom'), fullscreenImage: $('image-fullscreen'), guess: $('guess'),
    lightbox: $('image-lightbox'), lightboxClose: $('lightbox-close'), lightboxPrev: $('lightbox-prev'), lightboxNext: $('lightbox-next'), lightboxImage: $('lightbox-image'), lightboxZoom: $('lightbox-zoom'), lightboxCount: $('lightbox-count'),
    form: $('guess-form'), error: $('form-error'), resultTitle: $('result-title'), actual: $('actual-price'),
    guessed: $('your-guess'), difference: $('difference'), score: $('round-score'), message: $('result-message'),
    closenessPct: $('closeness-pct'), closenessFill: $('closeness-fill'), closenessCell: $('closeness-cell'),
    closenessLabel: $('closeness-label'), closenessBadge: $('closeness-badge'),
    leaderboardToggle: $('leaderboard-toggle'), leaderboardDialog: $('leaderboard-dialog'), closeLeaderboard: $('close-leaderboard'),
    leaderboardForm: $('leaderboard-form'), playerName: $('player-name'), saveScoreBtn: $('save-score-btn'),
    leaderboardFeedback: $('leaderboard-feedback'), finalLeaderboardList: $('final-leaderboard-list'),
    dialogLeaderboardList: $('dialog-leaderboard-list'), finalRefreshLb: $('final-refresh-lb'),
    source: $('source-link'), next: $('next-round'), total: $('total-score'), breakdown: $('score-breakdown'),
    modeCars: $('mode-cars'), modeMotorbikes: $('mode-motorbikes'), startGame: $('start-game'),
    soundToggle: $('sound-toggle'), soundIcon: $('sound-icon')
  };
  const copy = {
    en: { howTo:'How to play', eyebrow:'Cars & motorbikes · Morocco', heroTitle:'What’s the price<br /><em>of this vehicle?</em>', heroTitleCars:'What’s the price<br /><em>of this car?</em>', heroTitleBikes:'What’s the price<br /><em>of this motorbike?</em>', modeLabel:'Vehicle category', modeCars:'Cars', modeBikes:'Motorbikes', intro:'Five listings, their full details, and zero price clues. Estimate the listed price in dirhams.', durationLabel:'Maximum time per guess', tenMinutes:'10 minutes', thirtyMinutes:'30 minutes', fiftyMinutes:'50 minutes (maximum)', durationNote:'Time is capped at 50 minutes for every listing.', start:'Start 5 rounds <span>→</span>', startCars:'Start 5 Car rounds <span>→</span>', startBikes:'Start 5 Motorbike rounds <span>→</span>', priceHidden:'Price hidden', summaryHeading:'Listing summary', featuresHeading:'Features', optionsHeading:'Equipment & options', yourGuess:'Your guess', submit:'Submit <span>→</span>', quickIncrements:'Quick add:', clearInput:'Reset', result:'Result', listedPrice:'Listed price', difference:'Difference', points:'Points', viewSource:'View source listing ↗', gameOver:'Game complete', finalTitle:'You’ve got an eye for it.', outOfFive:'points out of 5,000', playAgain:'Play again <span>↻</span>', rules:'Rules', rulesTitle:'Five prices to estimate.', rulesCopy1:'For every listing, study the vehicle, its details, and every option. Enter the price you think is listed. The closer you are, the more points you earn.', rulesCopy2:'A timer begins each round and can never be longer than 50 minutes.', rulesCopy3:'At the end, save your name to the Leaderboard and see how your eye for car prices ranks!', ready:'Ready to play', round:'Round {n} of 5', roundCars:'Cars · Round {n} of 5', roundBikes:'Motorbikes · Round {n} of 5', complete:'Game complete', vehicle:'Vehicle listing', car:'Car listing', bike:'Motorbike listing', invalidGuess:'Enter a valid price in MAD.', failedGuess:'We could not validate that guess. Please try again.', loading:'Loading listings…', liveData:'Verified listings — prices reveal after each guess.', previewData:'Preview mode — add the Cloudflare secrets to load your authorized listings.', insufficient:'At least five valid listings are needed to play.', preparing:'Preparing…', next:'Next round →', finalNext:'See my final score →', timeUp:'Time is up', expired:'Time is up — the price is revealed, but this round earns no points.', excellent:'Impressive: your estimate was extremely close.', great:'Great instinct — you are in the right range.', okay:'Not bad. The vehicle details made the difference.', tough:'That one was difficult. Every round counts.', noOptions:'No options listed', timeRemaining:'Time remaining', switchLanguage:'Switch to Arabic', useDark:'Use dark mode', useLight:'Use light mode', soundOn:'Sound effects enabled', soundOff:'Sound effects muted', previousPhoto:'Previous photo', nextPhoto:'Next photo', zoomIn:'Zoom in', zoomOut:'Zoom out', openFullscreen:'Open fullscreen', exitFullscreen:'Exit fullscreen', closenessKicker:'Accuracy', closeToPrice:'close to actual price', closenessCol:'Closeness', saveScoreTitle:'Save your score to the Leaderboard', saveScoreHint:'Compete against other players across Morocco.', saveScoreBtn:'Save score <span>→</span>', savingScore:'Saving…', savedScore:'✓ Score Saved', scoreRanked:'🎉 Ranked #{rank}! Your score is on the leaderboard.', alreadySaved:'Your score has already been saved.', nameRequired:'Please enter your name or nickname.', saveFailed:'Could not save score. Please try again.', topScorers:'Top Scorers', loadingLb:'Loading leaderboard…', emptyLb:'No scores yet. Be the first!', leaderboardBtn:'Leaderboard', leaderboardTitle:'Top Scorers', leaderboardEyebrow:'Hall of Fame', playerNamePlaceholder:'Enter your name / nickname', bullseye:'Bullseye! Extremely close to the price.', almostExact:'Excellent! Very close to listed price.', solidGuess:'Solid guess — within the right range.', fairEstimate:'Fair estimate, but options made the difference.', wayOff:'Far from listed price — this one was tricky.' },
    ar: { howTo:'كيفاش تلعب', eyebrow:'سيارات ودراجات نارية · المغرب', heroTitle:'كم يبلغ سعر<br /><em>هاد الحديدة؟</em>', heroTitleCars:'كم يبلغ سعر<br /><em>هذه السيارة؟</em>', heroTitleBikes:'كم يبلغ سعر<br /><em>هذه الدراجة النارية؟</em>', modeLabel:'نوع المركبات', modeCars:'سيارات', modeBikes:'دراجات نارية', intro:'خمس إعلانات وتفاصيلها الكاملة من دون أي تلميح للسعر. قدّر السعر المعروض بالدرهم.', durationLabel:'الوقت الأقصى لكل تخمين', tenMinutes:'10 دقائق', thirtyMinutes:'30 دقيقة', fiftyMinutes:'50 دقيقة (الحد الأقصى)', durationNote:'الوقت لا يتجاوز 50 دقيقة لكل إعلان.', start:'ابدأ 5 جولات <span>→</span>', startCars:'ابدأ 5 جولات سيارات <span>→</span>', startBikes:'ابدأ 5 جولات دراجات نارية <span>→</span>', priceHidden:'السعر مخفي', summaryHeading:'ملخص الإعلان', featuresHeading:'المواصفات', optionsHeading:'التجهيزات والخيارات', yourGuess:'تخمينك', submit:'إرسال <span>→</span>', quickIncrements:'إضافة سريعة:', clearInput:'مسح', result:'النتيجة', listedPrice:'السعر المعروض', difference:'الفارق', points:'النقاط', viewSource:'عرض الإعلان المصدر ↗', gameOver:'انتهت اللعبة', finalTitle:'لديك عين خبيرة.', outOfFive:'نقطة من أصل 5,000', playAgain:'العب مجددًا <span>↻</span>', rules:'قواعد اللعبة', rulesTitle:'5 د الهميزات خاصك تجيب ثمنهم', rulesCopy1:'في كل جولة، شوف التصاور وتفاصيل الحديد والمواصفات مزيان. حط الثمن لي كيبان ليك معروض فالإعلان بالدرهم. كلما كنتي قريب للثمن الحقيقي، كلما ضربتي نقط كثر (حتى لـ 1,000 نقطة فكل جولة).', rulesCopy2:'كاين وقت محدد لكل جولة، وما كيفوتش 50 دقيقة كحد أقصى. زرب قبل ما يسالي العداد!', rulesCopy3:'في اللخر، سجّل سميتك فـ الليدربورد وتنافس مع الدراري و الحرايفية!', ready:'جاهز للعب', round:'الجولة {n} من 5', roundCars:'سيارات · الجولة {n} من 5', roundBikes:'دراجات نارية · الجولة {n} من 5', complete:'انتهت اللعبة', vehicle:'إعلان مركبة', car:'إعلان سيارة', bike:'إعلان دراجة نارية', invalidGuess:'أدخل سعرًا صحيحًا بالدرهم.', failedGuess:'تعذّر التحقق من التخمين. حاول مرة أخرى.', loading:'جارٍ تحميل الإعلانات…', liveData:'إعلانات موثقة — يظهر السعر بعد كل تخمين.', previewData:'وضع المعاينة — أضف أسرار Cloudflare لتحميل إعلاناتك المصرح بها.', insufficient:'يلزم خمسة إعلانات صالحة على الأقل للعب.', preparing:'جارٍ التحضير…', next:'الجولة التالية ←', finalNext:'عرض نتيجتي النهائية ←', timeUp:'انتهى الوقت', expired:'انتهى الوقت — تم كشف السعر، لكن هذه الجولة لا تمنح نقاطًا.', excellent:'مذهل: كان تخمينك قريبًا جدًا.', great:'حدس رائع — أنت ضمن النطاق الصحيح.', okay:'المرة الجاية ها تجيبها لاصقة.', tough:'كانت هذه صعبة. كل الجولات مهمة.', noOptions:'لا توجد خيارات مذكورة', timeRemaining:'الوقت المتبقي', switchLanguage:'التبديل إلى الإنجليزية', useDark:'استخدم الوضع الداكن', useLight:'استخدم الوضع الفاتح', soundOn:'المؤثرات الصوتية مفعلة', soundOff:'المؤثرات الصوتية مكتومة', previousPhoto:'الصورة السابقة', nextPhoto:'الصورة التالية', zoomIn:'تكبير الصورة', zoomOut:'تصغير الصورة', openFullscreen:'فتح فولسكرين', exitFullscreen:'الخروج من فولسكرين', closenessKicker:'نسبة الدقة', closeToPrice:'قريب للثمن الحقيقي', closenessCol:'التقارب', saveScoreTitle:'سجّل سكور ديالك فـ الليدربورد', saveScoreHint:'تنافس مع الحرايفية والدراري من كاع المدن المغربية.', saveScoreBtn:'سجّل السكور <span>←</span>', savingScore:'جارٍ التسجيل…', savedScore:'✓ مسجّل', scoreRanked:'🎉 الرتبة ديالك هي #{rank}! السكور ديالك تسجل فـ الليدربورد.', alreadySaved:'السكور ديالك راه مسجل من قبل.', nameRequired:'عفاك كتب سميتك أو اللقب ديالك.', saveFailed:'تعذّر تسجيل السكور. حاول مرة أخرى.', topScorers:'أحسن السكورات', loadingLb:'جارٍ تحميل الليدربورد…', emptyLb:'ما كاين حتى سكور باقي. كون اللول!', leaderboardBtn:'المتصدرين', leaderboardTitle:'لوحة المتصدرين', leaderboardEyebrow:'الحرايفية الكبار', playerNamePlaceholder:'كتب سميتك أو اللقب ديالك', bullseye:'جيبتيها لاصقة! قريب بزاف من الثمن.', almostExact:'كاين أمعلم! قريب بزاف للثمن المعروض.', solidGuess:'مزيان — راك فالنطاق الصحيح.', fairEstimate:'ماشي بعيد، راك قريب ولكن ماشي ببزاف.', wayOff:'بعيد على الثمن — عولنا عليك بكري.' }
  };
  // Default language is Arabic ('ar') per user specification
  let initialLanguage = 'ar';
  try {
    const savedLang = localStorage.getItem('rwida-language');
    const explicitlyChosen = localStorage.getItem('rwida-lang-chosen');
    if (explicitlyChosen && (savedLang === 'en' || savedLang === 'ar')) {
      initialLanguage = savedLang;
    } else {
      initialLanguage = 'ar';
      localStorage.setItem('rwida-language', 'ar');
    }
  } catch (_) {
    initialLanguage = 'ar';
  }
  const state = { listings: [], current: 0, results: [], deadline: 0, duration: 600, timer: null, live: false, submitting: false, imageIndex: 0, mode: localStorage.getItem('rwida-mode') === 'motorbikes' ? 'motorbikes' : 'cars', language: initialLanguage, theme: localStorage.getItem('rwida-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'), leaderboard: [], savedThisGame: false, playerName: localStorage.getItem('rwida-player-name') || '', soundEnabled: localStorage.getItem('rwida-sound') !== 'off' };
  const t = (key, replacements = {}) => Object.entries(replacements).reduce((text, [name, value]) => text.replace(`{${name}}`, value), copy[state.language][key] || key);
  const localized = (value) => value && typeof value === 'object' && !Array.isArray(value) ? (value[state.language] || value.en || value.ar || '') : (value ?? '');
  const money = (value) => {
    const rounded = Math.round(Number(value) || 0);
    const formatted = new Intl.NumberFormat(state.language === 'ar' ? 'fr-MA' : 'en-US').format(rounded);
    return state.language === 'ar' ? `\u2066${formatted}\u2069 درهم` : `${formatted} MAD`;
  };
  const formatSeconds = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const escape = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);

  const Sound = (() => {
    let ctx = null;

    function getAudioContext() {
      if (!ctx && typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        ctx = new AudioCtx();
      }
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      return ctx;
    }

    function playTone(freq, duration, type = 'sine', delay = 0, peakGain = 0.18) {
      if (!state.soundEnabled) return;
      const audio = getAudioContext();
      if (!audio) return;
      try {
        const start = audio.currentTime + delay;
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(peakGain, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        osc.connect(gain);
        gain.connect(audio.destination);

        osc.start(start);
        osc.stop(start + duration + 0.05);
      } catch (_) {}
    }

    return {
      warmup() {
        getAudioContext();
      },
      playTestChime() {
        if (!state.soundEnabled) return;
        playTone(523.25, 0.15, 'triangle', 0, 0.16);
        playTone(659.25, 0.22, 'triangle', 0.1, 0.18);
      },
      playGuessResult(score, timedOut) {
        if (!state.soundEnabled) return;
        const audio = getAudioContext();
        if (!audio) return;

        if (timedOut || score < 300) {
          // Low score or timeout: descending low tone (subtle "tough" cue)
          playTone(349.23, 0.18, 'triangle', 0.0, 0.14); // F4
          playTone(293.66, 0.18, 'triangle', 0.12, 0.14); // D4
          playTone(220.00, 0.32, 'sine', 0.24, 0.15); // A3
        } else if (score < 600) {
          // Fair score (300-599): warm, pleasant two-tone cue
          playTone(392.00, 0.18, 'sine', 0.0, 0.15); // G4
          playTone(523.25, 0.28, 'triangle', 0.12, 0.16); // C5
        } else if (score < 850) {
          // Great score (600-849): bright ascending major triad
          playTone(440.00, 0.16, 'triangle', 0.0, 0.16); // A4
          playTone(554.37, 0.16, 'triangle', 0.09, 0.18); // C#5
          playTone(659.25, 0.32, 'triangle', 0.18, 0.20); // E5
        } else {
          // Bullseye / Superb (850-1000): triumphant glittering fanfare
          playTone(523.25, 0.16, 'triangle', 0.0, 0.18); // C5
          playTone(659.25, 0.16, 'triangle', 0.08, 0.20); // E5
          playTone(783.99, 0.18, 'triangle', 0.16, 0.22); // G5
          playTone(1046.50, 0.45, 'triangle', 0.24, 0.25); // C6
          playTone(1318.51, 0.40, 'sine', 0.32, 0.14); // E6 sparkle
        }
      },
      playFinalResults(totalScore) {
        if (!state.soundEnabled) return;
        const audio = getAudioContext();
        if (!audio) return;

        if (totalScore >= 3800) {
          // High master score: Grand celebratory victory fanfare
          playTone(523.25, 0.12, 'triangle', 0.0, 0.18); // C5
          playTone(523.25, 0.12, 'triangle', 0.11, 0.18); // C5
          playTone(523.25, 0.12, 'triangle', 0.22, 0.18); // C5
          playTone(659.25, 0.25, 'triangle', 0.33, 0.22); // E5
          playTone(523.25, 0.12, 'triangle', 0.55, 0.18); // C5
          playTone(659.25, 0.18, 'triangle', 0.67, 0.22); // E5
          playTone(783.99, 0.22, 'triangle', 0.82, 0.24); // G5
          playTone(1046.50, 0.65, 'triangle', 1.00, 0.28); // C6
          playTone(1318.51, 0.50, 'sine', 1.05, 0.16); // E6 sparkle
        } else if (totalScore >= 2000) {
          // Good game completion: Upbeat completion jingle
          playTone(392.00, 0.16, 'triangle', 0.0, 0.16); // G4
          playTone(493.88, 0.16, 'triangle', 0.12, 0.17); // B4
          playTone(587.33, 0.18, 'triangle', 0.24, 0.19); // D5
          playTone(783.99, 0.45, 'triangle', 0.38, 0.22); // G5
        } else {
          // Standard completion: Gentle pleasant 3-tone chime
          playTone(349.23, 0.20, 'sine', 0.0, 0.15); // F4
          playTone(440.00, 0.20, 'sine', 0.15, 0.16); // A4
          playTone(523.25, 0.40, 'sine', 0.30, 0.18); // C5
        }
      }
    };
  })();

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
    ui.guess.placeholder = state.language === 'ar' ? 'مثال: \u2066185,000\u2069' : 'e.g. 185,000';
    if (ui.playerName) {
      ui.playerName.placeholder = t('playerNamePlaceholder');
      if (state.playerName && !ui.playerName.value) {
        ui.playerName.value = state.playerName;
      }
    }
    const currencyLabel = $('currency-label');
    if (currencyLabel) currencyLabel.textContent = state.language === 'ar' ? 'درهم' : 'MAD';
    $('language-toggle').textContent = state.language === 'en' ? 'العربية' : 'English';
    $('language-toggle').setAttribute('aria-label', t('switchLanguage'));
    $('theme-toggle').innerHTML = `<span aria-hidden="true">${state.theme === 'dark' ? '☀' : '☾'}</span>`;
    $('theme-toggle').setAttribute('aria-label', t(state.theme === 'dark' ? 'useLight' : 'useDark'));
    if (ui.soundIcon) ui.soundIcon.textContent = state.soundEnabled ? '🔊' : '🔇';
    if (ui.soundToggle) {
      ui.soundToggle.setAttribute('aria-label', t(state.soundEnabled ? 'soundOn' : 'soundOff'));
      ui.soundToggle.setAttribute('title', t(state.soundEnabled ? 'soundOn' : 'soundOff'));
    }
    ui.timer.setAttribute('aria-label', t('timeRemaining'));
    ui.previousImage.setAttribute('aria-label', t('previousPhoto')); ui.nextImage.setAttribute('aria-label', t('nextPhoto'));
    ui.zoomImage.setAttribute('aria-label', t(ui.visual.classList.contains('is-zoomed') ? 'zoomOut' : 'zoomIn'));
    ui.fullscreenImage.setAttribute('aria-label', t(document.fullscreenElement ? 'exitFullscreen' : 'openFullscreen'));
    if (!state.listings.length) { ui.roundLabel.textContent = t('ready'); ui.dataNote.textContent = t('loading'); }
    else if (state.current >= state.listings.length) ui.roundLabel.textContent = t('complete');
    else { renderDots(); renderListing(state.listings[state.current]); }
    if (ui.modeCars && ui.modeMotorbikes) {
      ui.modeCars.classList.toggle('is-active', state.mode === 'cars');
      ui.modeCars.setAttribute('aria-checked', state.mode === 'cars' ? 'true' : 'false');
      ui.modeMotorbikes.classList.toggle('is-active', state.mode === 'motorbikes');
      ui.modeMotorbikes.setAttribute('aria-checked', state.mode === 'motorbikes' ? 'true' : 'false');
    }
    if (ui.startGame) {
      ui.startGame.innerHTML = state.mode === 'motorbikes' ? t('startBikes') : t('startCars');
    }
    const heroH1 = document.querySelector('#start-screen h1');
    if (heroH1) {
      heroH1.innerHTML = state.mode === 'motorbikes' ? t('heroTitleBikes') : t('heroTitleCars');
    }
  }
  function renderDots() {
    ui.dots.innerHTML = Array.from({ length: 5 }, (_, index) => `<i class="${index < state.current ? 'done' : index === state.current ? 'active' : ''}"></i>`).join('');
    const roundKey = state.mode === 'motorbikes' ? 'roundBikes' : 'roundCars';
    ui.roundLabel.textContent = state.current < 5 ? t(roundKey, { n: state.current + 1 }) : t('complete');
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
    const isBike = item.kind === 'Moto' || item.kind === 'Motorbike';
    ui.kind.textContent = isBike ? t('bike') : t('car');
    ui.facts.innerHTML = (item.quickFacts || []).map((fact) => `<span dir="auto"><bdi>${escape(localized(fact))}</bdi></span>`).join('');
    ui.summary.textContent = localized(item.summary);
    ui.summary.setAttribute('dir', state.language === 'ar' ? 'rtl' : 'ltr');
    let featureEntries = Array.isArray(item.features) ? item.features.map((feature) => [feature.label, feature.value]) : Object.entries(item.features || {});
    
    // For cars, remove "Statut de douane" and "Tax horsepower" from features
    if (!isBike) {
      featureEntries = featureEntries.filter(([label]) => {
        const en = (label && typeof label === 'object' ? (label.en || label.fr || label.raw || '') : String(label || '')).toLowerCase().trim();
        const ar = (label && typeof label === 'object' ? (label.ar || '') : '').toLowerCase().trim();
        if (en.includes('douane') || ar.includes('douane') || en.includes('customs') || ar.includes('جمارك')) {
          return false;
        }
        if (en.includes('tax horsepower') || en === 'tax hp' || en.includes('puissance fiscale') || ar.includes('الجبائية')) {
          return false;
        }
        return true;
      });
    }

    // For motorbikes, ensure Cylinders is always displayed in features
    if (isBike) {
      const hasCyl = featureEntries.some(([label]) => {
        const lblStr = (typeof label === 'object' ? (label.en || label.ar || '') : String(label)).toLowerCase();
        return lblStr.includes('cylinder') || lblStr.includes('cylindre') || lblStr.includes('أسطوان');
      });
      if (!hasCyl) {
        let cylValue = { en: '1 cylinder', ar: 'أسطوانة واحدة' };
        const titleStr = (typeof item.title === 'object' ? (item.title.en || item.title.ar || '') : String(item.title)).toLowerCase();
        if (titleStr.includes('1800') || titleStr.includes('goldwing')) cylValue = { en: '6 cylinders (Flat-6)', ar: '6 أسطوانات (Flat-6)' };
        else if (titleStr.includes('z900') || titleStr.includes('cbr') || titleStr.includes('r1')) cylValue = { en: '4 cylinders', ar: '4 أسطوانات' };
        else if (titleStr.includes('spyder') || titleStr.includes('triple')) cylValue = { en: '3 cylinders', ar: '3 أسطوانات' };
        else if (titleStr.includes('750') || titleStr.includes('500') || titleStr.includes('650') || titleStr.includes('tmax') || titleStr.includes('x-adv') || titleStr.includes('harley')) cylValue = { en: '2 cylinders', ar: 'أسطوانتان' };
        featureEntries.unshift([{ en: 'Cylinders', ar: 'عدد الأسطوانات' }, cylValue]);
      }
    }

    ui.features.innerHTML = featureEntries.map(([label, value]) => `<div><dt dir="auto"><bdi>${escape(localized(label))}</bdi></dt><dd dir="auto"><bdi>${escape(localized(value))}</bdi></dd></div>`).join('');
    ui.options.innerHTML = (item.options || []).length
      ? item.options.map((option) => {
          const text = (option && typeof option === 'object' && !Array.isArray(option))
            ? (option.raw || option.fr || localized(option))
            : (option ?? '');
          return `<span dir="auto"><bdi>${escape(text)}</bdi></span>`;
        }).join('')
      : `<span>${t('noOptions')}</span>`;
    ui.emoji.textContent = isBike ? '🏍️' : '🚗';
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
    if (!timedOut && (guess === null || !Number.isFinite(guess) || guess <= 0)) {
      ui.error.textContent = t('invalidGuess'); ui.error.classList.remove('hidden'); return;
    }
    state.submitting = true; window.clearInterval(state.timer);
    let result;
    try {
      if (state.live && item.token) {
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
  function calculateCloseness(guess, actualPrice, timedOut) {
    if (timedOut || guess === null || !actualPrice || actualPrice <= 0) return 0;
    const diff = Math.abs(guess - actualPrice);
    const ratio = diff / actualPrice;
    if (ratio >= 1) return 0;
    const pct = (1 - ratio) * 100;
    return Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
  }

  function showResult(item, result) {
    const guessText = result.timedOut ? t('timeUp') : money(result.guess);
    state.results.push({ title: item.title, score: result.score, actual: result.actualPrice, guess: result.guess });
    ui.resultTitle.textContent = localized(item.title);
    ui.actual.textContent = money(result.actualPrice);
    ui.guessed.textContent = guessText;
    ui.difference.textContent = result.difference === null ? '—' : money(result.difference);
    ui.score.innerHTML = `<span dir="ltr"><bdi>${result.score}</bdi> / 1 000</span>`;
    ui.message.textContent = scoreCopy(result);

    // Calculate and stress the closeness percentage
    const closeness = calculateCloseness(result.guess, result.actualPrice, result.timedOut);
    const formattedPct = `${closeness.toFixed(1)}%`;
    if (ui.closenessPct) ui.closenessPct.textContent = formattedPct;
    if (ui.closenessCell) ui.closenessCell.textContent = result.timedOut ? '0%' : formattedPct;
    if (ui.closenessFill) ui.closenessFill.style.width = `${closeness}%`;

    if (ui.closenessBadge) {
      ui.closenessBadge.className = 'closeness-badge';
      let tier = 'is-low';
      let verdict = t('wayOff');
      if (result.timedOut) {
        tier = 'is-low';
        verdict = t('timeUp');
      } else if (closeness >= 95) {
        tier = 'is-superb';
        verdict = t('bullseye');
      } else if (closeness >= 80) {
        tier = 'is-great';
        verdict = t('almostExact');
      } else if (closeness >= 55) {
        tier = 'is-good';
        verdict = t('solidGuess');
      } else if (closeness >= 30) {
        tier = 'is-fair';
        verdict = t('fairEstimate');
      }
      ui.closenessBadge.classList.add(tier);
      if (ui.closenessCell) ui.closenessCell.className = tier;
      if (ui.closenessFill) ui.closenessFill.className = `closeness-fill ${tier}`;
      if (ui.closenessLabel) ui.closenessLabel.textContent = `${verdict} (${formattedPct} ${t('closeToPrice')})`;
    }

    ui.source.classList.toggle('hidden', !item.sourceUrl);
    if (item.sourceUrl) ui.source.href = item.sourceUrl;
    ui.next.textContent = state.current === 4 ? t('finalNext') : t('next');
    setScreen('result');
    Sound.playGuessResult(result.score, result.timedOut);
  }
  function nextRound() { state.current += 1; startRound(); }

  async function fetchLeaderboard() {
    try {
      const res = await fetch('/api/leaderboard', { cache: 'no-store' });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      if (Array.isArray(data.leaderboard)) {
        state.leaderboard = data.leaderboard;
        renderLeaderboard();
        return;
      }
    } catch (_) {}

    // Fallback direct read from JSONbin if local endpoint has transient issue
    try {
      const binRes = await fetch('https://api.jsonbin.io/v3/b/6aa05769ac6210605ab4d5b9/latest', {
        headers: { 'X-Master-Key': '$2a$10$3xI2W00BsiGhjbq2yCC4jeq6sj7TqNA3I1lGa2AAfthmUjM5M.r7q' }
      });
      if (binRes.ok) {
        const payload = await binRes.json();
        if (Array.isArray(payload.record)) {
          state.leaderboard = payload.record.map((r, i) => ({
            rank: i + 1,
            name: Array.isArray(r) ? r[0] : (r.name || 'Anonymous'),
            score: Array.isArray(r) ? Number(r[1]) : (Number(r.score) || 0),
            mode: Array.isArray(r) ? (r[2] || 'cars') : (r.mode || 'cars')
          })).sort((a, b) => b.score - a.score).map((r, i) => ({ ...r, rank: i + 1 }));
          renderLeaderboard();
          return;
        }
      }
    } catch (e) {}

    renderLeaderboard();
  }

  function renderLeaderboard() {
    const list = state.leaderboard || [];
    const total = state.results.reduce((sum, r) => sum + (r.score || 0), 0);
    const html = list.length
      ? list.map((item) => {
          let medal = '';
          if (item.rank === 1) medal = '🥇';
          else if (item.rank === 2) medal = '🥈';
          else if (item.rank === 3) medal = '🥉';
          const isMe = state.savedThisGame && item.name === state.playerName && item.score === total;
          const formattedScore = new Intl.NumberFormat(state.language === 'ar' ? 'fr-MA' : 'en-US').format(item.score);
          const modeIcon = item.mode === 'motorbikes' ? '🏍️' : '🚗';
          return `<li class="lb-row ${isMe ? 'is-me' : ''} ${item.rank <= 3 ? 'is-podium' : ''}">
            <span class="lb-rank">${medal || `#${item.rank}`}</span>
            <span class="lb-name" title="${escape(item.name)}">
              <span class="lb-mode" title="${item.mode === 'motorbikes' ? 'Motorbikes' : 'Cars'}">${modeIcon}</span>
              <bdi class="lb-name-text">${escape(item.name)}</bdi>
            </span>
            <span class="lb-score" dir="ltr"><bdi>${formattedScore}</bdi> <small>pts</small></span>
          </li>`;
        }).join('')
      : `<li class="lb-empty">${t('emptyLb')}</li>`;

    if (ui.finalLeaderboardList) ui.finalLeaderboardList.innerHTML = html;
    if (ui.dialogLeaderboardList) ui.dialogLeaderboardList.innerHTML = html;
  }

  function showLeaderboardFeedback(msg, type = 'info') {
    if (!ui.leaderboardFeedback) return;
    ui.leaderboardFeedback.textContent = msg;
    ui.leaderboardFeedback.className = `leaderboard-feedback ${type}`;
  }

  async function handleScoreSubmit(e) {
    if (e) e.preventDefault();
    if (state.savedThisGame) {
      showLeaderboardFeedback(t('alreadySaved'), 'info');
      return;
    }
    const name = (ui.playerName ? ui.playerName.value : '').trim();
    if (!name) {
      showLeaderboardFeedback(t('nameRequired'), 'error');
      if (ui.playerName) ui.playerName.focus();
      return;
    }
    state.playerName = name;
    localStorage.setItem('rwida-player-name', name);
    const total = state.results.reduce((sum, r) => sum + r.score, 0);

    if (ui.saveScoreBtn) {
      ui.saveScoreBtn.disabled = true;
      ui.saveScoreBtn.innerHTML = t('savingScore');
    }
    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, score: total, mode: state.mode })
      });
      if (!res.ok) throw new Error('Failed to save score');
      const data = await res.json();
      state.savedThisGame = true;
      if (Array.isArray(data.leaderboard)) {
        state.leaderboard = data.leaderboard;
      }
      if (ui.saveScoreBtn) {
        ui.saveScoreBtn.innerHTML = t('savedScore');
        ui.saveScoreBtn.classList.add('is-saved');
      }
      if (ui.playerName) ui.playerName.disabled = true;
      const rank = data.rank || (state.leaderboard.findIndex((x) => x.name === name && x.score === total) + 1);
      showLeaderboardFeedback(t('scoreRanked', { rank: rank || '—' }), 'success');
      renderLeaderboard();
    } catch (err) {
      if (ui.saveScoreBtn) {
        ui.saveScoreBtn.disabled = false;
        ui.saveScoreBtn.innerHTML = t('saveScoreBtn');
      }
      showLeaderboardFeedback(t('saveFailed'), 'error');
    }
  }

  function finishGame() {
    window.clearInterval(state.timer); renderDots();
    const total = state.results.reduce((sum, result) => sum + result.score, 0);
    ui.total.textContent = new Intl.NumberFormat(state.language === 'ar' ? 'fr-MA' : 'en-US').format(total);
    ui.breakdown.innerHTML = state.results.map((result, index) => `<div dir="ltr"><small>${state.language === 'ar' ? 'ج' : 'R'}${index + 1}</small><br><bdi>${result.score}</bdi></div>`).join('');

    // Reset leaderboard submission form state for new game completion
    state.savedThisGame = false;
    if (ui.saveScoreBtn) {
      ui.saveScoreBtn.disabled = false;
      ui.saveScoreBtn.classList.remove('is-saved');
      ui.saveScoreBtn.innerHTML = t('saveScoreBtn');
    }
    if (ui.playerName) {
      ui.playerName.disabled = false;
      if (state.playerName) ui.playerName.value = state.playerName;
    }
    if (ui.leaderboardFeedback) {
      ui.leaderboardFeedback.className = 'leaderboard-feedback hidden';
      ui.leaderboardFeedback.textContent = '';
    }

    setScreen('final');
    Sound.playFinalResults(total);
    fetchLeaderboard();
  }
  function normalizeDigits(str) {
    return String(str || '')
      .replace(/[\u0660-\u0669]/g, (d) => d.charCodeAt(0) - 1632)
      .replace(/[\u06F0-\u06F9]/g, (d) => d.charCodeAt(0) - 1776);
  }
  function cleanGuess(value) {
    const raw = normalizeDigits(value).replace(/[^\d]/g, '');
    return raw ? Number(raw) : null;
  }
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
  function openLightbox() {
    const item = state.listings[state.current];
    const images = item && listingImages(item);
    if (!images || !images.length) return;
    updateLightbox();
    if (!ui.lightbox.open) {
      ui.lightbox.showModal();
    }
    try {
      if (ui.lightbox.requestFullscreen && !document.fullscreenElement) {
        ui.lightbox.requestFullscreen().catch(() => {});
      }
    } catch (_) {}
  }
  function closeLightbox() {
    ui.lightbox.classList.remove('is-zoomed');
    if (ui.lightbox.open) {
      ui.lightbox.close();
    }
    if (document.fullscreenElement) {
      try { document.exitFullscreen().catch(() => {}); } catch (_) {}
    }
  }
  function updateLightbox() {
    const item = state.listings[state.current];
    const images = item && listingImages(item);
    if (!images || !images.length) return;
    state.imageIndex = ((state.imageIndex % images.length) + images.length) % images.length;
    ui.lightboxImage.src = images[state.imageIndex];
    ui.lightboxImage.alt = localized(item.title);
    ui.lightboxCount.textContent = `${state.imageIndex + 1} / ${images.length}`;
    ui.lightboxPrev.disabled = images.length < 2;
    ui.lightboxNext.disabled = images.length < 2;
    ui.lightbox.classList.remove('is-zoomed');
    ui.lightboxZoom.setAttribute('aria-label', t('zoomIn'));
  }
  function toggleLightboxZoom() {
    ui.lightbox.classList.toggle('is-zoomed');
    const isZoomed = ui.lightbox.classList.contains('is-zoomed');
    ui.lightboxZoom.setAttribute('aria-label', t(isZoomed ? 'zoomOut' : 'zoomIn'));
  }
  function changeLightboxImage(delta) {
    const item = state.listings[state.current];
    const images = item && listingImages(item);
    if (!images || images.length < 2) return;
    state.imageIndex += delta;
    updateLightbox();
    renderImage(item);
  }
  async function loadGame() {
    const seconds = Math.min(3000, Math.max(30, Number(ui.duration.value) || 600));
    const mode = state.mode || 'cars';
    try {
      const response = await fetch(`/api/game?seconds=${seconds}&mode=${mode}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('no game endpoint');
      const payload = await response.json();
      if (!Array.isArray(payload.round) || payload.round.length < 5) throw new Error('not enough listings');
      state.listings = payload.round; state.live = true;
      ui.dataNote.textContent = t('liveData');
    } catch (_) {
      let pool = [];
      try {
        const staticRes = await fetch('/data/listings.imported.json');
        if (staticRes.ok) {
          pool = await staticRes.json();
          window.DEMO_LISTINGS = pool;
        }
      } catch (e) {}
      if (!pool.length && Array.isArray(window.DEMO_LISTINGS) && window.DEMO_LISTINGS.length) {
        pool = window.DEMO_LISTINGS;
      }
      if (mode === 'motorbikes') {
        const filtered = pool.filter((item) => (item.kind || '').toLowerCase().includes('moto') || (item.kind || '').toLowerCase().includes('bike'));
        if (filtered.length >= 5) pool = filtered;
      } else {
        const filtered = pool.filter((item) => (item.kind || '').toLowerCase().includes('car') || item.kind === 'Voiture');
        if (filtered.length >= 5) pool = filtered;
      }
      state.listings = selectFive(pool); state.live = false;
      ui.dataNote.textContent = t('liveData');
    }
  }
  function setMode(mode) {
    if (state.mode === mode) return;
    state.mode = mode;
    localStorage.setItem('rwida-mode', mode);
    applyPreferences();
    loadGame();
  }
  if (ui.modeCars) ui.modeCars.addEventListener('click', () => setMode('cars'));
  if (ui.modeMotorbikes) ui.modeMotorbikes.addEventListener('click', () => setMode('motorbikes'));
  if (ui.duration) {
    ui.duration.addEventListener('change', () => {
      state.duration = Math.min(3000, Math.max(30, Number(ui.duration.value) || 600));
    });
  }
  $('start-game').addEventListener('click', async () => {
    Sound.warmup();
    $('start-game').disabled = true; $('start-game').textContent = t('preparing');
    state.duration = Math.min(3000, Math.max(30, Number(ui.duration.value) || 600));
    await loadGame();
    $('start-game').disabled = false;
    $('start-game').innerHTML = state.mode === 'motorbikes' ? t('startBikes') : t('startCars');
    if (state.listings.length < 5) { ui.dataNote.textContent = t('insufficient'); return; }
    state.current = 0; state.results = []; startRound();
  });
  ui.form.addEventListener('submit', (event) => {
    event.preventDefault();
    Sound.warmup();
    submitGuess(cleanGuess(ui.guess.value));
  });
  document.querySelectorAll('.increment-btn[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const add = Number(btn.getAttribute('data-add')) || 0;
      const current = cleanGuess(ui.guess.value) || 0;
      const nextVal = current + add;
      ui.guess.value = nextVal ? new Intl.NumberFormat('en-US').format(nextVal) : '';
      ui.error.classList.add('hidden');
      ui.guess.focus();
    });
  });
  const clearBtn = $('clear-guess-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      ui.guess.value = '';
      ui.error.classList.add('hidden');
      ui.guess.focus();
    });
  }
  ui.guess.addEventListener('input', () => {
    const raw = normalizeDigits(ui.guess.value).replace(/[^\d]/g, '');
    if (!raw) return;
    const num = Number(raw);
    if (Number.isFinite(num) && raw.length > 3) {
      const formatted = new Intl.NumberFormat('en-US').format(num);
      if (ui.guess.value !== formatted) {
        ui.guess.value = formatted;
      }
    } else if (raw !== ui.guess.value && !raw.includes(',')) {
      ui.guess.value = raw;
    }
  });
  ui.next.addEventListener('click', nextRound);
  $('play-again').addEventListener('click', () => { setScreen('start'); loadGame(); });
  $('how-to-play').addEventListener('click', () => $('rules-dialog').showModal());
  $('close-rules').addEventListener('click', () => $('rules-dialog').close());
  $('rules-dialog').addEventListener('click', (e) => {
    if (e.target === $('rules-dialog')) $('rules-dialog').close();
  });

  if (ui.leaderboardForm) {
    ui.leaderboardForm.addEventListener('submit', handleScoreSubmit);
  }
  if (ui.leaderboardToggle && ui.leaderboardDialog) {
    ui.leaderboardToggle.addEventListener('click', () => {
      fetchLeaderboard();
      ui.leaderboardDialog.showModal();
    });
  }
  if (ui.closeLeaderboard && ui.leaderboardDialog) {
    ui.closeLeaderboard.addEventListener('click', () => ui.leaderboardDialog.close());
  }
  if (ui.leaderboardDialog) {
    ui.leaderboardDialog.addEventListener('click', (e) => {
      if (e.target === ui.leaderboardDialog) ui.leaderboardDialog.close();
    });
  }
  if (ui.finalRefreshLb) {
    ui.finalRefreshLb.addEventListener('click', () => {
      ui.finalRefreshLb.classList.add('is-spinning');
      fetchLeaderboard().finally(() => {
        setTimeout(() => ui.finalRefreshLb.classList.remove('is-spinning'), 500);
      });
    });
  }
  ui.previousImage.addEventListener('click', () => changeImage(-1));
  ui.nextImage.addEventListener('click', () => changeImage(1));
  ui.zoomImage.addEventListener('click', toggleZoom);
  ui.image.addEventListener('click', toggleZoom);
  ui.fullscreenImage.addEventListener('click', openLightbox);
  ui.lightboxClose.addEventListener('click', closeLightbox);
  ui.lightboxPrev.addEventListener('click', () => changeLightboxImage(document.documentElement.dir === 'rtl' ? 1 : -1));
  ui.lightboxNext.addEventListener('click', () => changeLightboxImage(document.documentElement.dir === 'rtl' ? -1 : 1));
  ui.lightboxZoom.addEventListener('click', toggleLightboxZoom);
  ui.lightboxImage.addEventListener('click', toggleLightboxZoom);
  ui.lightbox.addEventListener('click', (e) => {
    if (e.target === ui.lightbox) closeLightbox();
  });
  ui.image.addEventListener('error', () => {
    const item = state.listings[state.current];
    const images = item && listingImages(item);
    if (images && images.length > 1 && state.imageIndex < images.length - 1) {
      state.imageIndex += 1;
      renderImage(item, false);
      return;
    }
    ui.image.classList.add('hidden');
    ui.fallback.classList.remove('hidden');
    ui.gallery.classList.add('hidden');
    ui.imageActions.classList.add('hidden');
  });
  document.addEventListener('fullscreenchange', () => {
    const isFs = Boolean(document.fullscreenElement);
    ui.fullscreenImage.setAttribute('aria-label', t(isFs ? 'exitFullscreen' : 'openFullscreen'));
  });
  document.addEventListener('keydown', (event) => {
    if (document.activeElement === ui.guess || event.altKey || event.ctrlKey || event.metaKey) return;
    if (ui.lightbox.open) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeLightbox();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        changeLightboxImage(document.documentElement.dir === 'rtl' ? 1 : -1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        changeLightboxImage(document.documentElement.dir === 'rtl' ? -1 : 1);
      }
      return;
    }
    if (event.key === 'ArrowLeft') changeImage(document.documentElement.dir === 'rtl' ? 1 : -1);
    if (event.key === 'ArrowRight') changeImage(document.documentElement.dir === 'rtl' ? -1 : 1);
  });
  $('language-toggle').addEventListener('click', () => {
    state.language = state.language === 'en' ? 'ar' : 'en';
    try {
      localStorage.setItem('rwida-lang-chosen', 'true');
      localStorage.setItem('rwida-language', state.language);
    } catch (_) {}
    applyPreferences();
  });
  $('theme-toggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('rwida-theme', state.theme); applyPreferences();
  });
  if (ui.soundToggle) {
    ui.soundToggle.addEventListener('click', () => {
      Sound.warmup();
      state.soundEnabled = !state.soundEnabled;
      localStorage.setItem('rwida-sound', state.soundEnabled ? 'on' : 'off');
      applyPreferences();
      if (state.soundEnabled) Sound.playTestChime();
    });
  }
  applyPreferences();
  loadGame();
})();
