let currentUser = null;
let currentShift = null;

// قاعدة بيانات المستخدمين المحلية (تُحفظ في المتصفح لكي لا تختفي عند تسجيل الخروج)
function getStoredUsers() {
    const defaultUsers = [
        { id: '1', username: 'admin', password: 'admin', full_name: 'غيث (المدير العام)', role: 'manager', active: true },
        { id: '2', username: 'jaafar_7842', password: '3891', full_name: 'جعفر', role: 'employee', active: true },
        { id: '3', username: 'taiba_5129', password: '6420', full_name: 'طيبه', role: 'employee', active: true },
        { id: '4', username: 'maryam_9304', password: '1583', full_name: 'مريم', role: 'employee', active: true },
        { id: '5', username: 'aya_2615', password: '7924', full_name: 'ايه', role: 'employee', active: true },
        { id: '6', username: 'saja_8431', password: '2065', full_name: 'سجى', role: 'employee', active: true },
        { id: '7', username: 'ali_ahmad_6392', password: '4178', full_name: 'علي احمد', role: 'employee', active: true },
        { id: '8', username: 'ali_salam_1478', password: '9352', full_name: 'علي سلام', role: 'employee', active: true },
        { id: '9', username: 'ammar_3920', password: '5814', full_name: 'عمار', role: 'employee', active: true },
        { id: '10', username: 'bilal_7563', password: '2491', full_name: 'بلال', role: 'employee', active: true },
        { id: '11', username: 'mohammad_2841', password: '6037', full_name: 'محمد', role: 'employee', active: true },
        { id: '12', username: 'marwan_9156', password: '4820', full_name: 'مروان', role: 'employee', active: true },
        { id: '13', username: 'fahd_3209', password: '7153', full_name: 'فهد', role: 'employee', active: true },
        { id: '14', username: 'ahmad_saadi_6841', password: '1946', full_name: 'احمد سعدي', role: 'employee', active: true },
        { id: '15', username: 'ahmad_ziyad_5293', password: '8321', full_name: 'احمد زياد', role: 'employee', active: true },
        { id: '16', username: 'omar_4172', password: '5690', full_name: 'عمر', role: 'employee', active: true },
        { id: '17', username: 'omar_hafez_8305', password: '2748', full_name: 'عمر حافظ', role: 'employee', active: true },
        { id: '18', username: 'ibrahim_1924', password: '6489', full_name: 'ابراهيم', role: 'employee', active: true },
        { id: '19', username: 'mohammad_firas_7462', password: '3150', full_name: 'محمد فراس', role: 'employee', active: true },
        { id: '20', username: 'employee_1_5093', password: '9824', full_name: 'موضف ١', role: 'employee', active: true }
    ];
    const stored = localStorage.getItem('gstore_users');
    return stored ? JSON.parse(stored) : defaultUsers;
}

function saveUsers(users) {
    localStorage.setItem('gstore_users', JSON.stringify(users));
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const logoutBtns = [document.getElementById('logout-btn'), document.getElementById('manager-logout-btn')];
    logoutBtns.forEach(btn => {
        if (btn) btn.addEventListener('click', handleLogout);
    });

    setupEmployeeShiftEvents();
});

// تسجيل الدخول
function handleLogin(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value.trim();
    const errorMsg = document.getElementById('login-error');

    errorMsg.classList.add('hidden');

    const users = getStoredUsers();
    const foundUser = users.find(u => u.username === usernameInput && u.password === passwordInput);

    if (!foundUser) {
        errorMsg.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة!';
        errorMsg.classList.remove('hidden');
        return;
    }

    if (!foundUser.active) {
        errorMsg.textContent = 'هذا الحساب معطل من قبل المدير!';
        errorMsg.classList.remove('hidden');
        return;
    }

    currentUser = foundUser;
    document.getElementById('login-screen').classList.add('hidden');

    if (currentUser.role === 'manager') {
        document.getElementById('manager-screen').classList.remove('hidden');
        loadManagerDashboard();
    } else {
        document.getElementById('employee-screen').classList.remove('hidden');
        document.getElementById('logged-employee-name').textContent = currentUser.full_name;
        document.getElementById('display-employee-name').value = currentUser.full_name;
    }
}

function handleLogout() {
    currentUser = null;
    currentShift = null;
    document.getElementById('manager-screen').classList.add('hidden');
    document.getElementById('employee-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('login-form').reset();
}

// ---------------------------------------------------------------------------
// لوحة الموظف والشفتات (مع تسجيل الوقت تلقائياً)
// ---------------------------------------------------------------------------
function setupEmployeeShiftEvents() {
    const shiftStartForm = document.getElementById('shift-start-form');
    if (shiftStartForm) {
        shiftStartForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const shiftType = document.getElementById('shift-type').value;
            const openingCash = parseFloat(document.getElementById('opening-cash').value) || 0;

            if (!shiftType) {
                alert('يرجى اختيار نوع الشفت');
                return;
            }

            // وقت بداية الشفت تلقائياً
            currentShift = {
                shift_type: shiftType,
                opening_cash: openingCash,
                start_time: new Date().toISOString()
            };

            document.getElementById('shift-start-section').classList.add('hidden');
            document.getElementById('active-shift-content').classList.remove('hidden');
            calculateEmployeeTotals();
        });
    }

    ['reinforcement', 'sold-count', 'misc-count', 'unsold-count'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calculateEmployeeTotals);
    });

    const miscCountInput = document.getElementById('misc-count');
    if (miscCountInput) {
        miscCountInput.addEventListener('input', (e) => {
            const count = parseInt(e.target.value) || 0;
            const listContainer = document.getElementById('misc-prices-list');
            listContainer.innerHTML = '';
            
            for (let i = 1; i <= count; i++) {
                const div = document.createElement('div');
                div.className = 'form-group';
                div.innerHTML = `<label>سعر المعاملة المتفرقة ${i} ($)</label><input type="number" step="0.01" class="misc-price-input" min="0" value="0">`;
                listContainer.appendChild(div);
            }

            document.querySelectorAll('.misc-price-input').forEach(input => {
                input.addEventListener('input', calculateEmployeeTotals);
            });
            calculateEmployeeTotals();
        });
    }

    const unsoldCountInput = document.getElementById('unsold-count');
    if (unsoldCountInput) {
        unsoldCountInput.addEventListener('input', (e) => {
            const count = parseInt(e.target.value) || 0;
            const listContainer = document.getElementById('unsold-items-list');
            listContainer.innerHTML = '';
            
            for (let i = 1; i <= count; i++) {
                const div = document.createElement('div');
                div.style.cssText = "display: flex; gap: 10px; margin-bottom: 8px;";
                div.innerHTML = `
                    <input type="text" placeholder="اسم المعاملة الغير مباعة ${i}" class="unsold-name-input" style="flex: 2; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1;">
                    <input type="number" step="0.01" placeholder="السعر ($)" class="unsold-price-input" style="flex: 1; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1;" min="0" value="0">
                `;
                listContainer.appendChild(div);
            }
        });
    }

    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('هل أنت متأكد من تفريغ البيانات؟')) {
                document.getElementById('active-shift-content').classList.add('hidden');
                document.getElementById('shift-start-section').classList.remove('hidden');
                document.getElementById('shift-start-form').reset();
            }
        });
    }

    const finishBtn = document.getElementById('finish-shift-btn');
    if (finishBtn) {
        finishBtn.addEventListener('click', saveAndFinishShift);
    }
}

function calculateEmployeeTotals() {
    const openingCash = parseFloat(document.getElementById('opening-cash').value) || 0;
    const reinforcement = parseFloat(document.getElementById('reinforcement').value) || 0;
    const soldCount = parseInt(document.getElementById('sold-count').value) || 0;

    const soldAmount = soldCount * 2000; 
    document.getElementById('sold-amount-display').value = soldAmount.toFixed(2) + ' $';

    let miscTotal = 0;
    document.querySelectorAll('.misc-price-input').forEach(input => {
        miscTotal += parseFloat(input.value) || 0;
    });
    document.getElementById('misc-total-display').textContent = miscTotal.toFixed(2);

    const totalSales = soldAmount + miscTotal;
    document.getElementById('total-sales-display').textContent = totalSales.toFixed(2);

    const endingCash = openingCash + reinforcement - totalSales;
    const endingCashDisplay = document.getElementById('ending-cash-display');
    endingCashDisplay.textContent = endingCash.toFixed(2) + ' $';
    endingCashDisplay.style.color = endingCash < 0 ? 'var(--danger-color)' : 'var(--success-color)';
}

function saveAndFinishShift() {
    if (!confirm('هل أنت متأكد من حفظ وإنهاء الشفت؟')) return;

    const openingCash = parseFloat(document.getElementById('opening-cash').value) || 0;
    const reinforcement = parseFloat(document.getElementById('reinforcement').value) || 0;
    const soldCount = parseInt(document.getElementById('sold-count').value) || 0;
    const soldAmount = soldCount * 2000;
    
    let miscTotal = 0;
    document.querySelectorAll('.misc-price-input').forEach(input => {
        miscTotal += parseFloat(input.value) || 0;
    });

    const unsoldCount = parseInt(document.getElementById('unsold-count').value) || 0;
    const unsoldDetails = [];
    const unsoldNames = document.querySelectorAll('.unsold-name-input');
    const unsoldPrices = document.querySelectorAll('.unsold-price-input');
    
    for (let i = 0; i < unsoldNames.length; i++) {
        unsoldDetails.push({
            name: unsoldNames[i].value || `غير مباع ${i+1}`,
            price: parseFloat(unsoldPrices[i].value) || 0
        });
    }

    const totalSales = soldAmount + miscTotal;
    const endingCash = openingCash + reinforcement - totalSales;
    const endTime = new Date().toISOString();

    const shiftData = {
        employee_name: currentUser.full_name,
        shift_type: document.getElementById('shift-type').value,
        opening_cash: openingCash,
        reinforcement: reinforcement,
        sold_count: soldCount,
        sold_amount: soldAmount,
        misc_total: miscTotal,
        unsold_count: unsoldCount,
        unsold_details: unsoldDetails,
        total_sales: totalSales,
        ending_cash: endingCash,
        start_time: currentShift.start_time,
        end_time: endTime,
        created_at: new Date().toISOString()
    };

    let savedShifts = JSON.parse(localStorage.getItem('gstore_shifts') || '[]');
    savedShifts.unshift(shiftData);
    localStorage.setItem('gstore_shifts', JSON.stringify(savedShifts));

    let currentVault = parseFloat(localStorage.getItem('gstore_vault') || '1000');
    localStorage.setItem('gstore_vault', currentVault + totalSales);

    alert('تم حفظ الشفت وإنهاؤه بنجاح وتحديث القاصة!');
    printShiftReceipt(shiftData);
    window.location.reload();
}

function printShiftReceipt(data) {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html dir="rtl">
        <head>
            <title>تقرير الشفت</title>
            <style>
                body { font-family: Tahoma, sans-serif; padding: 20px; color: #333; }
                h2 { text-align: center; color: #1e293b; }
                .box { border: 1px solid #cbd5e1; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: right; font-size: 14px; }
                th { background-color: #f1f5f9; }
            </style>
        </head>
        <body>
            <h2>تقرير شفت عمل - G STORE</h2>
            <div class="box">
                <p><strong>اسم الموظف:</strong> ${data.employee_name}</p>
                <p><strong>نوع الشفت:</strong> ${data.shift_type}</p>
                <p><strong>وقت بدء الشفت:</strong> ${new Date(data.start_time).toLocaleString()}</p>
                <p><strong>وقت نهاية الشفت:</strong> ${new Date(data.end_time).toLocaleString()}</p>
            </div>
            <div class="box">
                <p><strong>النقد المستلم (بداية اليوم):</strong> ${data.opening_cash} $</p>
                <p><strong>المبلغ المعزز:</strong> ${data.reinforcement} $</p>
                <p><strong>المعاملات المباعة:</strong> ${data.sold_count} (المبلغ: ${data.sold_amount} $)</p>
                <p><strong>مجموع المعاملات المتفرقة:</strong> ${data.misc_total} $</p>
                <p><strong>المباع الكلي:</strong> ${data.total_sales} $</p>
                <p><strong>نقد الصندوق (نهاية اليوم):</strong> ${data.ending_cash} $</p>
            </div>
            <h3>المعاملات غير المباعة:</h3>
            <table>
                <tr><th>اسم المعاملة</th><th>السعر ($)</th></tr>
                ${data.unsold_details.map(item => `<tr><td>${item.name}</td><td>${item.price}$</td></tr>`).join('')}
            </table>
            <script>window.print();</script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ---------------------------------------------------------------------------
// لوحة تحكم المدير (مع الكشوفات الجزئية والكليات)
// ---------------------------------------------------------------------------
function loadManagerDashboard() {
    const managerMainContainer = document.querySelector('#manager-screen .container');
    const currentVault = parseFloat(localStorage.getItem('gstore_vault') || '1000').toFixed(2);
    
    managerMainContainer.innerHTML = `
        <div class="card" style="background: linear-gradient(135deg, #0f172a, #1e293b); color: white;">
            <h3><i class="fa-solid fa-vault"></i> نقد القاصة المركزية (خاص بالمدير فقط)</h3>
            <p style="color: #94a3b8; font-size: 14px; margin-bottom: 15px;">المبلغ الكلي المتراكم في القاصة بالدولار الأمريكي.</p>
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                <h1 id="vault-amount-display" style="color: #38bdf8; margin: 0; font-size: 32px;">${currentVault} $</h1>
                <div style="display: flex; gap: 10px;">
                    <input type="number" step="0.01" id="new-vault-input" placeholder="تعديل المبلغ..." style="padding: 8px; border-radius: 8px; border: none; width: 150px;">
                    <button type="button" id="update-vault-btn" class="btn-success" style="width: auto;"><i class="fa-solid fa-pen"></i> تحديث القاصة</button>
                </div>
            </div>
        </div>

        <div class="card">
            <h3><i class="fa-solid fa-user-shield"></i> لوحة التحكم والتحكم الشامل</h3>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px;">
                <button type="button" id="refresh-manager-btn" class="btn-primary" style="width: auto;"><i class="fa-solid fa-rotate"></i> تحديث البيانات</button>
                <button type="button" id="show-add-user-btn" class="btn-success" style="width: auto;"><i class="fa-solid fa-user-plus"></i> إضافة موظف / مستخدم جديد</button>
                <button type="button" onclick="window.print();" class="btn-primary" style="width: auto; background-color: #475569;"><i class="fa-solid fa-print"></i> طباعة التقرير العام</button>
            </div>
        </div>

        <div id="add-user-section" class="card hidden" style="border: 2px dashed var(--primary-color);">
            <h3><i class="fa-solid fa-user-plus"></i> إضافة مستخدم جديد للنظام</h3>
            <form id="add-user-form" style="margin-top: 15px;">
                <div class="form-group"><label>الاسم الكامل:</label><input type="text" id="new-fullname" required placeholder="مثال: علي محمد"></div>
                <div class="form-group"><label>اسم المستخدم (لتسجيل الدخول):</label><input type="text" id="new-username" required placeholder="مثال: ali_user"></div>
                <div class="form-group"><label>كلمة المرور:</label><input type="password" id="new-password" required placeholder="كلمة المرور"></div>
                <div class="form-group"><label>الصلاحية:</label>
                    <select id="new-role" required style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
                        <option value="employee">موظف (شفتات فقط)</option>
                        <option value="manager">مدير (صلاحيات كاملة)</option>
                    </select>
                </div>
                <button type="submit" class="btn-success"><i class="fa-solid fa-check"></i> حفظ المستخدم</button>
                <button type="button" id="cancel-add-user" class="btn-danger" style="margin-top: 10px;">إلغاء</button>
            </form>
        </div>

        <div class="card">
            <h3 style="margin-bottom: 15px;"><i class="fa-solid fa-users-gear"></i> إدارة المستخدمين والموظفين</h3>
            <div id="users-table-container" style="overflow-x: auto;"></div>
        </div>

        <div class="card">
            <h3 style="margin-bottom: 15px;"><i class="fa-solid fa-clipboard-list"></i> سجل الشفتات (فلترة الكشف الكلي والجزئي)</h3>
            
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px; background: #f8fafc; padding: 10px; border-radius: 8px;">
                <div style="flex: 1; min-width: 200px;">
                    <label style="font-size: 13px; display: block; margin-bottom: 5px;">فلترة حسب الموظف (كشف جزئي أو كلي):</label>
                    <select id="filter-employee" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1;">
                        <option value="all">كل الموظفين (كشف كلي)</option>
                    </select>
                </div>
                <div style="display: flex; align-items: flex-end;">
                    <button type="button" id="apply-filter-btn" class="btn-primary" style="height: 38px; width: auto;"><i class="fa-solid fa-filter"></i> تطبيق الفلتر</button>
                </div>
            </div>

            <div id="shifts-table-container" style="overflow-x: auto;"></div>
        </div>
    `;

    document.getElementById('refresh-manager-btn').addEventListener('click', loadManagerDashboard);
    document.getElementById('update-vault-btn').addEventListener('click', () => {
        const val = parseFloat(document.getElementById('new-vault-input').value);
        if (isNaN(val)) {
            alert('يرجى إدخال مبلغ صحيح');
            return;
        }
        if (!confirm('هل أنت متأكد من تعديل نقد القاصة؟')) return;
        localStorage.setItem('gstore_vault', val);
        alert('تم تحديث نقد القاصة 
