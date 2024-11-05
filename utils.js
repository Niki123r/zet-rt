const { MINIMUM_DISTANCE, DEG_TO_RAD } = require("./contstants");

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
  return angle + 90;
}

function assertMinimumDistance(oldLat, oldLon, newLat, newLon) {
  dx = newLon - oldLon;
  dy = newLat - oldLat;
  return Math.abs(dx) < MINIMUM_DISTANCE && Math.abs(dy) < MINIMUM_DISTANCE;
}

module.exports = { calculateBearing };
