// Widget with a deferred prop (D1–D3) and polling (A7). Plain Inertia code:
// <Deferred> and usePoll target the scope inside a modal, the root otherwise.
import { Deferred, Head, usePoll } from '@inertiajs/react'

type Stats = { users: number; todos: number; open: number }

const Widget = ({ time, stats }: { time: string; stats?: Stats }) => {
  usePoll(5000, { only: ['time'] })

  return (
    <div>
      <Head title="Widget" />
      <p>
        Server time: <span className="font-mono">{time}</span> (polls every 5s)
      </p>
      <Deferred data="stats" fallback={<p className="mt-4 text-gray-400">Loading stats…</p>}>
        <div className="mt-4 flex gap-6">
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
      </Deferred>
    </div>
  )
}

export default Widget
