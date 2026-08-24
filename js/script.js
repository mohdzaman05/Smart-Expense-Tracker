// =========================================================
// AUTHENTICATION SCRIPT - SMART EXPENSE TRACKER
// =========================================================

// Global Toast Helper
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
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3500);
}

// Password Visibility Toggle Utility
function setupPasswordToggle(buttonId, inputId, iconId) {
    const btn = document.getElementById(buttonId);
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);

    if (btn && input && icon) {
        btn.addEventListener("click", () => {
            const isPassword = input.getAttribute("type") === "password";
            input.setAttribute("type", isPassword ? "text" : "password");
            icon.className = isPassword ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
        });
    }
}

// User Storage Helpers for Multi-User Management
function getRegisteredUsers() {
    try {
        return JSON.parse(localStorage.getItem("users")) || [];
    } catch (e) {
        return [];
    }
}

function saveRegisteredUsers(users) {
    localStorage.setItem("users", JSON.stringify(users));
}

// Seed Demo Data ONLY for the demo account (alex@demo.com)
function seedDemoDataForUser(email) {
    if (!email) return;
    const normalizedEmail = email.trim().toLowerCase();
    const expKey = `expenses_${normalizedEmail}`;
    const incKey = `incomes_${normalizedEmail}`;
    const budgetKey = `budget_${normalizedEmail}`;

    const existingExp = JSON.parse(localStorage.getItem(expKey));
    const existingInc = JSON.parse(localStorage.getItem(incKey));

    if (!existingExp || existingExp.length === 0) {
        const today = new Date();
        const curYear = today.getFullYear();
        const curMonth = String(today.getMonth() + 1).padStart(2, "0");
        const curDay = String(today.getDate()).padStart(2, "0");

        const sampleExpenses = [
            {
                id: 1708500000001,
                name: "Whole Foods Grocery",
                amount: 3250,
                category: "Food",
                date: `${curYear}-${curMonth}-${curDay}`,
                payment: "UPI",
                notes: "Weekly vegetables & pantry restocking"
            },
            {
                id: 1708500000002,
                name: "Electricity & Wi-Fi Bill",
                amount: 2150,
                category: "Bills",
                date: `${curYear}-${curMonth}-05`,
                payment: "Debit Card",
                notes: "Monthly fiber broadband & utilities"
            },
            {
                id: 1708500000003,
                name: "Uber Office Commute",
                amount: 640,
                category: "Travel",
                date: `${curYear}-${curMonth}-10`,
                payment: "UPI",
                notes: "Cab ride during rain"
            },
            {
                id: 1708500000004,
                name: "Amazon Prime & Books",
                amount: 1499,
                category: "Shopping",
                date: `${curYear}-${curMonth}-14`,
                payment: "Credit Card",
                notes: "Tech handbook & stationery"
            },
            {
                id: 1708500000005,
                name: "Health Insurance & Meds",
                amount: 1800,
                category: "Health",
                date: `${curYear}-${curMonth}-18`,
                payment: "UPI",
                notes: "Routine checkup and vitamins"
            }
        ];

        localStorage.setItem(expKey, JSON.stringify(sampleExpenses));
    }

    if (!existingInc || existingInc.length === 0) {
        const today = new Date();
        const curYear = today.getFullYear();
        const curMonth = String(today.getMonth() + 1).padStart(2, "0");

        const sampleIncomes = [
            {
                id: 1708400000001,
                name: "Monthly Tech Salary",
                amount: 65000,
                category: "Salary",
                date: `${curYear}-${curMonth}-01`,
                payment: "Bank Transfer",
                notes: "Base remuneration for the month"
            },
            {
                id: 1708400000002,
                name: "Freelance UI Consultation",
                amount: 12500,
                category: "Freelance",
                date: `${curYear}-${curMonth}-12`,
                payment: "UPI",
                notes: "Client landing page optimization"
            }
        ];

        localStorage.setItem(incKey, JSON.stringify(sampleIncomes));
    }

    if (!localStorage.getItem(budgetKey)) {
        localStorage.setItem(budgetKey, JSON.stringify({ monthlyLimit: 25000, updatedAt: new Date().toISOString() }));
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Setup Password Toggles
    setupPasswordToggle("togglePasswordBtn", "password", "passwordEyeIcon");
    setupPasswordToggle("toggleRegPasswordBtn", "password", "regPasswordEyeIcon");

    // =========================================================
    // 1. REGISTER FUNCTIONALITY
    // =========================================================
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const name = document.getElementById("name").value.trim();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;
            const confirmPassword = document.getElementById("confirmPassword").value;

            if (!name || !email || !password) {
                showToast("Please fill in all required fields", "warning");
                return;
            }

            if (password !== confirmPassword) {
                showToast("Passwords do not match. Please verify again.", "danger");
                return;
            }

            if (password.length < 4) {
                showToast("Password should be at least 4 characters long", "warning");
                return;
            }

            const normalizedEmail = email.toLowerCase();
            const users = getRegisteredUsers();

            // Check if email already registered
            const existingUser = users.find(u => u.email.toLowerCase() === normalizedEmail);
            if (existingUser) {
                showToast("An account with this email already exists. Please sign in.", "warning");
                return;
            }

            const newUser = {
                name: name,
                email: normalizedEmail,
                password: password,
                joinedDate: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })
            };

            users.push(newUser);
            saveRegisteredUsers(users);

            // Explicitly initialize clean, zero financial state for the new user
            localStorage.setItem(`expenses_${normalizedEmail}`, JSON.stringify([]));
            localStorage.setItem(`incomes_${normalizedEmail}`, JSON.stringify([]));
            localStorage.setItem(`budget_${normalizedEmail}`, JSON.stringify({ monthlyLimit: 0 }));
            sessionStorage.removeItem(`smart_alert_dismissed_${normalizedEmail}`);

            // Clear any active session
            localStorage.removeItem("user");

            showToast("Account created successfully! Redirecting to login...", "success");

            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);
        });
    }

    // =========================================================
    // 2. LOGIN FUNCTIONALITY
    // =========================================================
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        // Demo Auto-fill Helper
        const demoBtn = document.getElementById("demoAccountBtn");
        if (demoBtn) {
            demoBtn.addEventListener("click", () => {
                const demoUser = {
                    name: "Alex Morgan",
                    email: "alex@demo.com",
                    password: "password123",
                    joinedDate: "Feb 2026"
                };

                // Ensure demo user is in registered users
                const users = getRegisteredUsers();
                if (!users.some(u => u.email.toLowerCase() === demoUser.email)) {
                    users.push(demoUser);
                    saveRegisteredUsers(users);
                }

                // Seed demo data strictly for demo account
                seedDemoDataForUser(demoUser.email);

                document.getElementById("email").value = demoUser.email;
                document.getElementById("password").value = demoUser.password;
                showToast("Demo credentials loaded! Click Sign In.", "info");
            });
        }

        loginForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;
            const normalizedEmail = email.toLowerCase();

            const users = getRegisteredUsers();
            let matchedUser = users.find(u => u.email.toLowerCase() === normalizedEmail && u.password === password);

            // Legacy fallback if users array was not yet initialized
            if (!matchedUser) {
                const savedUser = JSON.parse(localStorage.getItem("user"));
                if (savedUser && savedUser.email && savedUser.email.toLowerCase() === normalizedEmail && savedUser.password === password) {
                    matchedUser = savedUser;
                    // Migrate legacy user to users array
                    users.push({
                        name: savedUser.name,
                        email: normalizedEmail,
                        password: savedUser.password,
                        joinedDate: savedUser.joinedDate || "Feb 2026"
                    });
                    saveRegisteredUsers(users);
                }
            }

            if (!matchedUser) {
                showToast("Invalid email or password. Please try again or create an account.", "danger");
                return;
            }

            const submitBtn = document.getElementById("loginSubmitBtn");
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Signing in...</span>`;
            }

            // Set current active user session
            localStorage.setItem("user", JSON.stringify({
                name: matchedUser.name,
                email: matchedUser.email,
                joinedDate: matchedUser.joinedDate
            }));

            showToast("Welcome back, " + matchedUser.name + "!", "success");

            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 800);
        });
    }
});