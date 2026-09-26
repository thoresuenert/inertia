// Demo home: todo list + the three modals. This page opens scopes via
// <ScopeModal> but contains no scope primitives itself.
import { Head, usePage } from '@inertiajs/react'
import { useState } from 'react'
import ScopeModal from '../../Components/ScopeModal'

type Todo = { id: number; name: string; done: boolean }
type Modal = 'users' | 'todo' | 'widget' | null

const Index = ({ todos }: { todos: Todo[] }) => {
  const { flash } = usePage()
  const [modal, setModal] = useState<Modal>(null)
  const close = () => setModal(null)

  return (
    <>
      <Head title="Router Scopes" />
      <h1 className="text-3xl">Router Scopes demo</h1>

      {(flash as { success?: string } | undefined)?.success && (
        <p className="mt-4 rounded-sm bg-green-100 px-4 py-2 text-green-800">
          {(flash as { success?: string }).success}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <button onClick={() => setModal('users')} className="rounded-sm bg-slate-800 px-4 py-2 text-white">
          User picker
        </button>
        <button onClick={() => setModal('todo')} className="rounded-sm bg-slate-800 px-4 py-2 text-white">
          New todo
        </button>
        <button onClick={() => setModal('widget')} className="rounded-sm bg-slate-800 px-4 py-2 text-white">
          Widget
        </button>
      </div>

      <h2 className="mt-8 text-xl">Todos</h2>
      <ul className="mt-2 list-disc pl-6">
        {todos.map((todo) => (
          <li key={todo.id} className={todo.done ? 'text-gray-400 line-through' : ''}>
            {todo.name}
          </li>
        ))}
      </ul>

      {modal === 'users' && <ScopeModal url="/scopes/users" name="user-picker" title="Pick a user" onClose={close} />}
      {modal === 'todo' && (
        <ScopeModal url="/scopes/todos/create" name="todo-create" title="New todo" onClose={close} />
      )}
      {modal === 'widget' && <ScopeModal url="/scopes/widget" name="widget" title="Widget" onClose={close} />}
    </>
  )
}

export default Index
