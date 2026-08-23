// RENDER KẾT QUẢ VÀ LỊCH SỬ
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
      el.statusHeroBanner.className = 'result-status-card safe';
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
      el.statusHeroBanner.className = 'result-status-card danger';
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

    if (el.breakdownTableBody) {
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
    }

    if (el.graphReasoningContainer) {
      el.graphReasoningContainer.innerHTML = '';
      if (!result.warnings || result.warnings.length === 0) {
        el.graphReasoningContainer.innerHTML = `
          <div class="empty-state-small" style="padding: 20px; text-align: center; color: var(--color-safe);">
            <i class="fa-solid fa-circle-check" style="font-size: 1.6rem; margin-bottom: 8px; display: block;"></i>
            <strong>Đồ thị FoodOn / Neo4j: 100% An Toàn</strong>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">Không tìm thấy bất kỳ đường truyền gây dị ứng (Allergenic Path) nào nối giữa các thành phần quét với hồ sơ dị ứng của bạn.</p>
          </div>
        `;
      } else {
        result.warnings.forEach((w, idx) => {
          const pathCard = document.createElement('div');
          pathCard.className = 'glass-subcard';
          pathCard.style.marginBottom = '12px';
          pathCard.style.padding = '12px 16px';
          pathCard.style.border = '1px solid rgba(255, 51, 102, 0.35)';
          pathCard.style.borderRadius = '10px';
          pathCard.style.background = 'rgba(255, 51, 102, 0.06)';
          pathCard.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span style="font-weight:700; color:var(--status-alert); font-size:0.92rem;">
                <i class="fa-solid fa-circle-nodes"></i> Cảnh báo #${idx + 1}: ${escapeHtml(w.scanned_item)} ↔ ${escapeHtml(w.allergen_source)}
              </span>
              <span class="badge-status alert" style="font-size:0.72rem; padding:2px 8px;">
                BFS Depth: ${w.depth || 1}
              </span>
            </div>
            <div style="margin: 8px 0; padding: 8px 12px; background: rgba(0, 0, 0, 0.45); border-radius: 6px; font-size: 0.86rem; overflow-x: auto; border: 1px solid rgba(255,255,255,0.06);">
              <div style="font-size: 0.72rem; color: var(--color-accent); margin-bottom: 4px;"><i class="fa-solid fa-route"></i> Đồ thị liên kết Tri thức FoodOn (Graph Traversal Path):</div>
              <div style="font-family: 'Fira Code', monospace; color: #fff; font-size: 0.85rem;">
                ${w.path_visual || `<strong>${escapeHtml(w.scanned_item)}</strong> <span style="color:var(--color-accent); font-weight:bold;">--[IS_A / DERIVED_FROM]--></span> <strong>${escapeHtml(w.allergen_source)}</strong>`}
              </div>
            </div>
            <p style="font-size:0.83rem; color:var(--text-muted); margin:0; line-height: 1.4;"><i class="fa-solid fa-circle-info text-accent"></i> <strong>Lý do:</strong> ${escapeHtml(w.reason || 'Thành phần này bắt nguồn từ chất dị ứng của bạn.')}</p>
          `;
          el.graphReasoningContainer.appendChild(pathCard);
        });
      }
    }

    if (el.debugJsonCode) {
        el.debugJsonCode.textContent = JSON.stringify(result, null, 2);
    }
  }

  function saveToHistory(ingredientsText, isSafe) {
    const cleanSummary = (ingredientsText || '').replace(/[\r\n]+/g, ' ').trim();
    if (!cleanSummary) return;

    const entry = {
      id: Date.now(),
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      summary: cleanSummary.slice(0, 50) + (cleanSummary.length > 50 ? '...' : ''),
      isSafe: isSafe
    };

    state.history.unshift(entry);
    if (state.history.length > 20) state.history.pop();

    const authUser = (window.firebase && window.firebase.auth) ? window.firebase.auth().currentUser : null;
    const uid = (state.currentUser && state.currentUser.uid) || (authUser ? authUser.uid : null);
    if (uid) localStorage.setItem(`scallergen_history_${uid}`, JSON.stringify(state.history));
    localStorage.setItem('scallergen_history', JSON.stringify(state.history));

    renderHistory();

    // Lưu vào subcollection /users/{uid}/scan_history trên Firestore của tài khoản đó
    if (uid && window.firebase && window.firebase.firestore) {
      try {
        const db = window.firebase.firestore();
        db.collection('users').doc(uid).collection('scan_history').add({
          scanned_text: cleanSummary,
          summary: entry.summary,
          is_safe: isSafe,
          time: entry.time,
          timestamp: new Date().toISOString()
        })
        .then(() => {
          console.log(`✓ [Firebase Firestore] Đã push lịch sử quét lên /users/${uid}/scan_history`);
        })
        .catch(err => {
          console.error(`❌ [Firebase Firestore] Lỗi khi push lên scan_history (Có thể do Rule hoặc chưa tạo DB):`, err.message);
        });
      } catch (e) {
        console.warn('Lỗi cục bộ khi gọi Firestore:', e);
      }
    }
  }

  function renderHistory() {
    const tableBody = el.historyList || document.getElementById('historyTableBodyDashboard');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (!state.history || !Array.isArray(state.history) || state.history.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align:center; color:var(--text-subtle); padding:24px;">
            <i class="fa-solid fa-clock-rotate-left" style="font-size: 1.5rem; margin-bottom: 8px; display: block; opacity: 0.4;"></i>
            Chưa có lịch sử quét nào. Hãy quét sản phẩm hoặc nhãn thực phẩm đầu tiên!
          </td>
        </tr>
      `;
      return;
    }

    state.history.forEach(item => {
      const row = document.createElement('tr');
      const isSafe = item.isSafe !== undefined ? item.isSafe : (item.is_safe !== undefined ? item.is_safe : true);
      const timeStr = item.time || (item.timestamp ? new Date(item.timestamp).toLocaleTimeString('vi-VN') : 'Vừa xong');
      const summaryText = item.summary || item.scanned_text || 'Thành phần thực phẩm';

      row.innerHTML = `
        <td style="white-space: nowrap; font-family: 'Fira Code', monospace; font-size: 0.84rem; color: var(--text-muted);">
          <i class="fa-regular fa-clock text-accent"></i> ${escapeHtml(timeStr)}
        </td>
        <td>
          <strong style="color: #fff; font-size: 0.88rem;">${escapeHtml(summaryText)}</strong>
        </td>
        <td>
          <span class="badge-status ${isSafe ? 'safe' : 'alert'}" style="font-size: 0.76rem; padding: 3px 10px;">
            ${isSafe ? '<i class="fa-solid fa-circle-check"></i> AN TOÀN' : '<i class="fa-solid fa-triangle-exclamation"></i> CẢNH BÁO DỊ ỨNG'}
          </span>
        </td>
      `;
      tableBody.appendChild(row);
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

