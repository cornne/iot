// GEMINI VISION AI API INTEGRATION
  async function processImageForOcr(fileOrBlob, sourceLabel = '📁 Tải lên từ máy') {
    if (!fileOrBlob) return;

    // Chặn quét lặp nếu đang có một tiến trình quét khác đang chạy
    if (state.isScanning) {
      console.log('[OCR] Đang trong tiến trình quét, bỏ qua yêu cầu trùng lặp...');
      return;
    }

    state.isScanning = true;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
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

        // Cập nhật ảnh chụp cho tab Giao Thông
        const trafficImg = document.getElementById('trafficCapturedImg');
        const trafficPlaceholder = document.getElementById('trafficOfflinePlaceholder');
        if (trafficImg && trafficPlaceholder) {
          trafficImg.src = dataUrl;
          trafficImg.style.display = 'block';
          trafficPlaceholder.style.display = 'none';
        }

        if (el.ocrTabBtn && !sourceLabel.includes('Wokwi')) el.ocrTabBtn.click();

        try {
          console.log('[OCR] Bắt đầu gọi Gemini Vision API...');
          const geminiResult = await callGeminiVisionAPI(base64Data, mimeType);

          if (geminiResult.food_type && geminiResult.food_type.toLowerCase().includes('traffic')) {
            state.lastScannedProductName = 'Đèn giao thông';

            // Tự động chuyển qua tab Giao thông để người dùng thấy kết quả
            const trafficTabBtn = document.querySelector('.main-tab-btn[data-maintab="traffic"]');
            if (trafficTabBtn) trafficTabBtn.click();

            const trafficLog = document.getElementById('trafficAnalysisLog');
            if (trafficLog) {
              const timeStr = new Date().toLocaleTimeString('vi-VN');
              const tColorStr = (geminiResult.traffic_light_color || 'unknown').toUpperCase();
              let logMsg = `> [${timeStr}] AI Nhận diện: ĐÈN ${tColorStr}`;
              if (geminiResult.red_light_duration_seconds != null) {
                logMsg += ` | Đếm ngược: ${geminiResult.red_light_duration_seconds}s`;
              }
              trafficLog.innerHTML += `<br><span style="color: #00f2fe">${logMsg}</span>`;
              trafficLog.scrollTop = trafficLog.scrollHeight;
            }

            const tColor = geminiResult.traffic_light_color || 'unknown';
            const seconds = geminiResult.red_light_duration_seconds;

            if (tColor === 'red') {
              triggerERMVibration('alert');
              if (seconds !== null && seconds > 5) {
                const delayMs = (seconds - 5) * 1000;
                showToast(`⏳ Hệ thống sẽ cảnh báo về Wokwi sau ${(seconds - 5)} giây nữa...`, 4000);
                setTimeout(() => {
                  showToast(`🚨 BÁO ĐỘNG: Chuẩn bị chuyển đèn Xanh (còn 5s)!`, 4000);
                  if (typeof window.triggerWokwiAlertDirectly === 'function') window.triggerWokwiAlertDirectly({ is_safe: false, warnings: [{ allergen_source: 'DEN DO' }] });
                }, delayMs);
              } else {
                showToast(`🚨 Cảnh báo Wokwi kích hoạt lập tức!`, 3000);
                if (typeof window.triggerWokwiAlertDirectly === 'function') window.triggerWokwiAlertDirectly({ is_safe: false, warnings: [{ allergen_source: 'DEN DO' }] });
              }
            } else if (tColor === 'green') {
              triggerERMVibration('safe');
              if (typeof window.triggerWokwiSafeDirectly === 'function') window.triggerWokwiSafeDirectly({ is_safe: true, traffic_mode: true });
            }

            return; // KHÔNG chạy kiểm tra dị ứng
          }

          // ---- NHÁNH XỬ LÝ THỰC PHẨM BÌNH THƯỜNG ----
          state.lastScannedProductName = geminiResult.product_name || 'Sản phẩm nhãn thực phẩm';

          if (el.detectedProductName) {
            el.detectedProductName.innerHTML = `<i class="fa-solid fa-box-open text-accent"></i> ${escapeHtml(state.lastScannedProductName)}`;
          }
          if (el.extractedTextContent) {
            el.extractedTextContent.textContent = geminiResult.ingredients_text || 'Đã phân tích thành phần xong.';
          }
          if (el.geminiOcrStatusBadge) {
            el.geminiOcrStatusBadge.className = 'badge-status safe';
            el.geminiOcrStatusBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Gemini OCR Hoàn tất';
          }

          if (el.ingredientsInput && geminiResult.ingredients_text) {
            el.ingredientsInput.value = geminiResult.ingredients_text;
          }

          showToast(`✓ Gemini AI đã phân tích: ${state.lastScannedProductName}!`, 3000);

          await runAllergyCheck(geminiResult);
        } catch (err) {
          console.warn('Gemini Vision OCR Error:', err.message);

          const isMissingKey = !apiKey;
          const errReason = isMissingKey
            ? 'Chưa cấu hình Gemini API Key. Vui lòng mở biểu tượng Cài Đặt (bánh răng) để nhập API Key!'
            : `Lỗi kết nối API: ${err.message}. Có thể do hết Quota hoặc lỗi mạng.`;

          showToast(`⚠️ ${errReason}`, 5000);

          if (el.statusHeroBanner) el.statusHeroBanner.className = 'result-status-card danger';
          if (el.statusIcon) el.statusIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
          if (el.statusTitle) el.statusTitle.textContent = 'LỖI NHẬN DIỆN AI';
          if (el.statusSubtitle) el.statusSubtitle.textContent = errReason;

          if (el.resultsSection) {
            el.resultsSection.style.display = '';
            el.resultsSection.style.opacity = '1';
            el.resultsSection.style.transform = 'scale(1)';
            el.resultsSection.classList.remove('hidden');
          }

          const trafficLog = document.getElementById('trafficAnalysisLog');
          if (trafficLog) {
            trafficLog.innerHTML += `<br><span style="color: #ff3366">> LỖI: ${errReason}</span>`;
            trafficLog.scrollTop = trafficLog.scrollHeight;
          }

          if (typeof window.triggerWokwiAlertDirectly === 'function') {
            window.triggerWokwiAlertDirectly();
          }

          return;
        }
      } finally {
        if (el.ocrLoadingCard) el.ocrLoadingCard.classList.add('hidden');
        if (el.laserScanLine) el.laserScanLine.style.display = 'none';
        state.isScanning = false; // Quét xong hoàn toàn, giải phóng khóa!
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
