const fs = require('fs');
const file = 'd:/BaoCao_KLTN/kltn-da22ttc-dinhthiyennhi-thietbicongnghe-nodejs/frontend/js/search-suggestions.js';
let content = fs.readFileSync(file, 'utf8');

const target1 = `        products.forEach((product, index) => {`;
const replacement1 = `        if (products.length === 0) {
            html += \`
                <div class="p-4 text-center text-gray-500 text-sm">
                    Không tìm th?y s?n ph?m
                </div>
            \`;
        } else {
            products.forEach((product, index) => {`;

content = content.replace(target1, replacement1);

const fallbackTarget2 = `        });

        // `;

const replacement2 = `        });
        }

        // `;

content = content.replace(fallbackTarget2, replacement2);

fs.writeFileSync(file, content, 'utf8');
console.log('Done replacement');
