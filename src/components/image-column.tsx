import { Draggable, Droppable } from '@hello-pangea/dnd'
import type { IImage } from '../smock/test'
import { CardImage } from './card-image'

interface ImageColumnProps {
    droppableId: string
    images: IImage[]
    onClickImage: (index: number) => void
    /** Ids (IImage.description) marcados; si se pasa junto a onToggleSelect, cada tarjeta muestra un check. */
    selectedIds?: Set<string>
    onToggleSelect?: (id: string) => void
}

// Columna reutilizable de imágenes con drag & drop; la usan las listas ORIGINAL,
// PUBLIC y ELIMINAR, que todas comparten el mismo comportamiento.
export const ImageColumn = ({ droppableId, images, onClickImage, selectedIds, onToggleSelect }: ImageColumnProps) => {
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
                                                selected={selectedIds?.has(image.description)}
                                                onToggleSelect={onToggleSelect ? () => onToggleSelect(image.description) : undefined}
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
