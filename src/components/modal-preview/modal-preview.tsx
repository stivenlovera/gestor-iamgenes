import { useEffect, useRef, useState } from 'react'

interface PreviewImageProps {
    moveArrowOriginal: (event: React.KeyboardEvent<HTMLInputElement>) => void,
    img: string
    closedModal: (closed: boolean) => void
    nameFile: string | undefined
}

const MIN_ZOOM = 1
const MAX_ZOOM = 8
const STEP_ZOOM = 0.25

export const PreviewImage = ({ img, nameFile, closedModal, moveArrowOriginal }: PreviewImageProps) => {
    const [zoom, setZoom] = useState<number>(1)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const [dragging, setDragging] = useState<boolean>(false)
    const dragStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 })
    const imgRef = useRef<HTMLImageElement>(null)

    // al abrir el modal el foco va a la imagen (las flechas siguen llegando al contenedor)
    useEffect(() => {
        imgRef.current?.focus()
    }, [])

    const resetZoom = () => {
        setZoom(1)
        setOffset({ x: 0, y: 0 })
    }

    const changeZoom = (delta: number) => {
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta))
        setZoom(next)
        if (next === MIN_ZOOM) {
            setOffset({ x: 0, y: 0 })
        }
    }

    // al navegar a otra imagen se vuelve al tamaño original
    useEffect(() => {
        setZoom(1)
        setOffset({ x: 0, y: 0 })
    }, [img])

    const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (zoom === MIN_ZOOM) return
        event.currentTarget.setPointerCapture(event.pointerId)
        dragStart.current = { x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y }
        setDragging(true)
    }

    const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!dragging) return
        setOffset({
            x: dragStart.current.offsetX + event.clientX - dragStart.current.x,
            y: dragStart.current.offsetY + event.clientY - dragStart.current.y,
        })
    }

    const onPointerUp = () => setDragging(false)

    return (
        <div
            tabIndex={0}
            id={'modal'}
            onClick={() => {
                closedModal(false);
            }}
            onKeyUpCapture={(event: React.KeyboardEvent<HTMLInputElement>) => { console.log('onKeyDownCapture'); moveArrowOriginal(event) }}
            className={' flex justify-center items-center fixed w-full z-10 inset-0 bg-transparent'}
        >
            <div
                className="bg-gray-900 p-4 border-gray-300 border-2"
                onClick={(event) => {
                    console.log('in modal')
                    event.preventDefault();
                    event.stopPropagation();
                }}

            >
                <div
                    className="max-w-xl w-full rounded-md overflow-hidden"
                    style={{ cursor: zoom === MIN_ZOOM ? 'zoom-in' : dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
                    onWheel={(event) => changeZoom(event.deltaY < 0 ? STEP_ZOOM : -STEP_ZOOM)}
                    onDoubleClick={() => (zoom === MIN_ZOOM ? changeZoom(3) : resetZoom())}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                >
                    <img
                        ref={imgRef}
                        tabIndex={-1}
                        onClick={() => { }}
                        src={img}
                        alt=""
                        draggable={false}
                        className="text-center h-full border-white border select-none outline-none"
                        style={{
                            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                            transition: dragging ? 'none' : 'transform 0.1s ease-out',
                        }}
                        onKeyDown={() => {
                            console.log('onKeyDown')
                        }}
                    />
                </div>
                <div className="flex justify-center items-center gap-2 p-1 text-white">
                    <button type="button" className="px-2 border border-white rounded disabled:opacity-40"
                        disabled={zoom <= MIN_ZOOM} onClick={() => changeZoom(-STEP_ZOOM)}>−</button>
                    <button type="button" className="px-2 border border-white rounded text-sm"
                        onClick={resetZoom}>{Math.round(zoom * 100)}%</button>
                    <button type="button" className="px-2 border border-white rounded disabled:opacity-40"
                        disabled={zoom >= MAX_ZOOM} onClick={() => changeZoom(STEP_ZOOM)}>+</button>
                </div>
                <div className="max-w-xl w-full p-1 text-white text-lg text-center">{nameFile}</div>
            </div>
        </div>
    )

}
