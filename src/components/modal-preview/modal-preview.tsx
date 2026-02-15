
interface PreviewImageProps {
    moveArrowOriginal: (event: React.KeyboardEvent<HTMLInputElement>) => void,
    img: string
    closedModal: (closed: boolean) => void
    nameFile: string | undefined
}
export const PreviewImage = ({ img, nameFile, closedModal, moveArrowOriginal }: PreviewImageProps) => {

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
                <div className="max-w-xl w-full rounded-md">
                    <img
                        onClick={() => { }}
                        src={img}
                        alt="" className="text-center h-full border-white border"
                        onKeyDown={() => {
                            console.log('onKeyDown')
                        }}
                    />
                </div>
                <div className="max-w-xl w-full p-1 text-white text-lg text-center">{nameFile}</div>
            </div>
        </div>
    )

}
