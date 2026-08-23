// UI UTILITIES & ANIMATIONS
  function switchScreen(screenName) {
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

  // Initialize App
  function attachAudioFeedback() {
    // Disabled by user request
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

  function showToast(msg, duration = 3500) {
    if (el.hapticToast && el.hapticToastText) {
      el.hapticToastText.textContent = msg;
      el.hapticToast.classList.remove('hidden');
      clearTimeout(window._toastTimeout);
      window._toastTimeout = setTimeout(() => {
        el.hapticToast.classList.add('hidden');
      }, duration);
    }
  }

  // ============================================================================
  // GOOGLE GEMINI VISION OCR API INTEGRATION (TỰ ĐỘNG XOAY MODEL & DỰ PHÒNG RATE LIMIT)
  // ============================================================================
  let currentOcrSessionId = 0;
  let currentOcrAbortController = null;

  async function callGeminiVisionAPI(base64Data, mimeType = 'image/jpeg', signal = null) {
    const apiKey = (GEMINI_CONFIG.API_KEY || state.geminiApiKey || localStorage.getItem('scallergen_gemini_api_key') || '').trim();

    if (!apiKey) {
      showToast('⚠️ Vui lòng mở Cài đặt (bánh răng) và nhập Gemini API Key!', 4500);
      throw new Error('Chưa cấu hình API Key. Hãy bấm vào biểu tượng Cài Đặt (bánh răng) ở góc trên để dán API Key');
    }

    // Danh sách model ưu tiên hoạt động 100% với key của bạn
    const candidateModels = [
      'gemini-flash-latest',       // Model chính thức hoạt động 100%
      'gemini-flash-lite-latest',  // Model siêu tốc dự phòng
      'gemini-pro-latest'          // Model nâng cao
    ];

    const promptText = `Bạn là hệ thống AI đa luồng (ScAllergen & Traffic AI). Nhiệm vụ của bạn là phân tích hình ảnh và phân loại thành 2 trường hợp:

Trường hợp 1: Hình ảnh là Bao bì thực phẩm / Nhãn dán thành phần món ăn
- Trích xuất tên sản phẩm (product_name).
- Trích xuất TOÀN BỘ danh sách thành phần thành một chuỗi tiếng Việt, cách nhau bằng dấu phẩy (ingredients_text).
- Trích xuất các cảnh báo dị ứng nếu có (allergens_detected).
- Gán food_type là "food".
- Đặt traffic_light_color và red_light_duration_seconds là null.

Trường hợp 2: Hình ảnh là Đèn Giao Thông (hoặc màn hình đếm ngược đèn giao thông)
- Nhận diện màu đèn giao thông hiện tại (traffic_light_color): "red", "green", hoặc "yellow".
- Nhận diện số giây đếm ngược nếu có trên đèn (red_light_duration_seconds). Nếu không thấy số, trả về null.
- Gán food_type là "traffic_light".
- Gán product_name là "Đèn Giao Thông".
- Đặt ingredients_text và allergens_detected là rỗng/null.

Luôn trả về JSON tuân thủ chuẩn sau (không thêm markdown code block):
{
  "product_name": "Tên sản phẩm",
  "food_type": "food | traffic_light | unknown",
  "ingredients_text": "thành phần 1, thành phần 2...",
  "allergens_detected": ["dị ứng 1", "dị ứng 2"],
  "traffic_light_color": "red | green | yellow | null",
  "red_light_duration_seconds": 15,
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
        const candidateText = (resultData.candidates && resultData.candidates[0] && resultData.candidates[0].content && resultData.candidates[0].content.parts && resultData.candidates[0].content.parts[0]) ? resultData.candidates[0].content.parts[0].text : '';
        if (!candidateText) {
          throw new Error('API không trả về văn bản nhận diện!');
        }

        let parsed;
        try {
          const cleanJson = candidateText.replace(/```json/gi, '').replace(/```/g, '').trim();
          parsed = JSON.parse(cleanJson);
        } catch (e) {
          parsed = {
            product_name: "Kết quả quét",
            food_type: "unknown",
            ingredients_text: candidateText.replace(/\n/g, ', '),
            allergens_detected: [],
            traffic_light_color: null,
            red_light_duration_seconds: null,
            summary: candidateText
          };
        }
        return parsed;
      } catch (err) {
        lastError = err;
        if (err.name === 'AbortError' || (signal && signal.aborted)) throw err;
        console.warn(`[Gemini Fail] ${currentModel} lỗi (${err.message}). Thử model tiếp theo...`);
      }
    }

    throw lastError || new Error('Tất cả các mô hình Gemini đều bị quá hạn mức miễn phí (Rate Limit). Vui lòng thử lại sau vài giây.');
  }

