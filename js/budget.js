// =========================================================
// BUDGET MANAGEMENT JAVASCRIPT - SMART EXPENSE TRACKER
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. AUTH CHECK & PROFILE
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

    // Set Month Subtitle
    const now = new Date();
    const curMonthName = now.toLocaleDateString("en-US", { month: "long" });
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const subtitle = document.getElementById("budgetMonthSubtitle");
    if (subtitle) {
        subtitle.textContent = `Set and monitor financial spending limits for ${curMonthName} ${curYear}`;
    }

    // 2. CATEGORY PRESETS
    const CATEGORIES = [
        { id: "Food", label: "🍔 Food & Dining", color: "#f97316" },
        { id: "Travel", label: "🚕 Travel & Transport", color: "#3b82f6" },
        { id: "Shopping", label: "🛍️ Shopping", color: "#ec4899" },
        { id: "Bills", label: "💡 Bills & Utilities", color: "#eab308" },
        { id: "Entertainment", label: "🎬 Entertainment", color: "#8b5cf6" },
        { id: "Education", label: "📚 Education", color: "#06b6d4" },
        { id: "Health", label: "🏥 Health & Medical", color: "#ef4444" },
        { id: "Rent", label: "🏠 Rent", color: "#64748b" },
        { id: "Investment", label: "📈 Investment", color: "#10b981" },
        { id: "Other", label: "📦 Other", color: "#94a3b8" }
    ];

    // 3. USER CONTEXT & STORAGE HELPERS
    function getCurrentUserEmail() {
        try {
            const u = JSON.parse(localStorage.getItem("user"));
            if (u && u.email) return u.email.trim().toLowerCase();
        } catch (e) {}
        return "guest";
    }

    function getBudget() {
        const key = `budget_${getCurrentUserEmail()}`;
        return JSON.parse(localStorage.getItem(key)) || { monthlyLimit: 0 };
    }

    function saveBudget(budgetObj) {
        const key = `budget_${getCurrentUserEmail()}`;
        localStorage.setItem(key, JSON.stringify(budgetObj));
    }

    function getExpenses() {
        const key = `expenses_${getCurrentUserEmail()}`;
        return JSON.parse(localStorage.getItem(key)) || [];
    }

    // Toast helper
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

    // 4. RENDER BUDGET UI
    function renderBudgetUI() {
        const budget = getBudget();
        const monthlyLimit = Number(budget.monthlyLimit || 0);

        const allExpenses = getExpenses();
        const thisMonthExpenses = allExpenses.filter(e => {
            if (!e.date) return false;
            const d = new Date(e.date);
            return d.getMonth() === curMonth && d.getFullYear() === curYear;
        });

        const totalSpent = thisMonthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const remaining = monthlyLimit - totalSpent;
        const percentUsed = monthlyLimit > 0 ? Math.min(150, Math.round((totalSpent / monthlyLimit) * 100)) : 0;

        // DOM elements
        const ratioEl = document.getElementById("budgetDisplayRatio");
        const healthBadge = document.getElementById("budgetHealthBadge");
        const progressFill = document.getElementById("mainBudgetProgressFill");
        const spentText = document.getElementById("budgetSpentText");
        const percentText = document.getElementById("budgetPercentText");
        const remainingText = document.getElementById("budgetRemainingText");
        const alertBanner = document.getElementById("budgetAlertBanner");
        const alertTitle = document.getElementById("budgetAlertTitle");
        const alertDesc = document.getElementById("budgetAlertDescription");

        if (monthlyLimit <= 0) {
            ratioEl.textContent = `₹${totalSpent.toLocaleString("en-IN")} / No Budget Set`;
            healthBadge.className = "badge-pill";
            healthBadge.style.background = "var(--bg-subtle)";
            healthBadge.style.color = "var(--text-muted)";
            healthBadge.textContent = "No Budget Configured";
            progressFill.style.width = "0%";
            spentText.textContent = `Spent: ₹${totalSpent.toLocaleString("en-IN")}`;
            percentText.textContent = `Click "Set Monthly Budget" to establish a limit`;
            remainingText.textContent = `Remaining: ₹0`;
            remainingText.style.color = "var(--text-secondary)";
            if (alertBanner) alertBanner.classList.add("hidden");
        } else {
            ratioEl.textContent = `₹${totalSpent.toLocaleString("en-IN")} / ₹${monthlyLimit.toLocaleString("en-IN")}`;
            spentText.textContent = `Spent: ₹${totalSpent.toLocaleString("en-IN")}`;
            percentText.textContent = `${percentUsed}% of budget used`;

            if (percentUsed >= 100) {
                // Exceeded
                healthBadge.className = "badge-pill expense";
                healthBadge.textContent = `🚨 Budget Exceeded (${percentUsed}%)`;
                progressFill.style.width = "100%";
                progressFill.style.background = "var(--danger)";
                remainingText.style.color = "var(--danger)";
                remainingText.textContent = `Deficit: -₹${Math.abs(remaining).toLocaleString("en-IN")}`;

                if (alertBanner) {
                    alertBanner.classList.remove("hidden");
                    alertBanner.style.background = "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)";
                    alertTitle.textContent = "🚨 Budget Exceeded!";
                    alertDesc.innerHTML = `You have surpassed your <strong>₹${monthlyLimit.toLocaleString("en-IN")}</strong> monthly limit by <strong>₹${Math.abs(remaining).toLocaleString("en-IN")}</strong>. Pause discretionary expenditures.`;
                }
            } else if (percentUsed >= 80) {
                // Warning (80-99%)
                healthBadge.className = "badge-pill";
                healthBadge.style.background = "rgba(239, 68, 68, 0.2)";
                healthBadge.style.color = "#f87171";
                healthBadge.textContent = `⚠️ High Warning (${percentUsed}%)`;
                progressFill.style.width = `${percentUsed}%`;
                progressFill.style.background = "var(--danger)";
                remainingText.style.color = "var(--warning)";
                remainingText.textContent = `Remaining: ₹${remaining.toLocaleString("en-IN")}`;

                if (alertBanner) {
                    alertBanner.classList.remove("hidden");
                    alertBanner.style.background = "linear-gradient(135deg, #78350f 0%, #92400e 100%)";
                    alertTitle.textContent = "⚠️ High Budget Utilization!";
                    alertDesc.innerHTML = `You have used <strong>${percentUsed}%</strong> of your monthly limit. You only have <strong>₹${remaining.toLocaleString("en-IN")}</strong> left for the rest of the month.`;
                }
            } else if (percentUsed >= 70) {
                // Approaching (70-79%)
                healthBadge.className = "badge-pill";
                healthBadge.style.background = "rgba(245, 158, 11, 0.2)";
                healthBadge.style.color = "#fbbf24";
                healthBadge.textContent = `⚠️ Approaching Limit (${percentUsed}%)`;
                progressFill.style.width = `${percentUsed}%`;
                progressFill.style.background = "var(--warning)";
                remainingText.style.color = "var(--text-primary)";
                remainingText.textContent = `Remaining: ₹${remaining.toLocaleString("en-IN")}`;

                if (alertBanner) {
                    alertBanner.classList.remove("hidden");
                    alertBanner.style.background = "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)";
                    alertTitle.textContent = "💡 Approaching 70% Limit";
                    alertDesc.innerHTML = `You have used <strong>${percentUsed}%</strong> of your monthly budget. Monitor remaining outflows.`;
                }
            } else {
                // Normal (0-69%)
                healthBadge.className = "badge-pill income";
                healthBadge.textContent = `✅ On Track (${percentUsed}%)`;
                progressFill.style.width = `${percentUsed}%`;
                progressFill.style.background = "var(--success)";
                remainingText.style.color = "var(--success)";
                remainingText.textContent = `Remaining: ₹${remaining.toLocaleString("en-IN")}`;
                if (alertBanner) alertBanner.classList.add("hidden");
            }
        }

        // Render Category Progress Bars
        renderCategoryAllocations(thisMonthExpenses, totalSpent);
    }

    // 5. CATEGORY PROGRESS BARS
    function renderCategoryAllocations(thisMonthExpenses, totalSpent) {
        const container = document.getElementById("categoryBudgetsList");
        if (!container) return;

        container.innerHTML = "";

        const categoryMap = {};
        thisMonthExpenses.forEach(e => {
            const cat = e.category || "Other";
            categoryMap[cat] = (categoryMap[cat] || 0) + Number(e.amount || 0);
        });

        CATEGORIES.forEach(cat => {
            const spent = categoryMap[cat.id] || 0;
            const pct = totalSpent > 0 ? Math.round((spent / totalSpent) * 100) : 0;

            const row = document.createElement("div");
            row.className = "category-bar-item";
            row.innerHTML = `
                <div class="cat-bar-header">
                    <div class="cat-bar-name">
                        <span style="font-weight: 700;">${cat.label}</span>
                    </div>
                    <div class="cat-bar-val">
                        ₹${spent.toLocaleString("en-IN")} <span style="font-size: 11.5px; color: var(--text-muted);">(${pct}% of monthly spend)</span>
                    </div>
                </div>
                <div class="progress-track" style="height: 9px;">
                    <div class="progress-fill" style="width: ${pct}%; background-color: ${cat.color};"></div>
                </div>
            `;
            container.appendChild(row);
        });
    }

    // 6. MODAL EVENTS
    const modal = document.getElementById("budgetModal");
    const openBtn = document.getElementById("openSetBudgetBtn");
    const closeBtn = document.getElementById("closeBudgetModalBtn");
    const cancelBtn = document.getElementById("cancelBudgetModalBtn");
    const form = document.getElementById("budgetForm");
    const budgetInput = document.getElementById("monthlyBudgetInput");
    const resetBtn = document.getElementById("btnResetBudget");

    const openModal = () => {
        const currentBudget = getBudget();
        if (budgetInput && currentBudget.monthlyLimit > 0) {
            budgetInput.value = currentBudget.monthlyLimit;
        }
        modal.classList.remove("hidden");
        if (budgetInput) budgetInput.focus();
    };

    const closeModal = () => {
        modal.classList.add("hidden");
    };

    if (openBtn) openBtn.addEventListener("click", openModal);
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const limit = parseFloat(budgetInput.value);
        if (isNaN(limit) || limit < 100) {
            showToast("Please enter a valid monthly budget amount (min ₹100)", "warning");
            return;
        }

        saveBudget({
            monthlyLimit: limit,
            updatedAt: new Date().toISOString()
        });

        showToast("Monthly budget updated successfully!", "success");
        closeModal();
        renderBudgetUI();
    });

    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            if (confirm("Are you sure you want to reset your monthly budget?")) {
                saveBudget({ monthlyLimit: 0, updatedAt: new Date().toISOString() });
                showToast("Monthly budget reset to zero.", "info");
                renderBudgetUI();
            }
        });
    }

    // Mobile Sidebar
    const mobileBtn = document.getElementById("mobileMenuBtn");
    const sidebar = document.getElementById("appSidebar");
    if (mobileBtn && sidebar) {
        mobileBtn.addEventListener("click", () => sidebar.classList.toggle("open"));
        document.addEventListener("click", (e) => {
            if (window.innerWidth <= 900 && !sidebar.contains(e.target) && !mobileBtn.contains(e.target)) {
                sidebar.classList.remove("open");
            }
        });
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            if (confirm("Are you sure you want to sign out?")) {
                localStorage.removeItem("user");
                sessionStorage.removeItem("gdrive_token");
                window.location.href = "index.html";
            }
        });
    }

    // Initial render
    renderBudgetUI();
});
