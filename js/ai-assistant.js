// =========================================================
// AI FINANCIAL ASSISTANT & THEME SYSTEM - SMART EXPENSE TRACKER
// =========================================================

const AIEngine = {
    // 1. CATEGORY PREDICTOR
    rules: {
        Food: [
            "food", "pizza", "burger", "mcdonald", "starbucks", "dinner", "lunch", "breakfast", 
            "restaurant", "grocery", "supermarket", "swiggy", "zomato", "cafe", "coffee", "bakery", 
            "fruits", "vegetables", "snack", "domino", "kfc", "subway", "dining", "meal", "bistro"
        ],
        Travel: [
            "uber", "ola", "flight", "airline", "train", "railway", "petrol", "diesel", "fuel", 
            "taxi", "cab", "bus", "metro", "toll", "parking", "commute", "travel", "trip", "gas station"
        ],
        Shopping: [
            "amazon", "flipkart", "zara", "nike", "clothes", "shoes", "apparel", "electronics", 
            "gadgets", "mall", "book", "stationery", "shopping", "myntra", "store", "purchase", "dress"
        ],
        Bills: [
            "electricity", "broadband", "wifi", "recharge", "mobile", "water", "gas", "bill", 
            "utility", "maintenance", "subscription", "netflix", "spotify", "aws", "cloud", "internet", "dth"
        ],
        Entertainment: [
            "movie", "cinema", "game", "gaming", "steam", "playstation", "concert", "theater", 
            "party", "event", "outing", "club", "disney", "prime video", "festival"
        ],
        Education: [
            "tuition", "college", "course", "udemy", "coursera", "books", "exam", "fee", "school", 
            "coaching", "university", "seminar", "training", "degree"
        ],
        Health: [
            "doctor", "hospital", "pharmacy", "medicine", "dental", "vitamins", "health", "clinic", 
            "lab", "test", "checkup", "gym", "fitness", "therapy", "medical"
        ],
        Rent: [
            "rent", "landlord", "lease", "flat", "apartment", "housing", "room rent"
        ],
        Investment: [
            "stock", "share", "mutual fund", "sip", "crypto", "bitcoin", "gold", "index", 
            "bond", "deposit", "invest", "trading", "zerodha", "groww"
        ]
    },

    predictCategory(text) {
        if (!text || typeof text !== "string") return null;
        const normalized = text.toLowerCase().trim();

        for (const [category, keywords] of Object.entries(this.rules)) {
            for (const kw of keywords) {
                if (normalized.includes(kw)) {
                    return category;
                }
            }
        }
        return null;
    },

    // 2. USER CONTEXT & STORAGE HELPERS
    getCurrentUserEmail() {
        try {
            const u = JSON.parse(localStorage.getItem("user"));
            if (u && u.email) return u.email.trim().toLowerCase();
        } catch (e) {}
        return "guest";
    },

    getExpenses() {
        const key = `expenses_${this.getCurrentUserEmail()}`;
        return JSON.parse(localStorage.getItem(key)) || [];
    },

    getIncomes() {
        const key = `incomes_${this.getCurrentUserEmail()}`;
        return JSON.parse(localStorage.getItem(key)) || [];
    },

    // 3. REAL-TIME AI QUERY PROCESSOR
    answerQuery(rawQuery) {
        const query = (rawQuery || "").toLowerCase().trim();
        const expenses = this.getExpenses();
        const incomes = this.getIncomes();

        const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount || 0), 0);
        const netBalance = totalIncome - totalExpense;

        const now = new Date();
        const curMonth = now.getMonth();
        const curYear = now.getFullYear();

        // This Month Expenses
        const thisMonthExpenses = expenses.filter(e => {
            if (!e.date) return false;
            const d = new Date(e.date);
            return d.getMonth() === curMonth && d.getFullYear() === curYear;
        });
        const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

        // Last Month Expenses
        const lastMonthDate = new Date(curYear, curMonth - 1, 1);
        const lastMonthExpenses = expenses.filter(e => {
            if (!e.date) return false;
            const d = new Date(e.date);
            return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
        });
        const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

        // Category Totals
        const categoryMap = {};
        expenses.forEach(e => {
            const cat = e.category || "Other";
            categoryMap[cat] = (categoryMap[cat] || 0) + Number(e.amount || 0);
        });

        const sortedCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
        const topCategory = sortedCategories.length > 0 ? sortedCategories[0] : ["None", 0];

        // 1. Where am I spending the most? / What category costs the most?
        if (query.includes("most") || query.includes("highest") || query.includes("category costs") || query.includes("where am i spending")) {
            if (expenses.length === 0) {
                return "You haven't logged any expenses yet! Once you add a few entries, I will analyze which category consumes the largest portion of your budget.";
            }

            let breakdownText = sortedCategories.slice(0, 3).map(([cat, amt]) => {
                const pct = totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0;
                return `• **${cat}**: ₹${amt.toLocaleString("en-IN")} (${pct}% of total spending)`;
            }).join("\n");

            return `📊 **Your Highest Spending Areas:**\n\nYou are spending the most on **${topCategory[0]}**, totaling **₹${topCategory[1].toLocaleString("en-IN")}**.\n\nHere is your top spending breakdown:\n${breakdownText}\n\n💡 *Tip: Setting a targeted cap on ${topCategory[0]} is your fastest lever to boost net savings.*`;
        }

        // 2. How much did I spend this month? / Summarize my spending this month
        if (query.includes("this month") && (query.includes("how much") || query.includes("spend") || query.includes("summary") || query.includes("summarize"))) {
            const monthName = now.toLocaleDateString("en-US", { month: "long" });
            if (thisMonthExpenses.length === 0) {
                return `You haven't recorded any expenses for **${monthName} ${curYear}** yet. Total outflow is currently **₹0**.`;
            }

            const dailyAvg = Math.round(thisMonthTotal / now.getDate());
            return `📅 **${monthName} ${curYear} Spending Summary:**\n\n• **Total Spent:** ₹${thisMonthTotal.toLocaleString("en-IN")}\n• **Total Transactions:** ${thisMonthExpenses.length}\n• **Average Daily Burn:** ₹${dailyAvg.toLocaleString("en-IN")}/day\n\nYour highest expense this month was **${thisMonthExpenses.sort((a, b) => b.amount - a.amount)[0]?.name || "N/A"}** (₹${Number(thisMonthExpenses.sort((a, b) => b.amount - a.amount)[0]?.amount || 0).toLocaleString("en-IN")}).`;
        }

        // 3. Compare my spending with last month / Compare this month
        if (query.includes("compare") || query.includes("last month")) {
            const curMonthName = now.toLocaleDateString("en-US", { month: "short" });
            const lastMonthName = lastMonthDate.toLocaleDateString("en-US", { month: "short" });

            if (lastMonthTotal === 0 && thisMonthTotal === 0) {
                return `There is not enough historical data across **${lastMonthName}** and **${curMonthName}** yet to calculate a meaningful month-over-month trajectory.`;
            }

            const diff = thisMonthTotal - lastMonthTotal;
            if (lastMonthTotal === 0) {
                return `📈 In **${curMonthName}**, your total spending is **₹${thisMonthTotal.toLocaleString("en-IN")}**. (No data was logged for ${lastMonthName}).`;
            }

            const pctChange = Math.abs(Math.round((diff / lastMonthTotal) * 100));
            if (diff > 0) {
                return `📈 **Month-over-Month Comparison:**\n\nYour spending in **${curMonthName}** (₹${thisMonthTotal.toLocaleString("en-IN")}) is **${pctChange}% HIGHER** compared to **${lastMonthName}** (₹${lastMonthTotal.toLocaleString("en-IN")}).\n\n⚠️ Increase of ₹${diff.toLocaleString("en-IN")}. Review recent transactions to keep outflows in check.`;
            } else if (diff < 0) {
                return `📉 **Month-over-Month Comparison:**\n\nGreat job! Your spending in **${curMonthName}** (₹${thisMonthTotal.toLocaleString("en-IN")}) is **${pctChange}% LOWER** compared to **${lastMonthName}** (₹${lastMonthTotal.toLocaleString("en-IN")}).\n\n🎉 You have reduced outflows by ₹${Math.abs(diff).toLocaleString("en-IN")}!`;
            } else {
                return `⚖️ Your spending in **${curMonthName}** (₹${thisMonthTotal.toLocaleString("en-IN")}) is exactly equal to **${lastMonthName}**.`;
            }
        }

        // 4. Give me tips to reduce unnecessary expenses / Where can I save money?
        if (query.includes("tip") || query.includes("reduce") || query.includes("save money") || query.includes("saving")) {
            const discretionary = ["Food", "Shopping", "Entertainment"];
            const discSpend = expenses
                .filter(e => discretionary.includes(e.category))
                .reduce((s, e) => s + Number(e.amount || 0), 0);

            const potentialSave = Math.round(discSpend * 0.2);

            return `💡 **Personalized Savings Opportunities:**\n\n1. **Discretionary Spending:** You spent **₹${discSpend.toLocaleString("en-IN")}** across Food, Shopping & Entertainment. Trimming just 20% would save you **₹${potentialSave.toLocaleString("en-IN")}** every month.\n2. **The 50/30/20 Rule:** Strive to keep Needs at 50%, Wants at 30%, and channel 20% directly into savings & investments.\n3. **Audit Recurring Bills:** Check your recurring utility & subscription bills for unused services.`;
        }

        // 5. Biggest expenses / Spending patterns
        if (query.includes("biggest") || query.includes("largest") || query.includes("pattern")) {
            if (expenses.length === 0) {
                return "No expenses have been recorded yet. Add transactions to inspect high-ticket items.";
            }

            const topExpenses = [...expenses].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0)).slice(0, 3);
            let topList = topExpenses.map((e, idx) => `${idx + 1}. **${e.name}**: ₹${Number(e.amount).toLocaleString("en-IN")} (${e.category || "General"}, ${e.date || "recent"})`).join("\n");

            return `🔍 **Your Largest Recorded Transactions:**\n\n${topList}\n\nThese 3 purchases alone account for **₹${topExpenses.reduce((s, e) => s + Number(e.amount), 0).toLocaleString("en-IN")}**.`;
        }

        // 6. Food specific check: "Am I spending too much on food?"
        if (query.includes("food")) {
            const foodTotal = categoryMap["Food"] || 0;
            const foodPct = totalExpense > 0 ? Math.round((foodTotal / totalExpense) * 100) : 0;

            if (foodTotal === 0) {
                return "You currently have ₹0 logged in the Food category.";
            }

            if (foodPct > 35) {
                return `🍔 **Food Spending Analysis:**\n\nYou have spent **₹${foodTotal.toLocaleString("en-IN")}** on food, which is **${foodPct}%** of your total expenses. This is on the higher side. Meal prepping and reducing frequent food deliveries can free up notable surplus each week.`;
            } else {
                return `🍔 **Food Spending Analysis:**\n\nYou have spent **₹${foodTotal.toLocaleString("en-IN")}** on food (**${foodPct}%** of total expenses). Your food spending is well-balanced within normal budgeting benchmarks.`;
            }
        }

        // Default Comprehensive Overview
        const savingsRate = totalIncome > 0 ? Math.round((netBalance / totalIncome) * 100) : 0;
        return `🤖 **Financial Health Snapshot:**\n\n• **Total Income:** ₹${totalIncome.toLocaleString("en-IN")}\n• **Total Expenses:** ₹${totalExpense.toLocaleString("en-IN")}\n• **Net Balance:** ₹${netBalance.toLocaleString("en-IN")} (${savingsRate}% savings rate)\n• **Top Category:** ${topCategory[0]} (₹${topCategory[1].toLocaleString("en-IN")})\n\nFeel free to ask me questions like *"Where am I spending the most?"*, *"Compare this month"*, or *"Where can I save money?"*!`;
    },

    // 4. ANALYZE SINGLE EXPENSE (FOR RECEIPT MODAL)
    analyzeSingleExpense(expense) {
        if (!expense) return null;
        const allExpenses = this.getExpenses();
        const categoryExpenses = allExpenses.filter(e => e.category === expense.category);
        const catTotal = categoryExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const catAvg = categoryExpenses.length > 0 ? Math.round(catTotal / categoryExpenses.length) : expense.amount;
        const totalOutflow = allExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const shareOfTotal = totalOutflow > 0 ? Math.round((expense.amount / totalOutflow) * 100) : 100;

        let ratioText = "";
        if (expense.amount > catAvg * 1.5) {
            const factor = (expense.amount / (catAvg || 1)).toFixed(1);
            ratioText = `This transaction is <strong>${factor}x higher</strong> than your typical ${expense.category} average of ₹${catAvg.toLocaleString("en-IN")}.`;
        } else {
            ratioText = `This is consistent with your typical ${expense.category} average of ₹${catAvg.toLocaleString("en-IN")}.`;
        }

        return `• Accounts for <strong>${shareOfTotal}%</strong> of your total recorded expenses.<br>• ${ratioText}<br>• You have logged <strong>${categoryExpenses.length}</strong> purchases in ${expense.category}.`;
    }
};

// =========================================================
// UNIVERSAL THEME MANAGER
// =========================================================

const ThemeManager = {
    init() {
        const savedTheme = localStorage.getItem("theme") || "light";
        this.applyTheme(savedTheme);
    },

    applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);

        // Update all toggle buttons on the page
        const toggleBtns = document.querySelectorAll(".theme-toggle-btn");
        toggleBtns.forEach(btn => {
            const label = btn.querySelector(".theme-label-text");
            if (label) {
                label.textContent = theme === "dark" ? "Light" : "Dark";
            }
        });

        // Dispatch event for reactive Chart re-rendering
        window.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));
    },

    toggle() {
        const current = document.documentElement.getAttribute("data-theme") || "light";
        const nextTheme = current === "dark" ? "light" : "dark";
        this.applyTheme(nextTheme);
    }
};

// =========================================================
// AI CHAT UI & DOM INTEGRATION
// =========================================================

const AIChatUI = {
    isOpen: false,
    history: [],

    init() {
        // Only inject on logged-in pages with sidebar or main-content
        if (!document.querySelector(".main-content") && !document.querySelector(".auth-card")) return;
        
        this.injectThemeToggle();
        if (document.querySelector(".main-content")) {
            this.injectChatDOM();
            this.setupCategorySuggestionObserver();
        }
    },

    injectThemeToggle() {
        // Place in top-bar or auth header
        const topBarActions = document.querySelector(".top-bar-actions");
        const authCardHeader = document.querySelector(".auth-card-header");

        const toggleHTML = `
            <button type="button" class="theme-toggle-btn" id="globalThemeToggleBtn" title="Toggle Light/Dark Theme">
                <i class="fa-regular fa-sun theme-icon-sun"></i>
                <i class="fa-regular fa-moon theme-icon-moon"></i>
                <span class="theme-label-text">Theme</span>
            </button>
        `;

        if (topBarActions && !document.getElementById("globalThemeToggleBtn")) {
            topBarActions.insertAdjacentHTML("afterbegin", toggleHTML);
        } else if (authCardHeader && !document.getElementById("globalThemeToggleBtn")) {
            const authToggleContainer = document.createElement("div");
            authToggleContainer.style.display = "flex";
            authToggleContainer.style.justifyContent = "flex-end";
            authToggleContainer.style.marginBottom = "12px";
            authToggleContainer.innerHTML = toggleHTML;
            authCardHeader.parentNode.insertBefore(authToggleContainer, authCardHeader);
        }

        const btn = document.getElementById("globalThemeToggleBtn");
        if (btn) {
            btn.addEventListener("click", () => ThemeManager.toggle());
        }
    },

    injectChatDOM() {
        if (document.getElementById("aiFloatingLauncher")) return;

        // Floating Launcher
        const launcherHTML = `
            <button type="button" class="ai-floating-launcher" id="aiFloatingLauncher" title="Ask AI Financial Assistant">
                <i class="fa-solid fa-wand-magic-sparkles ai-launcher-icon"></i>
                <span>Ask AI Advisor</span>
            </button>
        `;
        document.body.insertAdjacentHTML("beforeend", launcherHTML);

        // Chat Drawer
        const chatDrawerHTML = `
            <div class="ai-chat-drawer hidden" id="aiChatDrawer">
                <div class="ai-chat-header">
                    <div class="ai-header-left">
                        <div class="ai-header-avatar">
                            <i class="fa-solid fa-robot"></i>
                        </div>
                        <div class="ai-header-title">
                            <h4>AI Financial Advisor</h4>
                            <div class="ai-header-status">
                                <span class="ai-status-dot"></span>
                                <span>Analyzing your vault</span>
                            </div>
                        </div>
                    </div>
                    <div class="ai-header-actions">
                        <button type="button" class="ai-header-btn" id="aiClearChatBtn" title="Clear Chat History">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                        <button type="button" class="ai-header-btn" id="aiCloseChatBtn" title="Close">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>

                <div class="ai-chat-messages" id="aiChatMessages">
                    <div class="chat-msg assistant">
                        <div class="chat-bubble">
                            👋 Hello! I'm your <strong>AI Financial Assistant</strong>. Ask me anything about your spending, highest expense areas, monthly comparisons, or ways to boost your savings!
                        </div>
                        <span class="chat-time">Just now</span>
                    </div>
                </div>

                <!-- Suggested Prompts -->
                <div class="ai-suggested-prompts" id="aiSuggestedPrompts">
                    <button type="button" class="prompt-chip" data-query="Where am I spending the most?">📊 Top Spending</button>
                    <button type="button" class="prompt-chip" data-query="How much did I spend this month?">📅 This Month</button>
                    <button type="button" class="prompt-chip" data-query="Compare my spending with last month">📈 MoM Trend</button>
                    <button type="button" class="prompt-chip" data-query="Where can I save money?">💡 Savings Tips</button>
                    <button type="button" class="prompt-chip" data-query="Show my biggest expenses">🔍 Big Purchases</button>
                </div>

                <!-- Chat Input -->
                <form class="ai-chat-input-bar" id="aiChatForm">
                    <input type="text" id="aiChatInput" placeholder="Ask about your finances..." autocomplete="off">
                    <button type="submit" class="ai-send-btn" id="aiSendBtn" aria-label="Send message">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                </form>
            </div>
        `;
        document.body.insertAdjacentHTML("beforeend", chatDrawerHTML);

        this.bindEvents();
    },

    bindEvents() {
        const launcher = document.getElementById("aiFloatingLauncher");
        const drawer = document.getElementById("aiChatDrawer");
        const closeBtn = document.getElementById("aiCloseChatBtn");
        const clearBtn = document.getElementById("aiClearChatBtn");
        const form = document.getElementById("aiChatForm");
        const input = document.getElementById("aiChatInput");
        const prompts = document.querySelectorAll(".prompt-chip");

        const toggleDrawer = () => {
            this.isOpen = !this.isOpen;
            if (this.isOpen) {
                drawer.classList.remove("hidden");
                input.focus();
            } else {
                drawer.classList.add("hidden");
            }
        };

        if (launcher) launcher.addEventListener("click", toggleDrawer);
        if (closeBtn) closeBtn.addEventListener("click", () => {
            this.isOpen = false;
            drawer.classList.add("hidden");
        });

        if (clearBtn) {
            clearBtn.addEventListener("click", () => {
                const container = document.getElementById("aiChatMessages");
                container.innerHTML = `
                    <div class="chat-msg assistant">
                        <div class="chat-bubble">
                            Chat history cleared. How can I help you analyze your finances today?
                        </div>
                    </div>
                `;
            });
        }

        prompts.forEach(chip => {
            chip.addEventListener("click", () => {
                const q = chip.getAttribute("data-query");
                if (q) this.sendUserMessage(q);
            });
        });

        if (form) {
            form.addEventListener("submit", (e) => {
                e.preventDefault();
                const text = input.value.trim();
                if (!text) return;
                input.value = "";
                this.sendUserMessage(text);
            });
        }
    },

    sendUserMessage(query) {
        const container = document.getElementById("aiChatMessages");
        if (!container) return;

        // Append User Msg
        const userMsg = document.createElement("div");
        userMsg.className = "chat-msg user";
        userMsg.innerHTML = `
            <div class="chat-bubble">${escapeHtml(query)}</div>
            <span class="chat-time">Just now</span>
        `;
        container.appendChild(userMsg);

        // Append Typing Indicator
        const typingMsg = document.createElement("div");
        typingMsg.className = "chat-msg assistant typing-msg";
        typingMsg.innerHTML = `
            <div class="typing-indicator">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        `;
        container.appendChild(typingMsg);
        container.scrollTop = container.scrollHeight;

        // Simulate fast intelligent processing delay
        setTimeout(() => {
            if (typingMsg.parentNode) {
                typingMsg.parentNode.removeChild(typingMsg);
            }

            const response = AIEngine.answerQuery(query);
            const assistantMsg = document.createElement("div");
            assistantMsg.className = "chat-msg assistant";
            assistantMsg.innerHTML = `
                <div class="chat-bubble">${formatMarkdown(response)}</div>
                <span class="chat-time">Just now</span>
            `;
            container.appendChild(assistantMsg);
            container.scrollTop = container.scrollHeight;
        }, 500);
    },

    // 5. OBSERVE FORM DESCRIPTION INPUTS FOR REAL-TIME CATEGORY SUGGESTION
    setupCategorySuggestionObserver() {
        const inputs = ["expenseName", "transName", "quickTransName"];
        inputs.forEach(id => {
            const inputEl = document.getElementById(id);
            if (!inputEl) return;

            const formGroup = inputEl.closest(".form-group") || inputEl.closest(".modal-form-group");
            if (!formGroup) return;

            let badge = formGroup.querySelector(".ai-category-suggestion-pill");
            if (!badge) {
                badge = document.createElement("div");
                badge.className = "ai-category-suggestion-pill";
                badge.style.display = "none";
                formGroup.appendChild(badge);
            }

            inputEl.addEventListener("input", () => {
                const text = inputEl.value;
                const predicted = AIEngine.predictCategory(text);

                if (predicted) {
                    badge.innerHTML = `
                        <span>✨ AI Suggestion: <strong>${predicted}</strong></span>
                        <button type="button" class="ai-suggestion-apply-btn" data-cat="${predicted}">Apply</button>
                    `;
                    badge.style.display = "inline-flex";

                    const applyBtn = badge.querySelector(".ai-suggestion-apply-btn");
                    applyBtn.addEventListener("click", (e) => {
                        e.preventDefault();
                        const selectEl = formGroup.closest("form").querySelector("select[id*='category']") || 
                                         formGroup.closest("form").querySelector("select[id*='Category']");
                        if (selectEl) {
                            selectEl.value = predicted;
                            badge.style.display = "none";
                        }
                    });
                } else {
                    badge.style.display = "none";
                }
            });
        });
    }
};

// Utilities
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
    // Basic Markdown bold & lists
    let formatted = escapeHtml(text);
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    formatted = formatted.replace(/\*(.*?)\*/g, "<em>$1</em>");
    formatted = formatted.replace(/\n/g, "<br>");
    return formatted;
}

// Auto Initialize
document.addEventListener("DOMContentLoaded", () => {
    ThemeManager.init();
    AIChatUI.init();
});

// Expose globally
window.AIEngine = AIEngine;
window.ThemeManager = ThemeManager;
window.AIChatUI = AIChatUI;
