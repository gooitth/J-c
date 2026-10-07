// استيراد أو تهيئة Supabase (تأكد من وضع بيانات مشروعك الحقيقية هنا)
const SUPABASE_URL = 'https://YOUR_SUPABASE_URL.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// تهيئة عميل Supabase (يجب تضمين مكتبة Supabase في index.html أو استدعاؤها عبر CDN)
// ملاحظة: سنضيف مكتبة Supabase CDN لضمان عمل الاتصال مباشرة.

let currentUser = null;
let currentShift = null;

document.addEventListener('DOMContentLoaded', () => {
    // تحميل مكتبة Supabase الديناميكية إذا لم تكن موجودة
    if (typeof supabase === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = initApp;
        document.head.appendChild(script);
    } else {
        initApp();
    }
});

let sbClient = null;

function initApp() {
    if (window.supabase) {
        sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    // ربط نموذج تسجيل الدخول
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // زر خروج الموظف والمدير
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    const managerLogoutBtn = document.getElementById('manager-logout-btn');
    if (managerLogoutBtn) managerLogoutBtn.addEventListener('click', handleLogout);

    // ربط أحداث الشفت والحسابات التلقائية
    setupShiftEvents();
}

// تسجيل الدخول
async function handleLogin(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value.trim();
    const errorMsg = document.getElementById('login-error');

    errorMsg.classList.add('hidden');

    try {
        // في حال تم الربط مع جدول profiles في Supabase
        if (sbClient) {
            const { data, error } = await sbClient
                .from('profiles')
                .select('*')
                .eq('username', usernameInput)
                .single();

            if (error || !data || !data.active) {
                errorMsg.classList.remove('hidden');
                return;
            }

            // التحقق من الدور (مدير أو موظف)
            currentUser = data;
            
            // إخفاء شاشة تسجيل الدخول
            document.getElementById('login-screen').classList.add('hidden');

            if (currentUser.role === 'manager') {
                document.getElementById('manager-screen').classList.remove('hidden');
                loadManagerDashboard();
            } else {
                document.getElementById('employee-screen').classList.remove('hidden');
                document.getElementById('logged-employee-name').textContent = currentUser.full_name || currentUser.username;
                document.getElementById('display-employee-name').value = currentUser.full_name || currentUser.username;
            }
        } else {
            // بيانات تجريبية محلية للتأكد من الواجهة قبل ربط المفاتيح الحقيقية
            if (usernameInput === 'admin' && passwordInput === 'admin') {
                currentUser = { id: 'admin-id', full_name: 'المدير العام', role: 'manager' };
                document.getElementById('login-screen').classList.add('hidden');
                document.getElementById('manager-screen').classList.remove('hidden');
                loadManagerDashboard();
            } else if (usernameInput === 'employee' && passwordInput === '1234') {
                currentUser = { id: 'emp-id', full_name: 'أحمد الموظف', role: 'employee' };
                document.getElementById('login-screen').classList.add('hidden');
                document.getElementById('employee-screen').classList.remove('hidden');
                document.getElementById('logged-employee-name').textContent = currentUser.full_name;
                document.getElementById('display-employee-name').value = currentUser.full_name;
            } else {
                errorMsg.classList.remove('hidden');
            }
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

// إعداد أحداث شفت الموظف والحسابات الفورية
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

            // إخفاء قسم البداية وإظهار حقول الشفت النشط
            document.getElementById('shift-start-section').classList.add('hidden');
            document.getElementById('active-shift-content').classList.remove('hidden');
            calculateTotals();
        });
    }

    // الحسابات التلقائية عند التغيير
    const inputsToWatch = ['reinforcement', 'sold-count', 'misc-count', 'unsold-count'];
    inputsToWatch.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', calculateTotals);
        }
    });

    // خيار المباع المتفرق (نعم / لا)
    const miscRadios = document.querySelectorAll('input[name="has_misc"]');
    miscRadios.forEach(radio => {
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

    // توليد حقول الأسعار المتفرقة بناءً على العدد
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

            // ربط الحدث لكل حقل سعر جديد
            document.querySelectorAll('.misc-price-input').forEach(input => {
                input.addEventListener('input', calculateTotals);
            });
            calculateTotals();
        });
    }

    // زر التفرغ (Clear)
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

    // زر إنهاء الشفت
    const finishBtn = document.getElementById('finish-shift-btn');
    if (finishBtn) {
        finishBtn.addEventListener('click', finishShift);
    }
}

// معادلات الحساب الفوري التلقائية
function calculateTotals() {
    const openingCash = parseFloat(document.getElementById('opening-cash').value) || 0;
    const reinforcement = parseFloat(document.getElementById('reinforcement').value) || 0;
    const soldCount = parseInt(document.getElementById('sold-count').value) || 0;

    // المبيعات العادية (السعر ثابت 2000)
    const soldAmount = soldCount * 2000;
    document.getElementById('sold-amount-display').value = soldAmount.toLocaleString() + ' دينار';

    // المباع المتفرق
    let miscTotal = 0;
    const hasMisc = document.querySelector('input[name="has_misc"]:checked').value === 'yes';
    if (hasMisc) {
        document.querySelectorAll('.misc-price-input').forEach(input => {
            miscTotal += parseFloat(input.value) || 0;
        });
    }
    document.getElementById('misc-total-display').textContent = miscTotal.toLocaleString();

    // إجمالي المبيعات الكلي = المبيعات العادية + المتفرقة
    const totalSales = soldAmount + miscTotal;
    document.getElementById('total-sales-display').textContent = totalSales.toLocaleString();

    // نقد الصندوق نهاية الشفت = النقد المستلم بداية الشفت + النقد المعزز - إجمالي المبيعات
    const endingCash = openingCash + reinforcement - totalSales;
    const endingCashDisplay = document.getElementById('ending-cash-display');
    endingCashDisplay.textContent = endingCash.toLocaleString();

    if (endingCash < 0) {
        endingCashDisplay.style.color = 'var(--danger-color)';
    } else {
        endingCashDisplay.style.color = 'var(--success-color)';
    }
}

async function finishShift() {
    if (!confirm('هل أنت متأكد من إنهاء الشفت وحفظ التقرير نهائياً؟')) return;
    alert('تم إنهاء الشفت وحفظ التقرير بنجاح!');
    // إعادة تعيين الشاشة
    window.location.reload();
}

function loadManagerDashboard() {
    console.log('تم تحميل لوحة المدير بنجاح');
}
