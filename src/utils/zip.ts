import JSZip from 'jszip';
import type { IImage } from '../smock/test';
import { getFormat, getZeroFill } from './nameFile';

export function exportFile(files: IImage[], nameFile: string) {
    const zip = new JSZip();
    files.forEach((file, index) => {
        const format = getFormat(file.file!.type)
        const num = getZeroFill(index + 1, files.length)
        const nameFile = `${num}.${format}`;
        zip.file(nameFile, file.file);
    });

    zip.generateAsync({ type: "blob" }).then(function (content) {
        const link = document.createElement("a");
        link.download = `${nameFile}.zip`;
        link.href = URL.createObjectURL(content);
        link.click();
        URL.revokeObjectURL(link.href);
    });
}