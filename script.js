// Initialize map
let lastPosition = null;

let map = L.map("map").setView([20, 77], 5);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

let destinationMarker = null;
let destination = null;
let alertDistance = 500; // meters
let alarmVolume = 1.0;
// Alarm sound setup

let alarmEnabled = false;

const enableSoundBtn = document.getElementById("enableSound");
const stopAlarmBtn = document.getElementById("stopAlarm");
const clearDestinationBtn = document.getElementById("clearDestination");
const pauseTrackingBtn = document.getElementById("pauseTracking");
const statusDiv = document.getElementById("status");
const alertDistanceInput = document.getElementById("alertDistance");
const volumeControl = document.getElementById("volumeControl");
const saveSettingsBtn = document.getElementById("saveSettings");

let alarmSound = new Audio("alarm.wav");
alarmSound.loop = true;
alarmSound.volume = 1.0;


// Function to update enable sound button UI based on localStorage
function updateEnableSoundUI() {
  if (localStorage.getItem("soundEnabled") === "true") {
    enableSoundBtn.textContent = "Tap to re-enable Sound 🔊";
    enableSoundBtn.style.display = "inline-block";
  } else {
    enableSoundBtn.textContent = "Enable Sound 🔊";
    enableSoundBtn.style.display = "inline-block";
  }
  stopAlarmBtn.style.display = "none";
}
updateEnableSoundUI();

// Enable sound button click handler
enableSoundBtn.addEventListener("click", () => {
  alarmSound.play().then(() => {
  alarmSound.pause();
  alarmSound.currentTime = 0;
  alarmEnabled = true;
  console.log("Sound enabled");
  enableSoundBtn.style.display = "none";
});

  alarmSound.play()
    .then(() => {
      alarmSound.pause();
      alarmSound.currentTime = 0;
      alarmEnabled = true;
      localStorage.setItem("soundEnabled", "true");
      enableSoundBtn.style.display = "none";
      console.log("Sound enabled");

      // Check if alarm should start immediately
      if (destination && lastPosition) {
        let distance = map.distance(lastPosition, destination);
        if (distance <= 500) {
          playAlarm();
        }
      }
    })
    .catch((err) => {
      console.error("Error enabling sound:", err);
      statusDiv.textContent = "Please interact with the page to enable sound.";
    });
});

// Stop alarm button handler
stopAlarmBtn.addEventListener("click", () => {
  stopAlarm();
});

// Clear destination button handler
clearDestinationBtn.addEventListener("click", () => {
  clearDestination();
});

// Set destination marker on map and save
function setDestination(latlng) {
  if (destinationMarker) {
    map.removeLayer(destinationMarker);
  }
  destination = latlng;
  destinationMarker = L.marker(latlng)
    .addTo(map)
    .bindPopup("Destination")
    .openPopup();
  map.setView(latlng, 15);
  localStorage.setItem("destination", JSON.stringify(latlng));
  statusDiv.textContent = "Destination set!";
  clearDestinationBtn.style.display = "inline-block";
}

// Clear destination and stop alarm
function clearDestination() {
  destination = null;
  if (destinationMarker) {
    map.removeLayer(destinationMarker);
    destinationMarker = null;
  }
  localStorage.removeItem("destination");
  statusDiv.textContent = "No destination selected.";
  clearDestinationBtn.style.display = "none";
  stopAlarm();
}

// Load saved destination from localStorage on page load
window.onload = () => {
  let savedDest = localStorage.getItem("destination");
  if (savedDest) {
    let coords = JSON.parse(savedDest);
    setDestination(coords);
  }

  let savedAlertDistance = localStorage.getItem("alertDistance");
  if (savedAlertDistance) {
    alertDistance = parseInt(savedAlertDistance);
    alertDistanceInput.value = alertDistance;
  }

  let savedVolume = localStorage.getItem("alarmVolume");
  if (savedVolume) {
    alarmVolume = parseFloat(savedVolume);
    alarmSound.volume = alarmVolume;
    volumeControl.value = alarmVolume;
  }

  updateEnableSoundUI();
  startTracking();
};

// Add search control using Leaflet Control Geocoder
L.Control.geocoder({ defaultMarkGeocode: false })
  .on("markgeocode", function (e) {
    setDestination(e.geocode.center);
  })
  .addTo(map);

// Set destination on map click
map.on("click", function (e) {
  setDestination(e.latlng);
});

// Geolocation watch
let watchId = null;
function startTracking() {
  if (navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(
      positionSuccess,
      positionError,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
    pauseTrackingBtn.style.display = "inline-block";
    statusDiv.textContent = "Tracking started...";
  } else {
    alert("Geolocation not supported by your browser.");
  }
}

function stopTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    statusDiv.textContent = "Tracking paused.";
  }
}

// Optional pause tracking button logic (if needed)
// pauseTrackingBtn.addEventListener("click", () => {
//   if (watchId !== null) {
//     stopTracking();
//     pauseTrackingBtn.textContent = "Resume Tracking";
//   } else {
//     startTracking();
//     pauseTrackingBtn.textContent = "Pause Tracking";
//   }
// });

// Position update handler
function positionSuccess(position) {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;

  // Save last known position
  lastPosition = [lat, lon];

  if (!destination) {
    statusDiv.textContent = "No destination selected.";
    stopAlarm();
    return;
  }

  let distance = map.distance([lat, lon], destination);
  statusDiv.textContent = `Distance to destination: ${(distance / 1000).toFixed(3)} km`;

  if (distance <= alertDistance) {
    playAlarm();
  } else {
    stopAlarm();
  }
}

function positionError() {
  statusDiv.textContent = "Unable to retrieve location.";
  stopAlarm();
}

// Play alarm only if enabled
function playAlarm() {
  if (!alarmEnabled) {
    console.log("Alarm not enabled - click Enable Sound first");
    return;
  }
  if (alarmSound.paused) {
    alarmSound.currentTime = 0;
    alarmSound.play().catch((err) => console.error("Alarm play error:", err));
    stopAlarmBtn.style.display = "inline-block";

    if (navigator.vibrate) {
      navigator.vibrate([300, 200, 300]);
    }

    showNotification(
      "🚨 Approaching your destination!"
    );
  }
}

function stopAlarm() {
  if (!alarmSound.paused) {
    alarmSound.pause();
    alarmSound.currentTime = 0;
  }
  stopAlarmBtn.style.display = "none";
}

// Notification popup
function showNotification(message) {
  let notif = document.getElementById("notification");
  if (!notif) {
    notif = document.createElement("div");
    notif.id = "notification";
    notif.style.position = "fixed";
    notif.style.top = "20px";
    notif.style.right = "20px";
    notif.style.backgroundColor = "#e74c3c";
    notif.style.color = "white";
    notif.style.padding = "15px 25px";
    notif.style.borderRadius = "8px";
    notif.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
    notif.style.fontWeight = "700";
    notif.style.fontSize = "16px";
    notif.style.zIndex = 10000;
    notif.style.cursor = "pointer";
    notif.addEventListener("click", () => notif.remove());
    document.body.appendChild(notif);
  }
  notif.textContent = message;
  notif.style.display = "block";

  clearTimeout(notif.timeout);
  notif.timeout = setTimeout(() => {
    notif.style.display = "none";
  }, 5000);
}
alertDistanceInput.addEventListener("input", () => {
  alertDistance = parseInt(alertDistanceInput.value);
  localStorage.setItem("alertDistance", alertDistance);
});

volumeControl.addEventListener("input", () => {
  alarmVolume = parseFloat(volumeControl.value);
  alarmSound.volume = alarmVolume;
  localStorage.setItem("alarmVolume", alarmVolume);
});
