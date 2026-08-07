const protobuf = require("protobufjs");
const express = require("express");
const { calculateBearing } = require("./utils.js");
const fs = require("fs");
const fsa = require("fs").promises;

const app = express();
const port = process.env.PORT ?? 3000;
app.use(express.static("public"));

const url = "https://api.autotrolej.hr/api/open/v1/voznired/autobusi";
const protoLocation = "gtfs.proto";
const fetchPeriod = 15; // seconds

let vehicles = {};

let schedule = null;

app.get("/api/vehicleLocations", async (request, response) => {
  try {
    const res = await fsa.readFile("./cache/vehicles.json", "utf-8");
    const json = await JSON.parse(res);

    response.send(json);
  } catch {
    response.status(204).send();
  }
});

async function cacheLocations() {
  /*const proto = protobuf.load(protoLocation, async (err, root) => {
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
  });*/

  try {
    const data = await fetch(url);
    const json = await data.json();
    let cache = [];
    json.res.forEach((element) => {
      processVehicle(element);
    });

    let timestamp = Date.now();

    Object.values(vehicles).forEach((element) => {
      cache.push({ ...element });
    });

    writeJSON({ vehicles: cache, timestamp: timestamp }, "vehicles");
  } catch (error) {
    console.error(error);
  }
}

function processVehicle(vehicle) {
  const vehicleID = vehicle.gbr;
  const now = Date.now();
  if (vehicles[vehicleID] != null) {
    var lat = vehicle.lat;
    var lon = vehicle.lon;

    vehicles[vehicleID].lat = lat;
    vehicles[vehicleID].lon = lon;
    const bearing = calculateBearing(
      vehicles[vehicleID].oldLat,
      vehicles[vehicleID].oldLon,
      lat,
      lon,
    );
    if (bearing != null) {
      vehicles[vehicleID].bearing = bearing;
      vehicles[vehicleID].lastMoved = now;
    }
    vehicles[vehicleID].oldLat = lat;
    vehicles[vehicleID].oldLon = lon;
    vehicles[vehicleID].lastUpdated = now;
    vehicles[vehicleID].lastUpdatedZET = vehicle.lastUpdated;

    vehicles[vehicleID].scheduleID = undefined;
    vehicles[vehicleID].routeID = getLine(vehicle);
    return;
  }
  vehicles[vehicleID] = {
    vehicleNumber: vehicleID,
    scheduleID: vehicle.gbr,
    routeID: getLine(vehicle),
    lat: vehicle.lat,
    lon: vehicle.lon,
    oldLat: null,
    oldLon: null,
    bearing: null,
    lastUpdated: Date.now(),
    lastUpdatedZET: vehicle.lastUpdated,
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

function loadOldVehicles() {
  try {
    let file = fs.readFileSync("./cache/vehicles.json");
    const json = JSON.parse(file.toString());
    for (let vehicle of json.vehicles) {
      vehicles[vehicle.vehicleNumber] = vehicle;
    }
  } catch (error) {
    console.error(error);
  }
}

function loadJsonFile(path) {
  try {
    let file = fs.readFileSync(path);
    const json = JSON.parse(file.toString());
    return json;
  } catch (error) {
    console.error(error);
  }
}

function loadSchedule() {}

async function getSchedule() {
  const now = Date.now();
  if (
    (schedule != null && schedule.timestamp + 24 * 60 * 60 * 1000 > now) ||
    schedule == null
  ) {
    const res = await fetch(
      "https://api.autotrolej.hr/api/open/v1/voznired/polasci",
    );

    const json = await res.json();

    schedule = {
      timestamp: now,
      schedule: json.res,
    };
  }
}

function getLine(vehicle) {
  const voznjaId = vehicle.voznjaId;
  const voznjaBusId = vehicle.voznjaBusId;
  for (let element of Object.values(schedule.schedule)) {
    for (let polazak of element.polazakList) {
      if (polazak.voznjaId == voznjaId || polazak.voznjaBusId == voznjaBusId) {
        return element.brojLinije;
      }
    }
  }

  return undefined;
}

function setupFolders(folders) {
  for (let folder of folders) {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }
  }
}

async function setup() {
  setupFolders(["./cache"]);
  loadOldVehicles();

  await getSchedule();
  setInterval(getSchedule, fetchPeriod * 60 * 1000);

  setInterval(cacheLocations, fetchPeriod * 1000);
  cacheLocations();
}

setup();

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
