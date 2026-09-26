// Todo form via Inertia <Form>. Plain Inertia code: validation errors return
// to the scope (S2 → T2 self), success redirects to /scopes (T4/T6 → root).
import { Form, Head } from '@inertiajs/react'

const TodoCreate = () => (
  <div>
    <Head title="New todo" />
    <Form action="/scopes/todos" method="post" className="space-y-4">
      {({ errors, processing }) => (
        <>
          <div>
            <input
              name="name"
              placeholder="What needs doing?"
              autoFocus
              className="w-full rounded-sm border border-gray-300 px-3 py-2"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>
          <button
            type="submit"
            disabled={processing}
            className="rounded-sm bg-slate-800 px-4 py-2 text-white disabled:opacity-50"
          >
            {processing ? 'Saving…' : 'Save'}
          </button>
        </>
      )}
    </Form>
  </div>
)

export default TodoCreate
