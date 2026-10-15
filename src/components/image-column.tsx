import { Draggable, Droppable } from '@hello-pangea/dnd'
import type { IImage } from '../smock/test'
import { CardImage } from './card-image'

interface ImageColumnProps {
    droppableId: string
    images: IImage[]
    onClickImage: (index: number) => void
}

// Columna reutilizable de imágenes con drag & drop; la usan las listas ORIGINAL,
// PUBLIC y ELIMINAR, que todas comparten el mismo comportamiento.
export const ImageColumn = ({ droppableId, images, onClickImage }: ImageColumnProps) => {
    return (
        <Droppable droppableId={droppableId} direction='horizontal'>
            {(provided) => (
                <div className={`flex overflow-x-auto bg-gray-700 ${(images.length == 0 ? 'p-10' : '')}`}
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                >
                    {
                        images.map((image, index) => {
                            return (
                                <Draggable key={image.description} draggableId={image.description} index={index}>
                                    {(provided) => (
                                        <div
                                            className='flex-shrink-0 p-1'
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                        >
                                            <CardImage
                                                image={image}
                                                index={index}
                                                onClick={onClickImage}></CardImage>
                                        </div>
                                    )}
                                </Draggable>
                            )
                        })
                    }
                    {provided.placeholder}
                </div>
            )}
        </Droppable>
    )
}
