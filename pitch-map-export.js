(() => {
  "use strict";

  function safeParse(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function getScopedHistory(key) {
    if (window.CWWAuth && typeof window.CWWAuth.scopedGet === "function") {
      const scoped = window.CWWAuth.scopedGet(key, []);
      if (Array.isArray(scoped)) {
        return scoped;
      }
    }

    const userKey =
      window.CWWAuth && typeof window.CWWAuth.getCurrentUserKey === "function"
        ? String(window.CWWAuth.getCurrentUserKey() || "").trim().toLowerCase()
        : "";

    if (!userKey) {
      return [];
    }

    const scoped = safeParse(localStorage.getItem("cv_user::" + userKey + "::" + key), []);
    return Array.isArray(scoped) ? scoped : [];
  }

  function setScopedHistory(key, value) {
    const safeValue = Array.isArray(value) ? value : [];

    if (window.CWWAuth && typeof window.CWWAuth.scopedSet === "function") {
      window.CWWAuth.scopedSet(key, safeValue);
      return;
    }

    const userKey =
      window.CWWAuth && typeof window.CWWAuth.getCurrentUserKey === "function"
        ? String(window.CWWAuth.getCurrentUserKey() || "").trim().toLowerCase()
        : "";

    if (!userKey) {
      return;
    }

    localStorage.setItem("cv_user::" + userKey + "::" + key, JSON.stringify(safeValue));
  }

  function getPitchMapLengthFromImageY(imageY) {
    if (typeof window.getPitchMapLengthFromImageY === "function") {
      return window.getPitchMapLengthFromImageY(imageY);
    }

    const y = Number(imageY);

    if (!Number.isFinite(y)) return "Unknown";
    if (y < 12.9 || y > 97.8) return "Unknown";
    if (y < 22.3) return "FullToss";
    if (y < 34.0) return "Yorker";
    if (y < 46.9) return "HalfVolley";
    if (y < 60.8) return "Full";
    if (y < 75.4) return "Good";
    return "Short";
  }

  function getCurrentBowlerForPitchMapRecord() {
    if (typeof window.getCurrentPitchMapBowler === "function") {
      const bowler = window.getCurrentPitchMapBowler();

      return {
        id: String(bowler?.id || "bowler-1"),
        name: String(bowler?.name || "Bowler"),
        style: bowler?.style === "Left Arm Bowler" ? "Left Arm Bowler" : "Right Arm Bowler",
        avatar: String(bowler?.avatar || "")
      };
    }

    const bowlers = safeParse(
      sessionStorage.getItem("creasevisionBowlers") || localStorage.getItem("creasevisionBowlers"),
      []
    );

    const selectedIndex = Number(
      sessionStorage.getItem("creasevisionSelectedBowlerIndex") ||
        localStorage.getItem("creasevisionSelectedBowlerIndex") ||
        "0"
    );

    const selectedBowler = Array.isArray(bowlers) ? bowlers[selectedIndex] || bowlers[0] || {} : {};

    return {
      id: String(selectedBowler.id || "bowler-1"),
      name: String(
        selectedBowler.name || document.getElementById("bowler-name-display")?.textContent || "Bowler"
      ),
      style: selectedBowler.style === "Left Arm Bowler" ? "Left Arm Bowler" : "Right Arm Bowler",
      avatar: String(selectedBowler.avatar || "")
    };
  }

  function getCurrentDeliveriesForRecord() {
    const rawDeliveries = Array.isArray(window.pitchMapState?.deliveries)
      ? window.pitchMapState.deliveries
      : [];

    return rawDeliveries.map((delivery, index) => ({
      ballNumber: index + 1,
      wrapperX: Number(delivery.wrapperX) || 0,
      wrapperY: Number(delivery.wrapperY) || 0,
      imageX: Number(delivery.imageX) || 0,
      imageY: Number(delivery.imageY) || 0,
      pitchX: Number(delivery.pitchX) || 0,
      pitchY: Number(delivery.pitchY) || 0,
      outcome: ["Dot", "Run", "Boundary", "Wicket"].includes(delivery.outcome)
        ? delivery.outcome
        : "Dot",
      length: getPitchMapLengthFromImageY(Number(delivery.imageY))
    }));
  }

  function buildCompletedPitchMapRecord() {
    const bowler = getCurrentBowlerForPitchMapRecord();
    const deliveries = getCurrentDeliveriesForRecord();

    const savedAt = new Date().toISOString();
    const totalDeliveries = deliveries.length;
    const dotBalls = deliveries.filter((delivery) => delivery.outcome === "Dot").length;
    const boundaries = deliveries.filter((delivery) => delivery.outcome === "Boundary").length;
    const wickets = deliveries.filter((delivery) => delivery.outcome === "Wicket").length;
    const runsConceded =
      deliveries.filter((delivery) => delivery.outcome === "Run").length + boundaries * 4;

    return {
      id: "pitch-map-" + savedAt + "-" + Math.random().toString(36).slice(2, 8),
      analysisType: "pitchMap",
      bowlerId: bowler.id,
      bowlerName: bowler.name,
      bowlerStyle: bowler.style,
      bowlerAvatar: bowler.avatar,
      groundName: localStorage.getItem("creasevisionGroundName") || "Melbourne Cricket Ground",
      groundMode: localStorage.getItem("creasevisionGroundModeLabel") || "Preset",
      deliveries,
      totalDeliveries,
      dotBalls,
      runsConceded,
      boundaries,
      wickets,
      savedAt
    };
  }

  function appendPitchMapToHistory(record) {
    if (!record || typeof record !== "object") {
      return;
    }

    const normalized = {
      ...record,
      id: String(record.id || "pitch-map-" + Date.now()),
      savedAt: record.savedAt || new Date().toISOString(),
      deliveries: Array.isArray(record.deliveries) ? record.deliveries : [],
      totalDeliveries: Number(record.totalDeliveries) || 0,
      dotBalls: Number(record.dotBalls) || 0,
      runsConceded: Number(record.runsConceded) || 0,
      boundaries: Number(record.boundaries) || 0,
      wickets: Number(record.wickets) || 0
    };

    const existing = getScopedHistory("pitchMapHistory");
    const deduped = existing.filter((entry) => String(entry?.id || "") !== normalized.id);
    deduped.unshift(normalized);

    const nextHistory = deduped.slice(0, 50);

    setScopedHistory("pitchMapHistory", nextHistory);
    setScopedHistory("creasevisionPitchMapHistory", nextHistory);

    sessionStorage.setItem("latestPitchMapInnings", JSON.stringify(normalized));
  }

  function getOutcomeColor(outcome) {
    const dot = document.querySelector(".dot-ball.dot");
    const run = document.querySelector(".dot-ball.run");
    const boundary = document.querySelector(".dot-ball.boundary");
    const wicket = document.querySelector(".dot-ball.wicket");

    const fallback = {
      Dot: "#FF0054",
      Run: "#005F73",
      Boundary: "#E8A838",
      Wicket: "#2D00F7"
    };

    const source = {
      Dot: dot,
      Run: run,
      Boundary: boundary,
      Wicket: wicket
    }[outcome];

    if (!source) {
      return fallback[outcome] || fallback.Dot;
    }

    const color = window.getComputedStyle(source).backgroundColor;
    return color || fallback[outcome] || fallback.Dot;
  }

  function text(id, fallback = "0") {
    return String(document.getElementById(id)?.textContent || fallback).trim();
  }

  function createSummaryCard(title, rows) {
    const card = document.createElement("article");
    card.className = "pm-export-summary-card";

    const heading = document.createElement("h3");
    heading.textContent = title;
    card.appendChild(heading);

    const list = document.createElement("div");
    list.className = "pm-export-summary-items";

    rows.forEach((row) => {
      const item = document.createElement("div");
      item.className = "pm-export-summary-row";

      const label = document.createElement("span");
      label.textContent = row.label;

      const value = document.createElement("strong");
      value.textContent = row.value;

      item.appendChild(label);
      item.appendChild(value);
      list.appendChild(item);
    });

    card.appendChild(list);
    return card;
  }

  function forcePitchMapExportDotSize(root) {
    if (!root) {
      return;
    }

    root.querySelectorAll(".pm-export-delivery-dot").forEach((dot) => {
      dot.style.setProperty("width", "11px", "important");
      dot.style.setProperty("height", "11px", "important");
      dot.style.setProperty("min-width", "11px", "important");
      dot.style.setProperty("min-height", "11px", "important");
      dot.style.setProperty("max-width", "11px", "important");
      dot.style.setProperty("max-height", "11px", "important");
      dot.style.setProperty("border-radius", "50%", "important");
      dot.style.setProperty("transform", "translate(-50%, -50%)", "important");
      dot.style.setProperty("box-sizing", "border-box", "important");
    });
  }

  function buildPitchMapExportView() {
    const deliveries = getCurrentDeliveriesForRecord();
    const pitchImage = document.querySelector(".pitch-base-image");

    if (!pitchImage) {
      return null;
    }

    const root = document.createElement("div");
    root.className = "pitch-map-export-root";

    const pitchColumn = document.createElement("div");
    pitchColumn.className = "pm-export-pitch-column";

    const pitchWrap = document.createElement("div");
    pitchWrap.className = "pm-export-pitch-wrap";

    const image = document.createElement("img");
    image.className = "pm-export-pitch-image";
    image.src = pitchImage.currentSrc || pitchImage.src;
    image.alt = "Pitch map";

    const dotLayer = document.createElement("div");
    dotLayer.className = "pm-export-delivery-layer";

    deliveries.forEach((delivery) => {
      const dot = document.createElement("span");
      dot.className = "pm-export-delivery-dot";
      dot.style.left = delivery.wrapperX + "%";
      dot.style.top = delivery.wrapperY + "%";
      dot.style.background = getOutcomeColor(delivery.outcome);
      dotLayer.appendChild(dot);
    });

    pitchWrap.appendChild(image);
    pitchWrap.appendChild(dotLayer);
    pitchColumn.appendChild(pitchWrap);

    const summaryColumn = document.createElement("div");
    summaryColumn.className = "pm-export-summary-column";

    summaryColumn.appendChild(
      createSummaryCard("Length Wise Breakdown", [
        { label: "Full Toss", value: text("full-toss-count") },
        { label: "Yorker", value: text("yorker-count") },
        { label: "Half Volley", value: text("half-volley-count") },
        { label: "Full", value: text("full-count") },
        { label: "Good", value: text("good-count") },
        { label: "Short", value: text("short-count") }
      ])
    );

    summaryColumn.appendChild(
      createSummaryCard("Area Wise Breakdown", [
        { label: "Off Side", value: text("off-count") },
        { label: "Middle", value: text("middle-count") },
        { label: "Leg Side", value: text("leg-count") }
      ])
    );

    root.appendChild(pitchColumn);
    root.appendChild(summaryColumn);
    document.body.appendChild(root);

    forcePitchMapExportDotSize(root);
    return root;
  }

  async function ensurePitchMapHtml2Canvas() {
    if (typeof window.html2canvas === "function") {
      return true;
    }

    await new Promise((resolve) => {
      const existing = document.querySelector('script[data-cv-html2canvas="true"]');

      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", resolve, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
      script.async = true;
      script.dataset.cvHtml2canvas = "true";
      script.onload = resolve;
      script.onerror = resolve;
      document.head.appendChild(script);
    });

    return typeof window.html2canvas === "function";
  }

  async function waitForExportImages(root) {
    const images = Array.from(root.querySelectorAll("img"));

    await Promise.all(
      images.map((img) => {
        if (img.complete && img.naturalWidth > 0) {
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          window.setTimeout(done, 1600);
        });
      })
    );
  }

  async function downloadPitchMapImage(event) {
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    const ready = await ensurePitchMapHtml2Canvas();

    if (!ready) {
      alert("Download is not ready yet. Please try again.");
      return;
    }

    const target = buildPitchMapExportView();

    if (!target) {
      alert("Could not build the pitch map image.");
      return;
    }

    try {
      await waitForExportImages(target);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      forcePitchMapExportDotSize(target);

      const canvas = await window.html2canvas(target, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        logging: false
      });

      const bowlerName = document.getElementById("bowler-name-display")?.textContent || "bowler";
      const safeName =
        bowlerName
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "") || "bowler";

      const defaultFileName = safeName + "_pitch_map.jpg";

      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.94);
      });

      if (!blob) {
        alert("Could not create the pitch map image.");
        return;
      }

      if (window.showSaveFilePicker) {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: defaultFileName,
            types: [
              {
                description: "JPEG Image",
                accept: {
                  "image/jpeg": [".jpg", ".jpeg"]
                }
              }
            ]
          });

          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          return;
        } catch (error) {
          if (error && error.name === "AbortError") {
            return;
          }
        }
      }

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = defaultFileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(link.href);
      }, 1000);
    } catch (error) {
      console.error("Pitch map download failed:", error);
      alert("Could not create the pitch map image. Please try again.");
    } finally {
      target.remove();
    }
  }

  function showModal(event) {
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    const modal = document.getElementById("innings-confirm-modal");
    if (modal) {
      modal.classList.remove("is-hidden");
    }
  }

  function hideModal(event) {
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    const modal = document.getElementById("innings-confirm-modal");
    if (modal) {
      modal.classList.add("is-hidden");
    }
  }

  function completeBowling(event) {
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    hideModal();

    const record = buildCompletedPitchMapRecord();

    if (record.deliveries.length) {
      appendPitchMapToHistory(record);
    }

    const exportBlock = document.getElementById("download-export-block");

    if (exportBlock) {
      exportBlock.classList.remove("is-hidden");
      exportBlock.hidden = false;
      exportBlock.style.display = "grid";
    }
  }

  function clearPitchMapAndGoDashboard(event) {
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    [
      "creasevisionPitchDeliveries",
      "latestPitchMapInnings",
      "pitchMapInnings",
      "pitchMapDeliveries",
      "currentPitchMapDeliveries",
      "activePitchMapDeliveries",
      "pitch_map_history_view_record_id"
    ].forEach((key) => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });

    if (typeof window.resetPitchMapForNewInnings === "function") {
      window.resetPitchMapForNewInnings();
    }

    window.location.href = "dashboard.html";
  }

  function bindExportEvents() {
    const completeBtn = document.getElementById("complete-bowling-btn");
    const modal = document.getElementById("innings-confirm-modal");
    const confirmNo = document.getElementById("confirm-innings-no");
    const confirmYes = document.getElementById("confirm-innings-yes");
    const downloadBtn = document.getElementById("download-image-btn");
    const returnBtn = document.getElementById("return-dashboard-btn");

    if (completeBtn) {
      completeBtn.disabled = false;
      completeBtn.removeAttribute("disabled");
      completeBtn.style.pointerEvents = "auto";
      completeBtn.style.opacity = "1";
      completeBtn.addEventListener("click", showModal, true);
    }

    if (confirmNo) {
      confirmNo.disabled = false;
      confirmNo.addEventListener("click", hideModal, true);
    }

    if (confirmYes) {
      confirmYes.disabled = false;
      confirmYes.addEventListener("click", completeBowling, true);
    }

    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.removeAttribute("disabled");
      downloadBtn.addEventListener("click", downloadPitchMapImage, true);
    }

    if (returnBtn) {
      returnBtn.disabled = false;
      returnBtn.removeAttribute("disabled");
      returnBtn.textContent = "Return to Dashboard";
      returnBtn.addEventListener("click", clearPitchMapAndGoDashboard, true);
    }

    if (modal) {
      modal.addEventListener(
        "click",
        (event) => {
          if (event.target === modal) {
            hideModal(event);
          }
        },
        true
      );
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        hideModal(event);
      }
    });
  }

  function injectExportStyles() {
    if (document.getElementById("cv-pitch-map-export-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "cv-pitch-map-export-style";
    style.textContent = `
      .pitch-map-export-root {
        position: fixed !important;
        left: -10000px !important;
        top: 0 !important;
        width: 1200px !important;
        min-height: 860px !important;
        box-sizing: border-box !important;
        display: grid !important;
        grid-template-columns: 760px 320px !important;
        gap: 36px !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 28px !important;
        background: linear-gradient(180deg, #365540 0%, #2d4435 52%, #263a2d 100%) !important;
        color: #f6f3e8 !important;
        font-family: "Oswald", "Barlow Condensed", sans-serif !important;
        z-index: -1 !important;
      }

      .pm-export-pitch-column {
        width: 760px !important;
        height: 800px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      .pm-export-pitch-wrap {
        position: relative !important;
        width: 760px !important;
        height: 800px !important;
        overflow: hidden !important;
        background: transparent !important;
      }

      .pm-export-pitch-image {
        width: 100% !important;
        height: 100% !important;
        object-fit: contain !important;
        object-position: center center !important;
        display: block !important;
        background: transparent !important;
      }

      .pm-export-delivery-layer {
        position: absolute !important;
        inset: 0 !important;
        pointer-events: none !important;
        z-index: 10 !important;
      }

      .pm-export-delivery-dot {
        position: absolute !important;
        width: 11px !important;
        height: 11px !important;
        border-radius: 50% !important;
        transform: translate(-50%, -50%) !important;
        border: 2px solid rgba(255, 255, 255, 0.95) !important;
        box-shadow: 0 0 0 2px rgba(20, 24, 28, 0.65), 0 2px 7px rgba(0, 0, 0, 0.65) !important;
      }

      .pm-export-summary-column {
        width: 320px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 0 !important;
        color: #f6f3e8 !important;
      }

      .pm-export-summary-card {
        background: transparent !important;
        border: none !important;
        border-radius: 0 !important;
        padding: 10px 0 16px 0 !important;
        color: #f6f3e8 !important;
      }

      .pm-export-summary-card + .pm-export-summary-card {
        border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
      }

      .pm-export-summary-card h3 {
        margin: 0 0 12px 0 !important;
        font-family: "Oswald", sans-serif !important;
        text-transform: uppercase !important;
        font-size: 20px !important;
        letter-spacing: 0.06em !important;
        color: #c8d4c0 !important;
      }

      .pm-export-summary-items {
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
      }

      .pm-export-summary-row {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 12px 14px !important;
        background: rgba(255, 255, 255, 0.04) !important;
        border-radius: 4px !important;
      }

      .pm-export-summary-row span {
        color: #f6f3e8 !important;
        font-size: 14px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.05em !important;
        font-weight: 600 !important;
      }

      .pm-export-summary-row strong {
        color: #f6f3e8 !important;
        font-size: 22px !important;
        font-family: "Oswald", sans-serif !important;
        font-weight: 700 !important;
      }
    `;

    document.head.appendChild(style);
  }

  window.buildCompletedPitchMapRecord = buildCompletedPitchMapRecord;
  window.appendPitchMapToHistory = appendPitchMapToHistory;
  window.downloadPitchMapImage = downloadPitchMapImage;

  function init() {
    injectExportStyles();
    bindExportEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();