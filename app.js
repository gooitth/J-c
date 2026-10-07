let currentUser = null;
let currentShift = null;

// قاعدة بيانات المستخدمين المحلية (تُحفظ في المتصفح لكي لا تختفي عند تسجيل الخروج)
function getStoredUsers() {
    const defaultUsers = [
        { id: '1', username: 'admin', password: 'admin', full_name: 'المدير العام', role: 'manager', active: true },
        { id: '2', username: 'employee', password: '1234', full_name: 'أحمد الموظف', role: 'employee', active: true }
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

    // تم التعديل: الضرب في 2000 بناءً على طلبك
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
    const soldAmount = soldCount * 2000; // الضرب في 2000
    
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
    
    // وقت النهاية تلقائياً
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
        alert('تم تحديث نقد القاصة بنجاح!');
        loadManagerDashboard();
    });

    const addUserBtn = document.getElementById('show-add-user-btn');
    const addUserSection = document.getElementById('add-user-section');
    document.getElementById('cancel-add-user').addEventListener('click', () => {
        addUserSection.classList.add('hidden');
        addUserBtn.classList.remove('hidden');
    });
    addUserBtn.addEventListener('click', () => {
        addUserSection.classList.remove('hidden');
        addUserBtn.classList.add('hidden');
    });

    document.getElementById('add-user-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const fullName = document.getElementById('new-fullname').value.trim();
        const username = document.getElementById('new-username').value.trim();
        const password = document.getElementById('new-password').value.trim();
        const role = document.getElementById('new-role').value;

        let users = getStoredUsers();
        if (users.some(u => u.username === username)) {
            alert('اسم المستخدم موجود مسبقاً، يختار اسم آخر.');
            return;
        }

        users.push({ id: Date.now().toString(), username, password, full_name: fullName, role, active: true });
        saveUsers(users);
        alert('تم إضافة المستخدم بنجاح!');
        document.getElementById('add-user-form').reset();
        addUserSection.classList.add('hidden');
        addUserBtn.classList.remove('hidden');
        renderUsersTable();
        populateEmployeeFilter();
    });

    document.getElementById('apply-filter-btn').addEventListener('click', () => {
        const selectedEmp = document.getElementById('filter-employee').value;
        renderShiftsTable(selectedEmp);
    });

    renderUsersTable();
    populateEmployeeFilter();
    renderShiftsTable('all');
}

function renderUsersTable() {
    const container = document.getElementById('users-table-container');
    if (!container) return;

    const users = getStoredUsers();
    let html = `<table style="width: 100%; border-collapse: collapse; text-align: right;">
        <thead><tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;"><th style="padding: 10px;">الاسم الكامل</th><th style="padding: 10px;">اسم المستخدم</th><th style="padding: 10px;">الصلاحية</th><th style="padding: 10px;">الحالة</th><th style="padding: 10px; text-align: center;">إجراءات</th></tr></thead><tbody>`;

    users.forEach(u => {
        html += `<tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px;">${u.full_name}</td>
            <td style="padding: 10px;">${u.username}</td>
            <td style="padding: 10px;">${u.role === 'manager' ? 'مدير' : 'موظف'}</td>
            <td style="padding: 10px;">${u.active ? '<span style="color:green; font-weight:bold;">مفعل</span>' : '<span style="color:red; font-weight:bold;">معطل</span>'}</td>
            <td style="padding: 10px; text-align: center;">
                <button onclick="toggleUserStatus('${u.id}')" class="btn-${u.active ? 'danger' : 'success'}" style="padding: 5px 10px; font-size: 12px; width: auto;">${u.active ? 'تعطيل' : 'تفعيل'}</button>
            </td>
        </tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

window.toggleUserStatus = function(id) {
    let users = getStoredUsers();
    const u = users.find(user => user.id === id);
    if (u) {
        if (u.username === 'admin') {
            alert('لا يمكن تغيير حالة المدير الرئيسي!');
            return;
        }
        u.active = !u.active;
        saveUsers(users);
        renderUsersTable();
    }
};

function populateEmployeeFilter() {
    const select = document.getElementById('filter-employee');
    if (!select) return;

    const users = getStoredUsers();
    select.innerHTML = `<option value="all">كل الموظفين (كشف كلي)</option>`;
    users.forEach(u => {
        select.innerHTML += `<option value="${u.full_name}">${u.full_name}</option>`;
    });
}

function renderShiftsTable(filterEmployee = 'all') {
    const container = document.getElementById('shifts-table-container');
    if (!container) return;

    let savedShifts = JSON.parse(localStorage.getItem('gstore_shifts') || '[]');

    if (filterEmployee !== 'all') {
        savedShifts = savedShifts.filter(s => s.employee_name === filterEmployee);
    }

    if (!savedShifts.length) {
        container.innerHTML = `<p>لا توجد شفتات مسجلة تطابق هذا الاختيار.</p>`;
        return;
    }

    let html = `<table style="width: 100%; border-collapse: collapse; text-align: right;">
        <thead><tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;"><th style="padding: 10px;">الموظف</th><th style="padding: 10px;">نوع الشفت</th><th style="padding: 10px;">وقت البدء والانتهاء</th><th style="padding: 10px;">المباع الكلي</th><th style="padding: 10px;">صندوق النهاية</th><th style="padding: 10px; text-align: center;">التحكم</th></tr></thead><tbody>`;

    savedShifts.forEach((s, index) => {
        html += `<tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px;">${s.employee_name}</td>
            <td style="padding: 10px;">${s.shift_type}</td>
            <td style="padding: 10px; font-size: 12px; color: #555;">بدء: ${new Date(s.start_time).toLocaleTimeString()}<br>انتهاء: ${new Date(s.end_time).toLocaleTimeString()}</td>
            <td style="padding: 10px; color: green; font-weight: bold;">${s.total_sales} $</td>
            <td style="padding: 10px;">${s.ending_cash} $</td>
            <td style="padding: 10px; text-align: center;">
                <button onclick='printShiftReceipt(${JSON.stringify(s)})' class="btn-primary" style="padding: 5px 10px; font-size: 12px; width: auto;">طباعة</button>
                <button onclick="deleteShift(${index})" class="btn-danger" style="padding: 5px 10px; font-size: 12px; width: auto; background: #991b1b; margin-right: 5px;">حذف</button>
            </td>
        </tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

window.deleteShift = function(index) {
    if (!confirm('هل أنت متأكد من حذف تقرير الشفت؟')) return;
    let savedShifts = JSON.parse(localStorage.getItem('gstore_shifts') || '[]');
    savedShifts.splice(index, 1);
    localStorage.setItem('gstore_shifts', JSON.stringify(savedShifts));
    const currentFilter = document.getElementById('filter-employee') ? document.getElementById('filter-employee').value : 'all';
    renderShiftsTable(currentFilter);
};
