function getPitchMapExportLengthFromImageY(imageY) {
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


function getPitchMapExportUserIdentity() {
  function safeParsePitchExportIdentity(value, fallback) {
    try {
      const parsed = JSON.parse(value || "");
      return parsed || fallback;
    } catch {
      return fallback;
    }
  }

  const playerSetup = safeParsePitchExportIdentity(localStorage.getItem("playerSetup"), null);

  if (playerSetup && Array.isArray(playerSetup.players) && playerSetup.players.length > 0) {
    const firstPlayer = playerSetup.players[0] || {};
    const playerName = String(firstPlayer.name || "").trim();
    const playerAvatar = String(firstPlayer.avatar || "").trim();

    if (playerName || playerAvatar) {
      return {
        name: playerName,
        avatar: playerAvatar
      };
    }
  }

  const jsonKeys = [
    "cww_session_user",
    "creasevisionUserProfile",
    "currentUser"
  ];

  for (const key of jsonKeys) {
    const value = safeParsePitchExportIdentity(localStorage.getItem(key), null);

    if (value && typeof value === "object") {
      const name = String(value.name || "").trim();
      const avatar = String(value.profileImageUrl || value.avatar || "").trim();

      if (name || avatar) {
        return {
          name,
          avatar
        };
      }
    }
  }

  return {
    name: String(localStorage.getItem("profileName") || "").trim(),
    avatar: String(localStorage.getItem("profileImageUrl") || "").trim()
  };
}

function buildPitchMapExportView() {
  const pitchArea = document.querySelector(".pitch-area");
  const summaryGrid = document.querySelector(".summary-grid");

  if (!pitchArea || !summaryGrid) {
    return null;
  }

  const root = document.createElement("div");
  root.className = "pitch-map-export-root";

  const pitchClone = pitchArea.cloneNode(true);
  const summaryClone = summaryGrid.cloneNode(true);

  root.appendChild(pitchClone);
  root.appendChild(summaryClone);

  return root;
}

function safeParsePitchMapHistory(value, fallback) {
  try {
    const parsed = JSON.parse(value || "");
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function getCurrentBowlerForPitchMapRecord() {
  function parseJson(value, fallback) {
    try {
      const parsed = JSON.parse(value || "");
      return parsed || fallback;
    } catch {
      return fallback;
    }
  }

  const playerSetup = parseJson(localStorage.getItem("playerSetup"), null);
  const player = playerSetup && Array.isArray(playerSetup.players) && playerSetup.players.length > 0
    ? playerSetup.players[0]
    : null;

  const bowlers = parseJson(localStorage.getItem("creasevisionBowlers"), []);
  const selectedBowler = Array.isArray(bowlers) && bowlers.length > 0 ? bowlers[0] : {};

  return {
    id: String(selectedBowler.id || "bowler-1"),
    name: String(player?.name || selectedBowler.name || document.getElementById("bowler-name-display")?.textContent || "Bowler"),
    style: String(selectedBowler.style || document.getElementById("bowler-style-display")?.textContent || "Right Arm Bowler"),
    avatar: String(player?.avatar || selectedBowler.avatar || "")
  };
}

function buildCompletedPitchMapRecord() {
  const bowler = getCurrentBowlerForPitchMapRecord();
  const deliveries = Array.isArray(window.pitchMapState?.deliveries)
    ? window.pitchMapState.deliveries.map((delivery, index) => ({
        ballNumber: index + 1,
        wrapperX: Number(delivery.wrapperX) || 0,
        wrapperY: Number(delivery.wrapperY) || 0,
        imageX: Number(delivery.imageX) || 0,
        imageY: Number(delivery.imageY) || 0,
        pitchX: Number(delivery.pitchX) || 0,
        pitchY: Number(delivery.pitchY) || 0,
        outcome: String(delivery.outcome || "Dot"),
        length: getPitchMapExportLengthFromImageY(Number(delivery.imageY))
      }))
    : [];

  const savedAt = new Date().toISOString();
  const totalDeliveries = deliveries.length;
  const dotBalls = deliveries.filter((delivery) => delivery.outcome === "Dot").length;
  const boundaries = deliveries.filter((delivery) => delivery.outcome === "Boundary").length;
  const wickets = deliveries.filter((delivery) => delivery.outcome === "Wicket").length;
  const runsConceded = deliveries.filter((delivery) => delivery.outcome === "Run").length + boundaries * 4;

  return {
    id: `${bowler.id || "bowler"}-${savedAt}-${Math.random().toString(36).slice(2, 7)}`,
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

  const history = safeParsePitchMapHistory(localStorage.getItem("pitchMapHistory"), []);
  const normalized = {
    ...record,
    id: String(record.id || `pitch-map-${record.savedAt || Date.now()}`),
    savedAt: record.savedAt || new Date().toISOString(),
    deliveries: Array.isArray(record.deliveries) ? record.deliveries : [],
    totalDeliveries: Number(record.totalDeliveries) || 0,
    dotBalls: Number(record.dotBalls) || 0,
    runsConceded: Number(record.runsConceded) || 0,
    boundaries: Number(record.boundaries) || 0,
    wickets: Number(record.wickets) || 0
  };

  const deduped = history.filter((entry) => String(entry?.id || "") !== normalized.id);
  deduped.unshift(normalized);

  localStorage.setItem("pitchMapHistory", JSON.stringify(deduped.slice(0, 50)));
  localStorage.setItem("creasevisionPitchMapHistory", JSON.stringify(deduped.slice(0, 50)));
  localStorage.setItem("latestPitchMapInnings", JSON.stringify(normalized));
}

document.addEventListener("DOMContentLoaded", () => {
  const completeBtn = document.getElementById("complete-bowling-btn");
  const modal = document.getElementById("innings-confirm-modal");
  const confirmNo = document.getElementById("confirm-innings-no");
  const confirmYes = document.getElementById("confirm-innings-yes");
  const exportBlock = document.getElementById("download-export-block");
  const downloadBtn = document.getElementById("download-image-btn");
  const returnBtn = document.getElementById("return-dashboard-btn");

  function showModal(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (modal) modal.classList.remove("is-hidden");
  }

  function hideModal(event) {
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    if (modal) modal.classList.add("is-hidden");
  }

  function completeBowling(event) {
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    hideModal();

    if (exportBlock) {
      exportBlock.classList.remove("is-hidden");
    }
  }

  async function downloadPitchMapImage(event) {
    event.preventDefault();

    const target = buildPitchMapExportView();

    if (!target || typeof window.html2canvas !== "function") {
      alert("Download is not ready yet. Please try again.");
      return;
    }

    document.body.appendChild(target);

    const canvas = await window.html2canvas(target, {
      scale: 3,
      useCORS: true,
      backgroundColor: null
    });

    const bowlerName = document.getElementById("bowler-name-display")?.textContent || "bowler";
    const safeName = bowlerName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "bowler";
    const defaultFileName = safeName + "_pitch_map.jpg";

    target.remove();

    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
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

    const customName = prompt("Enter file name", defaultFileName);
    if (!customName) {
      return;
    }

    const finalName = customName.toLowerCase().endsWith(".jpg") || customName.toLowerCase().endsWith(".jpeg")
      ? customName
      : customName + ".jpg";

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = finalName;
    link.click();

    window.setTimeout(() => {
      URL.revokeObjectURL(link.href);
    }, 1000);
  }

  if (completeBtn) completeBtn.addEventListener("click", showModal, true);
  if (confirmNo) confirmNo.addEventListener("click", hideModal, true);
  if (confirmYes) confirmYes.addEventListener("click", completeBowling, true);
  if (downloadBtn) downloadBtn.addEventListener("click", downloadPitchMapImage);
  if (returnBtn) {
    returnBtn.addEventListener("click", () => {
      const completedRecord = buildCompletedPitchMapRecord();
      appendPitchMapToHistory(completedRecord);

      if (exportBlock) {
        exportBlock.classList.add("is-hidden");
      }

      if (window.resetPitchMapForNewInnings) {
        window.resetPitchMapForNewInnings();
      }
    });
  }

  if (modal) {
    modal.addEventListener("click", event => {
      if (event.target === modal) hideModal(event);
    }, true);
  }

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") hideModal(event);
  });
});
