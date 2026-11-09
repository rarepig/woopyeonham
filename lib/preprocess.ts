// PRD 5장 전처리: HTML → 텍스트, 인용문·서명 제거, 본문 1,500자 절단.
const BODY_LIMIT = 1500;

export function preprocess(raw: string): string {
  let text = raw;
  // HTML 제거
  text = text
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  // 인용문(회신 스레드) 제거
  text = text
    .split("\n")
    .filter((line) => !line.trim().startsWith(">"))
    .join("\n");
  const quoteIdx = text.search(/On .{5,80} wrote:|-----Original Message-----|보낸 사람:/);
  if (quoteIdx > 200) text = text.slice(0, quoteIdx);
  // 서명 제거
  const sigIdx = text.indexOf("\n-- \n");
  if (sigIdx > 0) text = text.slice(0, sigIdx);
  // 공백 정리 + 절단
  text = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return text.slice(0, BODY_LIMIT);
}
