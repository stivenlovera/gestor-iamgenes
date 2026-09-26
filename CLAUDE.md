# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

- `npm run dev` — servidor de Vite (con `usePolling` activado en `vite.config.ts`)
- `npm run build` — `tsc -b && vite build` (salida en `dist/`)
- `npm run lint` — ESLint (configuración flat en `eslint.config.js`)
- `npm run preview` — sirve el build de `dist/`

No hay tests. El `README.md` es la plantilla por defecto de Vite y no describe el proyecto. El texto de la UI está en español.

## Despliegue

El `Dockerfile` compila con Node 20 y sirve `dist/` con nginx en el puerto 80; `captain-definition` apunta a ese Dockerfile (CapRover). No hay backend ni llamadas de red: todo ocurre en el navegador.

`.env` está versionado en git y contiene `DB_PASSWORD`, aunque ningún código de este proyecto lo lee. No añadas secretos ahí.

## Arquitectura

SPA de Vite + React 19 + Tailwind 4 (plugin `@tailwindcss/vite`, sin `tailwind.config`). Sirve para preparar un "pack" de imágenes: cargar archivos, ordenarlos y exportarlos como ZIP.

- `src/App.tsx` concentra casi toda la lógica. Mantiene dos listas de `IImage`: `imagesOriginal` (zona `ORIGINAL`, lo cargado) e `imagesPublic` (zona `PUBLIC`, lo que se exporta). Un único `DragDropContext` de `@hello-pangea/dnd` contiene ambos `Droppable`; `onDragEnd` decide por `droppableId` si reordena dentro de una lista o mueve un elemento entre listas. El `draggableId` es `IImage.description`, un UUID generado al cargar.
- `src/utils/zip.ts` (`exportFile`) recorre `imagesPublic` en su orden actual y crea un ZIP con `jszip` cuyas entradas se llaman `<número>.<formato>`. El orden del arrastre define la numeración; `pagina`/`ref` de `IImage` es solo el índice de carga y no influye en el nombre.
- `src/utils/nameFile.ts` construye ese nombre: `getZeroFill` rellena con ceros a la izquierda según el total (`01`…`10`, `001`…) y `getFormat` toma la extensión del MIME (`image/png` → `png`; un JPEG sale como `.jpeg`).
- `src/components/card-image.tsx` es la miniatura; `src/components/modal-preview/` es el modal de vista previa, navegable con flechas izquierda/derecha.
- `src/smock/test.ts` define `IImage` (el resto del archivo son datos de prueba sin uso).

## Contrato con `markwater-kyaaa`

El ZIP exportado alimenta a `../markwater-kyaaa`, que usa el nombre sin extensión como `page.num` y espera archivos `.png`. Si cambias el esquema de nombres o formatos en `zip.ts`/`nameFile.ts`, revisa ese proyecto (ver `../CLAUDE.md`).

## Particularidades del código actual

- El modal de previsualización se controla con un único índice `preview` compartido por las listas Original y Public, y con dos booleanos (`openModalOriginal`/`openModalPublic`).
- `onChangeImages` muta `imagesOriginal` con `push` antes de llamar a `setImageOriginal`, y numera `pagina` desde 1 en cada carga (no continúa la numeración anterior).
- `moveAll` reemplaza `imagesPublic` con `imagesOriginal` en vez de anexar.
- `onClikPublic` calcula `setOpenModalPublic(!openModalOriginal)`, no `!openModalPublic`.
- Los `URL.createObjectURL` de las miniaturas no se revocan.
- El `beforeunload` siempre pide confirmación al cerrar la pestaña, haya o no imágenes cargadas.
- `onDragEnd`, `handleBeforeUnload` y otros handlers usan `any`/parámetros sin tipar, y hay `console.log` de depuración por todo el código.
