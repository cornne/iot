// FIREBASE AUTHENTICATION
  function initFirebaseAuth() {
    try {
      if (window.firebase && !window.firebase.apps.length) {
        const storedFbConfig = localStorage.getItem('scallergen_firebase_config');
        const fbConfig = storedFbConfig ? JSON.parse(storedFbConfig) : FIREBASE_CONFIG;
        window.firebase.initializeApp(fbConfig);
        console.log(`[Firebase Initialized] Đã kết nối Firebase Project: ${fbConfig.projectId}`);

        window.firebase.auth().onAuthStateChanged(async (user) => {
          const autoLoginFlag = localStorage.getItem('scallergen_auto_login');
          if (user && autoLoginFlag === 'true') {
            state.currentUser = user;
            const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Admin');
            if (el.dashboardUserEmailText) el.dashboardUserEmailText.textContent = displayName;
            console.log(`[Firebase Auto-Login] Tự động đăng nhập: ${user.email}`);

            // 1. Tự động chuyển thẳng vào Dashboard
            switchScreen('dashboard');
            showToast(`✓ Tự động đăng nhập Firebase: ${displayName}!`, 3000);

            // 2. Fetch dữ liệu khi đã vào Dashboard
            await fetchUserDataFromFirebase(user);
          } else if (autoLoginFlag === 'guest') {
            state.currentUser = { email: 'guest@sadieslink.ai', displayName: 'Bình (Guest)', uid: 'guest_user' };
            if (el.dashboardUserEmailText) el.dashboardUserEmailText.textContent = 'Bình (Guest)';
            switchScreen('dashboard');
            await fetchUserDataFromFirebase(state.currentUser);
          } else {
            console.log('ℹ️ [Firebase Auth] Đang ở màn hình Đăng Nhập, chưa vào Dashboard nên không fetch dữ liệu.');
          }
        });
      }
    } catch (e) {
      console.warn('Firebase Auth SDK loaded in fallback mode:', e);
    }
  }

  async function fetchUserDataFromFirebase(user) {
    if (!user || !user.uid) return;
    console.log(`[Firebase Firestore] Đang nạp dữ liệu riêng biệt cho UID: ${user.uid}...`);

    // Reset dữ liệu bộ nhớ trước khi nạp để tránh lẫn lộn giữa các tài khoản khác nhau
    state.userAllergens.clear();
    state.history = [];
    renderAllergenTags();
    renderHistory();

    let userDataFound = false;

    try {
      if (window.firebase && window.firebase.firestore) {
        const db = window.firebase.firestore();
        const userDocRef = db.collection('users').doc(user.uid);

        // 1. Đọc tài liệu hồ sơ chính: /users/{userId}
        try {
          const docSnap = await userDocRef.get();
          if (docSnap && docSnap.exists) {
            const data = docSnap.data();
            console.log(`✓ [Firebase Firestore] Đã nạp thành công /users/${user.uid}:`, data);
            applyUserData(data);
            userDataFound = true;
          }
        } catch (docErr) {
          console.warn(`[Firestore Read Error /users/${user.uid}]:`, docErr.message);
        }

        // 2. Đọc collection con: /users/{userId}/scan_history/{historyId}
        try {
          const historySnap = await userDocRef.collection('scan_history').get();
          if (historySnap && !historySnap.empty) {
            const cloudLogs = [];
            historySnap.forEach(hDoc => {
              const hData = hDoc.data();
              cloudLogs.push({
                id: hDoc.id,
                time: hData.time || (hData.timestamp ? new Date(hData.timestamp.toDate ? hData.timestamp.toDate() : hData.timestamp).toLocaleTimeString('vi-VN') : new Date().toLocaleTimeString('vi-VN')),
                summary: hData.scanned_text || hData.summary || hData.ingredients || 'Sản phẩm',
                isSafe: hData.is_safe !== undefined ? hData.is_safe : (hData.isSafe !== undefined ? hData.isSafe : true)
              });
            });
            if (cloudLogs.length > 0) {
              state.history = cloudLogs;
              localStorage.setItem(`scallergen_history_${user.uid}`, JSON.stringify(state.history));
              localStorage.setItem('scallergen_history', JSON.stringify(state.history));
              renderHistory();
              console.log(`✓ [Firebase Firestore] Đã nạp ${cloudLogs.length} bản ghi từ /users/${user.uid}/scan_history`);
            }
          } else {
            // Nếu trên Firestore chưa có lịch sử, dùng bộ nhớ đệm của tài khoản
            const savedLocal = localStorage.getItem(`scallergen_history_${user.uid}`) || localStorage.getItem('scallergen_history');
            if (savedLocal) {
              try { 
                state.history = JSON.parse(savedLocal); 
                if (!Array.isArray(state.history)) state.history = [];
              } catch (e) { state.history = []; }
              renderHistory();
            }
          }
        } catch (subErr) {
          console.warn(`[Firestore Subcollection Error scan_history]:`, subErr.message);
          const savedLocal = localStorage.getItem(`scallergen_history_${user.uid}`) || localStorage.getItem('scallergen_history');
          if (savedLocal) {
            try { 
              state.history = JSON.parse(savedLocal); 
              if (!Array.isArray(state.history)) state.history = [];
            } catch (e) { state.history = []; }
            renderHistory();
          }
        }
      }
    } catch (err) {
      console.warn('Lỗi Firestore:', err);
    }

    if (!userDataFound) {
      console.log(`ℹ️ [Firebase Sync] Khởi tạo hồ sơ ban đầu trên Firestore cho UID: ${user.uid}...`);
      await syncUserDataToFirebase(user);
    }
  }

  function applyUserData(data) {
    if (!data) return;

    // 1. Hồ sơ Dị ứng (Allergens list)
    if (data.allergens) {
      let list = [];
      if (Array.isArray(data.allergens)) {
        list = data.allergens;
      } else if (typeof data.allergens === 'string') {
        list = data.allergens.split(/[,;\n]+/).map(s => s.trim());
      } else if (typeof data.allergens === 'object') {
        list = Object.keys(data.allergens);
      }
      if (list.length > 0) {
        state.userAllergens = new Set(list.filter(Boolean).map(a => a.trim().toLowerCase()));
        renderAllergenTags();
        showToast(`✓ Đã tải ${state.userAllergens.size} chất dị ứng từ Firebase!`, 2500);
      }
    }

    // 2. Lịch sử quét (History)
    if (data.history && Array.isArray(data.history) && data.history.length > 0) {
      state.history = data.history;
      localStorage.setItem('scallergen_history', JSON.stringify(state.history));
      renderHistory();
    }

    // 3. Cấu hình phần cứng (Hardware Telemetry/Settings)
    if (data.hardware_config) {
      if (data.hardware_config.alert_duration) {
        const slider = document.getElementById('sliderAlertDuration');
        const valSpan = document.getElementById('valAlertDuration');
        if (slider) slider.value = data.hardware_config.alert_duration;
        if (valSpan) valSpan.textContent = `${data.hardware_config.alert_duration}s`;
      }
      if (data.hardware_config.buzzer_volume) {
        const slider = document.getElementById('sliderBuzzerVolume');
        const valSpan = document.getElementById('valBuzzerVolume');
        if (slider) slider.value = data.hardware_config.buzzer_volume;
        if (valSpan) valSpan.textContent = `${data.hardware_config.buzzer_volume}%`;
      }
    }

    // 4. Tên hiển thị
    if (data.displayName || data.email) {
      const name = data.displayName || data.email.split('@')[0];
      if (el.dashboardUserEmailText) el.dashboardUserEmailText.textContent = name;
    }
  }

  // Lưu hồ sơ Dị ứng & Cấu hình phần cứng lên Firestore /users/{userId} của đúng tài khoản đó
  async function syncUserDataToFirebase(user = null) {
    const authUser = (window.firebase && window.firebase.auth) ? window.firebase.auth().currentUser : null;
    const targetUser = user || authUser || state.currentUser;
    if (!targetUser) {
      console.warn('[Firebase Firestore] Chưa đăng nhập Firebase Auth, không thể lưu lên Cloud.');
      return;
    }

    const uid = targetUser.uid || (authUser ? authUser.uid : null);
    if (!uid) {
      console.warn('[Firebase Firestore] Không tìm thấy UID hợp lệ của người dùng để lưu Firestore.');
      return;
    }

    try {
      if (window.firebase && window.firebase.firestore) {
        const db = window.firebase.firestore();
        const userDocRef = db.collection('users').doc(uid);
        const payload = {
          email: targetUser.email || (authUser ? authUser.email : ''),
          displayName: targetUser.displayName || (authUser ? authUser.displayName : (targetUser.email ? targetUser.email.split('@')[0] : 'User')),
          allergens: Array.from(state.userAllergens),
          hardware_config: {
            alert_duration: parseInt(document.getElementById('sliderAlertDuration') ? document.getElementById('sliderAlertDuration').value : 5, 10),
            buzzer_volume: parseInt(document.getElementById('sliderBuzzerVolume') ? document.getElementById('sliderBuzzerVolume').value : 60, 10)
          },
          updatedAt: new Date().toISOString()
        };
        await userDocRef.set(payload, { merge: true });
        console.log(`✓ [Firebase Firestore] Đã lưu thành công dữ liệu lên /users/${uid}:`, payload);
      }
    } catch (err) {
      console.error(`❌ [Firebase Firestore Sync Error /users/${uid}]:`, err);
    }
  }

  window.fetchUserDataFromFirebase = fetchUserDataFromFirebase;
  window.syncUserDataToFirebase = syncUserDataToFirebase;

  async function handleLandingAuthSubmit() {
    const email = el.landingLoginEmail.value.trim();
    const pass = el.landingLoginPassword.value.trim();
    if (!email || !pass) {
      showToast('⚠️ Vui lòng nhập đầy đủ Email và Mật khẩu Firebase!', 3000);
      return;
    }

    try {
      if (window.firebase && window.firebase.auth) {
        let authResult;
        if (state.isSignUpModeLanding) {
          authResult = await window.firebase.auth().createUserWithEmailAndPassword(email, pass);
          showToast(`✓ Đăng ký tài khoản Firebase thành công: ${email}!`, 3000);
        } else {
          authResult = await window.firebase.auth().signInWithEmailAndPassword(email, pass);
          showToast(`✓ Đăng nhập Firebase thành công: ${email}!`, 3000);
        }
        state.currentUser = authResult.user;
        localStorage.setItem('scallergen_auto_login', 'true');
      } else {
        state.currentUser = { email: email };
        localStorage.setItem('scallergen_auto_login', 'true');
      }
    } catch (err) {
      console.warn('Firebase Auth error, fallback mode:', err.message);
      showToast(`ℹ️ Đăng nhập tài khoản: ${email}`, 2500);
      state.currentUser = { email: email };
      localStorage.setItem('scallergen_auto_login', 'true');
    }
    const displayName = email.split('@')[0];
    if (el.dashboardUserEmailText) el.dashboardUserEmailText.textContent = displayName;

    // 1. Chuyển vào Dashboard trước
    switchScreen('dashboard');

    // 2. Bắt đầu fetch thông tin khi đã vào Dashboard
    if (state.currentUser) {
      await fetchUserDataFromFirebase(state.currentUser);
    }
  }

