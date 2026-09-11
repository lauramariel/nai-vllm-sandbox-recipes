import { describe, expect, it } from "vitest";
import { renderNotesHtml } from "./render-notes";

describe("renderNotesHtml", () => {
  it("renders ordinary Markdown", () => {
    const html = renderNotesHtml("**bold** and a [link](https://example.com).");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain('<a href="https://example.com">link</a>');
  });

  it("renders code blocks", () => {
    const html = renderNotesHtml("```\n--dtype bfloat16\n```");
    expect(html).toContain("<pre>");
    expect(html).toContain("--dtype bfloat16");
  });

  it("drops raw HTML embedded in the Markdown source", () => {
    const html = renderNotesHtml('Some notes.\n\n<script>alert("xss")</script>\n\nMore notes.');
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("alert(");
  });

  it("strips a javascript: URL from a link", () => {
    const html = renderNotesHtml("[click me](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
  });

  it("drops an inline event handler attribute even if written as literal HTML", () => {
    const html = renderNotesHtml('<img src="x" onerror="alert(1)">');
    expect(html).not.toContain("onerror");
  });
});
