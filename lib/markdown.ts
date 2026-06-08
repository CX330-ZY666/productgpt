export function normalizeMarkdownTables(markdown: string): string {
  return markdown
    .replace(/<br\s*\/?>/gi, "<br>")
    .split(/\r?\n/)
    .map((line) => normalizeCompressedTableLine(line))
    .join("\n");
}

function normalizeCompressedTableLine(line: string): string {
  const trimmed = line.trim();

  if (!looksLikeCompressedTable(trimmed)) {
    return line;
  }

  const cells = trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);

  const separatorIndex = cells.findIndex((cell) => /^:?-{3,}:?$/.test(cell));

  if (separatorIndex <= 0) {
    return line;
  }

  const columnCount = separatorIndex;

  if (cells.length < columnCount * 2 || cells.length % columnCount !== 0) {
    return line;
  }

  const rows: string[] = [];

  for (let index = 0; index < cells.length; index += columnCount) {
    rows.push(`| ${cells.slice(index, index + columnCount).join(" |")} |`);
  }

  return `\n${rows.join("\n")}\n`;
}

function looksLikeCompressedTable(line: string): boolean {
  if (!line.startsWith("|") || !line.endsWith("|")) {
    return false;
  }

  const pipeCount = (line.match(/\|/g) ?? []).length;

  return pipeCount >= 10 && /\|\s*:?-{3,}:?\s*\|/.test(line);
}
