import Link from "next/link";

export default function NotFound() {
	return (
		<div className="flex min-h-screen items-center justify-center px-6">
			<div className="max-w-md text-center">
				<h1 className="mb-4 font-bold font-serif text-6xl text-neutral-200">404</h1>
				<h2 className="mb-4 font-semibold text-neutral-900 text-xl">Story not found</h2>
				<p className="mb-8 text-neutral-500">
					This story doesn&apos;t exist — but there are others waiting for you.
				</p>
				<Link
					href="/"
					className="inline-block rounded-lg bg-neutral-900 px-6 py-3 text-sm text-white transition-colors hover:bg-neutral-700"
				>
					Go Home
				</Link>
			</div>
		</div>
	);
}
