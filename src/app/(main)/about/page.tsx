import type { Metadata } from "next";
import { Header } from "@/components/header";

export const metadata: Metadata = {
	title: "About",
	description: "What Soul Papers is and why it exists.",
};

export default function AboutPage() {
	return (
		<>
			<Header />
			<main className="pt-16">
				<div className="min-h-screen py-16 md:py-24">
					<div className="max-w-2xl mx-auto px-6">
						<h1 className="text-4xl md:text-5xl font-serif font-bold text-neutral-900 mb-8 leading-tight">
							About
						</h1>

						<div className="space-y-6 text-lg text-neutral-600 leading-relaxed font-serif">
							<p>
								<strong className="text-neutral-900">Soul Papers</strong> is a collection of
								real stories about the small things that changed someone&apos;s life or perspective.
							</p>

							<p>
								Every day, two stories are selected for you. That&apos;s it. No infinite scroll, no
								algorithm chasing engagement. Just two moments of human connection.
							</p>

							<p>
								The stories are short — something you can read in two or three minutes. They&apos;re
								about gratitude, kindness, loss, surprise, love, and all the tiny moments we tend to
								overlook.
							</p>

							<p>
								Think of it as opening a personal letter from a stranger who wanted to share
								something beautiful with you.
							</p>

							<p className="text-neutral-400 text-base italic">
								Because sometimes the smallest things take up the most room in your heart.
							</p>
						</div>
					</div>
				</div>
			</main>
		</>
	);
}
