/**
 * Onboarding Preference Modal - Khảo sát sở thích cá nhân hóa lần đầu đăng nhập
 * Xử lý Cold Start cho hệ thống gợi ý: Mục đích, Ngân sách, Danh mục, Thương hiệu.
 * Mọi trường ở đây đều ĐƯỢC SỬ DỤNG thực sự bởi engine recommendation.
 */
(function() {
    'use strict';

    const API_URL = 'http://localhost:3000/api';
    const TOTAL_STEPS = 4;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAndShowModal);
    } else {
        checkAndShowModal();
    }

    async function checkAndShowModal() {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (!token || !userStr) return;

        let user;
        try {
            user = JSON.parse(userStr);
        } catch (e) {
            return;
        }

        const userId = user.ma_tai_khoan;
        if (!userId) return;

        // Dọn flag cũ
        localStorage.removeItem(`yennhi_pref_survey_completed_${userId}`);

        // User đã bấm Bỏ qua trong phiên này → đăng nhập tab mới sẽ hiện lại
        const isSurveySkipped = sessionStorage.getItem(`yennhi_pref_survey_skipped_${userId}`);
        if (isSurveySkipped === 'true') return;

        // Nguồn sự thật: DB - Check chi tiết từng trường
        let surveyStatus = null;
        try {
            const res = await fetch(`${API_URL}/recommendations/preferences/status/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                surveyStatus = data;
            }
        } catch (err) {
            console.warn('Không kiểm tra được trạng thái khảo sát:', err);
            return;
        }

        if (!surveyStatus) return;

        try {
            user.da_hoan_thanh_khao_sat = surveyStatus.completed;
            localStorage.setItem('user', JSON.stringify(user));
        } catch (e) {}

        // Nếu đã hoàn thành đủ 4 trường → không hiện modal
        if (surveyStatus.completed) return;

        setTimeout(() => {
            renderPreferenceModal(userId, surveyStatus);
        }, 1500);
    }

    function renderPreferenceModal(userId, surveyStatus) {
        if (document.getElementById('preferenceModal')) return;

        const style = document.createElement('style');
        style.innerHTML = `
            .pref-active-card {
                border-color: #dc2626 !important;
                background-color: rgba(220, 38, 38, 0.05) !important;
                transform: scale(1.03) translateY(-2px);
                box-shadow: 0 10px 25px -8px rgba(220, 38, 38, 0.25) !important;
            }
            .pref-step-pane {
                display: none;
                transition: all 0.4s ease-in-out;
            }
            .pref-step-pane.active {
                display: block;
                animation: prefSlideIn 0.4s ease-out;
            }
            @keyframes prefSlideIn {
                from { opacity: 0; transform: translateX(20px); }
                to { opacity: 1; transform: translateX(0); }
            }
            @keyframes prefFloat {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
            }
            .pref-mascot {
                animation: prefFloat 3s ease-in-out infinite;
            }
            .pref-progress-bar {
                transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }
        `;
        document.head.appendChild(style);

        const modalHTML = `
            <div id="preferenceModal" class="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 backdrop-blur-md opacity-0 pointer-events-none transition-all duration-300">
                <div class="relative w-full max-w-[440px] mx-4 max-h-[90vh] overflow-y-auto overflow-x-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-[24px] p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] transition-all duration-500 transform scale-95 translate-y-4 opacity-0 scrollbar-thin scrollbar-thumb-slate-300">

                    <div class="text-center mb-5">
                        <div class="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-red-500/30 pref-mascot">
                            <span class="text-4xl" id="prefMascotEmoji">🚀</span>
                        </div>
                        <h2 class="text-xl font-black text-slate-800 dark:text-white mb-1 tracking-tight">Cá Nhân Hóa Trải Nghiệm</h2>
                        <p class="text-xs text-slate-500 dark:text-slate-400">Giúp chúng tôi gợi ý sản phẩm phù hợp với bạn</p>
                    </div>

                    <div class="mb-5">
                        <div class="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">
                            <span id="prefStepLabel">Bước 1 / ${TOTAL_STEPS}</span>
                            <span id="prefPercentLabel">${Math.round(100 / TOTAL_STEPS)}%</span>
                        </div>
                        <div class="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div id="prefProgressIndicator" class="h-full bg-gradient-to-r from-red-600 to-orange-500 pref-progress-bar" style="width: ${100 / TOTAL_STEPS}%"></div>
                        </div>
                    </div>

                    <!-- STEP 1: Mục đích sử dụng -->
                    <div class="pref-step-pane active" data-step="1">
                        <h3 class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Mục đích sử dụng chính?</h3>
                        <div class="space-y-2" id="prefPurposeGroup">
                            ${renderRadioVertical('purpose', [
                                { v: 'Chơi game (Gaming)', e: '🎮' },
                                { v: 'Học tập / Văn phòng', e: '📚' },
                                { v: 'Đồ họa / Render', e: '🎨' },
                                { v: 'Lập trình / Code', e: '💻' },
                                { v: 'Liên lạc / Giải trí', e: '📱' },
                                { v: 'Nhiếp ảnh / Quay phim', e: '📷' }
                            ])}
                        </div>
                    </div>

                    <!-- STEP 2: Ngân sách -->
                    <div class="pref-step-pane" data-step="2">
                        <h3 class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Phân khúc ngân sách?</h3>
                        <div class="space-y-2" id="prefBudgetGroup">
                            ${renderRadioVertical('budget', [
                                { v: 'Dưới 5 triệu', e: '🪙' },
                                { v: '5 - 10 triệu', e: '💵' },
                                { v: '10 - 20 triệu', e: '💰' },
                                { v: '20 - 35 triệu', e: '💎' },
                                { v: 'Trên 35 triệu', e: '👑' }
                            ])}
                        </div>
                    </div>

                    <!-- STEP 3: Danh mục quan tâm -->
                    <div class="pref-step-pane" data-step="3">
                        <h3 class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Thiết bị bạn quan tâm? (chọn nhiều)</h3>
                        <div class="grid grid-cols-2 gap-2" id="prefCategories">
                            ${renderCheckboxes([
                                { v: 'Laptop', e: '💻' },
                                { v: 'Điện thoại', e: '📱' },
                                { v: 'PC Gaming', e: '🖥️' },
                                { v: 'Màn hình', e: '🖼️' },
                                { v: 'Chuột, Bàn phím', e: '⌨️' },
                                { v: 'Tai nghe, Loa', e: '🎧' },
                                { v: 'CPU, VGA', e: '⚙️' },
                                { v: 'Case, Nguồn', e: '🔌' },
                                { v: 'Phụ kiện', e: '🔧' },
                                { v: 'Ốp lưng', e: '🛡️' }
                            ])}
                        </div>
                    </div>

                    <!-- STEP 4: Thương hiệu -->
                    <div class="pref-step-pane" data-step="4">
                        <h3 class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Thương hiệu yêu thích? (chọn nhiều)</h3>
                        <div class="grid grid-cols-3 gap-2" id="prefBrands">
                            ${renderBrandCheckboxes([
                                { v: 'Apple', e: '🍎' },
                                { v: 'Samsung', e: '📱' },
                                { v: 'Xiaomi', e: '🔶' },
                                { v: 'Asus', e: '⚡' },
                                { v: 'Dell', e: '🔷' },
                                { v: 'HP', e: '🖥️' },
                                { v: 'Lenovo', e: '💼' },
                                { v: 'MSI', e: '🐉' },
                                { v: 'Acer', e: '🌟' },
                                { v: 'Logitech', e: '🖱️' },
                                { v: 'Razer', e: '🐍' },
                                { v: 'Sony', e: '🎵' }
                            ])}
                        </div>
                    </div>

                    <div class="flex gap-2 mt-6">
                        <button id="prevPrefBtn" class="hidden flex-1 py-2 px-4 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase">Quay lại</button>
                        <button id="skipPrefBtn" class="flex-1 py-2 px-4 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase">Bỏ qua</button>
                        <button id="nextPrefBtn" class="flex-1 py-2 px-4 bg-red-600 text-white font-bold rounded-xl text-xs uppercase">Tiếp tục</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modal = document.getElementById('preferenceModal');
        const content = modal.querySelector('.relative');

        setTimeout(() => {
            modal.classList.remove('opacity-0', 'pointer-events-none');
            content.classList.remove('scale-95', 'translate-y-4', 'opacity-0');
        }, 50);

        // Khởi tạo từ dữ liệu đã có
        let currentStep = surveyStatus.nextStep || 1;
        let selectedPurpose = surveyStatus.currentData?.purpose || '';
        let selectedBudget = surveyStatus.currentData?.budget || '';
        
        // Pre-fill dữ liệu đã có
        if (selectedPurpose) {
            const purposeInput = modal.querySelector(`input[name="purpose"][value="${selectedPurpose}"]`);
            if (purposeInput) {
                purposeInput.checked = true;
                purposeInput.closest('label').classList.add('pref-active-card');
            }
        }
        
        if (selectedBudget) {
            const budgetInput = modal.querySelector(`input[name="budget"][value="${selectedBudget}"]`);
            if (budgetInput) {
                budgetInput.checked = true;
                budgetInput.closest('label').classList.add('pref-active-card');
            }
        }
        
        if (surveyStatus.currentData?.categories) {
            surveyStatus.currentData.categories.forEach(cat => {
                const catInput = modal.querySelector(`#prefCategories input[value="${cat}"]`);
                if (catInput) {
                    catInput.checked = true;
                    catInput.closest('label').classList.add('pref-active-card');
                }
            });
        }
        
        if (surveyStatus.currentData?.brands) {
            surveyStatus.currentData.brands.forEach(brand => {
                const brandInput = modal.querySelector(`#prefBrands input[value="${brand}"]`);
                if (brandInput) {
                    brandInput.checked = true;
                    brandInput.closest('label').classList.add('pref-active-card');
                }
            });
        }
        
        // Lấy tham chiếu các nút TRƯỚC khi gọi advanceStep, tránh TDZ ReferenceError
        const prevBtn = document.getElementById('prevPrefBtn');
        const skipBtn = document.getElementById('skipPrefBtn');
        const nextBtn = document.getElementById('nextPrefBtn');

        // Hiển thị bước hiện tại
        advanceStep(currentStep);

        const labels = modal.querySelectorAll('label');
        labels.forEach(label => {
            const input = label.querySelector('input');
            input.addEventListener('change', () => {
                if (input.type === 'radio') {
                    const groupContainer = input.closest('[id^="pref"]');
                    if (groupContainer) {
                        groupContainer.querySelectorAll('label').forEach(l => l.classList.remove('pref-active-card'));
                    }
                    label.classList.add('pref-active-card');

                    if (input.name === 'purpose') {
                        selectedPurpose = input.value;
                        // Lưu ngay step 1
                        saveSurveyStep(userId, { purpose: selectedPurpose });
                        setTimeout(() => advanceStep(2), 300);
                    } else if (input.name === 'budget') {
                        selectedBudget = input.value;
                        // Lưu ngay step 2
                        saveSurveyStep(userId, { budget: selectedBudget });
                        setTimeout(() => advanceStep(3), 300);
                    }
                } else {
                    if (input.checked) label.classList.add('pref-active-card');
                    else label.classList.remove('pref-active-card');
                }
            });
        });

        prevBtn.addEventListener('click', () => {
            if (currentStep > 1) advanceStep(currentStep - 1);
        });

        skipBtn.addEventListener('click', () => {
            closeModal(modal, content);
            sessionStorage.setItem(`yennhi_pref_survey_skipped_${userId}`, 'true');
        });

        nextBtn.addEventListener('click', async () => {
            if (currentStep === 1) {
                if (!selectedPurpose) { alert('Vui lòng chọn mục đích sử dụng!'); return; }
                advanceStep(2);
            } else if (currentStep === 2) {
                if (!selectedBudget) { alert('Vui lòng chọn ngân sách!'); return; }
                advanceStep(3);
            } else if (currentStep === 3) {
                const categories = Array.from(modal.querySelectorAll('#prefCategories input:checked')).map(el => el.value);
                if (categories.length === 0) { alert('Vui lòng chọn ít nhất một thiết bị!'); return; }
                
                // Lưu ngay step 3
                await saveSurveyStep(userId, { categories });
                advanceStep(4);
            } else if (currentStep === 4) {
                const brands = Array.from(modal.querySelectorAll('#prefBrands input:checked')).map(el => el.value);
                if (brands.length === 0) { alert('Vui lòng chọn ít nhất một thương hiệu!'); return; }

                nextBtn.disabled = true;
                nextBtn.textContent = 'ĐANG LƯU...';

                // Lưu step 4 (hoàn tất)
                await saveSurveyStep(userId, { brands });
                nextBtn.disabled = true;
                nextBtn.textContent = 'ĐANG LƯU...';

                // Cập nhật localStorage
                try {
                    let currentUserStr = localStorage.getItem('user');
                    if (currentUserStr) {
                        let currentUser = JSON.parse(currentUserStr);
                        currentUser.da_hoan_thanh_khao_sat = true;
                        localStorage.setItem('user', JSON.stringify(currentUser));
                    }
                } catch (e) {
                    console.error('Error updating user object in LS', e);
                }

                closeModal(modal, content);

                if (typeof loadRecommendedProducts === 'function') {
                    loadRecommendedProducts();
                } else {
                    window.location.reload();
                }
            }
        });

        function advanceStep(step) {
            currentStep = step;

            const stepLabels = {
                1: `Bước 1 / ${TOTAL_STEPS}: Mục đích sử dụng`,
                2: `Bước 2 / ${TOTAL_STEPS}: Ngân sách`,
                3: `Bước 3 / ${TOTAL_STEPS}: Thiết bị quan tâm`,
                4: `Bước 4 / ${TOTAL_STEPS}: Thương hiệu yêu thích`
            };
            const emojis = { 1: '🎯', 2: '💰', 3: '🛒', 4: '⭐' };
            const percent = Math.round((step / TOTAL_STEPS) * 100);

            document.getElementById('prefStepLabel').textContent = stepLabels[step];
            document.getElementById('prefPercentLabel').textContent = `${percent}% Hoàn thành`;
            document.getElementById('prefProgressIndicator').style.width = `${percent}%`;
            document.getElementById('prefMascotEmoji').textContent = emojis[step];

            modal.querySelectorAll('.pref-step-pane').forEach(pane => pane.classList.remove('active'));
            modal.querySelector(`.pref-step-pane[data-step="${step}"]`).classList.add('active');

            if (step === 1) {
                prevBtn.classList.add('hidden');
                skipBtn.classList.remove('hidden');
                nextBtn.textContent = 'Tiếp tục';
            } else if (step === TOTAL_STEPS) {
                prevBtn.classList.remove('hidden');
                skipBtn.classList.add('hidden');
                nextBtn.textContent = 'Hoàn tất';
            } else {
                prevBtn.classList.remove('hidden');
                skipBtn.classList.add('hidden');
                nextBtn.textContent = 'Tiếp tục';
            }
        }
    }

    function renderRadioVertical(name, items) {
        return items.map(item => `
            <label class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:border-slate-300">
                <input type="radio" name="${name}" value="${item.v}" class="sr-only">
                <span class="text-xl">${item.e}</span>
                <span class="text-sm font-bold text-slate-700 dark:text-white">${item.v}</span>
            </label>
        `).join('');
    }

    function renderCheckboxes(items) {
        return items.map(item => `
            <label class="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:border-slate-300">
                <input type="checkbox" value="${item.v}" class="accent-red-600">
                <span class="text-base">${item.e}</span>
                <span class="text-xs font-bold">${item.v}</span>
            </label>
        `).join('');
    }

    function renderBrandCheckboxes(items) {
        return items.map(item => `
            <label class="flex flex-col items-center gap-1 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:border-slate-300">
                <input type="checkbox" value="${item.v}" class="sr-only">
                <span class="text-base">${item.e}</span>
                <span class="text-[10px] font-bold">${item.v}</span>
            </label>
        `).join('');
    }

    function closeModal(modal, content) {
        content.classList.add('scale-95', 'translate-y-4', 'opacity-0');
        modal.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => {
            modal.remove();
        }, 500);
    }
    
    // Lưu từng bước khảo sát riêng lẻ
    async function saveSurveyStep(userId, data) {
        try {
            await fetch(`${API_URL}/recommendations/preferences`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    userId,
                    ...data
                })
            });
            console.log('✅ Saved step:', data);
        } catch (err) {
            console.error('Error saving step:', err);
        }
    }
})();
