(() => {
  const form = document.querySelector("#editor-form");
  const videoInput = document.querySelector("#video-input");
  const dropzone = document.querySelector("#dropzone");
  const fileSummary = document.querySelector("#file-summary");
  const previewWrap = document.querySelector("#preview-wrap");
  const preview = document.querySelector("#video-preview");
  const startInput = document.querySelector("#start-seconds");
  const endInput = document.querySelector("#end-seconds");
  const renderButton = document.querySelector("#render-button");
  const renderSummary = document.querySelector("#render-summary");
  const progressPanel = document.querySelector("#progress-panel");
  const progressTitle = document.querySelector("#progress-title");
  const progressPercent = document.querySelector("#progress-percent");
  const progressFill = document.querySelector("#progress-fill");
  const progressMessage = document.querySelector("#progress-message");
  const elapsedTime = document.querySelector("#elapsed-time");
  const resultActions = document.querySelector("#result-actions");
  const errorMessage = document.querySelector("#error-message");
  const subtitleInput = document.querySelector("#subtitle-input");
  let previewUrl = null;
  let selectedDuration = 0;
  let pollToken = 0;

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "—";
    const whole = Math.floor(seconds);
    const minutes = Math.floor(whole / 60);
    return minutes + ":" + String(whole % 60).padStart(2, "0");
  };

  const setBusy = (busy) => {
    renderButton.disabled = busy;
    renderButton.querySelector("span:first-child").textContent = busy ? "Rendering…" : "Render video";
  };

  const updateSummary = () => {
    if (!videoInput.files.length) {
      renderSummary.textContent = "Choose a video to configure your edit.";
      return;
    }
    const start = Number(startInput.value || 0);
    const end = Number(endInput.value || 0) || selectedDuration;
    const valid = end > start && start >= 0 && (!selectedDuration || end <= selectedDuration + .05);
    renderSummary.textContent = valid
      ? formatTime(start) + " – " + formatTime(end) + " · " + (document.querySelector('input[name="aspect_ratio"]:checked')?.value || "landscape")
      : "Check your trim points before rendering.";
  };

  const selectVideo = (file) => {
    if (!file) return;
    if (!file.type.startsWith("video/") && ! /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(file.name)) {
      alert("Please choose a supported video file.");
      return;
    }
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    videoInput.files = dataTransfer.files;
    document.querySelector("#file-name").textContent = file.name;
    document.querySelector("#file-size").textContent = (file.size / (1024 * 1024)).toFixed(1) + " MB";
    dropzone.classList.add("hidden");
    fileSummary.classList.remove("hidden");
    previewWrap.classList.remove("hidden");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    preview.src = previewUrl;
    preview.onloadedmetadata = () => {
      selectedDuration = preview.duration;
      document.querySelector("#video-duration").textContent = formatTime(preview.duration);
      endInput.value = "0";
      endInput.max = String(preview.duration);
      startInput.max = String(preview.duration);
      updateSummary();
    };
    preview.onerror = () => {
      document.querySelector("#video-duration").textContent = "Preview unavailable";
    };
    updateSummary();
  };

  videoInput.addEventListener("change", () => selectVideo(videoInput.files[0]));
  document.querySelector("#change-file").addEventListener("click", () => videoInput.click());
  ["input", "change"].forEach((eventName) => {
    startInput.addEventListener(eventName, updateSummary);
    endInput.addEventListener(eventName, updateSummary);
  });
  document.querySelectorAll('input[name="aspect_ratio"]').forEach((radio) => radio.addEventListener("change", updateSummary));
  subtitleInput.addEventListener("change", () => {
    document.querySelector("#subtitle-name").textContent = subtitleInput.files[0]?.name || "Add an SRT captions file";
  });

  ["dragenter", "dragover"].forEach((name) => dropzone.addEventListener(name, (event) => {
    event.preventDefault();
    dropzone.classList.add("dragover");
  }));
  ["dragleave", "drop"].forEach((name) => dropzone.addEventListener(name, (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragover");
  }));
  dropzone.addEventListener("drop", (event) => selectVideo(event.dataTransfer.files?.[0]));

  const showError = (message) => {
    errorMessage.textContent = message || "Something went wrong. Please try again.";
    errorMessage.classList.remove("hidden");
    resultActions.classList.add("hidden");
    progressTitle.textContent = "Render failed";
  };

  const pollJob = async (jobId, token) => {
    while (token === pollToken) {
      let response;
      try {
        response = await fetch("/api/jobs/" + encodeURIComponent(jobId), { cache: "no-store" });
      } catch {
        showError("Connection lost while checking render progress. Refresh the page to reconnect.");
        setBusy(false);
        return;
      }
      const job = await response.json().catch(() => ({}));
      if (!response.ok) {
        showError(job.detail || "Could not read render status.");
        setBusy(false);
        return;
      }
      progressFill.style.width = Math.max(0, Math.min(100, job.progress || 0)) + "%";
      progressPercent.textContent = (job.progress || 0) + "%";
      progressMessage.textContent = job.message || job.status;
      elapsedTime.textContent = job.elapsed_seconds ? job.elapsed_seconds + "s elapsed" : "";
      if (job.status === "completed") {
        progressTitle.textContent = "Your video is ready";
        resultActions.classList.remove("hidden");
        document.querySelector("#download-link").href = job.download_url;
        document.querySelector("#result-size").textContent = job.output_size_mb + " MB · MP4";
        setBusy(false);
        return;
      }
      if (job.status === "failed") {
        showError(job.message);
        setBusy(false);
        return;
      }
      progressTitle.textContent = job.status === "queued" ? "Waiting for render slot…" : "Rendering your video…";
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!videoInput.files.length) {
      videoInput.reportValidity();
      return;
    }
    const start = Number(startInput.value || 0);
    const end = Number(endInput.value || 0);
    if (start < 0 || (end !== 0 && end <= start) || (selectedDuration && start >= selectedDuration)) {
      showError("Choose valid start and end times. End time can be 0 to use the full remaining video.");
      progressPanel.classList.remove("hidden");
      return;
    }

    pollToken += 1;
    const token = pollToken;
    setBusy(true);
    progressPanel.classList.remove("hidden");
    resultActions.classList.add("hidden");
    errorMessage.classList.add("hidden");
    progressFill.style.width = "0%";
    progressPercent.textContent = "0%";
    progressTitle.textContent = "Uploading your video…";
    progressMessage.textContent = "Large files may take a little while to upload.";
    elapsedTime.textContent = "";
    progressPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });

    const body = new FormData(form);
    body.set("start_seconds", String(start));
    if (end === 0) body.set("end_seconds", "0");
    else body.set("end_seconds", String(end));

    try {
      const response = await fetch("/api/jobs", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Upload failed. Please try again.");
      progressTitle.textContent = "Preparing your render…";
      await pollJob(data.id, token);
    } catch (error) {
      showError(error.message);
      setBusy(false);
    }
  });

  fetch("/api/health").then((r) => r.json()).then((health) => {
    if (!health.ffmpeg_available || !health.ffprobe_available) {
      document.querySelector(".local-badge").innerHTML = '<span class="status-dot" style="background:#ff7d89"></span> FFmpeg setup needed';
    }
    if (health.max_upload_mb) {
      document.querySelector(".file-types").textContent = "MP4, MOV, WEBM, MKV · up to " + health.max_upload_mb + " MB";
    }
  }).catch(() => {});
})();
