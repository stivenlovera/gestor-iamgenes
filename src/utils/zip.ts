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

function buildZip(files: IImage[]): JSZip {
    const zip = new JSZip();
    files.forEach((file, index) => {
        const format = getFormat(file.file!.type);
        const num = getZeroFill(index + 1, files.length);
        zip.file(`${num}.${format}`, file.file!);
    });
    return zip;
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

export async function exportFile(files: IImage[], nameFile: string): Promise<void> {
    const zip = buildZip(files);
    const showSaveFilePicker = getShowSaveFilePicker();

    if (showSaveFilePicker) {
        try {
            await exportFileStreaming(zip, nameFile, showSaveFilePicker);
            return;
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                // El usuario canceló el selector de guardado.
                return;
            }
            console.error('Falló la exportación en streaming, se reintenta con el método clásico', err);
        }
    }

    await exportFileBlob(zip, nameFile);
}
