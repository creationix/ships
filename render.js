/**
 * Simple data-driven rendering library using JSON-ML format.
 * 
 * JSON-ML format: [tag, attributes?, ...children]
 * Examples:
 *   ['div', { class: 'container' }, 'Hello World']
 *   ['div.container', 'Hello World']  // CSS selector shortcut
 *   ['.container', 'Hello World']     // div is implied
 * 
 * @typedef {Array<string | object | Array>} JSONMl
 */

/**
 * Renders JSON-ML data into DOM elements
 * @param {JSONMl | string | number} data 
 * @returns {HTMLElement | Text}
 */
export function render(data) {
    if (typeof data === 'string' || typeof data === 'number') {
        return document.createTextNode(data);
    }

    let [tag, ...rest] = data;
    let attrs = {};
    let children = [];

    // Parse CSS selector shortcuts (e.g., 'div.class' or '.class')
    if (typeof tag === 'string') {
        let match = tag.match(/^([a-z]+)?((?:[#.][\w-]+)*)$/i);
        let baseTag = match && match[1] || 'div';
        let selector = match && match[2] || '';
        let id = selector.match(/#([\w-]+)/);
        let classes = [...selector.matchAll(/\.([\w-]+)/g)].map(m => m[1]);
        tag = baseTag;
        if (id) attrs.id = id[1];
        if (classes.length) attrs.class = classes.join(' ');
    } else if (Array.isArray(tag)) {
        const frag = document.createDocumentFragment();
        for (const item of data) {
            frag.appendChild(render(item));
        }
        return frag; // Return a DocumentFragment for array input
    } else {
        throw new Error(`Invalid tag format: ${tag}`);
    }

    // Extract attributes object if present
    if (rest[0] && typeof rest[0] === 'object' && !Array.isArray(rest[0])) {
        Object.assign(attrs, rest.shift());
    }
    children = rest;

    // Create and configure element
    /** @type {HTMLElement} */
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') {
            Object.assign(el.style, v);
        } else el.setAttribute(k, v);
    }
    console.log(el)

    // Render and append children
    for (const child of children) {
        el.appendChild(render(child));
    }
    return el;
}