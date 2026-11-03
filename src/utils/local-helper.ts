// Cliente del helper local (helper/server.mjs), que da la ruta real en disco de las imágenes
// elegidas con el diálogo nativo de Windows. El navegador por sí solo no expone esa ruta.
const HELPER_URL = 'http://127.0.0.1:47811'

export const HELPER_NOT_RUNNING_MESSAGE =
    'No se pudo conectar con el helper local. Ejecútalo en la carpeta de gestor-images con:\n\nnpm run helper\n\ny vuelve a intentarlo. Si el navegador pide permiso para acceder a la red local, acéptalo.'

export interface ILocalFile {
    file: File
    path: string
}

interface IPickedFile {
    path: string
    name: string
    type: string
    size: number
}

async function post<T>(endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${HELPER_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!response.ok) {
        throw new Error(`Helper: ${response.status} ${await response.text()}`)
    }
    return response.json() as Promise<T>
}

/** Abre el diálogo nativo y devuelve cada imagen elegida como File junto a su ruta en disco. */
export async function pickLocalFiles(): Promise<ILocalFile[]> {
    const { files } = await post<{ files: IPickedFile[] }>('/pick')
    return Promise.all(files.map(async (picked) => {
        const response = await fetch(`${HELPER_URL}/file?path=${encodeURIComponent(picked.path)}`)
        if (!response.ok) {
            throw new Error(`Helper: no se pudo leer ${picked.path}`)
        }
        const blob = await response.blob()
        return { path: picked.path, file: new File([blob], picked.name, { type: picked.type }) }
    }))
}

/** Abre la imagen con la aplicación predeterminada de Windows. */
export async function openLocalFile(path: string): Promise<void> {
    await post('/open', { path })
}

/** Abre el Explorador con la imagen seleccionada. */
export async function revealLocalFile(path: string): Promise<void> {
    await post('/reveal', { path })
}
