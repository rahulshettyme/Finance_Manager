// Finance Manager Application
// Data Management and UI Logic

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
    }

    async loadData() {
        try {
            const response = await fetch('/api/data');
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/';
                    return;
                }
                throw new Error(`Failed to load data (${response.status})`);
            }
            const data = await response.json();
            this.transactions = data.transactions || [];
            this.incomeSources = data.incomeSources || [];
            this.expenseCategories = data.expenseCategories || [];
            this.expenseItems = data.expenseItems || [];
            this.dataLoaded = true;
            return data;
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    async addTransaction(type, amount, category, date, description, item = '') {
        const transaction = {
            type,
            amount: parseFloat(amount),
            category,
            item,
            date,
            description
        };

        try {
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(transaction)
            });

            if (!response.ok) {
                throw new Error('Failed to add transaction');
            }

            const result = await response.json();

            // Update local data
            this.transactions.push(result.transaction);

            // Update dropdown lists locally
            if (type === 'income') {
                if (category && !this.incomeSources.includes(category)) {
                    this.incomeSources.push(category);
                }
            } else if (type === 'expense') {
                if (category && !this.expenseCategories.includes(category)) {
                    this.expenseCategories.push(category);
                }
                if (item && !this.expenseItems.includes(item)) {
                    this.expenseItems.push(item);
                }
            }

            return result.transaction;
        } catch (error) {
            console.error('Error adding transaction:', error);
            throw error;
        }
    }

    async updateTransaction(id, transactionData) {
        try {
            const response = await fetch(`/api/transactions/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(transactionData)
            });

            if (!response.ok) {
                throw new Error('Failed to update transaction');
            }

            const result = await response.json();

            // Update local data
            const index = this.transactions.findIndex(t => t.id === id);
            if (index !== -1) {
                this.transactions[index] = result.transaction;
            }

            // Update dropdown lists locally
            if (transactionData.type === 'income') {
                if (transactionData.category && !this.incomeSources.includes(transactionData.category)) {
                    this.incomeSources.push(transactionData.category);
                }
            } else if (transactionData.type === 'expense') {
                if (transactionData.category && !this.expenseCategories.includes(transactionData.category)) {
                    this.expenseCategories.push(transactionData.category);
                }
                if (transactionData.item && !this.expenseItems.includes(transactionData.item)) {
                    this.expenseItems.push(transactionData.item);
                }
            }

            return result.transaction;
        } catch (error) {
            console.error('Error updating transaction:', error);
            throw error;
        }
    }

    async deleteTransaction(id) {
        try {
            const response = await fetch(`/api/transactions/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete transaction');
            }

            // Remove from local data
            this.transactions = this.transactions.filter(t => t.id !== id);
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

// Load data from server
async function initializeApp() {
    try {
        await app.loadData();
        updateMonthlyView();
        renderCalendar();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        alert(`Error: ${error.message}. Please refresh the page.`);
    }
}

// ==================== UI Elements ====================
const monthlyViewBtn = document.getElementById('monthlyViewBtn');
const calendarViewBtn = document.getElementById('calendarViewBtn'); // Kept original calendarViewBtn
const monthlyView = document.getElementById('monthlyView');
const calendarView = document.getElementById('calendarView'); // Kept original calendarView

const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const netBalanceEl = document.getElementById('netBalance');

const addIncomeBtn = document.getElementById('addIncomeBtn');
const addExpenseBtn = document.getElementById('addExpenseBtn');

const incomeModal = document.getElementById('incomeModal');
const expenseModal = document.getElementById('expenseModal');
const dayDetailsModal = document.getElementById('dayDetailsModal');
const breakdownModal = document.getElementById('breakdownModal');

const incomeForm = document.getElementById('incomeForm');
const expenseForm = document.getElementById('expenseForm');

const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const currentMonthEl = document.getElementById('currentMonth');
const calendarGrid = document.getElementById('calendarGrid');

const expenseChartCanvas = document.getElementById('expenseChart');
const noDataMessage = document.getElementById('noDataMessage');

// Add logout button to dashboard
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
    await fetch('/api/logout');
    window.location.href = '/';
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
    populateDropdown('incomeSources', app.incomeSources);
});

addExpenseBtn.addEventListener('click', () => {
    resetForm(expenseForm, 'expense');
    openModal(expenseModal);
    populateDropdown('expenseCategories', app.expenseCategories);
    populateDropdown('expenseItems', app.expenseItems);
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
        populateDropdown('incomeSources', app.incomeSources);
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
        populateDropdown('expenseCategories', app.expenseCategories);
        populateDropdown('expenseItems', app.expenseItems);
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

function populateDropdown(datalistId, options) {
    const datalist = document.getElementById(datalistId);
    datalist.innerHTML = '';
    options.forEach(option => {
        const optionEl = document.createElement('option');
        optionEl.value = option;
        datalist.appendChild(optionEl);
    });
}

// ==================== Form Submissions ====================
incomeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const amount = document.getElementById('incomeAmount').value;
    const source = document.getElementById('incomeSource').value;
    const date = document.getElementById('incomeDate').value;
    const description = document.getElementById('incomeDescription').value;
    const editId = incomeForm.dataset.editId;

    try {
        if (editId) {
            await app.updateTransaction(parseInt(editId), {
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
        updateMonthlyView();
        renderCalendar();

        // If we were in day details view, refresh it
        if (dayDetailsModal.classList.contains('active')) {
            const d = new Date(date);
            const updatedTransactions = app.getDailyTransactions(d.getFullYear(), d.getMonth(), d.getDate());
            showDayDetails(d.getDate(), d.getMonth(), d.getFullYear(), updatedTransactions);
        }
    } catch (error) {
        showNotification(editId ? 'Failed to update income.' : 'Failed to add income.', 'error');
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

    try {
        if (editId) {
            await app.updateTransaction(parseInt(editId), {
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
        updateMonthlyView();
        renderCalendar();

        // If we were in day details view, refresh it
        if (dayDetailsModal.classList.contains('active')) {
            const d = new Date(date);
            const updatedTransactions = app.getDailyTransactions(d.getFullYear(), d.getMonth(), d.getDate());
            showDayDetails(d.getDate(), d.getMonth(), d.getFullYear(), updatedTransactions);
        }
    } catch (error) {
        showNotification(editId ? 'Failed to update expense.' : 'Failed to add expense.', 'error');
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

    // Update chart
    updateExpenseChart(year, month);
}

function updateExpenseChart(year, month) {
    const categoryData = app.getExpensesByCategory(year, month);
    const categories = Object.keys(categoryData);
    const amounts = Object.values(categoryData);

    if (categories.length === 0) {
        // No data
        if (app.chart) {
            app.chart.destroy();
            app.chart = null;
        }
        expenseChartCanvas.style.display = 'none';
        noDataMessage.style.display = 'block';
        return;
    }

    expenseChartCanvas.style.display = 'block';
    noDataMessage.style.display = 'none';

    // Generate vibrant colors for categories
    const colors = generateColors(categories.length);

    if (app.chart) {
        app.chart.destroy();
    }

    const ctx = expenseChartCanvas.getContext('2d');
    app.chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: categories,
            datasets: [{
                data: amounts,
                backgroundColor: colors,
                borderColor: '#1a1a2e',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#1a1a2e',
                        font: {
                            size: 14,
                            family: 'Inter',
                            weight: '600'
                        },
                        padding: 20,
                        generateLabels: function (chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                const dataset = data.datasets[0];
                                const total = dataset.data.reduce((a, b) => a + b, 0);

                                return data.labels.map((label, i) => {
                                    const value = dataset.data[i];
                                    const percentage = ((value / total) * 100).toFixed(1);

                                    return {
                                        text: `${label}: ₹${value.toFixed(0)} (${percentage}%)`,
                                        fillStyle: dataset.backgroundColor[i],
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ₹${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
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
                    const id = parseInt(btn.getAttribute('data-id'));
                    try {
                        await app.deleteTransaction(id);

                        // Refresh data
                        const updatedTransactions = app.getDailyTransactions(year, month, day);
                        showDayDetails(day, month, year, updatedTransactions);
                        updateMonthlyView();
                        renderCalendar();
                        showNotification('Transaction deleted successfully', 'success');
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
                const id = parseInt(btn.getAttribute('data-id'));
                const transaction = transactions.find(t => t.id === id);
                if (transaction) {
                    openEditModal(transaction);
                }
            });
        });
    }

    openModal(dayDetailsModal);
}

// ==================== Breakdown Tables ====================
// Breakdown modal event listeners
const incomeCard = document.getElementById('incomeCard');
const expenseCard = document.getElementById('expenseCard');

incomeCard.addEventListener('click', () => {
    showBreakdown('income');
});

expenseCard.addEventListener('click', () => {
    showBreakdown('expense');
});

function showBreakdown(type) {
    const year = app.selectedMonth.getFullYear();
    const month = app.selectedMonth.getMonth();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    document.getElementById('breakdownTitle').textContent =
        `${type === 'income' ? 'Income' : 'Expense'} Breakdown - ${monthNames[month]} ${year}`;

    const transactions = app.getMonthlyTransactions(year, month)
        .filter(t => t.type === type);

    if (transactions.length === 0) {
        document.getElementById('breakdownContent').innerHTML =
            `<p style="text-align: center; color: #b8b8d1; padding: 2rem;">No ${type} data for this month</p>`;
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

    // Generate table HTML
    let tableHTML = `
        <table class="breakdown-table">
            <thead>
                <tr>
                    <th>Item / Source</th>
                    <th>Category</th>
                    <th style="text-align: center;">Date</th>
                    <th style="text-align: right;">Amount</th>
                </tr>
            </thead>
            <tbody>
    `;

    sortedCategories.forEach(([category, items]) => {
        // Sort items within category by amount (descending)
        items.sort((a, b) => b.amount - a.amount);

        items.forEach(t => {
            const itemName = type === 'expense' && t.item ? t.item : t.category;
            const dateObj = new Date(t.date);
            const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

            tableHTML += `
                <tr>
                    <td class="breakdown-category">${itemName}</td>
                    <td style="color: var(--text-secondary);">${category}</td>
                    <td class="breakdown-count">${dateStr}</td>
                    <td class="breakdown-amount">₹${t.amount.toFixed(2)}</td>
                </tr>
            `;
        });
    });

    tableHTML += `
            </tbody>
        </table>
        <div style="margin-top: 1rem; padding: 1rem; background: var(--card-bg); border-radius: 8px; display: flex; justify-content: space-between; align-items: center; font-weight: 600;">
            <span style="color: var(--text-secondary);">Total Transactions: ${transactions.length}</span>
            <span style="font-size: 1.2rem; color: var(--text-primary);">Total Amount: ₹${grandTotal.toFixed(2)}</span>
        </div>
    `;

    document.getElementById('breakdownContent').innerHTML = tableHTML;
    openModal(breakdownModal);
}

// ==================== Initialize Application ====================
// Load data when page loads
initializeApp();

// ==================== Notifications ====================
function showNotification(message, type) {
    // Simple console notification for now
    // Could be enhanced with a toast notification system
    console.log(`${type.toUpperCase()}: ${message}`);
}

// ==================== Initialize on Load ====================
document.addEventListener('DOMContentLoaded', () => {
    updateMonthlyView();
    setDefaultDate('incomeDate');
    setDefaultDate('expenseDate');
});
