import { describe, expect, it } from "vitest";
import { escapeHtml, renderParagraphHtml } from "@/components/story-content";

describe("escapeHtml", () => {
	it("escapes angle brackets", () => {
		expect(escapeHtml("<img src=x onerror=alert(1)>")).toBe("&lt;img src=x onerror=alert(1)&gt;");
	});

	it("escapes ampersands and quotes without double-escaping", () => {
		expect(escapeHtml(`Tom & Jerry said "hi" to O'Malley`)).toBe(
			"Tom &amp; Jerry said &quot;hi&quot; to O&#39;Malley",
		);
	});

	it("leaves plain text untouched", () => {
		expect(escapeHtml("Dear whoever finds this,")).toBe("Dear whoever finds this,");
	});
});

describe("renderParagraphHtml", () => {
	it("renders an onerror image payload as escaped text, not markup", () => {
		const html = renderParagraphHtml("<img src=x onerror=alert(1)>");
		expect(html).toBe("&lt;img src=x onerror=alert(1)&gt;");
		expect(html).not.toContain("<img");
	});

	it("neutralizes a raw <script> tag", () => {
		const html = renderParagraphHtml("<script>alert(1)</script>");
		expect(html).not.toContain("<script>");
		expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
	});

	it("still renders **bold** as <strong>", () => {
		expect(renderParagraphHtml("hello **world**")).toBe("hello <strong>world</strong>");
	});

	it("still renders *italic* as <em>", () => {
		expect(renderParagraphHtml("hello *world*")).toBe("hello <em>world</em>");
	});

	it("displays ampersands and quotes correctly with no double-escaping", () => {
		const html = renderParagraphHtml(`Tom & Jerry said "hi"`);
		expect(html).toBe("Tom &amp; Jerry said &quot;hi&quot;");
	});

	it("escapes HTML that surrounds legitimate bold markdown", () => {
		const html = renderParagraphHtml("<b>fake</b> but **real** bold");
		expect(html).toBe("&lt;b&gt;fake&lt;/b&gt; but <strong>real</strong> bold");
	});
});
