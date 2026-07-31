import type { Metadata } from "next";
import { Caveat, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-handwriting" });

export const metadata: Metadata = {
	description:
		"Stories that remind us why the little things matter. Open a paper plane from a stranger.",
	openGraph: {
		description: "One letter a day.",
		locale: "en_US",
		siteName: "Soul Papers",
		title: "Soul Papers",
		type: "website",
	},
	title: {
		default: "Soul Papers",
		template: "%s | Soul Papers",
	},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body className={`${inter.className} ${caveat.variable}`}>{children}</body>
		</html>
	);
}
