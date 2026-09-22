# Eteria: Fragmentos del Eclipse

RPG 3D mobile-first hecho con **JavaScript + Three.js**, empaquetable como APK Android con Capacitor y servido por **FastAPI**.

## Eteria 6

Eteria 6 sustituye el héroe principal de KayKit por una composición humanoide modular basada en **Quaternius**, manteniendo KayKit como fallback seguro:

- protagonista ensamblado por capas independientes de **outfit + cabeza + cabello**;
- tres presets visuales ligados al equipo: **Guardián**, **Explorador** y **Espadachín del Éter**;
- animación mediante **Universal Animation Library 2**, con selección semántica de idle, walk, run, dodge, combos y ataque pesado;
- cada capa modular comparte exactamente la misma escala y animación para evitar separaciones de cabeza, cabello o ropa;
- sockets de arma sobre `hand_r` / `hand_l`, incluyendo soporte para dagas dobles;
- Liora y Eldren pasan a tener presencia física como NPC humanoides animados;
- el héroe procedural sigue disponible como último fallback;
- orden de carga por defecto: **Quaternius → KayKit → procedural**;
- `?hero=kaykit` fuerza el héroe anterior y `?hero=procedural` fuerza el modelo procedural;
- assets descargados en build, fijados por commit y comprobados por Git blob SHA;
- los binarios descargados se mantienen fuera del repositorio y su procedencia se documenta en `frontend/scripts/QUATERNIUS_ASSETS.md`.

La cámara dinámica de Eteria 5.1 se conserva: exploración abierta, acercamiento contextual en combate, encuadre de jefe, dash y golpes con respuesta de cámara.

## Eteria 5.1

La versión 5.1 mejora la sensación de juego del nuevo arte 3D:

- cámara de exploración **más lejana** para que el personaje no ocupe media pantalla;
- cámara contextual que se acerca suavemente al entrar en combate;
- encuadre especial de jefe para mantener al héroe y Vharok visibles;
- punch-in breve al atacar y al conectar golpes;
- cámara más abierta durante dash y micro-shake al recibir daño;
- foco cinematográfico corto al aparecer un jefe;
- FOV dinámico distinto para vertical y horizontal;
- joystick analógico real: desplazamiento suave = caminar, desplazamiento alto = correr;
- giro progresivo del personaje en vez de rotación instantánea;
- animación de locomoción sincronizada con la velocidad real;
- cuatro golpes de combo visualmente distintos;
- perfiles de animación por arma: 1H para espada, 2H para hacha/martillo/guja, estocadas para lanza y secuencia rápida para dagas;
- transiciones más suaves entre idle, walk, run, ataque y dodge.

La cámara procedural anterior ya no controla el gameplay; `DynamicCameraController` centraliza el comportamiento para poder añadir más adelante cámaras de diálogo, interiores y escenas.

## Eteria 5.0

La versión 5.0 sustituye progresivamente las primitivas procedurales por **modelos 3D authored reales** y CC0 de KayKit:

- **Rogue** como apariencia jugable base;
- **Rogue Hooded** cuando se equipa la Capucha Lunar;
- **Knight** cuando se equipa la Coraza del Guardián;
- Skeleton Rogue y Skeleton Warrior como visuales authored para enemigos humanoides;
- espada de una mano, espada de dos manos, daga, hacha de dos manos, staff y ballesta authored;
- las armas authored se montan sobre los huesos de mano de los personajes;
- los modelos incluyen skeleton y animaciones propias; Eteria selecciona dinámicamente Idle/Walk/Run/Attack/Dodge mediante sus nombres;
- el modelo procedural 4.3 se mantiene como fallback automático si un GLB no carga;
- Vharok y el Sabueso de Escoria conservan sus meshes propios para mantener una silueta única;
- los assets no dependen de Internet durante la partida: se descargan **durante el build**, se verifican contra el SHA del blob Git original y Vite/Capacitor los empaquetan en web y APK;
- los packs usados son **KayKit Adventurers** y **KayKit Skeletons**, ambos CC0.

Para forzar el héroe procedural durante pruebas se puede abrir con `?hero=procedural`. El rig experimental generado en Eteria 4.2 sigue disponible con `?rig=1`.

La procedencia, commits fijados y licencia están documentados en `frontend/public/assets/kaykit/ASSET_SOURCES.md`.

## Eteria 4.3

Actualización centrada en corregir la lectura visual observada en móvil:

- el héroe procedural detallado V4.1 vuelve a ser el **modelo principal por defecto**;
- el GLTF 4.2 se conserva como modo experimental y puede activarse con `?rig=1`;
- rostro refinado con cabeza menos esférica, mandíbula, pómulos, boca y proporciones más humanas;
- arma alineada físicamente con la mano del héroe;
- animación procedural de caminar más natural y con menos rebote;
- cámara móvil más baja, cercana y con FOV reducido en orientación vertical;
- iluminación de tres puntos: sol cálido, fill frío y rim light alrededor del héroe;
- sombras suavizadas y mejor contraste entre camino, suelo y personajes;
- Sombra Errante rehecha con torso, brazos largos, piernas y garras;
- Saqueador rehecho con armadura, extremidades y espada legible;
- Guardián/Vharok rehechos con cuerpo articulado, armadura, escudo y núcleo;
- Arquero de Ceniza rehecho con silueta humanoide, capa, piernas, brazos, arco y carcaj;
- Sabueso de Escoria convertido en cuadrúpedo con cuerpo, cuello, hocico, patas, orejas y cola.

La infraestructura GLTF, PBR, skeleton y mocap de V4.2 permanece en el proyecto para seguir desarrollándola sin empeorar la experiencia visual actual.

## Eteria 4.2

La versión 4.2 añade una segunda capa de personaje preparada para producción:

- protagonista cargado como **GLTF 2.0** mediante `GLTFLoader`;
- skeleton de 17 joints y `SkinnedMesh`;
- `AnimationMixer` con crossfade entre Idle, Walk, Run, Attack 1/2, Heavy Attack y Dash;
- Walk y Run derivados de motion capture real del **CMU Graphics Lab Motion Capture Database**, retargeteados al skeleton de Eteria;
- materiales PBR diferenciados para piel, tela, cuero y acero, con base color, normal y metallic/roughness textures;
- morph targets faciales **Blink** y **Smile**, con parpadeo automático;
- `WeaponSocket_R` en la mano para montar las seis armas V4.1 sobre el esqueleto;
- equipo de cabeza, pecho y talismán sincronizado también al héroe GLTF;
- el GLTF se genera automáticamente durante `npm run dev` y `npm run build`;
- fallback automático al personaje procedural V4.1 si el GLTF no puede cargarse.

El archivo final se genera en `public/assets/eteria_hero.gltf` desde `scripts/generate-hero-gltf.mjs`. La procedencia del mocap está documentada en `frontend/scripts/MOCAP_ATTRIBUTION.md`.

> Los clips de combate siguen siendo animaciones esqueléticas originales de Eteria. El mocap CMU se utiliza actualmente en la locomoción Walk/Run.

## Eteria 4.1

La actualización 4.1 rehace la identidad visual del protagonista y su arsenal usando como referencia la guía de arte creada para Eteria:

- anatomía y proporciones humanas más naturales;
- rostro más definido con nariz, orejas, cejas, barba, iris y mechones de cabello;
- cuero, tela, acero, bronce, correas, hombreras y capas diferenciadas por material;
- mochila, petates, bolsos, cinturones, colgante y piezas de armadura visibles;
- capucha lunar y corona del Eclipse como piezas reales sobre la cabeza;
- equipo de pecho y talismanes siguen alterando visualmente al héroe;
- rediseño completo de las seis armas con hojas extruidas, filos, guardas, collares, empuñaduras envueltas y runas;
- espada, hacha, lanza, dagas, martillo y arma del Eclipse conservan exactamente sus estadísticas, combos y técnicas especiales.

## Eteria 4.0

La versión 4.0 transforma la demo original en una base de action-RPG con progresión persistente:

- dos biomas jugables: **Valle de Eteria** y **Tierras de Ceniza**;
- Vharok con **3 fases de combate**;
- enemigos cuerpo a cuerpo y **Arqueros de Ceniza a distancia** con proyectiles;
- seis armas, combos de cuatro golpes y seis técnicas especiales;
- inventario, cofres, materiales y guardado local;
- armaduras equipables por ranuras **cabeza, armadura y talismán**;
- cambios visuales del equipo sobre el héroe;
- atributos **STR, DEF, CRIT y HP** que modifican el combate;
- **árbol de 8 habilidades** con puntos ganados al subir de nivel;
- habilidades de daño, defensa, crítico, cooldown, ejecución y robo de vida;
- comerciante físico **Bram** con tienda de armaduras y pociones;
- esencia/oro con utilidad real;
- NPC Liora y Eldren con diálogos y recompensas;
- diario con **misiones principales y secundarias**;
- recompensas de misión: esencia, puntos de habilidad y equipo;
- atmósfera, minimapa y objetivos diferentes por bioma;
- final del capítulo al limpiar las Tierras de Ceniza y alcanzar el faro oriental.

## Controles PC

- `WASD`: movimiento
- `Espacio`: combo
- `E`: técnica especial
- `F`: interactuar
- `I`: inventario
- `C`: personaje/equipo/habilidades
- `J`: diario de misiones
- `R`: cambiar arma
- `1-6`: seleccionar arma
- `Q`: poción
- `Shift`: dash
- `Esc`: cerrar panel o pausar

En móvil se usan controles táctiles para movimiento, combate e interacción, además de los paneles del HUD.

## Arquitectura

```text
frontend/src/
├─ main.js                 # motor principal y selección de render del héroe
├─ quaterniusAssets.js     # héroe/NPC humanos, capas, sockets y UAL2
├─ kaykitAssets.js         # fallback authored Eteria 5
├─ cameraController.js     # cámara contextual dinámica
├─ gameData.js             # armas, enemigos, historia
├─ models.js               # modelos procedurales y armas propias
├─ rpgSystems.js           # inventario, NPC, cofres, combos y VFX
├─ progressionSystems.js   # armaduras, stats, tienda, skills y quests
├─ worldExpansion.js       # Tierras de Ceniza, ranged AI y fases de Vharok
└─ style.css
```

## Desarrollo

```bash
cd frontend
npm install
npm run dev
```

Build de producción:

```bash
cd frontend
npm install
npm run build
cd ..
pip install -r backend/requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 10000
```

## Docker / Y700

El workflow **Build and publish Y700 image** publica la imagen de producción en GHCR. El manifiesto `y700.deploy.yml` mantiene el despliegue automático del servidor Y700.

## Android

Cada push a `main` ejecuta **Build Android APK** y genera un APK debug mediante Capacitor.

## Próximas expansiones naturales

Sonido y música, más biomas, crafting, comerciantes especializados, armaduras con sets, nuevas clases de enemigos, bosses regionales, guardado cloud y multijugador.

## Licencia

Código del proyecto: MIT. Three.js también usa licencia MIT.
