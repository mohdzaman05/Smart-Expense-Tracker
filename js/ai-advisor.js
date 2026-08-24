// =========================================================
// AI FINANCIAL ADVISOR PAGE - SMART EXPENSE TRACKER
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
    const feed = document.getElementById("advisorChatFeed");
    const form = document.getElementById("advisorChatForm");
    const input = document.getElementById("advisorChatInput");
    const clearBtn = document.getElementById("btnClearAdvisorChat");
    const promptChips = document.querySelectorAll(".prompt-chip");

    // USER CONTEXT HELPER
    function getCurrentUserEmail() {
        try {
            const u = JSON.parse(localStorage.getItem("user"));
            if (u && u.email) return u.email.trim().toLowerCase();
        } catch (e) {}
        return "guest";
    }

    // 3. ADVANCED FINANCIAL QUERY EVALUATOR
    function evaluateFinancialQuery(queryText) {
        const userEmail = getCurrentUserEmail();
        const query = (queryText || "").toLowerCase().trim();
        const expenses = JSON.parse(localStorage.getItem(`expenses_${userEmail}`)) || [];
        const incomes = JSON.parse(localStorage.getItem(`incomes_${userEmail}`)) || [];
        const budget = JSON.parse(localStorage.getItem(`budget_${userEmail}`)) || { monthlyLimit: 0 };

        const now = new Date();
        const curMonth = now.getMonth();
        const curYear = now.getFullYear();

        const totalExpense = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
        const totalIncome = incomes.reduce((s, i) => s + Number(i.amount || 0), 0);
        const netBalance = totalIncome - totalExpense;

        // Active Month Data
        const thisMonthExpenses = expenses.filter(e => {
            if (!e.date) return false;
            const d = new Date(e.date);
            return d.getMonth() === curMonth && d.getFullYear() === curYear;
        });
        const thisMonthTotal = thisMonthExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);

        // Previous Month Data
        const lastMonthDate = new Date(curYear, curMonth - 1, 1);
        const lastMonthExpenses = expenses.filter(e => {
            if (!e.date) return false;
            const d = new Date(e.date);
            return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
        });
        const lastMonthTotal = lastMonthExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);

        // Category Map for this month
        const thisMonthCatMap = {};
        thisMonthExpenses.forEach(e => {
            const c = e.category || "Other";
            thisMonthCatMap[c] = (thisMonthCatMap[c] || 0) + Number(e.amount || 0);
        });

        // 1. "How much money do I have left from my budget?" / "budget"
        if (query.includes("budget") || query.includes("left from my budget") || query.includes("remaining")) {
            const monthlyLimit = Number(budget.monthlyLimit || 0);
            if (monthlyLimit <= 0) {
                return `🎯 **Monthly Budget Analysis:**\n\nYou have not configured an active monthly budget yet. You have spent **₹${thisMonthTotal.toLocaleString("en-IN")}** so far this month.\n\n👉 *You can configure a monthly spending limit anytime on the [Budget Page](budget.html).*`;
            }

            const remaining = monthlyLimit - thisMonthTotal;
            const pct = Math.round((thisMonthTotal / monthlyLimit) * 100);

            if (remaining < 0) {
                return `🚨 **Budget Limit Exceeded!**\n\n• **Monthly Limit:** ₹${monthlyLimit.toLocaleString("en-IN")}\n• **Total Spent:** ₹${thisMonthTotal.toLocaleString("en-IN")} (${pct}% used)\n• **Current Deficit:** -₹${Math.abs(remaining).toLocaleString("en-IN")}\n\nYou have exceeded your target by ₹${Math.abs(remaining).toLocaleString("en-IN")}. Focus on restricting non-essential purchases for the rest of the cycle.`;
            } else {
                return `🎯 **Current Budget Health:**\n\n• **Monthly Limit:** ₹${monthlyLimit.toLocaleString("en-IN")}\n• **Total Spent:** ₹${thisMonthTotal.toLocaleString("en-IN")} (${pct}% utilized)\n• **Remaining Budget:** **₹${remaining.toLocaleString("en-IN")}**\n\nYou are pacing on track with **${100 - pct}%** remaining buffer.`;
            }
        }

        // 2. "Which category increased the most?" / "increased"
        if (query.includes("increased") || query.includes("surge") || query.includes("growth")) {
            const lastMonthCatMap = {};
            lastMonthExpenses.forEach(e => {
                const c = e.category || "Other";
                lastMonthCatMap[c] = (lastMonthCatMap[c] || 0) + Number(e.amount || 0);
            });

            let highestSurgeCat = "";
            let highestSurgeDiff = 0;

            for (const [cat, thisAmt] of Object.entries(thisMonthCatMap)) {
                const lastAmt = lastMonthCatMap[cat] || 0;
                const diff = thisAmt - lastAmt;
                if (diff > highestSurgeDiff) {
                    highestSurgeDiff = diff;
                    highestSurgeCat = cat;
                }
            }

            if (highestSurgeCat && highestSurgeDiff > 0) {
                return `📈 **Category Surge Alert:**\n\nYour spending in **${highestSurgeCat}** saw the sharpest increase this month, rising by **+₹${highestSurgeDiff.toLocaleString("en-IN")}** compared to last month (Current: ₹${(thisMonthCatMap[highestSurgeCat] || 0).toLocaleString("en-IN")}).`;
            } else {
                return `📊 None of your category expenditures have significantly surged compared to the previous month. Spending remains stable.`;
            }
        }

        // 3. Fallback to centralized AIEngine answerQuery
        if (window.AIEngine) {
            return window.AIEngine.answerQuery(queryText);
        }

        return `I evaluated your records: Total Outflow is ₹${totalExpense.toLocaleString("en-IN")} and Total Income is ₹${totalIncome.toLocaleString("en-IN")}.`;
    }

    // 4. CHAT RENDERING
    function appendMessage(sender, text) {
        if (!feed) return;

        const msg = document.createElement("div");
        msg.className = `chat-msg ${sender}`;

        let content = text;
        if (sender === "assistant") {
            content = formatMarkdown(text);
        } else {
            content = escapeHtml(text);
        }

        msg.innerHTML = `
            <div class="chat-bubble">${content}</div>
            <span class="chat-time">Just now</span>
        `;

        feed.appendChild(msg);
        feed.scrollTop = feed.scrollHeight;
    }

    function sendQuery(queryText) {
        if (!queryText) return;
        appendMessage("user", queryText);

        // Typing indicator
        const typingMsg = document.createElement("div");
        typingMsg.className = "chat-msg assistant";
        typingMsg.innerHTML = `
            <div class="typing-indicator">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        `;
        feed.appendChild(typingMsg);
        feed.scrollTop = feed.scrollHeight;

        setTimeout(() => {
            if (typingMsg.parentNode) {
                typingMsg.parentNode.removeChild(typingMsg);
            }
            const answer = evaluateFinancialQuery(queryText);
            appendMessage("assistant", answer);
        }, 500);
    }

    // 5. EVENT LISTENERS
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if (!text) return;
            input.value = "";
            sendQuery(text);
        });
    }

    promptChips.forEach(chip => {
        chip.addEventListener("click", () => {
            const q = chip.getAttribute("data-query");
            if (q) sendQuery(q);
        });
    });

    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            feed.innerHTML = `
                <div class="chat-msg assistant">
                    <div class="chat-bubble">
                        Conversation history reset. Ask any question regarding your spending, category distribution, or budgets!
                    </div>
                    <span class="chat-time">Active Session</span>
                </div>
            `;
        });
    }

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

    function formatMarkdown(text) {
        if (!text) return "";
        let formatted = escapeHtml(text);
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        formatted = formatted.replace(/\*(.*?)\*/g, "<em>$1</em>");
        formatted = formatted.replace(/\n/g, "<br>");
        return formatted;
    }
});
