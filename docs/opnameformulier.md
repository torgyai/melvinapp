# Het opnameformulier NTA 8800

A floor plan is not an energy label. The label follows from the ISSO 82.1
opnameprotocol, whose form asks for the whole thermische schil and every
installation in the house. `src/lib/opname` holds that form as data, so the
phone renders it, the completeness check reads it and the report prints it from
one source.

## What is in the schema

`schema.ts` is the form itself: sections, fields, the exact Dutch labels and the
answer options the official form prints. Two kinds of section:

- **form** sections are a list of fields, each of which may be conditional on an
  earlier answer. A gas boiler asks for its Gaskeur; a warmtepomp asks for its
  bron instead.
- **table** sections are the bouwdelen tables: vloeren, daken, gevels, ramen,
  deuren and paneelconstructies. Each row is one bouwdeel.

Every section also carries its **bewijslast**: the photos ISSO expects, with how
many of each. A photo requirement can be conditional too, so a house without
solar panels is never asked for a photo of the omvormer.

The set here is the **basisopname**. A detailopname additionally asks for Rc- and
U-waarden per bouwdeel with bewijsstukken, lineaire koudebruggen, werkelijke
leidinglengtes and BCRG-codes from gecontroleerde kwaliteitsverklaringen. Those
are documents, not observations, so they belong in the office rather than on the
phone. The form still records which level the opname was, because the report has
to say so.

## What the scan fills in

`autofill` in `record.ts` writes in everything the geometry settles, and never
overwrites an answer that is already there:

- gebruiksoppervlakte per bouwlaag, gebouwhoogte and the number of bouwlagen
- one gevelregel per oriëntatie, with the glass and doors already subtracted
- the begane grondvloer with its oppervlak and perimeter
- two dakvlakken, or one flat roof, sized from the top floor
- one raamregel per window the rondscan found, and one deurregel per outside door

`footprint.ts` does the geometry, and it refuses to guess twice over.

A wall belongs to the thermische schil when no other room traces the same line,
in the opposite direction, within a wall thickness. That test only means
anything when the rooms share one frame, which is what a single walk gives.
Rooms traced one at a time all start at their own origin, so nothing ties the
outlines together: on such a floor no wall can be called interior, and therefore
none is called exterior either. The gevel table is left empty for the surveyor
rather than filled with every partition wall at twice the real area.

The oriëntatie comes from the outward normal of the wall, which is the wall
bearing plus ninety degrees because a regularised outline runs counter
clockwise. That normal is only a compass direction when the outline sits in the
north-up frame, and only the camera routes produce one: they measure every point
from a compass reading, so `+y` is north and `+x` is east. A room typed in wall
by wall carries no heading and no frame, and its walls get no oriëntatie at all.

Windows and doors are matched to the wall they were measured on, by room and
wall index, and their area is scaled by the same exterior share as the gevel, so
the raamlijst and the gevelregels never disagree about one window.

## The completeness check

`gapsFor` walks the schema against the record and returns everything still open:
a required field with no answer, a table with too few rows, a bewijslast photo
that has not been taken. The phone shows the count per section and refuses to
send while it is above zero, and `/api/capture/<token>/finish` refuses as well,
so a capture posted by anything other than the phone app is held to the same
bar.

## From the form to the calculation

`derive.ts` turns the record into what NTA 8800 works with. A basisopname records
what can be seen rather than a measured Rc, so the forfaitaire route applies: a
bare construction gets the Rc of its build-up, visible insulation without a
readable thickness gets the na-isolatie value of 1,3 m²K/W, and a readable
thickness is converted with λ 0,04 W/mK. Windows are grouped per glassoort and
kozijntype and given the forfaitaire Uw for that pair. Every element carries the
sentence that says which route produced it, so a report never presents a
forfaitaire value as a measurement.

Nothing drops out. A bouwdeel whose isolatie is still unanswered, or answered
"onbekend", keeps its area and takes the bouwjaar-typering value, and the line
says so. Leaving it out would let that surface count as if it lost no heat at
all, which is the one error that flatters a house. For the same reason a window
whose kozijntype is missing is priced as the worst of the three rather than the
best.

`envelopeFor` prefers this over the bouwjaar-typering whenever a record exists,
and `installatiesFor` does the same for the installations.
