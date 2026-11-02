import {
    BOOKS,
    FEATURED_SECTION_ORDER,
    assetUrl,
    escapeHtml,
    loadBookNotes,
    markdownToHtml,
    parseSections
} from "./library.js";

const status = document.querySelector("#book-status");
const view = document.querySelector("#book-view");
const cover = document.querySelector("#book-cover");
const title = document.querySelector("#book-title");
const navigation = document.querySelector("#book-nav");
const notes = document.querySelector("#book-notes");

/* Select the requested book from a human-readable, stable slug in the URL. */
const requestedSlug = new URLSearchParams(window.location.search).get("book");
const book = BOOKS.find((candidate) => candidate.slug === requestedSlug);

/* Convert section names to safe fragment identifiers for the in-page navigation. */
function sectionId(name) {
    return name.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

/* Render every Markdown section, including extra ones such as "Personajes". */
function renderSections(sections) {
    const names = [
        ...FEATURED_SECTION_ORDER.filter((name) => Object.hasOwn(sections, name)),
        ...Object.keys(sections).filter((name) => !FEATURED_SECTION_ORDER.includes(name))
    ];

    navigation.innerHTML = names.map((name) =>
        '<a href="#' + sectionId(name) + '">' + escapeHtml(name) + "</a>"
    ).join("");

    notes.innerHTML = names.map((name) => {
        const content = sections[name].trim();
        const renderedContent = content
            ? markdownToHtml(content)
            : '<p class="empty-section">Todavía no hay apuntes en esta sección.</p>';

        return [
            '<section id="', sectionId(name), '" class="book-note-section">',
            '<div class="book-note-section__heading">',
            '<span aria-hidden="true">✦</span>',
            "<h2>", escapeHtml(name), "</h2>",
            '<span aria-hidden="true">✦</span>',
            "</div>",
            '<div class="markdown-body">', renderedContent, "</div>",
            "</section>"
        ].join("");
    }).join("");
}

/* Load and reveal the chosen notebook, or replace the loader with a useful error. */
async function loadBookPage() {
    if (!book) {
        status.classList.add("book-loading--error");
        status.innerHTML = 'Ese libro no está en el estante. <a href="index.html">Volver a la biblioteca</a>.';
        return;
    }

    try {
        const markdown = await loadBookNotes(book);
        const sections = parseSections(markdown);

        document.title = book.title + " | Mis libros";
        cover.src = assetUrl(book.image);
        cover.alt = "Portada de " + book.title;
        title.textContent = book.title;
        renderSections(sections);

        status.hidden = true;
        view.hidden = false;
    } catch (error) {
        status.classList.add("book-loading--error");
        status.textContent = "No pude abrir estas notas. Comprueba que la página se sirve desde un servidor local.";
        console.error(error);
    }
}

loadBookPage();
