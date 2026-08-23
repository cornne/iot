// CẤU HÌNH HỆ THỐNG & BIẾN TOÀN CỤC
  // 🔑 CẤU HÌNH BẢO MẬT: GOOGLE GEMINI API KEY NỘI BỘ (CODE-ONLY)
  // ============================================================================
  // Khóa API sẽ được xử lý ngầm, hoàn toàn KHÔNG hiển thị trên giao diện Web!
  const GEMINI_CONFIG = {
    API_KEY: '',
    MODEL: "gemini-flash-latest", // Endpoint chính thức hoạt động 100%
  };

  // Application State
  let initialHistory = [];
  try { 
    initialHistory = JSON.parse(localStorage.getItem('scallergen_history') || '[]'); 
    if (!Array.isArray(initialHistory)) initialHistory = [];
  } catch(e) {}

  const state = {
    userAllergens: new Set(),
    backendUrl: localStorage.getItem('scallergen_backend_url') || 'http://localhost:8000',
    geminiApiKey: localStorage.getItem('scallergen_gemini_api_key') || '',
    geminiModel: localStorage.getItem('scallergen_gemini_model') || 'gemini-flash-latest',
    lastScannedImage: null,
    lastScannedBlob: null,
    lastScannedSource: null,
    lastScannedProductName: null,
    fuzzyWeight: 0.5,
    history: initialHistory,
    trafficTimer: 14,
    trafficInterval: null,
    typedText: "SADIE'S LINK SMART GLASSES_",
    currentUser: null,
    isSignUpModeLanding: false,
    showPasswordLanding: false,
    isScanning: false
  };

  // Dọn dẹp cache cũ nếu có
  try {
    localStorage.removeItem('scallergen_gemini_model');
    localStorage.removeItem('scallergen_gemini_api_key');
  } catch (e) { }

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

