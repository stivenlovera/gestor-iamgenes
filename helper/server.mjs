// Helper local de gestor-images: el navegador no expone la ruta en disco de los archivos que se cargan,
// así que este servidor abre el diálogo nativo de Windows, devuelve la ruta real de cada imagen elegida,
// entrega su contenido y permite abrirla o mostrarla en el Explorador.
//
// Uso: `npm run helper` (o `node helper/server.mjs`) y dejarlo corriendo mientras se usa la web.
// Solo escucha en 127.0.0.1, solo atiende a los orígenes permitidos y solo sirve archivos elegidos en el diálogo.
import { createServer } from 'node:http'
import { execFile, spawn } from 'node:child_process'
import { createReadStream, statSync } from 'node:fs'
import { basename, extname } from 'node:path'

const PORT = Number(process.env.GESTOR_HELPER_PORT ?? 47811)
const HOST = '127.0.0.1'
const ALLOWED_ORIGINS = new Set([
    'https://image.kyaaa.net',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...(process.env.GESTOR_HELPER_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean),
])

const CONTENT_TYPES = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.gif': 'image/gif',
}

// Rutas elegidas en el diálogo durante esta ejecución: /file, /open y /reveal solo aceptan estas.
const picked = new Set()
let picking = false

// Diálogo nativo de selección múltiple. Un formulario TopMost como dueño evita que quede detrás del navegador.
const PICK_SCRIPT = `
Add-Type -AssemblyName System.Windows.Forms
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$owner = New-Object System.Windows.Forms.Form -Property @{ TopMost = $true; ShowInTaskbar = $false; Opacity = 0 }
$owner.Show()
$dlg = New-Object System.Windows.Forms.OpenFileDialog
$dlg.Multiselect = $true
$dlg.Title = 'gestor-images: elegir imágenes'
$dlg.Filter = 'Imágenes|*.png;*.jpg;*.jpeg;*.webp;*.avif;*.gif|Todos los archivos|*.*'
if ($dlg.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK) {
    ConvertTo-Json -Compress -InputObject @($dlg.FileNames)
} else {
    '[]'
}
$owner.Close()
`

function pickFiles() {
    const encoded = Buffer.from(PICK_SCRIPT, 'utf16le').toString('base64')
    return new Promise((resolve, reject) => {
        execFile('powershell.exe', ['-NoProfile', '-STA', '-EncodedCommand', encoded],
            { windowsHide: true, maxBuffer: 16 * 1024 * 1024 },
            (error, stdout) => {
                if (error) return reject(error)
                try {
                    resolve(JSON.parse(stdout.trim() || '[]'))
                } catch (parseError) {
                    reject(parseError)
                }
            })
    })
}

function sendJson(res, status, body) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(body))
}

async function readJson(req) {
    let raw = ''
    for await (const chunk of req) raw += chunk
    return raw ? JSON.parse(raw) : {}
}

// explorer.exe necesita la ruta entre comillas tal cual, sin el escapado que Node aplica a los argumentos.
function explorer(arg) {
    spawn('explorer.exe', [arg], { windowsVerbatimArguments: true, detached: true, stdio: 'ignore' }).unref()
}

const server = createServer(async (req, res) => {
    const origin = req.headers.origin
    if (!origin || !ALLOWED_ORIGINS.has(origin)) {
        return sendJson(res, 403, { error: `Origen no permitido: ${origin ?? '(ninguno)'}` })
    }
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')

    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            // Chrome/Edge piden este permiso cuando una página https llama a la red local.
            'Access-Control-Allow-Private-Network': 'true',
        })
        return res.end()
    }

    const url = new URL(req.url, `http://${HOST}:${PORT}`)
    try {
        if (req.method === 'GET' && url.pathname === '/ping') {
            return sendJson(res, 200, { ok: true })
        }

        if (req.method === 'POST' && url.pathname === '/pick') {
            if (picking) return sendJson(res, 409, { error: 'Ya hay un diálogo abierto' })
            picking = true
            try {
                const paths = await pickFiles()
                const files = paths.map((path) => {
                    picked.add(path)
                    return {
                        path,
                        name: basename(path),
                        type: CONTENT_TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream',
                        size: statSync(path).size,
                    }
                })
                return sendJson(res, 200, { files })
            } finally {
                picking = false
            }
        }

        if (req.method === 'GET' && url.pathname === '/file') {
            const path = url.searchParams.get('path') ?? ''
            if (!picked.has(path)) return sendJson(res, 403, { error: 'Ruta no elegida en el diálogo' })
            res.writeHead(200, {
                'Content-Type': CONTENT_TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream',
                'Content-Length': statSync(path).size,
            })
            return createReadStream(path).pipe(res)
        }

        if (req.method === 'POST' && (url.pathname === '/open' || url.pathname === '/reveal')) {
            const { path } = await readJson(req)
            if (!picked.has(path)) return sendJson(res, 403, { error: 'Ruta no elegida en el diálogo' })
            explorer(url.pathname === '/open' ? `"${path}"` : `/select,"${path}"`)
            return sendJson(res, 200, { ok: true })
        }

        return sendJson(res, 404, { error: 'No encontrado' })
    } catch (error) {
        console.error(error)
        return sendJson(res, 500, { error: String(error?.message ?? error) })
    }
})

server.listen(PORT, HOST, () => {
    console.log(`gestor-images helper escuchando en http://${HOST}:${PORT}`)
    console.log(`Orígenes permitidos: ${[...ALLOWED_ORIGINS].join(', ')}`)
})
