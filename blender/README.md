# Blender worlds

Worlds are built in Blender and exported to `src/assets/worlds/<name>/`. The game loads them and adds only what must move: fire, light flicker, and sky.

| File | Purpose |
|------|---------|
| `worlds/hearth.blend` | Hearth's terrain, campsite, forest, and ground cover. Open this to edit the world. |
| `worlds/sky.blend` | Galaxy glow nodes shared by every world. |
| `build_hearth.py` | Regenerates `hearth.blend` from scratch. This overwrites hand edits. |
| `build_sky.py` | Regenerates `sky.blend` and bakes `src/assets/sky/`. |
| `export_world.py` | Exports an open `.blend` into the game's assets. |
| `hearth_props.py` | Hearth's everyday items: cabin, desk, bicycle, and so on. |
| `kit.py` | Shared colours, models, placement, and preview code for world scripts. |

## Edit a world

1. Open `blender/worlds/hearth.blend`.
2. Make your changes. Sculpt `Terrain`, move trees, or duplicate them with Alt+D so they stay instanced.
3. Save the file.
4. Run the export from the repo root:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b blender/worlds/hearth.blend \
  --python blender/export_world.py -- hearth
```

## Move the spawn point or fire

Move these Empties in Blender, then export:

- `Spawn` sets where the player starts. The player always starts facing `FirePoint`.
- `FirePoint` sets where the flames and firelight appear.
- `LanternLight.*` set where lantern light comes from. `DeskLamp` does the same for the desk lamp.
- `Portal.*` set each portal tent's door. Move one along with its tent, and rotate nothing: its `yaw` property sets which way the door faces.
- `DogStart` sets where Ivy starts. `CreditsSign` sets where the credits prompt appears, so move it along with the sign.

The `walk_radius` custom property on `Spawn` sets how far from the centre the player can walk.

## Collisions

The export builds collision shapes from the objects in the file, so moving an item moves its collision. Add new items' groups or names to the lists at the top of `export_world.py`.

- Only groups in `SOLID_GROUPS` block anyone. Grass, ferns, flowers, and bushes stay walkable.
- Items up to 1.1 tall can be stood on, unless listed in `NEVER_STAND_ON`. Anything taller blocks at every height.
- Names in `NO_COLLISION` are ignored. `FOOTPRINT_OVERRIDES` corrects shapes whose outline misleads, such as tents with guy lines.

## Rules the export relies on

- One Blender unit is one game unit. Blender `(x, y, z)` maps to game `(x, z, -y)`.
- The ground object is named `Terrain` and has no object transform. Apply it with Ctrl+A if it moves.
- `Terrain` must cover the 160 x 160 unit area around the origin.
- Each object is a child of a group Empty, such as `TreesHero` or `Campsite`, and its name starts with that group's name. `src/environment/WorldAssets.ts` uses those names to set shadows and colour variation.

## Preview without the game

Add `-- --preview some/folder` to the `build_hearth.py` command. It renders the world with the game's fog, moonlight, and colours.
