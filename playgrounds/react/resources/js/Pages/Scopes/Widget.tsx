// Widget with a deferred prop (D1–D3) and polling (A7). Plain Inertia code:
// <Deferred> and usePoll target the scope inside a modal, the root otherwise.
// The refresh button + reloading slot make K5 observable (Deferred compares
// against the scope page URL, not window.location).
import { Deferred, Head, usePoll, useRouter } from '@inertiajs/react'

type Stats = { users: number; todos: number; open: number }

const Widget = ({ time, stats }: { time: string; stats?: Stats }) => {
  const router = useRouter()
  usePoll(5000, { only: ['time'] })

  return (
    <div>
      <Head title="Widget" />
      <p>
        Server time: <span className="font-mono">{time}</span> (polls every 5s)
      </p>
      <Deferred data="stats" fallback={<p className="mt-4 text-gray-400">Loading stats…</p>}>
        {({ reloading }: { reloading: boolean }) => (
          <div className="mt-4">
            <div className="flex gap-6">
              <div>
                <span className="text-2xl">{stats?.users}</span> users
              </div>
              <div>
                <span className="text-2xl">{stats?.todos}</span> todos
              </div>
              <div>
                <span className="text-2xl">{stats?.open}</span> open
              </div>
            </div>
            <button
              onClick={() => router.reload({ only: ['stats'] })}
              className="mt-4 rounded-sm border border-gray-300 px-3 py-1 text-sm"
            >
              {reloading ? 'Refreshing…' : 'Refresh stats'}
            </button>
          </div>
        )}
      </Deferred>
    </div>
  )
}

export default Widget
