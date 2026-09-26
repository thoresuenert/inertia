// Nested-scope demo page (T7): selecting redirects to the picker path, so the
// response applies to the PARENT scope and this modal closes. Plain Inertia.
import { Head, useForm } from '@inertiajs/react'

const UserDetail = ({ user }: { user: { id: number; name: string; email: string } }) => {
  const { post, processing } = useForm({})

  return (
    <div>
      <Head title={user.name} />
      <p className="text-lg">{user.name}</p>
      <p className="text-gray-500">{user.email}</p>
      <button
        onClick={() => post(`/scopes/users/${user.id}/select`)}
        disabled={processing}
        className="mt-4 rounded-sm bg-slate-800 px-4 py-2 text-white disabled:opacity-50"
      >
        {processing ? 'Selecting…' : 'Select this user'}
      </button>
    </div>
  )
}

export default UserDetail
