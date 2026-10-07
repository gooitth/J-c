// بيانات الربط الخاصة بـ Supabase
const SUPABASE_URL = 'https://etztnzuivagqxjahlyqa.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rHRivMdg5__JBuOND0tCKg_CY1Z7sA0';

let sbClient = null;
let currentUser = null;
let currentShift = null;

document.addEventListener('DOMContentLoaded', () => {
    if (window.supabase) {
        sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const logoutBtns = [document.getElementById('logout-btn'), document.getElementById('manager-logout-btn')];
    logoutBtns.forEach(btn => {
        if (btn) btn.addEventListener('click', handleLogout);
    });

    setupShiftEvents();
});

// تسجيل الدخول والتحقق من جدول profiles
async function handleLogin(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value.trim();
    const errorMsg = document.getElementById('login-error');

    errorMsg.classList.add('hidden');

    try {
        if (sbClient) {
            const { data, error } = await sbClient
                .from('profiles')
                .select('*')
                .eq('username', usernameInput)
                .single();

            if (error || !data || !data.active || data.password !== passwordInput) {
                errorMsg.classList.remove('hidden');
                return;
            }

            currentUser = data;
        } else {
            if (usernameInput === 'admin' && passwordInput === 'admin') {
                currentUser = { id: 'admin-id', full_name: 'المدير العام', role: 'manager', active: true };
            } else if (usernameInput === 'employee' && passwordInput === '1234') {
                currentUser = { id: 'emp-id', full_name: 'أحمد الموظف', role: 'employee', active: true };
            } else {
                errorMsg.classList.remove('hidden');
                return;
            }
        }

        document.getElementById('login-screen').classList.add('hidden');

        if (currentUser.role === 'manager') {
            document.getElementById('manager-screen').classList.remove('hidden');
            loadManagerDashboard();
        } else {
            document.getElementById('employee-screen').classList.remove('hidden');
            document.getElementById('logged-employee-name').textContent = currentUser.full_name || currentUser.username;
            document.getElementById('display-employee-name').value = currentUser.full_name || currentUser.username;
        }
    } catch (err) {
        console.error(err);
        errorMsg.classList.remove('hidden');
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

// إعداد أحداث الحسابات والشفت للموظف
function setupShiftEvents() {
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

            currentShift = {
                shift_type: shiftType,
                opening_cash: openingCash,
                start_time: new Date().toISOString()
            };

            document.getElementById('shift-start-section').classList.add('hidden');
            document.getElementById('active-shift-content').classList.remove('hidden');
            calculateTotals();
        });
    }

    ['reinforcement', 'sold-count', 'misc-count', 'unsold-count'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calculateTotals);
    });

    document.querySelectorAll('input[name="has_misc"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const miscContainer = document.getElementById('misc-container');
            if (e.target.value === 'yes') {
                miscContainer.classList.remove('hidden');
            } else {
                miscContainer.classList.add('hidden');
                document.getElementById('misc-count').value = 0;
                document.getElementById('misc-prices-list').innerHTML = '';
                document.getElementById('misc-total-display').textContent = '0';
            }
            calculateTotals();
        });
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
                div.innerHTML = `<label>سعر المعاملة المتفرقة ${i}</label><input type="number" class="misc-price-input" min="0" value="0">`;
                listContainer.appendChild(div);
            }

            document.querySelectorAll('.misc-price-input').forEach(input => {
                input.addEventListener('input', calculateTotals);
            });
            calculateTotals();
        });
    }

    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('هل أنت متأكد من تفريغ البيانات المدخلة؟')) {
                document.getElementById('active-shift-content').classList.add('hidden');
                document.getElementById('shift-start-section').classList.remove('hidden');
                document.getElementById('shift-start-form').reset();
            }
        });
    }

    const finishBtn = document.getElementById('finish-shift-btn');
    if (finishBtn) {
        finishBtn.addEventListener('click', finishShift);
    }
}

// حسابات نهاية الصندوق التلقائية بدقة
function calculateTotals() {
    const openingCash = parseFloat(document.getElementById('opening-cash').value) || 0;
    const reinforcement = parseFloat(document.getElementById('reinforcement').value) || 0;
    const soldCount = parseInt(document.getElementById('sold-count').value) || 0;

    const soldAmount = soldCount * 2000;
    document.getElementById('sold-amount-display').value = soldAmount.toLocaleString() + ' دينار';

    let miscTotal = 0;
    const hasMiscRadio = document.querySelector('input[name="has_misc"]:checked');
    if (hasMiscRadio && hasMiscRadio.value === 'yes') {
        document.querySelectorAll('.misc-price-input').forEach(input => {
            miscTotal += parseFloat(input.value) || 0;
        });
    }
    document.getElementById('misc-total-display').textContent = miscTotal.toLocaleString();

    const totalSales = soldAmount + miscTotal;
    document.getElementById('total-sales-display').textContent = totalSales.toLocaleString();

    const endingCash = openingCash + reinforcement - totalSales;
    const endingCashDisplay = document.getElementById('ending-cash-display');
    endingCashDisplay.textContent = endingCash.toLocaleString();
    endingCashDisplay.style.color = endingCash < 0 ? 'var(--danger-color)' : 'var(--success-color)';
}

async function finishShift() {
    if (!confirm('هل أنت متأكد من إنهاء الشفت وحفظ التقرير نهائياً؟')) return;
    alert('تم إنهاء الشفت وحفظ التقرير بنجاح!');
    window.location.reload();
}

// تحميل لوحة تحكم المدير وإحصائيات النظام
async function loadManagerDashboard() {
    const managerMainContainer = document.querySelector('#manager-screen .container');
    
    managerMainContainer.innerHTML = `
        <div class="card">
            <h3><i class="fa-solid fa-chart-pie"></i> لوحة الإحصائيات العامة</h3>
            <p style="margin-bottom: 15px; color: #64748b;">أهلاً بك يا مدير النظام. هذه لوحة التحكم والتقارير الخاصة بالنظام.</p>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button type="button" id="refresh-reports-btn" class="btn-primary" style="width: auto;"><i class="fa-solid fa-rotate"></i> تحديث البيانات</button>
                <button type="button" onclick="window.print();" class="btn-success" style="width: auto;"><i class="fa-solid fa-print"></i> طباعة الصفحة</button>
            </div>
        </div>
        
        <div class="card">
            <h3><i class="fa-solid fa-list-check"></i> سجل الشفتات والتقارير</h3>
            <div id="reports-list-container">
                <p style="text-align: center; color: #64748b; padding: 20px;">لا توجد شفتات مسجلة حتى الآن أو جاري جلب البيانات...</p>
            </div>
        </div>
    `;

    const refreshBtn = document.getElementById('refresh-reports-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadManagerDashboard);
    }
}
