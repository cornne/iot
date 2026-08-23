// THUẬT TOÁN ĐỒ THỊ VÀ TÌM KIẾM MỜ (FUZZY GRAPH)
  function renderFuzzyDropdown(nodes) {
    const dropdown = el.fuzzyDropdown || document.getElementById('fuzzyDropdown');
    const list = el.fuzzySuggestionList || document.getElementById('fuzzySuggestionList');
    if (!dropdown || !list) return;

    list.innerHTML = '';
    if (!nodes || nodes.length === 0) {
      list.innerHTML = `
        <li style="padding: 12px; color: var(--text-muted); text-align: center; font-size: 0.84rem;">
          <i class="fa-solid fa-circle-question text-accent"></i> Khong tim thay trong FoodOn. Nhan <strong>Enter</strong> hoac nut <strong>+ Them</strong> de them tu do!
        </li>
      `;
      dropdown.classList.remove('hidden');
      dropdown.style.display = 'block';
      return;
    }

    nodes.forEach(node => {
      const li = document.createElement('li');
      li.className = 'fuzzy-item';
      li.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; cursor: pointer; border-bottom: 1px solid rgba(255, 255, 255, 0.06); transition: background 0.15s ease;';

      li.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.25rem;">${node.icon || '🧬'}</span>
          <div>
            <div style="font-weight: 600; color: #ffffff; font-size: 0.9rem;">${escapeHtml(node.name)}</div>
            <div style="font-size: 0.75rem; color: #00f2fe; font-family: 'Fira Code', monospace;">${escapeHtml(node.id)} • ${escapeHtml(node.group || node.label)}</div>
          </div>
        </div>
        <span class="badge-status safe" style="font-size: 0.72rem; padding: 3px 8px; border-radius: 999px; background: rgba(0, 242, 254, 0.2); color: #00f2fe; font-weight: 600;">+ Them</span>
      `;

      li.addEventListener('mouseenter', () => {
        li.style.background = 'rgba(0, 242, 254, 0.18)';
      });
      li.addEventListener('mouseleave', () => {
        li.style.background = '';
      });

      li.addEventListener('click', () => {
        const primaryKeyword = node.category || node.name.split(' (')[0].split('/')[0].trim();
        addAllergen(primaryKeyword);
        const input = el.allergenInput || document.getElementById('allergenInput');
        if (input) input.value = '';
        hideFuzzyDropdown();
      });

      list.appendChild(li);
    });

    dropdown.classList.remove('hidden');
    dropdown.style.display = 'block';
  }

  function hideFuzzyDropdown() {
    const dropdown = el.fuzzyDropdown || document.getElementById('fuzzyDropdown');
    if (dropdown) {
      dropdown.classList.add('hidden');
      dropdown.style.display = 'none';
    }
  }

  window.handleFuzzySearch = handleFuzzySearch;
  window.renderFuzzyDropdown = renderFuzzyDropdown;
  window.hideFuzzyDropdown = hideFuzzyDropdown;
  window.addAllergen = addAllergen;

  // Helper: Toast Notifications (Hiển thị thông báo Toast nhẹ nhàng, không phát rung ERM)
  function hybridFuzzyMatch(query, candidateLabel, thetaMin = 60, wchar = 0.5, wtoken = 0.5) {
    const q = (query || '').toLowerCase().trim();
    const l = (candidateLabel || '').toLowerCase().trim();

    if (l === q) return { score: 1000, penalty: 0, finalScore: 1000 };
    if (l.startsWith(q)) return { score: 95, penalty: 0, finalScore: 95 };

    const Tq = tokenizeString(q);
    const Tl = tokenizeString(l);

    const schar = computeCharacterLevelScore(q, l);
    const stoken = computeTokenScore(q, l, Tq, Tl);
    const shybrid = (wchar * schar) + (wtoken * stoken);

    if (shybrid >= thetaMin) {
      const p = computeLengthPenalty(q, l, 0.5);
      return { score: shybrid, penalty: p, finalScore: shybrid - p };
    }
    return null;
  }

  // ============================================================================
  // 🌐 TABLE 5: REFINED MAPPING OF ONTOLOGY RELATIONS & BFS TRAVERSAL
  // ============================================================================
  const FOODON_KNOWLEDGE_GRAPH = {
    // 1. Taxonomy & Hierarchy
    'IS_A': [
      { from: 'prawn', to: 'shrimp' },
      { from: 'tôm sú', to: 'shrimp' },
      { from: 'tôm hùm', to: 'shrimp' },
      { from: 'crab', to: 'crustacea' },
      { from: 'ghẹ', to: 'crustacea' },
      { from: 'salmon', to: 'fish' },
      { from: 'cá hồi', to: 'fish' },
      { from: 'tuna', to: 'fish' },
      { from: 'cá ngừ', to: 'fish' },
      { from: 'cá thu', to: 'fish' },
      { from: 'cow milk', to: 'milk' },
      { from: 'sữa bò', to: 'milk' },
      { from: 'sữa dê', to: 'milk' },
      { from: 'goat milk', to: 'milk' },
      { from: 'almond', to: 'tree nut' },
      { from: 'hạnh nhân', to: 'tree nut' },
      { from: 'cashew', to: 'tree nut' },
      { from: 'hạt điều', to: 'tree nut' },
      { from: 'walnut', to: 'tree nut' },
      { from: 'óc chó', to: 'tree nut' },
      { from: 'barley', to: 'cereal grain' },
      { from: 'lúa mạch', to: 'cereal grain' },
      { from: 'rye', to: 'cereal grain' },
      { from: 'lúa mạch đen', to: 'cereal grain' },
      { from: 'wheat', to: 'cereal grain' },
      { from: 'lúa mì', to: 'cereal grain' },
      { from: 'chicken', to: 'poultry' },
      { from: 'thịt gà', to: 'gà' },
      { from: 'gà', to: 'gia cầm' },
      { from: 'ức gà', to: 'chicken' },
      { from: 'beef', to: 'meat' },
      { from: 'thịt bò', to: 'thịt' },
      { from: 'pork', to: 'meat' },
      { from: 'thịt heo', to: 'thịt' }
    ],
    'IN_TAXON': [
      { from: 'shrimp', to: 'crustacea' },
      { from: 'tôm', to: 'crustacea' },
      { from: 'crab', to: 'crustacea' },
      { from: 'cua', to: 'crustacea' },
      { from: 'lobster', to: 'crustacea' },
      { from: 'squid', to: 'mollusca' },
      { from: 'mực', to: 'mollusca' },
      { from: 'octopus', to: 'mollusca' },
      { from: 'bạch tuộc', to: 'mollusca' },
      { from: 'clam', to: 'mollusca' },
      { from: 'nghêu', to: 'mollusca' },
      { from: 'oyster', to: 'mollusca' },
      { from: 'hàu', to: 'mollusca' },
      { from: 'fish', to: 'chordata' },
      { from: 'cá', to: 'chordata' }
    ],
    // 2. Origin Tracing
    'DERIVES_FROM': [
      { from: 'tofu', to: 'soybean' },
      { from: 'đậu phụ', to: 'soybean' },
      { from: 'đậu hũ', to: 'soybean' },
      { from: 'soy milk', to: 'soybean' },
      { from: 'sữa đậu nành', to: 'soybean' },
      { from: 'whey protein', to: 'milk' },
      { from: 'đạm whey', to: 'milk' },
      { from: 'bột whey', to: 'milk' },
      { from: 'cheese', to: 'milk' },
      { from: 'phô mai', to: 'milk' },
      { from: 'butter', to: 'milk' },
      { from: 'bơ', to: 'milk' },
      { from: 'yogurt', to: 'milk' },
      { from: 'sữa chua', to: 'milk' },
      { from: 'peanut butter', to: 'peanut' },
      { from: 'bơ đậu phộng', to: 'peanut' },
      { from: 'tahini', to: 'sesame' },
      { from: 'bơ vừng', to: 'sesame' },
      { from: 'wheat flour', to: 'wheat' },
      { from: 'bột mì', to: 'wheat' },
      { from: 'gluten', to: 'wheat' },
      { from: 'malt extract', to: 'barley' },
      { from: 'mạch nha', to: 'barley' }
    ],
    'PRODUCED_BY': [
      { from: 'honey', to: 'bee' },
      { from: 'mật ong', to: 'bee' },
      { from: 'milk', to: 'dairy' },
      { from: 'sữa', to: 'dairy' },
      { from: 'egg', to: 'poultry' },
      { from: 'trứng', to: 'poultry' }
    ],
    // 3. Composition & Ingredients
    'HAS_INGREDIENT': [
      { from: 'mayonnaise', to: 'egg' },
      { from: 'sốt mayonnaise', to: 'egg' },
      { from: 'cake', to: 'wheat flour' },
      { from: 'bánh quy', to: 'wheat flour' },
      { from: 'bánh mì', to: 'wheat flour' },
      { from: 'sausage', to: 'soy protein' },
      { from: 'xúc xích', to: 'soy protein' },
      { from: 'noodle', to: 'wheat flour' },
      { from: 'mì tôm', to: 'wheat flour' }
    ],
    'HAS_DEFINING_INGREDIENT': [
      { from: 'custard', to: 'egg' },
      { from: 'kem trứng', to: 'egg' },
      { from: 'pound cake', to: 'butter' },
      { from: 'bánh bơ', to: 'butter' },
      { from: 'chả cá', to: 'fish' },
      { from: 'surimi', to: 'fish' }
    ],
    'HAS_SUBSTANCE_ADDED': [
      { from: 'e322', to: 'soybean' },
      { from: 'lecithin', to: 'soybean' },
      { from: '322i', to: 'soybean' },
      { from: 'lecithin đậu nành', to: 'soybean' },
      { from: 'e1105', to: 'egg' },
      { from: 'lysozyme', to: 'egg' },
      { from: 'e220', to: 'sulfite' },
      { from: 'sunfit', to: 'sulfite' },
      { from: 'glucosamine', to: 'crustacea' },
      { from: 'chiết xuất tôm', to: 'crustacea' }
    ],
    'PART_OF': [
      { from: 'egg yolk', to: 'egg' },
      { from: 'lòng đỏ trứng', to: 'egg' },
      { from: 'egg white', to: 'egg' },
      { from: 'lòng trắng trứng', to: 'egg' },
      { from: 'albumin', to: 'egg' },
      { from: 'ovalbumin', to: 'egg' },
      { from: 'casein', to: 'milk' },
      { from: 'sodium caseinate', to: 'milk' },
      { from: 'lactalbumin', to: 'milk' },
      { from: 'gliadin', to: 'gluten' },
      { from: 'tropomyosin', to: 'crustacea' },
      { from: 'parvalbumin', to: 'fish' }
    ],
    'HAS_PART': [
      { from: 'egg', to: 'egg yolk' },
      { from: 'trứng', to: 'lòng đỏ trứng' },
      { from: 'milk', to: 'whey protein' },
      { from: 'sữa', to: 'đạm whey' }
    ]
  };

  /**
   * Breadth-First Search (BFS) Traversal across FoodOn Knowledge Graph (Depth limit <= 7)
   */
  function findFoodOnPath(startNode, targetAllergens, maxDepth = 7) {
    const queue = [{ node: startNode.toLowerCase(), path: [{ node: startNode, rel: 'START' }], depth: 0 }];
    const visited = new Set([startNode.toLowerCase()]);

    const targetSet = new Set(targetAllergens.map(a => removeVietnameseTones(a.toLowerCase().trim())));

    while (queue.length > 0) {
      const current = queue.shift();
      const currNode = current.node;
      const currNoTone = removeVietnameseTones(currNode);

      // Check if current node is one of the user-defined allergens
      for (const target of targetSet) {
        if (currNoTone === target || currNoTone.includes(target) || target.includes(currNoTone)) {
          return {
            found: true,
            targetAllergen: target.toUpperCase(),
            path: current.path,
            depth: current.depth
          };
        }
      }

      if (current.depth >= maxDepth) continue;

      // Traverse all 9 relations from Table 5
      for (const [relType, edges] of Object.entries(FOODON_KNOWLEDGE_GRAPH)) {
        for (const edge of edges) {
          const fromNode = edge.from.toLowerCase();
          const toNode = edge.to.toLowerCase();

          // Outgoing (from -> to)
          if (currNode.includes(fromNode) || fromNode.includes(currNode)) {
            if (!visited.has(toNode)) {
              visited.add(toNode);
              queue.push({
                node: toNode,
                path: [...current.path, { node: edge.to, rel: relType }],
                depth: current.depth + 1
              });
            }
          }

          // Incoming (for HAS_PART and reverse inferencing)
          if (relType === 'HAS_PART' && (currNode.includes(toNode) || toNode.includes(currNode))) {
            if (!visited.has(fromNode)) {
              visited.add(fromNode);
              queue.push({
                node: fromNode,
                path: [...current.path, { node: edge.from, rel: 'HAS_PART (In)' }],
                depth: current.depth + 1
              });
            }
          }
        }
      }
    }

    return { found: false };
  }

  function performFallbackCheck(scannedList, userAllergens, geminiDetected = []) {
    const warnings = [];
    const debugMapping = {};

    scannedList.forEach(item => {
      const itemOriginal = item.trim();
      // Clean for matching: strip % values and content in parentheses (e.g. "thịt gà (52%)" -> "thịt gà")
      const itemCleaned = itemOriginal
        .replace(/\(\d[\d.,]*\s*%?\)/g, '')   // Remove (52%), (18%), etc.
        .replace(/\d+\s*%/g, '')               // Remove bare 18%
        .replace(/\([^)]{0,25}\)/g, '')        // Remove short parenthetical like (E330)
        .replace(/[,;:]+$/g, '')               // Remove trailing punctuation
        .trim();
      const itemLower = itemCleaned.toLowerCase();
      const itemNoTone = removeVietnameseTones(itemLower);

      // 1. Hybrid Fuzzy Matching (Algorithm 2) để căn chỉnh với các Node FoodOn
      let bestMatchedEntity = null;
      let highestScore = -1;

      FOODON_SUGGESTIONS_DB.forEach(candidate => {
        // Match against the cleaned version of candidate name (without parenthetical English label)
        const candidateClean = candidate.name.replace(/\([^)]*\)/g, '').trim();
        const matchResult = hybridFuzzyMatch(itemCleaned, candidateClean, 50) ||
          hybridFuzzyMatch(itemCleaned, candidate.name, 50);
        if (matchResult && matchResult.finalScore > highestScore) {
          highestScore = matchResult.finalScore;
          bestMatchedEntity = candidate;
        }
      });

      const matchedNodeName = bestMatchedEntity ? bestMatchedEntity.name : itemOriginal;
      const matchedCategory = bestMatchedEntity ? bestMatchedEntity.category : itemLower;

      debugMapping[itemOriginal] = bestMatchedEntity ? `${bestMatchedEntity.name} (${bestMatchedEntity.id})` : 'Standard FoodOn Term';

      // 2. Graph Query & BFS Traversal (Section 3.3 & Table 5)
      const graphResult = findFoodOnPath(matchedCategory, userAllergens, 7);

      if (graphResult.found) {
        // Format path: Prawn --[IS_A]--> Shrimp --[IN_TAXON]--> Crustacea
        const pathVisual = graphResult.path.map((step, idx) => {
          if (idx === 0) return `<strong>${escapeHtml(step.node)}</strong>`;
          return `<span style="color:var(--color-accent);font-family:'Fira Code',monospace;">--[${step.rel}]--></span> <strong>${escapeHtml(step.node)}</strong>`;
        }).join(' ');

        warnings.push({
          scanned_item: itemOriginal,
          allergen_source: graphResult.targetAllergen,
          matched_node: matchedNodeName,
          path_visual: pathVisual,
          depth: graphResult.depth,
          reason: `Duyệt đồ thị FoodOn (Độ sâu ${graphResult.depth}): ${itemOriginal} liên kết tới nguy cơ dị ứng '${graphResult.targetAllergen}'.`
        });
      }
    });

    // 3. Xử lý cảnh báo nhãn từ Gemini Vision OCR
    if (Array.isArray(geminiDetected)) {
      geminiDetected.forEach(gAlg => {
        const gAlgLower = gAlg.toLowerCase().trim();
        const gAlgNoTone = removeVietnameseTones(gAlgLower);

        const isUserConcerned = userAllergens.some(uAlg => {
          const uNoTone = removeVietnameseTones(uAlg.toLowerCase());
          return gAlgLower.includes(uAlg.toLowerCase()) || gAlgNoTone.includes(uNoTone) || uNoTone.includes(gAlgNoTone);
        });

        if (isUserConcerned) {
          const alreadyWarned = warnings.some(w => removeVietnameseTones(w.allergen_source).includes(gAlgNoTone));
          if (!alreadyWarned) {
            warnings.push({
              scanned_item: `Cảnh báo bao bì: ${gAlg}`,
              allergen_source: gAlg.toUpperCase(),
              matched_node: gAlg,
              path_visual: `<strong>${escapeHtml(gAlg)}</strong> <span style="color:var(--color-accent);">--[DIRECT_ALERT]--></span> <strong>${gAlg.toUpperCase()}</strong>`,
              depth: 0,
              reason: `Gemini AI phát hiện nhãn bao bì ghi rõ cảnh báo dị ứng: '${gAlg}'.`
            });
          }
        }
      });
    }

    return {
      is_safe: warnings.length === 0,
      warnings: warnings,
      debug_mapping: debugMapping
    };
  }

  async function checkBackendHealth() {
    try {
      const res = await fetch(`${state.backendUrl}/`, { method: 'GET', signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        console.log('🟢 FastAPI Backend Connected:', data);
        const badge = document.getElementById('geminiOcrStatusBadge');
        if (badge) {
          badge.className = 'badge-status safe';
          badge.innerHTML = '<i class="fa-solid fa-server"></i> FastAPI Backend Live (8000)';
        }
      }
    } catch (e) {
      console.log('ℹ️ FastAPI Backend is offline. Client-side FoodOn engine is active.');
    }
  }

  async function runAllergyCheck(geminiResult = null) {
    let rawText = (el.ingredientsInput ? el.ingredientsInput.value.trim() : '');
    if (!rawText && geminiResult) {
      if (Array.isArray(geminiResult.ingredients_detected) && geminiResult.ingredients_detected.length > 0) {
        rawText = geminiResult.ingredients_detected.join(', ');
      } else if (geminiResult.ingredients_text) {
        rawText = geminiResult.ingredients_text;
      } else if (geminiResult.product_name) {
        rawText = geminiResult.product_name;
      }
      if (el.ingredientsInput) el.ingredientsInput.value = rawText;
    }

    if (!rawText) {
      showToast('⚠️ Vui lòng nhập hoặc chụp nhãn thành phần thực phẩm!', 3000);
      return;
    }

    const scannedList = rawText.split(/[,;\n\.\/]+/).map(s => s.trim()).filter(Boolean);
    const userAllergensList = Array.from(state.userAllergens);
    const geminiDetected = (geminiResult && geminiResult.allergens_detected) || [];

    let finalResult = null;

    // 1. Gửi yêu cầu kiểm tra tới FastAPI Backend (POST http://localhost:8000/debug/check)
    try {
      console.log(`[Backend Call] Đang gửi yêu cầu tới FastAPI Backend: ${state.backendUrl}/debug/check`);
      const response = await fetch(`${state.backendUrl}/debug/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_allergens: userAllergensList,
          scanned_ingredients: scannedList
        }),
        signal: AbortSignal.timeout(4000)
      });

      if (response.ok) {
        const backendData = await response.json();
        console.log('✓ Kết quả từ FastAPI Backend Server:', backendData);

        // Bổ sung đường dẫn BFS đồ thị FoodOn (Graph Path Visual) nếu backend chưa có
        const enrichedWarnings = (backendData.warnings || []).map(w => {
          const graphPath = findFoodOnPath(w.scanned_item, userAllergensList, 7);
          let pathVisual = '';
          if (graphPath.found && graphPath.path) {
            pathVisual = graphPath.path.map((step, idx) => {
              if (idx === 0) return `<strong>${escapeHtml(step.node)}</strong>`;
              return `<span style="color:var(--color-accent);font-family:'Fira Code',monospace;">--[${step.rel}]--></span> <strong>${escapeHtml(step.node)}</strong>`;
            }).join(' ');
          } else {
            pathVisual = `<strong>${escapeHtml(w.scanned_item)}</strong> <span style="color:var(--color-accent);">--[IS_A]--></span> <strong>${escapeHtml(w.allergen_source)}</strong>`;
          }
          return {
            ...w,
            path_visual: pathVisual,
            depth: (graphPath.found && graphPath.depth) || 1,
            reason: w.reason || `Duyệt đồ thị FoodOn: ${w.scanned_item} liên kết tới nguy cơ dị ứng '${w.allergen_source}'.`
          };
        });

        finalResult = {
          is_safe: backendData.is_safe,
          warnings: enrichedWarnings,
          debug_mapping: backendData.debug_mapping || {}
        };
      }
    } catch (err) {
      console.warn('Backend FastAPI chưa phản hồi hoặc đang offline, sử dụng Client-side FoodOn Engine:', err.message);
    }

    // 2. Nếu Backend offline hoặc chưa có kết quả -> Dùng client-side FoodOn engine
    if (!finalResult) {
      finalResult = performFallbackCheck(scannedList, userAllergensList, geminiDetected);
    }

    // 3. Hiển thị Giao diện & Lưu Lịch sử
    renderScanResults(scannedList, userAllergensList, finalResult);
    saveToHistory(rawText, finalResult.is_safe);

    // 4. Truyền ngay kết quả về mạch Wokwi ESP32
    sendAllergenFeedbackToWokwi(finalResult);
  }

