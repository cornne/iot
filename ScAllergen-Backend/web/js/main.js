// MAIN ENTRY POINT
document.addEventListener('DOMContentLoaded', () => {
    try {
      if (typeof initApp === 'undefined') {
        init();
      }
    } catch(e) { console.error(e); }
});
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

  // ============================================================================
  // ============================================================================
  // 🔥 FIREBASE AUTH & FIRESTORE CLOUD USER DATA SYNC
  // ============================================================================
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDKpRCh69UfV2peWyu3t8a5NuYyT0-V0TA",
    authDomain: "pck1-4c48c.firebaseapp.com",
    projectId: "pck1-4c48c",
    storageBucket: "pck1-4c48c.firebasestorage.app",
    messagingSenderId: "559449587766",
    appId: "1:559449587766:web:42c570194356591dde5897"
  };

