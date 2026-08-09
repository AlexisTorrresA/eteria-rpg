# Eteria: Fragmentos del Eclipse

RPG 3D mobile-first hecho con **JavaScript + Three.js + HTML5/CSS**, empaquetable como **APK Android con Capacitor** y servido por **Python/FastAPI**. Está preparado para desplegarse en **Render** usando Docker.

## Qué incluye

- Mundo 3D low-poly procedural, sin assets 3D externos obligatorios.
- Héroe en tercera persona y cámara con seguimiento suave.
- Controles táctiles: joystick, ataque, dash y poción.
- Teclado para probar en PC: `WASD`, `Espacio`, `Shift`, `Q`, `Esc`.
- Enemigos con IA simple: patrulla, persecución y ataque.
- Combate, vida, daño, XP, niveles y esencia/moneda.
- Fragmentos coleccionables y objetivo de misión.
- Portal final que se desbloquea al completar la misión.
- Minimapa en tiempo real.
- Guardado automático/local con `localStorage`.
- PWA básica con manifest y service worker.
- FastAPI con `/api/health`, `/api/game-config` y documentación `/api/docs`.
- Dockerfile multi-stage listo para Render.
- GitHub Action para generar un `app-debug.apk` descargable desde Actions.

## Arquitectura

```text
eteria-rpg/
├─ frontend/
│  ├─ src/main.js              # motor y lógica del RPG
│  ├─ src/style.css            # UI mobile-first
│  ├─ public/                  # PWA e icono
│  ├─ capacitor.config.json    # Android/Capacitor
│  └─ package.json
├─ backend/
│  ├─ main.py                  # FastAPI + frontend estático
│  └─ requirements.txt
├─ .github/workflows/          # checks + APK Android
├─ Dockerfile
├─ render.yaml
└─ README.md
```

## 1. Ejecutarlo localmente para desarrollar

Requisitos: **Node.js 22+** y **Python 3.13** recomendados.

Terminal 1:

```bash
cd frontend
npm install
npm run dev
```

El juego queda normalmente en `http://localhost:5173`.

Terminal 2, para probar también la API:

```bash
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# Linux/macOS: source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

## 2. Probar el mismo build que se usa en producción

```bash
cd frontend
npm install
npm run build
cd ..
pip install -r backend/requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 10000
```

Abre `http://localhost:10000`.

## 3. Ejecutarlo con Docker

```bash
docker build -t eteria-rpg .
docker run --rm -p 10000:10000 eteria-rpg
```

Abre `http://localhost:10000`.

## 4. Subir a GitHub

Si creas un repositorio vacío llamado `eteria-rpg`:

```bash
git init
git add .
git commit -m "feat: initial Eteria 3D RPG"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/eteria-rpg.git
git push -u origin main
```

## 5. Desplegar en Render

El repositorio ya contiene `render.yaml` y `Dockerfile`.

1. En Render elige **New > Blueprint**.
2. Conecta el repositorio de GitHub.
3. Selecciona este repositorio.
4. Render detectará `render.yaml` y construirá el contenedor.
5. El health check es `/api/health`.

También puedes crear un Web Service manualmente usando el repositorio con runtime Docker.

## 6. Crear APK Android en tu PC

Necesitas Android Studio/Android SDK además de Node 22+.

```bash
cd frontend
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

Android Studio abrirá el proyecto. Desde ahí puedes ejecutar en un teléfono/emulador o generar un APK/AAB firmado.

Después de modificar el juego:

```bash
npm run build
npx cap sync android
```

## 7. Crear APK automáticamente en GitHub

Al hacer push a `main`, el workflow **Build Android APK** compila el juego y crea un APK debug.

En GitHub:

1. Abre **Actions**.
2. Entra a **Build Android APK**.
3. Abre la ejecución terminada.
4. Descarga el artefacto `eteria-rpg-debug-apk`.

Para publicar en Google Play debes crear y proteger una keystore y compilar un **AAB release firmado**. El workflow incluido genera intencionalmente un APK de prueba sin secretos.

## Cómo ampliar el RPG

Los siguientes pasos naturales son:

- Sustituir el héroe procedural por modelos `.glb/.gltf` y animaciones.
- Inventario visual con armas, armaduras y estadísticas.
- NPC, diálogos y árbol de misiones.
- Jefe final con fases.
- Múltiples mapas/biomas.
- Sonido y música.
- Base de datos/PostgreSQL para cuentas y guardado cloud.
- Login y partidas sincronizadas.
- Multijugador mediante WebSockets.

## Licencia

Código del proyecto: MIT. Three.js también usa licencia MIT. Revisa por separado la licencia de cualquier asset externo que agregues en el futuro.

## Atajos para Windows PowerShell

Desde la raíz del proyecto:

```powershell
.\scripts\run-local.ps1
```

Para preparar y abrir el proyecto Android:

```powershell
.\scripts\build-apk.ps1
```
