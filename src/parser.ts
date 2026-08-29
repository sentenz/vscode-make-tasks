import type { ParsedTarget } from './model';

const TARGET_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const RULE = /^([A-Za-z0-9][A-Za-z0-9_.-]*(?:[ \t]+[A-Za-z0-9][A-Za-z0-9_.-]*)*)[ \t]*::?(?![=])(.*)$/;
const USAGE_COMMENT = /^[ \t]*#[ \t]+Usage:[ \t]+make[ \t]+([A-Za-z0-9][A-Za-z0-9_.-]*)(?:[ \t]+(.*?))?[ \t]*$/i;
const COMMENT_SPACER = /^[ \t]*#[ \t]*$/;
const CATEGORY_HEADER = /^[ \t]*#[ \t]+([\p{P}\p{S}])\1{2,}[ \t]+(.+?)(?:[ \t]+\1+)?[ \t]*$/u;

/**
 * Parses concrete Makefile rules documented by either:
 *
 *   ## Build the application
 *   build:
 *
 * or:
 *
 *   build: ## Build the application
 *
 * Optional usage metadata can precede the documentation block:
 *
 *   # Usage: make deploy ENV=production <artifact>
 *   #
 *   ## Deploy an artifact
 *   deploy:
 *
 * Categories can be declared with section comments matching:
 *
 *   # ─── Build ───────────────────────────────────────────────
 *   build: ## Build the application
 *
 * The section header consists of a Makefile comment marker, whitespace, at
 * least three copies of one Unicode punctuation or symbol character,
 * whitespace, the category name, and an optional trailing run of the same
 * character.
 *
 * Pattern rules, variable assignments, recipes, and undocumented helper rules
 * are deliberately excluded.
 */
export function parseMakefile(content: string): ParsedTarget[] {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const targets: ParsedTarget[] = [];
  const seen = new Set<string>();
  let pendingDescription: string[] = [];
  let pendingUsage: { target: string; arguments: string } | undefined;
  let currentCategory: string | undefined;

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    const line = lines[lineNumber] ?? '';

    // A tab starts a recipe in conventional Make syntax; never interpret recipe
    // content as metadata or as another target.
    if (line.startsWith('\t')) {
      pendingDescription = [];
      pendingUsage = undefined;
      continue;
    }

    const usageComment = line.match(USAGE_COMMENT);
    if (usageComment) {
      pendingUsage = {
        target: usageComment[1] ?? '',
        arguments: usageComment[2]?.trim() ?? '',
      };
      pendingDescription = [];
      continue;
    }

    // A conventional `#` spacer is allowed between Usage and `##` metadata.
    if (pendingUsage && COMMENT_SPACER.test(line)) {
      continue;
    }

    const categoryHeader = line.match(CATEGORY_HEADER);
    if (categoryHeader) {
      currentCategory = categoryHeader[2]?.trim();
      pendingDescription = [];
      pendingUsage = undefined;
      continue;
    }

    const documentedComment = line.match(/^[ ]*##[ ]?(.*)$/);
    if (documentedComment) {
      const text = documentedComment[1]?.trim() ?? '';
      if (text.length > 0) {
        pendingDescription.push(text);
      }
      continue;
    }

    const rule = line.match(RULE);
    if (rule) {
      const names = (rule[1] ?? '').trim().split(/[ \t]+/);
      const remainder = rule[2] ?? '';
      const inlineDescription = remainder.match(/(?:^|[ \t])##[ \t]*(.+?)[ \t]*$/)?.[1]?.trim();
      const description = inlineDescription || pendingDescription.join(' ').trim();

      if (description.length > 0) {
        for (const name of names) {
          if (!TARGET_NAME.test(name) || seen.has(name)) {
            continue;
          }
          seen.add(name);
          const usage = pendingUsage?.target === name ? pendingUsage.arguments : undefined;
          targets.push({
            name,
            description,
            ...(usage ? { usage } : {}),
            ...(currentCategory ? { category: currentCategory } : {}),
            line: lineNumber,
          });
        }
      }

      pendingDescription = [];
      pendingUsage = undefined;
      continue;
    }

    // Documentation and usage metadata apply only to the immediately following
    // rule. Any other Makefile construct invalidates those pending annotations.
    // Categories remain active until another category header replaces them.
    pendingDescription = [];
    pendingUsage = undefined;
  }

  return targets;
}

/** Split a command-line fragment without invoking a shell. */
export function splitArguments(input: string): string[] {
  const result: string[] = [];
  let token = '';
  let tokenStarted = false;
  let quote: 'single' | 'double' | undefined;
  let escaping = false;

  const push = (): void => {
    if (tokenStarted) {
      result.push(token);
      token = '';
      tokenStarted = false;
    }
  };

  for (const character of input) {
    if (escaping) {
      token += character;
      tokenStarted = true;
      escaping = false;
      continue;
    }

    if (character === '\\' && quote !== 'single') {
      tokenStarted = true;
      escaping = true;
      continue;
    }

    if (character === "'" && quote !== 'double') {
      tokenStarted = true;
      quote = quote === 'single' ? undefined : 'single';
      continue;
    }

    if (character === '"' && quote !== 'single') {
      tokenStarted = true;
      quote = quote === 'double' ? undefined : 'double';
      continue;
    }

    if (/\s/.test(character) && quote === undefined) {
      push();
      continue;
    }

    token += character;
    tokenStarted = true;
  }

  if (escaping) {
    token += '\\';
  }
  if (quote !== undefined) {
    throw new Error('Unterminated quoted argument.');
  }

  push();
  return result;
}

