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
- `heading` is the compass bearing in degrees of the first wall, when the device knows it. It orients the north arrow.
- `method` is one of `ar`, `manual`, `lidar`, `import`. It is recorded on the room, so a report can say how a measurement was taken.

Send the full room list every time. The server replaces it.

## Photos

```http
POST /api/capture/<token>/photos
Content-Type: multipart/form-data

file=<binary>  kind=ruimte|voorgevel|installatie|meterkast|detail
roomClientId=<clientId>  width=<px>  height=<px>
```

One photo per request, up to 12 MB. With Supabase configured the file lands in the `captures` bucket under `<sessionId>/<photoId>.<ext>`; without it, images up to 2 MB are held in the session so the chain still runs end to end.

## Closing the capture

```http
POST /api/capture/<token>/finish
```

The server regularises every outline, groups the rooms into floors, assembles and draws each floor, writes the floors onto the property, sets a first energy estimate when the property has no label yet, and moves the property into processing.

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
