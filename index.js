const protobuf = require("protobufjs");
const express = require("express");
const { calculateBearing } = require("./utils.js");
const fs = require("fs");

const app = express();
const port = 3000;
app.use(express.static("public"));

const url = "https://www.zet.hr/gtfs-rt-protobuf";
const protoLocation = "gtfs.proto";
const fetchPeriod = 10; // seconds

let vehicles = {};

app.get("/api/vehicleLocations", async (request, response) => {
  const res = fs.readFileSync("./cache/vehicles.json", "utf-8");
  const json = await JSON.parse(res);

  response.send(json);
});

async function cacheLocations() {
  const proto = protobuf.load(protoLocation, async (err, root) => {
    if (err) {
      throw err;
    }
    try {
      var message = root.lookupType("Message");
      let data = await fetch(url).then(async (res) => {
        const buffer = new Uint8Array(await res.arrayBuffer());
        const data = message.decode(buffer);
        return data.toJSON();
      });
      data.vehicle = data.vehicle.filter((el) => {
        return el.id.match("_") != null;
      });

      for (let vehicle of data.vehicle) {
        try {
          processVehicle(vehicle);
        } catch (e) {}
      }
      let cache = [];
      for (let element of Object.entries(vehicles)) {
        const vehicle = element[1];
        cache.push({
          vehicleNumber: vehicle.vehicleNumber,
          scheduleID: vehicle.scheduleID,
          routeID: vehicle.routeID,
          lat: vehicle.lat,
          lon: vehicle.lon,
          bearing: vehicle.bearing,
          lastUpdated: vehicle.lastUpdated,
          lastUpdatedZET: vehicle.lastUpdatedZET,
          lastMoved: vehicle.lastMoved,
        });
      }
      const vehicleLocations = {
        timestamp: Date.now(),
        vehicles: cache,
      };
      writeJSON(vehicleLocations, "vehicles");
    } catch (error) {
      console.error(error);
    }
  });
}

function processVehicle(vehicle) {
  const vehicleID = vehicle.detailsLocation.vehicle.vehicleNumber;
  const now = Date.now();
  if (vehicles[vehicleID] != null) {
    var lat = vehicle.detailsLocation.location.lat;
    var lon = vehicle.detailsLocation.location.lon;

    vehicles[vehicleID].lat = lat;
    vehicles[vehicleID].lon = lon;
    const bearing = calculateBearing(
      vehicles[vehicleID].oldLat,
      vehicles[vehicleID].oldLon,
      lat,
      lon
    );
    if (bearing != null) {
      vehicles[vehicleID].bearing = bearing;
      vehicles[vehicleID].lastMoved = now;
    }
    vehicles[vehicleID].oldLat = lat;
    vehicles[vehicleID].oldLon = lon;
    vehicles[vehicleID].lastUpdated = now;
    vehicles[vehicleID].lastUpdatedZET =
      vehicle.detailsLocation.timestamp * 1000;

    vehicles[vehicleID].scheduleID =
      vehicle.detailsLocation.scheduleData.vehicleId;
    vehicles[vehicleID].routeID = vehicle.detailsLocation.scheduleData.routeId;
    return;
  }
  vehicles[vehicleID] = {
    vehicleNumber: vehicleID,
    scheduleID: vehicle.detailsLocation.scheduleData.vehicleId,
    routeID: vehicle.detailsLocation.scheduleData.routeId,
    lat: vehicle.detailsLocation.location.lat,
    lon: vehicle.detailsLocation.location.lon,
    oldLat: null,
    oldLon: null,
    bearing: null,
    lastUpdated: Date.now(),
    lastUpdatedZET: vehicle.detailsLocation.timestamp * 1000,
    lastMoved: Date.now(),
  };
}

async function writeJSON(json, file_name) {
  const path = "./cache/" + file_name + ".json";
  const data = JSON.stringify(json);

  fs.writeFile(path, data, "utf8", (err) => {
    if (err) {
      console.log("An error occured while writing JSON Object to File.");
      return console.log(err);
    }

    //console.log(file_name + ".json saved.");
  });
}

async function loadOldVehicles() {
  try {
    let file = fs.readFileSync("./cache/vehicles.json");
    const json = JSON.parse(file.toString());
    for (let vehicle of json.vehicles) {
      vehicles[vehicle.vehicleNumber] = vehicle;
    }
    console.log(vehicles);
  } catch {}
}

function setupFolders(folders) {
  for (let folder of folders) {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }
  }
}

function setup() {
  setupFolders(["./cache"]);
  loadOldVehicles();
  setInterval(cacheLocations, fetchPeriod * 1000);
  cacheLocations();
}

setup();

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
