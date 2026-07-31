import { Redis } from "@upstash/redis";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 100;

/** Sane charset check for the dynamic `slug` segment — lowercase letters, digits,
 * single hyphens, bounded length. Rejects path-traversal-style or otherwise
 * absurd input before it ever reaches the Redis key. */
export function isValidSlug(slug: string): boolean {
	return slug.length > 0 && slug.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(slug);
}

function getRedis(): Redis | null {
	const url = process.env.UPSTASH_REDIS_REST_URL;
	const token = process.env.UPSTASH_REDIS_REST_TOKEN;
	if (!(url && token)) {
		return null;
	}
	return new Redis({ token, url });
}

interface RouteContext {
	params: Promise<{ slug: string }>;
}

const NULL_COUNT = { count: null } as const;

/** INCR `letter:{slug}` — records one read. Silent degrade: any failure
 * (invalid slug, missing env, Redis error) returns `{count: null}`, never a
 * thrown error or a non-2xx status, so the reading experience is never blocked. */
export async function POST(_request: Request, { params }: RouteContext) {
	const { slug } = await params;
	if (!isValidSlug(slug)) {
		return Response.json(NULL_COUNT);
	}

	try {
		const redis = getRedis();
		if (!redis) {
			return Response.json(NULL_COUNT);
		}
		const count = await redis.incr(`letter:${slug}`);
		return Response.json({ count });
	} catch {
		return Response.json(NULL_COUNT);
	}
}

/** Read-only equivalent of POST — fetches the current count without incrementing. */
export async function GET(_request: Request, { params }: RouteContext) {
	const { slug } = await params;
	if (!isValidSlug(slug)) {
		return Response.json(NULL_COUNT);
	}

	try {
		const redis = getRedis();
		if (!redis) {
			return Response.json(NULL_COUNT);
		}
		const count = await redis.get<number>(`letter:${slug}`);
		return Response.json({ count: count ?? null });
	} catch {
		return Response.json(NULL_COUNT);
	}
}
