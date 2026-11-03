import type { IImage } from "../smock/test"

interface CardImageProps {
    image: IImage
    onClick: (index: number) => void,
    index: number
    /** Si se pasa, la tarjeta muestra un check de selección. */
    selected?: boolean
    onToggleSelect?: () => void
}
export const CardImage = ({ image, index, onClick, selected, onToggleSelect }: CardImageProps) => {

    return (
        <div className={`relative bg-gray-900 p-1 ${selected ? 'outline-2 outline-red-500' : ''}`}
            onClick={() => { onClick(index) }} >
            {onToggleSelect ? (
                <input
                    type="checkbox"
                    className="absolute top-2 left-2 w-5 h-5 cursor-pointer"
                    checked={selected ?? false}
                    // Evita abrir la vista previa al marcar.
                    onClick={(e) => e.stopPropagation()}
                    onChange={onToggleSelect}
                />
            ) : null}
            <img src={image.data} alt="" className="w-50" />
            <div className="flex justify-between">
                <p className="text-white text-sm">pag: {index + 1} </p>
                <p className="text-white text-xs">ref :{image.pagina}</p>
            </div>
            {/* <p className="text-xs text-white">{image.file?.name}</p> */}
        </div>

    )
}
