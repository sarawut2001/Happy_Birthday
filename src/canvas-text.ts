const words = new Intl.Segmenter('th', { granularity: 'word' });
const graphemes = new Intl.Segmenter('th', { granularity: 'grapheme' });

/** Wrap Thai at word boundaries, splitting only words wider than the surface. */
export function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = '';
  const append = (part: string) => {
    if (line && ctx.measureText(line + part).width > width) {
      lines.push(line.trimEnd());
      line = part.trimStart();
    } else line += part;
  };
  for (const { segment } of words.segment(text)) {
    if (ctx.measureText(segment).width <= width) append(segment);
    else for (const { segment: part } of graphemes.segment(segment)) append(part);
  }
  if (line) lines.push(line.trimEnd());
  return lines;
}

export function fitCanvasText(ctx: CanvasRenderingContext2D, text: string, options: {
  width: number; fontSize: number; minFontSize: number; maxLines: number; weight?: number;
}) {
  let size = options.fontSize;
  while (true) {
    ctx.font = `${options.weight ?? 500} ${size}px "Noto Sans Thai", sans-serif`;
    const lines = wrapCanvasText(ctx, text, options.width);
    if (lines.length <= options.maxLines || size <= options.minFontSize) return { lines, size };
    size = Math.max(options.minFontSize, size - 2);
  }
}
