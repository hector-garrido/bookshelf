/*
 * This manifest explicitly pairs each cover with its Markdown file. Keeping the
 * source filenames here avoids unreliable filename guessing, especially because
 * one annotation filename stores its accented "é" as two Unicode characters.
 */
export const BOOKS = [
    {
        slug: "dioses-y-heroes-de-la-antigua-grecia",
        title: "Dioses y héroes de la antigua Grecia",
        image: "data/images/Dioses y héroes de la antigua Grecia.jpg",
        summary: "data/summaries/Dioses y héroes de la antigua Grecia.md"
    },
    {
        slug: "don-quijote-de-la-mancha",
        title: "El ingenioso hidalgo Don Quijote de la Mancha",
        image: "data/images/El ingenioso hidalgo Don Quijote de la Mancha.jpg",
        summary: "data/summaries/El ingenioso hidalgo Don Quijote de la Mancha.md"
    },
    {
        slug: "eva-luna",
        title: "Eva Luna",
        image: "data/images/Eva Luna.jpg",
        summary: "data/summaries/Eva Luna.md"
    },
    {
        slug: "historia-minima-de-rusia",
        title: "Historia min de Rusia",
        image: "data/images/Historia min de Rusia.jpg",
        summary: "data/summaries/Historia min de Rusia.md"
    },
    {
        slug: "sobre-heroes-y-tumbas",
        title: "Sobre héroes y tumbas",
        image: "data/images/Sobre heroes y tumbas.png",
        summary: "data/summaries/Sobre heroes y tumbas.md"
    }
];

export const FEATURED_SECTION_ORDER = ["Contenido", "Citas", "Reflexiones"];

/* The home feed intentionally surfaces only the more personal reading notes. */
export const HOMEPAGE_SECTION_ORDER = ["Citas", "Reflexiones"];

/* Encode every path segment so spaces and accented characters remain valid URLs. */
export function assetUrl(path) {
    return path.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

/* Every cover and sampled note uses the same stable destination for a book. */
export function bookUrl(book) {
    return "book.html?book=" + encodeURIComponent(book.slug);
}

/*
 * Parse top-level Markdown headings into named sections. Subheadings remain in
 * their parent section, which preserves reflection titles such as "Serendipia".
 */
export function parseSections(markdown) {
    const sections = {};
    let currentSection = null;

    markdown.replace(/\r\n?/g, "\n").split("\n").forEach((line) => {
        const heading = line.match(/^#\s+(.+?)\s*$/);

        if (heading) {
            currentSection = heading[1].trim();
            sections[currentSection] = [];
            return;
        }

        if (currentSection) {
            sections[currentSection].push(line);
        }
    });

    return Object.fromEntries(
        Object.entries(sections).map(([name, lines]) => [name, lines.join("\n").trim()])
    );
}

/* Remove lightweight Markdown syntax only for the compact homepage previews. */
function previewText(text) {
    return text
        .replace(/^#{2,6}\s+/gm, "")
        .replace(/^\s*(?:[-*]|\d+\.)\s+/gm, "")
        .replace(/\[\[([^\]]+)\]\]/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/[_*`]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

/*
 * Convert a section into individual homepage candidates. Blank lines separate
 * quotes, but each level-two heading separates a complete reflection. For
 * Contenido, each list item is a candidate so outlines stay easy to scan.
 */
export function extractAnnotations(sectionName, markdown) {
    if (!markdown.trim()) {
        return [];
    }

    let candidates;

    if (sectionName === "Contenido") {
        candidates = markdown
            .split("\n")
            .filter((line) => /^(?:\s*[-*]|\s*\d+\.)\s+/.test(line) || (/\S/.test(line) && !/^#{2,6}\s/.test(line)));
    } else if (sectionName === "Reflexiones") {
        /*
         * A reflection begins at every ## heading inside # Reflexiones. Splitting
         * before that heading keeps all of its following paragraphs together until
         * the next subsection. The heading is changed to plain text so its title
         * appears at the beginning of the compact homepage preview.
         */
        candidates = markdown
            .split(/(?=^##\s+)/m)
            .filter((candidate) => /^##\s+/.test(candidate))
            .map((candidate) => candidate.replace(/^##\s+(.+?)\s*$/m, "$1"));
    } else {
        candidates = markdown.split(/\n\s*\n+/);
    }

    return candidates
        .map(previewText)
        .filter((text) => text.length >= 8 && !text.startsWith("```"));
}

/* Escape source text before creating HTML so personal notes cannot inject markup. */
export function escapeHtml(text) {
    return text.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;"
    })[character]);
}

/* Apply a deliberately small set of inline Markdown features after escaping. */
function inlineMarkdown(text) {
    return escapeHtml(text)
        .replace(/\[\[([^\]]+)\]\]/g, "$1")
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/__([^_]+)__/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        .replace(/_([^_]+)_/g, "<em>$1</em>");
}

/*
 * Render the note files without a third-party dependency. The converter supports
 * the structures used in this repository: headings, paragraphs, indented list
 * lines and fenced code. List indentation is retained as a visual hierarchy.
 */
export function markdownToHtml(markdown) {
    const output = [];
    let paragraph = [];
    let listLines = [];
    let codeLines = [];
    let inCodeBlock = false;

    const flushParagraph = () => {
        if (paragraph.length) {
            output.push("<p>" + paragraph.map((line) => inlineMarkdown(line.trim())).join("<br>") + "</p>");
            paragraph = [];
        }
    };

    const flushList = () => {
        if (listLines.length) {
            const items = listLines.map(({ indent, marker, text }) => {
                const safeIndent = Math.min(Math.floor(indent / 2), 4);
                return '<li style="--note-indent: ' + safeIndent + '"><span class="note-marker">' + escapeHtml(marker) + "</span><span>" + inlineMarkdown(text) + "</span></li>";
            }).join("");
            output.push('<ul class="markdown-list">' + items + "</ul>");
            listLines = [];
        }
    };

    markdown.replace(/\r\n?/g, "\n").split("\n").forEach((line) => {
        if (/^```/.test(line)) {
            flushParagraph();
            flushList();

            if (inCodeBlock) {
                output.push("<pre><code>" + escapeHtml(codeLines.join("\n")) + "</code></pre>");
                codeLines = [];
            }

            inCodeBlock = !inCodeBlock;
            return;
        }

        if (inCodeBlock) {
            codeLines.push(line);
            return;
        }

        const heading = line.match(/^(#{1,6})\s+(.+?)\s*$/);
        const listItem = line.match(/^(\s*)([-*]|\d+\.)\s+(.+)$/);

        if (heading) {
            flushParagraph();
            flushList();
            const level = Math.min(heading[1].length + 1, 6);
            output.push("<h" + level + ">" + inlineMarkdown(heading[2]) + "</h" + level + ">");
        } else if (listItem) {
            flushParagraph();
            listLines.push({ indent: listItem[1].replace(/\t/g, "    ").length, marker: listItem[2], text: listItem[3] });
        } else if (!line.trim()) {
            flushParagraph();
            flushList();
        } else if (!/^\[\[[^\]]+\]\]$/.test(line.trim())) {
            flushList();
            paragraph.push(line);
        }
    });

    flushParagraph();
    flushList();

    if (inCodeBlock && codeLines.length) {
        output.push("<pre><code>" + escapeHtml(codeLines.join("\n")) + "</code></pre>");
    }

    return output.join("");
}

/* Load one book's notes and fail clearly if its source file cannot be read. */
export async function loadBookNotes(book) {
    const response = await fetch(assetUrl(book.summary));

    if (!response.ok) {
        throw new Error("No se pudieron cargar las notas de " + book.title + ".");
    }

    return response.text();
}
