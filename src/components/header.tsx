import Link from "next/link";

export function Header() {
	return (
		<header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-neutral-100">
			<nav className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
				<Link
					href="/"
					className="text-lg font-semibold text-neutral-900 hover:text-neutral-600 transition-colors"
				>
					Soul Papers
				</Link>
				<Link
					href="/about"
					className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
				>
					About
				</Link>
			</nav>
		</header>
	);
}
