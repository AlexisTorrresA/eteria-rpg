# Eteria external 3D assets

Eteria 5.0 uses selected **KayKit** assets by Kay Lousberg.

## License

The selected KayKit Adventurers and KayKit Skeletons assets are released under **Creative Commons Zero (CC0 1.0 Universal)**. They may be used in personal, educational, and commercial projects without mandatory attribution.

Eteria still keeps this source record for provenance and reproducible builds.

## Sources pinned by the build

- KayKit Character Pack: Adventurers  
  Source repository: `KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0`  
  Pinned commit: `672074b73ba276876a19e8816ecdc5241817ab47`
- KayKit Character Pack: Skeletons  
  Source repository: `KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0`  
  Pinned commit: `15b62b9bad122f72926c10fb14d622c73819fa54`

## Assets used

Playable variants:
- Rogue
- Rogue Hooded
- Knight

Enemies:
- Skeleton Rogue
- Skeleton Warrior

Weapons/accessories:
- one-handed sword
- two-handed sword
- dagger
- two-handed axe
- staff
- two-handed crossbow

The runtime files are fetched and Git-blob-SHA verified by `scripts/fetch-kaykit-assets.mjs` before Vite/Capacitor builds. They are copied into `public/assets/kaykit/runtime` and therefore bundled into both the web distribution and Android APK.
