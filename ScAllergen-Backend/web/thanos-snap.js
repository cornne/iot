/**
 * NutriViet ScAllergen / Sadie's Link - Authentic Thanos Snap & Time-Stone Reverse Particle Re-assembly Engine
 * Spam-Proof Anti-Glitch Lock Edition:
 * - Animation Lock Guard (`_isThanosAnimating`) to prevent mid-animation button spamming glitches
 * - Active Canvas Cleanup (`cleanActiveLayers`) to prevent lingering floating canvases
 * - Keeps Liquid Glass Container background smooth and unbroken during disintegration & restoration
 * - Content pixels dissolve smoothly into 24 particle dust layers
 * - Document-relative Absolute Positioning (`position: absolute` + `window.scrollY`) to prevent scroll jumps
 */

class ThanosSnapEngine {
  constructor() {
    this.enableAudio = false; // Audio disabled per user preference
  }

  playSnapSound() {
    return;
  }

  randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  /**
   * Clean up any existing active particle layer canvases on element
   */
  cleanActiveLayers(element) {
    if (element && element._activeThanosLayers && Array.isArray(element._activeThanosLayers)) {
      element._activeThanosLayers.forEach(item => {
        if (item && item.canvas && item.canvas.parentElement) {
          item.canvas.remove();
        }
      });
      element._activeThanosLayers = null;
    }
  }

  /**
   * FLIP Layout Animator for All Cards in Container
   * Uses 0 0 transform origin FLIP math to guarantee 100% smooth GPU layout sliding & scaling in both directions
   */
  animateContainerLayout(targetCard, layoutAction) {
    const parent = targetCard ? targetCard.parentElement : null;
    if (!parent) {
      layoutAction();
      return;
    }

    const cards = Array.from(parent.children).filter(el =>
      el.classList.contains('glass-card')
    );

    // Record First rects
    const firstMap = new Map();
    cards.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        firstMap.set(el, rect);
      }
    });

    // Perform layout DOM change
    layoutAction();

    // Record Last rects & run Web Animations API FLIP
    cards.forEach(el => {
      const lastRect = el.getBoundingClientRect();
      const firstRect = firstMap.get(el);

      if (firstRect && lastRect.width > 0 && lastRect.height > 0) {
        const deltaX = firstRect.left - lastRect.left;
        const deltaY = firstRect.top - lastRect.top;
        const scaleX = firstRect.width / lastRect.width;
        const scaleY = firstRect.height / lastRect.height;

        if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5 || Math.abs(scaleX - 1) > 0.005) {
          el.animate([
            {
              transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY})`,
              transformOrigin: '0 0'
            },
            {
              transform: 'translate3d(0, 0, 0) scale(1, 1)',
              transformOrigin: '0 0'
            }
          ], {
            duration: 750,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
          });
        }
      }
    });
  }

  /**
   * Thanos Snap Disintegrate Element (Preserving Liquid Glass Shell)
   */
  snap(element, onComplete) {
    if (!element) return;
    if (element.classList.contains('hidden') && element.dataset.snapped === 'true') return;
    if (element._isThanosAnimating) return; // Prevent spamming mid-animation!

    element._isThanosAnimating = true;
    this.cleanActiveLayers(element);

    const initialRect = element.getBoundingClientRect();
    if (initialRect.width <= 0 || initialRect.height <= 0) {
      element.classList.add('hidden');
      element.dataset.snapped = 'true';
      element._isThanosAnimating = false;
      if (typeof window.onCardSnapped === 'function') window.onCardSnapped(element);
      if (onComplete) onComplete();
      return;
    }

    const performSnapWithCanvas = (sourceCanvas) => {
      const rect = element.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const scrollX = window.scrollX || window.pageXOffset || 0;
      const topPos = rect.top + scrollY;
      const leftPos = rect.left + scrollX;

      element._thanosRect = { top: rect.top, left: rect.left, width: width, height: height, topPos: topPos, leftPos: leftPos };
      element._thanosSnapshotCanvas = sourceCanvas;

      const layerCount = 32;
      const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
      const mainImageData = srcCtx.getImageData(0, 0, width, height);

      const layerDataArray = [];
      const borderRadius = window.getComputedStyle(element).borderRadius || '16px';

      for (let i = 0; i < layerCount; i++) {
        const layerCanvas = document.createElement('canvas');
        layerCanvas.width = width;
        layerCanvas.height = height;
        layerCanvas.style.cssText = `
          position: absolute;
          top: ${topPos}px;
          left: ${leftPos}px;
          width: ${width}px;
          height: ${height}px;
          pointer-events: none;
          z-index: 99999;
          border-radius: ${borderRadius};
          transform: translate(0px, 0px) rotate(0deg) scale(1);
          opacity: 1;
          filter: blur(0px);
        `;
        const layerCtx = layerCanvas.getContext('2d', { willReadFrequently: true });
        const imgData = layerCtx.createImageData(width, height);
        layerDataArray.push({ canvas: layerCanvas, ctx: layerCtx, imgData: imgData });
      }

      element._activeThanosLayers = layerDataArray;

      // Distribute non-background content pixels randomly across 20 layers
      const dataLen = mainImageData.data.length;
      for (let i = 0; i < dataLen; i += 4) {
        const a = mainImageData.data[i + 3];
        if (a > 0) {
          const targetIndex = this.randomNumber(0, layerCount - 1);
          const targetImgData = layerDataArray[targetIndex].imgData.data;

          targetImgData[i] = mainImageData.data[i];
          targetImgData[i + 1] = mainImageData.data[i + 1];
          targetImgData[i + 2] = mainImageData.data[i + 2];
          targetImgData[i + 3] = a;
        }
      }

      // Smoothly fade out Liquid Glass Card Shell without shattering its shape
      element.style.transition = 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), filter 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      element.style.opacity = '0';
      element.style.transform = 'scale(0.97)';
      element.style.filter = 'blur(6px)';

      layerDataArray.forEach((item) => {
        item.ctx.putImageData(item.imgData, 0, 0);
        document.body.appendChild(item.canvas);
      });

      // Phase 1: Trigger Thanos Disintegration Particle Drift (0ms - 1200ms)
      requestAnimationFrame(() => {
        layerDataArray.forEach((item, index) => {
          const delay = index * 18;
          const duration = 0.8 + (index / layerCount) * 0.5;
          const moveX = (Math.random() - 0.3) * 70 - 25;
          const moveY = - (Math.random() * 110 + 35);
          const rotate = (Math.random() - 0.5) * 20;

          item.canvas.style.transition = `transform ${duration}s cubic-bezier(0.25, 1, 0.5, 1) ${delay}ms, opacity ${duration}s ease-out ${delay}ms, filter ${duration}s ease-out ${delay}ms`;
          item.canvas.style.transform = `translate(${moveX}px, ${moveY}px) rotate(${rotate}deg) scale(1.04)`;
          item.canvas.style.opacity = '0';
          item.canvas.style.filter = 'blur(4px)';
        });
      });

      // Phase 2: Smooth Layout Collapse via FLIP (Delay 400ms so particles lift off first without layout jump)
      setTimeout(() => {
        this.animateContainerLayout(element, () => {
          element.classList.add('card-collapsing');
        });
      }, 400);

      // Phase 3: Cleanup and hide element
      setTimeout(() => {
        this.cleanActiveLayers(element);
        element.classList.remove('card-collapsing');
        element.style.opacity = '';
        element.style.transform = '';
        element.style.filter = '';
        element.style.transition = '';
        element.dataset.snapped = 'true';
        element.style.display = 'none';
        element.classList.add('hidden');
        element._isThanosAnimating = false;
        if (typeof window.onCardSnapped === 'function') window.onCardSnapped(element);
        if (onComplete) onComplete();
      }, 1250);
    };

    if (typeof html2canvas !== 'undefined') {
      const snapId = 'snap-' + Math.random().toString(36).substr(2, 9);
      element.dataset.thanosSnapId = snapId;

      html2canvas(element, {
        backgroundColor: null,
        scale: 1,
        logging: false,
        useCORS: true,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.querySelector(`[data-thanos-snap-id="${snapId}"]`);
          if (clonedElement) {
            clonedElement.style.background = 'transparent';
            clonedElement.style.backdropFilter = 'none';
            clonedElement.style.webkitBackdropFilter = 'none';
            clonedElement.style.border = 'none';
            clonedElement.style.boxShadow = 'none';
          }
        }
      }).then(canvas => {
        delete element.dataset.thanosSnapId;
        performSnapWithCanvas(canvas);
      }).catch(() => {
        delete element.dataset.thanosSnapId;
        this.fallbackSnap(element, initialRect, onComplete);
      });
    } else {
      this.fallbackSnap(element, initialRect, onComplete);
    }
  }

  fallbackSnap(element, rect, onComplete) {
    element.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
    element.style.opacity = '0';
    element.style.transform = 'scale(0.97)';

    setTimeout(() => {
      this.cleanActiveLayers(element);
      element.style.opacity = '';
      element.style.transform = '';
      element.style.transition = '';
      element.dataset.snapped = 'true';
      element.style.display = 'none';
      element.classList.add('hidden');
      element._isThanosAnimating = false;
      if (typeof window.onCardSnapped === 'function') window.onCardSnapped(element);
      if (onComplete) onComplete();
    }, 450);
  }

  /**
   * Time-Stone Reverse Snap: Smooth Liquid Glass Re-assembly
   */
  reverseSnap(element, onComplete) {
    if (!element) return;
    if (element._isThanosAnimating) return; // Prevent spamming mid-animation!

    element._isThanosAnimating = true;
    this.cleanActiveLayers(element);
    delete element.dataset.snapped;

    // Phase 1: Unhide element collapsed and smoothly expand grid layout via FLIP FIRST
    element.style.visibility = 'hidden';
    element.style.display = '';
    element.classList.remove('hidden');

    this.animateContainerLayout(element, () => {
      element.classList.remove('card-collapsing');
    });

    // Phase 2: After layout has expanded open (~450ms), measure fresh target position and assemble particles
    setTimeout(() => {
      const freshRect = element.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const scrollX = window.scrollX || window.pageXOffset || 0;

      const topPos = freshRect.top + scrollY;
      const leftPos = freshRect.left + scrollX;
      const width = Math.round(freshRect.width);
      const height = Math.round(freshRect.height);

      if (width <= 0 || height <= 0) {
        element.style.visibility = '';
        element.style.opacity = '1';
        element._isThanosAnimating = false;
        if (onComplete) onComplete();
        return;
      }

      const performReverseWithCanvas = (sourceCanvas) => {
        element.style.visibility = '';
        element.style.opacity = '0';
        element.style.transform = 'scale(0.97)';
        element.style.filter = 'blur(6px)';
        element.style.transition = 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), filter 0.6s cubic-bezier(0.16, 1, 0.3, 1)';

        const layerCount = 32;
        const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
        const mainImageData = srcCtx.getImageData(0, 0, width, height);

        const layerDataArray = [];
        const borderRadius = window.getComputedStyle(element).borderRadius || '16px';

        for (let i = 0; i < layerCount; i++) {
          const layerCanvas = document.createElement('canvas');
          layerCanvas.width = width;
          layerCanvas.height = height;

          const moveX = (Math.random() - 0.3) * 70 - 25;
          const moveY = - (Math.random() * 110 + 35);
          const rotate = (Math.random() - 0.5) * 20;

          layerCanvas.style.cssText = `
            position: absolute;
            top: ${topPos}px;
            left: ${leftPos}px;
            width: ${width}px;
            height: ${height}px;
            pointer-events: none;
            z-index: 99999;
            border-radius: ${borderRadius};
            transform: translate(${moveX}px, ${moveY}px) rotate(${rotate}deg) scale(1.04);
            opacity: 0.9;
            filter: blur(3px);
          `;
          const layerCtx = layerCanvas.getContext('2d', { willReadFrequently: true });
          const imgData = layerCtx.createImageData(width, height);
          layerDataArray.push({ canvas: layerCanvas, ctx: layerCtx, imgData: imgData });
        }

        element._activeThanosLayers = layerDataArray;

        // Distribute content pixels into layers
        const dataLen = mainImageData.data.length;
        for (let i = 0; i < dataLen; i += 4) {
          const a = mainImageData.data[i + 3];
          if (a > 0) {
            const targetIndex = this.randomNumber(0, layerCount - 1);
            const targetImgData = layerDataArray[targetIndex].imgData.data;

            targetImgData[i] = mainImageData.data[i];
            targetImgData[i + 1] = mainImageData.data[i + 1];
            targetImgData[i + 2] = mainImageData.data[i + 2];
            targetImgData[i + 3] = a;
          }
        }

        layerDataArray.forEach((item) => {
          item.ctx.putImageData(item.imgData, 0, 0);
          document.body.appendChild(item.canvas);
        });

        // Animate Particles re-assembling into open slot
        requestAnimationFrame(() => {
          layerDataArray.forEach((item, index) => {
            const delay = (layerCount - index) * 15;
            item.canvas.style.transition = `transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, opacity 0.7s ease-in ${delay}ms, filter 0.7s ease-out ${delay}ms`;
            setTimeout(() => {
              item.canvas.style.transform = 'translate(0px, 0px) rotate(0deg) scale(1)';
              item.canvas.style.opacity = '1';
              item.canvas.style.filter = 'blur(0px)';
            }, delay);
          });

          // Delay Liquid Glass card fade-in until particles are almost converged (~400ms)
          setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'scale(1)';
            element.style.filter = 'blur(0px)';
          }, 400);
        });

        // Merge and reveal real element smoothly
        setTimeout(() => {
          this.cleanActiveLayers(element);
          element.style.transition = '';
          element.style.opacity = '';
          element.style.transform = '';
          element.style.filter = '';
          element._isThanosAnimating = false;
          if (onComplete) onComplete();
        }, 1100);
      };

      if (element._thanosSnapshotCanvas) {
        performReverseWithCanvas(element._thanosSnapshotCanvas);
      } else if (typeof html2canvas !== 'undefined') {
        const snapId = 'snap-' + Math.random().toString(36).substr(2, 9);
        element.dataset.thanosSnapId = snapId;

        html2canvas(element, {
          backgroundColor: null,
          scale: 1,
          logging: false,
          useCORS: true,
          onclone: (clonedDoc) => {
            const clonedElement = clonedDoc.querySelector(`[data-thanos-snap-id="${snapId}"]`);
            if (clonedElement) {
              clonedElement.style.background = 'transparent';
              clonedElement.style.backdropFilter = 'none';
              clonedElement.style.webkitBackdropFilter = 'none';
              clonedElement.style.border = 'none';
              clonedElement.style.boxShadow = 'none';
            }
          }
        }).then(canvas => {
          delete element.dataset.thanosSnapId;
          performReverseWithCanvas(canvas);
        }).catch(() => {
          delete element.dataset.thanosSnapId;
          element.style.visibility = '';
          element.style.opacity = '1';
          element._isThanosAnimating = false;
          if (onComplete) onComplete();
        });
      } else {
        element.style.visibility = '';
        element.style.opacity = '1';
        element._isThanosAnimating = false;
        if (onComplete) onComplete();
      }
    }, 300);
  }
}

// Global Thanos Snap API
window.thanosEngine = new ThanosSnapEngine();
window.snapDisintegrate = function(element, onComplete) {
  window.thanosEngine.snap(element, onComplete);
};
window.snapRestore = function(element, onComplete) {
  window.thanosEngine.reverseSnap(element, onComplete);
};
