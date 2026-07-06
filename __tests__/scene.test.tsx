// @vitest-environment jsdom
//
// Scope note: Scene's non-empty branch mounts PaperPlanes3D and RevealMask,
// which create real THREE.WebGLRenderer/canvas contexts on mount — jsdom has
// no WebGL support, so exercising that path would require heavily mocking
// three.js internals. This test covers only the return-state gate itself
// (the `stories.length === 0 || !todaysLetter` early return), which never
// mounts the WebGL-backed children and is safe to render as-is.
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Scene } from "@/components/scene";
import type { Story } from "@/lib/types";

const EMPTY_STATE_TEXT = /stories are on their way/i;

afterEach(() => {
	cleanup();
});

describe("Scene return-state gate", () => {
	it("shows the empty state when there are no stories", () => {
		render(<Scene todaysLetter={null} stories={[]} />);

		expect(screen.getByText(EMPTY_STATE_TEXT)).toBeInTheDocument();
	});

	it("shows the empty state when todaysLetter is null even if stories exist", () => {
		const stories = [{ slug: "a-letter" } as Story];

		render(<Scene todaysLetter={null} stories={stories} />);

		expect(screen.getByText(EMPTY_STATE_TEXT)).toBeInTheDocument();
	});
});
