import { Head, Link } from '@inertiajs/react'
// M00: proves Vite compiles @inertiajs-poc/scope from TypeScript source, no build step.
import { SCOPE_POC } from '@inertiajs-poc/scope'

const Home = () => {
  return (
    <>
      <Head title="Home" />
      <h1 className="text-3xl">Home</h1>
      <p className="mt-2 text-xs text-gray-400">scope package: {SCOPE_POC}</p>
      <p className="mt-6">
        <Link href="/article#far-down" className="text-blue-700 underline">
          Link to bottom of article page
        </Link>
      </p>
    </>
  )
}

export default Home
