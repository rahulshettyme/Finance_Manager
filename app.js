// Finance Manager Application
// Data Management and UI Logic with Firebase

// ==================== Data Storage ====================
class FinanceManager {
    constructor() {
        this.transactions = [];
        this.incomeSources = [];
        this.expenseCategories = [];
        this.expenseItems = [];
        this.currentMonth = new Date();
        this.chart = null;
        this.dataLoaded = false;
        this.user = null;
        this.unsubscribe = null;
    }

    async loadData() {
        if (!this.user) {
            console.log('User not logged in, cannot load data');
            return;
        }

        try {
            const q = db.collection('users').doc(this.user.uid).collection('transactions').orderBy('date', 'desc');

            // Listen for real-time updates
            this.unsubscribe = q.onSnapshot((querySnapshot) => {
                this.transactions = [];
                const sources = new Set();
                const categories = new Set();
                const items = new Set();

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    const transaction = {
                        id: doc.id,
                        ...data
                    };
                    this.transactions.push(transaction);

                    // Collect unique values for dropdowns
                    if (transaction.type === 'income') {
                        if (transaction.category) sources.add(transaction.category);
                    } else {
                        if (transaction.category) categories.add(transaction.category);
                        if (transaction.item) items.add(transaction.item);
                    }
                });

                this.incomeSources = Array.from(sources).sort();
                this.expenseCategories = Array.from(categories).sort();
                this.expenseItems = Array.from(items).sort();

                this.dataLoaded = true;

                // Refresh UI
                updateMonthlyView();
                renderCalendar();

                // Refresh custom dropdown options
                if (document.getElementById('incomeModal').classList.contains('active')) {
                    setupCustomDropdown('incomeSource', 'incomeSourcesList', this.incomeSources);
                }
                if (document.getElementById('expenseModal').classList.contains('active')) {
                    setupCustomDropdown('expenseItem', 'expenseItemsList', this.expenseItems);
                    setupCustomDropdown('expenseCategory', 'expenseCategoriesList', this.expenseCategories);
                }

            }, (error) => {
                console.error('Error listening to transactions:', error);

                if (error.code === 'permission-denied') {
                    // Ideally redirect to login, but auth state change handles that
                    console.log("Permission denied. User might be logged out.");
                }
            });

        } catch (error) {
            console.error('Error setting up data listener:', error);
            throw error;
        }
    }

    async addTransaction(type, amount, category, date, description, item = '') {
        if (!this.user) throw new Error('User not authenticated');

        const transaction = {
            type,
            amount: parseFloat(amount),
            category,
            item,
            date,
            description,
            timestamp: firebase.firestore.FieldValue.serverTimestamp() // For consistent ordering if dates match
        };

        try {
            await db.collection('users').doc(this.user.uid).collection('transactions').add(transaction);
            // Local data update is handled by onSnapshot listener
            return true;
        } catch (error) {
            console.error('Error adding transaction:', error);
            throw error;
        }
    }

    async updateTransaction(id, transactionData) {
        if (!this.user) throw new Error('User not authenticated');

        try {
            const updateData = {
                ...transactionData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('users').doc(this.user.uid).collection('transactions').doc(id).update(updateData);
            // Local data update is handled by onSnapshot listener
            return true;
        } catch (error) {
            console.error('Error updating transaction:', error);
            throw error;
        }
    }

    async deleteTransaction(id) {
        if (!this.user) throw new Error('User not authenticated');

        try {
            await db.collection('users').doc(this.user.uid).collection('transactions').doc(id).delete();
            // Local data update is handled by onSnapshot listener
            return true;
        } catch (error) {
            console.error('Error deleting transaction:', error);
            throw error;
        }
    }

    getMonthlyTransactions(year, month) {
        return this.transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getFullYear() === year && tDate.getMonth() === month;
        });
    }

    getDailyTransactions(year, month, day) {
        return this.transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getFullYear() === year &&
                tDate.getMonth() === month &&
                tDate.getDate() === day;
        });
    }

    calculateMonthlyTotals(year, month) {
        const monthlyTransactions = this.getMonthlyTransactions(year, month);

        const income = monthlyTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const expense = monthlyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        return { income, expense, balance: income - expense };
    }

    getExpensesByCategory(year, month) {
        const monthlyTransactions = this.getMonthlyTransactions(year, month);
        const expenses = monthlyTransactions.filter(t => t.type === 'expense');

        const categoryTotals = {};
        expenses.forEach(t => {
            if (!categoryTotals[t.category]) {
                categoryTotals[t.category] = 0;
            }
            categoryTotals[t.category] += t.amount;
        });

        return categoryTotals;
    }
}

// ==================== Initialize App ====================
const app = new FinanceManager();
app.selectedMonth = new Date(); // Track selected month for monthly view


// ==================== UI Elements ====================
const monthlyViewBtn = document.getElementById('monthlyViewBtn');
const calendarViewBtn = document.getElementById('calendarViewBtn'); // Kept original calendarViewBtn
const monthlyView = document.getElementById('monthlyView');
const calendarView = document.getElementById('calendarView'); // Kept original calendarView

const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const netBalanceEl = document.getElementById('netBalance');
const controllableExpenseEl = document.getElementById('controllableExpense');
const nonControllableExpenseEl = document.getElementById('nonControllableExpense');

const addIncomeBtn = document.getElementById('addIncomeBtn');
const addExpenseBtn = document.getElementById('addExpenseBtn');

const incomeModal = document.getElementById('incomeModal');
const expenseModal = document.getElementById('expenseModal');
const dayDetailsModal = document.getElementById('dayDetailsModal');
const breakdownModal = document.getElementById('breakdownModal');
const categoryDetailsModal = document.getElementById('categoryDetailsModal');

const incomeForm = document.getElementById('incomeForm');
const expenseForm = document.getElementById('expenseForm');

const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const currentMonthEl = document.getElementById('currentMonth');
const calendarGrid = document.getElementById('calendarGrid');

const expenseSummaryContainer = document.getElementById('expenseSummaryContainer');
const noDataMessage = document.getElementById('noDataMessage');
const chartSection = document.getElementById('chartSection');

// Add logout button to dashboard (Re-implementing logic with Firebase)
const logoutBtn = document.createElement('button');
logoutBtn.textContent = 'Logout';
logoutBtn.style.cssText = `
    position: fixed;
    top: 1rem;
    right: 1rem;
    padding: 0.5rem 1rem;
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid rgba(239, 68, 68, 0.5);
    border-radius: 8px;
    color: #ef4444;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s ease;
    z-index: 999;
`;
logoutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
        // Redirect handled by onAuthStateChanged
    } catch (error) {
        console.error('Logout error', error);
        alert('Failed to logout');
    }
});
document.body.appendChild(logoutBtn);

// ==================== View Toggle ====================
monthlyViewBtn.addEventListener('click', () => {
    monthlyView.classList.add('active');
    calendarView.classList.remove('active');
    monthlyViewBtn.classList.add('active');
    calendarViewBtn.classList.remove('active');
    updateMonthlyView();
});

calendarViewBtn.addEventListener('click', () => {
    calendarView.classList.add('active');
    monthlyView.classList.remove('active');
    calendarViewBtn.classList.add('active');
    monthlyViewBtn.classList.remove('active');
    renderCalendar();
});

// ==================== Modal Management ====================
function resetForm(form, type) {
    form.reset();
    delete form.dataset.editId;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = type === 'income' ? 'Add Income' : 'Add Expense';

    // Reset date to today
    const dateInput = form.querySelector('input[type="date"]');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
}

addIncomeBtn.addEventListener('click', () => {
    resetForm(incomeForm, 'income');
    openModal(incomeModal);
    setupCustomDropdown('incomeSource', 'incomeSourcesList', app.incomeSources);
});

addExpenseBtn.addEventListener('click', () => {
    resetForm(expenseForm, 'expense');
    openModal(expenseModal);
    setupCustomDropdown('expenseItem', 'expenseItemsList', app.expenseItems);
    setupCustomDropdown('expenseCategory', 'expenseCategoriesList', app.expenseCategories);
});

// ==================== Modal Management ====================
function openEditModal(transaction) {
    // Close the day details modal first if it's open
    closeModal(dayDetailsModal);

    if (transaction.type === 'income') {
        incomeForm.dataset.editId = transaction.id;
        document.getElementById('incomeAmount').value = transaction.amount;
        document.getElementById('incomeSource').value = transaction.category; // Source is stored as category
        document.getElementById('incomeDate').value = transaction.date.split('T')[0];
        document.getElementById('incomeDescription').value = transaction.description || '';

        const submitBtn = incomeForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Update Income';

        openModal(incomeModal);
        setupCustomDropdown('incomeSource', 'incomeSourcesList', app.incomeSources);
    } else {
        expenseForm.dataset.editId = transaction.id;
        document.getElementById('expenseAmount').value = transaction.amount;
        document.getElementById('expenseItem').value = transaction.item || '';
        document.getElementById('expenseCategory').value = transaction.category;
        document.getElementById('expenseDate').value = transaction.date.split('T')[0];
        document.getElementById('expenseDescription').value = transaction.description || '';

        const submitBtn = expenseForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Update Expense';

        openModal(expenseModal);
        setupCustomDropdown('expenseItem', 'expenseItemsList', app.expenseItems);
        setupCustomDropdown('expenseCategory', 'expenseCategoriesList', app.expenseCategories);
    }
}

// Close buttons
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', (e) => {
        const modalId = e.target.getAttribute('data-modal');
        closeModal(document.getElementById(modalId));
    });
});

function openModal(modal) {
    modal.classList.add('active');
}

function closeModal(modal) {
    modal.classList.remove('active');
}

function setDefaultDate(inputId) {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById(inputId).value = today;
}

function setupCustomDropdown(inputId, listId, options) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    if (!input || !list) return;

    // Filter and show all options initially on focus
    const showAllOptions = () => {
        renderOptions(options);
        list.classList.add('active');
    };

    input.addEventListener('focus', showAllOptions);
    input.addEventListener('click', showAllOptions);

    input.addEventListener('input', (e) => {
        const value = e.target.value.toLowerCase();
        const filtered = options.filter(opt => opt.toLowerCase().includes(value));
        renderOptions(filtered);
        list.classList.add('active');
    });

    // Handle selection and closing
    function renderOptions(opts) {
        list.innerHTML = '';
        if (opts.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'dropdown-item no-results';
            noResults.textContent = 'No suggestions found (type to add new)';
            list.appendChild(noResults);
            return;
        }

        opts.forEach(opt => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.textContent = opt;
            item.addEventListener('mousedown', (e) => {
                // Use mousedown instead of click to fire before blur
                e.preventDefault();
                input.value = opt;
                list.classList.remove('active');
                // Trigger input event to ensure any validation fires
                input.dispatchEvent(new Event('input'));
            });
            list.appendChild(item);
        });
    }

    // Close when clicking outside
    document.addEventListener('mousedown', (e) => {
        if (!input.contains(e.target) && !list.contains(e.target)) {
            list.classList.remove('active');
        }
    });

    // Handle keyboard navigation (Optional basic version)
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            list.classList.remove('active');
            input.blur();
        }
    });
}

incomeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const amount = document.getElementById('incomeAmount').value;
    const source = document.getElementById('incomeSource').value;
    const date = document.getElementById('incomeDate').value;
    const description = document.getElementById('incomeDescription').value;
    const editId = incomeForm.dataset.editId;

    const submitBtn = incomeForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        if (editId) {
            await app.updateTransaction(editId, {
                type: 'income',
                amount: parseFloat(amount),
                category: source,
                date,
                description
            });
            showNotification('Income updated successfully!', 'success');
        } else {
            await app.addTransaction('income', amount, source, date, description);
            showNotification('Income added successfully!', 'success');
        }

        incomeForm.reset();
        closeModal(incomeModal);
    } catch (error) {
        showNotification(editId ? 'Failed to update income.' : 'Failed to add income.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
});

expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const amount = document.getElementById('expenseAmount').value;
    const item = document.getElementById('expenseItem').value;
    const category = document.getElementById('expenseCategory').value;
    const date = document.getElementById('expenseDate').value;
    const description = document.getElementById('expenseDescription').value;
    const editId = expenseForm.dataset.editId;

    const submitBtn = expenseForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        if (editId) {
            await app.updateTransaction(editId, {
                type: 'expense',
                amount: parseFloat(amount),
                category,
                item,
                date,
                description
            });
            showNotification('Expense updated successfully!', 'success');
        } else {
            await app.addTransaction('expense', amount, category, date, description, item);
            showNotification('Expense added successfully!', 'success');
        }

        expenseForm.reset();
        closeModal(expenseModal);
    } catch (error) {
        showNotification(editId ? 'Failed to update expense.' : 'Failed to add expense.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
});

// ==================== Monthly View Update ====================
const prevMonthMonthly = document.getElementById('prevMonthMonthly');
const nextMonthMonthly = document.getElementById('nextMonthMonthly');
const currentMonthMonthly = document.getElementById('currentMonthMonthly');

prevMonthMonthly.addEventListener('click', () => {
    app.selectedMonth.setMonth(app.selectedMonth.getMonth() - 1);
    updateMonthlyView();
});

nextMonthMonthly.addEventListener('click', () => {
    app.selectedMonth.setMonth(app.selectedMonth.getMonth() + 1);
    updateMonthlyView();
});

function updateMonthlyView() {
    const year = app.selectedMonth.getFullYear();
    const month = app.selectedMonth.getMonth();

    // Update month display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    currentMonthMonthly.textContent = `${monthNames[month]} ${year}`;

    const totals = app.calculateMonthlyTotals(year, month);

    // Update summary cards
    totalIncomeEl.textContent = `₹${totals.income.toFixed(2)}`;
    totalExpenseEl.textContent = `₹${totals.expense.toFixed(2)}`;
    netBalanceEl.textContent = `₹${totals.balance.toFixed(2)}`;

    // Calculate Controllable vs Non-Controllable
    const monthlyTransactions = app.getMonthlyTransactions(year, month);
    const expenses = monthlyTransactions.filter(t => t.type === 'expense');

    let controllable = 0;
    let nonControllable = 0;

    expenses.forEach(t => {
        const cat = t.category.trim().toLowerCase();
        const item = (t.item || '').trim().toLowerCase();
        const isNonControllable = cat === 'emi' || cat === 'emis' || cat === 'investment' || cat === 'investments' || (cat === 'home' && item === 'home');

        if (isNonControllable) {
            nonControllable += t.amount;
        } else {
            controllable += t.amount;
        }
    });

    controllableExpenseEl.textContent = `₹${controllable.toFixed(2)}`;
    nonControllableExpenseEl.textContent = `₹${nonControllable.toFixed(2)}`;

    // Update summary table
    updateExpenseSummary(year, month);
}

function updateExpenseSummary(year, month) {
    const categoryData = app.getExpensesByCategory(year, month);
    const categories = Object.keys(categoryData);

    if (categories.length === 0) {
        chartSection.style.display = 'none';
        return;
    }

    chartSection.style.display = 'block';
    noDataMessage.style.display = 'none';

    // Sort categories by amount descending
    const sortedCategories = categories.sort((a, b) => categoryData[b] - categoryData[a]);
    const total = Object.values(categoryData).reduce((a, b) => a + b, 0);
    const colors = generateColors(categories.length);

    let tableHTML = `
        <table class="summary-table">
            <thead>
                <tr>
                    <th>Category</th>
                    <th style="text-align: right;">Amount</th>
                    <th style="text-align: right;">%</th>
                </tr>
            </thead>
            <tbody>
    `;

    sortedCategories.forEach((cat, i) => {
        const amount = categoryData[cat];
        const percentage = ((amount / total) * 100).toFixed(1);
        const color = colors[i % colors.length];

        tableHTML += `
            <tr>
                <td>
                    <span class="category-dot" style="background-color: ${color}"></span>
                    ${cat}
                </td>
                <td style="text-align: right; font-weight: 600;">₹${amount.toFixed(0)}</td>
                <td style="text-align: right; color: var(--text-secondary); font-size: 0.85rem;">${percentage}%</td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    expenseSummaryContainer.innerHTML = tableHTML;
}

function generateColors(count) {
    const colors = [
        '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
        '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
        '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
        '#ec4899', '#f43f5e'
    ];

    // Return colors, cycling if needed
    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
}

// ==================== Calendar View ====================
function renderCalendar() {
    const year = app.currentMonth.getFullYear();
    const month = app.currentMonth.getMonth();

    // Update header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    currentMonthEl.textContent = `${monthNames[month]} ${year}`;

    // Clear grid
    calendarGrid.innerHTML = '';

    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        header.style.fontWeight = '600';
        header.style.textAlign = 'center';
        header.style.padding = '10px';
        header.style.color = '#b8b8d1';
        calendarGrid.appendChild(header);
    });

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Add previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dayEl = createCalendarDay(day, year, month - 1, true);
        calendarGrid.appendChild(dayEl);
    }

    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = createCalendarDay(day, year, month, false);
        calendarGrid.appendChild(dayEl);
    }

    // Add next month's leading days
    const totalCells = calendarGrid.children.length - 7; // Subtract headers
    const remainingCells = 42 - totalCells; // 6 rows * 7 days
    for (let day = 1; day <= remainingCells; day++) {
        const dayEl = createCalendarDay(day, year, month + 1, true);
        calendarGrid.appendChild(dayEl);
    }
}

function createCalendarDay(day, year, month, isOtherMonth) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    if (isOtherMonth) {
        dayEl.classList.add('other-month');
    }

    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    dayEl.appendChild(dayNumber);

    if (!isOtherMonth) {
        const transactions = app.getDailyTransactions(year, month, day);

        const income = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const expense = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        if (income > 0) {
            const incomeEl = document.createElement('div');
            incomeEl.className = 'day-income';
            incomeEl.textContent = `+₹${income.toFixed(0)}`;
            dayEl.appendChild(incomeEl);
        }

        if (expense > 0) {
            const expenseEl = document.createElement('div');
            expenseEl.className = 'day-expense';
            expenseEl.textContent = `-₹${expense.toFixed(0)}`;
            dayEl.appendChild(expenseEl);
        }

        // Add click handler to show details
        if (transactions.length > 0) {
            dayEl.style.cursor = 'pointer';
            dayEl.addEventListener('click', () => {
                showDayDetails(day, month, year, transactions);
            });
        }
    }

    return dayEl;
}

prevMonthBtn.addEventListener('click', () => {
    app.currentMonth.setMonth(app.currentMonth.getMonth() - 1);
    renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
    app.currentMonth.setMonth(app.currentMonth.getMonth() + 1);
    renderCalendar();
});

// ==================== Day Details Modal ====================
function showDayDetails(day, month, year, transactions) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    // Store the date on the modal for refreshing after deletion
    dayDetailsModal.dataset.day = day;
    dayDetailsModal.dataset.month = month;
    dayDetailsModal.dataset.year = year;

    document.getElementById('dayDetailsTitle').textContent =
        `Transactions - ${monthNames[month]} ${day}, ${year}`;

    const content = document.getElementById('dayDetailsContent');
    content.innerHTML = '';

    if (transactions.length === 0) {
        content.innerHTML = '<p style="text-align: center; color: #b8b8d1;">No transactions for this day</p>';
    } else {
        transactions.forEach(t => {
            const item = document.createElement('div');
            item.className = `transaction-item ${t.type}`;

            const itemName = t.type === 'expense' && t.item ? t.item : t.category;

            item.innerHTML = `
                <div class="transaction-header">
                    <span class="transaction-category">${itemName}</span>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <span class="transaction-amount ${t.type}">₹${t.amount.toFixed(2)}</span>
                        <button class="edit-transaction-btn" data-id="${t.id}" title="Edit transaction">✎</button>
                        <button class="delete-transaction-btn" data-id="${t.id}" title="Delete transaction">🗑️</button>
                    </div>
                </div>
                ${t.description ? `<div class="transaction-description">${t.description}</div>` : ''}
            `;

            content.appendChild(item);
        });

        // Add listeners for delete buttons
        document.querySelectorAll('.delete-transaction-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                // Stop propagation to prevent hitting row click if any
                e.stopPropagation();

                if (confirm('Are you sure you want to delete this transaction?')) {
                    const id = btn.getAttribute('data-id'); // ID is string in Firestore
                    try {
                        await app.deleteTransaction(id);

                        // Success notification
                        showNotification('Transaction deleted successfully', 'success');

                        // Refresh modal content immediately
                        const { day, month, year } = dayDetailsModal.dataset;
                        const d = parseInt(day);
                        const m = parseInt(month);
                        const y = parseInt(year);

                        // Fetch latest transactions for that day
                        const updatedTransactions = app.getDailyTransactions(y, m, d);

                        // Self-refresh
                        showDayDetails(d, m, y, updatedTransactions);

                    } catch (error) {
                        showNotification('Failed to delete transaction', 'error');
                    }
                }
            });
        });

        // Add listeners for edit buttons
        document.querySelectorAll('.edit-transaction-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const transaction = transactions.find(t => t.id === id);
                if (transaction) {
                    openEditModal(transaction);
                }
            });
        });
    }

    // Add "Add Expense" button to modal footer
    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    const addEBtn = document.createElement('button');
    addEBtn.className = 'action-btn expense-btn add-btn-small';
    addEBtn.innerHTML = '<span class="btn-icon">+</span> Add Expense';
    addEBtn.addEventListener('click', () => {
        resetForm(expenseForm, 'expense');

        // Pre-fill date from day view
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        document.getElementById('expenseDate').value = dateStr;

        openModal(expenseModal);
        setupCustomDropdown('expenseItem', 'expenseItemsList', app.expenseItems);
        setupCustomDropdown('expenseCategory', 'expenseCategoriesList', app.expenseCategories);
    });

    footer.appendChild(addEBtn);
    content.appendChild(footer);

    openModal(dayDetailsModal);
}

// ==================== Breakdown Tables ====================
// Breakdown modal event listeners
const incomeCard = document.getElementById('incomeCard');
const controllableCard = document.getElementById('controllableCard');
const nonControllableCard = document.getElementById('nonControllableCard');

incomeCard.addEventListener('click', () => {
    showBreakdown('income');
});

if (controllableCard) {
    controllableCard.addEventListener('click', () => {
        showBreakdown('expense', 'controllable');
    });
}

if (nonControllableCard) {
    nonControllableCard.addEventListener('click', () => {
        showBreakdown('expense', 'non-controllable');
    });
}

function showBreakdown(type, group = null) {
    const year = app.selectedMonth.getFullYear();
    const month = app.selectedMonth.getMonth();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    let titleText = `${type === 'income' ? 'Income' : 'Expense'} Breakdown`;
    if (group) {
        titleText = `${group.charAt(0).toUpperCase() + group.slice(1)} Expenses`;
    }

    document.getElementById('breakdownTitle').textContent =
        `${titleText} - ${monthNames[month]} ${year}`;

    const content = document.getElementById('breakdownContent');
    content.innerHTML = '';

    let transactions = app.getMonthlyTransactions(year, month)
        .filter(t => t.type === type);

    if (group) {
        transactions = transactions.filter(t => {
            const cat = t.category.trim().toLowerCase();
            const item = (t.item || '').trim().toLowerCase();
            const isNonControllable = (cat === 'emi' || cat === 'emis' || cat === 'investment' || cat === 'investments' || (cat === 'home' && item === 'home'));
            return group === 'non-controllable' ? isNonControllable : !isNonControllable;
        });
    }

    if (transactions.length === 0) {
        content.innerHTML = '<p style="text-align: center; color: #666;">No data available</p>';
        openModal(breakdownModal);
        return;
    }

    // Group by category
    const categoryData = {};
    transactions.forEach(t => {
        if (!categoryData[t.category]) {
            categoryData[t.category] = [];
        }
        categoryData[t.category].push(t);
    });

    // Sort categories by total amount (descending)
    const sortedCategories = Object.entries(categoryData)
        .sort((a, b) => {
            const totalA = a[1].reduce((sum, t) => sum + t.amount, 0);
            const totalB = b[1].reduce((sum, t) => sum + t.amount, 0);
            return totalB - totalA;
        });

    // Calculate grand total
    const grandTotal = transactions.reduce((sum, t) => sum + t.amount, 0);

    // Generate table DOM instead of string for easier click handling
    const table = document.createElement('table');
    table.className = 'breakdown-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Category</th>
                <th style="text-align: right;">Amount</th>
                <th style="text-align: right;">% of Group</th>
            </tr>
        </thead>
    `;

    const tbody = document.createElement('tbody');

    sortedCategories.forEach(([category, items]) => {
        const catTotal = items.reduce((sum, t) => sum + t.amount, 0);
        const percentage = ((catTotal / grandTotal) * 100).toFixed(1);

        const row = document.createElement('tr');
        row.className = 'clickable';
        row.innerHTML = `
            <td class="breakdown-category">${category}</td>
            <td class="breakdown-amount">₹${catTotal.toFixed(2)}</td>
            <td class="breakdown-percentage">${percentage}%</td>
        `;
        row.addEventListener('click', () => {
            showCategoryDetails(category, items);
        });
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    content.appendChild(table);

    const summary = document.createElement('div');
    summary.style.cssText = 'margin-top: 1rem; padding: 1rem; background: var(--card-bg); border-radius: 8px; display: flex; justify-content: space-between; align-items: center; font-weight: 600;';
    summary.innerHTML = `
        <span style="color: var(--text-secondary);">Total Transactions: ${transactions.length}</span>
        <span style="font-size: 1.2rem; color: var(--text-primary);">Total Amount: ₹${grandTotal.toFixed(2)}</span>
    `;
    content.appendChild(summary);

    openModal(breakdownModal);
}

function showCategoryDetails(category, items) {
    document.getElementById('categoryDetailsTitle').textContent = `${category} Details`;
    const content = document.getElementById('categoryDetailsContent');
    content.innerHTML = '';

    // Sort items by date descending
    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    let tableHTML = `
        <table class="breakdown-table">
            <thead>
                <tr>
                    <th>Item / Source</th>
                    <th style="text-align: center;">Date</th>
                    <th style="text-align: right;">Amount</th>
                </tr>
            </thead>
            <tbody>
    `;

    items.forEach(t => {
        const itemName = t.type === 'expense' && t.item ? t.item : t.category;
        const dateObj = new Date(t.date);
        const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

        tableHTML += `
            <tr>
                <td class="breakdown-category">${itemName}</td>
                <td class="breakdown-count">${dateStr}</td>
                <td class="breakdown-amount">₹${t.amount.toFixed(2)}</td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
        <div style="margin-top: 1rem; padding: 1rem; background: var(--card-bg); border-radius: 8px; text-align: right; font-weight: 600;">
            <span style="font-size: 1.2rem; color: var(--text-primary);">Total: ₹${items.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}</span>
        </div>
    `;

    content.innerHTML = tableHTML;
    openModal(categoryDetailsModal);
}

// ==================== Initialize on Load ====================
document.addEventListener('DOMContentLoaded', () => {
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const incomeDate = document.getElementById('incomeDate');
    const expenseDate = document.getElementById('expenseDate');
    if (incomeDate) incomeDate.value = today;
    if (expenseDate) expenseDate.value = today;
});

// ==================== Authentication State ====================
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('User signed in:', user.email);

        // Whitelist check
        if (typeof allowedUsers !== 'undefined' && !allowedUsers.includes(user.email.toLowerCase())) {
            console.log('Unauthorized access attempt:', user.email);
            auth.signOut().then(() => {
                window.location.href = 'index.html?error=unauthorized';
            });
            return;
        }

        app.user = user;
        app.loadData();
    } else {
        console.log('User signed out');
        app.user = null;
        if (app.unsubscribe) {
            app.unsubscribe();
            app.unsubscribe = null;
        }
        window.location.href = 'index.html';
    }
});

// ==================== Notifications ====================
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        padding: 1rem 2rem;
        border-radius: 12px;
        color: white;
        font-weight: 600;
        z-index: 9999;
        animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        background: ${type === 'success' ? 'var(--income-gradient)' : 'var(--expense-gradient)'};
        display: flex;
        align-items: center;
        gap: 0.5rem;
    `;

    const icon = type === 'success' ? '✅' : '⚠️';
    notification.innerHTML = `<span>${icon}</span> ${message}`;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Add common animations to document if they don't exist
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);
