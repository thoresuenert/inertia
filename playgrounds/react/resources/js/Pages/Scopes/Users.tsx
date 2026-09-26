// User picker: debounced search + <Link> pagination. Plain Inertia code —
// useRouter() targets the scope inside a modal and the root when opened
// directly. The nested detail modal comes from the shared ScopeModal.
import { Head, Link, useRouter } from '@inertiajs/react'
import { useEffect, useRef, useState } from 'react'
import ScopeModal from '../../Components/ScopeModal'

type User = { id: number; name: string; email: string }
type Paginator = { data: User[]; links: { url: string | null; label: string; active: boolean }[] }

const Users = ({ users, filters }: { users: Paginator; filters: { search?: string } }) => {
  const router = useRouter()
  const [search, setSearch] = useState(filters.search ?? '')
  const [detail, setDetail] = useState<User | null>(null)
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const timer = setTimeout(() => {
      router.get(
        '/scopes/users',
        { search: search || null },
        { only: ['users', 'filters'], preserveState: true, replace: true },
      )
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  return (
    <div>
      <Head title="User picker" />
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search users…"
        className="w-full rounded-sm border border-gray-300 px-3 py-2"
      />

      <table className="mt-4 w-full text-left">
        <tbody>
          {users.data.map((user) => (
            <tr key={user.id} className="border-b border-gray-100">
              <td className="py-2">{user.name}</td>
              <td className="py-2 text-gray-500">{user.email}</td>
              <td className="py-2 text-right">
                <button onClick={() => setDetail(user)} className="text-blue-700 underline">
                  details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex flex-wrap gap-1">
        {users.links.map((link) =>
          link.url ? (
            <Link
              key={link.label}
              href={link.url}
              only={['users', 'filters']}
              preserveState
              className={`px-2 py-1 ${link.active ? 'font-bold underline' : 'text-blue-700'}`}
              dangerouslySetInnerHTML={{ __html: link.label }}
            />
          ) : (
            <span
              key={link.label}
              className="px-2 py-1 text-gray-400"
              dangerouslySetInnerHTML={{ __html: link.label }}
            />
          ),
        )}
      </div>

      {detail && (
        <ScopeModal
          url={`/scopes/users/${detail.id}`}
          name="user-detail"
          title={detail.name}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}

export default Users
