import Link from "next/link";

export default function NotFound() {
	return (
		<div className="min-h-screen flex items-center justify-center px-6">
			<div className="text-center max-w-md">
				<h1 className="text-6xl font-serif font-bold text-neutral-200 mb-4">404</h1>
				<h2 className="text-xl font-semibold text-neutral-900 mb-4">Story not found</h2>
				<p className="text-neutral-500 mb-8">
					This story doesn&apos;t exist — but there are others waiting for you.
				</p>
				<Link
					href="/"
					className="inline-block px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 transition-colors text-sm"
				>
					Go Home
				</Link>
			</div>
		</div>
	);
}
