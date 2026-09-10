# From capture to floor plan

The pipeline lives in `src/lib/floorplan`. Four stages, each one a pure function over the stage before it.

## 1. Regularise (`geometry.ts`)

A traced or tapped outline carries jitter, and even a laser-measured room comes in a degree or two off axis. `regularize` cleans it:

1. `dedupe` drops points within 5 cm of their neighbour.
2. `simplify` runs Ramer-Douglas-Peucker at 10 cm, removing corners that are only noise.
3. `dominantAngle` finds the angle the building is built on by bucketing every wall direction modulo 90 degrees, weighted by wall length. Houses are overwhelmingly rectilinear, so the heaviest bucket is the building axis.
4. The ring is rotated onto that axis, and every wall within 20 degrees of horizontal or vertical is forced to it by moving both endpoints halfway.
5. `preserveArea` scales the result back so the m² on the plan equals the m² that was measured. Snapping shifts area by a fraction of a percent, and the measurement is what goes in the report, so the drawing yields to it.
6. The ring is rotated back.

The area you see on the plan is therefore always the measured area, and the walls are always square.

## 2. Assemble (`assemble.ts`)

`assembleFloor` decides whether the rooms on a floor can be placed or have to be composed.

**Placed.** Every room has geometry and they do not all start at the origin, which means they were captured in one walk against a shared frame. Their outlines already sit correctly relative to each other, so they are drawn where they are.

**Composed.** Otherwise, `packRooms` lays them out: largest room first, shelf-packed into a footprint with a house-like aspect ratio, with a 12 cm gap standing in for wall thickness. Rooms without geometry become rectangles sized from their m² with a proportion picked from the room name, so a hall is long and narrow and a bathroom is close to square. The floor is marked `surveyed: false` and the interface says the plan is composed on area rather than surveyed.

The original room order is restored afterwards, so the table under the plan reads in the order the surveyor worked.

## 3. Draw (`render.ts`)

`renderFloorSvg` produces a finished SVG in the house style: black walls whose weight scales with the drawing, room fills keyed off the room name (service rooms grey, wet rooms blue, circulation amber, living spaces sand), the name and area centred in each room, door swings and window gaps where openings are known, a north arrow honouring the captured heading, and a metric scale bar.

Label size is expressed in metres and converted through the drawing's own scale, so a plan stays readable whether it is shown in a panel or printed full width.

`labelAnchor` uses the bounding-box centre when that point is inside the polygon and the vertex average otherwise, which keeps labels inside L-shaped rooms.

## 4. Process (`process.ts`)

`processCapture` groups rooms by floor name, regularises each one, computes areas from the geometry, assembles and draws each floor, and returns the floors, the plans, the total area, a first energy estimate and any warnings.

The estimate is deliberately weak: area, build year and a stable per-property hash. It exists so a job has a number before the NTA 8800 run, and it never overwrites a label that is already set.

## Extending it

Doors and windows are already in the type and the renderer. A capture client that knows where they are gets them drawn for free.

Wall thickness is currently one constant in `packRooms`. Real thickness per wall would come from a LiDAR capture and would replace that constant rather than change the structure.

Room adjacency is not yet inferred for composed floors. Shared wall lengths and door positions would let `packRooms` join rooms along their real connections instead of shelf-packing them, which is the next meaningful upgrade to plan quality.
