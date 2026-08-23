  function initWokwiMqttBridge() {
    let brokerUrl = 'wss://broker.emqx.io:8084/mqtt';
    const fallbackBrokerUrl = 'wss://broker.hivemq.com:8884/mqtt';
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

      if (wokwiMqttClient) {
        try { wokwiMqttClient.end(true); } catch (e) { }
      }

      wokwiMqttClient = mqtt.connect(brokerUrl, {
        clientId: 'scallergen_web_' + Math.random().toString(16).substring(2, 8),
        clean: true,
        connectTimeout: 7000,
        reconnectPeriod: 4000,
      });

      wokwiMqttClient.on('connect', () => {
        console.log('[Wokwi MQTT] Đã kết nối tới MQTT Broker thành công!');
        if (statusPill) {
          statusPill.className = 'badge-status safe';
          statusPill.innerHTML = '<i class="fa-solid fa-circle-check text-success"></i> Wokwi: Đã kết nối';
        }
        const headerStatus = document.getElementById('headerWokwiStatus');
        if (headerStatus) {
          headerStatus.innerHTML = '<i class="fa-solid fa-satellite-dish"></i> MQTT: Connected';
          headerStatus.style.borderColor = 'var(--neon-mint)';
          headerStatus.style.color = 'var(--neon-mint)';
        }

        wokwiMqttClient.subscribe(topicSnapshot);
        wokwiMqttClient.subscribe(topicTrigger);
        console.log(`[Wokwi MQTT] Subscribed to ${topicSnapshot} & ${topicTrigger}`);
      });

      wokwiMqttClient.on('message', (topic, payload) => {
        // A. KHI NHẬN TÍN HIỆU BẤM NÚT XANH TỪ MẠCH WOKWI
        if (topic === topicTrigger) {
          console.log('[Wokwi Trigger] ⚡ ĐÃ BẤM NÚT TRÊN MẠCH WOKWI! Chờ nhận ảnh để phân tích...');
          showToast('⚡ MẠCH WOKWI ĐÃ BẤM NÚT! Đang nạp ảnh & phân tích dị ứng...', 3000);
          return;
        }

        // B. KHI NHẬN ẢNH OUTPUT_JPEG
        if (topic === topicSnapshot) {
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
        console.warn('[Wokwi MQTT Warning]:', err);
        if (statusPill) {
          statusPill.className = 'badge-status alert';
          statusPill.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Đang thử kết nối lại...';
        }
        const headerStatus = document.getElementById('headerWokwiStatus');
        if (headerStatus) {
          headerStatus.innerHTML = '<i class="fa-solid fa-satellite-dish"></i> MQTT: Disconnected';
          headerStatus.style.borderColor = 'var(--color-alert)';
          headerStatus.style.color = 'var(--color-alert)';
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
      showToast("✓ Đã gửi tín hiệu AN TOÀN (Bật LED Xanh) về Wokwi ESP32!", 3000);
    } else {
      const warningNames = result.warnings && result.warnings.length > 0
        ? result.warnings.map(w => (w.allergen_source || '').toUpperCase()).join(", ")
        : "NGUY HIEM DI UNG";
      payloadObj = {
        is_safe: false,
        warning_text: warningNames,
        allergens: (result.warnings || []).map(w => w.allergen_source)
      };
      showToast(`🚨 Đã gửi CẢNH BÁO DỊ ỨNG (${warningNames}) về mạch Wokwi ESP32!`, 3500);
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

    // Gửi phản hồi đúng 1 lần (và 1 lần phụ sau 200ms để đảm bảo mạch Wokwi nhận được)
    publishPacket();
    setTimeout(publishPacket, 200);

    console.log('[Wokwi MQTT] Đã hoàn tất gửi tín hiệu về ESP32:', payloadObj);
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
        alert_duration_sec: parseInt(sliderAlertDuration ? sliderAlertDuration.value : 5, 10),
        buzzer_volume_pct: parseInt(sliderBuzzerVolume ? sliderBuzzerVolume.value : 60, 10),
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

    // Bắt sự kiện thay đổi Sliders (Cập nhật hiển thị giao diện & đồng bộ Firebase)
    if (sliderAlertDuration) {
      sliderAlertDuration.addEventListener('input', () => {
        if (valAlertDuration) valAlertDuration.textContent = `${sliderAlertDuration.value}s`;
        if (hwSyncStatusBadge) {
          hwSyncStatusBadge.className = 'badge-status alert';
          hwSyncStatusBadge.innerHTML = '<i class="fa-solid fa-clock"></i> Chưa gửi sang ESP32';
        }
      });
      sliderAlertDuration.addEventListener('change', () => {
        syncUserDataToFirebase();
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
      sliderBuzzerVolume.addEventListener('change', () => {
        syncUserDataToFirebase();
      });
    }

    // Các nút chọn nhanh độ to còi (Gán giá trị lên thanh trượt & đồng bộ Firebase)
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
          syncUserDataToFirebase();
        }
      });
    });

    // Nút Bấm Gửi cấu hình trực tiếp: GỬI SANG MẠCH ESP32 & ĐỒNG BỘ LÊN FIREBASE!
    if (btnPushHwConfigNow) {
      btnPushHwConfigNow.addEventListener('click', () => {
        triggerSync(true);
        syncUserDataToFirebase();
      });
    }

    // Nút Khôi phục mặc định: Đặt lại giá trị trên giao diện & đồng bộ Firebase
    if (btnResetHwDefaults) {
      btnResetHwDefaults.addEventListener('click', () => {
        if (sliderAlertDuration) { sliderAlertDuration.value = 5; if (valAlertDuration) valAlertDuration.textContent = '5s'; }
        if (sliderBuzzerVolume) { sliderBuzzerVolume.value = 60; if (valBuzzerVolume) valBuzzerVolume.textContent = '60%'; }
        if (hwSyncStatusBadge) {
          hwSyncStatusBadge.className = 'badge-status alert';
          hwSyncStatusBadge.innerHTML = '<i class="fa-solid fa-clock"></i> Chưa gửi sang ESP32';
        }
        syncUserDataToFirebase();
        showToast('↺ Đã đặt lại thông số về mặc định (5s, Âm lượng 60%)!', 3000);
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
      showToast(`✓ Đã đồng bộ thông số: Còi ${payloadObj.alert_duration_sec}s (Âm lượng ${payloadObj.buzzer_volume_pct}%), Đèn 2s!`, 3500);
    }
  }
