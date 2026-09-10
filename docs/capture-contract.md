# Capture upload contract

Anything that can produce room outlines in metres can feed the platform. The phone app is one client of this contract; a native iOS app using RoomPlan, a LiDAR scanner export, or a third-party scanning service are others.

## Creating a session

```http
POST /api/capture
Content-Type: application/json

{ "propertyId": "skoallestrjitte", "createdBy": "ruben" }
```

Returns `{ "id": "<uuid>", "token": "<link token>" }`. The token is the only credential the capturing device needs.

## Reading a session

```http
GET /api/capture/<token>
```

Returns `{ session, property }`. Use it to show the address on the device and to let the office poll progress.

## Syncing rooms

```http
PATCH /api/capture/<token>
Content-Type: application/json

{
  "status": "capturing",
  "method": "lidar",
  "rooms": [
    {
      "clientId": "8f2c…",
      "name": "Woonkamer",
      "floorName": "Begane grond",
      "method": "lidar",
      "poly": [{ "x": 0, "y": 0 }, { "x": 5.4, "y": 0 }, { "x": 5.4, "y": 6.1 }, { "x": 0, "y": 6.1 }],
      "height": 2.6,
      "heading": 143.2,
      "openings": [{ "wall": 0, "offset": 1.2, "width": 0.9, "kind": "deur" }],
      "photoIds": []
    }
  ]
}
```

Rules the pipeline relies on:

- `poly` is in **metres**, in the floor's own coordinate frame, listed in order around the room. Three points minimum. The ring is closed implicitly; do not repeat the first point.
- Rooms captured in one continuous session must share one origin. That is what lets the plan place them where they really are. Rooms captured independently should each start at `(0, 0)`, which tells the pipeline to pack them by area instead and to flag the plan as composed rather than surveyed.
- `openings.wall` is the index of the wall in `poly`; wall *i* runs from `poly[i]` to `poly[i+1]`. `offset` is metres from the wall start.
- `heading` is the compass bearing the device read at the start of the measurement, in degrees. Sending it means something stronger than the arrow on the plan: **the outline is drawn in the north-up frame**, with `+y` north and `+x` east. The opnameformulier reads the oriëntatie of every gevel, raam and deur straight out of that frame. A client that cannot put its outline on north leaves `heading` off, and the oriëntatie is then left to the surveyor rather than invented.
- `method` is one of `ar`, `manual`, `lidar`, `import`. It is recorded on the room, so a report can say how a measurement was taken.

Send the full room list every time. The server replaces it.

## The opnameformulier

The same PATCH carries the ISSO 82.1 opnameformulier as `opname`:

```json
{
  "opname": {
    "formulier": "Opnameformulier NTA 8800 Woningen, ISSO 82.1",
    "values": { "gebouwtype": "tussenwoning", "opwekker1": "hr107" },
    "rows": { "gevels": [{ "rowId": "gevel-N", "naam": "Gevel noord", "opp": 18.4, "orientatie": "N" }] },
    "photos": { "voorgevel": ["<photo id>"] },
    "updatedAt": "2026-09-10T09:12:04.000Z"
  }
}
```

`src/lib/opname/schema.ts` is the authority on which fields exist, which answers
they take and which of them a basisopname must have. `gapsFor` in
`src/lib/opname/record.ts` returns what is still open. A client that fills the
form itself should run the same check before closing the capture, because the
server runs it too.

## Photos

```http
POST /api/capture/<token>/photos
Content-Type: multipart/form-data

file=<binary>  kind=ruimte|voorgevel|installatie|meterkast|detail
roomClientId=<clientId>  width=<px>  height=<px>  opnameKey=<bewijslast key>
```

One photo per request, up to 12 MB. `opnameKey` links the photo to a bewijslast requirement on the opnameformulier, for example `voorgevel` or `toestel-typeplaatje`; leave it off for a plain room photo. With Supabase configured the file lands in the `captures` bucket under `<sessionId>/<photoId>.<ext>`; without it, images up to 2 MB are held in the session so the chain still runs end to end.

## Closing the capture

```http
POST /api/capture/<token>/finish
```

The server first checks the opnameformulier and refuses with `400` and a `gaps` list when anything required is still open. Then it regularises every outline, groups the rooms into floors, assembles and draws each floor, writes the floors and the opname record onto the property, sets a first energy estimate when the property has no label yet, and moves the property into processing.

Response:

```json
{
  "propertyId": "skoallestrjitte",
  "floors": [{ "name": "Begane grond", "rooms": 3 }],
  "totalArea": 53.9,
  "estimate": { "label": "A", "index": 0.67 },
  "warnings": ["…"]
}
```

`warnings` carries anything the surveyor should know: a room with too few corners, an area small enough to suggest a wrong reference length, or a floor that had to be composed instead of placed.

## Adding a LiDAR client

Apple's RoomPlan returns a `CapturedRoom` with wall transforms and dimensions. Project each wall's centre onto the floor plane, walk the walls in order to get the corner ring, and post that as `poly` with `method: "lidar"`. Because RoomPlan already works in metres against one world origin, all rooms in a single scan session satisfy the shared-origin rule without extra work.
