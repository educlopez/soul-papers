export const QUOTES = [
	"Come back tomorrow for more",
	"A day without laughter is a day wasted — Charlie Chaplin",
	"Enjoy your beautiful day",
	"Smile — it's the best thing you can wear",
	"The best things in life are the people you love, the places you've been, and the memories you've made",
	"Be kind whenever possible. It is always possible — Dalai Lama",
] as const;

export function getRandomQuote(): string {
	const index = Math.floor(Math.random() * QUOTES.length);
	return QUOTES[index];
}
