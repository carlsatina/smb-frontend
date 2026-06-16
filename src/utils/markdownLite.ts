// Minimal, safe Markdown renderer for AI-generated text. It escapes ALL HTML
// first, then applies a tiny whitelist (bold, inline code, bullets, headings),
// so model output can never inject markup — the only tags present are the ones
// we emit. Not a general Markdown engine; just enough for short summaries.

const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const inline = (text: string): string =>
    text
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');

export const renderMarkdownLite = (markdown: string): string => {
    const lines = escapeHtml(markdown).split(/\r?\n/);
    const out: string[] = [];
    let inList = false;

    const closeList = () => {
        if (inList) {
            out.push('</ul>');
            inList = false;
        }
    };

    for (const raw of lines) {
        const line = raw.trim();
        if (!line) {
            closeList();
            continue;
        }

        const bullet = line.match(/^[-*]\s+(.*)$/);
        const heading = line.match(/^#{1,6}\s+(.*)$/);

        if (bullet) {
            if (!inList) {
                out.push('<ul>');
                inList = true;
            }
            out.push(`<li>${inline(bullet[1])}</li>`);
        } else if (heading) {
            closeList();
            out.push(`<p class="md-heading"><strong>${inline(heading[1])}</strong></p>`);
        } else {
            closeList();
            out.push(`<p>${inline(line)}</p>`);
        }
    }

    closeList();
    return out.join('');
};
