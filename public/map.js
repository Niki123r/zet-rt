var map = L.map("map").setView([45.80391, 15.97841], 13);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

let vehicleMarkers = {};
const DEG_TO_RAD = Math.PI / 180;
const VEHICLE_ICON_SIZE = 23;
const MINIMUM_DISTANCE = Math.pow(10, -4);
const ICON_ANGLE_OFFSET = 225;
const SECONDS_TO_MILLISECONDS = 1000;
const VEHICLE_INACTIVE_MS = 5 * 60 * SECONDS_TO_MILLISECONDS;
const VEHICLE_STATIONARY_MS = 2 * 60 * SECONDS_TO_MILLISECONDS;
const fetchPeriod = 10;

let lastFetchTimestamp = Infinity;

function update() {
  const dataAge = Date.now() - lastFetchTimestamp;
  if (dataAge - 1000 > fetchPeriod * 1000) {
    displayVehicles();
    deleteInactive();
  }
  updateDataAge();
}

async function displayVehicles() {
  try {
    const response = await fetch("/api/vehicleLocations");
    const data = await response.json();
    lastFetchTimestamp = data.timestamp;

    for (let element of data.vehicles) {
      try {
        const VR = element.scheduleID.split("_")[2];
        const listID = element.vehicleNumber;
        const vehicleNumber = parseVehicleNumber(listID);

        if (vehicleMarkers[listID] != null) {
          var lat = element.lat;
          var lon = element.lon;
          var newLatLng = new L.LatLng(lat, lon);
          vehicleMarkers[listID].marker.setLatLng(newLatLng);

          document.getElementById(vehicleNumber).style.display = "block";
          vehicleMarkers[listID].lastUpdated = element.lastUpdated;
          if (
            Date.now() - vehicleMarkers[listID].lastUpdated >
            VEHICLE_INACTIVE_MS
          ) {
            vehicleMarkers[listID].marker._icon.classList.add(
              "vehicle-inactive"
            );
          } else {
            vehicleMarkers[listID].marker._icon.classList.remove(
              "vehicle-inactive"
            );
          }
        } else {
          const iconClass =
            "vehicle-icon" +
            (isInactiveAge(element.lastUpdated) ? " vehicle-inactive" : "");
          const markerIcon = L.divIcon({
            className: iconClass,
            iconSize: [VEHICLE_ICON_SIZE, VEHICLE_ICON_SIZE],
            iconAnchor: [VEHICLE_ICON_SIZE / 2, VEHICLE_ICON_SIZE / 2],
            popupAnchor: [0, 0],
            html:
              `<b> <p class="vehicle-text"> ${element.routeID} </b> </br>` +
              "<small> " +
              VR.slice(-2) +
              "</small>" +
              " </p>" +
              `<img class="vehicle-pointer" id="${vehicleNumber}" src="arrow.svg">`,
          });

          let marker = L.marker([element.lat, element.lon], {
            icon: markerIcon,
            riseOnHover: true,
          });
          //marker.bindPopup("<p>" + vehicleNumber + "<br/> VR: " + VR + "</p>");
          const tooltip = `<b> ${vehicleNumber} </b> - Linija <b>${element.routeID} </b>`;
          marker.bindTooltip(tooltip);
          marker.addTo(map);
          vehicleMarkers[listID] = {
            marker: marker,
            tooltip: tooltip,
            lastUpdated: element.lastUpdated,
          };
        }
        setIconAngle(vehicleNumber, element.bearing);
        checkStationary(vehicleNumber, element.lastMoved);
      } catch (error) {}
    }
  } catch (error) {
    console.error(error);
  }
  //checkStationary();
}

function setIconAngle(vehicleNumber, angle) {
  document.getElementById(vehicleNumber).style.transform = `rotate(${
    angle + ICON_ANGLE_OFFSET
  }deg)`;
}

function updateDataAge() {
  const now = Date.now();
  for (let vehicle of Object.entries(vehicleMarkers)) {
    let age = (now - vehicle[1].lastUpdated) / SECONDS_TO_MILLISECONDS;
    age = Math.round(age);
    vehicle[1].marker._tooltip.setContent(
      vehicle[1].tooltip + ` \n(${secondsToHHMMSS(age)} ago)`
    );
  }
}

function calculateDataAge() {
  const now = Date.now();
  try {
    return now - Object.entries(vehicleMarkers)[0][1].lastUpdated;
  } catch (error) {
    console.error(error);
    return 0;
  }
}

function parseVehicleNumber(listID) {
  let vehicleNumber = listID;

  if (listID.length >= 5) {
    if (listID.startsWith("10")) {
      vehicleNumber = listID.substring(2);
    }
    vehicleNumber = "T" + vehicleNumber;
  } else {
    vehicleNumber = "B" + vehicleNumber;
  }
  return vehicleNumber;
}

function deleteInactive() {
  const now = Date.now();

  Object.entries(vehicleMarkers).filter((marker) => {
    if (Math.abs(now - marker[1].lastUpdated) > VEHICLE_INACTIVE_MS) {
      marker[1].marker.remove();
      return false;
    }
  });
}

function checkStationary(vehicleNumber, lastMoved) {
  const now = Date.now();
  const element = document.getElementById(vehicleNumber);
  if (Math.abs(now - lastMoved) > VEHICLE_STATIONARY_MS) {
    element.style.display = "none";
  } else {
    element.style.display = "block";
  }
}

function secondsToHHMMSS(seconds) {
  const hours = Math.floor(seconds / 60 / 60);
  const minutes = Math.floor(seconds / 60) % 60;
  seconds = seconds % 60;

  let string = "";

  if (hours > 0) {
    string += `${hours}h`;
  }
  if (minutes > 0 || hours > 0) {
    string += `${minutes}m`;
  }
  string += `${seconds}s`;
  return string;
}

function isStationaryAge(lastMoved) {
  return Date.now() - lastMoved > VEHICLE_STATIONARY_MS;
}

function isInactiveAge(lastUpdated) {
  return Date.now() - lastUpdated > VEHICLE_INACTIVE_MS;
}

async function getFetchTimestamp() {
  const res = await fetch("/api/fetchTimestamp");
  const timestamp = await res.json();
  return timestamp;
}

async function setup() {
  displayVehicles();
  setInterval(update, 1000);
}

setup();
