import {
    BOOKS,
    HOMEPAGE_SECTION_ORDER,
    assetUrl,
    bookUrl,
    escapeHtml,
    extractAnnotations,
    loadBookNotes,
    parseSections
} from "./library.js";

const shelf = document.querySelector("#book-shelf");
const status = document.querySelector("#notes-status");
const noteSections = document.querySelector("#note-sections");
const shuffleButton = document.querySelector("#shuffle-button");
let notePool = {};

/* Render every cover as a real link before the slower Markdown requests begin. */
function renderShelf() {
    shelf.innerHTML = BOOKS.map((book) => [
        '<a class="shelf-book" href="', bookUrl(book), '" aria-label="Abrir ', escapeHtml(book.title), '">',
        '<span class="shelf-book__cover">',
        '<img src="', assetUrl(book.image), '" alt="Portada de ', escapeHtml(book.title), '">',
        "</span>",
        '<span class="shelf-book__title">', escapeHtml(book.title), "</span>",
        "</a>"
    ].join("")).join("");
}

/* Fisher–Yates creates an unbiased copy, leaving the reusable source pool intact. */
function shuffled(items) {
    const copy = [...items];

    for (let index = copy.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
    }

    return copy;
}

/*
 * Each category independently chooses either two or three cards. Math.random()
 * runs again on every load (and every button press), so the amount and the notes
 * themselves change. Math.min gracefully handles categories with fewer entries.
 */
function randomSample(items) {
    const requestedAmount = Math.random() < 0.5 ? 2 : 3;
    return shuffled(items).slice(0, Math.min(requestedAmount, items.length));
}

/* Keep long notebook passages readable on the homepage while preserving the source. */
function shortened(text, maximumLength = 310) {
    if (text.length <= maximumLength) {
        return text;
    }

    const clipped = text.slice(0, maximumLength);
    const lastSpace = clipped.lastIndexOf(" ");
    return clipped.slice(0, lastSpace > 200 ? lastSpace : maximumLength).trim() + "…";
}

/* Build one paper-like card with its source cover, title and full-book destination. */
function noteCard(annotation, sectionName) {
    const quoteMarks = sectionName === "Citas" ? '<span class="quote-mark" aria-hidden="true">“</span>' : "";

    return [
        '<article class="note-card note-card--', sectionName.toLowerCase(), '">',
        '<a class="note-card__cover" href="', bookUrl(annotation.book), '" tabindex="-1" aria-hidden="true">',
        '<img src="', assetUrl(annotation.book.image), '" alt="">',
        "</a>",
        '<div class="note-card__body">',
        quoteMarks,
        "<p>", escapeHtml(shortened(annotation.text)), "</p>",
        '<a class="note-card__source" href="', bookUrl(annotation.book), '">',
        escapeHtml(annotation.book.title), ' <span aria-hidden="true">›</span>',
        "</a>",
        "</div>",
        "</article>"
    ].join("");
}

/* Draw only quotes and reflections in the homepage's streamlined reading feed. */
function renderRandomNotes() {
    noteSections.innerHTML = HOMEPAGE_SECTION_ORDER.map((sectionName) => {
        const sample = randomSample(notePool[sectionName] || []);
        const cards = sample.length
            ? sample.map((annotation) => noteCard(annotation, sectionName)).join("")
            : '<p class="empty-section">Todavía no hay apuntes en esta sección.</p>';

        return [
            '<section class="note-group" aria-labelledby="', sectionName.toLowerCase(), '-title">',
            '<div class="note-group__heading">',
            '<span class="note-group__rule" aria-hidden="true"></span>',
            '<h3 id="', sectionName.toLowerCase(), '-title">', sectionName, "</h3>",
            '<span class="note-group__rule" aria-hidden="true"></span>',
            "</div>",
            '<div class="note-grid">', cards, "</div>",
            "</section>"
        ].join("");
    }).join("");

    status.hidden = true;
    noteSections.hidden = false;
}

/* Fetch all notebooks in parallel, then label every extracted note with its book. */
async function prepareNotes() {
    try {
        const loadedBooks = await Promise.all(BOOKS.map(async (book) => ({
            book,
            sections: parseSections(await loadBookNotes(book))
        })));

        /* Build a pool only for homepage sections; Contenido remains on book pages. */
        notePool = Object.fromEntries(HOMEPAGE_SECTION_ORDER.map((sectionName) => {
            const annotations = loadedBooks.flatMap(({ book, sections }) =>
                extractAnnotations(sectionName, sections[sectionName] || "")
                    .map((text) => ({ text, book }))
            );
            return [sectionName, annotations];
        }));

        renderRandomNotes();
    } catch (error) {
        status.classList.add("loading-note--error");
        status.textContent = "No pude abrir las notas. Sirve esta carpeta con un servidor local para permitir la lectura de los archivos Markdown.";
        shuffleButton.disabled = true;
        console.error(error);
    }
}

/* The button repeats the same random selection without re-fetching any file. */
shuffleButton.addEventListener("click", () => {
    renderRandomNotes();
    shuffleButton.classList.remove("is-shuffling");
    window.requestAnimationFrame(() => shuffleButton.classList.add("is-shuffling"));
});

renderShelf();
prepareNotes();
