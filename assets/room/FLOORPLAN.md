# Floor plan — visit-room (Reels 9:16)

Room size: **110 × 90** voxel units · wall height 36  
Axes: **+X right** (exam bed) · **-X left** (doctor desk) · **-Z back** (door) · **+Z front** (wide camera)

```
                         BACK WALL  z = -45
   -55                                                    +55
    |  [cabinet]   [window]     [DOOR x=8]   [poster] [plant]
    |                 clock
    |   [desk]                          [exam bed]
    |   [doc chair]
    |        ★ DOCTOR (-14,-8)
    |              ~~~~ rug (wider) ~~~~
    |        ★ MOTHER sit (0,14)          ★ CHILD (18,16)
    |
    |                    FRONT  (+Z)
    |              📷 wide cameras out here (~ z 70–90)
```

## Entry & blocking (ep01)

| Mark | [x, z] | What happens |
|---|---|---|
| `motherStart` / `childStart` | (8,-52) / (5,-50) | Family waits **outside** the door |
| Door opens | x=8 on back wall | t≈0.15–1.0 |
| Walk-in | → `motherSit` (0,14), `childStand` (18,16) — ~18 units apart | Mother 1.0→5.0s · Child 1.15→5.05s |
| `doctorStand` | (-14,-8) | Doctor waves, faces family |
| Sit + face | mother sits; both face `familyFace` | ~5.0s |

## Camera grammar (vertical)

- **Wide** — far on +Z, look toward door / cluster (opening + finale)
- **Doctor** — from the **right flank** (+X, z ≈ doctor). Ray stays near doctor's Z so it never goes through the family.
- **Family** — from the **front** (+Z), slightly left of mother/child
- **Child** — straight on +Z in front of the child (heart stacks above)

Sightline rule: never put the other party between camera and subject.

## Props

| Prop | World [x, y, z] | When |
|---|---|---|
| Food tray | (-4, rises→14, 2) | L03 |
| Water + warning | near doctor | L04 |
| Heart | above child y≈22 | L06 |
