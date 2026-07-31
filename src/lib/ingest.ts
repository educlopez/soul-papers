import { getMadridDay } from "./time";

/** Fallback title applied when a submission leaves the optional "Title" field
 * blank. The curator can rename it in the generated PR before merging. */
export const FALLBACK_TITLE = "A letter without a title";

export interface TallyQuestion {
	id: string;
	title: string;
}

export interface TallyResponse {
	questionId: string;
	value: unknown;
}

export interface TallySubmission {
	id: string;
	isCompleted?: boolean;
	responses: TallyResponse[];
}

export interface ParsedLetter {
	author: string;
	content: string;
	tallyId: string;
	/** Undefined when the optional "Title" field was left blank. */
	title?: string;
}

export interface IngestContext {
	existingDates: ReadonlySet<string> | Iterable<string>;
	existingSlugs: ReadonlySet<string> | Iterable<string>;
	now?: Date;
}

export interface LetterDraft {
	author: string;
	branch: string;
	date: string;
	mdx: string;
	slug: string;
	tallyId: string;
	title: string;
}

/** Lowercases, strips diacritics, and collapses anything that isn't
 * alphanumeric into single hyphens, trimming the edges. */
export function slugify(input: string): string {
	return input
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/** Generates a slug from `base`, falling back to `letter` when it sanitizes
 * to nothing, and disambiguating against `existingSlugs` first with
 * `disambiguator` (typically the Tally submission id), then a numeric suffix. */
export function generateSlug(
	base: string,
	existingSlugs: ReadonlySet<string> | Iterable<string>,
	disambiguator: string
): string {
	const existing = existingSlugs instanceof Set ? existingSlugs : new Set(existingSlugs);
	const baseSlug = slugify(base) || "letter";
	if (!existing.has(baseSlug)) {
		return baseSlug;
	}

	const disambiguated = `${baseSlug}-${slugify(disambiguator)}`;
	if (!existing.has(disambiguated)) {
		return disambiguated;
	}

	let suffix = 2;
	while (existing.has(`${disambiguated}-${suffix}`)) {
		suffix++;
	}
	return `${disambiguated}-${suffix}`;
}

function addDays(dateStr: string, days: number): string {
	const d = new Date(`${dateStr}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}

/** Picks the next free future date (Madrid), starting the search at
 * tomorrow and never returning today — assigning today could change what a
 * visitor already saw mid-day, breaking the deterministic daily-letter
 * resolver. Skips any date already used by another letter. */
export function computeNextAvailableDate(
	existingDates: ReadonlySet<string> | Iterable<string>,
	now: Date = new Date()
): string {
	const existing = existingDates instanceof Set ? existingDates : new Set(existingDates);
	let candidate = addDays(getMadridDay(now), 1);
	while (existing.has(candidate)) {
		candidate = addDays(candidate, 1);
	}
	return candidate;
}

/** Frontmatter values are single-line fields (title/author/date/tallyId);
 * cap their length so a runaway submission can't bloat the committed MDX. */
const MAX_FRONTMATTER_VALUE_LENGTH = 200;

function yamlEscape(value: string): string {
	const singleLine = value
		// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally stripping control chars (incl. newlines) from single-line frontmatter fields.
		.replace(/[\r\n\t\x00-\x1f\x7f]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, MAX_FRONTMATTER_VALUE_LENGTH);
	return `"${singleLine.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Builds the MDX file body (frontmatter + content) for an ingested letter,
 * matching the seed-file convention (quoted YAML string values). */
export function buildLetterMdx(letter: {
	title: string;
	author: string;
	date: string;
	tallyId: string;
	content: string;
}): string {
	return [
		"---",
		`title: ${yamlEscape(letter.title)}`,
		`author: ${yamlEscape(letter.author)}`,
		`date: ${yamlEscape(letter.date)}`,
		`tallyId: ${yamlEscape(letter.tallyId)}`,
		"---",
		"",
		letter.content.trim(),
		"",
	].join("\n");
}

function findQuestion(questions: TallyQuestion[], keywords: string[]): TallyQuestion | undefined {
	return questions.find((q) => {
		const title = q.title.toLowerCase();
		return keywords.some((k) => title.includes(k));
	});
}

function answerText(submission: TallySubmission, question: TallyQuestion | undefined): string {
	if (!question) {
		return "";
	}
	const response = submission.responses.find((r) => r.questionId === question.id);
	if (!response) {
		return "";
	}
	const { value } = response;
	if (typeof value === "string") {
		return value.trim();
	}
	if (Array.isArray(value) && typeof value[0] === "string") {
		return value[0].trim();
	}
	return "";
}

function isConsented(submission: TallySubmission, questions: TallyQuestion[]): boolean {
	const question = findQuestion(questions, ["consent"]);
	if (!question) {
		return false;
	}
	const response = submission.responses.find((r) => r.questionId === question.id);
	if (!response) {
		return false;
	}
	const { value } = response;
	if (typeof value === "boolean") {
		return value;
	}
	if (Array.isArray(value)) {
		return value.length > 0;
	}
	if (typeof value === "string") {
		return value.trim().length > 0;
	}
	return false;
}

/** Transforms one raw Tally submission into a `ParsedLetter`, or `null` when
 * it's incomplete, unconsented, or missing the required letter/author text.
 * Consent is opt-in and fails closed: a missing consent question skips the
 * submission rather than assuming consent. */
export function parseTallySubmission(
	submission: TallySubmission,
	questions: TallyQuestion[]
): ParsedLetter | null {
	if (submission.isCompleted === false) {
		return null;
	}
	if (!isConsented(submission, questions)) {
		return null;
	}

	const content = answerText(submission, findQuestion(questions, ["letter", "carta"]));
	const author = answerText(submission, findQuestion(questions, ["signature", "persona", "firma"]));
	if (!(content && author)) {
		return null;
	}

	const title = answerText(submission, findQuestion(questions, ["title", "título", "titulo"]));
	return { author, content, tallyId: submission.id, title: title || undefined };
}

/** Dedup filter: excludes submissions whose id already exists as a merged
 * letter's `tallyId` OR an open `letter/tally-{id}` PR branch. */
export function filterUnprocessedSubmissions(
	submissions: TallySubmission[],
	excludeTallyIds: ReadonlySet<string> | Iterable<string>
): TallySubmission[] {
	const exclude = excludeTallyIds instanceof Set ? excludeTallyIds : new Set(excludeTallyIds);
	return submissions.filter((s) => !exclude.has(s.id));
}

/** Branch naming convention used both for dedup (scanning open PRs) and for
 * the branch each ingestion PR is opened from. */
export function branchNameForTallyId(tallyId: string): string {
	return `letter/tally-${tallyId}`;
}

/** Assembles the full letter draft (slug, date, MDX body, branch) from a
 * parsed submission and the current repo state. One draft = one future PR. */
export function createLetterDraft(parsed: ParsedLetter, context: IngestContext): LetterDraft {
	const title = parsed.title || FALLBACK_TITLE;
	const slugBase = parsed.title || parsed.author;
	const slug = generateSlug(slugBase, context.existingSlugs, parsed.tallyId);
	const date = computeNextAvailableDate(context.existingDates, context.now);
	const mdx = buildLetterMdx({
		author: parsed.author,
		content: parsed.content,
		date,
		tallyId: parsed.tallyId,
		title,
	});
	return {
		author: parsed.author,
		branch: branchNameForTallyId(parsed.tallyId),
		date,
		mdx,
		slug,
		tallyId: parsed.tallyId,
		title,
	};
}
