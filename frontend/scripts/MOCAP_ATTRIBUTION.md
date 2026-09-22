# Motion capture attribution

Eteria 4.2 uses retargeted motion data for the playable hero's **Walk** and **Run** animation clips.

Source: **Carnegie Mellon University Graphics Lab Motion Capture Database**  
Official site: https://mocap.cs.cmu.edu/  
Source motions: subject 02, clips `02_01` (walk) and `02_03` (run/jog).

CMU states in its FAQ that the motion capture data may be copied, modified, or redistributed without permission. The copies used during development were retrieved from the public `una-dinosauria/cmu-mocap` mirror and then downsampled and retargeted to Eteria's custom skeleton.

The resulting retarget data is stored in `scripts/cmu-mocap-retarget.json` and baked into `public/assets/eteria_hero.gltf` by `scripts/generate-hero-gltf.mjs` during each frontend build.

Combat clips (`Attack_1`, `Attack_2`, `Heavy_Attack`, `Dash`) are original Eteria skeletal animations and are not represented as CMU mocap.
