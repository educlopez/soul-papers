#!/usr/bin/env node
/**
 * Thin CLI orchestrator for the Tally → MDX → PR ingestion agent (ADR-6/7/8).
 * All transform/dedup logic lives in `src/lib/ingest.ts` (pure, unit-tested);
 * this file only does I/O: hits the Tally + GitHub REST APIs, reads the
 * committed content/stories, and writes one letter's MDX file per invocation.
 *
 * Usage (see .github/workflows/ingest-letters.yml):
 *   tsx scripts/ingest-tally.ts list          # prints/emits new tallyIds as JSON
 *   tsx scripts/ingest-tally.ts write <id>    # writes the MDX file for one id
 */
import fs from "node:fs";
import path from "node:path";
import {
	createLetterDraft,
	filterUnprocessedSubmissions,
	parseTallySubmission,
	type TallyQuestion,
	type TallySubmission,
} from "../src/lib/ingest";
import { getAllStories } from "../src/lib/stories";

const DEFAULT_FORM_ID = "ODyJrk";
const TALLY_API_BASE = "https://api.tally.so";
const PR_BRANCH_PREFIX = "letter/tally-";

interface TallySubmissionsPage {
	questions?: TallyQuestion[];
	submissions?: TallySubmission[];
	hasMore?: boolean;
}

interface GithubPull {
	head: { ref: string };
}

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Missing required env var: ${name}`);
	return value;
}

async function fetchAllSubmissions(
	apiKey: string,
	formId: string,
): Promise<{ questions: TallyQuestion[]; submissions: TallySubmission[] }> {
	const submissions: TallySubmission[] = [];
	let questions: TallyQuestion[] = [];
	let page = 1;

	for (;;) {
		const res = await fetch(`${TALLY_API_BASE}/forms/${formId}/submissions?page=${page}`, {
			headers: { Authorization: `Bearer ${apiKey}` },
		});
		if (!res.ok) {
			throw new Error(`Tally API request failed: ${res.status} ${res.statusText}`);
		}
		const data = (await res.json()) as TallySubmissionsPage;
		questions = data.questions ?? questions;
		submissions.push(...(data.submissions ?? []));
		if (!data.hasMore) break;
		page++;
	}

	return { questions, submissions };
}

/** Open-PR branches following `letter/tally-{id}` are in-flight dedup keys —
 * a submission already queued in an unmerged PR must not get a second PR.
 * Fails open (empty set) on any GitHub API hiccup or when running locally
 * without a token, rather than blocking ingestion entirely. */
async function fetchOpenPrTallyIds(): Promise<Set<string>> {
	const token = process.env.GITHUB_TOKEN;
	const repo = process.env.GITHUB_REPOSITORY;
	if (!token || !repo) return new Set();

	const ids = new Set<string>();
	let page = 1;

	for (;;) {
		const res = await fetch(
			`https://api.github.com/repos/${repo}/pulls?state=open&per_page=100&page=${page}`,
			{ headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } },
		);
		if (!res.ok) {
			console.error(`Warning: could not list open PRs (${res.status}), continuing without them.`);
			return ids;
		}
		const prs = (await res.json()) as GithubPull[];
		for (const pr of prs) {
			if (pr.head.ref.startsWith(PR_BRANCH_PREFIX)) {
				ids.add(pr.head.ref.slice(PR_BRANCH_PREFIX.length));
			}
		}
		if (prs.length < 100) break;
		page++;
	}

	return ids;
}

function writeGithubOutput(entries: Record<string, string>): void {
	const outputPath = process.env.GITHUB_OUTPUT;
	if (!outputPath) return;
	const lines = Object.entries(entries).map(([key, value]) => {
		if (value.includes("\n")) {
			const delimiter = `EOF_${key}_${Date.now()}`;
			return `${key}<<${delimiter}\n${value}\n${delimiter}`;
		}
		return `${key}=${value}`;
	});
	fs.appendFileSync(outputPath, `${lines.join("\n")}\n`);
}

async function commandList(): Promise<void> {
	const apiKey = requireEnv("TALLY_API_KEY");
	const formId = process.env.TALLY_FORM_ID || DEFAULT_FORM_ID;

	const [{ questions, submissions }, openPrTallyIds] = await Promise.all([
		fetchAllSubmissions(apiKey, formId),
		fetchOpenPrTallyIds(),
	]);

	const existingTallyIds = new Set(
		getAllStories()
			.map((s) => s.tallyId)
			.filter((id): id is string => Boolean(id)),
	);
	const excludeIds = new Set([...existingTallyIds, ...openPrTallyIds]);

	const unprocessed = filterUnprocessedSubmissions(submissions, excludeIds);
	const ids = unprocessed
		.map((s) => parseTallySubmission(s, questions))
		.filter((p): p is NonNullable<typeof p> => p !== null)
		.map((p) => p.tallyId);

	console.log(JSON.stringify(ids));
	writeGithubOutput({ ids: JSON.stringify(ids) });
}

async function commandWrite(tallyId: string | undefined): Promise<void> {
	if (!tallyId) throw new Error("Usage: ingest-tally.ts write <tallyId>");
	const apiKey = requireEnv("TALLY_API_KEY");
	const formId = process.env.TALLY_FORM_ID || DEFAULT_FORM_ID;

	const { questions, submissions } = await fetchAllSubmissions(apiKey, formId);
	const submission = submissions.find((s) => s.id === tallyId);
	if (!submission) throw new Error(`No Tally submission found with id ${tallyId}`);

	const parsed = parseTallySubmission(submission, questions);
	if (!parsed) throw new Error(`Submission ${tallyId} is incomplete or unconsented — skipping`);

	const stories = getAllStories();
	const draft = createLetterDraft(parsed, {
		existingSlugs: new Set(stories.map((s) => s.slug)),
		existingDates: new Set(stories.map((s) => s.date)),
	});

	const filePath = path.join(process.cwd(), "content", "stories", `${draft.slug}.mdx`);
	fs.writeFileSync(filePath, draft.mdx, "utf-8");
	console.log(`Wrote ${filePath}`);

	writeGithubOutput({
		branch: draft.branch,
		slug: draft.slug,
		title: draft.title,
		author: draft.author,
		date: draft.date,
		tallyId: draft.tallyId,
		filePath,
		body: [
			`**Persona:** ${draft.author}`,
			`**Scheduled date:** ${draft.date}`,
			"",
			"---",
			"",
			parsed.content,
		].join("\n"),
	});
}

async function main(): Promise<void> {
	const [command, arg] = process.argv.slice(2);
	if (command === "list") {
		await commandList();
	} else if (command === "write") {
		await commandWrite(arg);
	} else {
		console.error("Usage: ingest-tally.ts <list|write [tallyId]>");
		process.exitCode = 1;
	}
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exitCode = 1;
});
