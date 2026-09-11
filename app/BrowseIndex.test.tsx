import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { BrowseIndex } from "./BrowseIndex";
import type { RecipeIndexEntry } from "@/lib/recipes";

const recipes: RecipeIndexEntry[] = [
  {
    slug: "llama",
    model: "meta-llama/Llama-3.3-70B-Instruct",
    title: "Llama 3.3 70B",
    engine_source: "nai",
    gpu_model: "H100-80GB",
    gpu_count: 4,
    node_allocation: "single",
    kv_cache_aware_routing: true,
    uses_speculative_decoding: true,
    uses_kv_offloading: false,
    submitted_by: "laura-m",
    submitted_at: "2026-09-10",
  },
  {
    slug: "qwen",
    model: "Qwen/Qwen2.5-32B-Instruct",
    title: "Qwen2.5 32B",
    engine_source: "community-vllm-registry",
    gpu_model: "A100-80GB",
    gpu_count: 2,
    node_allocation: "single",
    kv_cache_aware_routing: false,
    uses_speculative_decoding: false,
    uses_kv_offloading: false,
    submitted_by: "someone-else",
    submitted_at: "2026-08-22",
  },
];

describe("BrowseIndex", () => {
  it("filters by search text, and Reset filters clears it", async () => {
    const user = userEvent.setup();
    render(<BrowseIndex recipes={recipes} />);

    expect(screen.getByText("Llama 3.3 70B")).toBeInTheDocument();
    expect(screen.getByText("Qwen2.5 32B")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/search recipes/i), "qwen");
    expect(screen.queryByText("Llama 3.3 70B")).not.toBeInTheDocument();
    expect(screen.getByText("Qwen2.5 32B")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reset filters/i }));
    expect(screen.getByText("Llama 3.3 70B")).toBeInTheDocument();
    expect(screen.getByText("Qwen2.5 32B")).toBeInTheDocument();
  });

  it("Reset filters is disabled when no filters are active", async () => {
    const user = userEvent.setup();
    render(<BrowseIndex recipes={recipes} />);

    expect(screen.getByRole("button", { name: /reset filters/i })).toBeDisabled();

    await user.type(screen.getByLabelText(/search recipes/i), "qwen");
    expect(screen.getByRole("button", { name: /reset filters/i })).toBeEnabled();
  });

  it("shows an empty state with a reset link when filters match nothing", async () => {
    const user = userEvent.setup();
    render(<BrowseIndex recipes={recipes} />);

    await user.type(screen.getByLabelText(/search recipes/i), "nonexistent-model-xyz");
    expect(screen.getByText(/no recipes match your filters/i)).toBeInTheDocument();

    // Both the toolbar button and the inline empty-state link share the
    // "Reset filters" accessible name at this point; either clears state.
    const resetButtons = screen.getAllByRole("button", { name: /reset filters/i });
    await user.click(resetButtons[resetButtons.length - 1]);
    expect(screen.getByText("Llama 3.3 70B")).toBeInTheDocument();
  });
});
