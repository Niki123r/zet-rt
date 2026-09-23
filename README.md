# zet-rt

Node/Express based web app that displays the real-time positions of [`ZET`](https://www.zet.hr/) trams and buses using their [`GTFS feed`](https://www.zet.hr/odredbe/datoteke-u-gtfs-formatu/669).\
Features display of timing data (vehicle position age) and toggleable layer of last seen (ghost) positions of vehicles.\
Currently being hosted on https://zet-rt.netlify.app/.

## Setup

Install the required packages using npm:

```bash
npm install
```

Run the server:

```bash
node index.js
```

Vehicle positions are cached in `./cache/vehicles.json`, which the client fetches.
