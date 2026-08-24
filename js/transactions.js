// =========================================================
// TRANSACTIONS JAVASCRIPT - SMART EXPENSE TRACKER
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. AUTHENTICATION & USER PROFILE
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

    // 2. CATEGORY PRESETS WITH ICONS
    const CATEGORIES = {
        expense: [
            { id: "Food", label: "🍔 Food", icon: "fa-utensils" },
            { id: "Travel", label: "🚕 Travel", icon: "fa-car" },
            { id: "Shopping", label: "🛍️ Shopping", icon: "fa-bag-shopping" },
            { id: "Bills", label: "💡 Bills", icon: "fa-bolt" },
            { id: "Entertainment", label: "🎬 Entertainment", icon: "fa-film" },
            { id: "Education", label: "📚 Education", icon: "fa-book-open" },
            { id: "Health", label: "🏥 Health", icon: "fa-heart-pulse" },
            { id: "Rent", label: "🏠 Rent", icon: "fa-house" },
            { id: "Investment", label: "📈 Investment", icon: "fa-chart-line" },
            { id: "Other", label: "📦 Other", icon: "fa-box" }
        ],
        income: [
            { id: "Salary", label: "💼 Salary", icon: "fa-briefcase" },
            { id: "Freelance", label: "💻 Freelance", icon: "fa-laptop-code" },
            { id: "Business", label: "🏢 Business", icon: "fa-building" },
            { id: "Investments", label: "📈 Investments", icon: "fa-arrow-trend-up" },
            { id: "Allowance", label: "🎁 Allowance", icon: "fa-gift" },
            { id: "Dividend", label: "💵 Dividend", icon: "fa-money-bill-wave" },
            { id: "Bonus", label: "🎉 Bonus", icon: "fa-award" },
            { id: "Other", label: "📦 Other", icon: "fa-box" }
        ]
    };

    // 3. DOM ELEMENTS
    const totalIncomeDisplay = document.getElementById("totalIncomeDisplay");
    const totalExpenseDisplay = document.getElementById("totalExpenseDisplay");
    const netBalanceDisplay = document.getElementById("netBalanceDisplay");
    const totalCountDisplay = document.getElementById("totalCountDisplay");
    const showingCountBadge = document.getElementById("showingCountBadge");

    const searchInput = document.getElementById("searchInput");
    const clearSearchBtn = document.getElementById("clearSearchBtn");
    const typeFilter = document.getElementById("typeFilter");
    const categoryFilter = document.getElementById("categoryFilter");
    const paymentFilter = document.getElementById("paymentFilter");
    const dateRangeFilter = document.getElementById("dateRangeFilter");
    const customDateRow = document.getElementById("customDateRow");
    const startDateInput = document.getElementById("startDate");
    const endDateInput = document.getElementById("endDate");
    const sortFilter = document.getElementById("sortFilter");
    const resetFiltersBtn = document.getElementById("resetFiltersBtn");

    const transactionTableBody = document.getElementById("transactionTableBody");
    const emptyState = document.getElementById("emptyState");
    const emptyStateText = document.getElementById("emptyStateText");
    const emptyAddBtn = document.getElementById("emptyAddBtn");

    const exportCsvBtn = document.getElementById("exportCsvBtn");
    const openAddModalBtn = document.getElementById("openAddModalBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    // Modal elements
    const transactionModal = document.getElementById("transactionModal");
    const modalTitle = document.getElementById("modalTitle");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const cancelModalBtn = document.getElementById("cancelModalBtn");
    const transactionForm = document.getElementById("transactionForm");
    const editTransactionId = document.getElementById("editTransactionId");
    const typeExpenseBtn = document.getElementById("typeExpenseBtn");
    const typeIncomeBtn = document.getElementById("typeIncomeBtn");
    const transName = document.getElementById("transName");
    const transAmount = document.getElementById("transAmount");
    const transCategory = document.getElementById("transCategory");
    const transDate = document.getElementById("transDate");
    const transPayment = document.getElementById("transPayment");
    const transNotes = document.getElementById("transNotes");

    // Detail Modal elements
    const detailModal = document.getElementById("detailModal");
    const closeDetailModalBtn = document.getElementById("closeDetailModalBtn");
    const closeDetailBtn = document.getElementById("closeDetailBtn");
    const printDetailBtn = document.getElementById("printDetailBtn");
    const detailAmountBox = document.getElementById("detailAmountBox");
    const detailTypeBadge = document.getElementById("detailTypeBadge");
    const detailAmount = document.getElementById("detailAmount");
    const detailName = document.getElementById("detailName");
    const detailDate = document.getElementById("detailDate");
    const detailCategory = document.getElementById("detailCategory");
    const detailPayment = document.getElementById("detailPayment");
    const detailId = document.getElementById("detailId");
    const detailNotes = document.getElementById("detailNotes");

    let currentSelectedType = "expense";

    // 4. USER CONTEXT & STORAGE HELPERS
    function getCurrentUserEmail() {
        try {
            const u = JSON.parse(localStorage.getItem("user"));
            if (u && u.email) return u.email.trim().toLowerCase();
        } catch (e) {}
        return "guest";
    }

    function getStoredExpenses() {
        const key = `expenses_${getCurrentUserEmail()}`;
        return JSON.parse(localStorage.getItem(key)) || [];
    }

    function setStoredExpenses(expenses) {
        const key = `expenses_${getCurrentUserEmail()}`;
        localStorage.setItem(key, JSON.stringify(expenses));
    }

    function getStoredIncomes() {
        const key = `incomes_${getCurrentUserEmail()}`;
        return JSON.parse(localStorage.getItem(key)) || [];
    }

    function setStoredIncomes(incomes) {
        const key = `incomes_${getCurrentUserEmail()}`;
        localStorage.setItem(key, JSON.stringify(incomes));
    }

    function getAllTransactions() {
        const expenses = getStoredExpenses().map(exp => ({
            ...exp,
            type: "expense",
            id: exp.id || Date.now() + Math.floor(Math.random() * 1000)
        }));

        const incomes = getStoredIncomes().map(inc => ({
            ...inc,
            type: "income",
            id: inc.id || Date.now() + Math.floor(Math.random() * 1000)
        }));

        return [...expenses, ...incomes];
    }

    // 5. TOAST NOTIFICATION
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

    // 6. POPULATE CATEGORIES
    function populateFormCategories(type, selectedCategory = "") {
        transCategory.innerHTML = "";
        const list = CATEGORIES[type] || CATEGORIES.expense;

        list.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat.id;
            opt.textContent = cat.label;
            if (cat.id === selectedCategory) {
                opt.selected = true;
            }
            transCategory.appendChild(opt);
        });
    }

    function populateCategoryFilter() {
        if (!categoryFilter) return;
        const currentFilterValue = categoryFilter.value;
        categoryFilter.innerHTML = `<option value="all">All Categories</option>`;

        const allCats = new Set();
        [...CATEGORIES.expense, ...CATEGORIES.income].forEach(cat => {
            if (!allCats.has(cat.id)) {
                allCats.add(cat.id);
                const opt = document.createElement("option");
                opt.value = cat.id;
                opt.textContent = cat.label;
                categoryFilter.appendChild(opt);
            }
        });

        if (currentFilterValue) {
            categoryFilter.value = currentFilterValue;
        }
    }

    // 7. MODAL MANAGEMENT
    function setModalType(type) {
        currentSelectedType = type;
        if (type === "expense") {
            typeExpenseBtn.className = "type-toggle-btn active expense";
            typeIncomeBtn.className = "type-toggle-btn income";
        } else {
            typeIncomeBtn.className = "type-toggle-btn active income";
            typeExpenseBtn.className = "type-toggle-btn expense";
        }
        populateFormCategories(type);
    }

    typeExpenseBtn.addEventListener("click", () => setModalType("expense"));
    typeIncomeBtn.addEventListener("click", () => setModalType("income"));

    function openAddModal() {
        modalTitle.textContent = "Add New Transaction";
        editTransactionId.value = "";
        transactionForm.reset();
        
        const today = new Date().toISOString().split("T")[0];
        transDate.value = today;
        
        setModalType("expense");
        transactionModal.classList.remove("hidden");
        transName.focus();
    }

    function openEditModal(id, type) {
        const transactions = getAllTransactions();
        const trans = transactions.find(t => String(t.id) === String(id) && t.type === type);
        if (!trans) return;

        modalTitle.textContent = "Edit Transaction";
        editTransactionId.value = trans.id;
        transName.value = trans.name || "";
        transAmount.value = trans.amount || "";
        transDate.value = trans.date || "";
        transPayment.value = trans.payment || "UPI";
        transNotes.value = trans.notes || "";

        setModalType(trans.type);
        populateFormCategories(trans.type, trans.category);
        transCategory.value = trans.category;

        transactionModal.classList.remove("hidden");
    }

    function closeModal() {
        transactionModal.classList.add("hidden");
        transactionForm.reset();
    }

    if (openAddModalBtn) openAddModalBtn.addEventListener("click", openAddModal);
    if (emptyAddBtn) emptyAddBtn.addEventListener("click", openAddModal);
    if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener("click", closeModal);

    transactionModal.addEventListener("click", (e) => {
        if (e.target === transactionModal) closeModal();
    });

    // 8. SAVE (CREATE / UPDATE) TRANSACTION
    transactionForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const id = editTransactionId.value ? Number(editTransactionId.value) || editTransactionId.value : Date.now();
        const type = currentSelectedType;
        const name = transName.value.trim();
        const amount = parseFloat(transAmount.value);
        const category = transCategory.value;
        const date = transDate.value;
        const payment = transPayment.value;
        const notes = transNotes.value.trim();

        if (!name || isNaN(amount) || amount <= 0 || !category || !date) {
            showToast("Please fill all required fields properly", "danger");
            return;
        }

        const transData = {
            id,
            name,
            amount,
            category,
            date,
            payment,
            notes
        };

        if (editTransactionId.value) {
            let expenses = getStoredExpenses().filter(t => String(t.id) !== String(id));
            let incomes = getStoredIncomes().filter(t => String(t.id) !== String(id));

            if (type === "expense") {
                expenses.unshift(transData);
            } else {
                incomes.unshift(transData);
            }

            setStoredExpenses(expenses);
            setStoredIncomes(incomes);
            showToast("Transaction updated successfully!", "success");
        } else {
            if (type === "expense") {
                const expenses = getStoredExpenses();
                expenses.unshift(transData);
                setStoredExpenses(expenses);
            } else {
                const incomes = getStoredIncomes();
                incomes.unshift(transData);
                setStoredIncomes(incomes);
            }
            showToast("Transaction added successfully!", "success");
        }

        closeModal();
        renderTransactions();
    });

    // 9. DELETE TRANSACTION
    window.deleteTransaction = function(id, type) {
        if (!confirm("Are you sure you want to delete this transaction?")) {
            return;
        }

        if (type === "expense") {
            let expenses = getStoredExpenses();
            expenses = expenses.filter(t => String(t.id) !== String(id));
            setStoredExpenses(expenses);
        } else {
            let incomes = getStoredIncomes();
            incomes = incomes.filter(t => String(t.id) !== String(id));
            setStoredIncomes(incomes);
        }

        showToast("Transaction deleted successfully", "danger");
        renderTransactions();
    };

    window.editTransaction = function(id, type) {
        openEditModal(id, type);
    };

    // 10. DETAIL / RECEIPT MODAL
    window.viewTransactionDetail = function(id, type) {
        const transactions = getAllTransactions();
        const trans = transactions.find(t => String(t.id) === String(id) && t.type === type);
        if (!trans) return;

        const isIncome = trans.type === "income";
        detailAmountBox.className = `receipt-amount-box ${isIncome ? "income" : "expense"}`;
        detailTypeBadge.className = `badge-pill ${isIncome ? "income" : "expense"}`;
        detailTypeBadge.textContent = isIncome ? "Income" : "Expense";
        detailAmount.textContent = `${isIncome ? "+" : "-"} ₹${trans.amount.toLocaleString("en-IN")}`;
        detailName.textContent = trans.name;

        detailDate.textContent = formatDate(trans.date);
        
        const catList = CATEGORIES[trans.type] || [];
        const catObj = catList.find(c => c.id === trans.category);
        detailCategory.textContent = catObj ? catObj.label : trans.category;

        detailPayment.textContent = trans.payment || "-";
        detailId.textContent = `#TRX-${String(trans.id).slice(-6)}`;
        detailNotes.textContent = trans.notes || "None";

        // AI Expense Analysis
        const aiAnalysisText = document.getElementById("detailAIAnalysisText");
        const aiAnalysisBox = document.getElementById("detailAIAnalysisBox");
        if (aiAnalysisText && aiAnalysisBox) {
            if (isIncome) {
                aiAnalysisText.innerHTML = `• Classified under <strong>${trans.category}</strong> income stream.<br>• Boosts your monthly liquidity and savings ratio.`;
            } else if (window.AIEngine) {
                const analysis = window.AIEngine.analyzeSingleExpense(trans);
                aiAnalysisText.innerHTML = analysis || "Standard recorded expenditure.";
            }
        }

        detailModal.classList.remove("hidden");
    };

    function closeDetailModal() {
        detailModal.classList.add("hidden");
    }

    if (closeDetailModalBtn) closeDetailModalBtn.addEventListener("click", closeDetailModal);
    if (closeDetailBtn) closeDetailBtn.addEventListener("click", closeDetailModal);
    detailModal.addEventListener("click", (e) => {
        if (e.target === detailModal) closeDetailModal();
    });

    if (printDetailBtn) {
        printDetailBtn.addEventListener("click", () => {
            window.print();
        });
    }

    // 11. DATE UTILITIES
    function formatDate(dateStr) {
        if (!dateStr) return "-";
        try {
            const [year, month, day] = dateStr.split("-");
            const date = new Date(year, month - 1, day);
            return date.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            });
        } catch (e) {
            return dateStr;
        }
    }

    function isDateInPeriod(dateStr, period) {
        if (!dateStr) return false;
        const transDateObj = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (period === "today") {
            const tDate = new Date(dateStr);
            tDate.setHours(0, 0, 0, 0);
            return tDate.getTime() === today.getTime();
        }

        if (period === "this_week") {
            const currentDay = today.getDay();
            const firstDayOfWeek = new Date(today);
            firstDayOfWeek.setDate(today.getDate() - currentDay);
            firstDayOfWeek.setHours(0, 0, 0, 0);
            return transDateObj >= firstDayOfWeek;
        }

        if (period === "this_month") {
            return transDateObj.getMonth() === today.getMonth() &&
                   transDateObj.getFullYear() === today.getFullYear();
        }

        if (period === "custom") {
            const start = startDateInput && startDateInput.value ? new Date(startDateInput.value) : null;
            const end = endDateInput && endDateInput.value ? new Date(endDateInput.value) : null;
            if (start) start.setHours(0, 0, 0, 0);
            if (end) end.setHours(23, 59, 59, 999);

            if (start && transDateObj < start) return false;
            if (end && transDateObj > end) return false;
            return true;
        }

        return true;
    }

    // 12. FILTER & SORT LOGIC
    function getFilteredAndSortedTransactions() {
        let transactions = getAllTransactions();

        // Search Query
        const search = searchInput ? searchInput.value.trim().toLowerCase() : "";
        if (search) {
            transactions = transactions.filter(t => {
                const name = (t.name || "").toLowerCase();
                const notes = (t.notes || "").toLowerCase();
                const category = (t.category || "").toLowerCase();
                const payment = (t.payment || "").toLowerCase();
                const amount = String(t.amount || "");
                return name.includes(search) ||
                       notes.includes(search) ||
                       category.includes(search) ||
                       payment.includes(search) ||
                       amount.includes(search);
            });
        }

        // Type Filter
        if (typeFilter && typeFilter.value !== "all") {
            transactions = transactions.filter(t => t.type === typeFilter.value);
        }

        // Category Filter
        if (categoryFilter && categoryFilter.value !== "all") {
            transactions = transactions.filter(t => t.category === categoryFilter.value);
        }

        // Payment Method Filter
        if (paymentFilter && paymentFilter.value !== "all") {
            transactions = transactions.filter(t => t.payment === paymentFilter.value);
        }

        // Date Range Filter
        if (dateRangeFilter && dateRangeFilter.value !== "all") {
            transactions = transactions.filter(t => isDateInPeriod(t.date, dateRangeFilter.value));
        }

        // Sorting
        const sort = sortFilter ? sortFilter.value : "newest";
        transactions.sort((a, b) => {
            if (sort === "newest" || sort === "date_desc") {
                return new Date(b.date || 0) - new Date(a.date || 0);
            }
            if (sort === "oldest" || sort === "date_asc") {
                return new Date(a.date || 0) - new Date(b.date || 0);
            }
            if (sort === "highest" || sort === "amount_desc") {
                return Number(b.amount || 0) - Number(a.amount || 0);
            }
            if (sort === "lowest" || sort === "amount_asc") {
                return Number(a.amount || 0) - Number(b.amount || 0);
            }
            return 0;
        });

        return transactions;
    }

    // 13. RENDER TABLE
    function renderTransactions() {
        const allTransactions = getAllTransactions();
        const filteredTransactions = getFilteredAndSortedTransactions();

        let totalIncome = 0;
        let totalExpense = 0;

        allTransactions.forEach(t => {
            if (t.type === "income") {
                totalIncome += Number(t.amount) || 0;
            } else {
                totalExpense += Number(t.amount) || 0;
            }
        });

        const netBalance = totalIncome - totalExpense;

        if (totalIncomeDisplay) totalIncomeDisplay.textContent = `₹${totalIncome.toLocaleString("en-IN")}`;
        if (totalExpenseDisplay) totalExpenseDisplay.textContent = `₹${totalExpense.toLocaleString("en-IN")}`;
        if (netBalanceDisplay) {
            netBalanceDisplay.textContent = `${netBalance < 0 ? "-" : ""}₹${Math.abs(netBalance).toLocaleString("en-IN")}`;
            netBalanceDisplay.style.color = netBalance < 0 ? "#ef4444" : "#0f172a";
        }
        if (totalCountDisplay) totalCountDisplay.textContent = allTransactions.length;

        if (showingCountBadge) {
            showingCountBadge.textContent = `Showing ${filteredTransactions.length} of ${allTransactions.length} records`;
        }

        transactionTableBody.innerHTML = "";

        if (filteredTransactions.length === 0) {
            emptyState.classList.remove("hidden");
            if (allTransactions.length === 0) {
                emptyStateText.textContent = "You haven't recorded any transactions yet. Start tracking your income and expenses!";
            } else {
                emptyStateText.textContent = "No transactions match your current search or filter criteria.";
            }
        } else {
            emptyState.classList.add("hidden");

            filteredTransactions.forEach(trans => {
                const isIncome = trans.type === "income";
                const catList = CATEGORIES[trans.type] || [];
                const catObj = catList.find(c => c.id === trans.category);
                const categoryLabel = catObj ? catObj.label : trans.category;

                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><strong>${formatDate(trans.date)}</strong></td>
                    <td>
                        <div class="trx-title-cell">
                            <span class="trx-title-main">${escapeHtml(trans.name)}</span>
                            ${trans.notes ? `<span class="trx-title-notes">${escapeHtml(trans.notes)}</span>` : ""}
                        </div>
                    </td>
                    <td>
                        <span class="badge-pill ${trans.type}">
                            ${isIncome ? "Income" : "Expense"}
                        </span>
                    </td>
                    <td>
                        <span class="cat-pill-badge">
                            ${categoryLabel}
                        </span>
                    </td>
                    <td>
                        <span class="payment-tag">${escapeHtml(trans.payment || "UPI")}</span>
                    </td>
                    <td>
                        <span class="amount-text ${trans.type}">
                            ${isIncome ? "+" : "-"} ₹${Number(trans.amount).toLocaleString("en-IN")}
                        </span>
                    </td>
                    <td style="text-align: right;">
                        <div class="action-btn-group" style="justify-content: flex-end;">
                            <button class="action-icon-btn" onclick="viewTransactionDetail('${trans.id}', '${trans.type}')" title="View Receipt">
                                <i class="fa-regular fa-file-lines"></i>
                            </button>
                            <button class="action-icon-btn" onclick="editTransaction('${trans.id}', '${trans.type}')" title="Edit">
                                <i class="fa-regular fa-pen-to-square"></i>
                            </button>
                            <button class="action-icon-btn delete" onclick="deleteTransaction('${trans.id}', '${trans.type}')" title="Delete">
                                <i class="fa-regular fa-trash-can"></i>
                            </button>
                        </div>
                    </td>
                `;
                transactionTableBody.appendChild(tr);
            });
        }
    }

    function escapeHtml(str) {
        if (!str) return "";
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // 14. EVENT LISTENERS FOR CONTROLS
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            if (clearSearchBtn) {
                clearSearchBtn.style.display = searchInput.value.trim().length > 0 ? "block" : "none";
            }
            renderTransactions();
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener("click", () => {
            searchInput.value = "";
            clearSearchBtn.style.display = "none";
            renderTransactions();
            searchInput.focus();
        });
    }

    if (typeFilter) typeFilter.addEventListener("change", renderTransactions);
    if (categoryFilter) categoryFilter.addEventListener("change", renderTransactions);
    if (paymentFilter) paymentFilter.addEventListener("change", renderTransactions);
    if (sortFilter) sortFilter.addEventListener("change", renderTransactions);

    if (dateRangeFilter) {
        dateRangeFilter.addEventListener("change", () => {
            if (dateRangeFilter.value === "custom") {
                customDateRow.classList.remove("hidden");
            } else {
                customDateRow.classList.add("hidden");
            }
            renderTransactions();
        });
    }

    if (startDateInput) startDateInput.addEventListener("change", renderTransactions);
    if (endDateInput) endDateInput.addEventListener("change", renderTransactions);

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            if (clearSearchBtn) clearSearchBtn.style.display = "none";
            if (typeFilter) typeFilter.value = "all";
            if (categoryFilter) categoryFilter.value = "all";
            if (paymentFilter) paymentFilter.value = "all";
            if (dateRangeFilter) dateRangeFilter.value = "all";
            if (customDateRow) customDateRow.classList.add("hidden");
            if (startDateInput) startDateInput.value = "";
            if (endDateInput) endDateInput.value = "";
            if (sortFilter) sortFilter.value = "newest";
            renderTransactions();
            showToast("Filters reset to default", "info");
        });
    }

    // 15. CSV EXPORT
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener("click", () => {
            const transactions = getFilteredAndSortedTransactions();
            if (transactions.length === 0) {
                showToast("No transactions available to export", "danger");
                return;
            }

            const headers = ["ID", "Date", "Type", "Title", "Category", "Payment Method", "Amount (INR)", "Notes"];
            const csvRows = [headers.join(",")];

            transactions.forEach(t => {
                const row = [
                    `"${t.id}"`,
                    `"${t.date || ""}"`,
                    `"${t.type || ""}"`,
                    `"${(t.name || "").replace(/"/g, '""')}"`,
                    `"${t.category || ""}"`,
                    `"${t.payment || ""}"`,
                    `"${t.amount || 0}"`,
                    `"${(t.notes || "").replace(/"/g, '""')}"`
                ];
                csvRows.push(row.join(","));
            });

            const csvString = csvRows.join("\n");
            const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            const todayStr = new Date().toISOString().split("T")[0];
            link.setAttribute("download", `ExpenseTracker_Transactions_${todayStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showToast(`Exported ${transactions.length} transactions as CSV`, "success");
        });
    }

    // 16. MOBILE MENU TOGGLE & LOGOUT
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

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
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

    // 17. INITIALIZATION
    populateCategoryFilter();
    renderTransactions();
});
