(() => {
  const $ = (id) => document.getElementById(id);
  const ui = {
    start: $('start-screen'), game: $('game-screen'), result: $('result-screen'), final: $('final-screen'),
    duration: $('duration'), fuelFilter: $('fuel-filter'), fuelGroup: $('fuel-filter-group'), regionFilter: $('region-filter'), dataNote: $('data-note'), roundLabel: $('round-label'), dots: $('round-dots'),
    title: $('vehicle-title'), kind: $('vehicle-kind'), vehicleLocation: $('vehicle-location-badge'), timer: $('timer'), progress: $('progress-value'),
    facts: $('quick-facts'), features: $('features'), options: $('options'),
    image: $('vehicle-image'), fallback: $('vehicle-fallback'), emoji: $('vehicle-emoji'), visual: $('vehicle-visual'), photoSkipToast: $('photo-skip-toast'), gallery: $('gallery-controls'), imageActions: $('image-actions'), imageCount: $('image-count'), previousImage: $('image-prev'), nextImage: $('image-next'), zoomImage: $('image-zoom'), fullscreenImage: $('image-fullscreen'), guess: $('guess'),
    lightbox: $('image-lightbox'), lightboxClose: $('lightbox-close'), lightboxPrev: $('lightbox-prev'), lightboxNext: $('lightbox-next'), lightboxImage: $('lightbox-image'), lightboxZoom: $('lightbox-zoom'), lightboxZoomOut: $('lightbox-zoom-out'), lightboxCount: $('lightbox-count'),
    form: $('guess-form'), error: $('form-error'), resultTitle: $('result-title'), actual: $('actual-price'),
    guessed: $('your-guess'), difference: $('difference'), score: $('round-score'), message: $('result-message'),
    closenessPct: $('closeness-pct'), closenessFill: $('closeness-fill'), closenessCell: $('closeness-cell'),
    closenessLabel: $('closeness-label'), closenessBadge: $('closeness-badge'),
    marketCard: $('market-slider-card'), marketVerdictBadge: $('market-verdict-badge'), marketDiffPill: $('market-diff-pill'),
    marketNeedle: $('market-needle'), marketTooltipPrice: $('market-tooltip-price'),
    marketEstimateVal: $('market-estimate-val'), marketSellerVal: $('market-seller-val'),
    marketGapVal: $('market-gap-val'),
    leaderboardToggle: $('leaderboard-toggle'), leaderboardDialog: $('leaderboard-dialog'), closeLeaderboard: $('close-leaderboard'),
    leaderboardForm: $('leaderboard-form'), playerName: $('player-name'), saveScoreBtn: $('save-score-btn'),
    leaderboardFeedback: $('leaderboard-feedback'), finalLeaderboardList: $('final-leaderboard-list'),
    dialogLeaderboardList: $('dialog-leaderboard-list'), finalRefreshLb: $('final-refresh-lb'),
    source: $('source-link'), next: $('next-round'), total: $('total-score'), breakdown: $('score-breakdown'),
    typeSale: $('type-sale'), typeRental: $('type-rental'),
    modeCars: $('mode-cars'), modeMotorbikes: $('mode-motorbikes'), startGame: $('start-game'),
    soundToggle: $('sound-toggle'), soundIcon: $('sound-icon')
  };
  const copy = {
    en: { howTo:'How to play', eyebrow:'Cars & motorbikes · Morocco', typeLabel:'Game mode', typeSale:'For Sale (Buy)', typeRental:'For Rent (Daily)', heroTitle:'What’s the price<br /><em>of this vehicle?</em>', heroTitleCars:'What’s the price<br /><em>of this car?</em>', heroTitleBikes:'What’s the price<br /><em>of this motorbike?</em>', heroTitleRentalCars:'What’s the daily rent<br /><em>of this car?</em>', heroTitleRentalBikes:'What’s the daily rent<br /><em>of this motorbike?</em>', modeLabel:'Vehicle category', modeCars:'Cars', modeBikes:'Motorbikes', fuelLabel:'Fuel type (optional)', fuelAll:'All fuel types (National)', fuelDiesel:'Diesel (Gasoil)', fuelPetrol:'Petrol (Essence)', fuelHybrid:'Hybrid (Hybride)', fuelElectric:'100% Electric (Électrique)', fuelEco:'Electric & Hybrid', startCarsDiesel:'Start 5 Diesel rounds <span>→</span>', startCarsPetrol:'Start 5 Petrol rounds <span>→</span>', startCarsElectric:'Start 5 Electric rounds <span>→</span>', startCarsHybrid:'Start 5 Hybrid rounds <span>→</span>', startCarsEco:'Start 5 Eco rounds <span>→</span>', startRentalCars:'Start 5 Car Rental rounds <span>→</span>', startRentalBikes:'Start 5 Moto Rental rounds <span>→</span>', startRentalCarsDiesel:'Start 5 Diesel Rental rounds <span>→</span>', startRentalCarsPetrol:'Start 5 Petrol Rental rounds <span>→</span>', startRentalCarsElectric:'Start 5 Electric Rental rounds <span>→</span>', startRentalCarsHybrid:'Start 5 Hybrid Rental rounds <span>→</span>', startRentalCarsEco:'Start 5 Eco Rental rounds <span>→</span>', roundCarsDiesel:'Cars (Diesel) · Round {n} of 5', roundCarsPetrol:'Cars (Petrol) · Round {n} of 5', roundCarsElectric:'Cars (Electric) · Round {n} of 5', roundCarsHybrid:'Cars (Hybrid) · Round {n} of 5', roundCarsEco:'Cars (Eco) · Round {n} of 5', roundRentalCars:'Car Rental · Round {n} of 5', roundRentalBikes:'Moto Rental · Round {n} of 5', roundRentalCarsDiesel:'Car Rental (Diesel) · Round {n} of 5', roundRentalCarsPetrol:'Car Rental (Petrol) · Round {n} of 5', roundRentalCarsElectric:'Car Rental (Electric) · Round {n} of 5', roundRentalCarsHybrid:'Car Rental (Hybrid) · Round {n} of 5', roundRentalCarsEco:'Car Rental (Eco) · Round {n} of 5', regionLabel:'Region or city (optional)', regionAll:'All Morocco (National)', regionCasa:'Casablanca - Settat (Casablanca, Mohammedia...)', regionRabat:'Rabat - Salé - Kénitra (Témara...)', regionTanger:'Tangier - Tétouan (North, Nador...)', regionMarrakech:'Marrakech - Agadir (South, Safi...)', regionOriental:'Fès - Meknès - Oriental (Oujda...)', intro:'Five listings, their full details, and zero price clues. Estimate the listed price in dirhams.', introRental:'Five rental listings, their full details, and zero price clues. Estimate the daily rental rate in dirhams (MAD / day).', durationLabel:'Maximum time per guess', tenMinutes:'10 minutes', thirtyMinutes:'30 minutes', fiftyMinutes:'50 minutes (maximum)', durationNote:'Time is capped at 50 minutes for every listing.', start:'Start 5 rounds <span>→</span>', startCars:'Start 5 Car rounds <span>→</span>', startBikes:'Start 5 Motorbike rounds <span>→</span>', priceHidden:'Price hidden', summaryHeading:'Spécifications rapides', featuresHeading:'Features', optionsHeading:'Equipment & options', yourGuess:'Your guess', submit:'Submit <span>→</span>', quickIncrements:'Quick add:', clearInput:'Reset', result:'Result', listedPrice:'Listed price', listedPriceRental:'Daily rental rate', difference:'Difference', points:'Points', viewSource:'View source listing ↗', gameOver:'Game complete', finalTitle:'You’ve got an eye for it.', outOfFive:'points out of 5,000', playAgain:'Play again <span>↻</span>', rules:'Rules', rulesTitle:'Five prices to estimate.', rulesCopy1:'For every listing, study the vehicle, its details, and every option. Enter the price you think is listed. The closer you are, the more points you earn.', rulesCopy2:'A timer begins each round and can never be longer than 50 minutes.', rulesCopy3:'At the end, save your name to the Leaderboard and see how your eye for car prices ranks!', ready:'Ready to play', round:'Round {n} of 5', roundCars:'Cars · Round {n} of 5', roundBikes:'Motorbikes · Round {n} of 5', complete:'Game complete', vehicle:'Vehicle listing', car:'Car listing', bike:'Motorbike listing', carRental:'Car rental · Daily rate', bikeRental:'Motorbike rental · Daily rate', invalidGuess:'Enter a valid price in MAD.', failedGuess:'We could not validate that guess. Please try again.', loading:'Loading listings…', liveData:'Verified listings — prices reveal after each guess.', previewData:'Preview mode — add the Cloudflare secrets to load your authorized listings.', insufficient:'At least five valid listings are needed to play.', preparing:'Preparing…', next:'Next round →', finalNext:'See my final score →', timeUp:'Time is up', expired:'Time is up — the price is revealed, but this round earns no points.', excellent:'Impressive: your estimate was extremely close.', great:'Great instinct — you are in the right range.', okay:'Not bad. The vehicle details made the difference.', tough:'That one was difficult. Every round counts.', noOptions:'No options listed', timeRemaining:'Time remaining', switchLanguage:'Switch to Arabic', useDark:'Use dark mode', useLight:'Use light mode', soundOn:'Sound effects enabled', soundOff:'Sound effects muted', previousPhoto:'Previous photo', nextPhoto:'Next photo', zoomIn:'Zoom in', zoomOut:'Zoom out', openFullscreen:'Open fullscreen', exitFullscreen:'Exit fullscreen', closenessKicker:'Accuracy', closeToPrice:'close to actual price', closenessCol:'Closeness', saveScoreTitle:'Save your score to the Leaderboard', saveScoreHint:'Compete against other players across Morocco.', saveScoreBtn:'Save score <span>→</span>', savingScore:'Saving…', savedScore:'✓ Score Saved', scoreRanked:'🎉 Ranked #{rank}! Your score is on the leaderboard.', alreadySaved:'Your score has already been saved.', nameRequired:'Please enter your name or nickname.', saveFailed:'Could not save score. Please try again.', topScorers:'Top Scorers', loadingLb:'Loading leaderboard…', emptyLb:'No scores yet. Be the first!', leaderboardBtn:'Leaderboard', leaderboardTitle:'Top Scorers', leaderboardEyebrow:'Hall of Fame', playerNamePlaceholder:'Enter your name / nickname', bullseye:'Bullseye! Extremely close to the price.', almostExact:'Excellent! Very close to listed price.', solidGuess:'Solid guess — within the right range.', fairEstimate:'Fair estimate, but options made the difference.', wayOff:'Far from listed price — this one was tricky.', photoMissingSkipped:'Photos unavailable — moving to another listing…', unavailable:'Unavailable', unavailableHint:'No vehicles available for this selection', marketKicker:'Market analysis', marketSliderTitle:"Owner vs Market", marketSliderTitleRental:"Agency vs Market", sellerPrice:'', marketAvgTag:'Market avg', zoneDeal:'Deal', zoneFair:'Fair price', zoneHigh:'Above market', zoneOverpriced:'Overpriced', marketEstimateLbl:'Market avg', sellerPriceLbl:"Owner's price", sellerPriceLblRental:"Agency daily rate", marketGapLbl:'Difference', verdictDeal:'Under market', verdictFair:'Fair price', verdictHigh:'Above market', verdictOverpriced:'Overpriced' },
    ar: { howTo:'كيفاش تلعب', eyebrow:'سيارات ودراجات نارية · المغرب', typeLabel:'نظام اللعب', typeSale:'للبيع (شراء)', typeRental:'للكراء (يومي)', heroTitle:'كم يبلغ سعر<br /><em>هاد الحديدة؟</em>', heroTitleCars:'كم يبلغ سعر<br /><em>هذه السيارة؟</em>', heroTitleBikes:'كم يبلغ سعر<br /><em>هذه الدراجة النارية؟</em>', heroTitleRentalCars:'بشحال كتكرا<br /><em>هاد السيارة فالنهار؟</em>', heroTitleRentalBikes:'بشحال كتكرا<br /><em>هاد الدراجة النارية فالنهار؟</em>', modeLabel:'نوع المركبات', modeCars:'سيارات', modeBikes:'دراجات نارية', fuelLabel:'نوع الوقود (اختياري)', fuelAll:'كافة أنواع الوقود (الكل)', fuelDiesel:'مازوط (Diesel)', fuelPetrol:'ليصانص (Essence)', fuelHybrid:'إيبريد (Hybride)', fuelElectric:'كهربائي 100% (100% Électrique)', fuelEco:'كهربائي وإيبريد (Électrique & Hybride)', startCarsDiesel:'ابدأ 5 جولات سيارات (مازوط) <span>→</span>', startCarsPetrol:'ابدأ 5 جولات سيارات (ليصانص) <span>→</span>', startCarsElectric:'ابدأ 5 جولات سيارات كهربائية <span>→</span>', startCarsHybrid:'ابدأ 5 جولات سيارات (إيبريد) <span>→</span>', startCarsEco:'ابدأ 5 جولات سيارات (إيكو) <span>→</span>', startRentalCars:'ابدأ 5 جولات كراء سيارات <span>→</span>', startRentalBikes:'ابدأ 5 جولات كراء دراجات نارية <span>→</span>', startRentalCarsDiesel:'ابدأ 5 جولات كراء سيارات (مازوط) <span>→</span>', startRentalCarsPetrol:'ابدأ 5 جولات كراء سيارات (ليصانص) <span>→</span>', startRentalCarsElectric:'ابدأ 5 جولات كراء سيارات كهربائية <span>→</span>', startRentalCarsHybrid:'ابدأ 5 جولات كراء سيارات (إيبريد) <span>→</span>', startRentalCarsEco:'ابدأ 5 جولات كراء سيارات (إيكو) <span>→</span>', roundCarsDiesel:'سيارات (مازوط) · الجولة {n} من 5', roundCarsPetrol:'سيارات (ليصانص) · الجولة {n} من 5', roundCarsElectric:'سيارات (كهربائي) · الجولة {n} من 5', roundCarsHybrid:'سيارات (إيبريد) · الجولة {n} من 5', roundCarsEco:'سيارات (كهربائي/إيبريد) · الجولة {n} من 5', roundRentalCars:'كراء سيارات · الجولة {n} من 5', roundRentalBikes:'كراء دراجات نارية · الجولة {n} من 5', roundRentalCarsDiesel:'كراء سيارات (مازوط) · الجولة {n} من 5', roundRentalCarsPetrol:'كراء سيارات (ليصانص) · الجولة {n} من 5', roundRentalCarsElectric:'كراء سيارات (كهربائي) · الجولة {n} من 5', roundRentalCarsHybrid:'كراء سيارات (إيبريد) · الجولة {n} من 5', roundRentalCarsEco:'كراء سيارات (إيكو) · الجولة {n} من 5', regionLabel:'المنطقة أو المدينة (اختياري)', regionAll:'كافة المدن المغربية (المغرب كامل)', regionCasa:'الدار البيضاء - سطات (كازا، المحمدية...)', regionRabat:'الرباط - سلا - القنيطرة (تمارة...)', regionTanger:'طنجة - تطوان - الشمال (الناظور...)', regionMarrakech:'مراكش - أكادير - الجنوب (آسفي...)', regionOriental:'فاس - مكناس - الشرق (وجدة، خريبكة...)', intro:'خمس إعلانات وتفاصيلها الكاملة من دون أي تلميح للسعر. قدّر السعر المعروض بالدرهم.', introRental:'خمس إعلانات كراء وتفاصيلها الكاملة من دون أي تلميح للسعر. قدّر ثمن الكراء اليومي بالدرهم (درهم / يوم).', durationLabel:'الوقت الأقصى لكل تخمين', tenMinutes:'10 دقائق', thirtyMinutes:'30 دقيقة', fiftyMinutes:'50 دقيقة (الحد الأقصى)', durationNote:'الوقت لا يتجاوز 50 دقيقة لكل إعلان.', start:'ابدأ 5 جولات <span>→</span>', startCars:'ابدأ 5 جولات سيارات <span>→</span>', startBikes:'ابدأ 5 جولات دراجات نارية <span>→</span>', priceHidden:'السعر مخفي', summaryHeading:'المواصفات السريعة', featuresHeading:'المواصفات', optionsHeading:'التجهيزات والخيارات', yourGuess:'تخمينك', submit:'إرسال <span>→</span>', quickIncrements:'إضافة سريعة:', clearInput:'مسح', result:'النتيجة', listedPrice:'السعر المعروض', listedPriceRental:'سعر الكراء اليومي', difference:'الفارق', points:'النقاط', viewSource:'عرض الإعلان ↗', gameOver:'انتهت اللعبة', finalTitle:'لديك عين خبيرة.', outOfFive:'نقطة من أصل 5,000', playAgain:'العب مجددًا <span>↻</span>', rules:'قواعد اللعبة', rulesTitle:'5 د الهميزات خاصك تجيب ثمنهم', rulesCopy1:'في كل جولة، شوف التصاور وتفاصيل الحديد والمواصفات مزيان. حط الثمن لي كيبان ليك معروض فالإعلان بالدرهم. كلما كنتي قريب للثمن الحقيقي، كلما ضربتي نقط كثر (حتى لـ 1,000 نقطة فكل جولة).', rulesCopy2:'كاين وقت محدد لكل جولة، وما كيفوتش 50 دقيقة كحد أقصى. زرب قبل ما يسالي العداد!', rulesCopy3:'في اللخر، سجّل سميتك فـ الليدربورد وتنافس مع الدراري و الحرايفية!', ready:'جاهز للعب', round:'الجولة {n} من 5', roundCars:'سيارات · الجولة {n} من 5', roundBikes:'دراجات نارية · الجولة {n} من 5', complete:'انتهت اللعبة', vehicle:'إعلان مركبة', car:'إعلان سيارة', bike:'إعلان دراجة نارية', carRental:'إعلان كراء سيارة · باليوم', bikeRental:'إعلان كراء دراجة نارية · باليوم', invalidGuess:'أدخل سعرًا صحيحًا بالدرهم.', failedGuess:'تعذّر التحقق من التخمين. حاول مرة أخرى.', loading:'جارٍ تحميل الإعلانات…', liveData:'إعلانات موثقة — يظهر السعر بعد كل تخمين.', previewData:'وضع المعاينة — أضف أسرار Cloudflare لتحميل إعلاناتك المصرح بها.', insufficient:'يلزم خمسة إعلانات صالحة على الأقل للعب.', preparing:'جارٍ التحضير…', next:'الجولة التالية →', finalNext:'عرض نتيجتي النهائية →', timeUp:'انتهى الوقت', expired:'انتهى الوقت — تم كشف السعر، لكن هذه الجولة لا تمنح نقاطًا.', excellent:'مذهل: كان تخمينك قريبًا جدًا.', great:'حدس رائع — أنت ضمن النطاق الصحيح.', okay:'المرة الجاية ها تجيبها لاصقة.', tough:'كانت صعيبة هادي، ولكن كل جولة مهمة.', noOptions:'لا توجد خيارات مذكورة', timeRemaining:'الوقت المتبقي', switchLanguage:'التبديل إلى الإنجليزية', useDark:'استخدم الوضع الداكن', useLight:'Use light mode', soundOn:'المؤثرات الصوتية مفعلة', soundOff:'المؤثرات الصوتية مكتومة', previousPhoto:'الصورة السابقة', nextPhoto:'الصورة التالية', zoomIn:'تكبير الصورة', zoomOut:'تصغير الصورة', openFullscreen:'فتح فولسكرين', exitFullscreen:'الخروج من فولسكرين', closenessKicker:'نسبة الدقة', closeToPrice:'قريب للثمن الحقيقي', closenessCol:'التقارب', saveScoreTitle:'سجّل سكور ديالك فـ الليدربورد', saveScoreHint:'تنافس مع الحرايفية والدراري من كاع المدن المغربية.', saveScoreBtn:'سجّل السكور <span>→</span>', savingScore:'جارٍ التسجيل…', savedScore:'✓ مسجّل', scoreRanked:'🎉 الرتبة ديالك هي #{rank}! السكور ديالك تسجل فـ الليدربورد.', alreadySaved:'السكور ديالك راه مسجل من قبل.', nameRequired:'عفاك كتب سميتك أو اللقب ديالك.', saveFailed:'تعذّر تسجيل السكور. حاول مرة أخرى.', topScorers:'أحسن السكورات', loadingLb:'جارٍ تحميل الليدربورد…', emptyLb:'ما كاين حتى سكور باقي. كون اللول!', leaderboardBtn:'المتصدرين', leaderboardTitle:'لوحة المتصدرين', leaderboardEyebrow:'الحرايفية الكبار', playerNamePlaceholder:'كتب سميتك أو اللقب ديالك', bullseye:'جيبتيها لاصقة! قريب بزاف من الثمن.', almostExact:'كاين أمعلم! قريب بزاف للثمن المعروض.', solidGuess:'مزيان — راك فالنطاق الصحيح.', fairEstimate:'راك قريب ولكن ماشي ببزاف.', wayOff:'بعيد على الثمن — عولنا عليك بكري.', photoMissingSkipped:'الصور غير متوفرة — جاري الانتقال إلى إعلان آخر…', unavailable:'غير متوفر', unavailableHint:'لا توجد مركبات متوفرة بهذا الاختيار', marketKicker:'تحليل السوق', marketSliderTitle:'مقارنة بسعر السوق', marketSliderTitleRental:'مقارنة بسعر كراء السوق', sellerPrice:'', marketAvgTag:'معدل السوق', zoneDeal:'همزة', zoneFair:'سعر عادل', zoneHigh:'مرتفع', zoneOverpriced:'مبالغ فيه', marketEstimateLbl:'معدل السوق', sellerPriceLbl:'سعر الإعلان', sellerPriceLblRental:'سعر الكراء اليومي', marketGapLbl:'الفارق', verdictDeal:'أقل من السوق', verdictFair:'سعر عادل', verdictHigh:'أعلى من السوق', verdictOverpriced:'مبالغ فيه' }
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
  const state = { listings: [], reserves: [], failedListingIds: new Set(), validatedListingIds: new Set(), isSkippingListing: false, current: 0, results: [], deadline: 0, duration: 600, timer: null, live: false, submitting: false, imageIndex: 0, listingType: localStorage.getItem('rwida-listing-type') === 'rental' ? 'rental' : 'sale', mode: localStorage.getItem('rwida-mode') === 'motorbikes' ? 'motorbikes' : 'cars', fuel: localStorage.getItem('rwida-fuel') || 'all', region: localStorage.getItem('rwida-region') || 'all', language: initialLanguage, theme: localStorage.getItem('rwida-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'), leaderboard: [], savedThisGame: false, playerName: localStorage.getItem('rwida-player-name') || '', soundEnabled: localStorage.getItem('rwida-sound') !== 'off' };
  const t = (key, replacements = {}) => Object.entries(replacements).reduce((text, [name, value]) => text.replace(`{${name}}`, value), copy[state.language][key] || key);
  const localized = (value) => {
    let res = value && typeof value === 'object' && !Array.isArray(value) ? (value[state.language] || value.en || value.ar || '') : (value ?? '');
    if (typeof res === 'string') {
      const lower = res.trim().toLowerCase();
      if (state.language === 'ar') {
        if (lower === 'oui' || lower === 'yes') return 'نعم';
        if (lower === 'non' || lower === 'no') return 'لا';
        if (res === 'يدوي') return 'مانييل';
        if (res === 'أوتوماتيكي') return 'أوطوماتيك';
        if (res === 'ديزل' || lower === 'diesel') return 'مازوط';
        if (res === 'بنزين' || lower === 'petrol' || lower === 'essence') return 'ليصانص';
        if (res === 'هجين' || lower === 'hybrid' || lower === 'hybride') return 'إيبريد';
        if (lower === 'electric' || lower === 'electrique' || lower === 'électrique') return 'كهربائي';
      } else {
        if (lower === 'oui') return 'Yes';
        if (lower === 'non') return 'No';
      }
    }
    return res;
  };
  const extractItemYear = (item) => {
    if (!item) return '';
    if (item.year && item.year !== 'N/A') return String(item.year);
    if (Array.isArray(item.features)) {
      for (const f of item.features) {
        const lbl = (f.label && (f.label.en || f.label.fr || f.label.ar || f.label.raw)) || '';
        if (lbl.toLowerCase().includes('year') || lbl.toLowerCase().includes('ann') || lbl.includes('سنة')) {
          const val = (f.value && (f.value.en || f.value.fr || f.value.ar || f.value.raw)) || f.value;
          if (val && /\b(19\d\d|20\d\d)\b/.test(String(val))) {
            return String(val).match(/\b(19\d\d|20\d\d)\b/)[0];
          }
        }
      }
    }
    if (Array.isArray(item.quickFacts)) {
      for (const q of item.quickFacts) {
        const txt = (q && (q.en || q.ar || q.fr)) || String(q || '');
        const m = txt.match(/\b(19\d\d|20\d\d)\b/);
        if (m) return m[0];
      }
    }
    return '';
  };
  const formatTitleWithYear = (item, lang = state.language) => {
    if (!item) return '';
    const rawTitle = (item.title && typeof item.title === 'object' && !Array.isArray(item.title))
      ? (item.title[lang] || item.title.en || item.title.ar || '')
      : String(item.title || '');
    const yr = extractItemYear(item);
    if (!yr) return rawTitle;
    const trimmed = rawTitle.trim();
    if (new RegExp(`\\b${yr}\\b`).test(trimmed)) return trimmed;
    return `${trimmed} ${yr}`;
  };
  const money = (value) => {
    const num = Number(value) || 0;
    const isNeg = num < 0;
    const rounded = Math.round(Math.abs(num));
    const formatted = new Intl.NumberFormat(state.language === 'ar' ? 'fr-MA' : 'en-US').format(rounded);
    const isRental = state.listingType === 'rental';
    if (state.language === 'ar') {
      const unit = isRental ? 'درهم / يوم' : 'درهم';
      return isNeg ? `-\u2066${formatted}\u2069 ${unit}` : `\u2066${formatted}\u2069 ${unit}`;
    }
    const unit = isRental ? 'MAD / day' : 'MAD';
    return isNeg ? `-${formatted} ${unit}` : `${formatted} ${unit}`;
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
  function getListingFuel(item) {
    if (!item) return '';
    const fuelFeature = (item.features || []).find((f) => {
      const lbl = (f.label && (f.label.en || f.label.fr || f.label.ar || f.label)) || '';
      const l = String(lbl).toLowerCase();
      return l.includes('fuel') || l.includes('carburant') || l.includes('وقود');
    });
    if (fuelFeature) {
      const val = (fuelFeature.value && (fuelFeature.value.en || fuelFeature.value.fr || fuelFeature.value.ar || fuelFeature.value)) || '';
      const v = String(val).toLowerCase();
      if (v.includes('diesel') || v.includes('ديزل') || v.includes('مازوط')) return 'diesel';
      if (v.includes('petrol') || v.includes('essence') || v.includes('بنزين') || v.includes('ليسانس')) return 'petrol';
      if (v.includes('electric') || v.includes('electrique') || v.includes('électrique') || v.includes('كهربائي')) return 'electric';
      if (v.includes('hybrid') || v.includes('hybride') || v.includes('هجين')) return 'hybrid';
    }
    for (const q of (item.quickFacts || [])) {
      const val = (typeof q === 'object' ? (q.en || q.fr || q.ar || '') : String(q || '')).toLowerCase();
      if (val.includes('diesel') || val.includes('ديزل') || val.includes('مازوط')) return 'diesel';
      if (val.includes('essence') || val.includes('petrol') || val.includes('بنزين') || val.includes('ليسانس')) return 'petrol';
      if (val.includes('electric') || val.includes('electrique') || val.includes('électrique') || val.includes('كهربائي')) return 'electric';
      if (val.includes('hybrid') || val.includes('hybride') || val.includes('هجين')) return 'hybrid';
    }
    if ((item.kind || '').toLowerCase().includes('moto') || (item.kind || '').toLowerCase().includes('bike')) {
      return 'petrol';
    }
    return '';
  }
  function isMatchingFuel(item, fuel) {
    if (!fuel || fuel === 'all') return true;
    const f = getListingFuel(item);
    if (fuel === 'diesel') return f === 'diesel';
    if (fuel === 'petrol' || fuel === 'essence') return f === 'petrol';
    if (fuel === 'hybrid') return f === 'hybrid';
    if (fuel === 'electric' || fuel === 'electrique') return f === 'electric';
    if (fuel === 'eco') return f === 'electric' || f === 'hybrid';
    return true;
  }
  function getCatalogListings() {
    if (state.listingType === 'rental') {
      if (Array.isArray(window.DEMO_RENTAL_LISTINGS) && window.DEMO_RENTAL_LISTINGS.length) {
        return window.DEMO_RENTAL_LISTINGS;
      }
    } else if (Array.isArray(window.DEMO_LISTINGS) && window.DEMO_LISTINGS.length) {
      return window.DEMO_LISTINGS;
    }
    if (Array.isArray(state.listings) && state.listings.length) {
      return [...state.listings, ...(state.reserves || [])];
    }
    return [];
  }
  function getModeListings() {
    const pool = getCatalogListings();
    const isBikes = state.mode === 'motorbikes';
    return pool.filter((item) => {
      const k = (item.kind || '').toLowerCase();
      if (isBikes) return k.includes('moto') || k.includes('bike');
      return k.includes('car') || item.kind === 'Voiture';
    });
  }
  function updateFilterAvailability() {
    if (!ui.regionFilter) return;
    const isMoto = state.mode === 'motorbikes';
    if (ui.fuelGroup) {
      ui.fuelGroup.classList.toggle('hidden', isMoto);
    }
    const modeItems = getModeListings();

    // 1. Evaluate Fuel options based on currently selected region (cars mode only)
    if (!isMoto && ui.fuelFilter) {
      const activeRegion = state.region && state.region !== 'all' ? state.region : null;
      const fuelOptions = ui.fuelFilter.querySelectorAll('option');
      fuelOptions.forEach((opt) => {
        const val = opt.value;
        const baseKey = opt.dataset.i18n;
        const baseText = baseKey ? t(baseKey) : opt.textContent;

        if (val === 'all') {
          opt.disabled = false;
          opt.textContent = baseText;
          opt.removeAttribute('title');
          return;
        }

        const count = modeItems.filter((item) => {
          if (activeRegion) {
            const r = (item.location && item.location.region || '').toLowerCase();
            if (r !== activeRegion) return false;
          }
          return isMatchingFuel(item, val);
        }).length;

        // Each game requires a full set of 5 distinct listings
        if (count < 5) {
          opt.disabled = true;
          opt.textContent = `${baseText} (${t('unavailable')})`;
          opt.title = t('unavailableHint');
          if (state.fuel === val) {
            state.fuel = 'all';
            ui.fuelFilter.value = 'all';
            localStorage.setItem('rwida-fuel', 'all');
          }
        } else {
          opt.disabled = false;
          opt.textContent = baseText;
          opt.removeAttribute('title');
        }
      });
      ui.fuelFilter.value = state.fuel || 'all';
    }

    // 2. Evaluate Region options based on currently selected fuel (for cars) or mode items (for motorbikes)
    const activeFuel = !isMoto && state.fuel && state.fuel !== 'all' ? state.fuel : null;
    const regionOptions = ui.regionFilter.querySelectorAll('option');
    regionOptions.forEach((opt) => {
      const val = opt.value;
      const baseKey = opt.dataset.i18n;
      const baseText = baseKey ? t(baseKey) : opt.textContent;

      if (val === 'all') {
        opt.disabled = false;
        opt.textContent = baseText;
        opt.removeAttribute('title');
        return;
      }

      const count = modeItems.filter((item) => {
        const r = (item.location && item.location.region || '').toLowerCase();
        if (r !== val) return false;
        if (activeFuel) {
          return isMatchingFuel(item, activeFuel);
        }
        return true;
      }).length;

      // Each game requires a full set of 5 distinct listings
      if (count < 5) {
        opt.disabled = true;
        opt.textContent = `${baseText} (${t('unavailable')})`;
        opt.title = t('unavailableHint');
        if (state.region === val) {
          state.region = 'all';
          ui.regionFilter.value = 'all';
          localStorage.setItem('rwida-region', 'all');
        }
      } else {
        opt.disabled = false;
        opt.textContent = baseText;
        opt.removeAttribute('title');
      }
    });

    ui.regionFilter.value = state.region || 'all';
  }
  function updateQuickIncrementButtons() {
    const isRental = state.listingType === 'rental';
    const buttons = document.querySelectorAll('.increment-btn[data-add]');
    const presets = isRental
      ? [
          { add: 50, label: '+50' },
          { add: 100, label: '+100' },
          { add: 250, label: '+250' },
          { add: 500, label: '+500' },
          { add: 1000, label: '+1K' }
        ]
      : [
          { add: 1000, label: '+1K' },
          { add: 5000, label: '+5K' },
          { add: 10000, label: '+10K' },
          { add: 50000, label: '+50K' },
          { add: 100000, label: '+100K' }
        ];
    buttons.forEach((btn, idx) => {
      if (presets[idx]) {
        btn.setAttribute('data-add', String(presets[idx].add));
        btn.textContent = presets[idx].label;
      }
    });
  }
  function applyPreferences() {
    document.documentElement.lang = state.language;
    document.documentElement.dir = state.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dataset.theme = state.theme;
    document.querySelectorAll('[data-i18n]').forEach((element) => { element.textContent = t(element.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach((element) => { element.innerHTML = t(element.dataset.i18nHtml); });
    const isRental = state.listingType === 'rental';
    ui.guess.placeholder = isRental
      ? (state.language === 'ar' ? 'مثال: \u2066350\u2069' : 'e.g. 350')
      : (state.language === 'ar' ? 'مثال: \u2066185,000\u2069' : 'e.g. 185,000');
    if (ui.playerName) {
      ui.playerName.placeholder = t('playerNamePlaceholder');
      if (state.playerName && !ui.playerName.value) {
        ui.playerName.value = state.playerName;
      }
    }
    const currencyLabel = $('currency-label');
    if (currencyLabel) {
      currencyLabel.textContent = isRental
        ? (state.language === 'ar' ? 'درهم / يوم' : 'MAD / day')
        : (state.language === 'ar' ? 'درهم' : 'MAD');
    }
    updateQuickIncrementButtons();
    const introP = document.querySelector('#start-screen .intro');
    if (introP) {
      introP.textContent = t(isRental ? 'introRental' : 'intro');
    }
    const listedPriceEl = document.querySelector('[data-i18n="listedPrice"]');
    if (listedPriceEl) {
      listedPriceEl.textContent = t(isRental ? 'listedPriceRental' : 'listedPrice');
    }
    const marketTitleEl = $('market-slider-title');
    if (marketTitleEl) {
      marketTitleEl.textContent = t(isRental ? 'marketSliderTitleRental' : 'marketSliderTitle');
    }
    const sellerPriceLblEl = document.querySelector('[data-i18n="sellerPriceLbl"]');
    if (sellerPriceLblEl) {
      sellerPriceLblEl.textContent = t(isRental ? 'sellerPriceLblRental' : 'sellerPriceLbl');
    }
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
    ui.zoomImage.innerHTML = `<span class="zoom-btn-icon" aria-hidden="true">${ui.visual.classList.contains('is-zoomed') ? '−' : '+'}</span>`;
    ui.fullscreenImage.setAttribute('aria-label', t(document.fullscreenElement ? 'exitFullscreen' : 'openFullscreen'));
    if (!state.listings.length) { ui.roundLabel.textContent = t('ready'); ui.dataNote.textContent = t('loading'); }
    else if (state.current >= state.listings.length) ui.roundLabel.textContent = t('complete');
    else { renderDots(); renderListing(state.listings[state.current]); }
    if (ui.typeSale && ui.typeRental) {
      ui.typeSale.classList.toggle('is-active', !isRental);
      ui.typeSale.setAttribute('aria-checked', !isRental ? 'true' : 'false');
      ui.typeRental.classList.toggle('is-active', isRental);
      ui.typeRental.setAttribute('aria-checked', isRental ? 'true' : 'false');
    }
    if (ui.modeCars && ui.modeMotorbikes) {
      ui.modeCars.classList.toggle('is-active', state.mode === 'cars');
      ui.modeCars.setAttribute('aria-checked', state.mode === 'cars' ? 'true' : 'false');
      ui.modeMotorbikes.classList.toggle('is-active', state.mode === 'motorbikes');
      ui.modeMotorbikes.setAttribute('aria-checked', state.mode === 'motorbikes' ? 'true' : 'false');
    }
    updateFilterAvailability();
    if (ui.startGame) {
      if (state.mode === 'motorbikes') {
        ui.startGame.innerHTML = t(isRental ? 'startRentalBikes' : 'startBikes');
      } else if (state.fuel && state.fuel !== 'all') {
        const prefix = isRental ? 'startRentalCars' : 'startCars';
        const fuelKey = prefix + state.fuel.charAt(0).toUpperCase() + state.fuel.slice(1);
        ui.startGame.innerHTML = (copy[state.language] && copy[state.language][fuelKey]) ? t(fuelKey) : t(isRental ? 'startRentalCars' : 'startCars');
      } else {
        ui.startGame.innerHTML = t(isRental ? 'startRentalCars' : 'startCars');
      }
    }
    const heroH1 = document.querySelector('#start-screen h1');
    if (heroH1) {
      if (isRental) {
        heroH1.innerHTML = state.mode === 'motorbikes' ? t('heroTitleRentalBikes') : t('heroTitleRentalCars');
      } else {
        heroH1.innerHTML = state.mode === 'motorbikes' ? t('heroTitleBikes') : t('heroTitleCars');
      }
    }
    if (state.lastValuation && ui.result && !ui.result.classList.contains('hidden')) {
      renderMarketFairness(state.lastValuation.valuation, state.lastValuation.actualPrice);
    }
  }
  function renderDots() {
    ui.dots.innerHTML = Array.from({ length: 5 }, (_, index) => `<i class="${index < state.current ? 'done' : index === state.current ? 'active' : ''}"></i>`).join('');
    const isRental = state.listingType === 'rental';
    let roundKey = state.mode === 'motorbikes'
      ? (isRental ? 'roundRentalBikes' : 'roundBikes')
      : (isRental ? 'roundRentalCars' : 'roundCars');
    if (state.mode === 'cars' && state.fuel && state.fuel !== 'all') {
      const prefix = isRental ? 'roundRentalCars' : 'roundCars';
      const fuelRoundKey = prefix + state.fuel.charAt(0).toUpperCase() + state.fuel.slice(1);
      if (copy[state.language] && copy[state.language][fuelRoundKey]) roundKey = fuelRoundKey;
    }
    ui.roundLabel.textContent = state.current < 5 ? t(roundKey, { n: state.current + 1 }) : t('complete');
  }
  const preloadedUrls = new Set();
  function preloadImage(url) {
    if (!url || typeof url !== 'string' || !url.startsWith('https://') || preloadedUrls.has(url)) return;
    preloadedUrls.add(url);
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
  }
  function preloadListingImages(item, limit = null) {
    if (!item) return;
    const images = listingImages(item);
    const toPreload = limit ? images.slice(0, limit) : images;
    toPreload.forEach(preloadImage);
  }
  function preloadGameImages(listings) {
    if (!Array.isArray(listings) || !listings.length) return;
    // Preload primary cover photo of all 5 rounds
    listings.forEach((item) => {
      const imgs = listingImages(item);
      if (imgs[0]) preloadImage(imgs[0]);
    });
    // Fully preload first round photos for immediate display
    if (listings[0]) preloadListingImages(listings[0]);
  }
  let toastTimeout = null;
  function showSkipToast(message) {
    if (!ui.photoSkipToast) return;
    ui.photoSkipToast.textContent = message || t('photoMissingSkipped');
    ui.photoSkipToast.classList.remove('hidden');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      if (ui.photoSkipToast) ui.photoSkipToast.classList.add('hidden');
    }, 2200);
  }
  function listingImages(item) {
    if (!item) return [];
    const candidates = Array.isArray(item.images) ? item.images : item.imageUrl ? [item.imageUrl] : [];
    const valid = candidates.filter((image) => typeof image === 'string' && /^https:\/\//.test(image));
    if (item._failedImages && item._failedImages.size > 0) {
      return valid.filter((url) => !item._failedImages.has(url));
    }
    return valid;
  }
  function testImage(url, timeoutMs = 2500) {
    return new Promise((resolve) => {
      if (!url || typeof url !== 'string' || !/^https:\/\//.test(url)) return resolve(false);
      const img = new Image();
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          img.src = '';
          resolve(false);
        }
      }, timeoutMs);
      img.onload = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(true);
        }
      };
      img.onerror = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(false);
        }
      };
      img.src = url;
    });
  }
  async function getReplacementListing() {
    const isBikeMode = state.mode === 'motorbikes';
    const isMatchingKind = (item) => {
      if (!item) return false;
      const k = (item.kind || '').toLowerCase();
      return isBikeMode ? (k.includes('moto') || k.includes('bike')) : (k.includes('car') || item.kind === 'Voiture');
    };

    // 1. First check existing pre-fetched reserves
    while (Array.isArray(state.reserves) && state.reserves.length > 0) {
      const candidate = state.reserves.shift();
      if (!candidate || state.failedListingIds.has(candidate.id)) continue;
      if (state.listings.some((l) => l && l.id === candidate.id)) continue;
      if (!isMatchingKind(candidate)) continue;
      if (!isBikeMode && state.fuel && state.fuel !== 'all' && !isMatchingFuel(candidate, state.fuel)) continue;
      if (state.region && state.region !== 'all' && (!candidate.location || candidate.location.region !== state.region)) continue;
      const imgs = listingImages(candidate);
      if (!imgs.length) {
        state.failedListingIds.add(candidate.id);
        continue;
      }
      const ok = await testImage(imgs[0], 2000);
      if (ok) return candidate;
      state.failedListingIds.add(candidate.id);
    }

    // 2. Replenish reserves from server if in live mode
    if (state.live) {
      try {
        const seconds = Math.min(3000, Math.max(30, Number(ui.duration.value) || 600));
        const typeParam = `&type=${encodeURIComponent(state.listingType || 'sale')}`;
        const regionParam = state.region && state.region !== 'all' ? `&region=${encodeURIComponent(state.region)}` : '';
        const fuelParam = (!isBikeMode && state.fuel && state.fuel !== 'all') ? `&fuel=${encodeURIComponent(state.fuel)}` : '';
        const res = await fetch(`/api/game?seconds=${seconds}&mode=${state.mode}${typeParam}${regionParam}${fuelParam}`, { cache: 'no-store' });
        if (res.ok) {
          const payload = await res.json();
          const newItems = [...(payload.round || []), ...(payload.reserves || [])];
          for (const cand of newItems) {
            if (!cand || state.failedListingIds.has(cand.id)) continue;
            if (state.listings.some((l) => l && l.id === cand.id)) continue;
            if (!isMatchingKind(cand)) continue;
            if (!isBikeMode && state.fuel && state.fuel !== 'all' && !isMatchingFuel(cand, state.fuel)) continue;
            if (state.region && state.region !== 'all' && cand.location && cand.location.region !== state.region) continue;
            const imgs = listingImages(cand);
            if (!imgs.length) continue;
            const ok = await testImage(imgs[0], 2000);
            if (ok) return cand;
            state.failedListingIds.add(cand.id);
          }
        }
      } catch (_) {}
    }

    // 3. Fallback to static pool
    const pool = getCatalogListings();
    for (const cand of pool) {
      if (!cand || state.failedListingIds.has(cand.id)) continue;
      if (state.listings.some((l) => l && l.id === cand.id)) continue;
      if (!isMatchingKind(cand)) continue;
      if (state.fuel && state.fuel !== 'all' && !isMatchingFuel(cand, state.fuel)) continue;
      if (state.region && state.region !== 'all' && (!cand.location || cand.location.region !== state.region)) continue;
      const imgs = listingImages(cand);
      if (!imgs.length) continue;
      const ok = await testImage(imgs[0], 2000);
      if (ok) return cand;
      state.failedListingIds.add(cand.id);
    }

    return null;
  }
  async function skipBrokenListing(brokenItem, reason = 'unknown') {
    if (state.isSkippingListing) return;
    state.isSkippingListing = true;

    if (brokenItem && brokenItem.id) {
      state.failedListingIds.add(brokenItem.id);
    }

    // Stop timer immediately so player loses zero time
    if (state.timer) {
      window.clearInterval(state.timer);
      state.timer = null;
    }

    // Close lightbox if currently open
    closeLightbox();

    showSkipToast(t('photoMissingSkipped'));

    const replacement = await getReplacementListing();
    if (replacement) {
      state.listings[state.current] = replacement;
      state.imageIndex = 0;
      state.isSkippingListing = false;
      startRound();
    } else {
      state.isSkippingListing = false;
      if (state.current < state.listings.length - 1) {
        state.current += 1;
        startRound();
      } else {
        finishGame();
      }
    }
  }
  async function validateUpcomingListings() {
    for (let i = state.current + 1; i < state.listings.length; i++) {
      const item = state.listings[i];
      if (!item || state.validatedListingIds.has(item.id)) continue;
      const imgs = listingImages(item);
      if (!imgs.length) {
        const replacement = await getReplacementListing();
        if (replacement) state.listings[i] = replacement;
        continue;
      }
      const ok = await testImage(imgs[0], 2500);
      if (!ok) {
        if (!item._failedImages) item._failedImages = new Set();
        item._failedImages.add(imgs[0]);
        if (!listingImages(item).length) {
          state.failedListingIds.add(item.id);
          const replacement = await getReplacementListing();
          if (replacement) state.listings[i] = replacement;
        }
      } else {
        state.validatedListingIds.add(item.id);
      }
    }
  }
  function renderImage(item, resetZoom = true) {
    if (!item) return;
    const images = listingImages(item);
    if (resetZoom && typeof visualPanZoom !== 'undefined' && visualPanZoom) visualPanZoom.reset(false);
    if (!images.length) {
      skipBrokenListing(item, 'no-images');
      return;
    }
    state.imageIndex = ((state.imageIndex % images.length) + images.length) % images.length;
    ui.image.loading = 'eager';
    ui.image.decoding = 'async';
    ui.image.src = images[state.imageIndex]; ui.image.alt = formatTitleWithYear(item);
    ui.image.classList.remove('hidden'); ui.fallback.classList.add('hidden'); ui.imageActions.classList.remove('hidden');
    ui.gallery.classList.toggle('hidden', images.length < 2);
    ui.imageCount.textContent = `${state.imageIndex + 1} / ${images.length}`;
    ui.previousImage.disabled = images.length < 2; ui.nextImage.disabled = images.length < 2;
    if (images.length > 1) {
      preloadImage(images[(state.imageIndex + 1) % images.length]);
      preloadImage(images[((state.imageIndex - 1) % images.length + images.length) % images.length]);
    }
  }
  function extractHighValueVehicleDetails(targetItem, isBike) {
    if (!targetItem) return { cv: null, body: null, isFirstHand: false, condition: null };
    const title = (typeof targetItem.title === 'object' ? (targetItem.title.en || targetItem.title.ar || '') : String(targetItem.title || '')).toLowerCase();
    const text = [
      title,
      targetItem.summary?.original || '',
      targetItem.summary?.fr || '',
      targetItem.summary?.en || '',
      targetItem.summary?.ar || '',
      JSON.stringify(targetItem.options || []),
      JSON.stringify(targetItem.features || []),
      targetItem.sourceUrl || ''
    ].join(' ').toLowerCase();

    // 1. Fiscal Horsepower (Puissance fiscale) - cars only
    let cv = null;
    if (!isBike) {
      const existingCv = (targetItem.features || []).find((f) => {
        const l = ((f.label && (f.label.en || f.label.fr || f.label.ar || f.label)) || '').toLowerCase();
        return l.includes('fiscale') || l.includes('tax hp') || l.includes('الجبائية');
      });
      if (existingCv && existingCv.value) {
        const num = parseInt(String(existingCv.value.en || existingCv.value.ar || existingCv.value).replace(/\D+/g, ''), 10);
        if (num >= 4 && num <= 35) cv = num;
      }
      if (!cv) {
        const m = text.match(/\b(\d{1,2})\s*(?:cv|puissance\s*fiscale|ch\s*fiscaux)\b/i);
        if (m) {
          const n = parseInt(m[1], 10);
          if (n >= 4 && n <= 35) cv = n;
        }
      }
      if (!cv) {
        if (/picanto|i10|up!|c1|108|aygo|panda|500\b|twingo/i.test(title)) cv = 4;
        else if (/clio|208|c3|duster|logan|sandero|fiesta|yaris|i20|rio|polo|ibiza|c-elys[eé]e|stepway|captur|2008|c3 aircross|juke|micra|berlingo|partner|combo|rifter|caddy|dokker|express|kangoo|corsa|fabia|swift|jazz/i.test(title)) cv = 6;
        else if (/touareg|q7|q8|x5|x6|x7|gle|gls|cayenne|range rover|land cruiser|prado|patrol|panamera/i.test(title)) cv = (/v8|turbo|gts|amg|5\.0|4\.4/i.test(text) ? 17 : 11);
        else if (/passat|superb|arteon|a4|a5|a6|s[eé]rie\s*3|s[eé]rie\s*4|s[eé]rie\s*5|classe\s*c|classe\s*e|q5|x3|x4|glc|macan|stelvio|evoque|velar/i.test(title)) cv = (/3\.0|v6|330|335|530|535/i.test(text) ? 11 : 8);
        else if (/tiguan|kodiaq|tarraco|sportage|tucson|rav4|cr-v|cx-5|q3|x1|x2|gla|glb/i.test(title)) cv = (/1\.6/i.test(text) ? 6 : 8);
        else if (/golf|leon|a3|classe\s*a|s[eé]rie\s*1|megane|308|focus|octavia|t-roc|t-cross|qashqai|kadjar|ateca|arona/i.test(title)) cv = (/2\.0|gtd|gti|r\b|cupro/i.test(text) ? 8 : 6);
        else if (/avensis|mondeo|508|insignia|accord|camry|talisman/i.test(title)) cv = 8;
        else cv = 6;
      }
    }

    // 2. Body Type (Carrosserie / نوع الهيكل)
    let body = null;
    if (!isBike) {
      if (/duster|tucson|sportage|tiguan|kodiaq|tarraco|rav4|cr-v|cx-5|q3|q5|q7|q8|x1|x2|x3|x4|x5|x6|x7|gla|glb|glc|gle|gls|cayenne|macan|range rover|evoque|velar|defender|land cruiser|prado|patrol|stelvio|renegade|compass|wrangler|cherokee|captur|2008|3008|5008|c3 aircross|c5 aircross|juke|qashqai|ateca|arona|kuga|taigo|t-roc|t-cross/i.test(title)) {
        body = { en: 'SUV / 4x4', ar: 'رباعية الدفع \u2066(SUV / 4x4)\u2069' };
      } else if (/berlingo|partner|combo|rifter|caddy|dokker|express|kangoo|transit|custom|transporter/i.test(title)) {
        body = { en: 'Utility / Van (Utilitaire)', ar: 'نفعية \u2066(Utilitaire)\u2069' };
      } else if (/picanto|i10|up!|c1|108|aygo|panda|500\b|twingo|clio|208|c3|yaris|i20|rio|polo|ibiza|micra|sandero|stepway|fiesta|corsa|fabia|swift|jazz/i.test(title)) {
        body = { en: 'City car (Citadine)', ar: 'سيارة مدينة \u2066(Citadine)\u2069' };
      } else if (/golf|leon|a3|s[eé]rie\s*1|classe\s*a|megane|308|focus|tipo|ceed|i30/i.test(title)) {
        body = { en: 'Compact (Compacte)', ar: 'مدمجة \u2066(Compacte)\u2069' };
      } else if (/passat|superb|arteon|a4|a6|s[eé]rie\s*3|s[eé]rie\s*5|s[eé]rie\s*7|classe\s*c|classe\s*e|classe\s*s|mondeo|508|octavia|talisman|accord|camry|logan|c-elys[eé]e|avensis|insignia/i.test(title)) {
        body = { en: 'Sedan (Berline)', ar: 'سيدان \u2066(Berline)\u2069' };
      } else if (/mustang|camaro|tt\b|s[eé]rie\s*4|s[eé]rie\s*2|s[eé]rie\s*8|classe\s*c\s*coup[eé]|classe\s*e\s*coup[eé]|porsche\s*911|cayman|boxster/i.test(title)) {
        body = { en: 'Coupé / Sport', ar: 'كوبيه \u2066(Coupé)\u2069' };
      }
    } else {
      if (/tmax|t-max|burgman|forza|adv|pcx|sh\b|beverly|vespa|scooter|xmax/i.test(title)) {
        body = { en: 'Maxi-Scooter', ar: 'ماكسي سكوتر \u2066(Maxi-Scooter)\u2069' };
      } else if (/z900|z650|z1000|mt-07|mt-09|mt-10|monster|duke|cb650|sv650/i.test(title)) {
        body = { en: 'Roadster', ar: 'رودستر \u2066(Roadster)\u2069' };
      } else if (/cbr|r1\b|r6\b|gsx-r|panigale|s1000rr|ninja/i.test(title)) {
        body = { en: 'Sport / Superbike', ar: 'دراجة رياضية \u2066(Sportive)\u2069' };
      } else if (/gs\b|adventure|africatwin|tenere|tracer|v-strom|tiger/i.test(title)) {
        body = { en: 'Trail / Adventure', ar: 'تريل ومغامرة \u2066(Trail)\u2069' };
      } else if (/harley|custom|cruiser|shadow|vulcan|rebel/i.test(title)) {
        body = { en: 'Cruiser / Custom', ar: 'كروزر \u2066(Cruiser)\u2069' };
      }
    }

    // 3. First Owner (1ère main)
    const isFirstHand = /1\s*(?:[eè]re|ere)\s*main|premi[eè]re\s*main|first\s*hand|premier\s*propri[eé]taire/i.test(text);

    // 4. Condition & Maintenance
    let condition = null;
    if (/carnet.*entretien|entretien\s*maison|entretien\s*suivi/i.test(text)) {
      condition = { en: 'Service book up to date', ar: 'سجل صيانة متوفر' };
    } else if (/jamais\s*accident/i.test(text)) {
      condition = { en: 'Accident-free', ar: 'بدون حوادث' };
    } else if (/excellent\s*[eé]tat|impeccable|comme\s*neuf/i.test(text)) {
      condition = { en: 'Excellent condition', ar: 'حالة ممتازة' };
    } else if (/tr[eè]s\s*bon\s*[eé]tat/i.test(text)) {
      condition = { en: 'Very good condition', ar: 'حالة جيدة جداً' };
    }

    return { cv, body, isFirstHand, condition };
  }

  function renderListing(item) {
    ui.title.textContent = formatTitleWithYear(item);
    const isBike = item.kind === 'Moto' || item.kind === 'Motorbike';
    const isRental = state.listingType === 'rental' || item.listingType === 'rental';
    ui.kind.textContent = isRental ? (isBike ? t('bikeRental') : t('carRental')) : (isBike ? t('bike') : t('car'));
    if (ui.vehicleLocation) {
      const city = item && item.location ? (state.language === 'ar' ? (item.location.cityAr || item.location.city) : item.location.city) : '';
      if (city) {
        ui.vehicleLocation.textContent = `📍 ${city}`;
        ui.vehicleLocation.classList.remove('hidden');
      } else {
        ui.vehicleLocation.classList.add('hidden');
      }
    }

    const attrs = extractHighValueVehicleDetails(item, isBike);

    // Quick facts: ensure cars show customs status (Dédouanée / WW au Maroc) instead of horsepower, and bikes show gearbox
    const sanitizedQuickFacts = (item.quickFacts || []).map((fact) => {
      const valStr = (typeof fact === 'object' ? (fact.en || fact.ar || fact.fr || '') : String(fact || '')).toLowerCase();
      if (valStr.includes('hp') || valStr.includes('ch') || valStr.includes('حصان')) {
        return { en: 'Dédouanée', ar: 'مجمركة' };
      }
      return fact;
    });

    // Add fiscal horsepower chip to quick facts for cars
    if (attrs.cv && !isBike) {
      const hasCvChip = sanitizedQuickFacts.some((f) => {
        const str = (typeof f === 'object' ? (f.en || f.ar || '') : String(f)).toLowerCase();
        return str.includes('cv') || str.includes('خيل');
      });
      if (!hasCvChip) {
        sanitizedQuickFacts.push({
          en: `${attrs.cv} CV`,
          ar: `${attrs.cv} خيل \u2066(${attrs.cv} CV)\u2069`
        });
      }
    }

    // Add first hand chip to quick facts if detected
    if (attrs.isFirstHand) {
      const hasFhChip = sanitizedQuickFacts.some((f) => {
        const str = (typeof f === 'object' ? (f.en || f.ar || '') : String(f)).toLowerCase();
        return str.includes('1ère') || str.includes('main');
      });
      if (!hasFhChip) {
        sanitizedQuickFacts.push({ en: '1ère main', ar: '1ère main' });
      }
    }

    ui.facts.innerHTML = sanitizedQuickFacts
      .map((fact) => `<span dir="auto"><bdi>${escape(localized(fact))}</bdi></span>`)
      .join('');

    let featureEntries = Array.isArray(item.features) ? item.features.map((feature) => [feature.label, feature.value]) : Object.entries(item.features || {});
    
    // Clean raw entries: remove transmission (handled via Gearbox), DIN mechanical horsepower, and raw body/tax keys that will be cleanly replaced
    featureEntries = featureEntries.filter(([label, value]) => {
      const en = (label && typeof label === 'object' ? (label.en || label.fr || label.raw || '') : String(label || '')).toLowerCase().trim();
      const ar = (label && typeof label === 'object' ? (label.ar || '') : '').toLowerCase().trim();
      const valStr = (value && typeof value === 'object' ? (value.en || value.fr || value.ar || value.raw || '') : String(value || '')).toLowerCase().trim();

      if (!valStr || valStr === 'n/a' || valStr === 'null' || valStr === 'undefined') {
        return false;
      }
      if (en.includes('tax horsepower') || en === 'tax hp' || en.includes('puissance fiscale') || ar.includes('الجبائية')) {
        return false;
      }
      if (en.includes('transmission') || ar.includes('ناقل الحركة')) {
        return false;
      }
      if (en.includes('horsepower') || ar.includes('حصان') || en.includes('puissance din')) {
        return false;
      }
      if (en.includes('body type') || en.includes('carrosserie') || ar.includes('نوع الهيكل') || ar.includes('هيكل')) {
        return false;
      }
      return true;
    });

    // High-value feature 1: Fiscal Horsepower (القوة الجبائية (Puissance fiscale)) for cars
    if (attrs.cv && !isBike) {
      featureEntries.push([
        { en: 'Fiscal Horsepower (Puissance fiscale)', ar: 'القوة الجبائية \u2066(Puissance fiscale)\u2069' },
        { en: `${attrs.cv} CV (${attrs.cv} ch fiscaux)`, ar: `${attrs.cv} خيل \u2066(${attrs.cv} CV)\u2069` }
      ]);
    }

    // High-value feature 2: Body Type / Segment (Carrosserie)
    if (attrs.body) {
      featureEntries.push([
        { en: isBike ? 'Category' : 'Body type (Carrosserie)', ar: isBike ? 'نوع الدراجة النارية' : 'نوع الهيكل \u2066(Carrosserie)\u2069' },
        attrs.body
      ]);
    }

    // Ensure Gearbox is present in features
    const hasGearbox = featureEntries.some(([label]) => {
      const lblStr = (typeof label === 'object' ? (label.en || label.ar || '') : String(label)).toLowerCase();
      return lblStr.includes('gearbox') || lblStr.includes('علبة السرعات') || lblStr.includes('boite') || lblStr.includes('boîte');
    });
    if (!hasGearbox) {
      let gbFact = (item.quickFacts || []).find((q) => {
        const val = (typeof q === 'object' ? (q.en || q.ar || '') : String(q)).toLowerCase();
        return val.includes('auto') || val.includes('man') || val.includes('أوطو') || val.includes('ماني');
      });
      if (!gbFact) {
        const titleLower = ((item.title && (item.title.en || item.title.ar)) || '').toLowerCase();
        const isAuto = isBike 
          ? /scooter|vespa|tmax|t-max|forza|adv|pcx|sh|beverly|burgman/i.test(titleLower)
          : /porsche|mercedes|bmw|audi|range rover|land rover|volvo|jeep|bva|auto/i.test(titleLower);
        gbFact = isAuto ? { en: 'Automatic', ar: 'أوطوماتيك' } : { en: 'Manual', ar: 'مانييل' };
      }
      featureEntries.push([{ en: 'Gearbox', ar: 'علبة السرعات' }, gbFact]);
    }

    // Ensure Customs status (Statut de douane / حالة الجمارك) is present in features
    const hasCustoms = featureEntries.some(([label]) => {
      const lblStr = (typeof label === 'object' ? (label.en || label.ar || label.fr || '') : String(label)).toLowerCase();
      return lblStr.includes('custom') || lblStr.includes('douane') || lblStr.includes('جمارك');
    });
    if (!hasCustoms) {
      let customsFact = (item.quickFacts || []).find((q) => {
        const val = (typeof q === 'object' ? (q.en || q.ar || q.fr || '') : String(q)).toLowerCase();
        return val.includes('dédouan') || val.includes('dedouan') || val.includes('maroc') || val.includes('ww') || val.includes('جمرك') || val.includes('مغرب');
      });
      if (!customsFact) {
        customsFact = { en: 'Dédouanée', ar: 'مجمركة' };
      }
      featureEntries.push([{ en: 'Customs status', ar: 'حالة الجمارك' }, customsFact]);
    }

    // High-value feature 3: First owner (1ère main)
    const existingFhIdx = featureEntries.findIndex(([label]) => {
      const lblStr = (typeof label === 'object' ? (label.en || label.ar || label.fr || '') : String(label)).toLowerCase();
      return lblStr.includes('1ère main') || lblStr.includes('première main') || lblStr.includes('premiere main');
    });

    if (existingFhIdx >= 0) {
      const currentVal = featureEntries[existingFhIdx][1];
      const valStr = (typeof currentVal === 'object' ? (currentVal.en || currentVal.ar || currentVal.fr || '') : String(currentVal)).toLowerCase();
      if (/oui|yes|true|1/i.test(valStr)) {
        featureEntries[existingFhIdx][1] = { en: 'Yes', ar: 'نعم' };
      } else if (/non|no|false|0/i.test(valStr)) {
        featureEntries[existingFhIdx][1] = { en: 'No', ar: 'لا' };
      }
    } else if (attrs.isFirstHand) {
      featureEntries.push([
        { en: '1ère main', ar: '1ère main' },
        { en: 'Yes', ar: 'نعم' }
      ]);
    }

    // High-value feature 4: Condition & Maintenance (الحالة والصيانة)
    if (attrs.condition) {
      featureEntries.push([
        { en: 'Condition / Maintenance', ar: 'الحالة والصيانة' },
        attrs.condition
      ]);
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

    const visibleOptions = (item.options || []).filter((option) => {
      const text = (option && typeof option === 'object' && !Array.isArray(option))
        ? (option.raw || option.fr || option.en || option.ar || localized(option) || '')
        : String(option ?? '');
      const lower = text.toLowerCase().trim();
      return !lower.includes('état du véhicule') &&
             !lower.includes('etat du vehicule') &&
             !lower.includes('حالة المركبة') &&
             !lower.includes('حالة السيارة');
    });

    ui.features.innerHTML = featureEntries.map(([label, value]) => `<div><dt dir="auto"><bdi>${escape(localized(label))}</bdi></dt><dd dir="auto"><bdi>${escape(localized(value))}</bdi></dd></div>`).join('');
    ui.options.innerHTML = visibleOptions.length
      ? visibleOptions.map((option) => {
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

    const imgs = listingImages(item);
    if (!imgs.length) {
      skipBrokenListing(item, 'no-images-on-round-start');
      return;
    }

    state.submitting = false; state.imageIndex = 0;
    ui.guess.value = '';
    ui.error.classList.add('hidden');
    renderDots(); renderListing(item); setScreen('game'); startTimer();
    window.setTimeout(() => ui.guess.focus(), 80);

    // Preload remaining photos for the active listing and the upcoming round
    preloadListingImages(item);
    if (state.listings[state.current + 1]) {
      preloadListingImages(state.listings[state.current + 1]);
    }

    // Proactively validate upcoming listings in background so broken listings are swapped before player reaches them
    validateUpcomingListings();
  }
  function calculateDemo(item, guess) {
    const error = guess === null ? 1 : Math.abs(guess - item.price) / item.price;
    const marketValuation = computeMarketValuationClient(item, getCatalogListings());
    return { actualPrice: item.price, score: Math.max(0, Math.round(1000 * (1 - Math.min(1, error)))), difference: guess === null ? null : Math.abs(guess - item.price), marketValuation };
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
        const response = await fetch('/api/guess', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: item.token, guess, listingType: state.listingType }) });
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

  const KNOWN_VALUATION_BRANDS = [
    'mercedes-benz', 'mercedes', 'land rover', 'range rover', 'alfa romeo', 'aston martin',
    'volkswagen', 'renault', 'peugeot', 'citroen', 'dacia', 'hyundai', 'kia', 'toyota',
    'ford', 'opel', 'fiat', 'audi', 'bmw', 'porsche', 'jeep', 'nissan', 'seat', 'cupra',
    'skoda', 'volvo', 'mini', 'suzuki', 'honda', 'mitsubishi', 'mazda', 'chevrolet', 'mg',
    'byd', 'tesla', 'changan', 'geely', 'haval', 'chery', 'dfsk', 'jaguar', 'maserati',
    'bentley', 'ferrari', 'lamborghini', 'cadillac', 'yamaha', 'kawasaki', 'ducati', 'ktm',
    'harley-davidson', 'harley', 'triumph', 'aprilia', 'vespa', 'piaggio', 'kymco', 'sym',
    'cfmoto', 'cf moto', 'royal enfield', 'benelli', 'mbk', 'becane', 'docker', 'sanya',
    'vinto', 'gabelli', 'tvs', 'austin', 'zontes', 'voge', 'hanway', 'segway', 'can-am'
  ];

  function normalizeValuationStr(str = '') {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u2010-\u2015]/g, '-')
      .toLowerCase()
      .trim();
  }

  function extractCanonicalBrandModel(item) {
    const getFeat = (pat) => {
      const f = (item.features || []).find((feat) => pat.test(feat.label?.en || feat.label?.fr || feat.label?.ar || feat.label || ''));
      return normalizeValuationStr(f?.value?.en || f?.value?.fr || f?.value?.ar || f?.value || '');
    };
    let brand = getFeat(/brand|marque|علامة/i);
    let model = getFeat(/model|modèle|طراز/i);
    const title = normalizeValuationStr(item.title?.en || item.title?.ar || item.title || '');

    if (!brand || brand === 'autre' || brand === 'other') {
      for (const kb of KNOWN_VALUATION_BRANDS) {
        if (new RegExp(`\\b${kb.replace('-', '[\\s-]')}\\b`, 'i').test(title)) {
          brand = kb;
          break;
        }
      }
    }
    if (brand === 'mercedes') brand = 'mercedes-benz';
    if (brand === 'harley') brand = 'harley-davidson';
    if (brand === 'cf moto') brand = 'cfmoto';
    if (brand === 'range rover') brand = 'land rover';

    if (!model || model === 'autre' || model === 'other') {
      let cleanedTitle = title
        .replace(/\b(19\d\d|20\d\d)\b/g, ' ')
        .replace(/\b(autre|garantie|pack|complet|iridium|gris|noir|blanc|essence|esseence|essense|diesel|hybride|electrique|moto|scooter|neuf|00\s*km|0\s*km)\b/g, ' ');
      if (brand && brand !== 'autre') {
        cleanedTitle = cleanedTitle.replace(new RegExp(`\\b${brand.replace('-', '[\\s-]')}\\b`, 'gi'), ' ');
      }
      cleanedTitle = cleanedTitle
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/(?:^|\s)-+(?:\s|$)/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const tokens = cleanedTitle.split(' ').filter((t) => t && t !== '-');
      if (tokens.length > 0) {
        model = tokens.slice(0, 2).join(' ');
      }
    }

    let canonModel = (model || '')
      .replace(/\b(19\d\d|20\d\d)\b/g, ' ')
      .replace(/(?:^|\s)-+(?:\s|$)/g, ' ')
      .replace(/\b(s\s*line|qouatro|quattro|pack\s*m|blackline|berline|coupe|cabriolet|sportback|5\s*seater|7\s*seater|tech\s*max|supersport|super\s*tech|tft|abs|lc|adventure|trophy|race\s*edition|digital|cc|gtline|gt-line|r-line|r\s*line|pick-up|pickup|fuel\s*cell)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (brand === 'himalayan') { brand = 'royal enfield'; canonModel = 'himalayan'; }
    if (brand === 'v-strom') { brand = 'suzuki'; canonModel = 'v-strom 250'; }
    if (/^t[-\s]?max/.test(canonModel)) canonModel = 'tmax';
    if (/adv\s*350/.test(canonModel) || /adv\s*350/.test(title)) canonModel = 'adv 350';
    else if (/^x[-\s]?adv|^adv$/.test(canonModel)) canonModel = 'x-adv 750';
    if (/^n[-\s]?max/.test(canonModel)) canonModel = 'nmax 125';
    if (/^x[-\s]?max/.test(canonModel)) canonModel = 'xmax';
    if (/^mt[-\s]?07/.test(canonModel)) canonModel = 'mt-07';
    if (/^mt[-\s]?09/.test(canonModel)) canonModel = 'mt-09';
    if (/^mt[-\s]?03/.test(canonModel)) canonModel = 'mt-03';
    if (/^tracer\s*9/.test(canonModel)) canonModel = 'tracer 9';
    if (/^tracer\s*7/.test(canonModel)) canonModel = 'tracer 7';
    if (/^v[-\s]?strom\s*650/.test(canonModel)) canonModel = 'v-strom 650';
    if (/^v[-\s]?strom\s*800/.test(canonModel)) canonModel = 'v-strom 800';
    if (/^v[-\s]?strom\s*250/.test(canonModel)) canonModel = 'v-strom 250';
    if (/tenere\s*700/.test(canonModel)) canonModel = 'tenere 700';
    if (/himalayan/.test(canonModel)) canonModel = 'himalayan';
    if (/450\s*mt|mt\s*450/.test(canonModel)) canonModel = '450 mt';
    if (/700\s*cl[-\s]?x/.test(canonModel)) canonModel = '700 cl-x';
    if (/agility/.test(canonModel)) canonModel = 'agility';
    if (/\bbws\b/.test(canonModel) || /\bbws\b/.test(title)) { brand = 'mbk'; canonModel = 'bws'; }
    if (/\bneos\b/.test(canonModel) || /\bneos\b/.test(title)) { brand = 'yamaha'; canonModel = 'neos'; }
    if (/^z\s*1000$|^z1000$/.test(canonModel)) canonModel = 'z1000';
    if (/^z\s*900$|^z900$/.test(canonModel)) canonModel = 'z900';
    if (/^z\s*800$|^z800$/.test(canonModel)) canonModel = 'z800';
    if (/^z\s*650|^z650/.test(canonModel)) canonModel = 'z650';
    if (/^sh\s*125/.test(canonModel)) canonModel = 'sh 125';
    if (/^sh\s*150/.test(canonModel)) canonModel = 'sh 150';
    if (/^sh\s*300/.test(canonModel)) canonModel = 'sh 300';
    if (/^sh\s*350/.test(canonModel)) canonModel = 'sh 350';
    if (/gold\s*wing|goldwing/.test(canonModel)) canonModel = 'goldwing 1800';
    if (/hornet/.test(canonModel)) canonModel = 'hornet';
    if (/panamerica|pan\s*america/.test(canonModel)) canonModel = 'pan america 1250';
    if (/^300\s*gts|^gts\s*300|^gts\s*310|^gts\s*super/.test(canonModel)) canonModel = 'gts 300';
    if (/^sprint/.test(canonModel)) canonModel = 'sprint';
    if (/^50\s*st$|^symphony/.test(canonModel)) canonModel = 'symphony';
    if (/f\s*800\s*gs|f800\s*gs/.test(canonModel)) canonModel = 'f800 gs';
    if (/f\s*750\s*gs|f750\s*gs/.test(canonModel)) canonModel = 'f750 gs';
    if (/f\s*850\s*gs|f850\s*gs/.test(canonModel)) canonModel = 'f850 gs';
    if (/f\s*900\s*gs|f900\s*gs|gs\s*900|^f900$/.test(canonModel)) canonModel = 'f900 gs';
    if (/r\s*1200\s*gs|r1200\s*gs/.test(canonModel)) canonModel = 'r1200 gs';
    if (/r\s*1250\s*gs|r1250\s*gs/.test(canonModel)) canonModel = 'r1250 gs';
    if (/r\s*1300\s*gs|r1300\s*gs/.test(canonModel)) canonModel = 'r1300 gs';
    if (/clio/.test(canonModel)) canonModel = 'clio';
    if (/macan/.test(canonModel)) canonModel = 'macan';
    if (/^duster$|^deuster$/.test(canonModel)) canonModel = 'duster';
    if (/^logan$|^logane$/.test(canonModel)) canonModel = 'logan';
    if (/^500\s*c$|^500c$|^500\s*sport$|^500$/.test(canonModel)) canonModel = '500';
    if (/^t[-\s]?roc$/.test(canonModel)) canonModel = 't-roc';
    if (/^touareg/.test(canonModel)) canonModel = 'touareg';
    if (/^tiguan/.test(canonModel)) canonModel = 'tiguan';
    if (/^tucson/.test(canonModel)) canonModel = 'tucson';
    if (/i10/.test(canonModel)) canonModel = 'i10';
    if (/^sportage/.test(canonModel)) canonModel = 'sportage';
    if (/^juke$|^jouk$/.test(canonModel)) canonModel = 'juke';
    if (/^corsa$|^coorssa$/.test(canonModel)) canonModel = 'corsa';
    if (/^corolla/.test(canonModel)) canonModel = 'corolla';
    if (/evoc|evoque/.test(canonModel)) canonModel = 'range rover evoque';
    if (/range\s*rover\s*sport|^sport$/.test(canonModel) && brand === 'land rover') canonModel = 'range rover sport';
    if (/range\s*rover\s*vogue|^vogue$|^range\s*rover$/.test(canonModel) && brand === 'land rover') canonModel = 'range rover vogue';
    if (brand === 'mercedes-benz') {
      if (/^(c|c-class|c class|classe c|c200|c200 d|c220|c220 d)$/.test(canonModel)) canonModel = 'classe c';
      if (/^(a|a-class|a class|classe a|a200|a180)$/.test(canonModel)) canonModel = 'classe a';
      if (/^(e|e-class|e class|classe e|e200|e220|e220 d)$/.test(canonModel)) canonModel = 'classe e';
      if (/^(s|s-class|s class|classe s|s350|s350 d|s500)$/.test(canonModel)) canonModel = 'classe s';
      if (/^(v|v-class|v class|classe v)$/.test(canonModel)) canonModel = 'classe v';
      if (/^(cla|classe cla)$/.test(canonModel)) canonModel = 'classe cla';
      if (/^(gla|classe gla)$/.test(canonModel)) canonModel = 'classe gla';
      if (/^gle\b|^classe gle\b/.test(canonModel)) canonModel = 'classe gle';
      if (/^glc\b|^classe glc\b/.test(canonModel)) canonModel = 'classe glc';
      if (/^g63\b|^classe g\b/.test(canonModel)) canonModel = 'g63 amg';
    }
    if (/^golf\b/.test(canonModel) && !/gti|r\b/.test(canonModel)) canonModel = 'golf';
    if (/^q3\b/.test(canonModel)) canonModel = 'q3';
    if (/^q5\b/.test(canonModel)) canonModel = 'q5';
    if (/^q7\b/.test(canonModel)) canonModel = 'q7';
    if (/^q8\b/.test(canonModel)) canonModel = 'q8';
    if (/^a3\b/.test(canonModel)) canonModel = 'a3';
    if (/^a4\b/.test(canonModel)) canonModel = 'a4';

    return { brand: brand || 'autre', model: canonModel || model || 'autre' };
  }

  function extractListingYear(item) {
    const f = (item.features || []).find((feat) => /year|année|سنة/i.test(feat.label?.en || feat.label?.fr || feat.label?.ar || feat.label || ''));
    let year = parseInt(f?.value?.en || f?.value?.fr || f?.value?.ar || f?.value || '', 10);
    if (!Number.isFinite(year)) {
      const yFromQuick = (item.quickFacts || []).map((q) => (typeof q === 'object' ? (q.en || q.ar) : q)).find((v) => /^\d{4}$/.test(String(v)));
      year = parseInt(yFromQuick, 10);
    }
    return Number.isFinite(year) ? year : 2018;
  }

  function computeMarketValuationClient(item, allListings) {
    if (!item || !Number.isFinite(item.price)) return null;
    const askingPrice = item.price;
    const fullKindPool = (allListings || []).filter((l) => l && Number.isFinite(l.price) && l.price > 0 && l.kind === item.kind);
    const isRental = state.listingType === 'rental' || item.listingType === 'rental' || item.priceUnit === 'day' || (fullKindPool.length > 0 && fullKindPool[0].listingType === 'rental');
    const { brand, model } = extractCanonicalBrandModel(item);
    const year = extractListingYear(item);

    let estimated = null;

    if (brand && model && model !== 'autre' && model !== 'other') {
      const exactAll = fullKindPool.filter((l) => {
        const peerBM = extractCanonicalBrandModel(l);
        return peerBM.brand === brand && peerBM.model === model;
      });

      if (exactAll.length >= 2) {
        const adjusted = exactAll.map((peer) => {
          const pYear = extractListingYear(peer);
          return peer.price * Math.pow(1.065, year - pYear);
        });
        adjusted.sort((a, b) => a - b);
        const cut = adjusted.length >= 5 ? Math.floor(adjusted.length * 0.15) : 0;
        const valid = adjusted.slice(cut, adjusted.length - cut);
        estimated = valid.reduce((a, b) => a + b, 0) / valid.length;
      }
    }

    if (!estimated) {
      const sameCohort = fullKindPool.filter((l) => {
        const peerBM = extractCanonicalBrandModel(l);
        return peerBM.brand === brand && peerBM.model === model && extractListingYear(l) === year;
      });
      const cohortAvg = sameCohort.length > 0
        ? sameCohort.reduce((a, b) => a + b.price, 0) / sameCohort.length
        : askingPrice;

      if (sameCohort.length >= 2) {
        estimated = cohortAvg;
      } else {
        const brandSegmentPeers = fullKindPool.filter((l) => {
          const peerBM = extractCanonicalBrandModel(l);
          if (peerBM.brand !== brand) return false;
          const pYear = extractListingYear(l);
          if (Math.abs(pYear - year) > 3) return false;
          return l.price >= cohortAvg * 0.55 && l.price <= cohortAvg * 1.65;
        });

        if (brandSegmentPeers.length >= 2) {
          const adjustedPeers = brandSegmentPeers.map((p) => p.price * Math.pow(1.065, year - extractListingYear(p)));
          const peerAvg = adjustedPeers.reduce((a, b) => a + b, 0) / adjustedPeers.length;
          estimated = peerAvg * 0.5 + cohortAvg * 0.5;
        } else {
          const canonicalKey = `${item.kind}|${brand}|${model}|${year}`;
          let h = 0;
          for (let i = 0; i < canonicalKey.length; i++) h = (h * 31 + canonicalKey.charCodeAt(i)) & 0xffffff;
          const deltaPct = ((h % 19) - 9) / 100;
          estimated = cohortAvg * (1 - deltaPct);
        }
      }
    }

    if (isRental) {
      estimated = Math.max(50, Math.round(estimated / 10) * 10);
    } else {
      estimated = Math.max(2000, Math.round(estimated / 1000) * 1000);
    }
    const diff = askingPrice - estimated;
    const ratio = Math.round((diff / estimated) * 1000) / 1000;

    let tier = 'fair';
    if (ratio <= -0.10) tier = 'deal';
    else if (ratio <= 0.12) tier = 'fair';
    else if (ratio <= 0.25) tier = 'high';
    else tier = 'overpriced';

    return {
      estimatedMarketPrice: estimated,
      askingPrice,
      diff,
      ratio,
      ratioPct: Math.round(ratio * 1000) / 10,
      tier
    };
  }

  function renderMarketFairness(valuation, actualPrice) {
    if (!ui.marketCard || !valuation) return;
    state.lastValuation = { valuation, actualPrice };

    let needlePct = 45;
    const r = valuation.ratio;
    if (r <= -0.30) {
      needlePct = 5;
    } else if (r < -0.10) {
      const fraction = (r - (-0.30)) / (-0.10 - (-0.30));
      needlePct = 5 + fraction * 23;
    } else if (r <= 0) {
      const fraction = (r - (-0.10)) / (0 - (-0.10));
      needlePct = 28 + fraction * 17;
    } else if (r <= 0.12) {
      const fraction = r / 0.12;
      needlePct = 45 + fraction * 15;
    } else if (r <= 0.25) {
      const fraction = (r - 0.12) / (0.25 - 0.12);
      needlePct = 60 + fraction * 20;
    } else if (r <= 0.40) {
      const fraction = (r - 0.25) / (0.40 - 0.25);
      needlePct = 80 + fraction * 15;
    } else {
      needlePct = 95;
    }

    needlePct = Math.max(4, Math.min(96, needlePct));

    if (ui.marketNeedle) {
      ui.marketNeedle.style.left = '45%';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          ui.marketNeedle.style.left = `${needlePct.toFixed(1)}%`;
        });
      });
    }

    if (ui.marketTooltipPrice) {
      ui.marketTooltipPrice.textContent = money(actualPrice);
    }

    const tierMap = {
      deal: { cls: 'tier-deal', verdict: t('verdictDeal') },
      fair: { cls: 'tier-fair', verdict: t('verdictFair') },
      high: { cls: 'tier-high', verdict: t('verdictHigh') },
      overpriced: { cls: 'tier-overpriced', verdict: t('verdictOverpriced') }
    };
    const currentTier = tierMap[valuation.tier] || tierMap.fair;

    if (ui.marketVerdictBadge) {
      ui.marketVerdictBadge.className = currentTier.cls;
      ui.marketVerdictBadge.textContent = currentTier.verdict;
    }

    const sign = valuation.ratio > 0 ? '+' : (valuation.ratio < 0 ? '-' : '');
    const absPct = Math.abs(valuation.ratioPct).toFixed(1);
    if (ui.marketDiffPill) {
      ui.marketDiffPill.setAttribute('dir', 'ltr');
      ui.marketDiffPill.textContent = `${sign}${absPct}%`;
    }

    if (ui.marketEstimateVal) {
      ui.marketEstimateVal.textContent = money(valuation.estimatedMarketPrice);
    }
    if (ui.marketSellerVal) {
      ui.marketSellerVal.textContent = money(actualPrice);
    }
    if (ui.marketGapVal) {
      const gapDiff = Math.abs(valuation.diff);
      const gapSign = valuation.diff > 0 ? '+' : (valuation.diff < 0 ? '-' : '');
      const pctFormatted = `${sign}${absPct}%`;
      if (state.language === 'ar') {
        const formattedAmount = new Intl.NumberFormat('fr-MA').format(gapDiff);
        const signedCurrency = gapSign ? `${gapSign}\u2066${formattedAmount}\u2069 درهم` : `\u2066${formattedAmount}\u2069 درهم`;
        ui.marketGapVal.innerHTML = `<span dir="ltr" style="unicode-bidi: isolate; display: inline-block;">${signedCurrency}</span> <span dir="ltr" style="unicode-bidi: isolate; display: inline-block;">(${pctFormatted})</span>`;
      } else {
        ui.marketGapVal.textContent = `${gapSign}${money(gapDiff)} (${pctFormatted})`;
      }
      if (valuation.tier === 'deal') {
        ui.marketGapVal.className = 'market-stat-val is-negative';
      } else if (valuation.tier === 'fair') {
        ui.marketGapVal.className = 'market-stat-val is-neutral';
      } else {
        ui.marketGapVal.className = 'market-stat-val is-positive';
      }
    }
  }

  function showResult(item, result) {
    const guessText = result.timedOut ? t('timeUp') : money(result.guess);
    const displayTitle = formatTitleWithYear(item);
    state.results.push({ title: displayTitle, score: result.score, actual: result.actualPrice, guess: result.guess });
    ui.resultTitle.textContent = displayTitle;
    ui.actual.textContent = money(result.actualPrice);
    ui.guessed.textContent = guessText;
    ui.difference.textContent = result.difference === null ? '—' : money(result.difference);
    ui.score.innerHTML = `<span dir="ltr"><bdi>${result.score}</bdi> / 1 000</span>`;
    if (ui.message) ui.message.textContent = scoreCopy(result);

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

    // Render Market Fairness Slider & Comparison
    const valuation = result.marketValuation || computeMarketValuationClient(item, getCatalogListings());
    renderMarketFairness(valuation, result.actualPrice);

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
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.leaderboard) && data.leaderboard.length > 0) {
          state.leaderboard = data.leaderboard;
          renderLeaderboard();
          return;
        }
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

    // Offline cache fallback
    try {
      const cached = localStorage.getItem('rwida-offline-scores');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          state.leaderboard = parsed;
        }
      }
    } catch (_) {}

    renderLeaderboard();
  }

  function renderLeaderboard() {
    const list = state.leaderboard || [];
    const total = state.results.length
      ? state.results.reduce((sum, r) => sum + (r.score || 0), 0)
      : (parseInt(String(ui.total?.textContent || '0').replace(/[^0-9]/g, ''), 10) || 0);
    const html = list.length
      ? list.map((item) => {
          let medal = '';
          if (item.rank === 1) medal = '🥇';
          else if (item.rank === 2) medal = '🥈';
          else if (item.rank === 3) medal = '🥉';
          const isMe = state.savedThisGame && String(item.name || '').trim().toLowerCase() === String(state.playerName || '').trim().toLowerCase() && item.score === total;
          const formattedScore = new Intl.NumberFormat(state.language === 'ar' ? 'fr-MA' : 'en-US').format(item.score);
          const isMotoEntry = item.mode === 'motorbikes' || item.mode === 'rental_motorbikes';
          const isRentalEntry = item.mode === 'rental_cars' || item.mode === 'rental_motorbikes';
          const modeIcon = isRentalEntry ? (isMotoEntry ? '🔑🏍️' : '🔑🚗') : (isMotoEntry ? '🏍️' : '🚗');
          const modeTitle = isRentalEntry ? (isMotoEntry ? 'Rental Motorbikes' : 'Rental Cars') : (isMotoEntry ? 'Motorbikes' : 'Cars');
          return `<li class="lb-row ${isMe ? 'is-me' : ''} ${item.rank <= 3 ? 'is-podium' : ''}">
            <span class="lb-rank">${medal || `#${item.rank}`}</span>
            <span class="lb-name" title="${escape(item.name)}">
              <span class="lb-mode" title="${modeTitle}">${modeIcon}</span>
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
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    if (state.submittingScore) return;
    if (state.savedThisGame) {
      showLeaderboardFeedback(t('alreadySaved'), 'info');
      return;
    }
    const rawName = (ui.playerName ? ui.playerName.value : '').trim();
    if (!rawName) {
      showLeaderboardFeedback(t('nameRequired'), 'error');
      if (ui.playerName) ui.playerName.focus();
      return;
    }
    const name = rawName.slice(0, 30);
    state.playerName = name;
    localStorage.setItem('rwida-player-name', name);
    const total = state.results.length
      ? state.results.reduce((sum, r) => sum + (Number(r.score) || 0), 0)
      : (parseInt(String(ui.total?.textContent || '0').replace(/[^0-9]/g, ''), 10) || 0);

    state.submittingScore = true;
    if (ui.saveScoreBtn) {
      ui.saveScoreBtn.disabled = true;
      ui.saveScoreBtn.innerHTML = t('savingScore');
    }

    const lbMode = state.listingType === 'rental'
      ? (state.mode === 'motorbikes' ? 'rental_motorbikes' : 'rental_cars')
      : (state.mode || 'cars');
    const payload = { name, score: total, mode: lbMode };
    let savedSuccessfully = false;
    let rank = null;

    // 1. Primary path: Call backend endpoint (/api/leaderboard)
    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.leaderboard)) {
          state.leaderboard = data.leaderboard;
        }
        rank = data.rank;
        savedSuccessfully = true;
      } else {
        console.warn('Backend leaderboard POST returned non-ok status:', res.status);
      }
    } catch (apiErr) {
      console.warn('API leaderboard POST network error, falling back to direct JSONBin write:', apiErr);
    }

    // 2. Direct JSONBin client fallback (CORS is supported by JSONBin)
    if (!savedSuccessfully) {
      try {
        const binId = '6aa05769ac6210605ab4d5b9';
        const apiKey = '$2a$10$3xI2W00BsiGhjbq2yCC4jeq6sj7TqNA3I1lGa2AAfthmUjM5M.r7q';
        const getRes = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
          headers: { 'X-Master-Key': apiKey }
        });
        let currentList = [];
        if (getRes.ok) {
          const payload = await getRes.json();
          const raw = Array.isArray(payload.record) ? payload.record : [];
          currentList = raw.map((item) => {
            if (Array.isArray(item)) return { name: String(item[0] || '').trim(), score: Number(item[1]) || 0, mode: item[2] || 'cars' };
            if (item && typeof item === 'object') return { name: String(item.name || '').trim(), score: Number(item.score) || 0, mode: item.mode || 'cars' };
            return null;
          }).filter(Boolean);
        }
        currentList.push({ name, score: total, mode: state.mode || 'cars' });
        currentList.sort((a, b) => b.score - a.score);
        const top50 = currentList.slice(0, 50);
        const toSave = top50.map((e) => [e.name, e.score, e.mode || 'cars']);

        const putRes = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': apiKey,
            'X-Bin-Versioning': 'false'
          },
          body: JSON.stringify(toSave)
        });

        if (putRes.ok) {
          state.leaderboard = top50.map((entry, index) => ({
            rank: index + 1,
            name: entry.name,
            score: entry.score,
            mode: entry.mode || 'cars'
          }));
          rank = state.leaderboard.findIndex((x) => x.name.toLowerCase() === name.toLowerCase() && x.score === total) + 1;
          savedSuccessfully = true;
        } else {
          console.warn('Direct JSONBin PUT returned status:', putRes.status);
        }
      } catch (jsonBinErr) {
        console.warn('Direct JSONBin write failed:', jsonBinErr);
      }
    }

    // 3. Local offline fallback so player NEVER loses their score
    if (!savedSuccessfully) {
      try {
        const localList = Array.isArray(state.leaderboard) ? [...state.leaderboard] : [];
        localList.push({ rank: 0, name, score: total, mode: state.mode || 'cars' });
        localList.sort((a, b) => b.score - a.score);
        state.leaderboard = localList.slice(0, 50).map((item, idx) => ({ ...item, rank: idx + 1 }));
        try {
          localStorage.setItem('rwida-offline-scores', JSON.stringify(state.leaderboard));
        } catch (_) {}
        rank = state.leaderboard.findIndex((x) => x.name.toLowerCase() === name.toLowerCase() && x.score === total) + 1;
        savedSuccessfully = true;
      } catch (localErr) {
        console.error('All save score attempts failed:', localErr);
      }
    }

    state.submittingScore = false;

    if (savedSuccessfully) {
      state.savedThisGame = true;
      if (ui.saveScoreBtn) {
        ui.saveScoreBtn.disabled = true;
        ui.saveScoreBtn.innerHTML = t('savedScore');
        ui.saveScoreBtn.classList.add('is-saved');
      }
      if (ui.playerName) ui.playerName.disabled = true;
      const displayRank = rank || (state.leaderboard.findIndex((x) => x.name.toLowerCase() === name.toLowerCase() && x.score === total) + 1) || 1;
      showLeaderboardFeedback(t('scoreRanked', { rank: displayRank }), 'success');
      renderLeaderboard();
    } else {
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
  function createPanZoom({ container, img, onZoomChange }) {
    let scale = 1;
    let tx = 0;
    let ty = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startTx = 0;
    let startTy = 0;
    let hasMoved = false;

    function clampOffsets() {
      if (scale <= 1.02) {
        tx = 0;
        ty = 0;
        return;
      }
      const rect = container.getBoundingClientRect();
      const maxTx = Math.max(0, (rect.width * (scale - 1)) / 2);
      const maxTy = Math.max(0, (rect.height * (scale - 1)) / 2);
      tx = Math.max(-maxTx, Math.min(maxTx, tx));
      ty = Math.max(-maxTy, Math.min(maxTy, ty));
    }

    function applyTransform(animate = false) {
      if (animate) {
        img.style.transition = 'transform 0.22s cubic-bezier(0.2, 0, 0, 1)';
      } else {
        img.style.transition = 'none';
      }
      img.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
      const zoomed = scale > 1.05;
      container.classList.toggle('is-zoomed', zoomed);
      if (zoomed) {
        img.style.cursor = isDragging ? 'grabbing' : 'grab';
      } else {
        img.style.cursor = 'default';
      }
      if (onZoomChange) onZoomChange(zoomed);
    }

    function zoomTo(targetScale, animate = true) {
      scale = Math.max(1, Math.min(4, targetScale));
      if (scale <= 1.02) {
        scale = 1;
        tx = 0;
        ty = 0;
      } else {
        clampOffsets();
      }
      applyTransform(animate);
    }

    function toggle() {
      if (scale > 1.05) {
        reset(true);
      } else {
        zoomTo(2.35, true);
      }
    }

    function reset(animate = true) {
      scale = 1;
      tx = 0;
      ty = 0;
      applyTransform(animate);
    }

    function centerPan(animate = false) {
      tx = 0;
      ty = 0;
      applyTransform(animate);
    }

    function isZoomed() {
      return scale > 1.05;
    }

    function onPointerDown(e) {
      if (e.button !== undefined && e.button !== 0) return;
      if (scale <= 1.05) return;
      startX = e.clientX;
      startY = e.clientY;
      startTx = tx;
      startTy = ty;
      hasMoved = false;

      isDragging = true;
      container.classList.add('is-dragging');
      img.style.cursor = 'grabbing';

      function onPointerMove(ev) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (Math.hypot(dx, dy) > 4) {
          hasMoved = true;
        }
        if (isDragging && scale > 1.05) {
          ev.preventDefault();
          tx = startTx + dx;
          ty = startTy + dy;
          clampOffsets();
          applyTransform(false);
        }
      }

      function onPointerUp() {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        if (isDragging) {
          isDragging = false;
          container.classList.remove('is-dragging');
          clampOffsets();
          applyTransform(true);
        }
      }

      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    }

    img.addEventListener('pointerdown', onPointerDown);

    return {
      isZoomed,
      toggle,
      reset,
      centerPan,
      zoomTo
    };
  }

  const visualPanZoom = createPanZoom({
    container: ui.visual,
    img: ui.image,
    onZoomChange: (isZoomed) => {
      ui.zoomImage.setAttribute('aria-label', t(isZoomed ? 'zoomOut' : 'zoomIn'));
      ui.zoomImage.innerHTML = `<span class="zoom-btn-icon" aria-hidden="true">${isZoomed ? '−' : '+'}</span>`;
    }
  });

  const lightboxPanZoom = createPanZoom({
    container: ui.lightbox,
    img: ui.lightboxImage,
    onZoomChange: (isZoomed) => {
      ui.lightboxZoom.setAttribute('aria-label', t(isZoomed ? 'zoomOut' : 'zoomIn'));
      ui.lightboxZoom.innerHTML = `<span class="zoom-btn-icon" aria-hidden="true">${isZoomed ? '−' : '+'}</span>`;
      if (ui.lightboxZoomOut) {
        ui.lightboxZoomOut.disabled = !isZoomed;
      }
    }
  });

  function changeImage(delta) {
    const item = state.listings[state.current];
    const images = item && listingImages(item);
    if (!images || images.length < 2) return;
    state.imageIndex += delta;
    renderImage(item, false);
    if (visualPanZoom.isZoomed()) {
      visualPanZoom.centerPan(false);
    }
  }
  function toggleZoom() {
    if (ui.image.classList.contains('hidden')) return;
    visualPanZoom.toggle();
  }
  function openLightbox() {
    const item = state.listings[state.current];
    const images = item && listingImages(item);
    if (!images || !images.length) return;
    updateLightbox();
    if (!ui.lightbox.open) {
      ui.lightbox.showModal();
    }
    lightboxPanZoom.reset(false);
    if (ui.lightboxZoomOut) ui.lightboxZoomOut.disabled = true;
    try {
      if (ui.lightbox.requestFullscreen && !document.fullscreenElement) {
        ui.lightbox.requestFullscreen().catch(() => {});
      }
    } catch (_) {}
  }
  function closeLightbox() {
    lightboxPanZoom.reset(false);
    if (ui.lightboxZoomOut) ui.lightboxZoomOut.disabled = true;
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
    ui.lightboxImage.loading = 'eager';
    ui.lightboxImage.decoding = 'async';
    ui.lightboxImage.src = images[state.imageIndex];
    ui.lightboxImage.alt = formatTitleWithYear(item);
    ui.lightboxCount.textContent = `${state.imageIndex + 1} / ${images.length}`;
    ui.lightboxPrev.disabled = images.length < 2;
    ui.lightboxNext.disabled = images.length < 2;
    if (lightboxPanZoom.isZoomed()) {
      lightboxPanZoom.centerPan(false);
    }
    const isLbZoomed = lightboxPanZoom.isZoomed();
    ui.lightboxZoom.setAttribute('aria-label', t(isLbZoomed ? 'zoomOut' : 'zoomIn'));
    ui.lightboxZoom.innerHTML = `<span class="zoom-btn-icon" aria-hidden="true">${isLbZoomed ? '−' : '+'}</span>`;
    if (ui.lightboxZoomOut) {
      ui.lightboxZoomOut.disabled = !isLbZoomed;
    }
    if (images.length > 1) {
      preloadImage(images[(state.imageIndex + 1) % images.length]);
      preloadImage(images[((state.imageIndex - 1) % images.length + images.length) % images.length]);
    }
  }
  function toggleLightboxZoom() {
    lightboxPanZoom.toggle();
  }
  function changeLightboxImage(delta) {
    const item = state.listings[state.current];
    const images = item && listingImages(item);
    if (!images || images.length < 2) return;
    state.imageIndex += delta;
    updateLightbox();
    renderImage(item, false);
  }
  async function loadGame() {
    const seconds = Math.min(3000, Math.max(30, Number(ui.duration.value) || 600));
    const mode = state.mode || 'cars';
    const listingType = state.listingType === 'rental' ? 'rental' : 'sale';
    const region = state.region && state.region !== 'all' ? state.region : '';
    const fuel = (mode !== 'motorbikes' && state.fuel && state.fuel !== 'all') ? state.fuel : '';
    const typeParam = `&type=${encodeURIComponent(listingType)}`;
    const regionParam = region ? `&region=${encodeURIComponent(region)}` : '';
    const fuelParam = fuel ? `&fuel=${encodeURIComponent(fuel)}` : '';
    try {
      const response = await fetch(`/api/game?seconds=${seconds}&mode=${mode}${typeParam}${regionParam}${fuelParam}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('no game endpoint');
      const payload = await response.json();
      if (!Array.isArray(payload.round) || payload.round.length < 5) throw new Error('not enough listings');
      state.listings = payload.round;
      state.reserves = Array.isArray(payload.reserves) ? payload.reserves : [];
      state.live = true;
      ui.dataNote.textContent = t('liveData');
    } catch (_) {
      let pool = [];
      const isRental = listingType === 'rental';
      try {
        const staticRes = await fetch(isRental ? '/data/rentals.imported.json' : '/data/listings.imported.json');
        if (staticRes.ok) {
          pool = await staticRes.json();
          if (isRental) window.DEMO_RENTAL_LISTINGS = pool;
          else window.DEMO_LISTINGS = pool;
          updateFilterAvailability();
        }
      } catch (e) {}
      if (!pool.length) {
        pool = getCatalogListings();
      }
      if (mode === 'motorbikes') {
        const filtered = pool.filter((item) => (item.kind || '').toLowerCase().includes('moto') || (item.kind || '').toLowerCase().includes('bike'));
        if (filtered.length >= 5) pool = filtered;
      } else {
        const filtered = pool.filter((item) => (item.kind || '').toLowerCase().includes('car') || item.kind === 'Voiture');
        if (filtered.length >= 5) pool = filtered;
      }
      if (region && fuel) {
        const bothFiltered = pool.filter((item) => (item.location && item.location.region === region) && isMatchingFuel(item, fuel));
        if (bothFiltered.length >= 5) {
          pool = bothFiltered;
        } else {
          const sameRegion = pool.filter((item) => item.location && item.location.region === region);
          if (sameRegion.length >= 5) {
            pool = sameRegion;
          } else {
            const sameFuel = pool.filter((item) => isMatchingFuel(item, fuel));
            if (sameFuel.length >= 5) pool = sameFuel;
          }
        }
      } else if (region) {
        const regionFiltered = pool.filter((item) => item.location && item.location.region === region);
        if (regionFiltered.length >= 5) pool = regionFiltered;
      } else if (fuel) {
        const fuelFiltered = pool.filter((item) => isMatchingFuel(item, fuel));
        if (fuelFiltered.length >= 5) pool = fuelFiltered;
      }
      state.listings = selectFive(pool);
      const usedIds = new Set(state.listings.map((l) => l.id));
      state.reserves = pool.filter((item) => !usedIds.has(item.id));
      state.live = false;
      ui.dataNote.textContent = t('liveData');
    }
    preloadGameImages(state.listings);
    validateUpcomingListings();
  }
  function setListingType(listingType) {
    const normalized = listingType === 'rental' ? 'rental' : 'sale';
    if (state.listingType === normalized) return;
    state.listingType = normalized;
    localStorage.setItem('rwida-listing-type', normalized);
    applyPreferences();
    loadGame();
  }
  function setMode(mode) {
    if (state.mode === mode) return;
    state.mode = mode;
    localStorage.setItem('rwida-mode', mode);
    applyPreferences();
    loadGame();
  }
  if (ui.typeSale) ui.typeSale.addEventListener('click', () => setListingType('sale'));
  if (ui.typeRental) ui.typeRental.addEventListener('click', () => setListingType('rental'));
  if (ui.modeCars) ui.modeCars.addEventListener('click', () => setMode('cars'));
  if (ui.modeMotorbikes) ui.modeMotorbikes.addEventListener('click', () => setMode('motorbikes'));
  if (ui.fuelFilter) {
    ui.fuelFilter.value = state.fuel || 'all';
    ui.fuelFilter.addEventListener('change', () => {
      state.fuel = ui.fuelFilter.value;
      localStorage.setItem('rwida-fuel', state.fuel);
      applyPreferences();
      loadGame();
    });
  }
  if (ui.regionFilter) {
    ui.regionFilter.value = state.region || 'all';
    ui.regionFilter.addEventListener('change', () => {
      state.region = ui.regionFilter.value;
      localStorage.setItem('rwida-region', state.region);
      applyPreferences();
      loadGame();
    });
  }
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
    applyPreferences();
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
  if (ui.saveScoreBtn) {
    ui.saveScoreBtn.addEventListener('click', (e) => {
      handleScoreSubmit(e);
    });
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
  ui.fullscreenImage.addEventListener('click', openLightbox);
  ui.lightboxClose.addEventListener('click', closeLightbox);
  ui.lightboxPrev.addEventListener('click', () => changeLightboxImage(document.documentElement.dir === 'rtl' ? 1 : -1));
  ui.lightboxNext.addEventListener('click', () => changeLightboxImage(document.documentElement.dir === 'rtl' ? -1 : 1));
  ui.lightboxZoom.addEventListener('click', toggleLightboxZoom);
  if (ui.lightboxZoomOut) {
    ui.lightboxZoomOut.addEventListener('click', () => lightboxPanZoom.reset(true));
  }
  ui.lightbox.addEventListener('click', (e) => {
    if (e.target === ui.lightbox) closeLightbox();
  });
  ui.image.addEventListener('error', () => {
    const item = state.listings[state.current];
    if (!item || state.submitting) return;
    if (!item._failedImages) item._failedImages = new Set();
    const badSrc = ui.image.src;
    if (badSrc) item._failedImages.add(badSrc);

    const workingImages = listingImages(item);
    if (workingImages.length > 0) {
      state.imageIndex = 0;
      renderImage(item, false);
      return;
    }
    skipBrokenListing(item, 'photo-error-404');
  });
  ui.lightboxImage.addEventListener('error', () => {
    const item = state.listings[state.current];
    if (!item || state.submitting) return;
    if (!item._failedImages) item._failedImages = new Set();
    const badSrc = ui.lightboxImage.src;
    if (badSrc) item._failedImages.add(badSrc);

    const workingImages = listingImages(item);
    if (workingImages.length > 0) {
      state.imageIndex = 0;
      updateLightbox();
      renderImage(item, false);
      return;
    }
    closeLightbox();
    skipBrokenListing(item, 'lightbox-photo-error-404');
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
  fetchLeaderboard();
  loadGame();
})();
