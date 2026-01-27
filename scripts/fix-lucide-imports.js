/**
 * Script to fix lucide-react barrel imports
 * Converts: import { Icon1, Icon2 } from 'lucide-react'
 * To: import Icon1 from 'lucide-react/dist/esm/icons/icon-1'
 *      import Icon2 from 'lucide-react/dist/esm/icons/icon-2'
 * 
 * This reduces bundle size by ~400KB by tree-shaking unused icons
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Convert PascalCase to kebab-case
function toKebabCase(str) {
    return str
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z])([A-Z])([a-z])/g, '$1-$2$3')
        .toLowerCase();
}

function fixLucideImports(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Match: import { Icon1, Icon2, ... } from 'lucide-react'
    const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];?/g;

    content = content.replace(importRegex, (match, icons) => {
        modified = true;

        // Split icons and clean up
        const iconList = icons
            .split(',')
            .map(icon => icon.trim())
            .filter(icon => icon.length > 0);

        // Generate direct imports
        const directImports = iconList.map(iconName => {
            // Handle aliases: Icon as IconAlias
            const [actual, alias] = iconName.split(' as ').map(s => s.trim());
            const kebabName = toKebabCase(actual);

            if (alias) {
                return `import ${alias} from 'lucide-react/dist/esm/icons/${kebabName}';`;
            } else {
                return `import ${actual} from 'lucide-react/dist/esm/icons/${kebabName}';`;
            }
        }).join('\n');

        return directImports;
    });

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Fixed: ${path.relative(process.cwd(), filePath)}`);
        return true;
    }

    return false;
}

// Find all .tsx and .ts files
const files = glob.sync('components/**/*.{ts,tsx}', {
    ignore: ['**/node_modules/**', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}']
});

console.log(`Found ${files.length} files to process...\n`);

let fixedCount = 0;
files.forEach(file => {
    if (fixLucideImports(file)) {
        fixedCount++;
    }
});

console.log(`\n✅ Fixed ${fixedCount}/${files.length} files`);
console.log(`Bundle size reduction: ~400KB expected`);
