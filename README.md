bookshelf
----
A space I built for my books.

## Prompts

### Initial prompt

I want to build a web page for my books, and the annotations I write of them.
Normally, when I read a book I write 3 kinds of info: 1) Contenido: A bullet point summary of the chapters, 2) Citas: Quotes that I liked, 3) Reflexiones: Long reflections about the book.

I want the web page to follow the aesthetic of the old iphone ibooks skeumorphic vibe and design.
Use the screenshot that I share here as guidance to build the main page of the site.

You can find the images for the books in the folder data/images.
Each of the images in the images folder is a book. The file name is the name of the book.

You can find the annotations for the books in the folder data/summaries.
Each of the files in the annotations folder is about a book. The file name is the name of the book. Each file has the sections of the 3 kinds of info I shared.

In the main site, you should take 2-3 annotations of each kind randomly and display them there. Each time I load the page, it should take a different sample. Make the relevant comments in the code to explain how you do this random assignment. The extraction and random assignment should be done either in a python script or in some of the already used files for the web page.

All of the book images should redirect to the book page.

Apart from the main site, there should be a page for each of the books, which would basically display the info in the markdown files of the book as shared, along with an image of the book at the top.

Write the web page files in this repo, using HTML/CSS/Javascript.

Make any clarifying questions in case you need more context from me.

### Corrected prompt

Build a buildless static website in this repository using HTML, CSS, and JavaScript. It will be hosted on GitHub Pages, so do not require a backend, build step, or external dependencies.

Create an old iPhone/iBooks skeuomorphic personal library site, using the attached screenshot as visual guidance: leather toolbar, warm parchment background, wooden bookshelf, realistic cover shadows, and paper-like notes.

Source data:
- Covers are in `data/images/`.
- Markdown notebooks are in `data/summaries/`.
- Each book must be explicitly mapped to its image and Markdown file in JavaScript, using stable URL slugs. Handle spaces and accented/Unicode filenames safely.

Pages:
1. `index.html`
   - Display every book cover in a wooden bookshelf.
   - Every cover must link to that book’s detail URL.
   - Include a “Notas al margen” section that displays only `Citas` and `Reflexiones`, never `Contenido`.
   - Use one vertical column of note cards, with each card below the preceding one.
   - Each category should randomly show 2–3 available samples whenever the page loads.
   - Add a “Barajar notas” button that redraws the random samples without refetching the source files.
   - Each note card should show the originating cover and link to that book page.

2. `book.html?book=<slug>`
   - Show the book cover at the top.
   - Render all content from that book’s Markdown notebook, including `Contenido`, `Citas`, `Reflexiones`, and any additional top-level sections.
   - Handle absent or empty sections gracefully.

Markdown parsing requirements:
- Top-level `#` headings define major sections.
- `Contenido`: list items/outline lines are individual candidates, though this section is not shown on the homepage.
- `Citas`: paragraphs separated by blank lines are individual candidates.
- `Reflexiones`: each `##` heading within `# Reflexiones` defines one complete reflection; everything after that heading belongs to it until the next `##` heading. Preserve the subsection title in the homepage preview.
- Escape source text before inserting it as HTML.
- Support headings, paragraphs, lists, simple inline emphasis/code, and fenced code blocks on detail pages.
- Add clear code comments explaining extraction and randomization.

Styling and quality:
- Make the design responsive and accessible, including visible keyboard focus and reduced-motion support.
- Preserve all existing source Markdown and images unchanged.
- Add README documentation explaining architecture, filename mapping, parsing rules, randomization, GitHub Pages/local-server usage, and how to add books.
- Verify that all images and Markdown files resolve through a local HTTP server.

## Notes

### Technical overview

This is a buildless static site. `index.html` and `book.html` load the shared
styles from `css/styles.css` and JavaScript modules from `js/`. Because the
browser reads Markdown files with `fetch()`, use an HTTP server locally (for
example, `python3 -m http.server 8000`) instead of opening `index.html` through
`file://`. GitHub Pages serves the site over HTTPS, so this structure works
without a build step.

`js/library.js` is the single source of site data and parsing logic:

- `BOOKS` maps each stable URL slug to its cover image and Markdown notebook.
  Add a new book here after adding its files to `data/images/` and
  `data/summaries/`.
- `assetUrl()` encodes filename path segments. This matters for spaces and
  accented characters in the source filenames.
- `parseSections()` reads only first-level Markdown headings (`# Contenido`,
  `# Citas`, `# Reflexiones`) as sections. Lower-level headings remain inside
  their parent section so they can carry structure.

### Homepage extraction rules

`js/home.js` loads every notebook in parallel, calls `parseSections()`, and
passes the relevant section text to `extractAnnotations()`.

- `Contenido`: each list item or non-empty outline line is a candidate. It is
  currently used only on individual book pages, not on the homepage.
- `Citas`: blank lines separate candidates. One paragraph (including a
  multi-line paragraph) becomes one quote sample.
- `Reflexiones`: each level-two heading (`##`) starts one complete reflection.
  All text after that heading belongs to the same reflection until the next
  `##` heading. The subsection title is retained at the start of its homepage
  preview. Therefore, create a new `## Título de reflexión` heading whenever a
  reflection should be independently eligible for selection.

Before a candidate is displayed on the homepage, lightweight Markdown syntax is
removed and whitespace is normalized. `escapeHtml()` then escapes the text
before it is inserted into the page, which keeps the rendered notes safe even
when their content includes characters such as `<` or `&`.

### Random samples

The homepage intentionally displays only `Citas` and `Reflexiones`; that list
is defined as `HOMEPAGE_SECTION_ORDER` in `js/library.js`. For each category,
`randomSample()` in `js/home.js` chooses either two or three requested items.
It first uses a Fisher–Yates shuffle on a copy of the available candidates, then
returns the requested number with `slice()`. `Math.min()` means a category with
fewer available candidates simply shows all of them instead of failing.

This happens every time the homepage loads and whenever the **Barajar notas**
button is selected. The source files are fetched only once per page load; the
button reuses the in-memory annotation pool and performs a new random draw.

### Page rendering

`js/book.js` reads the `book` value from a URL such as
`book.html?book=eva-luna`, finds that item in `BOOKS`, and renders the complete
Markdown notebook with its cover. The small Markdown renderer supports the
structures present in the notebooks: headings, paragraphs, ordered/unordered
lists, inline emphasis/code, and fenced code blocks.
