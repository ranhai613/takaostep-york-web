const DEFAULT_CENTER = [35.6324, 139.2696];
const STORAGE_KEY = "takaostep-locatone-spots";

const state = {
  map: null,
  config: {
    bgm: {
      src: ""
    }
  },
  spots: [],
  markers: new Map(),
  circles: new Map(),
  spotIcon: null,
  played: new Set(),
  fileAudioUrls: new Map(),
  currentPosition: null,
  userMarker: null,
  userAccuracyCircle: null,
  watchId: null,
  centerOnNextPosition: false,
  bgmAudio: null,
  audioUnlocked: false,
  activeAudio: null
};

const elements = {
  watchBadge: document.querySelector("#watchBadge"),
  positionText: document.querySelector("#positionText"),
  accuracyText: document.querySelector("#accuracyText"),
  startButton: document.querySelector("#startButton"),
  stopButton: document.querySelector("#stopButton"),
  locateButton: document.querySelector("#locateButton"),
  bgmStatus: document.querySelector("#bgmStatus"),
  bgmVolume: document.querySelector("#bgmVolume"),
  debugMoveToggle: document.querySelector("#debugMoveToggle"),
  useCurrentButton: document.querySelector("#useCurrentButton"),
  exportButton: document.querySelector("#exportButton"),
  resetButton: document.querySelector("#resetButton"),
  spotForm: document.querySelector("#spotForm"),
  spotTitle: document.querySelector("#spotTitle"),
  spotRadius: document.querySelector("#spotRadius"),
  spotLat: document.querySelector("#spotLat"),
  spotLng: document.querySelector("#spotLng"),
  spotAudio: document.querySelector("#spotAudio"),
  spotFile: document.querySelector("#spotFile"),
  spotsList: document.querySelector("#spotsList"),
  spotItemTemplate: document.querySelector("#spotItemTemplate")
};

init();

async function init() {
  configureLeafletIcons();
  setupMap();
  bindEvents();
  state.config = await loadConfig();
  state.spots = await loadSpots();
  renderSpots();
  setFormLocation(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
}

function configureLeafletIcons() {
  state.spotIcon = L.icon({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
}

function setupMap() {
  state.map = L.map("map", { zoomControl: false }).setView(DEFAULT_CENTER, 16);

  L.control.zoom({ position: "bottomleft" }).addTo(state.map);

  const standardMap = createTileLayer(
    "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",
    {
      maxZoom: 18,
      attribution: '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>'
    }
  );
  const paleMap = createTileLayer(
    "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png",
    {
      maxZoom: 18,
      attribution: '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>'
    }
  );
  const photoMap = createTileLayer(
    "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg",
    {
      maxZoom: 18,
      attribution: '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>'
    }
  );
  const osmMap = createTileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  });

  osmMap.addTo(state.map);
  L.control
    .layers(
      {
        "地理院地図": standardMap,
        "淡色地図": paleMap,
        "航空写真": photoMap,
        "OpenStreetMap": osmMap
      },
      {},
      { position: "topright" }
    )
    .addTo(state.map);

  state.map.on("click", (event) => {
    if (elements.debugMoveToggle.checked) {
      moveDebugPosition(event.latlng.lat, event.latlng.lng);
      return;
    }

    setFormLocation(event.latlng.lat, event.latlng.lng);
  });
}

function createTileLayer(url, options) {
  const layer = L.tileLayer(url, {
    tileSize: 256,
    updateWhenIdle: true,
    updateWhenZooming: false,
    keepBuffer: 4,
    crossOrigin: true,
    ...options
  });

  layer.on("tileerror", (event) => {
    const tile = event.tile;
    const retries = Number(tile.dataset.retries || 0);
    if (retries >= 2) return;

    tile.dataset.retries = String(retries + 1);
    setTimeout(() => {
      tile.src = addCacheBuster(tile.src);
    }, 500 * (retries + 1));
  });

  return layer;
}

function addCacheBuster(url) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}retry=${Date.now()}`;
}

function bindEvents() {
  elements.startButton.addEventListener("click", startWatching);
  elements.stopButton.addEventListener("click", stopWatching);
  elements.locateButton.addEventListener("click", moveToCurrentPosition);
  elements.bgmVolume.addEventListener("input", updateBgmVolume);
  elements.useCurrentButton.addEventListener("click", useCurrentPosition);
  elements.exportButton.addEventListener("click", exportSpotsJson);
  elements.resetButton.addEventListener("click", resetSpots);
  elements.spotForm.addEventListener("submit", addSpotFromForm);
}

async function loadConfig() {
  try {
    const response = await fetch("config.json", { cache: "no-store" });
    if (!response.ok) throw new Error("config.json not found");
    const config = await response.json();
    return {
      bgm: {
        src: config?.bgm?.src || ""
      }
    };
  } catch {
    return {
      bgm: {
        src: ""
      }
    };
  }
}

async function loadSpots() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  try {
    const response = await fetch("spots.json", { cache: "no-store" });
    if (!response.ok) throw new Error("spots.json not found");
    return await response.json();
  } catch {
    return [];
  }
}

function saveSpots() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.spots));
}

function renderSpots() {
  elements.spotsList.replaceChildren();

  for (const marker of state.markers.values()) marker.remove();
  for (const circle of state.circles.values()) circle.remove();
  state.markers.clear();
  state.circles.clear();

  state.spots.forEach((spot) => {
    const marker = L.marker([spot.lat, spot.lng], { icon: state.spotIcon }).addTo(state.map);
    marker.bindPopup(`<strong>${escapeHtml(spot.title)}</strong><br>${spot.radius}m`);
    marker.on("click", () => focusSpot(spot.id));
    state.markers.set(spot.id, marker);

    const circle = L.circle([spot.lat, spot.lng], {
      radius: spot.radius,
      color: "#0f766e",
      weight: 2,
      fillColor: "#0f766e",
      fillOpacity: 0.12
    }).addTo(state.map);
    state.circles.set(spot.id, circle);

    const item = elements.spotItemTemplate.content.firstElementChild.cloneNode(true);
    item.dataset.spotId = spot.id;
    item.querySelector(".spot-title").textContent = spot.title;
    item.querySelector(".spot-meta").textContent = `${spot.radius}m / ${formatCoordinate(spot.lat)}, ${formatCoordinate(spot.lng)}`;
    item.querySelector(".spot-main").addEventListener("click", () => focusSpot(spot.id));
    item.querySelector(".spot-play").addEventListener("click", () => playSpot(spot, true));
    elements.spotsList.append(item);
  });
}

async function startWatching() {
  await unlockAudio();
  stopLocationWatch();
  state.centerOnNextPosition = true;
  await startBgm();

  if (!("geolocation" in navigator)) {
    updateStatus("このブラウザは位置情報に対応していません", false);
    return;
  }

  updateStatus("取得中", true);

  state.watchId = navigator.geolocation.watchPosition(
    handlePosition,
    handlePositionError,
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
  );
}

function stopWatching() {
  stopLocationWatch();
  stopActiveSpotAudio();
  stopBgm();
  updateStatus("停止中", false);
}

function handlePosition(position) {
  const { latitude, longitude, accuracy } = position.coords;
  setCurrentPosition(latitude, longitude, accuracy);
  if (state.centerOnNextPosition) {
    state.centerOnNextPosition = false;
    moveToCurrentPosition();
  }
}

function stopLocationWatch() {
  if (state.watchId !== null) {
    navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
  }
}

function setCurrentPosition(lat, lng, accuracy = 10) {
  state.currentPosition = { lat, lng, accuracy };
  elements.positionText.textContent = `${formatCoordinate(lat)}, ${formatCoordinate(lng)}`;
  elements.accuracyText.textContent = `±${Math.round(accuracy)}m`;
  updateUserMarker(lat, lng, accuracy);
  checkNearbySpots();
}

function moveDebugPosition(lat, lng) {
  setCurrentPosition(lat, lng, 5);
  setFormLocation(lat, lng);
  updateStatus("デバッグ中", true);
}

function handlePositionError(error) {
  const messages = {
    1: "位置情報の許可が必要です",
    2: "現在地を取得できません",
    3: "位置情報の取得がタイムアウトしました"
  };
  updateStatus(messages[error.code] || "位置情報エラー", false);
}

function updateUserMarker(lat, lng, accuracy) {
  const latlng = [lat, lng];
  if (!state.userMarker) {
    const icon = L.divIcon({
      className: "",
      html: '<div class="user-dot"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    state.userMarker = L.marker(latlng, { icon, zIndexOffset: 1000 }).addTo(state.map);
    state.userAccuracyCircle = L.circle(latlng, {
      radius: accuracy,
      color: "#2563eb",
      weight: 1,
      fillColor: "#2563eb",
      fillOpacity: 0.08
    }).addTo(state.map);
  } else {
    state.userMarker.setLatLng(latlng);
    state.userAccuracyCircle.setLatLng(latlng);
    state.userAccuracyCircle.setRadius(accuracy);
  }
}

function checkNearbySpots() {
  if (!state.currentPosition) return;

  state.spots.forEach((spot) => {
    const distance = getDistanceMeters(
      state.currentPosition.lat,
      state.currentPosition.lng,
      spot.lat,
      spot.lng
    );

    if (distance <= spot.radius && !state.played.has(spot.id)) {
      state.played.add(spot.id);
      playSpot(spot, false);
      markSpotActive(spot.id);
    }
  });
}

async function playSpot(spot, manual) {
  const audioSource = state.fileAudioUrls.get(spot.id) || spot.audio;
  markSpotActive(spot.id);

  if (!audioSource) {
    playFallbackTone();
    return;
  }

  try {
    if (state.activeAudio) {
      state.activeAudio.pause();
      restoreBgmVolume();
    }
    const audio = new Audio(audioSource);
    state.activeAudio = audio;
    audio.preload = "auto";
    audio.addEventListener("ended", () => {
      if (state.activeAudio === audio) state.activeAudio = null;
      restoreBgmVolume();
    });
    audio.addEventListener("error", restoreBgmVolume);
    duckBgmVolume();
    await audio.play();
  } catch {
    restoreBgmVolume();
    if (manual) playFallbackTone();
  }
}

function stopActiveSpotAudio() {
  if (!state.activeAudio) return;
  state.activeAudio.pause();
  state.activeAudio.currentTime = 0;
  state.activeAudio = null;
  restoreBgmVolume();
}

async function startBgm() {
  const source = state.config.bgm.src.trim();
  if (!source) {
    setBgmStatus("BGMなし");
    return;
  }

  const absoluteSource = new URL(source, window.location.href).href;
  if (state.bgmAudio && state.bgmAudio.src === absoluteSource) {
    updateBgmVolume();
    await state.bgmAudio.play();
    setBgmStatus("再生中");
    return;
  }

  stopBgm();
  state.bgmAudio = new Audio(source);
  state.bgmAudio.loop = true;
  state.bgmAudio.preload = "auto";
  updateBgmVolume();
  state.bgmAudio.addEventListener("playing", () => setBgmStatus("再生中"));
  state.bgmAudio.addEventListener("pause", () => setBgmStatus("停止中"));
  state.bgmAudio.addEventListener("error", () => setBgmStatus("読込失敗"));

  try {
    await state.bgmAudio.play();
    setBgmStatus("再生中");
  } catch {
    setBgmStatus("再生できません");
  }
}

function stopBgm() {
  if (!state.bgmAudio) {
    setBgmStatus("未再生");
    return;
  }

  state.bgmAudio.pause();
  state.bgmAudio.currentTime = 0;
  state.bgmAudio = null;
  setBgmStatus("停止中");
}

function updateBgmVolume() {
  if (!state.bgmAudio) return;
  state.bgmAudio.volume = Number(elements.bgmVolume.value);
}

function duckBgmVolume() {
  if (!state.bgmAudio || state.bgmAudio.paused) return;
  state.bgmAudio.volume = Number(elements.bgmVolume.value) * 0.28;
}

function restoreBgmVolume() {
  updateBgmVolume();
}

function setBgmStatus(text) {
  elements.bgmStatus.textContent = text;
}

async function unlockAudio() {
  if (state.audioUnlocked) return;
  playFallbackTone(0.02, 40);
  state.audioUnlocked = true;
}

function playFallbackTone(volume = 0.08, duration = 220) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 660;
  gain.gain.value = volume;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  setTimeout(() => {
    oscillator.stop();
    context.close();
  }, duration);
}

function addSpotFromForm(event) {
  event.preventDefault();

  const id = `spot-${Date.now()}`;
  const file = elements.spotFile.files[0];
  const audio = elements.spotAudio.value.trim();
  const spot = {
    id,
    title: elements.spotTitle.value.trim(),
    lat: Number(elements.spotLat.value),
    lng: Number(elements.spotLng.value),
    radius: Number(elements.spotRadius.value),
    audio: file ? "" : audio
  };

  if (!Number.isFinite(spot.lat) || !Number.isFinite(spot.lng) || !Number.isFinite(spot.radius)) return;
  if (file) state.fileAudioUrls.set(id, URL.createObjectURL(file));

  state.spots.push(spot);
  saveSpots();
  renderSpots();
  focusSpot(id);
  elements.spotFile.value = "";
}

function focusSpot(id) {
  const spot = state.spots.find((candidate) => candidate.id === id);
  if (!spot) return;

  state.map.setView([spot.lat, spot.lng], Math.max(state.map.getZoom(), 17));
  state.markers.get(id)?.openPopup();
  markSpotActive(id);
}

function markSpotActive(id) {
  document.querySelectorAll(".spot-item").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.spotId === id);
  });
}

function useCurrentPosition() {
  if (!state.currentPosition) return;
  setFormLocation(state.currentPosition.lat, state.currentPosition.lng);
}

function moveToCurrentPosition() {
  if (!state.currentPosition) return;
  state.map.setView([state.currentPosition.lat, state.currentPosition.lng], 17);
}

function setFormLocation(lat, lng) {
  elements.spotLat.value = lat.toFixed(6);
  elements.spotLng.value = lng.toFixed(6);
}

function resetSpots() {
  localStorage.removeItem(STORAGE_KEY);
  state.played.clear();
  state.fileAudioUrls.forEach((url) => URL.revokeObjectURL(url));
  state.fileAudioUrls.clear();
  loadSpots().then((spots) => {
    state.spots = spots;
    renderSpots();
  });
}

function exportSpotsJson() {
  const exportableSpots = state.spots.map((spot) => ({
    id: spot.id,
    title: spot.title,
    lat: Number(spot.lat),
    lng: Number(spot.lng),
    radius: Number(spot.radius),
    audio: spot.audio || ""
  }));
  const json = `${JSON.stringify(exportableSpots, null, 2)}\n`;
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");

  link.href = url;
  link.download = `spots-${timestamp}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function updateStatus(text, isLive) {
  elements.watchBadge.textContent = text;
  elements.watchBadge.classList.toggle("is-live", isLive);
}

function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function formatCoordinate(value) {
  return Number(value).toFixed(5);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
