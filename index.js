const protobuf = require("protobufjs");
const express = require("express");
const { calculateBearing } = require("./utils.js");
const fs = require("fs");

const app = express();
const port = 3000;
app.use(express.static("public"));

const url = "https://www.zet.hr/gtfs-rt-protobuf";
const protoLocation = "gtfs.proto";

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
        processVehicle(vehicle);
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
        });
      }
      writeJSON(cache, "vehicles");
    } catch (error) {
      console.error(error);
    }
  });
}

function processVehicle(vehicle) {
  const vehicleID = vehicle.detailsLocation.vehicle.vehicleNumber;
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
    }
    vehicles[vehicleID].oldLat = lat;
    vehicles[vehicleID].oldLon = lon;
    vehicles[vehicleID].lastUpdated = Date.now();
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

setInterval(cacheLocations, 10000);
cacheLocations();

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
