// =========================================================
// REPORTS & ANALYTICS JAVASCRIPT - SMART EXPENSE TRACKER
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. AUTH & PROFILE
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
    const periodSelect = document.getElementById("reportPeriodSelect");
    const customDateGroup = document.getElementById("reportCustomDateGroup");
    const startDateInput = document.getElementById("reportStartDate");
    const endDateInput = document.getElementById("reportEndDate");
    const dateRangeLabel = document.getElementById("reportDateRangeLabel");

    const totalIncomeEl = document.getElementById("reportTotalIncome");
    const totalExpenseEl = document.getElementById("reportTotalExpense");
    const expenseCountEl = document.getElementById("reportExpenseCount");
    const netSavingsEl = document.getElementById("reportNetSavings");
    const savingsRateEl = document.getElementById("reportSavingsRate");
    const dailyAvgEl = document.getElementById("reportDailyAvg");
    const peakExpenseEl = document.getElementById("reportPeakExpense");

    const categoryTableBody = document.getElementById("reportCategoryTableBody");
    const topExpensesList = document.getElementById("reportTopExpensesList");

    const exportCsvBtn = document.getElementById("btnReportExportCsv");
    const exportPdfBtn = document.getElementById("btnReportExportPdf");

    // 3. USER CONTEXT & STORAGE HELPERS
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

    function getIncomes() {
        const key = `incomes_${getCurrentUserEmail()}`;
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

    // Chart instances
    let timelineChart = null;
    let categoryChart = null;

    function getChartThemeColors() {
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        return {
            textColor: isDark ? "#cbd5e1" : "#475569",
            gridColor: isDark ? "#1f2937" : "#f1f5f9",
            borderColor: isDark ? "#111827" : "#ffffff"
        };
    }

    // 4. DATE RANGE FILTERING LOGIC
    function getFilteredData() {
        const period = periodSelect.value;
        const allExpenses = getExpenses();
        const allIncomes = getIncomes();

        const today = new Date();
        const curYear = today.getFullYear();
        const curMonth = today.getMonth();

        let startDate = null;
        let endDate = null;
        let periodLabel = "";

        if (period === "this_month") {
            startDate = new Date(curYear, curMonth, 1);
            endDate = new Date(curYear, curMonth + 1, 0, 23, 59, 59);
            periodLabel = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        } else if (period === "this_week") {
            const dayOfWeek = today.getDay();
            startDate = new Date(today);
            startDate.setDate(today.getDate() - dayOfWeek);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(today);
            endDate.setHours(23, 59, 59);
            periodLabel = "Current Week (Sun - Today)";
        } else if (period === "last_month") {
            startDate = new Date(curYear, curMonth - 1, 1);
            endDate = new Date(curYear, curMonth, 0, 23, 59, 59);
            periodLabel = startDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        } else if (period === "custom") {
            startDate = startDateInput.value ? new Date(startDateInput.value) : null;
            endDate = endDateInput.value ? new Date(endDateInput.value) : null;
            if (startDate) startDate.setHours(0, 0, 0, 0);
            if (endDate) endDate.setHours(23, 59, 59, 999);
            periodLabel = `${startDateInput.value || "Start"} to ${endDateInput.value || "End"}`;
        } else {
            // All time
            periodLabel = "All Recorded History";
        }

        dateRangeLabel.textContent = `Period: ${periodLabel}`;

        const isDateInRange = (dateStr) => {
            if (!dateStr) return false;
            if (!startDate && !endDate) return true;
            const d = new Date(dateStr);
            if (startDate && d < startDate) return false;
            if (endDate && d > endDate) return false;
            return true;
        };

        const filteredExpenses = allExpenses.filter(e => isDateInRange(e.date));
        const filteredIncomes = allIncomes.filter(i => isDateInRange(i.date));

        return {
            expenses: filteredExpenses,
            incomes: filteredIncomes,
            periodLabel,
            startDate,
            endDate
        };
    }

    // 5. UPDATE REPORTS DASHBOARD
    function refreshReports() {
        const { expenses, incomes, periodLabel, startDate, endDate } = getFilteredData();

        const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount || 0), 0);
        const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const netSavings = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

        // Calculate days in period for daily average
        let dayCount = 30;
        if (startDate && endDate) {
            const diffTime = Math.abs(endDate - startDate);
            dayCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }
        const dailyAvg = Math.round(totalExpense / dayCount);

        const sortedExpenses = [...expenses].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
        const peakExpense = sortedExpenses.length > 0 ? Number(sortedExpenses[0].amount) : 0;

        // Update KPIs
        totalIncomeEl.textContent = `₹${totalIncome.toLocaleString("en-IN")}`;
        totalExpenseEl.textContent = `₹${totalExpense.toLocaleString("en-IN")}`;
        expenseCountEl.textContent = `${expenses.length} outflow entries`;
        netSavingsEl.textContent = `₹${netSavings.toLocaleString("en-IN")}`;
        savingsRateEl.textContent = `${savingsRate}% savings rate`;
        dailyAvgEl.textContent = `₹${dailyAvg.toLocaleString("en-IN")}/day`;
        peakExpenseEl.textContent = `Peak Outflow: ₹${peakExpense.toLocaleString("en-IN")}`;

        // Render Charts
        renderTimelineChart(expenses, incomes);
        renderCategoryChart(expenses, totalExpense);

        // Render Category Table
        renderCategoryTable(expenses, totalExpense);

        // Render Top Expenses List
        renderTopExpenses(sortedExpenses);
    }

    // 6. RENDER TIMELINE LINE CHART
    function renderTimelineChart(expenses, incomes) {
        const canvas = document.getElementById("reportTimelineCanvas");
        const emptyState = document.getElementById("reportTimelineEmpty");
        if (!canvas) return;

        if (expenses.length === 0 && incomes.length === 0) {
            canvas.classList.add("hidden");
            emptyState.classList.remove("hidden");
            if (timelineChart) timelineChart.destroy();
            return;
        }

        canvas.classList.remove("hidden");
        emptyState.classList.add("hidden");

        // Group by day/date
        const dateMap = {};
        expenses.forEach(e => {
            if (!e.date) return;
            if (!dateMap[e.date]) dateMap[e.date] = { expense: 0, income: 0 };
            dateMap[e.date].expense += Number(e.amount || 0);
        });

        incomes.forEach(i => {
            if (!i.date) return;
            if (!dateMap[i.date]) dateMap[i.date] = { expense: 0, income: 0 };
            dateMap[i.date].income += Number(i.amount || 0);
        });

        const sortedDates = Object.keys(dateMap).sort();
        const labels = sortedDates.map(d => {
            const [y, m, day] = d.split("-");
            return `${day}/${m}`;
        });

        const expData = sortedDates.map(d => dateMap[d].expense);
        const incData = sortedDates.map(d => dateMap[d].income);

        const themeColors = getChartThemeColors();

        if (timelineChart) timelineChart.destroy();

        timelineChart = new Chart(canvas, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "Expense",
                        data: expData,
                        borderColor: "#ef4444",
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        borderWidth: 2
                    },
                    {
                        label: "Income",
                        data: incData,
                        borderColor: "#10b981",
                        backgroundColor: "rgba(16, 185, 129, 0.1)",
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        borderWidth: 2
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
                        labels: { boxWidth: 12, color: themeColors.textColor, font: { family: "'Plus Jakarta Sans'" } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.dataset.label}: ₹${ctx.raw.toLocaleString("en-IN")}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: themeColors.textColor }
                    },
                    y: {
                        grid: { color: themeColors.gridColor },
                        ticks: {
                            color: themeColors.textColor,
                            callback: (val) => "₹" + val
                        }
                    }
                }
            }
        });
    }

    // 7. RENDER CATEGORY DOUGHNUT CHART
    function renderCategoryChart(expenses, totalExpense) {
        const canvas = document.getElementById("reportCategoryCanvas");
        const emptyState = document.getElementById("reportCategoryEmpty");
        if (!canvas) return;

        if (expenses.length === 0 || totalExpense === 0) {
            canvas.classList.add("hidden");
            emptyState.classList.remove("hidden");
            if (categoryChart) categoryChart.destroy();
            return;
        }

        canvas.classList.remove("hidden");
        emptyState.classList.add("hidden");

        const catMap = {};
        expenses.forEach(e => {
            const cat = e.category || "Other";
            catMap[cat] = (catMap[cat] || 0) + Number(e.amount || 0);
        });

        const labels = Object.keys(catMap);
        const data = Object.values(catMap);
        const palette = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#64748b"];

        const themeColors = getChartThemeColors();

        if (categoryChart) categoryChart.destroy();

        categoryChart = new Chart(canvas, {
            type: "doughnut",
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: palette.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: themeColors.borderColor
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "right",
                        labels: { boxWidth: 12, color: themeColors.textColor, font: { family: "'Plus Jakarta Sans'" } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.label}: ₹${ctx.raw.toLocaleString("en-IN")}`
                        }
                    }
                },
                cutout: "65%"
            }
        });
    }

    // 8. RENDER CATEGORY TABLE
    function renderCategoryTable(expenses, totalExpense) {
        if (!categoryTableBody) return;
        categoryTableBody.innerHTML = "";

        if (expenses.length === 0) {
            categoryTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 24px;">No expense entries found for this period.</td></tr>`;
            return;
        }

        const catStats = {};
        expenses.forEach(e => {
            const cat = e.category || "Other";
            if (!catStats[cat]) catStats[cat] = { count: 0, total: 0 };
            catStats[cat].count += 1;
            catStats[cat].total += Number(e.amount || 0);
        });

        const sorted = Object.entries(catStats).sort((a, b) => b[1].total - a[1].total);

        sorted.forEach(([catName, stats]) => {
            const pct = totalExpense > 0 ? Math.round((stats.total / totalExpense) * 100) : 0;
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${escapeHtml(catName)}</strong></td>
                <td>${stats.count} transactions</td>
                <td><span style="font-weight: 700; color: var(--danger);">₹${stats.total.toLocaleString("en-IN")}</span></td>
                <td>
                    <span class="cat-pill-badge">${pct}%</span>
                </td>
            `;
            categoryTableBody.appendChild(tr);
        });
    }

    // 9. RENDER TOP EXPENSES LIST
    function renderTopExpenses(sortedExpenses) {
        if (!topExpensesList) return;
        topExpensesList.innerHTML = "";

        const top5 = sortedExpenses.slice(0, 5);
        if (top5.length === 0) {
            topExpensesList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px;">No expense records available.</div>`;
            return;
        }

        top5.forEach((e, idx) => {
            const item = document.createElement("div");
            item.className = "transaction-row-item";
            item.innerHTML = `
                <div class="trans-item-left">
                    <div class="trans-cat-icon expense">
                        <i class="fa-solid fa-receipt"></i>
                    </div>
                    <div class="trans-info">
                        <h4>${idx + 1}. ${escapeHtml(e.name || "Expense")}</h4>
                        <div class="trans-meta">
                            <span>${e.date || "-"}</span>
                            <span>•</span>
                            <span>${escapeHtml(e.category || "General")}</span>
                        </div>
                    </div>
                </div>
                <div class="trans-item-right">
                    <div class="trans-amount expense">- ₹${Number(e.amount || 0).toLocaleString("en-IN")}</div>
                </div>
            `;
            topExpensesList.appendChild(item);
        });
    }

    // 10. EXPORT CSV
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener("click", () => {
            const { expenses, incomes, periodLabel } = getFilteredData();
            if (expenses.length === 0 && incomes.length === 0) {
                showToast("No data available to export for this period", "warning");
                return;
            }

            const headers = ["ID", "Date", "Type", "Title", "Category", "Payment Method", "Amount (INR)", "Notes"];
            const rows = [headers.join(",")];

            expenses.forEach(e => {
                rows.push([
                    `"${e.id}"`, `"${e.date}"`, `"Expense"`, `"${(e.name || "").replace(/"/g, '""')}"`,
                    `"${e.category || ""}"`, `"${e.payment || ""}"`, `"${e.amount || 0}"`, `"${(e.notes || "").replace(/"/g, '""')}"`
                ].join(","));
            });

            incomes.forEach(i => {
                rows.push([
                    `"${i.id}"`, `"${i.date}"`, `"Income"`, `"${(i.name || "").replace(/"/g, '""')}"`,
                    `"${i.category || ""}"`, `"${i.payment || ""}"`, `"${i.amount || 0}"`, `"${(i.notes || "").replace(/"/g, '""')}"`
                ].join(","));
            });

            const csvContent = rows.join("\n");
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `ExpenseReport_${new Date().toISOString().split("T")[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            showToast("CSV Report downloaded successfully!", "success");
        });
    }

    // 11. EXPORT PDF / PRINTABLE SUMMARY
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener("click", () => {
            window.print();
        });
    }

    // 12. FILTER EVENT LISTENERS
    if (periodSelect) {
        periodSelect.addEventListener("change", () => {
            if (periodSelect.value === "custom") {
                customDateGroup.classList.remove("hidden");
            } else {
                customDateGroup.classList.add("hidden");
            }
            refreshReports();
        });
    }

    if (startDateInput) startDateInput.addEventListener("change", refreshReports);
    if (endDateInput) endDateInput.addEventListener("change", refreshReports);

    // Theme changes
    window.addEventListener("themechange", () => {
        const { expenses, incomes } = getFilteredData();
        renderTimelineChart(expenses, incomes);
        renderCategoryChart(expenses, expenses.reduce((s, e) => s + Number(e.amount || 0), 0));
    });

    // Mobile menu toggle
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

    function escapeHtml(str) {
        if (!str) return "";
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Initial Load
    refreshReports();
});
