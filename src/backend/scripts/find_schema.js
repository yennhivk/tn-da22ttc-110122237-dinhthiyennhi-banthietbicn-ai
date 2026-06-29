const fs = require('fs');
const path = require('path');

const sqlPath = path.resolve(__dirname, '..', '..', 'CSDL_DoAnCN.sql');
console.log(`Checking database dump: ${sqlPath}`);

if (fs.existsSync(sqlPath)) {
    const content = fs.readFileSync(sqlPath, 'utf8');
    const lowerContent = content.toLowerCase();
    
    // Look for create table nha_cung_cap
    const searchTerms = [
        'create table `nha_cung_cap`',
        'create table nha_cung_cap',
        'nha_cung_cap'
    ];
    
    let found = false;
    for (const term of searchTerms) {
        const idx = lowerContent.indexOf(term);
        if (idx !== -1) {
            console.log(`\n✅ Found term "${term}" at index ${idx}!`);
            console.log('--- Table details ---');
            console.log(content.slice(idx, idx + 1000));
            found = true;
            break;
        }
    }
    
    if (!found) {
        console.log('❌ Could not find table definition directly.');
    }
} else {
    console.log('❌ SQL dump file not found at path.');
}
