// SỰ KIỆN TƯƠNG TÁC (DOM EVENTS)
  function bindEvents() {
    // Landing Page Controls
    if (el.btnExploreDashboardQuick) {
      el.btnExploreDashboardQuick.addEventListener('click', () => {
        switchScreen('dashboard');
      });
    }

    if (el.btnGuestAccess) {
      el.btnGuestAccess.addEventListener('click', async () => {
        state.currentUser = { email: 'guest@sadieslink.ai', displayName: 'Bình (Guest)', uid: 'guest_user' };
        if (el.dashboardUserEmailText) el.dashboardUserEmailText.textContent = 'Bình (Guest)';
        await fetchUserDataFromFirebase(state.currentUser);
        switchScreen('dashboard');
      });
    }

    if (el.btnLogoutDashboard) {
      el.btnLogoutDashboard.addEventListener('click', async () => {
        localStorage.removeItem('scallergen_auto_login');
        if (window.firebase && window.firebase.auth) {
          try { await window.firebase.auth().signOut(); } catch (e) {}
        }
        state.currentUser = null;
        state.userAllergens.clear();
        state.history = [];
        renderAllergenTags();
        renderHistory();
        switchScreen('landing');
        showToast('ℹ️ Đã đăng xuất khỏi Dashboard', 2500);
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
        if (bearCtrl) {
          const isShown = bearCtrl.toggleShowPassword();
          el.landingLoginPassword.type = isShown ? 'text' : 'password';
          el.eyeIconLanding.className = isShown ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        }
      });
    }

    if (el.btnToggleAuthModeLanding) {
      el.btnToggleAuthModeLanding.addEventListener('click', () => {
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

    // Main Dashboard Tabs Navigation
    const mainTabBtns = document.querySelectorAll('.main-tab-btn');
    const moduleSections = document.querySelectorAll('.module-section');
    mainTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.maintab;

        mainTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        moduleSections.forEach(sec => {
          if (sec.id.includes(targetTab)) {
            sec.classList.remove('hidden');
            sec.classList.add('active');
            sec.style.display = '';
          } else {
            sec.classList.add('hidden');
            sec.classList.remove('active');
            sec.style.display = 'none';
          }
        });

        // Đảm bảo không bị lọt UI của Nutri sang tab Giao Thông
        const resSec = document.getElementById('resultsSection');
        const histSec = document.getElementById('mod-history');
        if (targetTab === 'traffic') {
          if (resSec) resSec.style.display = 'none';
          if (histSec) histSec.style.display = 'none';
        } else {
          if (histSec) histSec.style.display = '';
        }
      });
    });

    // Component View Control Navigation Tabs (Toggle open/close any card)
    const cardTogglePills = document.querySelectorAll('.card-toggle-pill');
    cardTogglePills.forEach(pill => {
      pill.addEventListener('click', () => {
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
      addAllergen(el.allergenInput.value);
    });

    el.allergenInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
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
        removeAllergen(e.target.dataset.allergen);
      }
    });

    document.querySelectorAll('.profile-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const key = chip.dataset.profile;
        if (PRESET_PROFILES[key]) {
          PRESET_PROFILES[key].forEach(alg => state.userAllergens.add(alg));
          renderAllergenTags();
        }
      });
    });

    document.querySelectorAll('.glass-pill-preset').forEach(btn => {
      btn.addEventListener('click', () => {
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
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
      });
    });

    if (el.clearIngredientsBtn) {
      el.clearIngredientsBtn.addEventListener('click', () => {
        el.ingredientsInput.value = '';
      });
    }

    if (el.runCheckBtn) {
      el.runCheckBtn.addEventListener('click', () => {
        runAllergyCheck();
      });
    }

    if (el.closeResultsBtn) {
      el.closeResultsBtn.addEventListener('click', () => {
        if (typeof window.snapDisintegrate === 'function') {
          window.snapDisintegrate(el.resultsSection);
        } else {
          el.resultsSection.classList.add('hidden');
        }
      });
    }

    if (el.toggleDebugJsonBtn) {
      el.toggleDebugJsonBtn.addEventListener('click', () => {
        if (el.debugJsonCode) el.debugJsonCode.classList.toggle('hidden');
      });
    }

    if (el.clearHistoryBtn) {
      el.clearHistoryBtn.addEventListener('click', () => {
        state.history = [];
        localStorage.removeItem('scallergen_history');
        renderHistory();
      });
    }
    if (el.openSettingsBtn) {
      el.openSettingsBtn.addEventListener('click', () => {
        if (el.backendUrlInput) el.backendUrlInput.value = state.backendUrl;
        if (el.geminiApiKeyInput) el.geminiApiKeyInput.value = state.geminiApiKey || (localStorage.getItem('scallergen_gemini_api_key') || '');
        if (el.geminiModelSelect) el.geminiModelSelect.value = state.geminiModel;
        if (el.serverTestResult) el.serverTestResult.style.display = 'none';
        if (el.settingsModal) el.settingsModal.classList.remove('hidden');
      });
    }

    // OCR File Input and Dropzone Events
    if (el.btnSelectOcrFile && el.ocrFileInput) {
      el.btnSelectOcrFile.addEventListener('click', () => {
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
      const clipData = e.clipboardData || window.clipboardData;
      const items = clipData ? clipData.items : null;
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
        if (state.lastWokwiBlob) {
          processImageForOcr(state.lastWokwiBlob, '📸 Wokwi ESP32-CAM');
        } else {
          showToast('⚠️ Chưa có ảnh từ Wokwi ESP32. Hãy bấm nút xanh trên mạch Wokwi trước!', 3000);
        }
      });
    }

    if (el.btnRunGeminiOcrNow) {
      el.btnRunGeminiOcrNow.addEventListener('click', () => {
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
        if (el.backendUrlInput) state.backendUrl = el.backendUrlInput.value.trim();
        if (el.geminiApiKeyInput) state.geminiApiKey = el.geminiApiKeyInput.value.trim();
        if (el.geminiModelSelect) state.geminiModel = el.geminiModelSelect.value;

        localStorage.setItem('scallergen_backend_url', state.backendUrl);
        localStorage.setItem('scallergen_gemini_api_key', state.geminiApiKey);
        if (state.geminiModel) localStorage.setItem('scallergen_gemini_model', state.geminiModel);

        if (el.settingsModal) el.settingsModal.classList.add('hidden');
        showToast('✓ Đã lưu cài đặt Server & Gemini API Key thành công!', 2500);
        checkBackendHealth();
      });
    }


  }

  function addAllergen(text) {
    const clean = text.trim().toLowerCase();
    if (!clean) return;
    state.userAllergens.add(clean);
    el.allergenInput.value = '';
    hideFuzzyDropdown();
    renderAllergenTags();
    syncUserDataToFirebase();
  }

  function removeAllergen(text) {
    state.userAllergens.delete(text);
    renderAllergenTags();
    syncUserDataToFirebase();
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

