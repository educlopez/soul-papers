interface CloseButtonProps {
	onClick: () => void;
}

export function CloseButton({ onClick }: CloseButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 transition-colors"
			aria-label="Close story"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="h-5 w-5"
				aria-hidden="true"
			>
				<line x1="18" y1="6" x2="6" y2="18" />
				<line x1="6" y1="6" x2="18" y2="18" />
			</svg>
		</button>
	);
}
