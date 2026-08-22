/**
 * Wokwi Virtual Camera — Ultra-Minimalist Image Bridge
 */

const CHANNEL_ID = 'esp32cam_studio';
const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';

let currentImageBlob = null;
let mqttClient = null;

const el = {
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('fileInput'),
  emptyState: document.getElementById('emptyState'),
  previewImg: document.getElementById('previewImg'),
  btnSend: document.getElementById('btnSend'),
  compressCanvas: document.getElementById('compressCanvas'),
  toast: document.getElementById('toast'),
};

function showToast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  setTimeout(() => el.toast.classList.remove('show'), 2500);
}

// Connect MQTT
function initMqtt() {
  try {
    mqttClient = mqtt.connect(BROKER_URL, {
      clientId: 'WokwiCam_' + Math.random().toString(16).substring(2, 8),
      clean: true,
      reconnectPeriod: 3000,
    });

    mqttClient.on('connect', () => {
      el.statusDot.className = 'dot connected';
      el.statusText.textContent = 'Wokwi: Sẵn sàng';
      mqttClient.subscribe(`wokwi/esp32cam/${CHANNEL_ID}/trigger_capture`);
    });

    mqttClient.on('message', (topic) => {
      if (topic === `wokwi/esp32cam/${CHANNEL_ID}/trigger_capture`) {
        showToast('⚡ Wokwi bấm nút xanh! Đang gửi ảnh...');
        sendImage();
      }
    });

    mqttClient.on('error', () => {
      el.statusDot.className = 'dot disconnected';
      el.statusText.textContent = 'Mất kết nối MQTT';
    });

    mqttClient.on('close', () => {
      el.statusDot.className = 'dot disconnected';
      el.statusText.textContent = 'Đang kết nối lại...';
    });
  } catch (e) {
    el.statusDot.className = 'dot disconnected';
  }
}

// Handle Image File
function processFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('⚠️ Vui lòng chọn một file ảnh!');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = el.compressCanvas;
      let w = img.width;
      let h = img.height;
      const maxDim = 800;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
        else { w = Math.round((w * maxDim) / h); h = maxDim; }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob((blob) => {
        currentImageBlob = blob;
        el.previewImg.src = canvas.toDataURL('image/jpeg', 0.85);
        el.previewImg.style.display = 'block';
        el.emptyState.style.display = 'none';
        const kb = (blob.size / 1024).toFixed(1);
        showToast(`✓ Đã nạp ảnh (${kb} KB)!`);
      }, 'image/jpeg', 0.85);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Send Image to ScAllergen
function sendImage() {
  if (!currentImageBlob) {
    showToast('⚠️ Hãy tải ảnh lên trước!');
    return;
  }
  if (!mqttClient || !mqttClient.connected) {
    showToast('⚠️ MQTT chưa sẵn sàng!');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const arr = new Uint8Array(reader.result);
    mqttClient.publish(`wokwi/esp32cam/${CHANNEL_ID}/output_jpeg`, arr, { qos: 0 });
    const kb = (arr.length / 1024).toFixed(1);
    showToast(`✓ Đã gửi ảnh (${kb} KB) sang ScAllergen!`);
  };
  reader.readAsArrayBuffer(currentImageBlob);
}

// Events
el.dropzone.addEventListener('click', () => el.fileInput.click());

el.fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) processFile(e.target.files[0]);
});

el.dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  el.dropzone.style.borderColor = 'var(--accent)';
});

el.dropzone.addEventListener('dragleave', () => {
  el.dropzone.style.borderColor = 'rgba(255, 255, 255, 0.15)';
});

el.dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  el.dropzone.style.borderColor = 'rgba(255, 255, 255, 0.15)';
  if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
});

window.addEventListener('paste', (e) => {
  const items = e.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      processFile(items[i].getAsFile());
      break;
    }
  }
});

el.btnSend.addEventListener('click', sendImage);

// Init
document.addEventListener('DOMContentLoaded', () => {
  initMqtt();
});
