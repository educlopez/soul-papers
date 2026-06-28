interface StoryContentProps {
	content: string;
	title: string;
	author: string;
}

/**
 * Renders story content styled as a handwritten letter on paper.
 */
export function StoryContent({ content, title, author }: StoryContentProps) {
	const paragraphs = content
		.split(/\n\n+/)
		.map((p) => p.trim())
		.filter(Boolean);

	return (
		<article className="px-8 py-6 md:px-12 md:py-8">
			{/* Title — handwritten header */}
			<header className="mb-8">
				<h2
					className="font-handwriting text-4xl md:text-5xl text-neutral-800 mb-4 leading-tight"
					style={{ letterSpacing: "-0.01em" }}
				>
					{title}
				</h2>

				{/* Decorative ink line */}
				<div className="flex items-center gap-3 mb-2">
					<div className="h-px flex-1 bg-gradient-to-r from-neutral-300 via-neutral-400/50 to-transparent" />
					<svg
						width="16"
						height="16"
						viewBox="0 0 16 16"
						className="text-neutral-300 flex-shrink-0"
						aria-hidden="true"
					>
						<circle cx="8" cy="8" r="2" fill="currentColor" />
					</svg>
					<div className="h-px flex-1 bg-gradient-to-l from-neutral-300 via-neutral-400/50 to-transparent" />
				</div>
			</header>

			{/* Story body — handwriting font on ruled lines */}
			<div className="font-handwriting text-xl md:text-2xl leading-[32px] text-neutral-700">
				{paragraphs.map((paragraph) => (
					<p
						key={paragraph.slice(0, 40)}
						className="mb-[32px]"
						dangerouslySetInnerHTML={{
							__html: paragraph
								.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
								.replace(/\*(.+?)\*/g, "<em>$1</em>"),
						}}
					/>
				))}
			</div>

			{/* Signature — author name with flourish */}
			<footer className="mt-10 pt-6 border-t border-neutral-200/60">
				<div className="flex items-end justify-end gap-2">
					<span className="text-neutral-400 text-sm italic font-serif">with love,</span>
				</div>
				<p
					className="font-handwriting text-2xl md:text-3xl text-neutral-600 text-right mt-1"
					style={{
						transform: "rotate(-2deg)",
						transformOrigin: "right center",
					}}
				>
					{author}
				</p>
			</footer>
		</article>
	);
}
