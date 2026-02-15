import type { IImage } from "../smock/test"

interface CardImageProps {
    image: IImage
    onClick: (index: number) => void,
    index: number
}
export const CardImage = ({ image, index, onClick }: CardImageProps) => {

    return (
        <div className="bg-gray-900 p-1"
            onClick={() => { onClick(index) }} >
            <img src={image.data} alt="" className="w-50" />
            <div className="flex justify-between">
                <p className="text-white text-sm">pag: {index + 1} </p>
                <p className="text-white text-xs">ref :{image.pagina}</p>
            </div>
            {/* <p className="text-xs text-white">{image.file?.name}</p> */}
        </div>

    )
}
