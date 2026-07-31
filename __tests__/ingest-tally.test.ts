import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import {
	branchNameForTallyId,
	buildLetterMdx,
	computeNextAvailableDate,
	createLetterDraft,
	FALLBACK_TITLE,
	filterUnprocessedSubmissions,
	generateSlug,
	parseTallySubmission,
	slugify,
	type TallyQuestion,
	type TallySubmission,
} from "@/lib/ingest";

const QUESTIONS: TallyQuestion[] = [
	{ id: "q_letter", title: "Your letter" },
	{ id: "q_signature", title: "Your signature" },
	{ id: "q_title", title: "Title" },
	{ id: "q_consent", title: "Consent" },
];

function submission(overrides: Partial<TallySubmission> = {}): TallySubmission {
	return {
		id: "sub_1",
		isCompleted: true,
		responses: [
			{ questionId: "q_letter", value: "Dear whoever finds this," },
			{ questionId: "q_signature", value: "A grandmother from Seville, 82" },
			{ questionId: "q_title", value: "The Garden" },
			{ questionId: "q_consent", value: ["I understand my letter may be published anonymously"] },
		],
		...overrides,
	};
}

describe("slugify", () => {
	it("lowercases and hyphenates", () => {
		expect(slugify("The Garden In Winter")).toBe("the-garden-in-winter");
	});

	it("strips diacritics", () => {
		expect(slugify("Última carta")).toBe("ultima-carta");
	});

	it("collapses non-alnum runs into a single hyphen and trims edges", () => {
		expect(slugify("  Hello,  World!! ")).toBe("hello-world");
	});
});

describe("generateSlug", () => {
	it("returns the base slug when free", () => {
		expect(generateSlug("A New Letter", new Set(["other-slug"]), "tally123")).toBe("a-new-letter");
	});

	it("falls back to a disambiguated slug on collision", () => {
		expect(generateSlug("A New Letter", new Set(["a-new-letter"]), "tally123")).toBe(
			"a-new-letter-tally123"
		);
	});

	it("appends a numeric suffix if even the disambiguated slug collides", () => {
		const existing = new Set(["a-new-letter", "a-new-letter-tally123"]);
		expect(generateSlug("A New Letter", existing, "tally123")).toBe("a-new-letter-tally123-2");
	});

	it("falls back to 'letter' when the base sanitizes to nothing", () => {
		expect(generateSlug("!!!", new Set(), "tally123")).toBe("letter");
	});
});

describe("computeNextAvailableDate", () => {
	it("returns tomorrow (Madrid) when no dates are taken", () => {
		const now = new Date("2026-03-10T10:00:00Z");
		expect(computeNextAvailableDate(new Set(), now)).toBe("2026-03-11");
	});

	it("never returns today, even if today is free", () => {
		const now = new Date("2026-03-10T23:50:00Z");
		const result = computeNextAvailableDate(new Set(), now);
		expect(result > "2026-03-10").toBe(true);
	});

	it("skips dates already taken and returns the next free one", () => {
		const now = new Date("2026-03-10T10:00:00Z");
		const taken = new Set(["2026-03-11", "2026-03-12"]);
		expect(computeNextAvailableDate(taken, now)).toBe("2026-03-13");
	});
});

describe("buildLetterMdx", () => {
	it("produces frontmatter + body matching the seed convention", () => {
		const mdx = buildLetterMdx({
			author: "A grandmother from Seville, 82",
			content: "Dear whoever finds this,\n\nWith love.",
			date: "2026-03-11",
			tallyId: "sub_1",
			title: "The Garden",
		});
		expect(mdx).toBe(
			[
				"---",
				'title: "The Garden"',
				'author: "A grandmother from Seville, 82"',
				'date: "2026-03-11"',
				'tallyId: "sub_1"',
				"---",
				"",
				"Dear whoever finds this,\n\nWith love.",
				"",
			].join("\n")
		);
	});

	it("escapes double quotes and backslashes in frontmatter values", () => {
		const mdx = buildLetterMdx({
			author: "Author",
			content: "Body",
			date: "2026-03-11",
			tallyId: "sub_1",
			title: 'A "quoted" title',
		});
		expect(mdx).toContain('title: "A \\"quoted\\" title"');
	});

	it("strips embedded newlines/control chars from title and author so gray-matter round-trips cleanly", () => {
		const mdx = buildLetterMdx({
			author: "Attacker\r\nauthor: hacked",
			content: "Body",
			date: "2026-03-11",
			tallyId: "sub_1",
			title: "Frontmatter breaker\n---\ntitle: injected",
		});

		expect(() => matter(mdx)).not.toThrow();
		const { data, content } = matter(mdx);
		expect(data.title).toBe("Frontmatter breaker --- title: injected");
		expect(data.author).toBe("Attacker author: hacked");
		expect(data.date).toBe("2026-03-11");
		expect(content.trim()).toBe("Body");
	});

	it("truncates excessively long title/author values to a sane length", () => {
		const mdx = buildLetterMdx({
			author: "B".repeat(500),
			content: "Body",
			date: "2026-03-11",
			tallyId: "sub_1",
			title: "A".repeat(500),
		});

		const { data } = matter(mdx);
		expect(data.title.length).toBeLessThanOrEqual(200);
		expect(data.author.length).toBeLessThanOrEqual(200);
	});
});

describe("parseTallySubmission", () => {
	it("parses a complete, consented submission", () => {
		const parsed = parseTallySubmission(submission(), QUESTIONS);
		expect(parsed).toEqual({
			author: "A grandmother from Seville, 82",
			content: "Dear whoever finds this,",
			tallyId: "sub_1",
			title: "The Garden",
		});
	});

	it("returns null when consent is not given (empty array)", () => {
		const sub = submission({
			responses: [
				{ questionId: "q_letter", value: "Dear whoever finds this," },
				{ questionId: "q_signature", value: "Someone" },
				{ questionId: "q_consent", value: [] },
			],
		});
		expect(parseTallySubmission(sub, QUESTIONS)).toBeNull();
	});

	it("returns null when the consent question is missing entirely", () => {
		const sub = submission({
			responses: [
				{ questionId: "q_letter", value: "Dear whoever finds this," },
				{ questionId: "q_signature", value: "Someone" },
			],
		});
		expect(parseTallySubmission(sub, QUESTIONS)).toBeNull();
	});

	it("returns null when the letter body is blank", () => {
		const sub = submission({
			responses: [
				{ questionId: "q_letter", value: "" },
				{ questionId: "q_signature", value: "Someone" },
				{ questionId: "q_consent", value: ["yes"] },
			],
		});
		expect(parseTallySubmission(sub, QUESTIONS)).toBeNull();
	});

	it("returns null when the author/signature is missing", () => {
		const sub = submission({
			responses: [
				{ questionId: "q_letter", value: "Dear whoever finds this," },
				{ questionId: "q_consent", value: ["yes"] },
			],
		});
		expect(parseTallySubmission(sub, QUESTIONS)).toBeNull();
	});

	it("returns null when the submission is not completed", () => {
		expect(parseTallySubmission(submission({ isCompleted: false }), QUESTIONS)).toBeNull();
	});

	it("leaves title undefined when blank so callers can apply the fallback", () => {
		const sub = submission({
			responses: [
				{ questionId: "q_letter", value: "Dear whoever finds this," },
				{ questionId: "q_signature", value: "Someone" },
				{ questionId: "q_title", value: "" },
				{ questionId: "q_consent", value: ["yes"] },
			],
		});
		expect(parseTallySubmission(sub, QUESTIONS)?.title).toBeUndefined();
	});
});

describe("filterUnprocessedSubmissions", () => {
	it("excludes submissions whose id is already known", () => {
		const submissions = [submission({ id: "a" }), submission({ id: "b" }), submission({ id: "c" })];
		const result = filterUnprocessedSubmissions(submissions, new Set(["b"]));
		expect(result.map((s) => s.id)).toEqual(["a", "c"]);
	});

	it("returns all submissions when nothing is excluded", () => {
		const submissions = [submission({ id: "a" }), submission({ id: "b" })];
		expect(filterUnprocessedSubmissions(submissions, new Set())).toHaveLength(2);
	});
});

describe("branchNameForTallyId", () => {
	it("follows the letter/tally-{id} convention", () => {
		expect(branchNameForTallyId("sub_1")).toBe("letter/tally-sub_1");
	});
});

describe("createLetterDraft", () => {
	it("assembles a full draft from a parsed submission", () => {
		const parsed = parseTallySubmission(submission(), QUESTIONS);
		if (!parsed) {
			throw new Error("expected parsed submission");
		}

		const draft = createLetterDraft(parsed, {
			existingDates: new Set(["2026-03-11"]),
			existingSlugs: new Set(["the-garden-in-winter"]),
			now: new Date("2026-03-10T10:00:00Z"),
		});

		expect(draft.tallyId).toBe("sub_1");
		expect(draft.slug).toBe("the-garden");
		expect(draft.title).toBe("The Garden");
		expect(draft.author).toBe("A grandmother from Seville, 82");
		expect(draft.date).toBe("2026-03-12");
		expect(draft.branch).toBe("letter/tally-sub_1");
		expect(draft.mdx).toContain('tallyId: "sub_1"');
	});

	it("applies the fallback title and derives the slug from the author when title is blank", () => {
		const sub = submission({
			responses: [
				{ questionId: "q_letter", value: "Dear whoever finds this," },
				{ questionId: "q_signature", value: "A quiet stranger" },
				{ questionId: "q_title", value: "" },
				{ questionId: "q_consent", value: ["yes"] },
			],
		});
		const parsed = parseTallySubmission(sub, QUESTIONS);
		if (!parsed) {
			throw new Error("expected parsed submission");
		}

		const draft = createLetterDraft(parsed, {
			existingDates: new Set(),
			existingSlugs: new Set(),
			now: new Date("2026-03-10T10:00:00Z"),
		});

		expect(draft.title).toBe(FALLBACK_TITLE);
		expect(draft.slug).toBe("a-quiet-stranger");
	});
});
