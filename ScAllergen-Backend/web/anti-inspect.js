/**
 * NutriViet ScAllergen / Sadie's Link - Anti-Inspect & DevTools Protection Guardrails
 * Advanced Client-Side Security Layer:
 * 1. Blocks Context Menu (Right Click)
 * 2. Blocks Shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S)
 * 3. DevTools Detection & Obfuscated Debugger Loop
 * 4. Image Drag & Drop Protection
 */

(function () {
  'use strict';

  // Configurable Security Options
  const config = {
    enableRightClickBlock: true,
    enableShortcutBlock: true,
    enableDebuggerLoop: true,
    enableDevToolsDetect: true,
    enableImageDragBlock: true,
    alertCooldownMs: 2500
  };

  let lastAlertTime = 0;

  function showSecurityToast(message) {
    const now = Date.now();
    if (now - lastAlertTime < config.alertCooldownMs) return;
    lastAlertTime = now;

    // Use global triggerERMVibration or toast if available
    if (typeof window.triggerERMVibration === 'function') {
      window.triggerERMVibration('alert', `🔒 ${message}`);
    } else {
      console.warn(`[Security Alert] ${message}`);
    }
  }

  // 1. Block Context Menu (Right Click)
  if (config.enableRightClickBlock) {
    document.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      showSecurityToast('Đã vô hiệu hóa Menu chuột phải để bảo vệ mã nguồn hệ thống!');
      return false;
    }, false);
  }

  // 2. Block Keyboard Shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U, etc.)
  if (config.enableShortcutBlock) {
    document.addEventListener('keydown', function (e) {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
      const shiftKey = e.shiftKey;
      const key = e.key ? e.key.toUpperCase() : '';
      const keyCode = e.keyCode;

      // F12 Key
      const isF12 = keyCode === 123 || key === 'F12';

      // Ctrl + Shift + I (Inspect) or J (Console) or C (Element Picker) or K
      const isInspectShortcut = ctrlKey && shiftKey && (key === 'I' || key === 'J' || key === 'C' || key === 'K' || keyCode === 73 || keyCode === 74 || keyCode === 67 || keyCode === 75);

      // Ctrl + U (View Source)
      const isViewSource = ctrlKey && (key === 'U' || keyCode === 85);

      // Ctrl + S (Save Page)
      const isSavePage = ctrlKey && (key === 'S' || keyCode === 83);

      // Ctrl + P (Print Page)
      const isPrintPage = ctrlKey && (key === 'P' || keyCode === 80);

      if (isF12 || isInspectShortcut || isViewSource || isSavePage || isPrintPage) {
        e.preventDefault();
        e.stopPropagation();

        let actionName = 'DevTools / View Source';
        if (isF12) actionName = 'Phím F12 (Inspect)';
        else if (isViewSource) actionName = 'Tổ hợp Xem Mã Nguồn (Ctrl+U)';
        else if (isSavePage) actionName = 'Tổ hợp Lưu Trang (Ctrl+S)';
        else if (isInspectShortcut) actionName = 'Tổ hợp Kiểm Tra Phần Tử (Ctrl+Shift+I)';

        showSecurityToast(`Đã khóa phím tắt ${actionName}!`);
        return false;
      }
    }, true);
  }

  // 3. Image Drag Protection
  if (config.enableImageDragBlock) {
    document.addEventListener('dragstart', function (e) {
      if (e.target && e.target.nodeName === 'IMG') {
        e.preventDefault();
        return false;
      }
    }, false);
  }

  // 4. Obfuscated Debugger Loop (Traps DevTools Execution)
  if (config.enableDebuggerLoop) {
    const loopDebugger = function () {
      function check(i) {
        if (('' + i / i).length !== 1 || i % 20 === 0) {
          (function () { }).constructor('debugger')();
        } else {
          (function () { }).constructor('debugger')();
        }
        check(++i);
      }
      try {
        check(0);
      } catch (e) { }
    };

    // Run debugger loop periodically
    setInterval(function () {
      try {
        const start = performance.now();
        (function () { }).constructor('debugger')();
        const end = performance.now();
        if (end - start > 100) {
          showSecurityToast('Cảnh báo: Phát hiện trình gỡ lỗi (DevTools Debugger) đang mở!');
        }
      } catch (e) { }
    }, 1000);
  }

  // 5. DevTools Window Threshold Detection
  if (config.enableDevToolsDetect) {
    const threshold = 160;
    setInterval(function () {
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      if (widthDiff || heightDiff) {
        showSecurityToast('Phát hiện bảng điều khiển DevTools đang mở!');
      }
    }, 2000);
  }

  console.log('🔒 [Security Guardrails] Anti-Inspect & DevTools Protection Enabled.');
})();
