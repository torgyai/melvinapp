# Krik je energielabel op — platform

Software for an energy label and floor plan business: take a property on with a phone, get a floor plan and a NEN 2580 measurement table out of the capture, run the NTA 8800 calculation, and track every job, advisor and client through to sign-off in EP-online.

The whole product runs in one Next.js app:

- **Platform** (`/overzicht`, `/panden`, `/kaart`, `/dashboard`, `/email`, `/uitbreidingen`) for the office.
- **Opname** (`/capture/<token>`) for the phone in the field. Installable, works with no signal.
- **Klantweergave** (`/klant/<id>`, `/klant/portfolio/<owner>`) for the homeowner or the portfolio owner.
- **Indicatiewebsite** (`/indicatie`) for visitors, which drops a lead straight into the platform.

## Running it

```bash
npm install
cp .env.example .env.local
npm run dev
```

With no Supabase credentials the app runs on a seeded in-process store, so it is clickable immediately. Data lives for as long as the server process does.

For a real database:

```bash
supabase db push                # applies supabase/migrations/0001_init.sql
npm run db:seed                 # loads the demo portfolio
```

Set `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_APP_URL`. The last one is what the QR code on `/scan` points a phone at, so it has to be reachable from a phone: use the machine's LAN address in development and the deployed origin in production.

Optional keys, each of which turns on one lookup:

| Variable | What it adds | Where to get it |
| --- | --- | --- |
| `BAG_API_KEY` | Build year and floor area from the BAG | Kadaster, BAG Individuele Bevragingen v2 |
| `EP_ONLINE_API_KEY` | The label already registered on the address | RVO, EP-Online public API |

Address, postcode, city and coordinates always come back for real: PDOK Locatieserver is open and needs no key. When a keyed source is missing, the interface says which source was not consulted instead of inventing a plausible number.

## The capture flow

1. Someone in the office opens `/scan`, picks a property (or adds one from postcode and house number), and gets a QR code.
2. The phone opens `/capture/<token>`. No login, no app store.
3. Per room: pick the floor, name it, then measure it one of three ways.
   - **AR**, on phones with WebXR and ARCore. Point at the floor, tap the corners, the phone returns metres.
   - **Muur voor muur**, the laser meter route. Type each wall length and the turn after it; the app shows the closure error so a typo is visible before the room is saved.
   - **Hoeken aantikken**, on any phone. Tap the corners on the camera image and give one measured wall to scale it.
4. Photos per room queue in IndexedDB and upload when there is signal.
5. Fill in the opnameformulier NTA 8800: the thermische schil, the installations and the bewijslast photos. What the scan measured is already in it. The app counts what is still open per section and will not send until it is zero.
6. Sending the capture builds the floors, regularises every outline, draws the plan, fills the NEN 2580 table and moves the property into processing.

Rooms measured in one continuous walk share an origin, so they are placed where they actually are. Rooms measured one at a time are packed into a plan by area, and the result says so rather than pretending the layout is surveyed.

## What is real and what is a stand-in

Real: the geometry pipeline, the NEN 2580 category split, the ISSO 82.1 opnameformulier with its completeness check and bewijslast, the NTA 8800 calculation and its what-if simulator, the address lookup, the capture link, the offline queue, the lead intake, the reports and their print output.

Stand-ins, clearly marked in the interface: the photo finishing and video assembly steps in the pipeline (the platform tracks them, it does not perform them yet), the Vabi hand-off (the file format is prepared for it, the export is not written), and the modules under Uitbreidingen, which are previews of work that is not in scope.

## Layout

```
src/app/(platform)      office screens
src/app/capture         phone capture app
src/app/indicatie       public indication site
src/app/klant           client-facing progress pages
src/app/api             capture, lead, lookup and property endpoints
src/lib/floorplan       geometry, assembly, SVG rendering, capture processing
src/lib/opname          the ISSO 82.1 opnameformulier: schema, record, geometry, derivation
src/lib/nta8800.ts      envelope, installations, energy demand, label, simulator
src/lib/nen2580.ts      measurement categories and totals
src/lib/lookup          PDOK, BAG and EP-Online clients
src/lib/db              store interface, in-process store, Supabase store
supabase/migrations     schema
```

The stylesheet in `src/app/base.css` is the design system. Components reuse its class names rather than adding new ones.

## Deploying

Vercel picks the repo up as a standard Next.js project. Set the environment variables above, run the migration against the Supabase project, and point `NEXT_PUBLIC_APP_URL` at the deployment. The capture app needs HTTPS for camera and WebXR, which the deployment gives you and `localhost` also allows.
