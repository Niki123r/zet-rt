// code that was used to test the "calculateBearing" function with some dummy data
// moved from map.js to here

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
