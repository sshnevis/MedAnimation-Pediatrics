# Floor plan — visit-room v3 (Reels 9:16)

Room size: **138 × 108** voxel units · wall height 36 · half-extents X ±69, Z ±54
Axes: **+X right** (exam bed) · **-X left** (doctor desk) · **-Z back** (door) · **+Z front** (wide camera)
No ceiling (dollhouse cameras look down from +Z).

```
                         BACK WALL  z = -54
   -69                                                              +69
    |  [clock] [welcome  [DOOR x=6]  [food: potato·yogurt·katmast·ORS] [stetho]
    |          poster]
    |  [desk+monitor]                              [exam bed ‖ right wall]
    |  [office chair★]                             [stool]  [whiteboard]
    |       ★ DOCTOR seated (-30,-30)
    |              ~~~~ rug (48×30) ~~~~
    |        ★ CHILD sit (5,15)  ★ MOTHER sit (18,12)
    |  [sideTable]                    [bookshelf R]  [plant]
    |  [bookshelf L]
    |                         FRONT  (+Z)
    |              📷 wide cameras out here (~ z 148–158)

  LEFT WALL: large window (36×18) cut through the 5-unit-thick wall —
  scenery tunnel (sky/sun/trees/bushes/clouds), glass mid-tunnel, sill +
  plant inside the room (side:"left")
```

### Wall & window construction (all rooms, since ep02)

- Walls have real thickness (`wallThickness`, default 5) — the window wall is
  built as 4 segments around the opening, so the window is a true tunnel.
- Window dressing keys in the room JSON: `frame` (white when set, else legacy
  metal), `blind: true` (roller blind), `curtainSide` (one bunched panel;
  unset = legacy pair), `greenery` (voxel trees/bushes).
- Composition: window near the back-wall corner, fully visible in the opening
  wide shot; see QUALITY_RULES Q8–Q10 and BUGFIX_RULES 21–22.

## Entry & blocking (ep01, v3)

| Mark | [x, z] | What happens |
|---|---|---|
| `motherStart` / `childStart` | (6,-62) / (2,-60) | Family waits **outside** the door (z beyond −54) |
| Door opens | x=6 on back wall, light brown `#b08968` | t≈0.15–1.0 |
| Walk-in | → `motherSit` (18,12), `childSit` (5,15) | Mother 1.0→5.4s · Child 1.15→5.45s |
| `doctorSit` | (-30,-30) | Doctor **seated** behind the desk from the start; waves |
| Sit + face | both family members sit on the guest chairs, face `familyFace` | ~5.4s |
| `tray` / `water` / `warn` / `heart` | (-6,2) / (-28,-16) / (-16,-18) / (5,15) | Prop marks |

## Camera grammar (vertical, v3)

Medium/wide only — no close head shots. Camera is **static during a shot** (`dolly: 0`
except the opening `wide-door` push-in). Consecutive lines can share one held angle
(L03–L04 hold `medium-doctor`).

| Shot | Used for | Notes |
|---|---|---|
| `wide-door` | L01 | Far on +Z; tiny dolly push-in |
| `over-doctor` | L02, L08 | Behind doctor's shoulder → family |
| `medium-doctor` | L03 + L04 (HOLD) | Doctor from front-left flank |
| `medium-doctor-2` | L05, L07 | Doctor from right flank |
| `child` | L06 | Pulled-back medium from the front (−Z); heart stacks above |
| `wide-final` | L09 | Closing wide |

Sightline rule: never put the other party between camera and subject. Subjects sit at
roughly ⅓–½ of frame height.

## Props

| Prop | World [x, z] | When |
|---|---|---|
| Food tray | (-6, 2), rises to y=14 | L03 |
| Food posters | back wall x=24/33/42/51, pulse in sync with each food | L03 |
| Water + warning | float above the desk (-28,-16) / (-16,-18) | L04 |
| Heart | above seated child y≈22 | L06 |

---

# Floor plan — pediatric-visit-room (ep02, fever)

Full definition: `library/room/pediatric-visit-room.json` (its shots are declared
entirely in the room JSON — no per-episode blocking.js edits). Rebuilt 1:1 against
`scenario/project 2.png`; built with the wall-tunnel window construction (see
"Wall & window construction" above) and ep02's furniture types
(`drawerCabinet`, `examBed`, `growthChart`, `heartPoster`).

| Shot | Used for |
|---|---|
| `wide-establishing` | L01 — Camera A, slow push-in then hold |
| `family-two-shot` | L02 — mother+child two-shot from the doctor's side of the axis (both faces visible) |
| `medium-doctor` | doctor lines (Camera B) |
| `medium-family` / `medium-family-close` | mother+child lines (Camera C) |
| `close-mother` | L12 — over-the-family shot from front-right +Z (their backs; doctor + desk face the camera), lower and wider than the opening wide |
| `close-doctor` | L15 (infant warning lead-in) |
| `insert-medicine` | L11 / L16 — desk medicine insert (props pop at 0.5 scale) |

Axis discipline: doctor on one side, family on the other in every shot. The family
sits facing the doctor (−Z), so any camera placed on +Z in front of them sees their
BACKS — a family two-shot with faces visible must sit on the doctor's side of the
axis (see `family-two-shot`); an intentional backs-shot of the family with the
doctor facing camera goes far out on +Z and lower (`close-mother`).
