import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const incr = vi.fn();
const get = vi.fn();

vi.mock("@upstash/redis", () => ({
	Redis: vi.fn().mockImplementation(function MockRedis() {
		return { incr, get };
	}),
}));

async function loadRoute() {
	return import("@/app/api/letters/[slug]/route");
}

function makeParams(slug: string) {
	return { params: Promise.resolve({ slug }) };
}

describe("letters route (isValidSlug)", () => {
	it("accepts lowercase-hyphenated slugs matching real content", async () => {
		const { isValidSlug } = await loadRoute();
		expect(isValidSlug("a-letter-never-sent")).toBe(true);
		expect(isValidSlug("the-garden-in-winter")).toBe(true);
	});

	it("rejects path-traversal and unsafe input", async () => {
		const { isValidSlug } = await loadRoute();
		expect(isValidSlug("../../etc/passwd")).toBe(false);
		expect(isValidSlug("a/b")).toBe(false);
		expect(isValidSlug("")).toBe(false);
		expect(isValidSlug("UPPER")).toBe(false);
		expect(isValidSlug("has spaces")).toBe(false);
		expect(isValidSlug("a".repeat(200))).toBe(false);
	});
});

describe("letters route handlers", () => {
	beforeEach(() => {
		incr.mockReset();
		get.mockReset();
		vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
		vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	describe("POST", () => {
		it("increments and returns {count} on success", async () => {
			incr.mockResolvedValueOnce(5);
			const { POST } = await loadRoute();

			const res = await POST(new Request("http://x/api/letters/foo", { method: "POST" }), makeParams(
				"a-letter-never-sent",
			));

			expect(await res.json()).toEqual({ count: 5 });
			expect(incr).toHaveBeenCalledWith("letter:a-letter-never-sent");
		});

		it("degrades to {count: null} when Redis throws", async () => {
			incr.mockRejectedValueOnce(new Error("upstash down"));
			const { POST } = await loadRoute();

			const res = await POST(
				new Request("http://x/api/letters/foo", { method: "POST" }),
				makeParams("a-letter-never-sent"),
			);

			expect(await res.json()).toEqual({ count: null });
		});

		it("degrades to {count: null} without calling Redis for an invalid slug", async () => {
			const { POST } = await loadRoute();

			const res = await POST(
				new Request("http://x/api/letters/foo", { method: "POST" }),
				makeParams("../etc/passwd"),
			);

			expect(await res.json()).toEqual({ count: null });
			expect(incr).not.toHaveBeenCalled();
		});

		it("degrades to {count: null} when env vars are missing (no Redis attempt)", async () => {
			vi.unstubAllEnvs();
			const { POST } = await loadRoute();

			const res = await POST(
				new Request("http://x/api/letters/foo", { method: "POST" }),
				makeParams("a-letter-never-sent"),
			);

			expect(await res.json()).toEqual({ count: null });
			expect(incr).not.toHaveBeenCalled();
		});
	});

	describe("GET", () => {
		it("returns {count} from a successful read", async () => {
			get.mockResolvedValueOnce(9);
			const { GET } = await loadRoute();

			const res = await GET(
				new Request("http://x/api/letters/foo"),
				makeParams("a-letter-never-sent"),
			);

			expect(await res.json()).toEqual({ count: 9 });
			expect(get).toHaveBeenCalledWith("letter:a-letter-never-sent");
		});

		it("returns {count: null} when no reads recorded yet", async () => {
			get.mockResolvedValueOnce(null);
			const { GET } = await loadRoute();

			const res = await GET(
				new Request("http://x/api/letters/foo"),
				makeParams("a-letter-never-sent"),
			);

			expect(await res.json()).toEqual({ count: null });
		});

		it("degrades to {count: null} when Redis throws", async () => {
			get.mockRejectedValueOnce(new Error("upstash down"));
			const { GET } = await loadRoute();

			const res = await GET(
				new Request("http://x/api/letters/foo"),
				makeParams("a-letter-never-sent"),
			);

			expect(await res.json()).toEqual({ count: null });
		});
	});
});
