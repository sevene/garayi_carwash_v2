# Generated Files

This directory contains auto-generated files. **Do not edit them manually.**

## `pageKeywords.generated.ts`

Auto-generated search keywords parsed from admin page TSX source files.

### How it works

The script at `scripts/generate-search-keywords.mjs` reads all admin page `.tsx` files and extracts visible text from:
- Headings (`<h1>`, `<h2>`, `<h3>`)
- Labels (`<label>`)
- Table headers (`<th>`)
- Tab labels and button text
- Option labels
- Ternary text in conditional renders

### When does it run?

**Automatically before every build** — via the `prebuild` script in `package.json`.

This means:
- ✅ `npm run build` → auto-regenerates keywords first
- ✅ Cloudflare Pages deploy → auto-regenerates keywords first
- ✅ No manual steps needed

### Manual regeneration

If you want to regenerate during development:

```bash
npm run generate-keywords
```
