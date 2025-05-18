# zet-rt
Simple Node based web app that displays the real-time position of [`ZET`](https://www.zet.hr/) trams and buses using their [`GTFS feed`](https://www.zet.hr/odredbe/datoteke-u-gtfs-formatu/669).\
Currently being hosted on https://zet-rt-249527749218.europe-central2.run.app/ (subject to change).

## Setup
Install the required packages using npm:
```bash
npm install
```

Run the server:
```bash
node index.js
```

Cached vehicle positions will appear in `./cache/vehicles.json`, which the client fetches.
