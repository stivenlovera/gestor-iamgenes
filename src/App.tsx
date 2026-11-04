import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { v4 as uuidv4 } from 'uuid';

import { type IImage } from './smock/test'
import { ImageColumn } from './components/image-column'
import { DragDropContext, type DraggableLocation, type DropResult } from '@hello-pangea/dnd';
import { exportFile } from './utils/zip';
import { PreviewImage } from './components/modal-preview/modal-preview';
import { HELPER_NOT_RUNNING_MESSAGE, pickLocalFiles } from './utils/local-helper';
import { ModalReminder } from './components/modal-reminder';

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
  // Imágenes de NUEVAS ENTRADAS marcadas con el check (por IImage.description).
  const [selectedOriginal, setSelectedOriginal] = useState<Set<string>>(new Set())
  // Al exportar: true numera los archivos por su posición; false conserva el nombre original.
  const [renameFiles, setRenameFiles] = useState<boolean>(true)
  const [showReminder, setShowReminder] = useState<boolean>(false)

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

  // Igual que onChangeImages, pero con el diálogo nativo del helper local, que conserva la ruta en disco.
  const onPickWithPath = async () => {
    try {
      const picked = await pickLocalFiles()
      const added: IImage[] = picked.map(({ file, path }, index) => ({
        pagina: index + 1,
        data: URL.createObjectURL(file),
        description: uuidv4(),
        file,
        path,
      }))
      setImageOriginal((current) => [...current, ...added])
    } catch (error) {
      // fetch lanza TypeError cuando no hay nada escuchando en el puerto del helper.
      alert(error instanceof TypeError ? HELPER_NOT_RUNNING_MESSAGE : `Error del helper local: ${(error as Error).message}`)
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

  const toggleSelectOriginal = (id: string) => {
    const next = new Set(selectedOriginal)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedOriginal(next)
  }

  // Elimina de forma permanente imágenes de NUEVAS ENTRADAS (no pasan a DESCARTAR) y libera sus URLs.
  const deleteFromOriginal = (toDelete: IImage[]) => {
    if (toDelete.length === 0) return
    if (!confirm(`¿Eliminar permanentemente ${toDelete.length} imagen(es) de NUEVAS ENTRADAS?`)) return
    const ids = new Set(toDelete.map((image) => image.description))
    toDelete.forEach((image) => URL.revokeObjectURL(image.data))
    setImageOriginal(imagesOriginal.filter((image) => !ids.has(image.description)))
    setSelectedOriginal(new Set())
    if (previewList === 'ORIGINAL') {
      setPreviewList(null)
    }
  }

  const selectedOriginalImages = imagesOriginal.filter((image) => selectedOriginal.has(image.description))

  const previewImages = previewList ? listsByKey[previewList][0] : null

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

      <div className='col-span-2 flex items-center gap-3'>
        <h3 className='text-1xl text-left text-white'> NUEVAS ENTRADAS {imagesOriginal.length}</h3>
        <button className='bg-white hover:bg-red-600 text-red-600 text-sm font-semibold hover:text-white py-1 px-3 border border-red-600 hover:border-transparent rounded disabled:opacity-50 disabled:pointer-events-none'
          type='button'
          disabled={imagesOriginal.length === 0}
          onClick={() => deleteFromOriginal(imagesOriginal)}
        >
          Eliminar todo
        </button>
        <button className='bg-white hover:bg-red-600 text-red-600 text-sm font-semibold hover:text-white py-1 px-3 border border-red-600 hover:border-transparent rounded disabled:opacity-50 disabled:pointer-events-none'
          type='button'
          disabled={selectedOriginalImages.length === 0}
          onClick={() => deleteFromOriginal(selectedOriginalImages)}
        >
          Eliminar seleccionados ({selectedOriginalImages.length})
        </button>
        <input
          className='bg-amber-50 text-slate-700 text-sm py-1 px-3 border border-slate-200 rounded cursor-pointer hover:border-slate-300'
          type="file"
          multiple
          onChange={onChangeImages}
        />
        <button className='bg-white hover:bg-blue-500 text-blue-700 text-sm font-semibold hover:text-white py-1 px-3 border border-blue-500 hover:border-transparent rounded'
          type='button'
          title='Elige imágenes con el diálogo de Windows y conserva su ruta en disco (requiere el helper local: npm run helper)'
          onClick={onPickWithPath}
        >
          Agregar con ruta
        </button>
        <button className='ml-auto bg-white hover:bg-blue-500 text-blue-700 text-sm font-semibold hover:text-white py-1 px-3 border border-blue-500 hover:border-transparent rounded'
          type='button'
          onClick={() => setShowReminder(true)}
        >
          Recordatorio
        </button>
        {showReminder ? <ModalReminder onClose={() => setShowReminder(false)} /> : null}
      </div>
      <div className='col-span-2'>
        <DragDropContext onDragEnd={onDragEnd}>
          <ImageColumn
            droppableId="ORIGINAL"
            images={imagesOriginal}
            onClickImage={(index) => onClickImage('ORIGINAL', index)}
            selectedIds={selectedOriginal}
            onToggleSelect={toggleSelectOriginal}
          />
          <div className='flex items-center gap-3'>
            <h3 className='text-1xl text-left text-white'> PARA PUBLICAR {imagesPublic.length}</h3>
            <button className='bg-white hover:bg-blue-500 text-blue-700 text-sm font-semibold hover:text-white py-1 px-3 border border-blue-500 hover:border-transparent rounded disabled:opacity-50 disabled:pointer-events-none'
              type='button'
              disabled={imagesOriginal.length === 0}
              onClick={() => {
                moveAll()
              }}
            >
              Mover todo a publicar
            </button>
          </div>
          <ImageColumn
            droppableId="PUBLIC"
            images={imagesPublic}
            onClickImage={(index) => onClickImage('PUBLIC', index)}
          />
          <h3 className='text-1xl text-left text-white'> DESCARTAR {imagesEliminar.length}</h3>
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
              path={previewImages[preview].path}
              closedModal={() => setPreviewList(null)}
            ></PreviewImage>
          ) : (<></>)
        }
      </div>

      <div className='col-span-2'>
        <div className='flex items-center gap-3'>
          <button className='bg-white hover:bg-blue-500 text-blue-700 text-sm font-semibold hover:text-white py-1 px-3 border border-blue-500 hover:border-transparent rounded'
            type='button'
            onClick={() => {
              exportFile(imagesPublic, namePack, renameFiles).then((exported) => {
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
          <label className='flex items-center gap-2 text-white'>
            <input
              type='checkbox'
              checked={renameFiles}
              onChange={(e) => setRenameFiles(e.target.checked)}
            />
            Renombrar con números
          </label>
        </div>
      </div>
    </div>
  )
}

export default App
