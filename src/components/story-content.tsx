interface StoryContentProps {
	author: string;
	content: string;
	title: string;
}

/** Escapes HTML-significant characters so raw markup in untrusted text (e.g.
 * a Tally submission) is displayed as literal text instead of executing. */
export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/** Escapes the raw paragraph text FIRST, then applies the bold/italic
 * markdown transform — so only our own generated <strong>/<em> tags survive
 * and any HTML embedded in the raw text can never reach the DOM as markup. */
export function renderParagraphHtml(paragraph: string): string {
	return escapeHtml(paragraph)
		.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
		.replace(/\*(.+?)\*/g, "<em>$1</em>");
}

/**
 * Renders story content styled as a handwritten letter on paper.
 */
const PARAGRAPH_BREAK_REGEX = /\n\n+/;

export function StoryContent({ content, title, author }: StoryContentProps) {
	const paragraphs = content
		.split(PARAGRAPH_BREAK_REGEX)
		.map((p) => p.trim())
		.filter(Boolean);

	return (
		<article className="px-8 py-6 md:px-12 md:py-8">
			{/* Title — handwritten header */}
			<header className="mb-8">
				<h2
					className="mb-4 font-handwriting text-4xl text-neutral-800 leading-tight md:text-5xl"
					style={{ letterSpacing: "-0.01em" }}
				>
					{title}
				</h2>

				{/* Decorative ink line */}
				<div className="mb-2 flex items-center gap-3">
					<div className="h-px flex-1 bg-gradient-to-r from-neutral-300 via-neutral-400/50 to-transparent" />
					<svg
						width="16"
						height="16"
						viewBox="0 0 16 16"
						className="flex-shrink-0 text-neutral-300"
						aria-hidden="true"
					>
						<circle cx="8" cy="8" r="2" fill="currentColor" />
					</svg>
					<div className="h-px flex-1 bg-gradient-to-l from-neutral-300 via-neutral-400/50 to-transparent" />
				</div>
			</header>

			{/* Story body — handwriting font on ruled lines */}
			<div className="font-handwriting text-neutral-700 text-xl leading-[32px] md:text-2xl">
				{paragraphs.map((paragraph) => (
					<p
						key={paragraph.slice(0, 40)}
						className="mb-[32px]"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: renderParagraphHtml HTML-escapes the raw text before applying the bold/italic transform, so no unescaped markup reaches the DOM.
						dangerouslySetInnerHTML={{
							__html: renderParagraphHtml(paragraph),
						}}
					/>
				))}
			</div>

			{/* Signature — author name with flourish */}
			<footer className="mt-10 border-neutral-200/60 border-t pt-6">
				<div className="flex items-end justify-end gap-2">
					<span className="font-serif text-neutral-400 text-sm italic">with love,</span>
				</div>
				<p
					className="mt-1 text-right font-handwriting text-2xl text-neutral-600 md:text-3xl"
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
