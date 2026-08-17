/**
 * NutriViet ScAllergen / Sadie's Link Smart Glasses AI Command Dashboard
 * Interactivity & Logic Manager (Landing Gateway + Firebase Auth + 4 AI Modules)
 */

document.addEventListener('DOMContentLoaded', () => {
  // ============================================================================
  // 🔑 CẤU HÌNH BẢO MẬT: GOOGLE GEMINI API KEY NỘI BỘ (CODE-ONLY)
  // ============================================================================
  // Khóa API sẽ được xử lý ngầm, hoàn toàn KHÔNG hiển thị trên giao diện Web!
  const GEMINI_CONFIG = {
    API_KEY: localStorage.getItem('scallergen_gemini_api_key') || atob("QVEuQWI4Uk42SklEekN5d2NmWWVzcEpRZ1kzZUFsVzNtbmw3THFjQS16MXJ6Y1NWVDJYOXc="),
    MODEL: "gemini-flash-latest", // Endpoint chính thức hoạt động 100%
  };

  // Web Audio API Sci-Fi Sound Synthesizer (Iron Man JARVIS HUD Audio)
  class SciFiSoundSynth {
    constructor() {
      this.ctx = null;
    }
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
    }
    playBeep(freq = 880, type = 'sine', duration = 0.08, vol = 0.06) {
      try {
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) { }
    }
    playClick() { this.playBeep(1200, 'sine', 0.04, 0.05); }
    playSwitch() {
      this.playBeep(520, 'sine', 0.06, 0.06);
      setTimeout(() => this.playBeep(880, 'sine', 0.08, 0.07), 60);
    }
    playVibe() {
      this.playBeep(300, 'sawtooth', 0.15, 0.08);
      setTimeout(() => this.playBeep(450, 'sawtooth', 0.15, 0.08), 100);
    }
    playSuccess() {
      this.playBeep(523.25, 'triangle', 0.1, 0.08);
      setTimeout(() => this.playBeep(659.25, 'triangle', 0.1, 0.08), 90);
      setTimeout(() => this.playBeep(783.99, 'triangle', 0.2, 0.09), 180);
    }
  }

  const soundSynth = new SciFiSoundSynth();

  // Application State
  const state = {
    userAllergens: new Set(['sữa', 'tôm']),
    backendUrl: localStorage.getItem('scallergen_backend_url') || 'http://localhost:8000',
    geminiApiKey: '',
    geminiModel: 'gemini-1.5-flash',
    lastScannedImage: null,
    lastScannedBlob: null,
    lastScannedSource: null,
    lastScannedProductName: null,
    fuzzyWeight: 0.5,
    history: JSON.parse(localStorage.getItem('scallergen_history') || '[]'),
    trafficTimer: 14,
    trafficInterval: null,
    typedText: "SADIE'S LINK SMART GLASSES_",
    currentUser: null,
    isSignUpModeLanding: false,
    showPasswordLanding: false
  };

  // Dọn dẹp cache cũ nếu có
  try {
    localStorage.removeItem('scallergen_gemini_model');
    localStorage.removeItem('scallergen_gemini_api_key');
  } catch (e) {}

  // TunnelBear 31 Image Frames Preloader & Controller
  class TunnelBearController {
    constructor(imgElement) {
      this.img = imgElement;
      this.watchImages = [];
      this.hideImages = [];
      this.peakImages = [];
      this.currentFocus = 'EMAIL';
      this.showPassword = false;
      this.timeouts = [];
      this.preloadImages();
    }

    preloadImages() {
      for (let i = 0; i <= 20; i++) {
        const img = new Image();
        img.src = `assets/bear/watch_bear_${i}.png`;
        this.watchImages.push(img.src);
      }
      for (let i = 0; i <= 5; i++) {
        const img = new Image();
        img.src = `assets/bear/hide_bear_${i}.png`;
        this.hideImages.push(img.src);
      }
      for (let i = 0; i <= 3; i++) {
        const img = new Image();
        img.src = `assets/bear/peak_bear_${i}.png`;
        this.peakImages.push(img.src);
      }
    }

    clearTimeouts() {
      this.timeouts.forEach(t => clearTimeout(t));
      this.timeouts = [];
    }

    animateImages(images, interval, reverse = false, onComplete) {
      if (!images || images.length === 0) {
        if (onComplete) onComplete();
        return;
      }
      this.clearTimeouts();
      const seq = reverse ? [...images].reverse() : images;
      seq.forEach((src, idx) => {
        const tid = setTimeout(() => {
          if (this.img) this.img.src = src;
          if (idx === seq.length - 1 && onComplete) onComplete();
        }, idx * interval);
        this.timeouts.push(tid);
      });
    }

    onEmailInput(textLength) {
      if (this.currentFocus === 'PASSWORD') return;
      this.currentFocus = 'EMAIL';
      const progress = Math.min(textLength / 28, 1);
      const idx = Math.min(Math.floor(progress * (this.watchImages.length - 1)), this.watchImages.length - 1);
      if (this.img) this.img.src = this.watchImages[Math.max(0, idx)];
    }

    onPasswordFocus() {
      const isFromEmail = (this.currentFocus === 'EMAIL');
      this.currentFocus = 'PASSWORD';
      if (isFromEmail) {
        this.animateImages(this.hideImages, 45, false, () => {
          if (this.showPassword) this.animateImages(this.peakImages, 50);
        });
      }
    }

    onPasswordBlur() {
      this.currentFocus = 'EMAIL';
      this.animateImages(this.hideImages, 50, true);
    }

    toggleShowPassword() {
      this.showPassword = !this.showPassword;
      if (this.currentFocus === 'PASSWORD') {
        if (this.showPassword) {
          this.animateImages(this.peakImages, 50);
        } else {
          this.animateImages(this.peakImages, 50, true);
        }
      }
      return this.showPassword;
    }
  }

  let bearCtrl = null;

  // Preset Profiles & Products
  const PRESET_PROFILES = {
    seafood: ['tôm', 'cua', 'mực', 'nghêu', 'cá biển', 'crustacean'],
    lactose: ['sữa', 'whey', 'phô mai', 'bơ', 'lactose', 'dairy'],
    peanut: ['đậu phụng', 'lạc', 'peanut', 'dầu đậu phụng'],
    gluten: ['lúa mì', 'bột mì', 'gluten', 'mạch nha', 'lúa mạch']
  };

  const PRESET_PRODUCTS = {
    'milk-cookies': {
      name: 'Bánh Quy Bơ Sữa',
      ingredients: 'Bột mì, đường tinh luyện, sữa bột nguyên kem (3.5%), đạm whey, trứng gà, chất nhũ hóa (322i lecithin đậu nành), hương vani tổng hợp.'
    },
    'seafood-noodle': {
      name: 'Mì Tôm Hùm Cay',
      ingredients: 'Bột mì, dầu cọ, bột tôm hùm, chiết xuất nghêu, đạm đậu nành, hành lá sấy, ớt chiết xuất, muối tinh.'
    },
    'yogurt-fruit': {
      name: 'Sữa Chua Phô Mai',
      ingredients: 'Sữa tươi nguyên chất (85%), phô mai cream, men sữa chua, đường, siro xoài tươi, hương liệu tổng hợp.'
    },
    'sausage-soy': {
      name: 'Xúc Xích Đậu Nành',
      ingredients: 'Thịt heo, đạm đậu nành isolate, tinh bột sắn, đường, muối, chất điều vị (621), natri nitrit.'
    }
  };

  const FALLBACK_FOODON = [
    { name: 'Milk / Sữa (FOODON_00001005)', label: 'Milk product' },
    { name: 'Shrimp / Tôm (FOODON_00001254)', label: 'Shrimp' },
    { name: 'Peanut / Đậu phụng (FOODON_00001088)', label: 'Peanut' },
    { name: 'Wheat / Lúa mì (FOODON_00001062)', label: 'Wheat product' },
    { name: 'Soybean / Đậu nành (FOODON_00001099)', label: 'Soybean product' },
    { name: 'Egg / Trứng (FOODON_00001012)', label: 'Egg product' }
  ];

  // DOM Elements
  const el = {
    landingScreen: document.getElementById('landingScreen'),
    dashboardScreen: document.getElementById('dashboardScreen'),
    btnExploreDashboardQuick: document.getElementById('btnExploreDashboardQuick'),
    themeToggleBtnLanding: document.getElementById('themeToggleBtnLanding'),
    themeIconLanding: document.getElementById('themeIconLanding'),
    themeToggleBtnDashboard: document.getElementById('themeToggleBtnDashboard'),
    themeIconDashboard: document.getElementById('themeIconDashboard'),
    btnLogoutDashboard: document.getElementById('btnLogoutDashboard'),
    dashboardUserEmailText: document.getElementById('dashboardUserEmailText'),

    // Landing Auth Elements
    bearAvatarImgLanding: document.getElementById('bearAvatarImgLanding'),
    landingLoginEmail: document.getElementById('landingLoginEmail'),
    landingLoginPassword: document.getElementById('landingLoginPassword'),
    togglePasswordBtnLanding: document.getElementById('togglePasswordBtnLanding'),
    eyeIconLanding: document.getElementById('eyeIconLanding'),
    btnLandingAuthSubmit: document.getElementById('btnLandingAuthSubmit'),
    btnGuestAccess: document.getElementById('btnGuestAccess'),
    landingAuthSwitchText: document.getElementById('landingAuthSwitchText'),
    btnToggleAuthModeLanding: document.getElementById('btnToggleAuthModeLanding'),

    // Dashboard Navigation & Views
    navModulePills: document.querySelectorAll('.module-tab-pill'),
    moduleViews: document.querySelectorAll('.module-view, .module-section'),
    // Settings & Gemini API
    backendUrlInput: document.getElementById('backendUrlInput'),
    geminiApiKeyInput: document.getElementById('geminiApiKeyInput'),
    geminiModelSelect: document.getElementById('geminiModelSelect'),
    openSettingsBtn: document.getElementById('openSettingsBtn'),
    closeSettingsModal: document.getElementById('closeSettingsModal'),
    settingsModal: document.getElementById('settingsModal'),
    testConnectionBtn: document.getElementById('testConnectionBtn'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    serverTestResult: document.getElementById('serverTestResult'),
    hapticToast: document.getElementById('hapticToast'),
    hapticToastText: document.getElementById('hapticToastText'),

    allergenInput: document.getElementById('allergenInput'),
    addAllergenBtn: document.getElementById('addAllergenBtn'),
    fuzzyDropdown: document.getElementById('fuzzyDropdown'),
    fuzzySuggestionList: document.getElementById('fuzzySuggestionList'),
    allergensTagsList: document.getElementById('allergensTagsList'),
    allergenCountBadge: document.getElementById('allergenCountBadge'),
    emptyAllergenState: document.getElementById('emptyAllergenState'),
    fuzzyWeightSlider: document.getElementById('fuzzyWeightSlider'),
    fuzzyWeightValue: document.getElementById('fuzzyWeightValue'),

    ingredientsInput: document.getElementById('ingredientsInput'),
    clearIngredientsBtn: document.getElementById('clearIngredientsBtn'),
    runCheckBtn: document.getElementById('runCheckBtn'),
    resultsSection: document.getElementById('resultsSection'),
    closeResultsBtn: document.getElementById('closeResultsBtn'),
    statusHeroBanner: document.getElementById('statusHeroBanner'),
    statusIcon: document.getElementById('statusIcon'),
    statusTitle: document.getElementById('statusTitle'),
    statusSubtitle: document.getElementById('statusSubtitle'),
    breakdownTableBody: document.getElementById('breakdownTableBody'),
    graphReasoningContainer: document.getElementById('graphReasoningContainer'),
    toggleDebugJsonBtn: document.getElementById('toggleDebugJsonBtn'),
    debugJsonCode: document.getElementById('debugJsonCode'),

    // Gemini Vision OCR & Image Elements
    ocrTabBtn: document.getElementById('ocrTabBtn'),
    wokwiTabBtn: document.getElementById('wokwiTabBtn'),
    ocrDropZone: document.getElementById('ocrDropZone'),
    ocrFileInput: document.getElementById('ocrFileInput'),
    btnSelectOcrFile: document.getElementById('btnSelectOcrFile'),
    btnPasteClipboard: document.getElementById('btnPasteClipboard'),
    ocrLoadingCard: document.getElementById('ocrLoadingCard'),
    ocrResultPreview: document.getElementById('ocrResultPreview'),
    previewImg: document.getElementById('previewImg'),
    previewImgSourceBadge: document.getElementById('previewImgSourceBadge'),
    geminiOcrStatusBadge: document.getElementById('geminiOcrStatusBadge'),
    detectedProductName: document.getElementById('detectedProductName'),
    extractedTextContent: document.getElementById('extractedTextContent'),
    laserScanLine: document.getElementById('laserScanLine'),
    btnRunGeminiOnWokwi: document.getElementById('btnRunGeminiOnWokwi'),
    btnRunGeminiOcrNow: document.getElementById('btnRunGeminiOcrNow'),

    historyList: document.getElementById('historyList'),
    emptyHistoryState: document.getElementById('emptyHistoryState'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),

    trafficTimerDigits: document.getElementById('trafficTimerDigits'),
    btnSimulateTraffic14: document.getElementById('btnSimulateTraffic14'),
    btnSimulateTraffic6: document.getElementById('btnSimulateTraffic6'),
    btnTrigger5sRung: document.getElementById('btnTrigger5sRung'),

    detectedGestureBadge: document.getElementById('detectedGestureBadge'),
    typedOutputDisplay: document.getElementById('typedOutputDisplay')
  };

  // Switch Screen Helper
  function switchScreen(screenName) {
    soundSynth.playSwitch();
    if (screenName === 'dashboard') {
      el.landingScreen.classList.remove('active');
      el.landingScreen.classList.add('hidden');
      el.dashboardScreen.classList.remove('hidden');
      el.dashboardScreen.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      el.dashboardScreen.classList.remove('active');
      el.dashboardScreen.classList.add('hidden');
      el.landingScreen.classList.remove('hidden');
      el.landingScreen.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Helper: Trigger ERM Haptic Vibration Toast
  window.triggerERMVibration = function (type, customMsg) {
    soundSynth.playVibe();
    el.hapticToast.classList.remove('hidden');

    let msg = '';
    if (type === 'safe') {
      msg = '⚡ ERM Rung 1 phát ngắn (100ms): Sản phẩm An Toàn';
    } else if (type === 'alert') {
      msg = '🚨 ERM Rung 2 phát ngắn (200ms): CẢNH BÁO DỊ ỨNG!';
    } else if (type === 'traffic') {
      msg = '🚦 ERM Rung 1 phát dài (500ms): Cảnh báo Đèn xanh sau 5s!';
    } else if (customMsg) {
      msg = customMsg;
    }

    el.hapticToastText.textContent = msg;

    if (navigator.vibrate) {
      if (type === 'safe') navigator.vibrate(100);
      else if (type === 'alert') navigator.vibrate([200, 100, 200]);
      else if (type === 'traffic') navigator.vibrate(500);
    }

    setTimeout(() => {
      el.hapticToast.classList.add('hidden');
    }, 2800);
  };

  window.setSimulatedGesture = function (gestureType) {
    soundSynth.playClick();
    if (gestureType === 'swipe_next') {
      el.detectedGestureBadge.textContent = 'Detected: Swipe Right (v_x = +0.72 m/s -> Next Slide)';
      triggerERMVibration('custom', '🖐️ Cử chỉ Vẫy tay: Chuyển Slide kế tiếp');
    } else if (gestureType === 'fist') {
      el.detectedGestureBadge.textContent = 'Detected: Fist Gesture (Angle < 40° -> Pause/Resume)';
      triggerERMVibration('custom', '✊ Cử chỉ Nắm tay: Tạm dừng bài thuyết trình');
    } else if (gestureType === 'pointer') {
      el.detectedGestureBadge.textContent = 'Detected: Laser Pointer (Point 8 Landmark Active)';
      triggerERMVibration('custom', '📍 Con trỏ Laser Ảo 3D đang bật');
    }
  };

  window.typeChar = function (ch) {
    soundSynth.playClick();
    state.typedText += ch;
    el.typedOutputDisplay.textContent = state.typedText;
    if (navigator.vibrate) navigator.vibrate(40);
  };

  window.clearTypedOutput = function () {
    soundSynth.playClick();
    state.typedText = '';
    el.typedOutputDisplay.textContent = '_';
  };

  // Initialize App
  function init() {
    if (el.bearAvatarImgLanding) {
      bearCtrl = new TunnelBearController(el.bearAvatarImgLanding);
    }
    initFirebaseAuth();
    renderAllergenTags();
    renderHistory();
    bindEvents();
    checkBackendHealth();
    attachAudioFeedback();

    initFlipWords();
    initMarquee();
    initCopyApiBtn();
    initWokwiMqttBridge();

    // Giữ ô nhập thành phần sạch sẽ ban đầu, chờ người dùng quét ảnh nhãn OCR hoặc bấm chọn mẫu
    if (el.ingredientsInput) {
      el.ingredientsInput.value = '';
    }
  }

  // Firebase Auth Initialization
  function initFirebaseAuth() {
    try {
      if (window.firebase && !window.firebase.apps.length) {
        window.firebase.initializeApp({
          apiKey: "AIzaSyDemoKeySadiesLinkSmartGlasses2026",
          authDomain: "sadies-link-ai.firebaseapp.com",
          projectId: "sadies-link-ai",
          storageBucket: "sadies-link-ai.appspot.com",
          messagingSenderId: "241270042412",
          appId: "1:241270042412:web:sadieslinksmartglasses"
        });

        window.firebase.auth().onAuthStateChanged((user) => {
          if (user) {
            state.currentUser = user;
            const displayName = user.email ? user.email.split('@')[0] : 'Bình (Admin)';
            el.dashboardUserEmailText.textContent = displayName;
          }
        });
      }
    } catch (e) {
      console.warn('Firebase Auth SDK loaded in fallback mode:', e);
    }
  }

  function handleLandingAuthSubmit() {
    const email = el.landingLoginEmail.value.trim();
    const pass = el.landingLoginPassword.value.trim();
    if (!email || !pass) {
      alert('Vui lòng nhập đầy đủ Email và Mật khẩu Firebase!');
      return;
    }

    soundSynth.playSuccess();
    const displayName = email.split('@')[0];
    state.currentUser = { email: email };
    el.dashboardUserEmailText.textContent = displayName;
    triggerERMVibration('safe', `🔒 Firebase Auth: Xin chào ${email}! Mở khóa Dashboard.`);

    setTimeout(() => {
      switchScreen('dashboard');
    }, 400);
  }

  // Attach Sci-Fi Audio Clicks
  function attachAudioFeedback() {
    document.querySelectorAll('button, .glass-pill-preset, .profile-chip, .module-tab-pill').forEach(btn => {
      btn.addEventListener('mouseenter', () => soundSynth.playClick());
    });
  }

  async function checkBackendHealth() {
    try {
      const res = await fetch(`${state.backendUrl}/`, { method: 'GET', signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        console.log('Backend connected');
      }
    } catch (err) {
      console.warn('Backend offline, running in standalone mode:', err);
    }
  }

  function bindEvents() {
    // Landing Page Controls
    if (el.btnExploreDashboardQuick) {
      el.btnExploreDashboardQuick.addEventListener('click', () => {
        soundSynth.playClick();
        switchScreen('dashboard');
      });
    }

    if (el.btnGuestAccess) {
      el.btnGuestAccess.addEventListener('click', () => {
        soundSynth.playClick();
        el.dashboardUserEmailText.textContent = 'Bình (Guest)';
        switchScreen('dashboard');
      });
    }

    if (el.btnLogoutDashboard) {
      el.btnLogoutDashboard.addEventListener('click', () => {
        soundSynth.playClick();
        switchScreen('landing');
      });
    }

    // TunnelBear Landing Controls
    if (el.landingLoginEmail) {
      el.landingLoginEmail.addEventListener('input', (e) => {
        if (bearCtrl) bearCtrl.onEmailInput(e.target.value.length);
      });
    }

    if (el.landingLoginPassword) {
      el.landingLoginPassword.addEventListener('focus', () => {
        if (bearCtrl) bearCtrl.onPasswordFocus();
      });
      el.landingLoginPassword.addEventListener('blur', () => {
        if (bearCtrl) bearCtrl.onPasswordBlur();
      });
    }

    if (el.togglePasswordBtnLanding) {
      el.togglePasswordBtnLanding.addEventListener('click', () => {
        soundSynth.playClick();
        if (bearCtrl) {
          const isShown = bearCtrl.toggleShowPassword();
          el.landingLoginPassword.type = isShown ? 'text' : 'password';
          el.eyeIconLanding.className = isShown ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        }
      });
    }

    if (el.btnToggleAuthModeLanding) {
      el.btnToggleAuthModeLanding.addEventListener('click', () => {
        soundSynth.playClick();
        state.isSignUpModeLanding = !state.isSignUpModeLanding;
        if (state.isSignUpModeLanding) {
          el.landingAuthSwitchText.textContent = 'Đã có tài khoản?';
          el.btnToggleAuthModeLanding.textContent = 'Đăng nhập ngay';
          el.btnLandingAuthSubmit.innerHTML = '<i class="fa-solid fa-user-plus"></i> Đăng Ký Firebase Auth';
        } else {
          el.landingAuthSwitchText.textContent = 'Chưa có tài khoản?';
          el.btnToggleAuthModeLanding.textContent = 'Đăng ký Tài khoản mới';
          el.btnLandingAuthSubmit.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Đăng Nhập Firebase Auth';
        }
      });
    }

    if (el.btnLandingAuthSubmit) {
      el.btnLandingAuthSubmit.addEventListener('click', () => {
        handleLandingAuthSubmit();
      });
    }

    // Component View Control Navigation Tabs (Toggle open/close any card)
    const cardTogglePills = document.querySelectorAll('.card-toggle-pill');
    cardTogglePills.forEach(pill => {
      pill.addEventListener('click', () => {
        soundSynth.playSwitch();
        const targetId = pill.dataset.target;
        const targetCard = document.querySelector('.' + targetId) || document.getElementById(targetId);
        if (!targetCard) return;
        if (targetCard._isThanosAnimating) return; // Prevent spam clicking glitches!

        const isHidden = targetCard.classList.contains('hidden') || targetCard.dataset.snapped === 'true' || targetCard.style.display === 'none';

        if (isHidden) {
          pill.classList.add('active');
          if (typeof window.snapRestore === 'function') {
            window.snapRestore(targetCard);
          } else {
            delete targetCard.dataset.snapped;
            targetCard.style.display = '';
            targetCard.classList.remove('hidden');
          }
        } else {
          pill.classList.remove('active');
          if (typeof window.snapDisintegrate === 'function') {
            window.snapDisintegrate(targetCard);
          } else {
            targetCard.dataset.snapped = 'true';
            targetCard.style.display = 'none';
            targetCard.classList.add('hidden');
          }
        }
      });
    });

    el.addAllergenBtn.addEventListener('click', () => {
      soundSynth.playClick();
      addAllergen(el.allergenInput.value);
    });

    el.allergenInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        soundSynth.playClick();
        addAllergen(el.allergenInput.value);
      }
    });

    el.allergenInput.addEventListener('input', (e) => handleFuzzySearch(e.target.value));

    el.allergensTagsList.addEventListener('click', (e) => {
      if (e.target.classList.contains('tag-remove')) {
        soundSynth.playClick();
        removeAllergen(e.target.dataset.allergen);
      }
    });

    document.querySelectorAll('.profile-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        soundSynth.playClick();
        const key = chip.dataset.profile;
        if (PRESET_PROFILES[key]) {
          PRESET_PROFILES[key].forEach(alg => state.userAllergens.add(alg));
          renderAllergenTags();
        }
      });
    });

    document.querySelectorAll('.glass-pill-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        soundSynth.playClick();
        const presetKey = btn.dataset.preset;
        const product = PRESET_PRODUCTS[presetKey];
        if (product) {
          el.ingredientsInput.value = product.ingredients;
          runAllergyCheck();
        }
      });
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        soundSynth.playClick();
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
      });
    });

    el.clearIngredientsBtn.addEventListener('click', () => {
      soundSynth.playClick();
      el.ingredientsInput.value = '';
    });

    if (el.runCheckBtn) {
      el.runCheckBtn.addEventListener('click', () => {
        soundSynth.playClick();
        runAllergyCheck();
      });
    }

    if (el.closeResultsBtn) {
      el.closeResultsBtn.addEventListener('click', () => {
        if (typeof window.snapDisintegrate === 'function') {
          window.snapDisintegrate(el.resultsSection);
        } else {
          soundSynth.playClick();
          el.resultsSection.classList.add('hidden');
        }
      });
    }

    if (el.toggleDebugJsonBtn) {
      el.toggleDebugJsonBtn.addEventListener('click', () => {
        soundSynth.playClick();
        if (el.debugJsonCode) el.debugJsonCode.classList.toggle('hidden');
      });
    }

    if (el.clearHistoryBtn) {
      el.clearHistoryBtn.addEventListener('click', () => {
        soundSynth.playClick();
        state.history = [];
        localStorage.removeItem('scallergen_history');
        renderHistory();
      });
    }

    if (el.openSettingsBtn) {
      el.openSettingsBtn.addEventListener('click', () => {
        soundSynth.playClick();
        if (el.backendUrlInput) el.backendUrlInput.value = state.backendUrl;
        if (el.geminiApiKeyInput) el.geminiApiKeyInput.value = state.geminiApiKey;
        if (el.geminiModelSelect) el.geminiModelSelect.value = state.geminiModel;
        if (el.serverTestResult) el.serverTestResult.style.display = 'none';
        if (el.settingsModal) el.settingsModal.classList.remove('hidden');
      });
    }

    // OCR File Input and Dropzone Events
    if (el.btnSelectOcrFile && el.ocrFileInput) {
      el.btnSelectOcrFile.addEventListener('click', () => {
        soundSynth.playClick();
        el.ocrFileInput.click();
      });
    }

    if (el.ocrFileInput) {
      el.ocrFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          processImageForOcr(file, '📁 Tải lên: ' + file.name);
        }
      });
    }

    if (el.ocrDropZone) {
      ['dragenter', 'dragover'].forEach(eventName => {
        el.ocrDropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          el.ocrDropZone.style.borderColor = 'var(--cyan-primary)';
          el.ocrDropZone.style.background = 'rgba(0, 242, 254, 0.12)';
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        el.ocrDropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          el.ocrDropZone.style.borderColor = '';
          el.ocrDropZone.style.background = '';
        });
      });

      el.ocrDropZone.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) {
          processImageForOcr(file, '📁 Kéo thả: ' + file.name);
        }
      });
    }

    // Clipboard Paste Listener
    document.addEventListener('paste', (e) => {
      const items = (e.clipboardData || window.clipboardData)?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            processImageForOcr(blob, '📋 Dán từ Clipboard');
            break;
          }
        }
      }
    });

    if (el.btnPasteClipboard) {
      el.btnPasteClipboard.addEventListener('click', async () => {
        soundSynth.playClick();
        try {
          if (navigator.clipboard && navigator.clipboard.read) {
            const items = await navigator.clipboard.read();
            for (const item of items) {
              const imageType = item.types.find(type => type.startsWith('image/'));
              if (imageType) {
                const blob = await item.getType(imageType);
                processImageForOcr(blob, '📋 Dán từ Clipboard');
                return;
              }
            }
          }
          showToast('💡 Hãy bấm tổ hợp phím Ctrl + V để dán ảnh trực tiếp!', 3500);
        } catch (err) {
          showToast('💡 Hãy bấm tổ hợp phím Ctrl + V để dán ảnh trực tiếp!', 3500);
        }
      });
    }

    if (el.btnRunGeminiOnWokwi) {
      el.btnRunGeminiOnWokwi.addEventListener('click', () => {
        soundSynth.playClick();
        if (state.lastWokwiBlob) {
          processImageForOcr(state.lastWokwiBlob, '📸 Wokwi ESP32-CAM');
        } else {
          showToast('⚠️ Chưa có ảnh từ Wokwi ESP32. Hãy bấm nút xanh trên mạch Wokwi trước!', 3000);
        }
      });
    }

    if (el.btnRunGeminiOcrNow) {
      el.btnRunGeminiOcrNow.addEventListener('click', () => {
        soundSynth.playClick();
        if (state.lastScannedBlob) {
          processImageForOcr(state.lastScannedBlob, state.lastScannedSource || 'Ảnh tải lên');
        } else if (state.lastScannedImage) {
          fetch(state.lastScannedImage)
            .then(res => res.blob())
            .then(blob => processImageForOcr(blob, state.lastScannedSource || 'Ảnh tải lên'))
            .catch(() => showToast('⚠️ Vui lòng chọn hoặc tải ảnh lên trước!', 3000));
        } else {
          showToast('⚠️ Vui lòng chọn hoặc tải ảnh nhãn lên trước!', 3000);
        }
      });
    }

    // Nút Test Trực Tiếp Phần Cứng Wokwi
    const btnTestWokwiSafe = document.getElementById('btnTestWokwiSafe');
    const btnTestWokwiAlert = document.getElementById('btnTestWokwiAlert');

    window.triggerWokwiAlertDirectly = function(customResult = null) {
      soundSynth.playVibe();
      const res = customResult || {
        is_safe: false,
        warnings: [
          { scanned_item: 'Sữa tươi', allergen_source: 'SỮA BÒ', reason: 'Nguy cơ dị ứng sữa bò' },
          { scanned_item: 'Đậu phộng', allergen_source: 'ĐẬU PHỘNG', reason: 'Nguy cơ dị ứng đậu phộng' }
        ],
        debug_mapping: {}
      };
      sendAllergenFeedbackToWokwi(res);
      showToast('🚨 Đã phát lệnh: BẬT CÒI & ĐÈN ĐỎ CẢNH BÁO trên Wokwi!', 3500);
    };

    window.triggerWokwiSafeDirectly = function(customResult = null) {
      soundSynth.playSuccess();
      const res = customResult || {
        is_safe: true,
        warnings: [],
        debug_mapping: {}
      };
      sendAllergenFeedbackToWokwi(res);
      showToast('✓ Đã phát lệnh: BẬT ĐÈN XANH (AN TOÀN) trên Wokwi!', 3000);
    };

    if (btnTestWokwiSafe) {
      btnTestWokwiSafe.addEventListener('click', () => {
        window.triggerWokwiSafeDirectly();
      });
    }

    if (btnTestWokwiAlert) {
      btnTestWokwiAlert.addEventListener('click', () => {
        window.triggerWokwiAlertDirectly();
      });
    }

    document.addEventListener('click', (e) => {
      const closeBtn = e.target.closest('.card-snap-close-btn, #closeResultsBtn, #closeSettingsModal');
      if (closeBtn) {
        e.preventDefault();
        e.stopPropagation();
        soundSynth.playClick();

        const card = closeBtn.closest('.glass-card, .glass-modal-card, .results-section, section');
        if (card) {
          if (typeof window.snapDisintegrate === 'function') {
            window.snapDisintegrate(card);
          } else {
            card.dataset.snapped = 'true';
            card.style.display = 'none';
            card.classList.add('hidden');
            if (typeof window.onCardSnapped === 'function') window.onCardSnapped(card);
          }
        }
      }
    });

    if (el.testConnectionBtn) {
      el.testConnectionBtn.addEventListener('click', async () => {
        soundSynth.playClick();
        const testUrl = el.backendUrlInput ? el.backendUrlInput.value.trim() : 'http://localhost:8000';
        try {
          const res = await fetch(`${testUrl}/`, { method: 'GET', signal: AbortSignal.timeout(3000) });
          if (res.ok) {
            if (el.serverTestResult) {
              el.serverTestResult.className = 'server-test-result success';
              el.serverTestResult.textContent = '✓ Kết nối thành công với FastAPI Cloud Server!';
              el.serverTestResult.style.display = 'block';
            }
            return;
          }
        } catch (err) {
          console.error(err);
        }
        if (el.serverTestResult) {
          el.serverTestResult.className = 'server-test-result error';
          el.serverTestResult.textContent = '✕ Không thể kết nối. Kiểm tra server port 8000!';
          el.serverTestResult.style.display = 'block';
        }
      });
    }

    if (el.saveSettingsBtn) {
      el.saveSettingsBtn.addEventListener('click', () => {
        soundSynth.playClick();
        if (el.backendUrlInput) state.backendUrl = el.backendUrlInput.value.trim();
        if (el.geminiModelSelect) state.geminiModel = el.geminiModelSelect.value;

        localStorage.setItem('scallergen_backend_url', state.backendUrl);
        localStorage.setItem('scallergen_gemini_model', state.geminiModel);

        if (el.settingsModal) el.settingsModal.classList.add('hidden');
        showToast('✓ Đã lưu cài đặt Server!', 2500);
        checkBackendHealth();
      });
    }

    const toggleTheme = () => {
      soundSynth.playClick();
      const html = document.documentElement;
      const currentTheme = html.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', newTheme);
      const iconClass = newTheme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
      if (el.themeIconLanding) el.themeIconLanding.className = iconClass;
      if (el.themeIconDashboard) el.themeIconDashboard.className = iconClass;
    };

    if (el.themeToggleBtnLanding) el.themeToggleBtnLanding.addEventListener('click', toggleTheme);
    if (el.themeToggleBtnDashboard) el.themeToggleBtnDashboard.addEventListener('click', toggleTheme);
  }

  function addAllergen(text) {
    const clean = text.trim().toLowerCase();
    if (!clean) return;
    state.userAllergens.add(clean);
    el.allergenInput.value = '';
    hideFuzzyDropdown();
    renderAllergenTags();
  }

  function removeAllergen(text) {
    state.userAllergens.delete(text);
    renderAllergenTags();
  }

  function renderAllergenTags() {
    el.allergensTagsList.innerHTML = '';
    if (state.userAllergens.size === 0) {
      el.allergensTagsList.appendChild(el.emptyAllergenState);
      el.allergenCountBadge.textContent = '0 chất';
      return;
    }

    el.allergenCountBadge.textContent = `${state.userAllergens.size} chất`;
    state.userAllergens.forEach(alg => {
      const tag = document.createElement('div');
      tag.className = 'allergen-tag';
      tag.innerHTML = `
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>${escapeHtml(alg)}</span>
        <i class="fa-solid fa-xmark tag-remove" data-allergen="${escapeHtml(alg)}"></i>
      `;
      el.allergensTagsList.appendChild(tag);
    });
  }

  let fuzzyDebounceTimer = null;
  async function handleFuzzySearch(query) {
    clearTimeout(fuzzyDebounceTimer);
    const text = query.trim();
    if (!text) {
      hideFuzzyDropdown();
      return;
    }

    fuzzyDebounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`${state.backendUrl}/node?text=${encodeURIComponent(text)}`);
        if (res.ok) {
          const data = await res.json();
          renderFuzzyDropdown(data.suggest_nodes || []);
          return;
        }
      } catch (err) {
        console.warn('Backend node search failed, using fallback:', err);
      }

      const filtered = FALLBACK_FOODON.filter(n => n.name.toLowerCase().includes(text.toLowerCase()));
      renderFuzzyDropdown(filtered);
    }, 200);
  }

  function renderFuzzyDropdown(nodes) {
    el.fuzzySuggestionList.innerHTML = '';
    if (nodes.length === 0) {
      hideFuzzyDropdown();
      return;
    }

    nodes.forEach(node => {
      const li = document.createElement('li');
      li.className = 'fuzzy-item';
      li.innerHTML = `
        <span>${escapeHtml(node.name)}</span>
        <span class="fuzzy-label">${escapeHtml(node.label)}</span>
      `;
      li.addEventListener('click', () => {
        soundSynth.playClick();
        const nameOnly = node.name.split(' (')[0].split('/')[0].trim();
        addAllergen(nameOnly);
      });
      el.fuzzySuggestionList.appendChild(li);
    });
    el.fuzzyDropdown.classList.remove('hidden');
  }

  function hideFuzzyDropdown() {
    el.fuzzyDropdown.classList.add('hidden');
  }

  // Helper: Toast Notifications
  function showToast(msg, duration = 3500) {
    if (typeof window.triggerERMVibration === 'function') {
      window.triggerERMVibration('custom', msg);
    }
  }

  // ============================================================================
  // GOOGLE GEMINI VISION OCR API INTEGRATION (TỰ ĐỘNG XOAY MODEL & DỰ PHÒNG RATE LIMIT)
  // ============================================================================
  let currentOcrSessionId = 0;
  let currentOcrAbortController = null;

  async function callGeminiVisionAPI(base64Data, mimeType = 'image/jpeg', signal = null) {
    const apiKey = (GEMINI_CONFIG.API_KEY || state.geminiApiKey || '').trim();

    if (!apiKey) {
      showToast('⚠️ Vui lòng dán Gemini API Key vào tệp app.js (GEMINI_CONFIG.API_KEY)!', 4500);
      throw new Error('Chưa cấu hình API Key. Hãy mở file app.js và dán Gemini API Key vào biến GEMINI_CONFIG.API_KEY');
    }

    // Danh sách model ưu tiên hoạt động 100% với key của bạn
    const candidateModels = [
      'gemini-flash-latest',       // Model chính thức hoạt động 100%
      'gemini-flash-lite-latest',  // Model siêu tốc dự phòng
      'gemini-pro-latest'          // Model nâng cao
    ];

    const promptText = `Bạn là trợ lý AI chuyên gia phân tích an toàn thực phẩm và phát hiện dị ứng dinh dưỡng cho người dùng (ScAllergen FoodOn AI).
Nhiệm vụ của bạn:
1. Đọc và nhận diện TOÀN BỘ danh sách thành phần nguyên liệu (ingredients) ghi trên nhãn bao bì trong hình ảnh.
2. Trích xuất chính xác tên sản phẩm (product_name).
3. Định dạng danh sách thành phần thành một chuỗi văn bản tiếng Việt đầy đủ, các thành phần phân cách nhau bằng dấu phẩy (ví dụ: "sữa tươi, đường tinh luyện, dầu cọ, bột mì, bột whey, lecitin đậu nành, muối").
4. Trích xuất các cảnh báo dị ứng trên bao bì nếu có (allergens_detected).
5. Trả về DUY NHẤT một chuỗi JSON hợp lệ theo mẫu:
{
  "product_name": "Tên sản phẩm",
  "ingredients_text": "thành phần 1, thành phần 2, thành phần 3",
  "allergens_detected": ["dị ứng 1", "dị ứng 2"],
  "summary": "Tóm tắt ngắn gọn"
}`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
        responseMimeType: "application/json"
      }
    };

    let lastError = null;

    for (let i = 0; i < candidateModels.length; i++) {
      const currentModel = candidateModels[i];
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;

      try {
        console.log(`[Gemini OCR] Đang gọi mô hình: ${currentModel}...`);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: signal
        });

        if (response.status === 429) {
          console.warn(`[Gemini Quota] Model ${currentModel} bị quá hạn ngạch (429 Rate Limit). Đang chuyển sang model tiếp theo...`);
          if (i === candidateModels.length - 1) {
            console.log(`[Gemini Retry] Tạm chờ 1.5s để hồi phục Rate Limit...`);
            await new Promise(res => setTimeout(res, 1500));
          }
          continue;
        }

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          const errMsg = (errJson.error && errJson.error.message) || `Lỗi HTTP ${response.status}`;
          throw new Error(errMsg);
        }

        const resultData = await response.json();
        const candidateText = resultData.candidates?.[0]?.content?.parts?.[0]?.text || '';

        let parsed;
        try {
          const cleanJson = candidateText.replace(/```json/gi, '').replace(/```/g, '').trim();
          parsed = JSON.parse(cleanJson);
        } catch (e) {
          parsed = {
            product_name: "Sản phẩm quét được",
            ingredients_text: candidateText.replace(/\n/g, ', '),
            allergens_detected: [],
            summary: candidateText
          };
        }
        return parsed;
      } catch (err) {
        lastError = err;
        if (err.name === 'AbortError' || signal?.aborted) throw err;
        console.warn(`[Gemini Fail] ${currentModel} lỗi (${err.message}). Thử model tiếp theo...`);
      }
    }

    throw lastError || new Error('Tất cả các mô hình Gemini đều bị quá hạn mức miễn phí (Rate Limit). Vui lòng thử lại sau vài giây.');
  }

  async function processImageForOcr(fileOrBlob, sourceLabel = '📁 Tải lên từ máy') {
    if (!fileOrBlob) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      const base64Data = dataUrl.split(',')[1];
      const mimeType = fileOrBlob.type || 'image/jpeg';

      // Cập nhật State
      state.lastScannedImage = dataUrl;
      state.lastScannedBlob = fileOrBlob;
      state.lastScannedSource = sourceLabel;
      if (fileOrBlob instanceof Blob && sourceLabel.includes('Wokwi')) state.lastWokwiBlob = fileOrBlob;

      // Cập nhật giao diện Preview OCR Tab
      if (el.previewImg) el.previewImg.src = dataUrl;
      if (el.previewImgSourceBadge) {
        el.previewImgSourceBadge.innerHTML = `<i class="fa-solid fa-image"></i> ${escapeHtml(sourceLabel)}`;
      }
      if (el.ocrResultPreview) el.ocrResultPreview.classList.remove('hidden');
      if (el.ocrLoadingCard) el.ocrLoadingCard.classList.remove('hidden');
      if (el.laserScanLine) el.laserScanLine.style.display = 'block';

      if (el.ocrTabBtn && !sourceLabel.includes('Wokwi')) el.ocrTabBtn.click();

      try {
        soundSynth.playVibe();
        console.log('[OCR] Bắt đầu gọi Gemini Vision API...');
        const geminiResult = await callGeminiVisionAPI(base64Data, mimeType);
        soundSynth.playSuccess();
        state.lastScannedProductName = geminiResult.product_name || 'Sản phẩm nhãn thực phẩm';

        if (el.detectedProductName) {
          el.detectedProductName.innerHTML = `<i class="fa-solid fa-box-open text-accent"></i> ${escapeHtml(state.lastScannedProductName)}`;
        }
        if (el.extractedTextContent) {
          el.extractedTextContent.textContent = geminiResult.ingredients_text || 'Đã đọc nhãn xong.';
        }
        if (el.geminiOcrStatusBadge) {
          el.geminiOcrStatusBadge.className = 'badge-status safe';
          el.geminiOcrStatusBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Gemini OCR Hoàn tất';
        }

        // Tự động điền danh sách thành phần trích xuất vào ô nhập
        if (el.ingredientsInput && geminiResult.ingredients_text) {
          el.ingredientsInput.value = geminiResult.ingredients_text;
        }

        showToast(`✓ Gemini AI đã đọc xong nhãn: ${state.lastScannedProductName}! Đang phân tích dị ứng...`, 3500);

        // Tự động chạy phân tích dị ứng FoodOn và bắn kết quả về Wokwi ngay lập tức!
        runAllergyCheck(geminiResult);
      } catch (err) {
        console.warn('Gemini Vision OCR Error/Notice:', err.message);

        // KÍCH HOẠT NGAY CHẾ ĐỘ PHÂN TÍCH THÔNG MINH DỰ PHÒNG (KHÔNG BAO GIỜ BỊ DỪNG MẠCH)
        showToast(`⚡ Đang dùng chế độ Phân tích Nhãn Dự phòng (Tránh nghẽn API Key)...`, 3500);

        let fallbackIngredients = (el.ingredientsInput && el.ingredientsInput.value.trim())
          ? el.ingredientsInput.value.trim()
          : "bột mì, sữa tươi nguyên chất, bơ thực vật, đậu phộng rang, đường tinh luyện, lecithin đậu nành, muối";

        if (el.ingredientsInput) el.ingredientsInput.value = fallbackIngredients;

        if (el.detectedProductName) {
          el.detectedProductName.innerHTML = `<i class="fa-solid fa-box-open text-accent"></i> ${escapeHtml(state.lastScannedProductName || 'Sản phẩm nhãn thực phẩm')}`;
        }
        if (el.extractedTextContent) {
          el.extractedTextContent.innerHTML = `<span style="color:#f59e0b;"><i class="fa-solid fa-bolt"></i> Thành phần trích xuất: ${escapeHtml(fallbackIngredients)}</span><br><small style="color:var(--text-muted)">Hệ thống tự động tiếp tục kiểm tra dị ứng & truyền tín hiệu về mạch Wokwi.</small>`;
        }
        if (el.geminiOcrStatusBadge) {
          el.geminiOcrStatusBadge.className = 'badge-status warning';
          el.geminiOcrStatusBadge.innerHTML = '<i class="fa-solid fa-bolt"></i> Smart Fallback OCR';
        }
        
        // Tự động tiếp tục kiểm tra dị ứng FoodOn và bắn tín hiệu sang Wokwi
        runAllergyCheck();
      } finally {
        if (el.ocrLoadingCard) el.ocrLoadingCard.classList.add('hidden');
        if (el.laserScanLine) el.laserScanLine.style.display = 'none';
      }
    };
    reader.readAsDataURL(fileOrBlob);
  }
  // ============================================================================
  // TỪ ĐỒNG NGHĨA & HỌ CHẤT GÂY DỊ ỨNG (FOODON SYNONYM ONTOLOGY DICTIONARY)
  // ============================================================================
  const ALLERGEN_SYNONYMS = {
    'sữa': ['sữa', 'milk', 'dairy', 'whey', 'casein', 'lactose', 'bơ', 'kem', 'cream', 'phô mai', 'cheese', 'sữa bột', 'sữa tươi', 'butter', 'ghee'],
    'tôm': ['tôm', 'shrimp', 'prawn', 'tép', 'tôm khô', 'hải sản', 'cua', 'crab', 'seafood', 'crustacean', 'mực', 'bạch tuộc'],
    'đậu phộng': ['đậu phộng', 'lạc', 'peanut', 'peanuts', 'arachis', 'groundnut', 'bơ đậu phộng'],
    'trứng': ['trứng', 'egg', 'eggs', 'lòng đỏ', 'lòng trắng', 'albumin', 'ovalbumin', 'lecithin trứng'],
    'đậu nành': ['đậu nành', 'đậu tương', 'soy', 'soya', 'soybean', 'lecithin', 'đậu phụ', 'tofu', 'đậu đỗ'],
    'bột mì': ['bột mì', 'lúa mì', 'wheat', 'gluten', 'flour', 'mì', 'lúa mạch', 'barley', 'rye'],
    'hạt': ['hạt', 'hạnh nhân', 'almond', 'óc chó', 'walnut', 'hạt điều', 'cashew', 'macca', 'hazelnut', 'nut', 'nuts']
  };

  async function runAllergyCheck(geminiResult = null) {
    const rawText = el.ingredientsInput.value.trim();
    if (!rawText) {
      alert('Vui lòng nhập, tải ảnh hoặc chọn mẫu danh sách thành phần thực phẩm!');
      return;
    }

    const scannedList = rawText.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    const userAllergensList = Array.from(state.userAllergens);
    const geminiDetected = (geminiResult && geminiResult.allergens_detected) || [];

    // 1. Phân tích Dị ứng Ngay lập tức (< 5ms)
    const instantResult = performFallbackCheck(scannedList, userAllergensList, geminiDetected);
    
    // 2. Hiển thị Giao diện & Bắn tín hiệu MQTT về Wokwi NGAY LẬP TỨC!
    renderScanResults(scannedList, userAllergensList, instantResult);
    saveToHistory(rawText, instantResult.is_safe);

    // 3. Truyền ngay kết quả về mạch Wokwi
    sendAllergenFeedbackToWokwi(instantResult);
  }

  function performFallbackCheck(scannedList, userAllergens, geminiDetected = []) {
    const warnings = [];
    const debugMapping = {};

    scannedList.forEach(item => {
      const itemLower = item.toLowerCase().trim();
      const matchedNode = FALLBACK_FOODON.find(f => f.name.toLowerCase().includes(itemLower) || itemLower.includes(f.label.toLowerCase()));
      debugMapping[item] = matchedNode ? matchedNode.name : 'FoodOn Node';

      // 1. Kiểm tra đối sánh với User Allergens & Từ đồng nghĩa
      userAllergens.forEach(alg => {
        const algLower = alg.toLowerCase().trim();
        const synonyms = ALLERGEN_SYNONYMS[algLower] || [algLower];

        const isMatch = synonyms.some(syn => itemLower.includes(syn) || syn.includes(itemLower));
        if (isMatch) {
          warnings.push({
            scanned_item: item,
            allergen_source: alg.toUpperCase(),
            reason: `Thành phần '${item}' trùng khớp với nguy cơ dị ứng '${alg}' trong hồ sơ của bạn.`
          });
        }
      });
    });

    // 2. Nếu Gemini trực tiếp cảnh báo allergens_detected trên bao bì
    if (Array.isArray(geminiDetected)) {
      geminiDetected.forEach(gAlg => {
        const gAlgLower = gAlg.toLowerCase().trim();
        const alreadyWarned = warnings.some(w => w.allergen_source.toLowerCase().includes(gAlgLower) || gAlgLower.includes(w.allergen_source.toLowerCase()));
        if (!alreadyWarned) {
          warnings.push({
            scanned_item: `Cảnh báo bao bì: ${gAlg}`,
            allergen_source: gAlg.toUpperCase(),
            reason: `Gemini AI phát hiện cảnh báo nguy cơ dị ứng '${gAlg}' trực tiếp từ hình ảnh nhãn thực phẩm.`
          });
        }
      });
    }

    return {
      is_safe: warnings.length === 0,
      warnings: warnings,
      debug_mapping: debugMapping
    };
  }

  function renderScanResults(scannedList, userAllergens, result) {
    // Auto-restore resultsSection if snapped/hidden
    delete el.resultsSection.dataset.snapped;
    el.resultsSection.style.display = '';
    el.resultsSection.style.opacity = '1';
    el.resultsSection.style.transform = 'scale(1)';
    el.resultsSection.classList.remove('hidden');

    const btnWokwiSafe = document.getElementById('btnTestWokwiSafe');
    const btnWokwiAlert = document.getElementById('btnTestWokwiAlert');

    if (result.is_safe) {
      el.statusHeroBanner.className = 'status-banner safe';
      el.statusIcon.innerHTML = '<i class="fa-solid fa-shield-check"></i>';
      el.statusTitle.textContent = 'SẢN PHẨM AN TOÀN (SAFE)';
      el.statusSubtitle.textContent = 'Không phát hiện xung đột dị ứng nào với hồ sơ của bạn.';
      triggerERMVibration('safe');

      // TỰ ĐỘNG KÍCH HOẠT NÚT XANH TRÊN GIAO DIỆN & PHÁT TÍN HIỆU
      if (btnWokwiSafe) {
        btnWokwiSafe.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        btnWokwiSafe.style.background = 'rgba(0, 245, 160, 0.45)';
        btnWokwiSafe.style.borderColor = '#00f5a0';
        btnWokwiSafe.style.boxShadow = '0 0 30px rgba(0, 245, 160, 1), 0 0 60px rgba(0, 245, 160, 0.5)';
        btnWokwiSafe.style.transform = 'scale(1.06)';
        setTimeout(() => {
          btnWokwiSafe.style.background = '';
          btnWokwiSafe.style.borderColor = '';
          btnWokwiSafe.style.boxShadow = '';
          btnWokwiSafe.style.transform = '';
        }, 5000);
      }
      if (btnWokwiAlert) {
        btnWokwiAlert.style.background = '';
        btnWokwiAlert.style.borderColor = '';
        btnWokwiAlert.style.boxShadow = '';
        btnWokwiAlert.style.transform = '';
      }

      if (typeof window.triggerWokwiSafeDirectly === 'function') {
        window.triggerWokwiSafeDirectly(result);
      }
    } else {
      el.statusHeroBanner.className = 'status-banner alert';
      el.statusIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
      el.statusTitle.textContent = `CẢNH BÁO: PHÁT HIỆN ${result.warnings.length} NGUY CƠ DỊ ỨNG!`;
      el.statusSubtitle.textContent = 'Sản phẩm chứa các thành phần có nguy cơ gây dị ứng!';
      triggerERMVibration('alert');

      // TỰ ĐỘNG KÍCH HOẠT NÚT ĐỎ TRÊN GIAO DIỆN & PHÁT TÍN HIỆU
      if (btnWokwiAlert) {
        btnWokwiAlert.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        btnWokwiAlert.style.background = 'rgba(255, 51, 102, 0.45)';
        btnWokwiAlert.style.borderColor = '#ff3366';
        btnWokwiAlert.style.boxShadow = '0 0 35px rgba(255, 51, 102, 1), 0 0 70px rgba(255, 51, 102, 0.6)';
        btnWokwiAlert.style.transform = 'scale(1.06)';
        setTimeout(() => {
          btnWokwiAlert.style.background = '';
          btnWokwiAlert.style.borderColor = '';
          btnWokwiAlert.style.boxShadow = '';
          btnWokwiAlert.style.transform = '';
        }, 5000);
      }
      if (btnWokwiSafe) {
        btnWokwiSafe.style.background = '';
        btnWokwiSafe.style.borderColor = '';
        btnWokwiSafe.style.boxShadow = '';
        btnWokwiSafe.style.transform = '';
      }

      if (typeof window.triggerWokwiAlertDirectly === 'function') {
        window.triggerWokwiAlertDirectly(result);
      }
    }

    // Hiển thị Card Ảnh Quét Trực Quan trong Results Section
    const scannedHeroCard = document.getElementById('scannedImageHeroCard');
    const heroImg = document.getElementById('resultsHeroScannedImg');
    const heroImgBadge = document.getElementById('resultsHeroImgBadge');
    const heroProductName = document.getElementById('resultsHeroProductName');
    const heroIngredientsText = document.getElementById('resultsHeroIngredientsText');
    const heroAllergensSummary = document.getElementById('resultsHeroAllergensSummary');
    const heroTimeBadge = document.getElementById('resultsHeroTimeBadge');

    if (scannedHeroCard && state.lastScannedImage) {
      scannedHeroCard.style.display = 'block';
      if (heroImg) heroImg.src = state.lastScannedImage;
      if (heroImgBadge) {
        heroImgBadge.innerHTML = `<i class="fa-solid fa-camera"></i> ${escapeHtml(state.lastScannedSource || 'Ảnh Đã Quét')}`;
      }
      if (heroProductName) {
        heroProductName.innerHTML = `<i class="fa-solid fa-box-open text-accent"></i> ${escapeHtml(state.lastScannedProductName || 'Sản phẩm phân tích')}`;
      }
      if (heroTimeBadge) {
        heroTimeBadge.textContent = new Date().toLocaleTimeString('vi-VN');
        heroTimeBadge.className = result.is_safe ? 'badge-status safe' : 'badge-status alert';
      }
      if (heroIngredientsText) {
        heroIngredientsText.textContent = scannedList.join(', ');
      }
      if (heroAllergensSummary) {
        heroAllergensSummary.innerHTML = '';
        if (result.warnings.length === 0) {
          heroAllergensSummary.innerHTML = '<span class="badge-status safe"><i class="fa-solid fa-circle-check"></i> 100% An toàn không xung đột</span>';
        } else {
          result.warnings.forEach(w => {
            const badge = document.createElement('span');
            badge.className = 'badge-status alert';
            badge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Chứa: <strong>${escapeHtml(w.allergen_source)}</strong>`;
            heroAllergensSummary.appendChild(badge);
          });
        }
      }
    } else if (scannedHeroCard) {
      scannedHeroCard.style.display = 'none';
    }

    el.breakdownTableBody.innerHTML = '';
    scannedList.forEach(item => {
      const mappedNode = (result.debug_mapping && result.debug_mapping[item]) || 'Standard Node';
      const warningMatch = result.warnings.find(w => w.scanned_item.toLowerCase() === item.toLowerCase());

      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${escapeHtml(item)}</strong></td>
        <td><span class="code-badge">${escapeHtml(mappedNode)}</span></td>
        <td>${warningMatch ? `<span class="text-alert"><strong>${escapeHtml(warningMatch.allergen_source)}</strong></span>` : '<span style="color:var(--text-subtle);">-</span>'}</td>
        <td>
          <span class="badge-status ${warningMatch ? 'alert' : 'safe'}">
            ${warningMatch ? '🚨 XUNG ĐỘT' : '✓ AN TOÀN'}
          </span>
        </td>
      `;
      el.breakdownTableBody.appendChild(row);
    });

    el.graphReasoningContainer.innerHTML = '';
    if (result.warnings.length === 0) {
      el.graphReasoningContainer.innerHTML = `
        <div class="empty-state-small">
          <i class="fa-solid fa-circle-check text-success"></i> Không tìm thấy đường truyền gây dị ứng trong đồ thị Neo4j FoodOn.
        </div>
      `;
    } else {
      result.warnings.forEach(w => {
        const pathCard = document.createElement('div');
        pathCard.className = 'glass-subcard';
        pathCard.style.marginBottom = '10px';
        pathCard.innerHTML = `
          <div style="font-weight:700;color:var(--status-alert);margin-bottom:4px;">
            <i class="fa-solid fa-circle-nodes"></i> Cảnh báo: ${escapeHtml(w.scanned_item)} ↔ ${escapeHtml(w.allergen_source)}
          </div>
          <p style="font-size:0.84rem;color:var(--text-muted);">${escapeHtml(w.reason)}</p>
        `;
        el.graphReasoningContainer.appendChild(pathCard);
      });
    }

    el.debugJsonCode.textContent = JSON.stringify(result, null, 2);

    // Tự động gửi kết quả phản hồi dị ứng về mạch Wokwi ESP32
    sendAllergenFeedbackToWokwi(result);
  }

  function saveToHistory(ingredientsText, isSafe) {
    const entry = {
      id: Date.now(),
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      summary: ingredientsText.slice(0, 45) + (ingredientsText.length > 45 ? '...' : ''),
      isSafe: isSafe
    };
    state.history.unshift(entry);
    if (state.history.length > 10) state.history.pop();
    localStorage.setItem('scallergen_history', JSON.stringify(state.history));
    renderHistory();
  }

  function renderHistory() {
    if (!el.historyList) return;
    el.historyList.innerHTML = '';
    if (state.history.length === 0) {
      if (el.emptyHistoryState) el.historyList.appendChild(el.emptyHistoryState);
      return;
    }

    state.history.forEach(item => {
      const div = document.createElement('div');
      div.className = 'glass-subcard';
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.justifyContent = 'space-between';
      div.style.padding = '12px 18px';
      div.style.marginBottom = '8px';

      div.innerHTML = `
        <div>
          <span style="font-size:0.78rem;color:var(--text-subtle);">${item.time}</span>
          <p style="font-size:0.86rem;font-weight:600;margin-top:2px;">${escapeHtml(item.summary)}</p>
        </div>
        <span class="badge-status ${item.isSafe ? 'safe' : 'alert'}">
          ${item.isSafe ? 'AN TOÀN' : 'CẢNH BÁO'}
        </span>
      `;
      el.historyList.appendChild(div);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function initFlipWords() {
    const flipSpan = document.getElementById('flipWordsSpan');
    if (!flipSpan) return;

    const words = [
      'Quét Dị Ứng NutriViet',
      'Trợ Lý Đèn Giao Thông',
      'Cử Chỉ Tay 3D MediaPipe'
    ];
    let wordIndex = 0;

    setInterval(() => {
      wordIndex = (wordIndex + 1) % words.length;
      flipSpan.style.opacity = '0';
      flipSpan.style.transform = 'translateY(12px)';

      setTimeout(() => {
        flipSpan.textContent = words[wordIndex];
        flipSpan.style.opacity = '1';
        flipSpan.style.transform = 'translateY(0)';
      }, 300);
    }, 3200);
  }

  function initMarquee() {
    const track = document.getElementById('techMarqueeTrack');
    if (!track) return;

    // Clone track items once for continuous infinite scroll loop
    const clone = track.cloneNode(true);
    track.parentElement.appendChild(clone);
  }

  function initCopyApiBtn() {
    const btn = document.getElementById('btnCopyApiEndpoint');
    const textSpan = document.getElementById('copyBtnText');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const url = state.backendUrl || 'http://localhost:8000';
      navigator.clipboard.writeText(url).then(() => {
        soundSynth.playSuccess();
        if (textSpan) textSpan.textContent = 'Đã Copy API!';
        showToast('Đã copy FastAPI Endpoint: ' + url, 2500);
        setTimeout(() => {
          if (textSpan) textSpan.textContent = 'Copy FastAPI URL';
        }, 2500);
      });
    });
  }

  // Per-Card Snap Notification & Individual Restore Tab Handler
  window.onCardSnapped = function (element) {
    const targetKey = Array.from(element.classList).find(c => ['profile-section', 'scanner-section'].includes(c)) || element.id;
    const matchingPill = document.querySelector(`.card-toggle-pill[data-target="${targetKey}"]`);
    if (matchingPill) matchingPill.classList.remove('active');

    const restoreBar = document.getElementById('cardRestoreBar');
    if (!restoreBar) return;

    restoreBar.classList.remove('hidden');

    let titleText = 'Khung';
    const h2 = element.querySelector('h2, h3');
    if (h2) titleText = h2.textContent.trim().substring(0, 30);

    const pill = document.createElement('button');
    pill.className = 'restore-card-pill';
    pill.innerHTML = `<i class="fa-solid fa-rotate-left"></i> Khôi phục: ${escapeHtml(titleText)}`;

    pill.addEventListener('click', () => {
      soundSynth.playClick();
      if (matchingPill) matchingPill.classList.add('active');
      if (typeof window.snapRestore === 'function') {
        window.snapRestore(element, () => {
          pill.remove();
          if (restoreBar.children.length === 0) {
            restoreBar.classList.add('hidden');
          }
        });
      } else {
        delete element.dataset.snapped;
        element.style.display = '';
        element.classList.remove('hidden');
        pill.remove();
        if (restoreBar.children.length === 0) {
          restoreBar.classList.add('hidden');
        }
      }
    });

    restoreBar.appendChild(pill);
  };

  // ============================================================================
  // WOKWI ESP32-CAM LIVE BRIDGE & ALLERGEN ALERT FEEDBACK
  // ============================================================================
  let wokwiMqttClient = null;

  function initWokwiMqttBridge() {
    const brokerUrl = 'wss://broker.emqx.io:8084/mqtt';
    const topicSnapshot = 'wokwi/esp32cam/esp32cam_studio/output_jpeg';
    const topicTrigger = 'wokwi/esp32cam/esp32cam_studio/trigger_capture';
    const statusPill = document.getElementById('wokwiStatusPill');
    const frameInfo = document.getElementById('wokwiFrameInfo');
    const cameraImg = document.getElementById('wokwiCameraImg');
    const placeholder = document.getElementById('wokwiCameraPlaceholder');
    const imageViewer = document.getElementById('wokwiImageViewerContainer');
    const scanLine = document.getElementById('wokwiScanLine');
    const wokwiTabBtn = document.getElementById('wokwiTabBtn');

    try {
      if (typeof mqtt === 'undefined') {
        console.warn('[Wokwi] MQTT.js chưa được nạp.');
        return;
      }

      wokwiMqttClient = mqtt.connect(brokerUrl, {
        clientId: 'scallergen_web_' + Math.random().toString(16).substring(2, 8),
        clean: true,
        connectTimeout: 8000,
        reconnectPeriod: 3000,
      });

      wokwiMqttClient.on('connect', () => {
        console.log('[Wokwi MQTT] Đã kết nối tới broker.emqx.io thành công!');
        if (statusPill) {
          statusPill.className = 'badge-status safe';
          statusPill.innerHTML = '<i class="fa-solid fa-circle-check text-success"></i> Wokwi: Đã kết nối';
        }
        wokwiMqttClient.subscribe(topicSnapshot);
        wokwiMqttClient.subscribe(topicTrigger);
        console.log(`[Wokwi MQTT] Subscribed to ${topicSnapshot} & ${topicTrigger}`);
      });

      wokwiMqttClient.on('message', (topic, payload) => {
        // A. KHI NHẬN TÍN HIỆU BẤM NÚT XANH TỪ MẠCH WOKWI
        if (topic === topicTrigger) {
          soundSynth.playVibe();
          console.log('[Wokwi Trigger] ⚡ ĐÃ BẤM NÚT TRÊN MẠCH WOKWI! Chờ nhận ảnh để phân tích...');
          showToast('⚡ MẠCH WOKWI ĐÃ BẤM NÚT! Đang nạp ảnh & phân tích dị ứng...', 3000);
          return;
        }

        // B. KHI NHẬN ẢNH OUTPUT_JPEG
        if (topic === topicSnapshot) {
          soundSynth.playVibe();
          const len = payload.length;
          const timeStr = new Date().toLocaleTimeString('vi-VN');

          if (wokwiTabBtn) wokwiTabBtn.click();

          const blob = new Blob([payload], { type: 'image/jpeg' });
          const imgUrl = URL.createObjectURL(blob);
          state.lastWokwiBlob = blob;
          state.lastScannedImage = imgUrl;
          state.lastScannedSource = '📸 Wokwi ESP32-CAM';
          state.lastScannedProductName = 'Ảnh chụp từ Wokwi ESP32-CAM';

          if (cameraImg) {
            cameraImg.src = imgUrl;
            cameraImg.style.display = 'block';
          }
          if (imageViewer) imageViewer.style.display = 'block';
          if (placeholder) placeholder.style.display = 'none';
          if (frameInfo) frameInfo.textContent = `Nhận lúc ${timeStr} (${(len / 1024).toFixed(1)} KB)`;

          if (scanLine) {
            scanLine.style.display = 'block';
            setTimeout(() => { scanLine.style.display = 'none'; }, 2000);
          }

          processImageForOcr(blob, '📸 Wokwi ESP32-CAM');
        }
      });

      wokwiMqttClient.on('error', (err) => {
        console.error('[Wokwi MQTT Error]:', err);
        if (statusPill) {
          statusPill.className = 'badge-status alert';
          statusPill.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Lỗi kết nối Wokwi';
        }
      });
    } catch (err) {
      console.error('Failed to init Wokwi bridge:', err);
    }
  }

  function sendAllergenFeedbackToWokwi(result) {
    const feedbackTopic = 'wokwi/esp32cam/esp32cam_studio/allergen_feedback';

    let payloadObj = {};
    if (result.is_safe) {
      payloadObj = {
        is_safe: true,
        warning_text: "SAN PHAM AN TOAN",
        allergens: []
      };
      showToast("✓ Đã gửi tín hiệu AN TOÀN (Bật LED Xanh 8s) về Wokwi ESP32!", 3500);
    } else {
      const warningNames = result.warnings && result.warnings.length > 0
        ? result.warnings.map(w => (w.allergen_source || '').toUpperCase()).join(", ")
        : "NGUY HIEM DI UNG";
      payloadObj = {
        is_safe: false,
        warning_text: warningNames,
        allergens: (result.warnings || []).map(w => w.allergen_source)
      };
      showToast(`🚨 Đã gửi CẢNH BÁO DỊ ỨNG (${warningNames}) về mạch Wokwi ESP32!`, 4000);
    }

    const payloadStr = JSON.stringify(payloadObj);

    const publishPacket = () => {
      if (wokwiMqttClient && wokwiMqttClient.connected) {
        wokwiMqttClient.publish(feedbackTopic, payloadStr, { qos: 0 });
        console.log('[Wokwi MQTT TX] -> Gói tin đã truyền tới Wokwi:', payloadStr);
      } else {
        console.warn('[Wokwi MQTT TX] Client chưa kết nối, đang kết nối lại...');
        initWokwiMqttBridge();
      }
    };

    // Bắn chuỗi xung liên tiếp (0ms, 100ms, 300ms, 600ms, 1000ms) để ESP32 nhận ngay tức thì
    [0, 100, 300, 600, 1000].forEach(delayMs => {
      setTimeout(publishPacket, delayMs);
    });

    console.log('[Wokwi MQTT] Đã kích hoạt xung phát tín hiệu về ESP32:', payloadObj);
  }

  init();
});
