# Eteria: Fragmentos del Eclipse

RPG 3D mobile-first hecho con **JavaScript + Three.js**, empaquetable como APK Android con Capacitor y servido por **FastAPI**.

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
├─ main.js                 # motor principal
├─ gameData.js             # armas, enemigos, historia
├─ models.js               # modelos procedurales
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
