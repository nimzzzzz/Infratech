import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SearchBar } from "@/components/browse/search-bar";

/**
 * Mock next/navigation so we can drive the URL surface synchronously
 * and observe router.push calls. usePathname / useSearchParams are
 * read on every render — flipping currentSearch + re-rendering
 * simulates an external URL change (clear-all chip, browser back).
 */
const pushSpy = vi.fn();
let currentSearch = new URLSearchParams();
let currentPathname = "/browse";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushSpy, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => currentPathname,
  useSearchParams: () => currentSearch,
}));

beforeEach(() => {
  pushSpy.mockClear();
  currentSearch = new URLSearchParams();
  currentPathname = "/browse";
  vi.useRealTimers();
});

const getInput = () =>
  screen.getByLabelText("Search the directory") as HTMLInputElement;

describe("SearchBar", () => {
  it("renders with the q from the URL on first paint", () => {
    currentSearch = new URLSearchParams("q=foo");
    render(<SearchBar />);
    expect(getInput().value).toBe("foo");
  });

  it("updates the input immediately on typing (controlled)", () => {
    render(<SearchBar />);
    const input = getInput();
    fireEvent.change(input, { target: { value: "abc" } });
    expect(input.value).toBe("abc");
  });

  it("debounces router.push — fires once 350ms after the last keystroke", () => {
    vi.useFakeTimers();
    render(<SearchBar />);
    const input = getInput();

    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "ab" } });
    fireEvent.change(input, { target: { value: "abc" } });
    expect(pushSpy).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(349);
    });
    expect(pushSpy).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy.mock.calls[0][0]).toContain("q=abc");
  });

  it("does NOT push when the value matches the current URL q (no spurious push)", () => {
    vi.useFakeTimers();
    currentSearch = new URLSearchParams("q=foo");
    render(<SearchBar />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it("URL echo of our own push doesn't reset local typing in flight", () => {
    vi.useFakeTimers();
    const { rerender } = render(<SearchBar />);
    const input = getInput();

    // Type, debounce fires, push happens.
    fireEvent.change(input, { target: { value: "foo" } });
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(pushSpy).toHaveBeenCalledTimes(1);

    // The URL now echoes back the value we just pushed.
    currentSearch = new URLSearchParams("q=foo");
    rerender(<SearchBar />);

    // Local stays at "foo" — no overwrite, no extra push.
    expect(input.value).toBe("foo");

    // Now keep typing — local should win, debounced push fires once.
    fireEvent.change(input, { target: { value: "foob" } });
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(pushSpy).toHaveBeenCalledTimes(2);
    expect(pushSpy.mock.calls[1][0]).toContain("q=foob");
  });

  it("EXTERNAL URL change (clear-all, back button) DOES reset the input", () => {
    const { rerender } = render(<SearchBar />);
    expect(getInput().value).toBe("");

    // Simulate a deep link / browser back arriving with q=external.
    currentSearch = new URLSearchParams("q=external");
    rerender(<SearchBar />);

    expect(getInput().value).toBe("external");
  });

  it("composition events suppress the debounced push until composition ends", () => {
    vi.useFakeTimers();
    render(<SearchBar />);
    const input = getInput();

    // IME composition begins — keystrokes during composition shouldn't push.
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "に" } });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(pushSpy).not.toHaveBeenCalled();

    // Composition end fires with the final composed value.
    fireEvent.compositionEnd(input, {
      currentTarget: { value: "日本" },
      target: { value: "日本" },
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(pushSpy).toHaveBeenCalledTimes(1);
  });
});
