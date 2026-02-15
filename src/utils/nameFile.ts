export function getFormat(typeFormat: string): string {
    const value = typeFormat.split('/',);
    if (value.length > 0) {
        return value[1];
    } else {
        return typeFormat;
    }
}

export function getZeroFill(pag: number, total: number): string {
    const countTotal = (total.toString()).length;
    let result: string = '';
    let countPag = pag.toString().length
    while (countTotal > countPag) {
        result += `0`;
        countPag++;
    }
    return `${result}${pag}`;
}