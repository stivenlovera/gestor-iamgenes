import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { v4 as uuidv4 } from 'uuid';

import { type IImage } from './smock/test'
import { ImageColumn } from './components/image-column'
import { DragDropContext, type DraggableLocation, type DropResult } from '@hello-pangea/dnd';
import { exportFile } from './utils/zip';
import { PreviewImage } from './components/modal-preview/modal-preview';

type ListKey = 'ORIGINAL' | 'PUBLIC' | 'ELIMINAR'

export function App() {
  // El input para editar el nombre del pack está deshabilitado (ver JSX más abajo),
  // así que por ahora no hace falta el setter.
  const [namePack] = useState<string>('')
  const [imagesOriginal, setImageOriginal] = useState<IImage[]>([])
  const [imagesPublic, setImagePublic] = useState<IImage[]>([])
  const [imagesEliminar, setImageEliminar] = useState<IImage[]>([])
  const [previewList, setPreviewList] = useState<ListKey | null>(null)
  const [preview, setPreview] = useState<number>(0)

  // Las tres listas comparten la misma funcionalidad (drag & drop entre ellas,
  // reordenar, previsualizar), así que se accede a cada una por su droppableId
  // en vez de repetir la lógica de mover/previsualizar por cada combinación de listas.
  const listsByKey: Record<ListKey, [IImage[], Dispatch<SetStateAction<IImage[]>>]> = {
    ORIGINAL: [imagesOriginal, setImageOriginal],
    PUBLIC: [imagesPublic, setImagePublic],
    ELIMINAR: [imagesEliminar, setImageEliminar],
  }

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
  }, [imagesOriginal, imagesPublic, imagesEliminar])

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    console.log('onDragEnd', result)

    if (!destination) {
      return;
    }
    console.log('source', source.droppableId)
    console.log('destination', destination.droppableId)

    const sourceKey = source.droppableId as ListKey
    const destKey = destination.droppableId as ListKey

    if (sourceKey === destKey) {
      const [list, setList] = listsByKey[sourceKey]
      setList(order(result, list))
      return
    }

    console.log(`mover de ${sourceKey} a ${destKey}`)
    moveBetweenLists(sourceKey, destKey, source, destination)
  };

  const order = (result: DropResult, images: IImage[]) => {
    const newItems = Array.from(images);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    //setImage(newItems);
    return newItems;
  }

  const moveBetweenLists = (sourceKey: ListKey, destKey: ListKey, droppableSource: DraggableLocation, droppableDestination: DraggableLocation) => {
    const [sourceList, setSourceList] = listsByKey[sourceKey]
    const [destList, setDestList] = listsByKey[destKey]

    const sourceClone = Array.from(sourceList);
    const destClone = Array.from(destList);
    const [removed] = sourceClone.splice(droppableSource.index, 1);

    destClone.splice(droppableDestination.index, 0, removed);

    setSourceList(sourceClone)
    setDestList(destClone)
  };

  const onClickImage = (key: ListKey, index: number) => {
    setPreview(index)
    setPreviewList(key)
  }

  const moveArrowPreview = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!previewList) return
    const [images] = listsByKey[previewList]
    if (event.key == 'ArrowRight') {
      if (images.length - 1 > preview) {
        setPreview(preview + 1)
      }
    }
    if (event.key == 'ArrowLeft') {
      if (preview != 0) {
        setPreview(preview - 1)
      }
    }
  }

  const moveAll = () => {
    setImageOriginal([])
    setImagePublic([...imagesPublic, ...imagesOriginal])
  }

  const previewImages = previewList ? listsByKey[previewList][0] : null
  const totalImagenesCargadas = imagesOriginal.length + imagesPublic.length + imagesEliminar.length

  return (
    <div className="grid grid-cols-2 gap-2">
      {/* <h3 className='col-span-2 text-2xl text-center text-white p-1'> {namePack} Pag:{imagesOriginal.length}</h3> */}
      {/* <input
        className='w-full bg-amber-50 placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow'
        placeholder='nombre de pack'
        onChange={(e) => {
          setNamePack(e.target.value)
        }}
        type="text" /> */}

      <h3 className='text-1xl text-left text-white'> NUEVAS ENTRADAS </h3>
      <div className='col-span-2'>
        <DragDropContext onDragEnd={onDragEnd}>
          <ImageColumn
            droppableId="ORIGINAL"
            images={imagesOriginal}
            onClickImage={(index) => onClickImage('ORIGINAL', index)}
          />
          <h3 className='text-1xl text-left text-white'> PARA PUBLICAR {imagesPublic.length}</h3>
          <ImageColumn
            droppableId="PUBLIC"
            images={imagesPublic}
            onClickImage={(index) => onClickImage('PUBLIC', index)}
          />
          <h3 className='text-1xl text-left text-white'> ELIMINAR {imagesEliminar.length}</h3>
          <ImageColumn
            droppableId="ELIMINAR"
            images={imagesEliminar}
            onClickImage={(index) => onClickImage('ELIMINAR', index)}
          />
        </DragDropContext>
        {
          previewList && previewImages ? (
            <PreviewImage
              moveArrowOriginal={moveArrowPreview}
              img={previewImages[preview].data}
              nameFile={previewImages[preview].file?.name}
              closedModal={() => setPreviewList(null)}
            ></PreviewImage>
          ) : (<></>)
        }
      </div>

      <div className='col-span-2'>
        <div className='grid grid-cols-5 gap-2'>
          <h3 className='col-span-2 text-xl text-white p-1'>Total paginas {totalImagenesCargadas}</h3>
          <button className='bg-white hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded'
            type='button'
            onClick={() => {
              exportFile(imagesPublic, namePack).then((exported) => {
                if (exported) {
                  alert('Exportación completada')
                }
              }).catch((err) => {
                console.error('Error exportando el pack', err)
                alert('No se pudo exportar el ZIP: el pack es demasiado grande para procesarlo en el navegador. Probá exportar en un navegador basado en Chromium (permite guardar el zip directo a disco) o exportá el pack en partes más pequeñas.')
              })
            }}
          >
            Export archivos
          </button>
          <button className='bg-white hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded'
            type='button'
            onClick={() => {
              moveAll()
            }}
          >
            Mover Todo a publicar
          </button>
          <input
            className='w-full bg-amber-50 placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow'
            type="file"
            placeholder='agrega imagenes'
            multiple
            onChange={onChangeImages}
          />
        </div>
      </div>
    </div>
  )
}

export default App
