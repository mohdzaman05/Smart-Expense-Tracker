// =========================================================
// EXPENSES JAVASCRIPT - SMART EXPENSE TRACKER
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. AUTH CHECK & PROFILE INIT
    const savedUser = JSON.parse(localStorage.getItem("user"));
    if (!savedUser) {
        window.location.href = "index.html";
        return;
    }

    const userName = savedUser.name || "User";
    const sidebarUserName = document.getElementById("sidebarUserName");
    if (sidebarUserName) sidebarUserName.textContent = userName;

    const userAvatarText = document.getElementById("userAvatarText");
    if (userAvatarText) {
        const initials = userName
            .split(" ")
            .map(n => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2);
        userAvatarText.textContent = initials || "U";
    }

    // 2. DOM ELEMENTS
    const addExpenseBtn = document.getElementById("addExpenseBtn");
    const expenseFormSection = document.getElementById("expenseFormSection");
    const cancelBtn = document.getElementById("cancelBtn");
    const closeFormTopBtn = document.getElementById("closeFormTopBtn");
    const expenseForm = document.getElementById("expenseForm");

    const expenseTableBody = document.getElementById("expenseTableBody");
    const emptyMessage = document.getElementById("emptyMessage");

    const totalExpense = document.getElementById("totalExpense");
    const monthlyExpense = document.getElementById("monthlyExpense");
    const totalTransactions = document.getElementById("totalTransactions");

    const searchExpense = document.getElementById("searchExpense");
    const categoryFilter = document.getElementById("categoryFilter");
    const sortExpense = document.getElementById("sortExpense");

    // 3. TOAST HELPER
    function showToast(message, type = "info") {
        const container = document.getElementById("toastContainer");
        if (!container) return;

        const toast = document.createElement("div");
        toast.className = `toast ${type}`;

        let iconClass = "fa-solid fa-circle-info";
        if (type === "success") iconClass = "fa-solid fa-circle-check";
        if (type === "danger") iconClass = "fa-solid fa-circle-exclamation";
        if (type === "warning") iconClass = "fa-solid fa-triangle-exclamation";

        toast.innerHTML = `
            <i class="${iconClass} toast-icon"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateX(100%) scale(0.9)";
            toast.style.transition = "all 0.3s ease";
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 3500);
    }

    // Category Preset Icons
    const categoryIcons = {
        Food: "fa-utensils",
        Travel: "fa-car",
        Shopping: "fa-bag-shopping",
        Bills: "fa-bolt",
        Entertainment: "fa-film",
        Education: "fa-book-open",
        Health: "fa-heart-pulse",
        Rent: "fa-house",
        Investment: "fa-chart-line",
        Other: "fa-box"
    };

    // 4. SHOW / HIDE FORM
    function showForm() {
        expenseFormSection.classList.remove("hidden");
        document.getElementById("expenseDate").value = new Date().toISOString().split("T")[0];
        document.getElementById("expenseName").focus();
    }

    function hideForm() {
        expenseForm.reset();
        expenseFormSection.classList.add("hidden");
    }

    if (addExpenseBtn) addExpenseBtn.addEventListener("click", showForm);
    if (cancelBtn) cancelBtn.addEventListener("click", hideForm);
    if (closeFormTopBtn) closeFormTopBtn.addEventListener("click", hideForm);

    // 5. USER CONTEXT & STORAGE HELPERS
    function getCurrentUserEmail() {
        try {
            const u = JSON.parse(localStorage.getItem("user"));
            if (u && u.email) return u.email.trim().toLowerCase();
        } catch (e) {}
        return "guest";
    }

    function getExpenses() {
        const key = `expenses_${getCurrentUserEmail()}`;
        return JSON.parse(localStorage.getItem(key)) || [];
    }

    function saveExpenses(expenses) {
        const key = `expenses_${getCurrentUserEmail()}`;
        localStorage.setItem(key, JSON.stringify(expenses));
    }

    // 6. SAVE EXPENSE
    expenseForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const name = document.getElementById("expenseName").value.trim();
        const amount = parseFloat(document.getElementById("amount").value);
        const category = document.getElementById("category").value;
        const date = document.getElementById("expenseDate").value;
        const payment = document.getElementById("paymentMethod").value;
        const notes = document.getElementById("notes").value.trim();

        if (!name || isNaN(amount) || amount <= 0 || !category || !date) {
            showToast("Please fill all required fields correctly", "warning");
            return;
        }

        const expense = {
            id: Date.now(),
            name,
            amount,
            category,
            date,
            payment,
            notes
        };

        const expenses = getExpenses();
        expenses.unshift(expense);
        saveExpenses(expenses);

        showToast("Expense logged successfully!", "success");

        hideForm();
        renderExpenses();
    });

    // 7. DISPLAY EXPENSES
    function renderExpenses() {
        let expenses = getExpenses();
        const searchQuery = (searchInput ? searchInput.value : "").toLowerCase().trim();
        const selectedCategory = categoryFilter ? categoryFilter.value : "all";
        const selectedSort = sortFilter ? sortFilter.value : "newest";

        const minAmountVal = document.getElementById("minAmountFilter") ? parseFloat(document.getElementById("minAmountFilter").value) : NaN;
        const maxAmountVal = document.getElementById("maxAmountFilter") ? parseFloat(document.getElementById("maxAmountFilter").value) : NaN;
        const startDateVal = document.getElementById("expenseStartDate") ? document.getElementById("expenseStartDate").value : "";
        const endDateVal = document.getElementById("expenseEndDate") ? document.getElementById("expenseEndDate").value : "";

        let filtered = expenses.filter(exp => {
            // Search match (name or notes or amount)
            const nameMatch = (exp.name || "").toLowerCase().includes(searchQuery);
            const notesMatch = (exp.notes || "").toLowerCase().includes(searchQuery);
            const amountMatch = String(exp.amount || "").includes(searchQuery);
            const matchesSearch = nameMatch || notesMatch || amountMatch;

            // Category match
            const matchesCategory = selectedCategory === "all" || exp.category === selectedCategory;

            // Amount match
            const amount = Number(exp.amount || 0);
            const matchesMin = isNaN(minAmountVal) || amount >= minAmountVal;
            const matchesMax = isNaN(maxAmountVal) || amount <= maxAmountVal;

            // Date match
            let matchesDate = true;
            if (startDateVal && exp.date && exp.date < startDateVal) matchesDate = false;
            if (endDateVal && exp.date && exp.date > endDateVal) matchesDate = false;

            return matchesSearch && matchesCategory && matchesMin && matchesMax && matchesDate;
        });

        // Sorting
        if (selectedSort === "newest") {
            filtered.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        } else if (selectedSort === "oldest") {
            filtered.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
        } else if (selectedSort === "highest") {
            filtered.sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
        } else if (selectedSort === "lowest") {
            filtered.sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0));
        }

        renderTable(filtered);
    }

    // Filter listeners
    if (searchInput) searchInput.addEventListener("input", renderExpenses);
    if (categoryFilter) categoryFilter.addEventListener("change", renderExpenses);
    if (sortFilter) sortFilter.addEventListener("change", renderExpenses);

    const minAmountInput = document.getElementById("minAmountFilter");
    const maxAmountInput = document.getElementById("maxAmountFilter");
    const startInput = document.getElementById("expenseStartDate");
    const endInput = document.getElementById("expenseEndDate");
    const clearFiltersBtn = document.getElementById("btnClearExpenseFilters");

    if (minAmountInput) minAmountInput.addEventListener("input", renderExpenses);
    if (maxAmountInput) maxAmountInput.addEventListener("input", renderExpenses);
    if (startInput) startInput.addEventListener("change", renderExpenses);
    if (endInput) endInput.addEventListener("change", renderExpenses);

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            if (categoryFilter) categoryFilter.value = "all";
            if (sortFilter) sortFilter.value = "newest";
            if (minAmountInput) minAmountInput.value = "";
            if (maxAmountInput) maxAmountInput.value = "";
            if (startInput) startInput.value = "";
            if (endInput) endInput.value = "";
            renderExpenses();
        });
    }

    function renderTable(expenses) {
        expenseTableBody.innerHTML = "";

        if (expenses.length === 0) {
            emptyMessage.classList.remove("hidden");
        } else {
            emptyMessage.classList.add("hidden");
        }

        expenses.forEach(function (expense) {
            const row = document.createElement("tr");

            // Format date
            let formattedDate = expense.date;
            try {
                if (expense.date) {
                    const [y, m, d] = expense.date.split("-");
                    formattedDate = new Date(y, m - 1, d).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                    });
                }
            } catch (e) {}

            const iconClass = categoryIcons[expense.category] || "fa-tag";

            row.innerHTML = `
                <td><strong>${formattedDate}</strong></td>
                <td>
                    <div style="font-weight: 600; color: var(--text-primary);">${escapeHTML(expense.name)}</div>
                    ${expense.notes ? `<div style="font-size: 11.5px; color: var(--text-muted);">${escapeHTML(expense.notes)}</div>` : ''}
                </td>
                <td>
                    <span class="cat-pill-badge">
                        <i class="fa-solid ${iconClass}"></i>
                        <span>${escapeHTML(expense.category)}</span>
                    </span>
                </td>
                <td>
                    <span class="payment-tag">${escapeHTML(expense.payment || "UPI")}</span>
                </td>
                <td>
                    <span class="amount-expense-text">- ₹${Number(expense.amount).toLocaleString("en-IN")}</span>
                </td>
                <td>
                    <div class="table-action-btns">
                        <button class="btn-table-del" onclick="window.deleteExpense(${expense.id})" title="Delete expense">
                            <i class="fa-regular fa-trash-can"></i> Delete
                        </button>
                    </div>
                </td>
            `;

            expenseTableBody.appendChild(row);
        });

        updateSummary();
    }

    // 8. DELETE EXPENSE
    window.deleteExpense = function (id) {
        if (!confirm("Are you sure you want to delete this expense record?")) {
            return;
        }

        let expenses = getExpenses();
        expenses = expenses.filter(function (expense) {
            return String(expense.id) !== String(id);
        });

        saveExpenses(expenses);
        showToast("Expense record removed", "danger");
        renderExpenses();
    };

    // 9. UPDATE SUMMARY
    function updateSummary() {
        const allExpenses = getExpenses();
        let total = 0;

        allExpenses.forEach(function (expense) {
            total += Number(expense.amount || 0);
        });

        totalExpense.textContent = "₹" + total.toLocaleString("en-IN");
        totalTransactions.textContent = allExpenses.length;

        // Current month
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        let monthlyTotal = 0;

        allExpenses.forEach(function (expense) {
            if (!expense.date) return;
            const expenseDate = new Date(expense.date);

            if (
                expenseDate.getMonth() === currentMonth &&
                expenseDate.getFullYear() === currentYear
            ) {
                monthlyTotal += Number(expense.amount || 0);
            }
        });

        monthlyExpense.textContent = "₹" + monthlyTotal.toLocaleString("en-IN");
    }

    const displayExpenses = renderExpenses;

    // 10. FILTER & SEARCH EVENT LISTENERS
    if (searchExpense) searchExpense.addEventListener("input", renderExpenses);
    if (categoryFilter) categoryFilter.addEventListener("change", renderExpenses);
    if (sortExpense) sortExpense.addEventListener("change", renderExpenses);

    // 11. SIDEBAR MOBILE & LOGOUT
    const mobileBtn = document.getElementById("mobileMenuBtn");
    const sidebar = document.getElementById("appSidebar");

    if (mobileBtn && sidebar) {
        mobileBtn.addEventListener("click", () => {
            sidebar.classList.toggle("open");
        });

        document.addEventListener("click", (e) => {
            if (window.innerWidth <= 900 && !sidebar.contains(e.target) && !mobileBtn.contains(e.target)) {
                sidebar.classList.remove("open");
            }
        });
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async function () {
            if (confirm("Are you sure you want to sign out?")) {
                if (localStorage.getItem("gdrive_auto_backup") === "true" && window.GoogleDriveSync && window.GoogleDriveSync.accessToken) {
                    showToast("Saving cloud backup...", "info");
                    try {
                        await window.GoogleDriveSync.backupNow();
                    } catch (e) {}
                }
                localStorage.removeItem("user");
                sessionStorage.removeItem("gdrive_token");
                window.location.href = "index.html";
            }
        });
    }

    function escapeHTML(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Initial Display
    renderExpenses();
});