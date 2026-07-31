import Link from "next/link";

export function Header() {
	return (
		<header className="fixed top-0 right-0 left-0 z-50 border-neutral-100 border-b bg-white/80 backdrop-blur-sm">
			<nav className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
				<Link
					href="/"
					className="font-semibold text-lg text-neutral-900 transition-colors hover:text-neutral-600"
				>
					Soul Papers
				</Link>
				<Link
					href="/about"
					className="text-neutral-500 text-sm transition-colors hover:text-neutral-900"
				>
					About
				</Link>
			</nav>
		</header>
	);
}
