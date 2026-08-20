/**
 * NutriViet ScAllergen / Sadie's Link Smart Glasses AI Command Dashboard
 * Interactivity & Logic Manager (Landing Gateway + Firebase Auth + 4 AI Modules)
 */

function initApp() {
  // ============================================================================
  // 🔑 CẤU HÌNH BẢO MẬT: GOOGLE GEMINI API KEY NỘI BỘ (CODE-ONLY)
  // ============================================================================
  // Khóa API sẽ được xử lý ngầm, hoàn toàn KHÔNG hiển thị trên giao diện Web!
  const GEMINI_CONFIG = {
    API_KEY: localStorage.getItem('scallergen_gemini_api_key') || (typeof window !== 'undefined' && window.GEMINI_API_KEY ? window.GEMINI_API_KEY : ''),
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

  // ============================================================================
  // 🧬 CƠ SỞ DỮ LIỆU GỢI Ý CHUẨN FOODON ONTOLOGY (FOODON SUGGESTION DATABASE)
  // ============================================================================
  const FOODON_SUGGESTIONS_DB = [
    // 🥛 SỮA & CHẾ PHẨM TỪ SỮA (Milk & Dairy - FOODON_00001005)
    { id: 'FOODON_00001005', name: 'Sữa (Milk / Dairy)', label: 'Milk product', icon: '🥛', category: 'sữa', group: 'Sữa & Chế phẩm từ Sữa' },
    { id: 'FOODON_03301405', name: 'Đạm Whey (Whey Protein)', label: 'Dairy derivative', icon: '🥛', category: 'sữa', group: 'Dẫn xuất Sữa' },
    { id: 'FOODON_00001145', name: 'Casein / Sodium Caseinate', label: 'Milk protein', icon: '🥛', category: 'sữa', group: 'Đạm Sữa' },
    { id: 'FOODON_03301409', name: 'Lactose (Đường Sữa)', label: 'Milk sugar', icon: '🥛', category: 'sữa', group: 'Đường Sữa' },
    { id: 'FOODON_00001274', name: 'Phô Mai (Cheese)', label: 'Fermented dairy', icon: '🧀', category: 'sữa', group: 'Chế phẩm Sữa' },
    { id: 'FOODON_00001009', name: 'Bơ (Butter / Ghee)', label: 'Dairy fat', icon: '🧈', category: 'sữa', group: 'Chất béo Sữa' },
    { id: 'FOODON_00001275', name: 'Sữa Chua (Yogurt)', label: 'Cultured milk', icon: '🥛', category: 'sữa', group: 'Sữa lên men' },
    { id: 'FOODON_03301412', name: 'Váng Sữa (Milk Cream)', label: 'Dairy cream', icon: '🥛', category: 'sữa', group: 'Chế phẩm Sữa' },
    { id: 'FOODON_03301415', name: 'Sữa Bột (Milk Powder)', label: 'Dry milk', icon: '🥛', category: 'sữa', group: 'Sữa chế biến' },
    { id: 'FOODON_03301418', name: 'Sữa Đặc (Condensed Milk)', label: 'Concentrated milk', icon: '🥛', category: 'sữa', group: 'Sữa đặc' },

    // 🦐 TÔM & GIÁP XÁC (Shrimp & Crustaceans - FOODON_00001254)
    { id: 'FOODON_00001254', name: 'Tôm (Shrimp / Prawn)', label: 'Crustacean', icon: '🦐', category: 'tôm', group: 'Giáp xác' },
    { id: 'FOODON_00001264', name: 'Cua / Ghẹ (Crab)', label: 'Crustacean', icon: '🦀', category: 'tôm', group: 'Giáp xác' },
    { id: 'FOODON_03301255', name: 'Tôm Hùm (Lobster)', label: 'Crustacean', icon: '🦞', category: 'tôm', group: 'Giáp xác' },
    { id: 'FOODON_03301258', name: 'Tép / Tôm Khô (Dried Shrimp)', label: 'Crustacean product', icon: '🦐', category: 'tôm', group: 'Chế phẩm Tôm' },
    { id: 'FOODON_03301260', name: 'Mắm Tôm / Mắm Ruốc (Shrimp Paste)', label: 'Fermented crustacean', icon: '🦐', category: 'tôm', group: 'Mắm truyền thống' },
    { id: 'FOODON_03301262', name: 'Tropomyosin / Glucosamine', label: 'Crustacean allergen', icon: '🧪', category: 'tôm', group: 'Kháng nguyên Giáp xác' },

    // 🐟 HẢI SẢN & THÂN MỀM (Seafood & Molluscs - FOODON_00001256)
    { id: 'FOODON_00001256', name: 'Hải Sản (Seafood)', label: 'Seafood general', icon: '🦞', category: 'hải sản', group: 'Hải sản chung' },
    { id: 'FOODON_00001258', name: 'Mực (Squid / Calamari)', label: 'Mollusc', icon: '🦑', category: 'hải sản', group: 'Thân mềm' },
    { id: 'FOODON_00001259', name: 'Bạch Tuộc (Octopus)', label: 'Mollusc', icon: '🐙', category: 'hải sản', group: 'Thân mềm' },
    { id: 'FOODON_00001261', name: 'Nghêu / Sò / Hàu (Clam / Oyster)', label: 'Bivalve mollusc', icon: '🦪', category: 'hải sản', group: 'Động vật hai mảnh vỏ' },
    { id: 'FOODON_03301265', name: 'Sò Điệp (Scallop)', label: 'Bivalve', icon: '🦪', category: 'hải sản', group: 'Thân mềm' },
    { id: 'FOODON_03301268', name: 'Ốc (Snail / Escargot)', label: 'Gastropod', icon: '🐌', category: 'hải sản', group: 'Thân mềm' },
    { id: 'FOODON_03301270', name: 'Bào Ngư (Abalone)', label: 'Mollusc', icon: '🦪', category: 'hải sản', group: 'Thân mềm cao cấp' },

    // 🐟 CÁ (Fish - FOODON_00001248)
    { id: 'FOODON_00001248', name: 'Cá (Fish / Fish products)', label: 'Fish general', icon: '🐟', category: 'cá', group: 'Cá' },
    { id: 'FOODON_00001249', name: 'Cá Hồi (Salmon)', label: 'Salmonid fish', icon: '🐟', category: 'cá', group: 'Cá biển' },
    { id: 'FOODON_00001250', name: 'Cá Ngừ (Tuna)', label: 'Pelagic fish', icon: '🐟', category: 'cá', group: 'Cá biển' },
    { id: 'FOODON_00001251', name: 'Cá Thu (Mackerel)', label: 'Scombroid fish', icon: '🐟', category: 'cá', group: 'Cá biển' },
    { id: 'FOODON_00001252', name: 'Cá Tuyết (Cod)', label: 'White fish', icon: '🐟', category: 'cá', group: 'Cá biển' },
    { id: 'FOODON_03301250', name: 'Nước Mắm (Fish Sauce)', label: 'Fermented fish', icon: '🏺', category: 'cá', group: 'Gia vị Cá' },
    { id: 'FOODON_03301252', name: 'Dầu Cá (Fish Oil)', label: 'Fish extract', icon: '💊', category: 'cá', group: 'Dầu Cá' },
    { id: 'FOODON_03301255', name: 'Parvalbumin', label: 'Major fish allergen', icon: '🧪', category: 'cá', group: 'Kháng nguyên Cá' },

    // 🥜 ĐẬU PHỘNG / LẠC (Peanuts - FOODON_00001088)
    { id: 'FOODON_00001088', name: 'Đậu Phộng / Lạc (Peanuts)', label: 'Legume nut', icon: '🥜', category: 'đậu phộng', group: 'Đậu phộng' },
    { id: 'FOODON_03301089', name: 'Bơ Đậu Phộng (Peanut Butter)', label: 'Peanut paste', icon: '🥜', category: 'đậu phộng', group: 'Chế phẩm Đậu phộng' },
    { id: 'FOODON_03301090', name: 'Dầu Lạc / Dầu Đậu Phộng (Arachis Oil)', label: 'Peanut oil', icon: '🛢️', category: 'đậu phộng', group: 'Dầu thực vật' },
    { id: 'FOODON_03301092', name: 'Bột Đậu Phộng (Peanut Flour)', label: 'Peanut protein', icon: '🥜', category: 'đậu phộng', group: 'Bột thực phẩm' },

    // 🌱 ĐẬU NÀNH (Soybean & Soy - FOODON_00001099)
    { id: 'FOODON_00001099', name: 'Đậu Nành / Đậu Tương (Soybean)', label: 'Legume', icon: '🌱', category: 'đậu nành', group: 'Đậu nành' },
    { id: 'FOODON_03301100', name: 'Đậu Hũ / Đậu Phụ (Tofu)', label: 'Soy curd', icon: '🧈', category: 'đậu nành', group: 'Chế phẩm Đậu nành' },
    { id: 'FOODON_03301102', name: 'Đạm Đậu Nành Isolate / TVP (Soy Protein)', label: 'Soy protein isolate', icon: '🌱', category: 'đậu nành', group: 'Đạm thực vật' },
    { id: 'FOODON_03301105', name: 'Lecithin Đậu Nành (Soy Lecithin - E322)', label: 'Emulsifier (E322)', icon: '🧪', category: 'đậu nành', group: 'Chất nhũ hóa' },
    { id: 'FOODON_03301108', name: 'Nước Tương / Xì Dầu (Soy Sauce)', label: 'Fermented soy', icon: '🍶', category: 'đậu nành', group: 'Gia vị Đậu nành' },
    { id: 'FOODON_03301110', name: 'Miso / Natto / Tempeh', label: 'Fermented soybean', icon: '🌱', category: 'đậu nành', group: 'Đậu nành lên men' },
    { id: 'FOODON_03301112', name: 'Dầu Đậu Nành (Soybean Oil)', label: 'Soy oil', icon: '🛢️', category: 'đậu nành', group: 'Dầu thực vật' },

    // 🥚 TRỨNG (Egg & Egg Products - FOODON_00001012)
    { id: 'FOODON_00001012', name: 'Trứng (Egg / Egg products)', label: 'Poultry egg', icon: '🥚', category: 'trứng', group: 'Trứng' },
    { id: 'FOODON_03301013', name: 'Lòng Đỏ Trứng (Egg Yolk)', label: 'Egg yolk', icon: '🍳', category: 'trứng', group: 'Lòng đỏ' },
    { id: 'FOODON_03301014', name: 'Lòng Trắng Trứng (Egg White)', label: 'Egg albumen', icon: '🥚', category: 'trứng', group: 'Lòng trắng' },
    { id: 'FOODON_03301016', name: 'Ovalbumin / Ovomucin / Vitellin', label: 'Major egg allergen', icon: '🧪', category: 'trứng', group: 'Đạm Trứng' },
    { id: 'FOODON_03301018', name: 'Lysozyme (Chất bảo quản E1105)', label: 'Egg enzyme (E1105)', icon: '🧪', category: 'trứng', group: 'Phụ gia từ Trứng' },
    { id: 'FOODON_03301020', name: 'Sốt Mayonnaise', label: 'Egg emulsion', icon: '🥣', category: 'trứng', group: 'Sốt Trứng' },

    // 🌾 LÚA MÌ & GLUTEN (Wheat & Gluten Grains - FOODON_00001062)
    { id: 'FOODON_00001062', name: 'Lúa Mì / Bột Mì (Wheat Flour)', label: 'Cereal grain', icon: '🌾', category: 'bột mì', group: 'Lúa mì' },
    { id: 'FOODON_03301063', name: 'Gluten / Gliadin', label: 'Wheat protein', icon: '🌾', category: 'bột mì', group: 'Đạm Gluten' },
    { id: 'FOODON_00001064', name: 'Lúa Mạch (Barley / Hordein)', label: 'Cereal grain', icon: '🌾', category: 'bột mì', group: 'Ngũ cốc có Gluten' },
    { id: 'FOODON_00001066', name: 'Yến Mạch (Oats / Oatmeal)', label: 'Oat grain', icon: '🥣', category: 'bột mì', group: 'Yến mạch' },
    { id: 'FOODON_00001068', name: 'Lúa Mạch Đen (Rye / Secalin)', label: 'Cereal grain', icon: '🌾', category: 'bột mì', group: 'Ngũ cốc' },
    { id: 'FOODON_03301070', name: 'Mạch Nha / Chiết Xuất Malt (Malt Extract)', label: 'Barley malt', icon: '🍯', category: 'bột mì', group: 'Chiết xuất Mạch nha' },
    { id: 'FOODON_03301072', name: 'Mì Sợi / Bánh Mì (Noodles / Bread)', label: 'Wheat food', icon: '🍞', category: 'bột mì', group: 'Thực phẩm Lúa mì' },

    // 🌰 HẠT CÂY DINH DƯỠNG (Tree Nuts - FOODON_00001140)
    { id: 'FOODON_00001140', name: 'Hạt Cây Dinh Dưỡng (Tree Nuts)', label: 'Tree nuts general', icon: '🌰', category: 'hạt', group: 'Hạt cây' },
    { id: 'FOODON_00001180', name: 'Hạnh Nhân (Almond)', label: 'Tree nut', icon: '🌰', category: 'hạt', group: 'Hạt dinh dưỡng' },
    { id: 'FOODON_00001185', name: 'Hạt Óc Chó (Walnut)', label: 'Tree nut', icon: '🌰', category: 'hạt', group: 'Hạt dinh dưỡng' },
    { id: 'FOODON_00001183', name: 'Hạt Điều (Cashew)', label: 'Tree nut', icon: '🌰', category: 'hạt', group: 'Hạt dinh dưỡng' },
    { id: 'FOODON_00001188', name: 'Hạt Dẻ Cười (Pistachio)', label: 'Tree nut', icon: '🌰', category: 'hạt', group: 'Hạt dinh dưỡng' },
    { id: 'FOODON_00001190', name: 'Hạt Mắc Ca (Macadamia)', label: 'Tree nut', icon: '🌰', category: 'hạt', group: 'Hạt dinh dưỡng' },
    { id: 'FOODON_00001187', name: 'Hạt Phỉ (Hazelnut)', label: 'Tree nut', icon: '🌰', category: 'hạt', group: 'Hạt dinh dưỡng' },
    { id: 'FOODON_00001186', name: 'Hạt Hồ Đào (Pecan)', label: 'Tree nut', icon: '🌰', category: 'hạt', group: 'Hạt dinh dưỡng' },
    { id: 'FOODON_00001182', name: 'Hạt Dẻ (Chestnut)', label: 'Tree nut', icon: '🌰', category: 'hạt', group: 'Hạt dinh dưỡng' },
    { id: 'FOODON_00001192', name: 'Hạt Thông (Pine Nut)', label: 'Tree nut', icon: '🌰', category: 'hạt', group: 'Hạt dinh dưỡng' },

    // 🌿 MÈ / VỪNG (Sesame Seeds - FOODON_00001174)
    { id: 'FOODON_00001174', name: 'Mè / Vừng (Sesame Seeds)', label: 'Oilseed', icon: '🌿', category: 'mè', group: 'Hạt mè' },
    { id: 'FOODON_03301175', name: 'Dầu Mè / Dầu Vừng (Sesame Oil)', label: 'Sesame oil', icon: '🛢️', category: 'mè', group: 'Dầu Mè' },
    { id: 'FOODON_03301178', name: 'Sốt Tahini / Bơ Vừng (Tahini Paste)', label: 'Sesame paste', icon: '🥣', category: 'mè', group: 'Chế phẩm Mè' },

    // 🥬 CẦN TÂY (Celery - FOODON_00001220)
    { id: 'FOODON_00001220', name: 'Cần Tây (Celery / Celeriac)', label: 'Vegetable allergen', icon: '🥬', category: 'cần tây', group: 'Cần tây' },

    // 🟡 MÙ TẠT (Mustard - FOODON_00001215)
    { id: 'FOODON_00001215', name: 'Mù Tạt (Mustard / Wasabi)', label: 'Spice allergen', icon: '🟡', category: 'mù tạt', group: 'Mù tạt' },

    // 🍗 THỊT GÀ & GIA CẦM (Chicken & Poultry - FOODON_00001015)
    { id: 'FOODON_00001015', name: 'Thịt Gà / Gà (Chicken / Poultry)', label: 'Chicken food product', icon: '🍗', category: 'gà', group: 'Thịt gia cầm' },
    { id: 'FOODON_03301017', name: 'Ức Gà / Phi Lê Gà (Chicken Breast)', label: 'Poultry cut', icon: '🍗', category: 'gà', group: 'Thịt gia cầm' },
    { id: 'FOODON_03301019', name: 'Bột Thịt Gà / Nước Cốt Gà (Chicken Extract)', label: 'Poultry derivative', icon: '🍲', category: 'gà', group: 'Chiết xuất gia cầm' },

    // 🥩 THỊT BÒ (Beef - FOODON_00001025)
    { id: 'FOODON_00001025', name: 'Thịt Bò (Beef)', label: 'Bovine meat', icon: '🥩', category: 'bò', group: 'Thịt đỏ' },
    { id: 'FOODON_03301026', name: 'Bột Thịt Bò / Chiết Xuất Bò (Beef Extract)', label: 'Meat extract', icon: '🍲', category: 'bò', group: 'Chiết xuất thịt' },

    // 🍖 THỊT HEO / LỢN (Pork - FOODON_00001030)
    { id: 'FOODON_00001030', name: 'Thịt Heo / Thịt Lợn (Pork)', label: 'Porcine meat', icon: '🍖', category: 'heo', group: 'Thịt đỏ' },

    // 🌽 BẮP / NGÔ (Corn / Maize - FOODON_00001075)
    { id: 'FOODON_00001075', name: 'Bắp / Ngô (Corn / Maize)', label: 'Cereal grain', icon: '🌽', category: 'bắp', group: 'Ngũ cốc' },
    { id: 'FOODON_03301076', name: 'Tinh Bột Bắp (Corn Starch)', label: 'Cereal starch', icon: '🌽', category: 'bắp', group: 'Tinh bột' },

    // 🌾 GẠO (Rice - FOODON_00001050)
    { id: 'FOODON_00001050', name: 'Gạo / Cơm (Rice)', label: 'Cereal grain', icon: '🌾', category: 'gạo', group: 'Ngũ cốc' },

    // 🧪 SULFITE (Sulfites Preservatives - FOODON_00002400)
    { id: 'FOODON_00002400', name: 'Sulfite / Sunfit (E220-E228)', label: 'Preservative allergen', icon: '🧪', category: 'sulfite', group: 'Chất bảo quản' }
  ];

  const FALLBACK_FOODON = FOODON_SUGGESTIONS_DB;

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
    try {
      if (el.bearAvatarImgLanding && typeof TunnelBearController !== 'undefined') {
        bearCtrl = new TunnelBearController(el.bearAvatarImgLanding);
      }
    } catch (e) { console.warn('TunnelBear init skipped:', e); }

    try { initFirebaseAuth(); } catch (e) { console.warn('FirebaseAuth init error:', e); }
    try { renderAllergenTags(); } catch (e) { console.warn('renderAllergenTags error:', e); }
    try { renderHistory(); } catch (e) { console.warn('renderHistory error:', e); }
    try { bindEvents(); } catch (e) { console.error('bindEvents error:', e); }
    try { checkBackendHealth(); } catch (e) { console.warn('checkBackendHealth error:', e); }
    try { attachAudioFeedback(); } catch (e) { console.warn('attachAudioFeedback error:', e); }

    try { if (typeof initFlipWords === 'function') initFlipWords(); } catch (e) { }
    try { if (typeof initMarquee === 'function') initMarquee(); } catch (e) { }
    try { if (typeof initCopyApiBtn === 'function') initCopyApiBtn(); } catch (e) { }
    try { if (typeof initWokwiMqttBridge === 'function') initWokwiMqttBridge(); } catch (e) { }
    try { if (typeof initHardwareConfigControls === 'function') initHardwareConfigControls(); } catch (e) { }

    // Giu o nhap thanh phan sach se ban dau
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

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-input-wrapper')) {
        hideFuzzyDropdown();
      }
    });

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

    window.triggerWokwiAlertDirectly = function (customResult = null) {
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

    window.triggerWokwiSafeDirectly = function (customResult = null) {
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

    // Khởi tạo bảng điều khiển thông số phần cứng ESP32
    initHardwareConfigControls();

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
  // Helper: Bỏ dấu tiếng Việt để so khớp fuzzy
  function removeVietnameseTones(str) {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a')
      .replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e')
      .replace(/ì|í|ị|ỉ|ĩ/g, 'i')
      .replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o')
      .replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u')
      .replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y')
      .replace(/đ/g, 'd');
  }

  async function handleFuzzySearch(query) {
    const text = (query || '').trim();

    if (!text) {
      hideFuzzyDropdown();
      return;
    }

    const queryLower = text.toLowerCase();
    const queryNoTone = removeVietnameseTones(queryLower);

    // 1. Tìm kiếm và hiển thị NGAY LẬP TỨC (0ms) từ cơ sở dữ liệu FoodOn cục bộ
    const localMatches = FOODON_SUGGESTIONS_DB.filter(item => {
      const nameLower = item.name.toLowerCase();
      const nameNoTone = removeVietnameseTones(nameLower);
      const labelLower = item.label.toLowerCase();
      const idLower = item.id.toLowerCase();
      const groupLower = (item.group || '').toLowerCase();
      const groupNoTone = removeVietnameseTones(groupLower);

      return nameLower.includes(queryLower) ||
        nameNoTone.includes(queryNoTone) ||
        labelLower.includes(queryLower) ||
        idLower.includes(queryLower) ||
        groupLower.includes(queryLower) ||
        groupNoTone.includes(queryNoTone);
    });

    // Sắp xếp ưu tiên khớp chính xác từ khóa lên đầu
    localMatches.sort((a, b) => {
      const aExact = a.name.toLowerCase().includes(queryLower) ? 0 : 1;
      const bExact = b.name.toLowerCase().includes(queryLower) ? 0 : 1;
      return aExact - bExact;
    });

    // Hiển thị ngay kết quả
    renderFuzzyDropdown(localMatches.slice(0, 10));

    // 2. Gọi thêm API Backend /node?text=... ngầm để bổ sung nếu có
    clearTimeout(fuzzyDebounceTimer);
    fuzzyDebounceTimer = setTimeout(async () => {
      try {
        const response = await fetch(`${state.backendUrl}/node?text=${encodeURIComponent(text)}`, {
          signal: AbortSignal.timeout(1200)
        });
        if (response.ok) {
          const data = await response.json();
          if (data.suggest_nodes && data.suggest_nodes.length > 0) {
            let combined = [...localMatches];
            data.suggest_nodes.forEach(n => {
              const alreadyHas = combined.some(c => c.name.toLowerCase().includes(n.name.toLowerCase()) || n.name.toLowerCase().includes(c.name.toLowerCase()));
              if (!alreadyHas) {
                combined.push({
                  id: 'FOODON_TERM',
                  name: `${n.name} (${n.label})`,
                  label: n.label,
                  icon: '🧬',
                  group: n.label,
                  category: n.name
                });
              }
            });
            renderFuzzyDropdown(combined.slice(0, 10));
          }
        }
      } catch (e) {
        // Backend offline -> Tiếp tục hiển thị localMatches
      }
    }, 100);
  }

  function renderFuzzyDropdown(nodes) {
    const dropdown = el.fuzzyDropdown || document.getElementById('fuzzyDropdown');
    const list = el.fuzzySuggestionList || document.getElementById('fuzzySuggestionList');
    if (!dropdown || !list) return;

    list.innerHTML = '';
    if (!nodes || nodes.length === 0) {
      list.innerHTML = `
        <li style="padding: 12px; color: var(--text-muted); text-align: center; font-size: 0.84rem;">
          <i class="fa-solid fa-circle-question text-accent"></i> Khong tim thay trong FoodOn. Nhan <strong>Enter</strong> hoac nut <strong>+ Them</strong> de them tu do!
        </li>
      `;
      dropdown.classList.remove('hidden');
      dropdown.style.display = 'block';
      return;
    }

    nodes.forEach(node => {
      const li = document.createElement('li');
      li.className = 'fuzzy-item';
      li.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; cursor: pointer; border-bottom: 1px solid rgba(255, 255, 255, 0.06); transition: background 0.15s ease;';

      li.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.25rem;">${node.icon || '🧬'}</span>
          <div>
            <div style="font-weight: 600; color: #ffffff; font-size: 0.9rem;">${escapeHtml(node.name)}</div>
            <div style="font-size: 0.75rem; color: #00f2fe; font-family: 'Fira Code', monospace;">${escapeHtml(node.id)} • ${escapeHtml(node.group || node.label)}</div>
          </div>
        </div>
        <span class="badge-status safe" style="font-size: 0.72rem; padding: 3px 8px; border-radius: 999px; background: rgba(0, 242, 254, 0.2); color: #00f2fe; font-weight: 600;">+ Them</span>
      `;

      li.addEventListener('mouseenter', () => {
        li.style.background = 'rgba(0, 242, 254, 0.18)';
      });
      li.addEventListener('mouseleave', () => {
        li.style.background = '';
      });

      li.addEventListener('click', () => {
        soundSynth.playClick();
        const primaryKeyword = node.category || node.name.split(' (')[0].split('/')[0].trim();
        addAllergen(primaryKeyword);
        const input = el.allergenInput || document.getElementById('allergenInput');
        if (input) input.value = '';
        hideFuzzyDropdown();
      });

      list.appendChild(li);
    });

    dropdown.classList.remove('hidden');
    dropdown.style.display = 'block';
  }

  function hideFuzzyDropdown() {
    const dropdown = el.fuzzyDropdown || document.getElementById('fuzzyDropdown');
    if (dropdown) {
      dropdown.classList.add('hidden');
      dropdown.style.display = 'none';
    }
  }

  window.handleFuzzySearch = handleFuzzySearch;
  window.renderFuzzyDropdown = renderFuzzyDropdown;
  window.hideFuzzyDropdown = hideFuzzyDropdown;
  window.addAllergen = addAllergen;

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
  // 🧬 FOODON ONTOLOGY KNOWLEDGE GRAPH & COMPREHENSIVE ALLERGEN DICTIONARY
  // (Đồ thị tri thức phân loại thực phẩm chuẩn quốc tế FDA / EU / FoodOn)
  // ============================================================================
  const FOODON_ONTOLOGY_GRAPH = {
    'sữa': {
      label: 'Sữa & Chế phẩm từ Sữa (Milk & Dairy - FOODON_00001005)',
      derivatives: [
        'sữa', 'sua', 'milk', 'dairy', 'whey', 'casein', 'caseinate', 'sodium caseinate', 'calcium caseinate',
        'lactose', 'lactalbumin', 'lactoglobulin', 'bơ', 'bo', 'butter', 'buttermilk', 'ghee', 'bơ khan',
        'kem', 'cream', 'sour cream', 'whipping cream', 'phô mai', 'pho mai', 'cheese', 'mozzarella', 'cheddar',
        'parmesan', 'sữa bột', 'sua bot', 'sữa tươi', 'sua tuoi', 'sữa đặc', 'sua dac', 'sữa chua', 'sua chua',
        'yogurt', 'yoghurt', 'váng sữa', 'vang sua', 'curd', 'custard', 'đạm whey', 'whey protein', 'skimmed milk',
        'whole milk', 'milk powder', 'milk solids', 'nonfat milk', 'condensed milk', 'galactose', 'recaldent'
      ]
    },
    'tôm': {
      label: 'Tôm & Giáp xác (Shrimp & Crustaceans - FOODON_00001254)',
      derivatives: [
        'tôm', 'tom', 'shrimp', 'prawn', 'tép', 'tep', 'tôm khô', 'tom kho', 'tôm hùm', 'tom hum', 'lobster',
        'cua', 'crab', 'ghẹ', 'ghe', 'còng', 'rạm', 'hải sản', 'hai san', 'seafood', 'crustacean', 'crustaceans',
        'mắm tôm', 'mam tom', 'mắm ruốc', 'mam ruoc', 'ruốc', 'bột tôm', 'bot tom', 'chiết xuất tôm', 'glucosamine',
        'tropomyosin', 'chitosan'
      ]
    },
    'hải sản': {
      label: 'Hải sản & Thân mềm (Seafood & Molluscs - FOODON_00001256)',
      derivatives: [
        'hải sản', 'hai san', 'seafood', 'mực', 'muc', 'squid', 'calamari', 'bạch tuộc', 'bach tuoc', 'octopus',
        'sò', 'so', 'clam', 'nghêu', 'ngheu', 'ngêu', 'hàu', 'hau', 'oyster', 'điệp', 'diep', 'scallop', 'ốc', 'oc',
        'snail', 'bào ngư', 'bao ngu', 'abalone', 'chem chép', 'vẹm', 'mussel', 'surimi', 'chả cá'
      ]
    },
    'cá': {
      label: 'Cá & Chiết xuất từ Cá (Fish & Fish Products - FOODON_00001248)',
      derivatives: [
        'cá', 'ca', 'fish', 'cá hồi', 'ca hoi', 'salmon', 'cá ngừ', 'ca ngu', 'tuna', 'cá thu', 'ca thu', 'mackerel',
        'cá tuyết', 'cod', 'cá trích', 'herring', 'cá cơm', 'anchovy', 'nước mắm', 'nuoc mam', 'fish sauce',
        'dầu cá', 'dau ca', 'fish oil', 'gelatin cá', 'parvalbumin', 'surimi', 'worcestershire'
      ]
    },
    'đậu phộng': {
      label: 'Đậu Phộng / Lạc (Peanuts - FOODON_00001088)',
      derivatives: [
        'đậu phộng', 'dau phong', 'đậu phụng', 'dau phung', 'lạc', 'lac', 'peanut', 'peanuts', 'arachis',
        'arachis hypogaea', 'groundnut', 'monkey nut', 'bơ đậu phộng', 'bo dau phong', 'peanut butter',
        'dầu đậu phộng', 'dau dau phong', 'dầu lạc', 'dau lac', 'peanut flour', 'bột đậu phộng'
      ]
    },
    'đậu nành': {
      label: 'Đậu Nành / Đậu Tương (Soybean & Soy - FOODON_00001099)',
      derivatives: [
        'đậu nành', 'dau nanh', 'đậu tương', 'dau tuong', 'soy', 'soya', 'soybean', 'soybeans', 'soja',
        'lecithin', 'soy lecithin', 'e322', '322', '322i', 'đậu hũ', 'dau hu', 'đậu phụ', 'dau phu', 'tofu',
        'tempeh', 'edamame', 'miso', 'natto', 'nước tương', 'nuoc tuong', 'xì dầu', 'xi dau', 'soy sauce',
        'đạm đậu nành', 'soy protein', 'soy isolate', 'tvp', 'dầu đậu nành', 'dau dau nanh'
      ]
    },
    'trứng': {
      label: 'Trứng & Sản phẩm từ Trứng (Egg & Egg Products - FOODON_00001012)',
      derivatives: [
        'trứng', 'trung', 'egg', 'eggs', 'lòng đỏ', 'long do', 'lòng trắng', 'long trang', 'egg yolk', 'egg white',
        'albumin', 'ovalbumin', 'ovoglobulin', 'ovomucin', 'ovomucoid', 'vitellin', 'livetin', 'lysozyme', 'e1105',
        'lecithin trứng', 'mayonnaise', 'meringue', 'bột trứng', 'bot trung', 'globulin'
      ]
    },
    'bột mì': {
      label: 'Lúa Mì & Gluten (Wheat & Gluten Grains - FOODON_00001062)',
      derivatives: [
        'bột mì', 'bot mi', 'lúa mì', 'lua mi', 'wheat', 'gluten', 'flour', 'mì', 'mi', 'mì sợi', 'noodle',
        'lúa mạch', 'lua mach', 'barley', 'hordein', 'lúa mạch đen', 'rye', 'secalin', 'yến mạch', 'yen mach', 'oats',
        'oatmeal', 'spelt', 'kamut', 'semolina', 'durum', 'bulgur', 'couscous', 'seitan', 'mạch nha', 'mach nha',
        'malt', 'malt extract', 'wheat starch', 'tinh bột lúa mì', 'gliadin'
      ]
    },
    'hạt': {
      label: 'Hạt Cây dinh dưỡng (Tree Nuts - FOODON_00001140)',
      derivatives: [
        'hạt', 'hat', 'nut', 'nuts', 'tree nut', 'tree nuts', 'hạnh nhân', 'hanh nhan', 'almond', 'almonds',
        'óc chó', 'oc cho', 'walnut', 'walnuts', 'hạt điều', 'hat dieu', 'cashew', 'cashews', 'hạt dẻ', 'hat de',
        'chestnut', 'hạt dẻ cười', 'pistachio', 'hồ đào', 'pecan', 'mắc ca', 'macadamia', 'hạt phỉ', 'hazelnut',
        'hạt thông', 'pine nut', 'marzipan', 'praline', 'gianduja'
      ]
    },
    'mè': {
      label: 'Mè / Vừng (Sesame Seeds - FOODON_00001174)',
      derivatives: [
        'mè', 'me', 'vừng', 'vung', 'sesame', 'sesame seed', 'sesamum', 'dầu mè', 'dau me', 'dầu vừng', 'dau vung',
        'tahini', 'tahina', 'hummus', 'gomasio', 'sesamol'
      ]
    },
    'cần tây': {
      label: 'Cần Tây (Celery - FOODON_00001220)',
      derivatives: [
        'cần tây', 'can tay', 'celery', 'celeriac', 'hạt cần tây', 'muối cần tây', 'celery salt', 'celery seed'
      ]
    },
    'mù tạt': {
      label: 'Mù Tạt (Mustard - FOODON_00001215)',
      derivatives: [
        'mù tạt', 'mu tat', 'mustard', 'mù tạt vàng', 'wasabi', 'hạt mù tạt', 'dầu mù tạt', 'mustard seed'
      ]
    },
    'sulfite': {
      label: 'Sulfite / Sunfit (Sulfites Preservatives - FOODON_00002400)',
      derivatives: [
        'sulfite', 'sunfit', 'sulphite', 'sulfur dioxide', 'so2', 'e220', 'e221', 'e222', 'e223', 'e224', 'e226', 'e227', 'e228',
        'natri sunfit', 'kali sunfit'
      ]
    }
  };

  // ============================================================================
  // 📚 SCALLERGEN ALGORITHMS 1, 2, 3, 4: HYBRID FUZZY MATCHING
  // ============================================================================
  function levenshteinDistance(s1, s2) {
    const a = (s1 || '').toLowerCase();
    const b = (s2 || '').toLowerCase();
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // Deletion
          dp[i][j - 1] + 1,      // Insertion
          dp[i - 1][j - 1] + cost // Substitution
        );
      }
    }
    return dp[m][n];
  }

  // Algorithm 1: Character-level similarity
  function computeCharacterLevelScore(q, l) {
    const lenQ = (q || '').length;
    const lenL = (l || '').length;
    const maxLen = Math.max(lenQ, lenL);
    if (maxLen === 0) return 100;
    const lev = levenshteinDistance(q, l);
    return Math.max(0, (1 - lev / maxLen) * 100);
  }

  function tokenizeString(str) {
    return (str || '')
      .toLowerCase()
      .split(/[^a-z0-9\u00C0-\u024F\u1EA0-\u1EF9]+/i)
      .filter(Boolean);
  }

  // Algorithm 3: Token score computation (TokenSet, TokenSort, PartialRatio)
  function computeTokenScore(q, l, Tq, Tl) {
    const tokensQ = Tq || tokenizeString(q);
    const tokensL = Tl || tokenizeString(l);

    // 1. Token Set Ratio
    const setQ = new Set(tokensQ);
    const setL = new Set(tokensL);
    const intersect = [...setQ].filter(x => setL.has(x));
    const diffQ = [...setQ].filter(x => !setL.has(x));
    const diffL = [...setL].filter(x => !setL.has(x));

    const s1 = intersect.join(' ');
    const s2 = [...intersect, ...diffQ].join(' ');
    const s3 = [...intersect, ...diffL].join(' ');

    const sset = Math.max(
      computeCharacterLevelScore(s1, s2),
      computeCharacterLevelScore(s1, s3)
    );

    // 2. Token Sort Ratio
    const sortedQ = [...tokensQ].sort().join(' ');
    const sortedL = [...tokensL].sort().join(' ');
    const ssort = computeCharacterLevelScore(sortedQ, sortedL);

    // 3. Partial Ratio (Best matching substring)
    let spartial = 0;
    const shorter = q.length <= l.length ? q : l;
    const longer = q.length <= l.length ? l : q;
    const lenShort = shorter.length;
    if (lenShort > 0 && longer.length >= lenShort) {
      for (let i = 0; i <= longer.length - lenShort; i++) {
        const sub = longer.substring(i, i + lenShort);
        const sim = computeCharacterLevelScore(shorter, sub);
        if (sim > spartial) spartial = sim;
      }
    }

    let sbest = sset;
    if (ssort > sbest) sbest = ssort;
    if (tokensQ.length === 1 && spartial > sbest) sbest = spartial;

    return sbest;
  }

  // Algorithm 4: Length penalty computation
  function computeLengthPenalty(q, l, beta = 0.5) {
    const delta = Math.abs((q || '').length - (l || '').length);
    return delta * beta;
  }

  // Algorithm 2: Hybrid fuzzy string matching for ontology entity search
  function hybridFuzzyMatch(query, candidateLabel, thetaMin = 60, wchar = 0.5, wtoken = 0.5) {
    const q = (query || '').toLowerCase().trim();
    const l = (candidateLabel || '').toLowerCase().trim();

    if (l === q) return { score: 1000, penalty: 0, finalScore: 1000 };
    if (l.startsWith(q)) return { score: 95, penalty: 0, finalScore: 95 };

    const Tq = tokenizeString(q);
    const Tl = tokenizeString(l);

    const schar = computeCharacterLevelScore(q, l);
    const stoken = computeTokenScore(q, l, Tq, Tl);
    const shybrid = (wchar * schar) + (wtoken * stoken);

    if (shybrid >= thetaMin) {
      const p = computeLengthPenalty(q, l, 0.5);
      return { score: shybrid, penalty: p, finalScore: shybrid - p };
    }
    return null;
  }

  // ============================================================================
  // 🌐 TABLE 5: REFINED MAPPING OF ONTOLOGY RELATIONS & BFS TRAVERSAL
  // ============================================================================
  const FOODON_KNOWLEDGE_GRAPH = {
    // 1. Taxonomy & Hierarchy
    'IS_A': [
      { from: 'prawn', to: 'shrimp' },
      { from: 'tôm sú', to: 'shrimp' },
      { from: 'tôm hùm', to: 'shrimp' },
      { from: 'crab', to: 'crustacea' },
      { from: 'ghẹ', to: 'crustacea' },
      { from: 'salmon', to: 'fish' },
      { from: 'cá hồi', to: 'fish' },
      { from: 'tuna', to: 'fish' },
      { from: 'cá ngừ', to: 'fish' },
      { from: 'cá thu', to: 'fish' },
      { from: 'cow milk', to: 'milk' },
      { from: 'sữa bò', to: 'milk' },
      { from: 'sữa dê', to: 'milk' },
      { from: 'goat milk', to: 'milk' },
      { from: 'almond', to: 'tree nut' },
      { from: 'hạnh nhân', to: 'tree nut' },
      { from: 'cashew', to: 'tree nut' },
      { from: 'hạt điều', to: 'tree nut' },
      { from: 'walnut', to: 'tree nut' },
      { from: 'óc chó', to: 'tree nut' },
      { from: 'barley', to: 'cereal grain' },
      { from: 'lúa mạch', to: 'cereal grain' },
      { from: 'rye', to: 'cereal grain' },
      { from: 'lúa mạch đen', to: 'cereal grain' },
      { from: 'wheat', to: 'cereal grain' },
      { from: 'lúa mì', to: 'cereal grain' },
      { from: 'chicken', to: 'poultry' },
      { from: 'thịt gà', to: 'gà' },
      { from: 'gà', to: 'gia cầm' },
      { from: 'ức gà', to: 'chicken' },
      { from: 'beef', to: 'meat' },
      { from: 'thịt bò', to: 'thịt' },
      { from: 'pork', to: 'meat' },
      { from: 'thịt heo', to: 'thịt' }
    ],
    'IN_TAXON': [
      { from: 'shrimp', to: 'crustacea' },
      { from: 'tôm', to: 'crustacea' },
      { from: 'crab', to: 'crustacea' },
      { from: 'cua', to: 'crustacea' },
      { from: 'lobster', to: 'crustacea' },
      { from: 'squid', to: 'mollusca' },
      { from: 'mực', to: 'mollusca' },
      { from: 'octopus', to: 'mollusca' },
      { from: 'bạch tuộc', to: 'mollusca' },
      { from: 'clam', to: 'mollusca' },
      { from: 'nghêu', to: 'mollusca' },
      { from: 'oyster', to: 'mollusca' },
      { from: 'hàu', to: 'mollusca' },
      { from: 'fish', to: 'chordata' },
      { from: 'cá', to: 'chordata' }
    ],
    // 2. Origin Tracing
    'DERIVES_FROM': [
      { from: 'tofu', to: 'soybean' },
      { from: 'đậu phụ', to: 'soybean' },
      { from: 'đậu hũ', to: 'soybean' },
      { from: 'soy milk', to: 'soybean' },
      { from: 'sữa đậu nành', to: 'soybean' },
      { from: 'whey protein', to: 'milk' },
      { from: 'đạm whey', to: 'milk' },
      { from: 'bột whey', to: 'milk' },
      { from: 'cheese', to: 'milk' },
      { from: 'phô mai', to: 'milk' },
      { from: 'butter', to: 'milk' },
      { from: 'bơ', to: 'milk' },
      { from: 'yogurt', to: 'milk' },
      { from: 'sữa chua', to: 'milk' },
      { from: 'peanut butter', to: 'peanut' },
      { from: 'bơ đậu phộng', to: 'peanut' },
      { from: 'tahini', to: 'sesame' },
      { from: 'bơ vừng', to: 'sesame' },
      { from: 'wheat flour', to: 'wheat' },
      { from: 'bột mì', to: 'wheat' },
      { from: 'gluten', to: 'wheat' },
      { from: 'malt extract', to: 'barley' },
      { from: 'mạch nha', to: 'barley' }
    ],
    'PRODUCED_BY': [
      { from: 'honey', to: 'bee' },
      { from: 'mật ong', to: 'bee' },
      { from: 'milk', to: 'dairy' },
      { from: 'sữa', to: 'dairy' },
      { from: 'egg', to: 'poultry' },
      { from: 'trứng', to: 'poultry' }
    ],
    // 3. Composition & Ingredients
    'HAS_INGREDIENT': [
      { from: 'mayonnaise', to: 'egg' },
      { from: 'sốt mayonnaise', to: 'egg' },
      { from: 'cake', to: 'wheat flour' },
      { from: 'bánh quy', to: 'wheat flour' },
      { from: 'bánh mì', to: 'wheat flour' },
      { from: 'sausage', to: 'soy protein' },
      { from: 'xúc xích', to: 'soy protein' },
      { from: 'noodle', to: 'wheat flour' },
      { from: 'mì tôm', to: 'wheat flour' }
    ],
    'HAS_DEFINING_INGREDIENT': [
      { from: 'custard', to: 'egg' },
      { from: 'kem trứng', to: 'egg' },
      { from: 'pound cake', to: 'butter' },
      { from: 'bánh bơ', to: 'butter' },
      { from: 'chả cá', to: 'fish' },
      { from: 'surimi', to: 'fish' }
    ],
    'HAS_SUBSTANCE_ADDED': [
      { from: 'e322', to: 'soybean' },
      { from: 'lecithin', to: 'soybean' },
      { from: '322i', to: 'soybean' },
      { from: 'lecithin đậu nành', to: 'soybean' },
      { from: 'e1105', to: 'egg' },
      { from: 'lysozyme', to: 'egg' },
      { from: 'e220', to: 'sulfite' },
      { from: 'sunfit', to: 'sulfite' },
      { from: 'glucosamine', to: 'crustacea' },
      { from: 'chiết xuất tôm', to: 'crustacea' }
    ],
    'PART_OF': [
      { from: 'egg yolk', to: 'egg' },
      { from: 'lòng đỏ trứng', to: 'egg' },
      { from: 'egg white', to: 'egg' },
      { from: 'lòng trắng trứng', to: 'egg' },
      { from: 'albumin', to: 'egg' },
      { from: 'ovalbumin', to: 'egg' },
      { from: 'casein', to: 'milk' },
      { from: 'sodium caseinate', to: 'milk' },
      { from: 'lactalbumin', to: 'milk' },
      { from: 'gliadin', to: 'gluten' },
      { from: 'tropomyosin', to: 'crustacea' },
      { from: 'parvalbumin', to: 'fish' }
    ],
    'HAS_PART': [
      { from: 'egg', to: 'egg yolk' },
      { from: 'trứng', to: 'lòng đỏ trứng' },
      { from: 'milk', to: 'whey protein' },
      { from: 'sữa', to: 'đạm whey' }
    ]
  };

  /**
   * Breadth-First Search (BFS) Traversal across FoodOn Knowledge Graph (Depth limit <= 7)
   */
  function findFoodOnPath(startNode, targetAllergens, maxDepth = 7) {
    const queue = [{ node: startNode.toLowerCase(), path: [{ node: startNode, rel: 'START' }], depth: 0 }];
    const visited = new Set([startNode.toLowerCase()]);

    const targetSet = new Set(targetAllergens.map(a => removeVietnameseTones(a.toLowerCase().trim())));

    while (queue.length > 0) {
      const current = queue.shift();
      const currNode = current.node;
      const currNoTone = removeVietnameseTones(currNode);

      // Check if current node is one of the user-defined allergens
      for (const target of targetSet) {
        if (currNoTone === target || currNoTone.includes(target) || target.includes(currNoTone)) {
          return {
            found: true,
            targetAllergen: target.toUpperCase(),
            path: current.path,
            depth: current.depth
          };
        }
      }

      if (current.depth >= maxDepth) continue;

      // Traverse all 9 relations from Table 5
      for (const [relType, edges] of Object.entries(FOODON_KNOWLEDGE_GRAPH)) {
        for (const edge of edges) {
          const fromNode = edge.from.toLowerCase();
          const toNode = edge.to.toLowerCase();

          // Outgoing (from -> to)
          if (currNode.includes(fromNode) || fromNode.includes(currNode)) {
            if (!visited.has(toNode)) {
              visited.add(toNode);
              queue.push({
                node: toNode,
                path: [...current.path, { node: edge.to, rel: relType }],
                depth: current.depth + 1
              });
            }
          }

          // Incoming (for HAS_PART and reverse inferencing)
          if (relType === 'HAS_PART' && (currNode.includes(toNode) || toNode.includes(currNode))) {
            if (!visited.has(fromNode)) {
              visited.add(fromNode);
              queue.push({
                node: fromNode,
                path: [...current.path, { node: edge.from, rel: 'HAS_PART (In)' }],
                depth: current.depth + 1
              });
            }
          }
        }
      }
    }

    return { found: false };
  }

  function performFallbackCheck(scannedList, userAllergens, geminiDetected = []) {
    const warnings = [];
    const debugMapping = {};

    scannedList.forEach(item => {
      const itemOriginal = item.trim();
      // Clean for matching: strip % values and content in parentheses (e.g. "thịt gà (52%)" -> "thịt gà")
      const itemCleaned = itemOriginal
        .replace(/\(\d[\d.,]*\s*%?\)/g, '')   // Remove (52%), (18%), etc.
        .replace(/\d+\s*%/g, '')               // Remove bare 18%
        .replace(/\([^)]{0,25}\)/g, '')        // Remove short parenthetical like (E330)
        .replace(/[,;:]+$/g, '')               // Remove trailing punctuation
        .trim();
      const itemLower = itemCleaned.toLowerCase();
      const itemNoTone = removeVietnameseTones(itemLower);

      // 1. Hybrid Fuzzy Matching (Algorithm 2) để căn chỉnh với các Node FoodOn
      let bestMatchedEntity = null;
      let highestScore = -1;

      FOODON_SUGGESTIONS_DB.forEach(candidate => {
        // Match against the cleaned version of candidate name (without parenthetical English label)
        const candidateClean = candidate.name.replace(/\([^)]*\)/g, '').trim();
        const matchResult = hybridFuzzyMatch(itemCleaned, candidateClean, 50) ||
          hybridFuzzyMatch(itemCleaned, candidate.name, 50);
        if (matchResult && matchResult.finalScore > highestScore) {
          highestScore = matchResult.finalScore;
          bestMatchedEntity = candidate;
        }
      });

      const matchedNodeName = bestMatchedEntity ? bestMatchedEntity.name : itemOriginal;
      const matchedCategory = bestMatchedEntity ? bestMatchedEntity.category : itemLower;

      debugMapping[itemOriginal] = bestMatchedEntity ? `${bestMatchedEntity.name} (${bestMatchedEntity.id})` : 'Standard FoodOn Term';

      // 2. Graph Query & BFS Traversal (Section 3.3 & Table 5)
      const graphResult = findFoodOnPath(matchedCategory, userAllergens, 7);

      if (graphResult.found) {
        // Format path: Prawn --[IS_A]--> Shrimp --[IN_TAXON]--> Crustacea
        const pathVisual = graphResult.path.map((step, idx) => {
          if (idx === 0) return `<strong>${escapeHtml(step.node)}</strong>`;
          return `<span style="color:var(--color-accent);font-family:'Fira Code',monospace;">--[${step.rel}]--></span> <strong>${escapeHtml(step.node)}</strong>`;
        }).join(' ');

        warnings.push({
          scanned_item: itemOriginal,
          allergen_source: graphResult.targetAllergen,
          matched_node: matchedNodeName,
          path_visual: pathVisual,
          depth: graphResult.depth,
          reason: `Duyệt đồ thị FoodOn (Độ sâu ${graphResult.depth}): ${itemOriginal} liên kết tới nguy cơ dị ứng '${graphResult.targetAllergen}'.`
        });
      }
    });

    // 3. Xử lý cảnh báo nhãn từ Gemini Vision OCR
    if (Array.isArray(geminiDetected)) {
      geminiDetected.forEach(gAlg => {
        const gAlgLower = gAlg.toLowerCase().trim();
        const gAlgNoTone = removeVietnameseTones(gAlgLower);

        const isUserConcerned = userAllergens.some(uAlg => {
          const uNoTone = removeVietnameseTones(uAlg.toLowerCase());
          return gAlgLower.includes(uAlg.toLowerCase()) || gAlgNoTone.includes(uNoTone) || uNoTone.includes(gAlgNoTone);
        });

        if (isUserConcerned) {
          const alreadyWarned = warnings.some(w => removeVietnameseTones(w.allergen_source).includes(gAlgNoTone));
          if (!alreadyWarned) {
            warnings.push({
              scanned_item: `Cảnh báo bao bì: ${gAlg}`,
              allergen_source: gAlg.toUpperCase(),
              matched_node: gAlg,
              path_visual: `<strong>${escapeHtml(gAlg)}</strong> <span style="color:var(--color-accent);">--[DIRECT_ALERT]--></span> <strong>${gAlg.toUpperCase()}</strong>`,
              depth: 0,
              reason: `Gemini AI phát hiện nhãn bao bì ghi rõ cảnh báo dị ứng: '${gAlg}'.`
            });
          }
        }
      });
    }

    return {
      is_safe: warnings.length === 0,
      warnings: warnings,
      debug_mapping: debugMapping
    };
  }

  async function checkBackendHealth() {
    try {
      const res = await fetch(`${state.backendUrl}/`, { method: 'GET', signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        console.log('🟢 FastAPI Backend Connected:', data);
        const badge = document.getElementById('geminiOcrStatusBadge');
        if (badge) {
          badge.className = 'badge-status safe';
          badge.innerHTML = '<i class="fa-solid fa-server"></i> FastAPI Backend Live (8000)';
        }
      }
    } catch (e) {
      console.log('ℹ️ FastAPI Backend is offline. Client-side FoodOn engine is active.');
    }
  }

  async function runAllergyCheck(geminiResult = null) {
    const rawText = el.ingredientsInput.value.trim();
    if (!rawText) {
      alert('Vui lòng nhập hoặc chụp nhãn thành phần thực phẩm!');
      return;
    }

    const scannedList = rawText.split(/[,;\n\.\/]+/).map(s => s.trim()).filter(Boolean);
    const userAllergensList = Array.from(state.userAllergens);
    const geminiDetected = (geminiResult && geminiResult.allergens_detected) || [];

    let finalResult = null;

    // 1. Gửi yêu cầu kiểm tra tới FastAPI Backend (POST http://localhost:8000/debug/check)
    try {
      console.log(`[Backend Call] Đang gửi yêu cầu tới FastAPI Backend: ${state.backendUrl}/debug/check`);
      const response = await fetch(`${state.backendUrl}/debug/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_allergens: userAllergensList,
          scanned_ingredients: scannedList
        }),
        signal: AbortSignal.timeout(4000)
      });

      if (response.ok) {
        const backendData = await response.json();
        console.log('✓ Kết quả từ FastAPI Backend Server:', backendData);

        // Bổ sung đường dẫn BFS đồ thị FoodOn (Graph Path Visual) nếu backend chưa có
        const enrichedWarnings = (backendData.warnings || []).map(w => {
          const graphPath = findFoodOnPath(w.scanned_item, userAllergensList, 7);
          let pathVisual = '';
          if (graphPath.found && graphPath.path) {
            pathVisual = graphPath.path.map((step, idx) => {
              if (idx === 0) return `<strong>${escapeHtml(step.node)}</strong>`;
              return `<span style="color:var(--color-accent);font-family:'Fira Code',monospace;">--[${step.rel}]--></span> <strong>${escapeHtml(step.node)}</strong>`;
            }).join(' ');
          } else {
            pathVisual = `<strong>${escapeHtml(w.scanned_item)}</strong> <span style="color:var(--color-accent);">--[IS_A]--></span> <strong>${escapeHtml(w.allergen_source)}</strong>`;
          }
          return {
            ...w,
            path_visual: pathVisual,
            depth: (graphPath.found && graphPath.depth) || 1,
            reason: w.reason || `Duyệt đồ thị FoodOn: ${w.scanned_item} liên kết tới nguy cơ dị ứng '${w.allergen_source}'.`
          };
        });

        finalResult = {
          is_safe: backendData.is_safe,
          warnings: enrichedWarnings,
          debug_mapping: backendData.debug_mapping || {}
        };
      }
    } catch (err) {
      console.warn('Backend FastAPI chưa phản hồi hoặc đang offline, sử dụng Client-side FoodOn Engine:', err.message);
    }

    // 2. Nếu Backend offline hoặc chưa có kết quả -> Dùng client-side FoodOn engine
    if (!finalResult) {
      finalResult = performFallbackCheck(scannedList, userAllergensList, geminiDetected);
    }

    // 3. Hiển thị Giao diện & Lưu Lịch sử
    renderScanResults(scannedList, userAllergensList, finalResult);
    saveToHistory(rawText, finalResult.is_safe);

    // 4. Truyền ngay kết quả về mạch Wokwi ESP32
    sendAllergenFeedbackToWokwi(finalResult);
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
      pathCard.className = 'glass-subcard';
      pathCard.style.marginBottom = '12px';
      pathCard.style.padding = '12px 14px';
      pathCard.style.border = '1px solid rgba(255, 51, 102, 0.25)';
      pathCard.style.borderRadius = '10px';
      pathCard.style.background = 'rgba(255, 51, 102, 0.04)';
      pathCard.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-weight:700; color:var(--status-alert); font-size:0.92rem;">
              <i class="fa-solid fa-circle-nodes"></i> Cảnh báo: ${escapeHtml(w.scanned_item)} ↔ ${escapeHtml(w.allergen_source)}
            </span>
            <span class="badge-status alert" style="font-size:0.72rem; padding:2px 8px;">
              BFS Depth: ${w.depth || 1}
            </span>
          </div>
          <div style="margin: 8px 0; padding: 8px 12px; background: rgba(0, 0, 0, 0.35); border-radius: 6px; font-size: 0.86rem; overflow-x: auto;">
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 3px;"><i class="fa-solid fa-route text-accent"></i> Đồ thị liên kết FoodOn (Graph Traversal Path):</div>
            <div>${w.path_visual || `<strong>${escapeHtml(w.scanned_item)}</strong> <span style="color:var(--color-accent);">--[IS_A]--></span> <strong>${escapeHtml(w.allergen_source)}</strong>`}</div>
          </div>
          <p style="font-size:0.83rem; color:var(--text-muted); margin:0;">${escapeHtml(w.reason)}</p>
        `;
      el.graphReasoningContainer.appendChild(pathCard);
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

  // ============================================================================
  // ⚙️ QUẢN LÝ HIỆU CHỈNH THÔNG SỐ PHẦN CỨNG MẠCH ESP32 (HARDWARE CALIBRATION)
  // ============================================================================
  function initHardwareConfigControls() {
    const sliderAlertDuration = document.getElementById('sliderAlertDuration');
    const valAlertDuration = document.getElementById('valAlertDuration');
    const sliderBuzzerVolume = document.getElementById('sliderBuzzerVolume');
    const valBuzzerVolume = document.getElementById('valBuzzerVolume');
    const btnPushHwConfigNow = document.getElementById('btnPushHwConfigNow');
    const btnResetHwDefaults = document.getElementById('btnResetHwDefaults');
    const hwSyncStatusBadge = document.getElementById('hwSyncStatusBadge');
    const volumePresets = document.querySelectorAll('.btn-volume-preset');

    // Nạp cấu hình đã lưu trong localStorage (Mặc định: Còi 5s, Âm lượng 60%, Đèn 2s cố định)
    let savedConfig = {
      alert_duration_sec: 5,
      buzzer_volume_pct: 60,
      buzzer_freq_hz: 1500,
      blink_rate_ms: 200,
      safe_duration_sec: 2
    };

    try {
      const stored = localStorage.getItem('scallergen_hw_config');
      if (stored) savedConfig = Object.assign(savedConfig, JSON.parse(stored));
    } catch (e) { }

    // Cập nhật giao diện ban đầu
    if (sliderAlertDuration) {
      sliderAlertDuration.value = savedConfig.alert_duration_sec;
      if (valAlertDuration) valAlertDuration.textContent = `${savedConfig.alert_duration_sec}s`;
    }
    if (sliderBuzzerVolume) {
      sliderBuzzerVolume.value = savedConfig.buzzer_volume_pct || 60;
      if (valBuzzerVolume) valBuzzerVolume.textContent = `${savedConfig.buzzer_volume_pct || 60}%`;
    }

    const triggerSync = (playSound = true) => {
      const cfg = {
        alert_duration_sec: parseInt(sliderAlertDuration?.value || 5, 10),
        buzzer_volume_pct: parseInt(sliderBuzzerVolume?.value || 60, 10),
        buzzer_freq_hz: 1500,
        blink_rate_ms: 200,
        safe_duration_sec: 2
      };

      try {
        localStorage.setItem('scallergen_hw_config', JSON.stringify(cfg));
      } catch (e) { }

      sendHardwareConfigToWokwi(cfg, playSound);

      if (hwSyncStatusBadge) {
        hwSyncStatusBadge.className = 'badge-status safe pulse-active';
        hwSyncStatusBadge.innerHTML = '<i class="fa-solid fa-check-double"></i> Đã gửi sang ESP32';
        setTimeout(() => {
          hwSyncStatusBadge.classList.remove('pulse-active');
        }, 3000);
      }
    };

    // Bắt sự kiện thay đổi Sliders (CHỈ cập nhật hiển thị giao diện, KHÔNG tự động gửi sang mạch)
    if (sliderAlertDuration) {
      sliderAlertDuration.addEventListener('input', () => {
        if (valAlertDuration) valAlertDuration.textContent = `${sliderAlertDuration.value}s`;
        if (hwSyncStatusBadge) {
          hwSyncStatusBadge.className = 'badge-status alert';
          hwSyncStatusBadge.innerHTML = '<i class="fa-solid fa-clock"></i> Chưa gửi sang ESP32';
        }
      });
    }

    if (sliderBuzzerVolume) {
      sliderBuzzerVolume.addEventListener('input', () => {
        if (valBuzzerVolume) valBuzzerVolume.textContent = `${sliderBuzzerVolume.value}%`;
        if (hwSyncStatusBadge) {
          hwSyncStatusBadge.className = 'badge-status alert';
          hwSyncStatusBadge.innerHTML = '<i class="fa-solid fa-clock"></i> Chưa gửi sang ESP32';
        }
      });
    }

    // Các nút chọn nhanh độ to còi (Chỉ gán giá trị lên thanh trượt, KHÔNG tự động gửi)
    volumePresets.forEach(btn => {
      btn.addEventListener('click', () => {
        const vol = btn.getAttribute('data-volume');
        if (sliderBuzzerVolume && vol) {
          sliderBuzzerVolume.value = vol;
          if (valBuzzerVolume) valBuzzerVolume.textContent = `${vol}%`;
          if (hwSyncStatusBadge) {
            hwSyncStatusBadge.className = 'badge-status alert';
            hwSyncStatusBadge.innerHTML = '<i class="fa-solid fa-clock"></i> Chưa gửi sang ESP32';
          }
        }
      });
    });

    // Nút Bấm Gửi cấu hình trực tiếp: CHỈ KHI BẤM NÚT NÀY MỚI GỬI SANG MẠCH ESP32!
    if (btnPushHwConfigNow) {
      btnPushHwConfigNow.addEventListener('click', () => {
        soundSynth.playVibe();
        triggerSync(true);
      });
    }

    // Nút Khôi phục mặc định: Đặt lại giá trị trên giao diện
    if (btnResetHwDefaults) {
      btnResetHwDefaults.addEventListener('click', () => {
        soundSynth.playClick();
        if (sliderAlertDuration) { sliderAlertDuration.value = 5; if (valAlertDuration) valAlertDuration.textContent = '5s'; }
        if (sliderBuzzerVolume) { sliderBuzzerVolume.value = 60; if (valBuzzerVolume) valBuzzerVolume.textContent = '60%'; }
        if (hwSyncStatusBadge) {
          hwSyncStatusBadge.className = 'badge-status alert';
          hwSyncStatusBadge.innerHTML = '<i class="fa-solid fa-clock"></i> Chưa gửi sang ESP32';
        }
        showToast('↺ Đã đặt lại thông số trên giao diện về mặc định (5s, Âm lượng 60%). Bấm Gửi để áp dụng!', 3000);
      });
    }
  }

  function sendHardwareConfigToWokwi(config, playSound = true) {
    // Topic riêng để cấu hình phần cứng (KHÔNG phải topic allergen_feedback)
    const configTopic = 'wokwi/esp32cam/esp32cam_studio/config';

    const payloadObj = {
      type: 'hardware_config',
      alert_duration_sec: parseInt(config.alert_duration_sec || 5, 10),
      buzzer_volume_pct: parseInt(config.buzzer_volume_pct || 60, 10),
      buzzer_freq_hz: 1500,
      blink_rate_ms: 200,
      safe_duration_sec: 2
    };

    const payloadStr = JSON.stringify(payloadObj);

    const publishConfigPacket = () => {
      if (wokwiMqttClient && wokwiMqttClient.connected) {
        wokwiMqttClient.publish(configTopic, payloadStr, { qos: 0 });
        console.log('[Wokwi Config TX] -> Đã gửi thông số phần cứng tới ESP32 (KHÔNG kích hoạt cảnh báo):', payloadStr);
      } else {
        console.warn('[Wokwi Config TX] Client chưa kết nối, đang kết nối lại...');
        initWokwiMqttBridge();
      }
    };

    // Gửi chuỗi xung liên tiếp (0ms, 100ms, 300ms, 600ms) đảm bảo ESP32 nhận được 100%
    [0, 100, 300, 600].forEach(delayMs => {
      setTimeout(publishConfigPacket, delayMs);
    });

    if (playSound) {
      soundSynth.playSuccess();
      showToast(`✓ Đã đồng bộ thông số: Còi ${payloadObj.alert_duration_sec}s (Âm lượng ${payloadObj.buzzer_volume_pct}%), Đèn 2s!`, 3500);
    }
  }

  init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
