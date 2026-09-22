# Eteria: Fragmentos del Eclipse

RPG 3D mobile-first hecho con **JavaScript + Three.js + HTML5/CSS**, empaquetable como **APK Android con Capacitor** y servido por **Python/FastAPI**.

## Estado actual

### Eteria 3.0

La versión 3.0 incorpora sistemas RPG completos sobre la base de Eteria 2.0:

- héroe procedural con armadura, capa, runas y animaciones de movimiento;
- **seis armas** con daño, alcance, crítico y técnica especial propia;
- **combo de cuatro golpes** con movimientos distintos según el arma;
- técnicas especiales:
  - Hoja de Éter: **Arco de Éter**;
  - Hacha de Brasa: **Corte Infernal** con quemadura;
  - Lanza Lunar: **Estocada Lunar** de largo alcance;
  - Dagas de la Grieta: **Ráfaga Fantasma** de cinco impactos;
  - Martillo Solar: **Terremoto Solar** con daño de área y empuje;
  - Guja del Eclipse: **Espiral del Eclipse** con robo de vida;
- enemigos con animaciones de ataque y tres arquetipos diferentes;
- jefe **Vharok, Guardián del Eclipse**;
- **inventario visual** con armas, materiales, estadísticas y equipo;
- **seis cofres físicos** con loot persistente;
- objetos y materiales: Polvo de Éter, Fragmentos Lunares, Núcleos de Brasa y Sellos Antiguos;
- NPC físicos **Liora** y **Eldren**;
- diálogos que cambian según el capítulo de la historia;
- recompensas únicas por conversar con NPC;
- partículas 3D, ondas, arcos, estelas y números flotantes de daño;
- minimapa, jefe, XP, niveles, pociones y guardado local;
- persistencia de inventario, cofres abiertos y recompensas de NPC.

## Controles

### PC

- `WASD`: movimiento
- `Espacio`: ataque / combo
- `E`: técnica especial
- `F`: interactuar con NPC o cofres
- `I`: inventario
- `R`: cambiar arma
- `1-6`: seleccionar arma desbloqueada
- `Q`: poción
- `Shift`: dash
- `Esc`: cerrar panel / pausa

### Móvil

Joystick virtual más botones dedicados para combo, técnica especial, dash, poción, cambio de arma e interacción.

## Arquitectura

```text
eteria-rpg/
├─ frontend/
│  ├─ src/main.js
│  ├─ src/gameData.js
│  ├─ src/models.js
│  ├─ src/rpgSystems.js
│  ├─ src/style.css
│  ├─ public/
│  └─ package.json
├─ backend/
│  ├─ main.py
│  └─ requirements.txt
├─ .github/workflows/
├─ Dockerfile
└─ README.md
```

## Desarrollo local

```bash
cd frontend
npm install
npm run dev
```

Para probar el build de producción:

```bash
cd frontend
npm install
npm run build
cd ..
pip install -r backend/requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 10000
```

## Docker

```bash
docker build -t eteria-rpg .
docker run --rm -p 10000:10000 eteria-rpg
```

## Android

Al hacer push a `main`, el workflow **Build Android APK** genera automáticamente un APK debug descargable desde GitHub Actions.

## Despliegue Y700

El workflow **Build and publish Y700 image** publica la imagen de producción en GHCR para el despliegue del servidor Y700.

## Próximas expansiones posibles

El código de Eteria 3.0 deja preparados los sistemas para añadir armaduras equipables, comerciantes, árbol de habilidades, misiones secundarias, nuevos mapas/biomas, fases adicionales para jefes, sonido/música, guardado cloud y multijugador.

## Licencia

Código del proyecto: MIT. Three.js también usa licencia MIT.
