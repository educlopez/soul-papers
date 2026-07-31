// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ConsequenceNudge } from "@/components/consequence-nudge";

vi.mock("gsap", () => ({
	gsap: {
		fromTo: vi.fn(),
		set: vi.fn(),
	},
}));

// jsdom doesn't implement matchMedia — the component reads it to respect
// prefers-reduced-motion before triggering gsap animations.
beforeAll(() => {
	Object.defineProperty(window, "matchMedia", {
		value: vi.fn().mockImplementation((query: string) => ({
			addEventListener: vi.fn(),
			addListener: vi.fn(),
			dispatchEvent: vi.fn(),
			matches: false,
			media: query,
			onchange: null,
			removeEventListener: vi.fn(),
			removeListener: vi.fn(),
		})),
		writable: true,
	});
});

afterEach(() => {
	cleanup();
});

describe("ConsequenceNudge", () => {
	it("renders the nudge line from story.nudge override when present", () => {
		render(<ConsequenceNudge story={{ nudge: "A custom nudge just for this letter." }} />);

		expect(screen.getByText("A custom nudge just for this letter.")).toBeInTheDocument();
	});

	it("renders a pool nudge when no override is present", () => {
		render(<ConsequenceNudge story={{}} />);

		const card = screen.getByText("Leave your letter").closest("div");
		expect(card?.textContent).toMatch(/[a-zA-Z]/);
	});

	it.each([
		["null", null],
		["undefined", undefined],
		["0", 0],
		["2", 2],
	])("counter line is absent when count is %s (below threshold)", (_label, count) => {
		render(<ConsequenceNudge story={{}} count={count} />);

		expect(screen.queryByText(/has kept/)).not.toBeInTheDocument();
	});

	it('renders "this letter has kept 5 people company" when count=5', () => {
		render(<ConsequenceNudge story={{}} count={5} />);

		expect(screen.getByText("this letter has kept 5 people company")).toBeInTheDocument();
	});

	it('"Leave your letter" link points to the Tally URL and opens safely in a new tab', () => {
		render(<ConsequenceNudge story={{}} />);

		const link = screen.getByRole("link", { name: "Leave your letter" });
		expect(link).toHaveAttribute("href", expect.stringContaining("tally.so"));
		expect(link).toHaveAttribute("target", "_blank");
		expect(link.getAttribute("rel")).toContain("noopener");
	});

	it('archive link ("Or read one from days past") points to /archive', () => {
		render(<ConsequenceNudge story={{}} />);

		const link = screen.getByRole("link", { name: "Or read one from days past" });
		expect(link).toHaveAttribute("href", "/archive");
	});
});
