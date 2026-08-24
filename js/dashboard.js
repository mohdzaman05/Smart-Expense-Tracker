// =========================================================
// DASHBOARD LOGIC - SMART EXPENSE TRACKER
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. AUTHENTICATION VERIFICATION
    const savedUser = JSON.parse(localStorage.getItem("user"));
    if (!savedUser) {
        window.location.href = "index.html";
        return;
    }

    // Set User Profile Information
    const userNameDisplay = savedUser.name || "User";
    document.getElementById("welcomeText").textContent = `Welcome back, ${userNameDisplay.split(" ")[0]}! 👋`;
    document.getElementById("sidebarUserName").textContent = userNameDisplay;
    
    // Set Avatar Initials
    const initials = userNameDisplay
        .split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
    document.getElementById("userAvatarText").textContent = initials || "U";

    // Set Date Formatter
    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric"
    });
    document.getElementById("currentDateDisplay").textContent = formattedDate;

    const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];
    document.getElementById("currentMonthName").textContent = `${monthNames[now.getMonth()]} Overview`;

    // 2. CATEGORY CONFIGURATION
    const CATEGORIES = {
        expense: [
            { id: "Food", label: "🍔 Food", icon: "fa-utensils", color: "#f97316" },
            { id: "Travel", label: "🚕 Travel", icon: "fa-car", color: "#3b82f6" },
            { id: "Shopping", label: "🛍️ Shopping", icon: "fa-bag-shopping", color: "#ec4899" },
            { id: "Bills", label: "💡 Bills", icon: "fa-bolt", color: "#eab308" },
            { id: "Entertainment", label: "🎬 Entertainment", icon: "fa-film", color: "#8b5cf6" },
            { id: "Education", label: "📚 Education", icon: "fa-book-open", color: "#06b6d4" },
            { id: "Health", label: "🏥 Health", icon: "fa-heart-pulse", color: "#ef4444" },
            { id: "Rent", label: "🏠 Rent", icon: "fa-house", color: "#64748b" },
            { id: "Investment", label: "📈 Investment", icon: "fa-chart-line", color: "#10b981" },
            { id: "Other", label: "📦 Other", icon: "fa-box", color: "#94a3b8" }
        ],
        income: [
            { id: "Salary", label: "💼 Salary", icon: "fa-briefcase", color: "#10b981" },
            { id: "Freelance", label: "💻 Freelance", icon: "fa-laptop-code", color: "#0ea5e9" },
            { id: "Business", label: "🏢 Business", icon: "fa-building", color: "#6366f1" },
            { id: "Investments", label: "📈 Investments", icon: "fa-arrow-trend-up", color: "#8b5cf6" },
            { id: "Allowance", label: "🎁 Allowance", icon: "fa-gift", color: "#ec4899" },
            { id: "Dividend", label: "💵 Dividend", icon: "fa-money-bill-wave", color: "#14b8a6" },
            { id: "Bonus", label: "🎉 Bonus", icon: "fa-award", color: "#f59e0b" },
            { id: "Other", label: "📦 Other", icon: "fa-box", color: "#94a3b8" }
        ]
    };

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

    function getStoredBudget() {
        const key = `budget_${getCurrentUserEmail()}`;
        return JSON.parse(localStorage.getItem(key)) || { monthlyLimit: 0 };
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

    // 5. CHART INSTANCES
    let categoryChart = null;
    let trendChart = null;

    // Helper for Chart theme reactivity
    function getChartThemeColors() {
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        return {
            textColor: isDark ? "#cbd5e1" : "#475569",
            gridColor: isDark ? "#1f2937" : "#f1f5f9",
            borderColor: isDark ? "#111827" : "#ffffff"
        };
    }

    // 6. DASHBOARD METRICS CALCULATION & UI REFRESH
    function refreshDashboard() {
        const expenses = getStoredExpenses();
        const incomes = getStoredIncomes();
        const allTransactions = getAllTransactions();

        // Calculate Totals
        const totalExp = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const totalInc = incomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const balance = totalInc - totalExp;

        // Current Month Expenses
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const monthlyExpensesList = expenses.filter(item => {
            if (!item.date) return false;
            const d = new Date(item.date);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        });

        const monthlyExp = monthlyExpensesList.reduce((sum, item) => sum + Number(item.amount || 0), 0);

        // Update KPI displays
        document.getElementById("currentBalance").textContent = `₹${balance.toLocaleString("en-IN")}`;
        document.getElementById("totalIncome").textContent = `₹${totalInc.toLocaleString("en-IN")}`;
        document.getElementById("totalExpense").textContent = `₹${totalExp.toLocaleString("en-IN")}`;
        document.getElementById("monthlyExpense").textContent = `₹${monthlyExp.toLocaleString("en-IN")}`;
        document.getElementById("expenseCountText").textContent = `${expenses.length} total logged transactions`;

        const savingsRateText = document.getElementById("savingsRateText");
        const savingsRateBadge = document.getElementById("savingsRateBadge");
        if (totalInc > 0) {
            const savingsRate = Math.round(((totalInc - totalExp) / totalInc) * 100);
            if (savingsRate >= 0) {
                savingsRateText.textContent = `${savingsRate}% Net Savings Rate`;
                savingsRateBadge.className = "metric-trend positive";
            } else {
                savingsRateText.textContent = `${Math.abs(savingsRate)}% In Deficit`;
                savingsRateBadge.className = "metric-trend negative";
            }
        } else {
            savingsRateText.textContent = "Net Available";
            savingsRateBadge.className = balance >= 0 ? "metric-trend positive" : "metric-trend negative";
        }

        // Render Dashboard Budget Card
        renderDashboardBudget(monthlyExp);

        // Render Smart Alerts
        renderSmartAlerts(expenses, incomes, monthlyExp);

        // Render Monthly AI Summary Card
        renderMonthlyAISummary(monthlyExp, monthlyExpensesList, expenses, totalInc);

        // Render AI Insights
        renderAIInsights(totalInc, totalExp, monthlyExp, expenses);

        // Render Charts
        renderCategoryChart(expenses);
        renderTrendChart(expenses, incomes);

        // Render Recent Transactions
        renderRecentTransactions(allTransactions);

        // Render Category Progress Bars
        renderCategoryProgress(expenses, totalExp);
    }

    // 6B. RENDER DASHBOARD BUDGET CARD
    function renderDashboardBudget(thisMonthExpense) {
        const budget = getStoredBudget();
        const monthlyLimit = Number(budget.monthlyLimit || 0);

        const ratioText = document.getElementById("dashBudgetRatioText");
        const remainingText = document.getElementById("dashBudgetRemainingText");
        const badge = document.getElementById("dashBudgetStatusBadge");
        const progressFill = document.getElementById("dashBudgetProgressFill");
        const subtitle = document.getElementById("dashBudgetSubtitle");

        if (!ratioText || !progressFill) return;

        if (monthlyLimit <= 0) {
            ratioText.textContent = `₹${thisMonthExpense.toLocaleString("en-IN")} / No Budget Set`;
            remainingText.textContent = "Remaining: ₹0";
            remainingText.style.color = "var(--text-secondary)";
            badge.className = "badge-pill";
            badge.textContent = "No Budget Set";
            progressFill.style.width = "0%";
            subtitle.textContent = "Set a budget limit to track progress";
        } else {
            const remaining = monthlyLimit - thisMonthExpense;
            const pct = Math.round((thisMonthExpense / monthlyLimit) * 100);
            ratioText.textContent = `₹${thisMonthExpense.toLocaleString("en-IN")} / ₹${monthlyLimit.toLocaleString("en-IN")} (${pct}%)`;

            progressFill.style.width = `${Math.min(100, pct)}%`;

            if (pct >= 100) {
                badge.className = "badge-pill expense";
                badge.textContent = `🚨 Exceeded (${pct}%)`;
                progressFill.style.background = "var(--danger)";
                remainingText.style.color = "var(--danger)";
                remainingText.textContent = `Deficit: -₹${Math.abs(remaining).toLocaleString("en-IN")}`;
                subtitle.textContent = "Budget exceeded! Minimize non-essential spend";
            } else if (pct >= 80) {
                badge.className = "badge-pill";
                badge.style.background = "rgba(239, 68, 68, 0.2)";
                badge.style.color = "#f87171";
                badge.textContent = `⚠️ Warning (${pct}%)`;
                progressFill.style.background = "var(--danger)";
                remainingText.style.color = "var(--warning)";
                remainingText.textContent = `Remaining: ₹${remaining.toLocaleString("en-IN")}`;
                subtitle.textContent = "Approaching maximum spending limit";
            } else if (pct >= 70) {
                badge.className = "badge-pill";
                badge.style.background = "rgba(245, 158, 11, 0.2)";
                badge.style.color = "#fbbf24";
                badge.textContent = `⚠️ Approaching (${pct}%)`;
                progressFill.style.background = "var(--warning)";
                remainingText.style.color = "var(--text-primary)";
                remainingText.textContent = `Remaining: ₹${remaining.toLocaleString("en-IN")}`;
                subtitle.textContent = "Pacing above 70% threshold";
            } else {
                badge.className = "badge-pill income";
                badge.textContent = `✅ On Track (${pct}%)`;
                progressFill.style.background = "var(--success)";
                remainingText.style.color = "var(--success)";
                remainingText.textContent = `Remaining: ₹${remaining.toLocaleString("en-IN")}`;
                subtitle.textContent = "Healthy spending pace";
            }
        }
    }

    // 6C. RENDER DATA-DRIVEN SMART ALERTS
    function renderSmartAlerts(expenses, incomes, thisMonthExpense) {
        const alertsSection = document.getElementById("dashSmartAlertsSection");
        const alertTitle = document.getElementById("dashSmartAlertTitle");
        const alertText = document.getElementById("dashSmartAlertText");
        const dismissBtn = document.getElementById("btnDismissSmartAlert");

        if (!alertsSection || !alertTitle || !alertText) return;

        const userEmail = getCurrentUserEmail();
        if (sessionStorage.getItem(`smart_alert_dismissed_${userEmail}`) === "true") {
            alertsSection.classList.add("hidden");
            return;
        }

        const budget = getStoredBudget();
        const monthlyLimit = Number(budget.monthlyLimit || 0);

        let activeAlert = null;

        if (monthlyLimit > 0 && thisMonthExpense > monthlyLimit) {
            activeAlert = {
                title: "🚨 Monthly Budget Exceeded",
                text: `You have surpassed your ₹${monthlyLimit.toLocaleString("en-IN")} budget by ₹${(thisMonthExpense - monthlyLimit).toLocaleString("en-IN")}. Consider deferring new purchases.`,
                bg: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)"
            };
        } else if (monthlyLimit > 0 && (thisMonthExpense / monthlyLimit) >= 0.8) {
            const pct = Math.round((thisMonthExpense / monthlyLimit) * 100);
            activeAlert = {
                title: `⚠️ Budget Alert: ${pct}% Utilized`,
                text: `You've used ${pct}% of your monthly budget. Only ₹${(monthlyLimit - thisMonthExpense).toLocaleString("en-IN")} remains for the cycle.`,
                bg: "linear-gradient(135deg, #78350f 0%, #92400e 100%)"
            };
        } else {
            const foodExpenses = expenses.filter(e => e.category === "Food");
            const foodTotal = foodExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
            const totalExp = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
            if (totalExp > 0 && (foodTotal / totalExp) > 0.45) {
                activeAlert = {
                    title: "💡 High Food Spending Share",
                    text: `Food & Dining accounts for ${Math.round((foodTotal / totalExp) * 100)}% of your total outflows (₹${foodTotal.toLocaleString("en-IN")}). Setting a dedicated dining cap could yield noticeable savings.`,
                    bg: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)"
                };
            }
        }

        if (activeAlert) {
            alertTitle.textContent = activeAlert.title;
            alertText.innerHTML = activeAlert.text;
            alertsSection.style.background = activeAlert.bg;
            alertsSection.classList.remove("hidden");

            if (dismissBtn) {
                dismissBtn.onclick = () => {
                    alertsSection.classList.add("hidden");
                    sessionStorage.setItem(`smart_alert_dismissed_${userEmail}`, "true");
                };
            }
        } else {
            alertsSection.classList.add("hidden");
        }
    }

    // 7. RENDER MONTHLY AI SUMMARY CARD
    function renderMonthlyAISummary(monthlyExp, monthlyExpensesList, allExpenses, totalIncome) {
        const monthHeader = document.getElementById("aiSummaryMonthHeader");
        const totalSpendEl = document.getElementById("aiSummaryTotalSpend");
        const topCatEl = document.getElementById("aiSummaryTopCat");
        const peakExpenseEl = document.getElementById("aiSummaryPeakExpense");
        const momTrendEl = document.getElementById("aiSummaryMoMTrend");
        const adviceEl = document.getElementById("aiSummaryAdviceText");
        const healthBadge = document.getElementById("aiSummaryHealthBadge");

        if (!monthHeader) return;

        const curMonthName = now.toLocaleDateString("en-US", { month: "long" });
        monthHeader.textContent = `Your ${curMonthName} AI Spending Summary`;

        totalSpendEl.textContent = `₹${monthlyExp.toLocaleString("en-IN")}`;

        if (monthlyExpensesList.length === 0) {
            topCatEl.textContent = "None";
            peakExpenseEl.textContent = "₹0";
            momTrendEl.textContent = "Stable";
            adviceEl.textContent = "Log your daily transactions to receive personalized AI budget recommendations.";
            return;
        }

        // Find top category this month
        const catMap = {};
        monthlyExpensesList.forEach(e => {
            catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount || 0);
        });
        const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
        topCatEl.textContent = sortedCats[0] ? sortedCats[0][0] : "General";

        // Find largest single expense this month
        const maxExp = [...monthlyExpensesList].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0];
        peakExpenseEl.textContent = maxExp ? `₹${Number(maxExp.amount).toLocaleString("en-IN")}` : "₹0";

        // Calculate MoM trend
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthExpenses = allExpenses.filter(e => {
            if (!e.date) return false;
            const d = new Date(e.date);
            return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
        });
        const lastMonthTotal = lastMonthExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);

        if (lastMonthTotal > 0) {
            const diff = monthlyExp - lastMonthTotal;
            const pct = Math.abs(Math.round((diff / lastMonthTotal) * 100));
            if (diff > 0) {
                momTrendEl.textContent = `+${pct}% vs Last Month`;
                momTrendEl.style.color = "#fca5a5";
            } else if (diff < 0) {
                momTrendEl.textContent = `-${pct}% vs Last Month`;
                momTrendEl.style.color = "#86efac";
            } else {
                momTrendEl.textContent = "Equal to Last Month";
            }
        } else {
            momTrendEl.textContent = "Baseline Month";
        }

        // Actionable advice
        if (sortedCats[0]) {
            adviceEl.innerHTML = `Your <strong>${sortedCats[0][0]}</strong> expenses represent <strong>${Math.round((sortedCats[0][1]/monthlyExp)*100)}%</strong> of this month's outflows. Setting a spending limit on ${sortedCats[0][0]} could optimize your cash reserves.`;
        }
    }

    // 8. AI INSIGHTS BANNER LOGIC
    function renderAIInsights(income, totalExpense, monthlyExpense, expenses) {
        const insightText = document.getElementById("aiInsightText");
        const healthBadge = document.getElementById("financialHealthBadge");

        if (expenses.length === 0 && income === 0) {
            healthBadge.textContent = "Getting Started";
            healthBadge.style.background = "rgba(99, 102, 241, 0.25)";
            healthBadge.style.color = "#a5b4fc";
            insightText.textContent = "Add your first income source and expenses to generate real-time financial intelligence and smart recommendations.";
            return;
        }

        const categoryMap = {};
        expenses.forEach(exp => {
            categoryMap[exp.category] = (categoryMap[exp.category] || 0) + Number(exp.amount || 0);
        });

        let topCategory = "";
        let topCatAmount = 0;
        for (const [cat, amt] of Object.entries(categoryMap)) {
            if (amt > topCatAmount) {
                topCatAmount = amt;
                topCategory = cat;
            }
        }

        const burnRate = income > 0 ? (totalExpense / income) * 100 : 100;

        if (burnRate > 90) {
            healthBadge.textContent = "High Expense Ratio";
            healthBadge.style.background = "rgba(239, 68, 68, 0.25)";
            healthBadge.style.color = "#fca5a5";
            insightText.innerHTML = `⚠️ You are spending <strong>${Math.round(burnRate)}%</strong> of your earnings. Your largest expense category is <strong>${topCategory || 'General'}</strong> (₹${topCatAmount.toLocaleString('en-IN')}). Consider establishing a conservative monthly cap.`;
        } else if (burnRate > 50) {
            healthBadge.textContent = "Moderate Spending";
            healthBadge.style.background = "rgba(245, 158, 11, 0.25)";
            healthBadge.style.color = "#fcd34d";
            insightText.innerHTML = `💡 Good discipline! You are retaining <strong>${Math.round(100 - burnRate)}%</strong> of your income. <strong>${topCategory}</strong> accounts for ${Math.round((topCatAmount/totalExpense)*100)}% of your expenses.`;
        } else {
            healthBadge.textContent = "Excellent Health";
            healthBadge.style.background = "rgba(16, 185, 129, 0.25)";
            healthBadge.style.color = "#6ee7b7";
            insightText.innerHTML = `🌟 Outstanding! You have saved <strong>${Math.round(100 - burnRate)}%</strong> of your revenue this cycle. Healthy positive cash flow allows for growing investments and emergency reserves.`;
        }
    }

    // 9. RENDER CATEGORY DOUGHNUT CHART
    function renderCategoryChart(expenses) {
        const ctx = document.getElementById("categoryChartCanvas");
        const emptyState = document.getElementById("categoryChartEmpty");
        if (!ctx) return;

        if (expenses.length === 0) {
            ctx.classList.add("hidden");
            emptyState.classList.remove("hidden");
            if (categoryChart) categoryChart.destroy();
            return;
        }

        ctx.classList.remove("hidden");
        emptyState.classList.add("hidden");

        const categoryMap = {};
        expenses.forEach(exp => {
            const cat = exp.category || "Other";
            categoryMap[cat] = (categoryMap[cat] || 0) + Number(exp.amount || 0);
        });

        const labels = Object.keys(categoryMap);
        const data = Object.values(categoryMap);

        const palette = [
            "#4f46e5", "#10b981", "#f59e0b", "#ef4444", 
            "#8b5cf6", "#06b6d4", "#ec4899", "#64748b", "#3b82f6"
        ];

        const themeColors = getChartThemeColors();

        if (categoryChart) {
            categoryChart.destroy();
        }

        categoryChart = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: palette.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: themeColors.borderColor,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "right",
                        labels: {
                            boxWidth: 12,
                            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
                            color: themeColors.textColor
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return ` ${context.label}: ₹${context.raw.toLocaleString("en-IN")}`;
                            }
                        }
                    }
                },
                cutout: "68%"
            }
        });
    }

    // 10. RENDER MONTHLY TREND BAR CHART
    function renderTrendChart(expenses, incomes) {
        const ctx = document.getElementById("trendChartCanvas");
        const emptyState = document.getElementById("trendChartEmpty");
        if (!ctx) return;

        if (expenses.length === 0 && incomes.length === 0) {
            ctx.classList.add("hidden");
            emptyState.classList.remove("hidden");
            if (trendChart) trendChart.destroy();
            return;
        }

        ctx.classList.remove("hidden");
        emptyState.classList.add("hidden");

        const months = [];
        const expData = [];
        const incData = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const y = d.getFullYear();
            const m = d.getMonth();
            const mLabel = d.toLocaleDateString("en-US", { month: "short" });
            months.push(mLabel);

            const mExp = expenses.filter(e => {
                if (!e.date) return false;
                const ed = new Date(e.date);
                return ed.getFullYear() === y && ed.getMonth() === m;
            }).reduce((sum, e) => sum + Number(e.amount || 0), 0);

            const mInc = incomes.filter(inc => {
                if (!inc.date) return false;
                const id = new Date(inc.date);
                return id.getFullYear() === y && id.getMonth() === m;
            }).reduce((sum, inc) => sum + Number(inc.amount || 0), 0);

            expData.push(mExp);
            incData.push(mInc);
        }

        const themeColors = getChartThemeColors();

        if (trendChart) {
            trendChart.destroy();
        }

        trendChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: months,
                datasets: [
                    {
                        label: "Income",
                        data: incData,
                        backgroundColor: "#10b981",
                        borderRadius: 6,
                        barPercentage: 0.6
                    },
                    {
                        label: "Expense",
                        data: expData,
                        backgroundColor: "#ef4444",
                        borderRadius: 6,
                        barPercentage: 0.6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "top",
                        align: "end",
                        labels: {
                            boxWidth: 12,
                            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
                            color: themeColors.textColor
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return ` ${context.dataset.label}: ₹${context.raw.toLocaleString("en-IN")}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 }, color: themeColors.textColor }
                    },
                    y: {
                        grid: { color: themeColors.gridColor },
                        ticks: {
                            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
                            color: themeColors.textColor,
                            callback: function (val) {
                                return "₹" + val;
                            }
                        }
                    }
                }
            }
        });
    }

    // React to theme changes
    window.addEventListener("themechange", () => {
        const expenses = getStoredExpenses();
        const incomes = getStoredIncomes();
        renderCategoryChart(expenses);
        renderTrendChart(expenses, incomes);
    });

    // 11. RENDER RECENT TRANSACTIONS
    function renderRecentTransactions(transactions) {
        const container = document.getElementById("recentTransactionList");
        const emptyBox = document.getElementById("emptyTransactionsState");
        if (!container) return;

        container.innerHTML = "";

        if (transactions.length === 0) {
            emptyBox.classList.remove("hidden");
            return;
        }

        emptyBox.classList.add("hidden");

        const sorted = [...transactions].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 5);

        sorted.forEach(t => {
            const isIncome = t.type === "income";
            const row = document.createElement("div");
            row.className = "transaction-row-item";

            const catList = CATEGORIES[t.type] || CATEGORIES.expense;
            const catObj = catList.find(c => c.id === t.category);
            const iconName = catObj ? catObj.icon : (isIncome ? "fa-money-bill" : "fa-tag");

            let displayDate = t.date;
            try {
                if (t.date) {
                    const [year, month, day] = t.date.split("-");
                    displayDate = new Date(year, month - 1, day).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short"
                    });
                }
            } catch (e) {}

            row.innerHTML = `
                <div class="trans-item-left">
                    <div class="trans-cat-icon ${isIncome ? 'income' : 'expense'}">
                        <i class="fa-solid ${iconName}"></i>
                    </div>
                    <div class="trans-info">
                        <h4>${escapeHTML(t.name || "Untitled")}</h4>
                        <div class="trans-meta">
                            <span>${displayDate}</span>
                            <span>•</span>
                            <span class="trans-badge">${escapeHTML(t.payment || "UPI")}</span>
                            <span>•</span>
                            <span>${escapeHTML(t.category || "General")}</span>
                        </div>
                    </div>
                </div>
                <div class="trans-item-right">
                    <div class="trans-amount ${isIncome ? 'income' : 'expense'}">
                        ${isIncome ? '+' : '-'} ₹${Number(t.amount || 0).toLocaleString("en-IN")}
                    </div>
                    <div class="trans-date">${isIncome ? 'Income' : 'Expense'}</div>
                </div>
            `;

            container.appendChild(row);
        });
    }

    // 12. RENDER CATEGORY PROGRESS BARS
    function renderCategoryProgress(expenses, totalExpense) {
        const container = document.getElementById("categoryProgressList");
        const emptyState = document.getElementById("emptyCategoryProgressState");
        if (!container) return;

        container.innerHTML = "";

        if (expenses.length === 0 || totalExpense === 0) {
            emptyState.classList.remove("hidden");
            return;
        }

        emptyState.classList.add("hidden");

        const categoryMap = {};
        expenses.forEach(exp => {
            const cat = exp.category || "Other";
            categoryMap[cat] = (categoryMap[cat] || 0) + Number(exp.amount || 0);
        });

        const sortedCats = Object.entries(categoryMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);

        sortedCats.forEach(([catId, amount]) => {
            const percent = Math.min(100, Math.round((amount / totalExpense) * 100));
            const catObj = CATEGORIES.expense.find(c => c.id === catId);
            const color = catObj ? catObj.color : "#4f46e5";

            const barItem = document.createElement("div");
            barItem.className = "category-bar-item";
            barItem.innerHTML = `
                <div class="cat-bar-header">
                    <div class="cat-bar-name">
                        <span>${catObj ? catObj.label : catId}</span>
                    </div>
                    <div class="cat-bar-val">₹${amount.toLocaleString("en-IN")} (${percent}%)</div>
                </div>
                <div class="progress-track">
                    <div class="progress-fill" style="width: ${percent}%; background-color: ${color};"></div>
                </div>
            `;
            container.appendChild(barItem);
        });
    }

    // 13. QUICK ADD MODAL WORKFLOW
    const quickModal = document.getElementById("quickAddModal");
    const openExpenseBtn = document.getElementById("openExpenseModalBtn");
    const openIncomeBtn = document.getElementById("openIncomeModalBtn");
    const closeQuickBtn = document.getElementById("closeQuickModalBtn");
    const cancelQuickBtn = document.getElementById("cancelQuickModalBtn");
    const quickForm = document.getElementById("quickTransactionForm");

    const quickTypeExpenseBtn = document.getElementById("quickTypeExpenseBtn");
    const quickTypeIncomeBtn = document.getElementById("quickTypeIncomeBtn");
    const quickTransCategory = document.getElementById("quickTransCategory");
    const quickTransDate = document.getElementById("quickTransDate");

    let currentQuickType = "expense";

    function populateModalCategories(type) {
        quickTransCategory.innerHTML = "";
        const list = CATEGORIES[type] || CATEGORIES.expense;
        list.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = c.label;
            quickTransCategory.appendChild(opt);
        });
    }

    function setQuickModalType(type) {
        currentQuickType = type;
        if (type === "expense") {
            quickTypeExpenseBtn.className = "type-toggle-btn active expense";
            quickTypeIncomeBtn.className = "type-toggle-btn income";
            document.getElementById("quickModalTitle").textContent = "Add New Expense";
        } else {
            quickTypeIncomeBtn.className = "type-toggle-btn active income";
            quickTypeExpenseBtn.className = "type-toggle-btn expense";
            document.getElementById("quickModalTitle").textContent = "Add New Income";
        }
        populateModalCategories(type);
    }

    function openModal(type = "expense") {
        quickForm.reset();
        setQuickModalType(type);
        quickTransDate.value = new Date().toISOString().split("T")[0];
        quickModal.classList.remove("hidden");
        document.getElementById("quickTransName").focus();
    }

    function closeModal() {
        quickModal.classList.add("hidden");
        quickForm.reset();
    }

    if (openExpenseBtn) openExpenseBtn.addEventListener("click", () => openModal("expense"));
    if (openIncomeBtn) openIncomeBtn.addEventListener("click", () => openModal("income"));
    if (closeQuickBtn) closeQuickBtn.addEventListener("click", closeModal);
    if (cancelQuickBtn) cancelQuickBtn.addEventListener("click", closeModal);

    quickTypeExpenseBtn.addEventListener("click", () => setQuickModalType("expense"));
    quickTypeIncomeBtn.addEventListener("click", () => setQuickModalType("income"));

    quickModal.addEventListener("click", (e) => {
        if (e.target === quickModal) closeModal();
    });

    quickForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = document.getElementById("quickTransName").value.trim();
        const amount = parseFloat(document.getElementById("quickTransAmount").value);
        const category = quickTransCategory.value;
        const date = quickTransDate.value;
        const payment = document.getElementById("quickTransPayment").value;
        const notes = document.getElementById("quickTransNotes").value.trim();

        if (!name || isNaN(amount) || amount <= 0 || !category || !date) {
            showToast("Please fill all required fields correctly", "warning");
            return;
        }

        const newRecord = {
            id: Date.now(),
            name,
            amount,
            category,
            date,
            payment,
            notes
        };

        if (currentQuickType === "expense") {
            const expenses = getStoredExpenses();
            expenses.unshift(newRecord);
            setStoredExpenses(expenses);
            showToast("Expense recorded successfully!", "success");
        } else {
            const incomes = getStoredIncomes();
            incomes.unshift(newRecord);
            setStoredIncomes(incomes);
            showToast("Income added successfully!", "success");
        }

        closeModal();
        refreshDashboard();
    });

    // 14. SIDEBAR RESPONSIVENESS & LOGOUT
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
        logoutBtn.addEventListener("click", async () => {
            if (confirm("Are you sure you want to sign out?")) {
                // Auto backup before logout if enabled
                if (localStorage.getItem("gdrive_auto_backup") === "true" && window.GoogleDriveSync && window.GoogleDriveSync.accessToken) {
                    showToast("Saving cloud backup...", "info");
                    try {
                        await window.GoogleDriveSync.backupNow();
                    } catch (e) {}
                }
                localStorage.removeItem("user");
                sessionStorage.removeItem("gdrive_token");
                showToast("Signed out successfully", "info");
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 400);
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

    // Initial Load
    refreshDashboard();
});