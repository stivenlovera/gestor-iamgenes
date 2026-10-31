import JSZip from 'jszip';
import type { IImage } from '../smock/test';
import { getFormat, getZeroFill } from './nameFile';

// File System Access API: no está en lib.dom.d.ts de esta versión de TypeScript,
// así que se declara el mínimo que se usa aquí.
interface FileSystemWritableFileStreamLike {
    write(data: Uint8Array): Promise<void>;
    close(): Promise<void>;
}
interface FileSystemFileHandleLike {
    createWritable(): Promise<FileSystemWritableFileStreamLike>;
}
type ShowSaveFilePicker = (options: {
    suggestedName?: string;
    types?: { description: string; accept: Record<string, string[]> }[];
}) => Promise<FileSystemFileHandleLike>;

function getShowSaveFilePicker(): ShowSaveFilePicker | undefined {
    return (window as unknown as { showSaveFilePicker?: ShowSaveFilePicker }).showSaveFilePicker;
}

// Con rename, cada archivo se llama por su posición (01.png, 02.png…); sin él, conserva su nombre
// original. En ese caso, si dos archivos se llaman igual se añade un sufijo para que JSZip no pise uno con otro.
function buildZip(files: IImage[], rename: boolean): JSZip {
    const zip = new JSZip();
    const used = new Set<string>();
    files.forEach((file, index) => {
        let name: string;
        if (rename) {
            const format = getFormat(file.file!.type);
            const num = getZeroFill(index + 1, files.length);
            name = `${num}.${format}`;
        } else {
            name = uniqueName(file.file!.name, used);
        }
        used.add(name);
        zip.file(name, file.file!);
    });
    return zip;
}

function uniqueName(name: string, used: Set<string>): string {
    if (!used.has(name)) return name;
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    let i = 2;
    while (used.has(`${base}-${i}${ext}`)) i++;
    return `${base}-${i}${ext}`;
}

// Escribe el zip directamente a disco a medida que se genera, en vez de acumular
// todo el archivo comprimido en un único buffer en memoria. Con packs grandes
// (muchas imágenes a resolución original), generar un solo Blob/ArrayBuffer con
// el zip completo puede superar el límite de asignación del motor y lanzar
// "RangeError: Array buffer allocation failed". Streamear a disco evita eso.
async function exportFileStreaming(zip: JSZip, nameFile: string, showSaveFilePicker: ShowSaveFilePicker): Promise<void> {
    const handle = await showSaveFilePicker({
        suggestedName: `${nameFile}.zip`,
        types: [{ description: 'Archivo ZIP', accept: { 'application/zip': ['.zip'] } }],
    });
    const writable = await handle.createWritable();

    await new Promise<void>((resolve, reject) => {
        const stream = zip.generateInternalStream({ type: 'uint8array' });
        stream
            .on('data', (data: Uint8Array) => {
                stream.pause();
                writable.write(data)
                    .then(() => stream.resume())
                    .catch((err) => {
                        stream.pause();
                        reject(err);
                    });
            })
            .on('error', reject)
            .on('end', () => {
                writable.close().then(resolve, reject);
            })
            .resume();
    });
}

async function exportFileBlob(zip: JSZip, nameFile: string): Promise<void> {
    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.download = `${nameFile}.zip`;
    link.href = URL.createObjectURL(content);
    link.click();
    URL.revokeObjectURL(link.href);
}

// Devuelve true si el ZIP se exportó, o false si el usuario canceló el selector
// de guardado (en ese caso no se debe avisar que la exportación terminó).
export async function exportFile(files: IImage[], nameFile: string, rename: boolean): Promise<boolean> {
    const zip = buildZip(files, rename);
    const showSaveFilePicker = getShowSaveFilePicker();

    if (showSaveFilePicker) {
        try {
            await exportFileStreaming(zip, nameFile, showSaveFilePicker);
            return true;
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                // El usuario canceló el selector de guardado.
                return false;
            }
            console.error('Falló la exportación en streaming, se reintenta con el método clásico', err);
        }
    }

    await exportFileBlob(zip, nameFile);
    return true;
}
