# DriveOne · Gestión de Autoescuelas (React + PWA)

Sistema integral de gestión de alumnos, cursos, liquidaciones y balances para autoescuelas (*Central Cars*, *Escuela Argentina de Manejo*, *Autoescuela Modelo*, *El Club del Manejo*).

---

## 📁 Estructura del Repositorio (Formato Ferozo / Hosting PHP Estático)

Este repositorio está organizado con el código fuente en `_source/` y los archivos de producción directamente en la **raíz**, permitiendo que la sincronización automática de GitHub con **Ferozo (DonWeb)** o cualquier hosting cPanel/Apache publique los cambios al instante en `public_html`:

```text
├── _source/                  # Código fuente en React 19 + TypeScript + Vite + Tailwind
│   ├── src/
│   │   ├── components/       # Componentes de UI (Header, Tabs, Modales)
│   │   ├── constants/        # Tarifas, escuelas y profesores precargados
│   │   ├── store/            # Estado global con Zustand (persistente en localStorage)
│   │   ├── types/            # Tipos e interfaces de TypeScript
│   │   └── utils/            # Cálculos de liquidación, parser WhatsApp, exportador Excel XML
│   ├── package.json
│   ├── vite.config.ts        # Configurado con outDir: ".." para compilar en la raíz
│   └── tsconfig.json
├── assets/                   # Archivos JS y CSS bundleados para producción
├── .htaccess                 # Reglas de Apache / Ferozo para SPA, compresión Gzip y caché
├── .gitignore                # Ignora node_modules pero preserva el build en raíz
├── contact.php               # Endpoint PHP para recepción de consultas o reclamos
├── favicon.ico               # Favicon estándar
├── favicon.png               # Icono PNG
├── logo.png                  # Logo institucional DriveOne
├── og-image.png              # Imagen OpenGraph para previsualizaciones en redes / WhatsApp
├── placeholder.svg           # Recurso SVG auxiliar
├── robots.txt                # Configuración para motores de búsqueda
├── sw.js                     # Service Worker PWA con soporte para Web Share Target
├── manifest.webmanifest      # Manifiesto PWA para instalación en celulares y PC
└── index.html                # Aplicación compilada lista para producción
```

---

## 🚀 Flujo de Desarrollo Local

### 1. Requisitos Previos
- Node.js versión 18 o superior.
- npm.

### 2. Iniciar el Servidor de Desarrollo
```bash
# Entrar a la carpeta del código fuente
cd _source

# Instalar dependencias (solo la primera vez)
npm install

# Iniciar servidor local
npm run dev
```

La aplicación estará disponible localmente en `http://localhost:5173`.

---

## 📦 Compilación y Despliegue a Ferozo

### Paso 1: Compilar la versión de producción
Dentro de la carpeta `_source`, ejecutá:
```bash
npm run build
```
> **Nota:** La configuración de Vite compilará automáticamente los archivos optimizados (`index.html` y la carpeta `assets/`) en la raíz del repositorio.

### Paso 2: Subir los cambios a GitHub
Desde la raíz del proyecto:
```bash
git add .
git commit -m "Actualizar build en raíz para Ferozo"
git push origin main
```

### Paso 3: Sincronización en Ferozo (DonWeb)
1. Entrá a tu panel de **Ferozo**.
2. Andá a la sección **Git / Despliegue continuo**.
3. Seleccioná el repositorio y la rama `main`.
4. El webhook o sincronización automática tomará los archivos de la raíz y los servirá inmediatamente en tu dominio.

---

## 🔒 Persistencia y Compatibilidad de Datos

- **100% Retrocompatible:** La app utiliza la clave `autoescuelas_demo_v2` en `localStorage` mediante Zustand. Cualquier dato previamente guardado se mantiene intacto.
- **Exportación en Excel nativa:** Permite generar archivos `.xlsx` reales con hojas separadas para liquidaciones individuales, balance general y cursos vendidos sin requerir conexión a internet.
- **PWA Instalable:** Compatible con la instalación en Android, iOS y Windows, y permite compartir mensajes directamente desde WhatsApp hacia la app.
