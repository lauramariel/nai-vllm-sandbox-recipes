import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SubmitForm } from "./SubmitForm";

describe("SubmitForm", () => {
  it("submit is disabled until required fields make the payload valid", async () => {
    const user = userEvent.setup();
    render(<SubmitForm login="laura-m" />);

    expect(screen.getByRole("button", { name: /submit recipe/i })).toBeDisabled();

    await user.type(screen.getByLabelText(/^model/i), "org/name");
    await user.type(screen.getByLabelText(/nai version/i), "2.8");
    await user.type(screen.getByLabelText(/gpu model/i), "H100-80GB");
    await user.type(screen.getByLabelText(/gpu count/i), "4");
    // engine_source defaults to "nai", which requires neither engine_tag
    // nor engine_image_url, so the payload should now be valid.

    expect(screen.getByRole("button", { name: /submit recipe/i })).toBeEnabled();
  });

  it("engine-source switch reveals/hides engine_tag and engine_image_url", async () => {
    const user = userEvent.setup();
    render(<SubmitForm login="laura-m" />);

    expect(screen.queryByLabelText(/engine tag/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/engine image url/i)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/engine source/i), "community-vllm-registry");
    expect(screen.getByLabelText(/engine tag/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/engine image url/i)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/engine source/i), "other-registry");
    expect(screen.queryByLabelText(/engine tag/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/engine image url/i)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/engine source/i), "nai");
    expect(screen.queryByLabelText(/engine tag/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/engine image url/i)).not.toBeInTheDocument();
  });

  it("advanced NAI settings are disabled unless engine_source is nai", async () => {
    const user = userEvent.setup();
    render(<SubmitForm login="laura-m" />);

    const fieldset = screen.getByRole("group", { name: /advanced nai settings/i });
    expect(fieldset).toBeEnabled();

    await user.selectOptions(screen.getByLabelText(/engine source/i), "community-vllm-registry");
    expect(fieldset).toBeDisabled();

    await user.selectOptions(screen.getByLabelText(/engine source/i), "other-registry");
    expect(fieldset).toBeDisabled();

    await user.selectOptions(screen.getByLabelText(/engine source/i), "nai");
    expect(fieldset).toBeEnabled();
  });
});
