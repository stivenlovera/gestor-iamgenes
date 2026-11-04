import { useEffect } from 'react'

interface ModalReminderProps {
    onClose: () => void
}

// Términos de encuadre/cámara (en inglés, como se escriben en el prompt) con su traducción.
const TERMS: { en: string, es: string }[] = [
    { en: 'from above', es: 'desde arriba' },
    { en: 'from below', es: 'desde abajo' },
    { en: 'low angle', es: 'ángulo bajo' },
    { en: 'high angle', es: 'ángulo alto' },
    { en: 'long angle', es: 'ángulo amplio' },
    { en: 'dutch angle', es: 'ángulo holandés' },
    { en: 'cowboy shot', es: 'toma de vaquero' },
    { en: 'close-up', es: 'primer plano' },
    { en: 'focus on', es: 'foco' },
    { en: 'full body', es: 'cuerpo completo' },
    { en: 'portrait', es: 'retrato' },
    { en: 'extremely close up', es: 'primer plano extremo' },
    { en: 'head out of frame', es: 'cabeza fuera de encuadre' },
]

export const ModalReminder = ({ onClose }: ModalReminderProps) => {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [onClose])

    return (
        <div className='fixed inset-0 z-10 flex justify-center items-center bg-black/60' onClick={onClose}>
            <div className='bg-gray-900 p-4 border-gray-300 border-2 rounded max-w-sm w-full' onClick={(event) => event.stopPropagation()}>
                <div className='flex justify-between items-center pb-2'>
                    <h3 className='text-xl text-white'>Recordatorio</h3>
                    <button type='button' className='px-2 border border-white rounded text-white' onClick={onClose}>×</button>
                </div>
                <ul className='divide-y divide-gray-700'>
                    {TERMS.map((term) => (
                        <li key={term.en} className='py-1'>
                            <p className='text-white select-all'>{term.en}</p>
                            <p className='text-gray-400 text-sm'>{term.es}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
