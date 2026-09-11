import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

// Notes are user-submitted free-form Markdown, rendered on a public page —
// see design doc Security: "raw HTML disabled, sanitized output." Two
// layers: remarkRehype without `allowDangerousHtml` drops literal HTML
// embedded in the Markdown source entirely, and rehypeSanitize's default
// schema strips dangerous URLs/attributes from whatever AST legitimate
// Markdown syntax does produce.
const processor = unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeSanitize)
  .use(rehypeStringify);

export function renderNotesHtml(notes: string): string {
  return String(processor.processSync(notes));
}
