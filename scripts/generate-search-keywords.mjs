#!/usr/bin/env node

/**
 * 🔍 Search Keywords Generator (Source Parser)
 *
 * Parses the admin page TSX source files and extracts visible text
 * (headings, labels, table headers, button text, tab labels)
 * to auto-generate PAGE_KEYWORDS for GlobalSearchDropdown.
 *
 * ✅ No browser needed — reads source files directly
 * ✅ No running server needed
 * ✅ No authentication needed
 * ✅ Works in any CI/CD environment (Cloudflare, Vercel, etc.)
 * ✅ Runs automatically as a prebuild step
 *
 * Usage:
 *   node scripts/generate-search-keywords.mjs
 *   (or: npm run generate-keywords)
 *
 * Auto-runs before every build via the "prebuild" script in package.json.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADMIN_DIR = path.resolve(__dirname, '..', 'src', 'app', 'admin');
const OUTPUT_PATH = path.resolve(__dirname, '..', 'src', 'generated', 'pageKeywords.generated.ts');

// ─── Route → Source file mapping ───
// Mirrors NAV_ITEMS from AdminSideBar.tsx
const ROUTES = [
    { path: '/admin/dashboard/overview', file: 'dashboard/overview/page.tsx', defaultSection: 'Overview' },
    { path: '/admin/dashboard/sales', file: 'dashboard/sales/page.tsx', defaultSection: 'Sales' },
    { path: '/admin/dashboard/expenses', file: 'dashboard/expenses/page.tsx', defaultSection: 'Expenses' },
    { path: '/admin/dashboard/reports', file: 'dashboard/reports/page.tsx', defaultSection: 'Reports' },
    { path: '/admin/categories', file: 'categories/page.tsx', defaultSection: 'Categories' },
    { path: '/admin/products', file: 'products/page.tsx', defaultSection: 'Products' },
    { path: '/admin/inventory', file: 'inventory/page.tsx', defaultSection: 'Inventory' },
    { path: '/admin/services', file: 'services/page.tsx', defaultSection: 'Services' },
    { path: '/admin/orders', file: 'orders/page.tsx', defaultSection: 'Orders' },
    { path: '/admin/customers', file: 'customers/page.tsx', defaultSection: 'Customers' },
    { path: '/admin/people', file: 'people/page.tsx', defaultSection: 'People' },
    { path: '/admin/settings', file: 'settings/page.tsx', defaultSection: 'Settings' },
];

// ─── Extraction patterns ───
// Each pattern extracts text from a specific JSX/TSX construct.

const EXTRACTION_RULES = [
    // <h1 ...>Static Text</h1>, <h2>, <h3>
    { name: 'headings', regex: /<h[1-3][^>]*>([^<{]+)<\/h[1-3]>/g, group: 1 },

    // <th ...>Text</th>
    { name: 'table-headers', regex: /<th[^>]*>([^<{]+)<\/th>/g, group: 1 },

    // <label ...>Text</label>   (direct text)
    { name: 'labels', regex: /<label[^>]*>[\s\r\n]*([^<{]+?)[\s\r\n]*<\/label>/g, group: 1 },

    // label: 'Text'  or  label: "Text"   (tab/option definitions)
    { name: 'label-props', regex: /label:\s*['"]([^'"]+)['"]/g, group: 1 },

    // Tab button inline text pattern: >TabText<  (captures text between > and < for tab buttons)
    // Pattern: button with tab-like classes containing inline text
    { name: 'tab-text', regex: /setActiveTab[^}]*}\s*className[^>]*>\s*(?:<[^>]+>\s*)*([A-Z][A-Za-z &]+?)(?:\s*<)/g, group: 1 },

    // <TabButton ... label="Text" />
    { name: 'tab-button-label', regex: /label=["']([^"']+)["']/g, group: 1 },

    // Section header pattern: >Text</h2> or >Text</h3> with dynamic expressions
    // e.g., >{activeTab === 'employees' ? 'Staff Directory' : 'System Roles'}<
    { name: 'ternary-text', regex: /\?\s*['"]([^'"]{3,40})['"]\s*:\s*['"]([^'"]{3,40})['"]/g, group: [1, 2] },

    // Standalone string in JSX like: placeholder="text"
    { name: 'placeholders', regex: /placeholder=["']([^"']+)["']/g, group: 1 },
];

// Words to exclude
const EXCLUDE_SET = new Set([
    'actions', 'action', 'save', 'cancel', 'close', 'delete', 'remove',
    'edit', 'add', 'update', 'create', 'submit', 'loading', 'saving',
    'search', 'loading...', 'saving...', 'select', 'none', 'back',
    'sign in', 'sign out', 'confirm', 'yes', 'no', 'ok', 'icon',
    'admin menu', 'debug', 'n/a', 'unknown', 'walk-in',
    'system active', 'current mode', 'online', 'offline',
]);

const EXCLUDE_PATTERNS = [
    /^\d+$/,                    // Pure numbers
    /^[\$₱€£¥][\d,.]+$/,      // Currency values
    /^\s*$/,                    // Whitespace only
    /^[a-f0-9-]{36}$/i,        // UUIDs
    /^\d{4}-\d{2}/,            // Date strings
    /^e\.g\./i,                // Example text
    /^[a-z_]+$/,               // snake_case (likely variable names)
    /className/,               // Code artifacts
    /^\w+=$/,                  // Partial expression
    /^[^a-zA-Z]*$/,            // No letters at all
    // ── CSS class patterns ──
    /\b(bg|text|border|ring|shadow|hover|focus|group|peer|rounded|translate|scale|rotate|opacity|transition|animate|from|to|via)-/,
    /\b(flex|grid|block|inline|hidden|absolute|relative|fixed|sticky|overflow|w-|h-|p-|m-|gap-|z-|inset|top|left|right|bottom)/,
    /\b(font-|tracking-|leading-|whitespace-|truncate|uppercase|lowercase|capitalize)/,
    /\bmax-[wh]-/,
    /\b(sm|md|lg|xl|2xl):/,     // Responsive prefixes
    /\bduration-/,
    /\b(shrink|grow|basis)/,
];

const MIN_LENGTH = 2;
const MAX_LENGTH = 45;

function shouldExclude(text) {
    const t = text.trim();
    if (t.length < MIN_LENGTH || t.length > MAX_LENGTH) return true;
    if (EXCLUDE_SET.has(t.toLowerCase())) return true;
    return EXCLUDE_PATTERNS.some(p => p.test(t));
}

function cleanText(text) {
    return text
        .replace(/\s+/g, ' ')
        .replace(/[\n\r\t]/g, ' ')
        .replace(/&amp;/g, '&')
        .trim();
}

/**
 * Detect tabs/sections defined in the source code.
 * Looks for patterns like:
 *   const tabs = [{ id: 'general', label: 'General', ... }, ...]
 *   or button text with setActiveTab
 */
function detectSections(source) {
    const sections = [];

    // Pattern 1: tabs array with id + label
    const tabsArrayMatch = source.match(/const\s+tabs\s*=\s*\[([\s\S]*?)\];/);
    if (tabsArrayMatch) {
        const entries = [...tabsArrayMatch[1].matchAll(/id:\s*['"](\w+)['"][^}]*label:\s*['"]([^'"]+)['"]/g)];
        for (const entry of entries) {
            sections.push({ id: entry[1], label: entry[2] });
        }
    }

    // Pattern 2: activeTab === 'value' (Settings-style sections)
    const activeTabMatches = [...source.matchAll(/activeTab\s*===\s*['"](\w+)['"]/g)];
    const tabIds = [...new Set(activeTabMatches.map(m => m[1]))];
    if (tabIds.length > 0 && sections.length === 0) {
        // Try to find labels for these tab ids
        for (const id of tabIds) {
            // Look for button text near setActiveTab('id')
            const btnMatch = source.match(new RegExp(`setActiveTab\\(['"]${id}['"]\\)[^>]*>([^<]+)<`, 's'));
            if (btnMatch) {
                sections.push({ id, label: cleanText(btnMatch[1]) });
            } else {
                // Fallback: capitalize the id
                sections.push({ id, label: id.charAt(0).toUpperCase() + id.slice(1) });
            }
        }
    }

    return sections;
}

/**
 * Determine which section a keyword belongs to based on its position
 * in the source relative to activeTab conditionals.
 */
function findSectionForPosition(source, position, sections, defaultSection) {
    if (sections.length === 0) return defaultSection;

    // Find the nearest activeTab === 'xxx' ABOVE this position
    let bestSection = defaultSection;
    let bestPos = -1;

    for (const section of sections) {
        const regex = new RegExp(`activeTab\\s*===\\s*['"]${section.id}['"]`, 'g');
        let match;
        while ((match = regex.exec(source)) !== null) {
            if (match.index < position && match.index > bestPos) {
                bestPos = match.index;
                bestSection = section.label;
            }
        }
    }

    return bestSection;
}

function extractKeywordsFromSource(source, defaultSection) {
    const keywords = [];
    const seen = new Set();

    const sections = detectSections(source);

    const addKeyword = (text, position) => {
        const cleaned = cleanText(text);
        if (shouldExclude(cleaned)) return;

        // Determine section, fallback to defaultSection if empty
        let section = findSectionForPosition(source, position, sections, defaultSection);
        if (!section) section = defaultSection;

        const key = `${section}::${cleaned}`;
        if (seen.has(key)) return;
        seen.add(key);
        keywords.push({ section, label: cleaned });
    };

    for (const rule of EXTRACTION_RULES) {
        const regex = new RegExp(rule.regex.source, rule.regex.flags);
        let match;

        while ((match = regex.exec(source)) !== null) {
            if (Array.isArray(rule.group)) {
                // Multiple groups (ternary patterns)
                for (const g of rule.group) {
                    if (match[g]) addKeyword(match[g], match.index);
                }
            } else {
                if (match[rule.group]) addKeyword(match[rule.group], match.index);
            }
        }
    }

    // Also extract tab labels themselves as keywords
    for (const section of sections) {
        const key = `${defaultSection}::${section.label}`;
        if (!seen.has(key) && !shouldExclude(section.label)) {
            seen.add(key);
            keywords.push({ section: defaultSection, label: section.label });
        }
    }

    return keywords;
}

function generateTypeScriptFile(allKeywords) {
    const lines = [
        '// ============================================',
        '// AUTO-GENERATED FILE — DO NOT EDIT MANUALLY',
        '// ============================================',
        `// Generated at: ${new Date().toISOString()}`,
        '// Run "node scripts/generate-search-keywords.mjs" to regenerate',
        '// This runs automatically before every build (prebuild script).',
        '//',
        '// Parsed from admin page TSX source files.',
        '// When you change text on any admin page, the next build will',
        '// automatically pick up the changes.',
        '',
        'export type PageKeyword = { section: string; label: string };',
        '',
        'export const PAGE_KEYWORDS: Record<string, PageKeyword[]> = {',
    ];

    for (const [routePath, keywords] of Object.entries(allKeywords)) {
        lines.push(`    '${routePath}': [`);
        for (const kw of keywords) {
            const safeLabel = kw.label.replace(/'/g, "\\'");
            const safeSection = kw.section.replace(/'/g, "\\'");
            lines.push(`        { section: '${safeSection}', label: '${safeLabel}' },`);
        }
        lines.push(`    ],`);
    }

    lines.push('};');
    lines.push('');

    return lines.join('\n');
}

// ─── MAIN ───
function main() {
    console.log('');
    console.log('🔍 Search Keywords Generator (Source Parser)');
    console.log('═══════════════════════════════════════');
    console.log(`📂 Scanning: ${ADMIN_DIR}`);
    console.log('');

    const allKeywords = {};

    for (const route of ROUTES) {
        const filePath = path.join(ADMIN_DIR, route.file);

        if (!fs.existsSync(filePath)) {
            console.log(`  ⚠️  Not found: ${route.file}`);
            allKeywords[route.path] = [];
            continue;
        }

        const source = fs.readFileSync(filePath, 'utf-8');
        const keywords = extractKeywordsFromSource(source, route.defaultSection);
        allKeywords[route.path] = keywords;

        console.log(`  ✅ ${route.defaultSection.padEnd(12)} → ${keywords.length} keywords`);
        if (keywords.length > 0) {
            const preview = keywords.slice(0, 4).map(k => `"${k.label}"`).join(', ');
            console.log(`     ${preview}${keywords.length > 4 ? '...' : ''}`);
        }
    }

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileContent = generateTypeScriptFile(allKeywords);
    fs.writeFileSync(OUTPUT_PATH, fileContent, 'utf-8');

    const totalKeywords = Object.values(allKeywords).reduce((sum, kws) => sum + kws.length, 0);
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Generated: ${path.relative(path.resolve(__dirname, '..'), OUTPUT_PATH)}`);
    console.log(`📊 Total: ${totalKeywords} keywords across ${ROUTES.length} pages`);
    console.log('');
}

main();
