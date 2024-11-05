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

async function displayVehicles() {
  try {
    const response = await fetch("/api/vehicleLocations");
    const data = await response.json();

    for (let element of data) {
      try {
        const VR = element.scheduleID.split("_")[2];
        const listID = element.vehicleNumber;
        const vehicleNumber = parseVehicleNumber(listID);

        if (vehicleMarkers[listID] != null) {
          var lat = element.lat;
          var lon = element.lon;
          setIconAngle(vehicleNumber, element.bearing);
          document.getElementById(vehicleNumber).style.display = "block";
          vehicleMarkers[listID].lastUpdated = element.lastUpdated;
          var newLatLng = new L.LatLng(lat, lon);
          vehicleMarkers[listID].marker.setLatLng(newLatLng);
          vehicleMarkers[listID].oldLat = lat;
          vehicleMarkers[listID].oldLon = lon;
          continue;
        }

        const markerIcon = L.divIcon({
          className: "vehicle-icon",
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
        marker.bindTooltip(
          `<b> ${vehicleNumber} </b> - Linija <b>${element.routeID} </b>`
        );
        marker.addTo(map);
        vehicleMarkers[listID] = {
          marker: marker,
          oldLat: element.lat,
          oldLon: element.lon,
          lastUpdated: element.lastUpdated,
        };
        setTimeout(() => setIconAngle(vehicleNumber, element.bearing), 50);
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

let latlng = [45.799755, 15.97396];
let offsetList = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
  [0, 0],
  [1, 1],
  [2, 0],
  [1, -1],
];
let index = 0;
let serviceID = "0_24_1302_13_10624";
let vehicleNumber = "10334";
async function displayVehiclesTest() {
  const VR = serviceID.split("_")[2];
  const listID = vehicleNumber;
  var lat = latlng[0];
  var lng = latlng[1];
  lat += offsetList[index % offsetList.length][0] / Math.pow(5, 4);
  lng += offsetList[index % offsetList.length][1] / Math.pow(5, 4);
  index += 1;
  if (vehicleMarkers[listID] != null) {
    const angle = calculateBearing(
      vehicleMarkers[listID].oldLat,
      vehicleMarkers[listID].oldLon,
      lat,
      lng
    );
    if (angle == null) {
      document.getElementById(vehicleNumber).style.display = "none";
    } else {
      document.getElementById(
        vehicleNumber
      ).style.transform = `rotate(${angle}deg)`;
      document.getElementById(vehicleNumber).style.display = "block";
      vehicleMarkers[listID].lastUpdated = Date.now();
    }

    var newLatLng = new L.LatLng(lat, lng);
    vehicleMarkers[listID].marker.setLatLng(newLatLng);
    vehicleMarkers[listID].oldLat = lat;
    vehicleMarkers[listID].oldLon = lng;
    return;
  }

  const markerIcon = L.divIcon({
    className: "vehicle-icon",
    iconSize: [VEHICLE_ICON_SIZE, VEHICLE_ICON_SIZE],
    iconAnchor: [VEHICLE_ICON_SIZE / 2, VEHICLE_ICON_SIZE / 2],
    popupAnchor: [0, 0],
    html:
      `<b> <p class="vehicle-text"> 13 </b> </br>` +
      "<small> " +
      VR.slice(-2) +
      "</small>" +
      " </p>" +
      `<img class="vehicle-pointer" id="${vehicleNumber}" src="arrow.svg">`,
  });

  let marker = L.marker([lat, lng], {
    icon: markerIcon,
    riseOnHover: true,
  });
  //marker.bindPopup("<p>" + vehicleNumber + "<br/> VR: " + VR + "</p>");
  marker.bindTooltip(`<b> ${vehicleNumber} </b> - Linija <b> 13 </b>`);
  marker.addTo(map);
  vehicleMarkers[listID] = {
    lastUpdated: Date.now(),
    marker: marker,
    oldLat: lat,
    oldLon: lng,
    secondsSinceUpdated: 0,
  };
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

function calculateBearing(oldLat, oldLon, newLat, newLon) {
  dx = newLon - oldLon;
  dy = newLat - oldLat;
  dy = -dy;
  if (Math.abs(dx) < MINIMUM_DISTANCE && Math.abs(dy) < MINIMUM_DISTANCE) {
    return null;
  }
  angle = Math.atan(dy / dx);
  if (dx < 0) {
    angle += Math.PI;
  }

  angle = angle * (1 / DEG_TO_RAD);
  console.log("dy", dy, "dx", dx, "angle", angle + 90);
  return angle + ICON_ANGLE_OFFSET + 90;
}

/*
function calculateBearing(oldLat, oldLon, newLat, newLon) {
  dx = newLon - oldLon;
  dy = newLat - oldLat;
  if (Math.abs(dx) < MINIMUM_DISTANCE && Math.abs(dy) < MINIMUM_DISTANCE) {
    return null;
  }
  const y = Math.sin(newLon - oldLon) * Math.cos(newLat);
  const x =
    Math.cos(oldLat) * Math.sin(newLat) -
    Math.sin(oldLat) * Math.cos(newLat) * Math.cos(newLon - oldLon);
  const angle = Math.atan2(y, x);
  const brng = ((angle * 180) / Math.PI + 360) % 360;
  return 360 - brng + ICON_ANGLE_OFFSET;
}
*/
function deleteInactive() {
  const now = Date.now();

  Object.entries(vehicleMarkers).filter((marker) => {
    if (
      Math.abs(now - marker[1].lastUpdated) >
      5 * 60 * SECONDS_TO_MILLISECONDS
    ) {
      marker[1].marker.remove();
      return false;
    }
  });
}

function checkStationary() {
  const now = Date.now();
  for (marker of Object.entries(vehicleMarkers)) {
    const listID = element.details.vehicle.vehicleNumber;
    const vehicleNumber = parseVehicleNumber(listID);
    marker[1].secondsSinceUpdated = now - marker[1].lastUpdated;
    if (
      Math.abs(now - marker[1].lastUpdated) >
      1 * 60 * SECONDS_TO_MILLISECONDS
    ) {
      document.getElementById(vehicleNumber).style.display = "none";
    }
  }
}

setInterval(displayVehicles, 10000);
//setTimeout(deleteInactive, 10000);
displayVehicles();
