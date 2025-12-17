import { Game } from "./Game";

// Extend Window interface for type safety
declare global {
  interface Window {
    clearShapes: () => void;
  }
}

/**
 * Application entry point
 */
async function main(): Promise<void> {
  const game = new Game();

  try {
    await game.initialize("pixi-container");

    // Expose clearCanvas to global scope for HTML button
    window.clearShapes = () => game.clearCanvas();

    // Dropdown + Create/Auto buttons wiring
    const dropdown = document.getElementById("shape-dropdown");
    const selectBtn = document.getElementById("shape-select-btn");
    const selectLabel = document.getElementById(
      "shape-select-label"
    ) as HTMLSpanElement | null;
    const options = document.getElementById("shape-options");
    const createBtn = document.getElementById(
      "create-shape-btn"
    ) as HTMLButtonElement | null;
    const autoBtn = document.getElementById(
      "auto-shape-btn"
    ) as HTMLButtonElement | null;

    const selection: { shape: string } = { shape: "random" };

    // SVG icons for the closed dropdown button, with distinct colors
    const SHAPE_ICONS: Record<string, string> = {
      circle:
        '<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="#ff3b30"/></svg>',
      rectangle:
        '<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><rect x="2" y="6" width="16" height="8" fill="#e91e63"/></svg>',
      square:
        '<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="3" width="14" height="14" fill="#32d74b"/></svg>',
      triangle:
        '<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><polygon points="10,3 18,17 2,17" fill="#0a84ff"/></svg>',
      pentagon:
        '<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><polygon points="10,2 18,8 15,18 5,18 2,8" fill="#ffcc00"/></svg>',
      hexagon:
        '<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><polygon points="6,3 14,3 18,10 14,17 6,17 2,10" fill="#af52de"/></svg>',
      ellipse:
        '<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><ellipse cx="10" cy="10" rx="8" ry="5" fill="#5ac8fa"/></svg>',
      star: '<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><polygon points="10,2 12.9,7.5 19,8 14,12 15.5,18 10,14.8 4.5,18 6,12 1,8 7.1,7.5" fill="#ff9500"/></svg>',
      irregular:
        '<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3 C12 3, 15 4, 16 6 C17 8, 16 12, 14 13 C12 14, 9 17, 7 16 C5 15, 3 12, 4 9 C5 6, 8 3, 10 3 Z" fill="#ff5e3a"/></svg>',
      random:
        '<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">\
          <rect x="9" y="3" width="8" height="8" rx="2" ry="2" fill="#f5f5f5" stroke="#9e9e9e" stroke-width="0.6"/>\
          <circle cx="11" cy="5" r="0.9" fill="#333"/>\
          <circle cx="13" cy="7" r="0.9" fill="#333"/>\
          <circle cx="15" cy="9" r="0.9" fill="#333"/>\
          <rect x="3" y="9" width="8" height="8" rx="2" ry="2" fill="#f5f5f5" stroke="#9e9e9e" stroke-width="0.6"/>\
          <circle cx="5" cy="11" r="0.9" fill="#333"/>\
          <circle cx="7" cy="13" r="0.9" fill="#333"/>\
          <circle cx="9" cy="15" r="0.9" fill="#333"/>\
        </svg>',
    };

    const updateSelectedVisual = (value: string, labelText?: string) => {
      selection.shape = value;
      if (selectLabel)
        selectLabel.textContent = (labelText || value).replace(/\s*\(.*/, "");
      if (selectBtn) {
        const iconEl = selectBtn.querySelector("svg");
        const markup = SHAPE_ICONS[value] || SHAPE_ICONS.circle;
        if (iconEl) {
          // Replace the icon
          (iconEl as any).outerHTML = markup;
        } else {
          selectBtn.insertAdjacentHTML("afterbegin", markup);
        }
      }
    };

    // Initialize closed button icon/label
    updateSelectedVisual("random", "Random");

    const hideOptions = () => {
      if (!options || !selectBtn) return;
      options.style.display = "none";
      selectBtn.setAttribute("aria-expanded", "false");
    };
    const showOptions = () => {
      if (!options || !selectBtn) return;
      options.style.display = "block";
      selectBtn.setAttribute("aria-expanded", "true");
    };

    selectBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!options) return;
      const open = options.style.display === "block";
      if (open) hideOptions();
      else showOptions();
    });

    // Option click handling
    options?.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const li = target.closest("li");
      if (!li) return;
      const value = li.getAttribute("data-value");
      const label = li.textContent?.trim() || value || "";
      if (value) updateSelectedVisual(value, label);
      hideOptions();
    });

    // Helper to read current canvas size
    const getCanvasSize = () => {
      const canvas = document.querySelector(
        "#pixi-container canvas"
      ) as HTMLCanvasElement | null;
      return { width: canvas?.width ?? 800, height: canvas?.height ?? 600 };
    };

    // DRY: compute a random X within margins and a top Y spawn
    const computeTopSpawn = () => {
      const { width, height } = getCanvasSize();
      const margin = Math.min(24, Math.max(12, Math.floor(width * 0.03)));
      const x = margin + Math.random() * Math.max(0, width - margin * 2);
      const y = margin + Math.random() * Math.max(0, height - margin * 2);
      return { x, y };
    };

    // Create action: button click or Enter while focused within container
    const triggerCreate = () => {
      if (createBtn?.disabled) return;
      const { x, y } = computeTopSpawn();
      game.spawnAt(x, y, selection.shape);
    };
    createBtn?.addEventListener("click", triggerCreate);

    // Auto-create: one shape per second, locks the current selection
    let autoIntervalId: number | null = null;
    let autoLockedShape: string | null = null;
    const isAutoRunning = () => autoIntervalId !== null;
    const autoSpawnOnce = () => {
      const { x, y } = computeTopSpawn();
      // Use direct create to ensure exactly 1 per tick
      game.createShape(x, y, autoLockedShape || selection.shape);
    };
    const updateAutoUI = (running: boolean) => {
      if (!autoBtn) return;
      autoBtn.textContent = running ? "Stop Auto" : "Auto (1/s)";
      autoBtn.setAttribute("aria-pressed", running ? "true" : "false");

      // Dropdown button visual + disable
      if (selectBtn) {
        const sb = selectBtn as HTMLButtonElement;
        sb.disabled = running;
        sb.style.cursor = running ? "not-allowed" : "pointer";
        sb.style.opacity = running ? "0.6" : "1";
      }
      // Dropdown list interaction
      if (options) {
        const list = options as HTMLElement;
        list.style.pointerEvents = running ? "none" : "auto";
        if (running) list.style.display = "none";
      }

      // Create button visual + disable
      if (createBtn) {
        const cb = createBtn as HTMLButtonElement;
        cb.disabled = running;
        cb.style.cursor = running ? "not-allowed" : "pointer";
        cb.style.opacity = running ? "0.6" : "1";
      }

      // Rate / Gravity ± buttons visual + disable
      const rateMinusEl = document.getElementById(
        "rate-minus"
      ) as HTMLButtonElement | null;
      const ratePlusEl = document.getElementById(
        "rate-plus"
      ) as HTMLButtonElement | null;
      [rateMinusEl, ratePlusEl].forEach((btn) => {
        if (!btn) return;
        btn.disabled = running;
        btn.style.cursor = running ? "not-allowed" : "pointer";
        btn.style.opacity = running ? "0.6" : "1";
      });
    };
    const stopAuto = () => {
      if (autoIntervalId !== null) {
        window.clearInterval(autoIntervalId);
        autoIntervalId = null;
      }
      autoLockedShape = null;
      try {
        delete (window as any).__autoIntervalId;
      } catch {}
      // Only re-enable UI via auto state if game is running
      if (game.isRunning()) {
        updateAutoUI(false);
      }
    };
    const startAuto = () => {
      if (!autoBtn || autoBtn.disabled) return;
      if (isAutoRunning()) return;
      autoLockedShape = selection.shape; // lock current selection
      // Force shapes-per-action back to 1
      game.setShapesPerAction(1);
      if (rateValueEl) rateValueEl.textContent = "1";
      updateAutoUI(true);
      autoSpawnOnce();
      autoIntervalId = window.setInterval(autoSpawnOnce, 1000);
      try {
        (window as any).__autoIntervalId = autoIntervalId;
      } catch {}
    };
    autoBtn?.addEventListener("click", () => {
      if (isAutoRunning()) stopAuto();
      else startAuto();
    });

    // Pause auto-spawn when page is hidden or window loses focus
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopAuto();
    });
    window.addEventListener("blur", () => {
      stopAuto();
    });

    // Helper to enable/disable all controls based on game start state
    const setControlsEnabled = (enabled: boolean) => {
      // Dropdown
      if (selectBtn) {
        const sb = selectBtn as HTMLButtonElement;
        sb.disabled = !enabled;
        sb.style.cursor = enabled ? "pointer" : "not-allowed";
        sb.style.opacity = enabled ? "1" : "0.6";
      }
      if (options) {
        const list = options as HTMLElement;
        list.style.pointerEvents = enabled ? "auto" : "none";
        if (!enabled) list.style.display = "none";
      }

      // Create button
      if (createBtn) {
        const cb = createBtn as HTMLButtonElement;
        cb.disabled = !enabled;
        cb.style.cursor = enabled ? "pointer" : "not-allowed";
        cb.style.opacity = enabled ? "1" : "0.6";
      }
      // Auto button
      if (autoBtn) {
        const ab = autoBtn as HTMLButtonElement;
        ab.disabled = !enabled;
        ab.style.cursor = enabled ? "pointer" : "not-allowed";
        ab.style.opacity = enabled ? "1" : "0.6";
      }

      // Rate / Gravity buttons
      const rateMinusBtn = document.getElementById(
        "rate-minus"
      ) as HTMLButtonElement | null;
      const ratePlusBtn = document.getElementById(
        "rate-plus"
      ) as HTMLButtonElement | null;
      const gravityMinusBtn = document.getElementById(
        "gravity-minus"
      ) as HTMLButtonElement | null;
      const gravityPlusBtn = document.getElementById(
        "gravity-plus"
      ) as HTMLButtonElement | null;

      [rateMinusBtn, ratePlusBtn, gravityMinusBtn, gravityPlusBtn].forEach(
        (btn) => {
          if (!btn) return;
          btn.disabled = !enabled;
          btn.style.cursor = enabled ? "pointer" : "not-allowed";
          btn.style.opacity = enabled ? "1" : "0.6";
        }
      );
    };

    document.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      const active = document.activeElement as HTMLElement | null;
      const inContainer = !!active && !!dropdown && dropdown.contains(active);
      if (inContainer) {
        triggerCreate();
      }
    });

    // Close dropdown when clicking elsewhere
    document.addEventListener("click", (e) => {
      if (!options) return;
      const t = e.target as HTMLElement;
      if (dropdown && !dropdown.contains(t)) hideOptions();
    });

    // Enable all controls when the game starts; disable otherwise
    const enableAllControls = () => setControlsEnabled(true);
    if (game.isRunning()) {
      setControlsEnabled(true);
    } else {
      setControlsEnabled(false);
      window.addEventListener("game-started", enableAllControls, {
        once: true,
      });
    }

    // Wire bottom controls for rate and gravity
    const rateValueEl = document.getElementById("rate-value");
    const gravityValueEl = document.getElementById("gravity-value");
    if (rateValueEl)
      rateValueEl.textContent = String(game.getShapesPerAction());
    if (gravityValueEl) gravityValueEl.textContent = String(game.getGravity());

    const rateMinus = document.getElementById("rate-minus");
    const ratePlus = document.getElementById("rate-plus");
    const gravityMinus = document.getElementById("gravity-minus");
    const gravityPlus = document.getElementById("gravity-plus");

    rateMinus?.addEventListener("click", () => {
      const current = game.getShapesPerAction();
      const next = Math.max(1, current - 1);
      game.setShapesPerAction(next);
      if (rateValueEl) rateValueEl.textContent = String(next);
    });
    ratePlus?.addEventListener("click", () => {
      const current = game.getShapesPerAction();
      const next = Math.min(20, current + 1);
      game.setShapesPerAction(next);
      if (rateValueEl) rateValueEl.textContent = String(next);
    });
    gravityMinus?.addEventListener("click", () => {
      const current = game.getGravity();
      const next = Math.max(0, Math.round((current - 0.2) * 10) / 10);
      game.setGravity(next);
      if (gravityValueEl) gravityValueEl.textContent = String(next);
    });
    gravityPlus?.addEventListener("click", () => {
      const current = game.getGravity();
      const next = Math.min(5, Math.round((current + 0.2) * 10) / 10);
      game.setGravity(next);
      if (gravityValueEl) gravityValueEl.textContent = String(next);
    });
  } catch (error) {
    console.error("Failed to start game:", error);
    // Show error in the DOM for user feedback
    const container = document.getElementById("pixi-container");
    if (container) {
      container.innerHTML = `<div style="color:red;text-align:center;">Failed to start game. See console for details.</div>`;
    }
  }

  // Ensure interval is cleared on navigation
  window.addEventListener("beforeunload", () => {
    try {
      const anyWin = window as any;
      if (anyWin.__autoIntervalId) clearInterval(anyWin.__autoIntervalId);
    } catch {}
  });
}

// Start the game when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
