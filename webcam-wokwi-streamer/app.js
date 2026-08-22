/**
 * Wokwi Vision Studio — Food Label Image Bridge & Hardware Trigger Relay
 * ----------------------------------------------------------------------
 * 1. Cho phép Upload ảnh nhãn thực phẩm hoặc chọn mẫu nhãn có sẵn.
 * 2. Lắng nghe tín hiệu Bấm Nút Xanh (GPIO 4) từ mạch Wokwi ESP32 (Topic: /trigger_capture).
 * 3. Khi bấm nút, tự động gửi bức ảnh đang chọn sang ScAllergen Web qua Topic: /output_jpeg.
 * 4. Hiển thị phản hồi dị ứng nhận được từ ScAllergen Web.
 */

// State Management
const state = {
  channelId: 'esp32cam_studio',
  brokerUrl: 'wss://broker.emqx.io:8084/mqtt',
  currentImageBlob: null,
  currentImageDataUrl: null,
  currentImageTitle: 'Chưa chọn ảnh',
  
  mqttClient: null,
  isConnectedMqtt: false,
  
  triggerCount: 0,
  lastFeedback: null,
};

// DOM Elements
const elements = {
  brokerPresetSelect: document.getElementById('brokerPresetSelect'),
  mqttBroker: document.getElementById('mqttBroker'),
  channelId: document.getElementById('channelId'),
  btnRandomChannel: document.getElementById('btnRandomChannel'),
  btnConnectMqtt: document.getElementById('btnConnectMqtt'),
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),
  wokwiStatusText: document.getElementById('wokwiStatusText'),
  
  uploadDropzone: document.getElementById('uploadDropzone'),
  fileInput: document.getElementById('fileInput'),
  btnManualSend: document.getElementById('btnManualSend'),
  presetBtns: document.querySelectorAll('.preset-btn'),
  
  selectedImagePreview: document.getElementById('selectedImagePreview'),
  imagePlaceholder: document.getElementById('imagePlaceholder'),
  laserScanLine: document.getElementById('laserScanLine'),
  currentImageTitle: document.getElementById('currentImageTitle'),
  imgResolution: document.getElementById('imgResolution'),
  
  statButtonStatus: document.getElementById('statButtonStatus'),
  statFileSize: document.getElementById('statFileSize'),
  statTriggerCount: document.getElementById('statTriggerCount'),
  statLastFeedback: document.getElementById('statLastFeedback'),
  
  activityLogs: document.getElementById('activityLogs'),
  btnClearLogs: document.getElementById('btnClearLogs'),
  
  btnOpenWokwiModal: document.getElementById('btnOpenWokwiModal'),
  wokwiModal: document.getElementById('wokwiModal'),
  btnCloseModal: document.getElementById('btnCloseModal'),
  btnCloseModal2: document.getElementById('btnCloseModal2'),
  codeSketch: document.getElementById('codeSketch'),
  btnCopySketch: document.getElementById('btnCopySketch'),
  toastContainer: document.getElementById('toastContainer'),
  compressCanvas: document.getElementById('compressCanvas'),
};

// Logger Helper
function logActivity(message, type = 'info') {
  const timeStr = new Date().toLocaleTimeString('vi-VN');
  const colorMap = {
    info: 'var(--text-muted)',
    success: '#00f5a0',
    alert: '#ff3366',
    trigger: '#00f2fe',
  };
  const color = colorMap[type] || 'var(--text-muted)';
  
  const line = document.createElement('div');
  line.style.color = color;
  line.innerHTML = `[${timeStr}] ${message}`;
  
  elements.activityLogs.appendChild(line);
  elements.activityLogs.scrollTop = elements.activityLogs.scrollHeight;
}

// Toast Helper
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'circle-check' : type === 'alert' ? 'triangle-exclamation' : 'circle-info'}"></i> ${message}`;
  
  elements.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================================================
// Sample Food Label Generator (Sử dụng Canvas tạo ảnh nhãn thực tế sắc nét)
// ============================================================================
function generateSampleLabel(type) {
  const canvas = elements.compressCanvas;
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');

  // Background
  const gradient = ctx.createLinearGradient(0, 0, 640, 480);
  
  let title = '';
  let subTitle = '';
  let ingredients = [];
  let warningText = '';
  let bgColor1 = '#1e293b';
  let bgColor2 = '#0f172a';
  let accentColor = '#38bdf8';

  if (type === 'peanut_milk') {
    title = 'BÁNH QUY BƠ ĐẬU PHỘNG CAO CẤP';
    subTitle = 'Premium Peanut Butter Crunchy Cookies';
    ingredients = [
      'Bột mì cao cấp (Wheat flour) 45%',
      'Đậu phộng rang nghiền (Peanuts) 22%',
      'Sữa bột nguyên kem (Whole Milk Powder) 12%',
      'Bơ thực vật, Đường tinh luyện, Lecithin đậu nành',
      'Muối i-ốt, Hương vani tổng hợp'
    ];
    warningText = '⚠️ CẢNH BÁO DỊ ỨNG: Chứa Đậu phộng (Peanuts), Sữa bò (Milk), Bột mì (Gluten).';
    bgColor1 = '#451a03';
    bgColor2 = '#1c1917';
    accentColor = '#f59e0b';
  } else if (type === 'fresh_milk') {
    title = 'SỮA TƯƠI TIỆT TRÙNG NGUYÊN CHẤT 100%';
    subTitle = '100% Pure Fresh Cow Milk';
    ingredients = [
      'Sữa bò tươi nguyên chất 100% (Fresh cow milk)',
      'Vitamin A, D3, Canxi nano tự nhiên',
      'Không chất bảo quản'
    ];
    warningText = '⚠️ CẢNH BÁO DỊ ỨNG: Sản phẩm từ Sữa bò (Cow Milk).';
    bgColor1 = '#0369a1';
    bgColor2 = '#082f49';
    accentColor = '#38bdf8';
  } else if (type === 'shrimp_chips') {
    title = 'SNACK PHỒNG TÔM CAY ĐẶC BIỆT';
    subTitle = 'Spicy Crispy Shrimp Puffs';
    ingredients = [
      'Tinh bột khoai mì 50%',
      'Thịt tôm tươi (Fresh Shrimp) 25%',
      'Dầu thực vật, Ớt bột, Bột tỏi, Đường',
      'Chất điều vị (621), Muối'
    ];
    warningText = '⚠️ CẢNH BÁO DỊ ỨNG: Chứa Giáp xác (Tôm - Crustaceans / Seafood).';
    bgColor1 = '#991b1b';
    bgColor2 = '#450a0a';
    accentColor = '#f87171';
  } else {
    // Safe bread
    title = 'BÁNH GẠO HỮU CƠ TỰ NHIÊN (AN TOÀN)';
    subTitle = 'Organic Pure Rice Crackers — 100% Allergen-Free';
    ingredients = [
      'Gạo hữu cơ Japonica 90%',
      'Đường mía tự nhiên 6%',
      'Tinh bột khoai tây, Dầu hoa hướng dương, Muối biển'
    ];
    warningText = '✓ SẢN PHẨM AN TOÀN: Không chứa Sữa, Đậu phộng, Hải sản hay Gluten.';
    bgColor1 = '#065f46';
    bgColor2 = '#022c22';
    accentColor = '#34d399';
  }

  // Draw Box
  gradient.addColorStop(0, bgColor1);
  gradient.addColorStop(1, bgColor2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 640, 480);

  // Border & Header Box
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(16, 16, 608, 448);

  ctx.fillStyle = accentColor;
  ctx.fillRect(20, 20, 600, 70);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 320, 52);

  ctx.font = '14px Outfit, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(subTitle, 320, 76);

  // Nutrition & Ingredients Box
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(36, 110, 568, 240);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(36, 110, 568, 240);

  ctx.fillStyle = accentColor;
  ctx.font = 'bold 18px Outfit, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('📋 DANH SÁCH THÀNH PHẦN (INGREDIENTS):', 56, 142);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '15px Outfit, sans-serif';
  ingredients.forEach((ing, i) => {
    ctx.fillText(`• ${ing}`, 60, 180 + i * 32);
  });

  // Warning Banner
  ctx.fillStyle = type === 'safe_bread' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.25)';
  ctx.fillRect(36, 368, 568, 70);
  ctx.strokeStyle = type === 'safe_bread' ? '#10b981' : '#ef4444';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 368, 568, 70);

  ctx.fillStyle = type === 'safe_bread' ? '#34d399' : '#fca5a5';
  ctx.font = 'bold 15px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(warningText, 320, 410);

  // Convert to Blob
  canvas.toBlob((blob) => {
    loadImageBlob(blob, title);
  }, 'image/jpeg', 0.85);
}

// Load Image Blob into UI & Memory
function loadImageBlob(blob, title = 'Ảnh Nhãn Dán') {
  state.currentImageBlob = blob;
  state.currentImageTitle = title;
  
  const url = URL.createObjectURL(blob);
  state.currentImageDataUrl = url;

  elements.selectedImagePreview.src = url;
  elements.selectedImagePreview.style.display = 'block';
  elements.imagePlaceholder.style.display = 'none';
  elements.currentImageTitle.textContent = title;
  
  const kbSize = (blob.size / 1024).toFixed(1);
  elements.statFileSize.textContent = `${kbSize} KB`;
  elements.imgResolution.textContent = `Dung lượng: ${kbSize} KB (Chuẩn JPEG)`;

  logActivity(`Đã chọn ảnh: <b>${title}</b> (${kbSize} KB)`, 'info');
  showToast(`✓ Đã nạp ảnh: ${title}`, 'success');
}

// ============================================================================
// MQTT Bridge & Wokwi Hardware Trigger
// ============================================================================
function connectMqtt() {
  let broker = (elements.mqttBroker ? elements.mqttBroker.value : '').trim() || state.brokerUrl;
  const channel = (elements.channelId ? elements.channelId.value : '').trim() || state.channelId;
  state.channelId = channel;

  // Auto-normalize broker URL if missing protocol or path
  if (!broker.startsWith('ws://') && !broker.startsWith('wss://')) {
    broker = 'wss://' + broker;
  }
  if (broker.includes('broker.emqx.io') && !broker.includes(':8084') && !broker.includes(':8083')) {
    broker = 'wss://broker.emqx.io:8084/mqtt';
  } else if (broker.includes('broker.hivemq.com') && !broker.includes(':8884')) {
    broker = 'wss://broker.hivemq.com:8884/mqtt';
  }
  if (elements.mqttBroker) elements.mqttBroker.value = broker;

  if (typeof mqtt === 'undefined') {
    logActivity(`⚠️ Thư viện MQTT.js đang nạp. Vui lòng thử lại sau 2 giây!`, 'alert');
    showToast('⚠️ MQTT.js đang nạp, vui lòng thử lại sau giây lát!', 'alert');
    return;
  }

  logActivity(`Đang kết nối MQTT tới <b>${broker}</b> (Kênh: ${channel})...`, 'info');
  elements.statusText.textContent = 'Connecting...';
  elements.statusDot.className = 'status-dot connecting';
  elements.btnConnectMqtt.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Connecting...</span>';
  elements.btnConnectMqtt.className = 'btn btn-warning w-100';

  try {
    if (state.mqttClient) {
      try { state.mqttClient.end(true); } catch(e) {}
    }

    state.mqttClient = mqtt.connect(broker, {
      clientId: 'wokwi_studio_' + Math.random().toString(16).substring(2, 10),
      clean: true,
      connectTimeout: 8000,
      reconnectPeriod: 4000,
    });

    state.mqttClient.on('connect', () => {
      state.isConnectedMqtt = true;
      elements.statusText.textContent = `MQTT Connected (${channel})`;
      elements.statusDot.className = 'status-dot connected';
      elements.btnConnectMqtt.innerHTML = '<i class="fa-solid fa-unlink"></i> <span>Disconnect</span>';
      elements.btnConnectMqtt.className = 'btn btn-danger w-100';

      logActivity(`✓ Đã kết nối MQTT Broker thành công! Kênh: <b>${channel}</b>`, 'success');
      showToast('✓ MQTT Đã kết nối thành công!', 'success');

      subscribeToChannels();
    });

    state.mqttClient.on('message', (topic, payload) => {
      handleMqttMessage(topic, payload);
    });

    state.mqttClient.on('error', (err) => {
      const errMsg = err ? (err.message || String(err)) : 'Không thể kết nối WebSocket';
      logActivity(`⚠️ Lỗi kết nối MQTT: ${errMsg}. Thử đổi sang broker HiveMQ!`, 'alert');
      showToast(`⚠️ Lỗi kết nối MQTT (${errMsg}). Thử đổi broker!`, 'alert');
    });

    state.mqttClient.on('close', () => {
      state.isConnectedMqtt = false;
      elements.statusText.textContent = 'MQTT Disconnected';
      elements.statusDot.className = 'status-dot disconnected';
      elements.btnConnectMqtt.innerHTML = '<i class="fa-solid fa-link"></i> <span>Connect MQTT</span>';
      elements.btnConnectMqtt.className = 'btn btn-primary w-100';
    });
  } catch (err) {
    logActivity(`Lỗi khởi tạo MQTT: ${err.message}`, 'alert');
    showToast(`⚠️ Lỗi khởi tạo MQTT: ${err.message}`, 'alert');
    elements.btnConnectMqtt.innerHTML = '<i class="fa-solid fa-link"></i> <span>Connect MQTT</span>';
    elements.btnConnectMqtt.className = 'btn btn-primary w-100';
  }
}

function subscribeToChannels() {
  if (!state.mqttClient || !state.isConnectedMqtt) return;
  
  const triggerTopic = `wokwi/esp32cam/${state.channelId}/trigger_capture`;
  const feedbackTopic = `wokwi/esp32cam/${state.channelId}/allergen_feedback`;

  state.mqttClient.subscribe(triggerTopic);
  state.mqttClient.subscribe(feedbackTopic);

  logActivity(`Đã đăng ký lắng nghe Nút Bấm: <b>${triggerTopic}</b>`, 'trigger');
  logActivity(`Đã đăng ký lắng nghe Kết Quả: <b>${feedbackTopic}</b>`, 'info');
}

// Xử lý gói tin nhận từ MQTT
function handleMqttMessage(topic, payload) {
  const triggerTopic = `wokwi/esp32cam/${state.channelId}/trigger_capture`;
  const feedbackTopic = `wokwi/esp32cam/${state.channelId}/allergen_feedback`;

  // 1. KHI NHẬN LỆNH BẤM NÚT TỪ MẠCH WOKWI ESP32
  if (topic === triggerTopic) {
    state.triggerCount++;
    elements.statTriggerCount.textContent = state.triggerCount;
    elements.statButtonStatus.textContent = `Đã bấm (Lần #${state.triggerCount})`;

    logActivity(`⚡ <b>[WOKWI HARDWARE TRIGGER]</b> Đã nhận tín hiệu BẤM NÚT XANH (GPIO 4) từ ESP32!`, 'trigger');
    showToast('⚡ MẠCH WOKWI ĐÃ BẤM NÚT! Đang truyền ảnh sang ScAllergen...', 'info');

    // Hiệu ứng Laser quét
    elements.laserScanLine.style.display = 'block';
    setTimeout(() => { elements.laserScanLine.style.display = 'none'; }, 2000);

    // Truyền ảnh sang ScAllergen Web
    sendCurrentImageToScAllergen();
  }

  // 2. KHI NHẬN PHẢN HỒI KẾT QUẢ DỊ ỨNG TỪ SCALLERGEN
  if (topic === feedbackTopic) {
    try {
      const jsonStr = payload.toString();
      const feedback = JSON.parse(jsonStr);
      state.lastFeedback = feedback;

      if (feedback.is_safe) {
        elements.statLastFeedback.textContent = '🟢 AN TOÀN';
        elements.statLastFeedback.style.color = '#00f5a0';
        logActivity(`🟢 <b>KẾT QUẢ TỪ AI:</b> Sản phẩm an toàn, không có dị ứng!`, 'success');
      } else {
        elements.statLastFeedback.textContent = '🔴 NGUY CƠ DỊ ỨNG';
        elements.statLastFeedback.style.color = '#ff0055';
        const warnCount = (feedback.warnings || []).length;
        logActivity(`🔴 <b>CẢNH BÁO DỊ ỨNG:</b> Phát hiện ${warnCount} nguy cơ dị ứng!`, 'alert');
      }
    } catch (e) {
      logActivity(`Nhận phản hồi dị ứng thô: ${payload.toString()}`, 'info');
    }
  }
}

// Gửi ảnh hiện tại sang ScAllergen qua MQTT
function sendCurrentImageToScAllergen() {
  if (!state.currentImageBlob) {
    showToast('⚠️ Vui lòng chọn hoặc nạp một ảnh nhãn trước!', 'alert');
    return;
  }

  if (!state.isConnectedMqtt || !state.mqttClient) {
    showToast('⚠️ MQTT chưa kết nối, vui lòng bấm Connect MQTT trước!', 'alert');
    return;
  }

  const outputTopic = `wokwi/esp32cam/${state.channelId}/output_jpeg`;
  const reader = new FileReader();
  reader.onload = () => {
    const arrayBuffer = reader.result;
    const uint8Arr = new Uint8Array(arrayBuffer);
    state.mqttClient.publish(outputTopic, uint8Arr, { qos: 0 });
    const kbSize = (uint8Arr.length / 1024).toFixed(1);
    logActivity(`📤 Đã gửi ảnh <b>${state.currentImageTitle}</b> (${kbSize} KB) sang ScAllergen Web (${outputTopic})!`, 'success');
    showToast(`✓ Đã gửi ảnh (${kbSize} KB) sang ScAllergen!`, 'success');
  };
  reader.readAsArrayBuffer(state.currentImageBlob);
}

// ============================================================================
// Event Listeners Setup
// ============================================================================
function setupEventListeners() {
  // Broker Preset Selector
  if (elements.brokerPresetSelect) {
    elements.brokerPresetSelect.addEventListener('change', () => {
      const val = elements.brokerPresetSelect.value;
      if (val !== 'custom') {
        elements.mqttBroker.value = val;
        if (state.isConnectedMqtt) {
          if (state.mqttClient) state.mqttClient.end(true);
        }
        connectMqtt();
      } else {
        elements.mqttBroker.focus();
      }
    });
  }

  // Connect MQTT
  elements.btnConnectMqtt.addEventListener('click', () => {
    if (state.isConnectedMqtt) {
      if (state.mqttClient) state.mqttClient.end(true);
    } else {
      connectMqtt();
    }
  });

  // Random Channel
  elements.btnRandomChannel.addEventListener('click', () => {
    state.channelId = 'esp32cam_' + Math.floor(1000 + Math.random() * 9000);
    elements.channelId.value = state.channelId;
    if (state.isConnectedMqtt) subscribeToChannels();
    showToast(`Mã kênh mới: ${state.channelId}`, 'info');
  });

  // Upload Dropzone
  elements.uploadDropzone.addEventListener('click', () => elements.fileInput.click());
  
  elements.uploadDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.uploadDropzone.style.borderColor = 'var(--accent-cyan)';
    elements.uploadDropzone.style.background = 'rgba(0,242,254,0.08)';
  });

  elements.uploadDropzone.addEventListener('dragleave', () => {
    elements.uploadDropzone.style.borderColor = 'rgba(0,242,254,0.4)';
    elements.uploadDropzone.style.background = 'rgba(0,242,254,0.03)';
  });

  elements.uploadDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.uploadDropzone.style.borderColor = 'rgba(0,242,254,0.4)';
    elements.uploadDropzone.style.background = 'rgba(0,242,254,0.03)';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  elements.fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  });

  // Clipboard Paste Support (Ctrl + V)
  document.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        handleFile(file, 'Ảnh dán từ Clipboard');
        break;
      }
    }
  });

  // Preset Buttons
  elements.presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const presetType = btn.dataset.preset;
      generateSampleLabel(presetType);
    });
  });

  // Manual Send Button
  elements.btnManualSend.addEventListener('click', () => {
    elements.laserScanLine.style.display = 'block';
    setTimeout(() => { elements.laserScanLine.style.display = 'none'; }, 2000);
    sendCurrentImageToScAllergen();
  });

  // Clear Logs
  elements.btnClearLogs.addEventListener('click', () => {
    elements.activityLogs.innerHTML = '<div>Đã xóa nhật ký.</div>';
  });

  // Modal Wokwi Code
  elements.btnOpenWokwiModal.addEventListener('click', async () => {
    elements.wokwiModal.classList.add('active');
    if (!elements.codeSketch.textContent.trim()) {
      try {
        const res = await fetch('wokwi/sketch.ino');
        if (res.ok) {
          elements.codeSketch.textContent = await res.text();
        }
      } catch (e) {}
    }
  });
  elements.btnCloseModal.addEventListener('click', () => elements.wokwiModal.classList.remove('active'));
  elements.btnCloseModal2.addEventListener('click', () => elements.wokwiModal.classList.remove('active'));

  elements.btnCopySketch.addEventListener('click', () => {
    navigator.clipboard.writeText(elements.codeSketch.textContent);
    showToast('✓ Đã copy mã nguồn sketch.ino!', 'success');
  });
}

function handleFile(file, customTitle) {
  if (!file.type.startsWith('image/')) {
    showToast('⚠️ Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, WebP)!', 'alert');
    return;
  }
  const title = customTitle || file.name || 'Ảnh Tải Lên';
  loadImageBlob(file, title);
}

// Init on load
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  // Generate first default preset image
  generateSampleLabel('peanut_milk');
  // Auto connect MQTT
  connectMqtt();
});
