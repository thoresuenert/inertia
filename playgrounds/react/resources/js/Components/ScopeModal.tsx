// The ONLY file in the playground that imports @inertiajs-poc/scope — pages
// stay plain Inertia code (that is the PoC's proof). A minimal modal: native
// <dialog> hosting a <RouterScope>. Mirrors the RFC §7.4 package pattern.
import { RouterScope } from '@inertiajs-poc/scope'
import { useEffect, useRef } from 'react'
import Spinner from './Spinner'

export default function ScopeModal({
  url,
  name,
  title,
  onClose,
}: {
  url: string
  name: string
  title: string
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[44rem] max-w-[90vw] rounded-xl p-0 shadow-xl backdrop:bg-black/40"
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button onClick={onClose} className="px-2 text-gray-400 hover:text-gray-600" aria-label="Close">
          ✕
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-6">
        <RouterScope url={url} name={name} fallback={<Spinner className="size-6" />} onDispose={onClose} />
      </div>
    </dialog>
  )
}
