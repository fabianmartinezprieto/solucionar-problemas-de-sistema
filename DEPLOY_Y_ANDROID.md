# Guía de Publicación en Vercel y Compilación APK en Android Studio

## 1. Ejecución local verificada
1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Iniciar entorno de desarrollo (Frontend + Backend + WebSockets en puerto 3000):
   ```bash
   npm run dev
   ```
3. Compilar para producción:
   ```bash
   npm run build
   ```

## 2. Publicación en Internet con Vercel
El proyecto incluye `vercel.json` y `api/index.ts` para ejecutar el frontend Vite + API Express Serverless en Vercel con HTTPS automático.

1. Sube el proyecto a un repositorio de GitHub/GitLab/Bitbucket o usa Vercel CLI (`npx vercel --prod`).
2. En **Vercel > Project Settings > Environment Variables**, configura:
   - `SESSION_SECRET`: cadena aleatoria segura (ej. 64 caracteres hexadecimales).
   - `KV_REST_API_URL` y `KV_REST_API_TOKEN` (o conecta **Upstash Redis / Vercel KV** desde el Marketplace de Vercel) para conservar usuarios, tutoriales, notificaciones y configuraciones entre reinicios serverless.
3. (Opcional) En **Vercel > Settings > Domains**, agrega tu dominio personalizado y apunta tus registros DNS (`A` / `CNAME`) según indique Vercel; el certificado HTTPS se genera automáticamente.
4. Verifica el estado del backend abriendo `https://tu-dominio.vercel.app/api/health`.

## 3. Compilación Android Studio y generación de APK
El proyecto ya contiene la carpeta nativa `android/` configurada con Capacitor (`com.solucionarproblemas.sistema`).

1. Configura la URL pública HTTPS de tu backend en `.env.production`:
   ```env
   VITE_API_BASE_URL="https://tu-dominio.vercel.app"
   ```
2. Compila y sincroniza los archivos web hacia Android:
   ```bash
   npm run android:sync
   ```
3. Abre el proyecto en Android Studio:
   ```bash
   npm run android:open
   ```
4. **Generar APK de depuración (Debug)**:
   - En Android Studio: `Build > Build Bundle(s) / APK(s) > Build APK(s)`.
   - O desde terminal dentro de `android/`: `./gradlew assembleDebug` (Windows: `gradlew.bat assembleDebug`).
5. **Generar APK firmado de producción (Release)**:
   - En Android Studio: `Build > Generate Signed Bundle / APK > APK`, crea o selecciona tu archivo `.jks`, o copia `android/keystore.properties.example` a `android/keystore.properties` con tus datos y ejecuta `./gradlew assembleRelease`.
