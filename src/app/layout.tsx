import type { Metadata } from "next";
import { Inter, Caveat } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-handwriting" });

export const metadata: Metadata = {
	title: {
		default: "Soul Papers",
		template: "%s | Soul Papers",
	},
	description:
		"Stories that remind us why the little things matter. Open a paper plane from a stranger.",
	openGraph: {
		title: "Soul Papers",
		description: "Two stories a day about the small things that change everything.",
		type: "website",
		locale: "en_US",
		siteName: "Soul Papers",
	},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body className={`${inter.className} ${caveat.variable}`}>{children}</body>
		</html>
	);
}
