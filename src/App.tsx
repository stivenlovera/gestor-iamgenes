import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid';

import { type IImage } from './smock/test'
import { CardImage } from './components/card-image'
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { exportFile } from './utils/zip';
import { PreviewImage } from './components/modal-preview/modal-preview';

export function App() {
  const [namePack, setNamePack] = useState<string>('')
  const [imagesOriginal, setImageOriginal] = useState<IImage[]>([])
  const [imagesPublic, setImagePublic] = useState<IImage[]>([])
  const [openModalOriginal, setOpenModalOriginal] = useState<boolean>(false)
  const [openModalPublic, setOpenModalPublic] = useState<boolean>(false)
  const [preview, setPreview] = useState<number>(0)

  const onChangeImages = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);

      filesArray.forEach((file, index) => {
        imagesOriginal.push({
          pagina: index + 1,
          data: URL.createObjectURL(file),
          description: uuidv4(),
          file: file
        })
      });
      setImageOriginal([...imagesOriginal]);
    } else {
      console.log('error')
    }
  }

  useEffect(() => {
    const handleBeforeUnload = (event) => {

      // Standard way to trigger the browser's confirmation dialog
      event.preventDefault();
      // For legacy browser support, setting returnValue is also recommended
      event.returnValue = '';
      // Note: You cannot customize the actual message displayed by the browser
    }


    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function to remove the event listener when the component unmounts
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [imagesOriginal, imagesPublic])



  const onDragEnd = (result) => {
    const { source, destination } = result;
    console.log('onDragEnd', result)

    if (!destination) {
      return;
    }
    console.log('source', source.droppableId)
    console.log('destination', destination.droppableId)

    if (source.droppableId == 'ORIGINAL' && destination.droppableId == 'ORIGINAL') {
      console.log('ORIGINAL move')
      setImageOriginal(order(result, imagesOriginal))
    }
    if (source.droppableId == 'PUBLIC' && destination.droppableId == 'PUBLIC') {
      console.log('PUBLIC move')
      setImagePublic(order(result, imagesPublic))
    }
    if (source.droppableId == 'ORIGINAL' && destination.droppableId == 'PUBLIC') {
      console.log('copiar de ORIGINAL a PUBLIC')

      moveOriginalToPublic(source, destination)
    }
    if (source.droppableId == 'PUBLIC' && destination.droppableId == 'ORIGINAL') {
      console.log('copiar de PUBLIC a ORIGINAL')
      movePublicToOriginal(source, destination)
    }

  };

  const order = (result: any, images: IImage[]) => {
    const newItems = Array.from(images);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    //setImage(newItems);
    return newItems;
  }

  const moveOriginalToPublic = (droppableSource: any, droppableDestination: any) => {
    const sourceClone = Array.from(imagesOriginal);
    const destClone = Array.from(imagesPublic);
    const [removed] = sourceClone.splice(droppableSource.index, 1);

    destClone.splice(droppableDestination.index, 0, removed);

    const result = {};
    setImageOriginal(sourceClone)
    setImagePublic(destClone)

    return result;
  };

  const movePublicToOriginal = (droppableSource: any, droppableDestination: any) => {
    const sourceClone = Array.from(imagesOriginal);
    const destClone = Array.from(imagesPublic);
    const [removed] = destClone.splice(droppableSource.index, 1);

    sourceClone.splice(droppableDestination.index, 0, removed);

    const result = {};
    setImageOriginal(sourceClone)
    setImagePublic(destClone)
    return result;
  };

  const onClikOriginal = (index: number) => {
    setPreview(index)
    setOpenModalOriginal(!openModalOriginal)
  }

  const onClikPublic = (index: number) => {
    setPreview(index)
    setOpenModalPublic(!openModalOriginal)
  }

  const moveArrowOriginal = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key == 'ArrowRight') {
      console.log('ArrowRight', imagesOriginal.length, preview)
      if (imagesOriginal.length - 1 > preview) {
        setPreview(preview + 1)
      }
    }
    if (event.key == 'ArrowLeft') {
      console.log('ArrowLeft', imagesOriginal.length, preview)
      if (preview != 0) {
        setPreview(preview - 1)
      }
    }
  }

  const moveArrowPublic = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key == 'ArrowRight') {
      console.log('ArrowRight', imagesPublic.length, preview)
      if (imagesPublic.length - 1 > preview) {
        setPreview(preview + 1)
      }
    }
    if (event.key == 'ArrowLeft') {
      console.log('ArrowLeft', imagesPublic.length, preview)
      if (preview != 0) {
        setPreview(preview - 1)
      }
    }
  }

  const moveAll = () => {
    setImageOriginal([])
    setImagePublic(imagesOriginal)
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <h3 className='col-span-2 text-2xl text-center text-white p-1'> {namePack} Pag:{imagesOriginal.length}</h3>
      <input
        className='w-full bg-amber-50 placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow'
        placeholder='nombre de pack'
        onChange={(e) => {
          setNamePack(e.target.value)
        }}
        type="text" />
      <input
        className='w-full bg-amber-50 placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow'
        type="file"
        placeholder='agrega imagenes'
        multiple
        onChange={onChangeImages}
      />
      <h3 className='col-span-2 text-1xl text-left text-white p-2'> ORIGINAL EL PACK </h3>
      <div className='col-span-2'>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="ORIGINAL" direction='horizontal'>
            {(provided) => (
              <div className={`flex overflow-x-auto bg-gray-700 ${(imagesOriginal.length == 0 ? 'p-10' : '')}`}
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {
                  imagesOriginal.map((image, index) => {
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
                              onClick={onClikOriginal}></CardImage>
                          </div>
                        )}
                        {/* <CardImage key={index} image={image}></CardImage> */}
                      </Draggable>
                    )
                  })
                }
                {provided.placeholder}
              </div>
            )}
          </Droppable>
          <div className='col-span-2 text-center p-4'>
            <button className='bg-white hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded'
              type='button'
              onClick={() => {
                moveAll()
              }}
            >
              Mover Todo
            </button>
          </div>
          <h3 className='text-1xl text-left text-white p-2'> PUBLICAR EL PACK {imagesPublic.length}</h3>
          <Droppable droppableId="PUBLIC" direction='horizontal'>
            {(provided) => (
              <div className={`flex overflow-x-auto bg-gray-700 ${(imagesPublic.length == 0 ? 'p-10' : '')}`}
                {...provided.droppableProps} ref={provided.innerRef}
              >
                {
                  imagesPublic.map((image, index) => {
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
                              onClick={onClikPublic}></CardImage>
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
        </DragDropContext>
        {
          openModalOriginal ? (
            <PreviewImage
              moveArrowOriginal={moveArrowOriginal}
              img={imagesOriginal[preview].data}
              nameFile={imagesOriginal[preview].file?.name}
              closedModal={setOpenModalOriginal}
            ></PreviewImage>
          ) : (<></>)
        }
        {
          openModalPublic ? (
            <PreviewImage
              moveArrowOriginal={moveArrowPublic}
              img={imagesPublic[preview].data}
              nameFile={imagesPublic[preview].file?.name}
              closedModal={setOpenModalPublic}
            ></PreviewImage>
          ) : (<></>)
        }
      </div>
      <div className='col-span-2'>
        <button className='bg-white hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded'
          type='button'
          onClick={() => {
            exportFile(imagesPublic, namePack)
          }}
        >
          Export archivos
        </button>
      </div>
    </div>
  )
}

export default App
