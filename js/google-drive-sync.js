// =========================================================
// GOOGLE DRIVE CLOUD BACKUP & RESTORE - SMART EXPENSE TRACKER
// =========================================================

const GoogleDriveSync = {
    // 1. CONFIGURATION & STATE
    SCOPES: "https://www.googleapis.com/auth/drive.file",
    BACKUP_FILE_NAME: "smart_expense_tracker_backup.json",
    
    tokenClient: null,
    accessToken: null,
    userProfile: null,
    pendingRestoreData: null,

    init() {
        this.accessToken = sessionStorage.getItem("gdrive_token") || null;
        const storedUser = localStorage.getItem("gdrive_user_email");
        if (storedUser) {
            this.userProfile = { email: storedUser };
        }

        this.injectUI();
        this.updateStatusUI();

        // Check if GIS library is loaded
        if (window.google && window.google.accounts && window.google.accounts.oauth2) {
            this.setupTokenClient();
        } else {
            // Wait for GIS script
            window.addEventListener("load", () => {
                if (window.google && window.google.accounts && window.google.accounts.oauth2) {
                    this.setupTokenClient();
                }
            });
        }
    },

    getClientId() {
        return localStorage.getItem("gdrive_client_id") || "";
    },

    setClientId(clientId) {
        localStorage.setItem("gdrive_client_id", clientId.trim());
        this.setupTokenClient();
    },

    setupTokenClient() {
        const clientId = this.getClientId();
        if (!clientId || !window.google || !window.google.accounts) return;

        try {
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: this.SCOPES,
                callback: (tokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        this.accessToken = tokenResponse.access_token;
                        sessionStorage.setItem("gdrive_token", this.accessToken);
                        this.fetchUserInfo();
                    }
                }
            });
        } catch (e) {
            console.error("Google Token Client init error:", e);
        }
    },

    // 2. AUTHENTICATION (CONNECT / DISCONNECT)
    connect() {
        const clientId = this.getClientId();
        if (!clientId) {
            this.showToast("Please configure your Google OAuth Client ID in Settings first.", "warning");
            this.openModal();
            const configContent = document.getElementById("gdriveConfigContent");
            if (configContent) configContent.classList.remove("hidden");
            return;
        }

        if (!this.tokenClient) {
            this.setupTokenClient();
        }

        if (this.tokenClient) {
            // Request Token from Google
            this.tokenClient.requestAccessToken({ prompt: "consent" });
        } else {
            this.showToast("Google Identity Services not ready. Please check internet connection.", "danger");
        }
    },

    async fetchUserInfo() {
        try {
            const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: { Authorization: `Bearer ${this.accessToken}` }
            });
            if (res.ok) {
                const info = await res.json();
                this.userProfile = info;
                localStorage.setItem("gdrive_user_email", info.email || "Connected");
                this.showToast(`Connected to Google Drive as ${info.email}`, "success");
                this.updateStatusUI();
                this.checkAutoRestoreOnFreshInstall();
            }
        } catch (e) {
            this.userProfile = { email: "Google Account Connected" };
            this.updateStatusUI();
        }
    },

    disconnect() {
        if (this.accessToken && window.google && window.google.accounts) {
            try {
                google.accounts.oauth2.revoke(this.accessToken, () => {});
            } catch (e) {}
        }

        this.accessToken = null;
        this.userProfile = null;
        sessionStorage.removeItem("gdrive_token");
        localStorage.removeItem("gdrive_user_email");
        this.updateStatusUI();
        this.showToast("Google Drive disconnected", "info");
    },

    getCurrentUserEmail() {
        try {
            const u = JSON.parse(localStorage.getItem("user"));
            if (u && u.email) return u.email.trim().toLowerCase();
        } catch (e) {}
        return "guest";
    },

    // 3. BACKUP EXPENSE DATA TO GOOGLE DRIVE
    async backupNow() {
        if (!this.accessToken) {
            this.showToast("Please connect to Google Drive first.", "warning");
            this.connect();
            return;
        }

        const backupBtn = document.getElementById("btnModalBackupNow");
        if (backupBtn) {
            backupBtn.disabled = true;
            backupBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Backing up...`;
        }

        try {
            // Compile structured backup payload
            const userEmail = this.getCurrentUserEmail();
            const expenses = JSON.parse(localStorage.getItem(`expenses_${userEmail}`)) || [];
            const incomes = JSON.parse(localStorage.getItem(`incomes_${userEmail}`)) || [];
            const budget = JSON.parse(localStorage.getItem(`budget_${userEmail}`)) || { monthlyLimit: 0 };
            const user = JSON.parse(localStorage.getItem("user")) || {};
            const theme = localStorage.getItem("theme") || "light";

            const backupData = {
                version: "1.0",
                appName: "Smart Expense Tracker",
                backupDate: new Date().toISOString(),
                user: {
                    name: user.name || "User",
                    email: user.email || userEmail
                },
                expenses: expenses,
                incomes: incomes,
                budget: budget,
                theme: theme,
                totalExpenses: expenses.length,
                totalIncomes: incomes.length
            };

            const jsonContent = JSON.stringify(backupData, null, 2);

            // Check if backup file already exists on Drive
            const existingFileId = await this.findBackupFileId();

            let uploadUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
            let method = "POST";

            if (existingFileId) {
                uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
                method = "PATCH";
            }

            const metadata = {
                name: this.BACKUP_FILE_NAME,
                mimeType: "application/json",
                description: "Smart Expense Tracker Automated Financial Vault Backup"
            };

            const boundary = "-------314159265358979323846";
            const delimiter = `\r\n--${boundary}\r\n`;
            const closeDelimiter = `\r\n--${boundary}--`;

            const multipartRequestBody =
                delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                jsonContent +
                closeDelimiter;

            const response = await fetch(uploadUrl, {
                method: method,
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    "Content-Type": `multipart/related; boundary=${boundary}`
                },
                body: multipartRequestBody
            });

            if (!response.ok) {
                if (response.status === 401) {
                    this.showToast("Session expired. Reconnecting to Google...", "warning");
                    this.connect();
                    return;
                }
                throw new Error(`Upload failed with status ${response.status}`);
            }

            const result = await response.json();
            const nowTime = new Date().toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });

            localStorage.setItem("gdrive_last_backup", nowTime);
            this.showToast("Cloud backup completed successfully!", "success");
            this.updateStatusUI();
        } catch (error) {
            console.error("Backup error:", error);
            this.showToast(`Backup error: ${error.message || "Failed to upload to Google Drive"}`, "danger");
        } finally {
            if (backupBtn) {
                backupBtn.disabled = false;
                backupBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Backup Now`;
            }
        }
    },

    // 4. RESTORE EXPENSE DATA FROM GOOGLE DRIVE
    async restoreNow() {
        if (!this.accessToken) {
            this.showToast("Please connect to Google Drive first.", "warning");
            this.connect();
            return;
        }

        const restoreBtn = document.getElementById("btnModalRestoreNow");
        if (restoreBtn) {
            restoreBtn.disabled = true;
            restoreBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Finding backup...`;
        }

        try {
            const fileId = await this.findBackupFileId();
            if (!fileId) {
                this.showToast("No existing Smart Expense Tracker backup found in your Google Drive.", "info");
                return;
            }

            // Download file content
            const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
            const res = await fetch(downloadUrl, {
                headers: { Authorization: `Bearer ${this.accessToken}` }
            });

            if (!res.ok) {
                throw new Error("Failed to download cloud backup file.");
            }

            const backupData = await res.json();
            this.pendingRestoreData = backupData;
            this.openRestoreConfirmModal(backupData);
        } catch (error) {
            console.error("Restore error:", error);
            this.showToast(`Restore failed: ${error.message}`, "danger");
        } finally {
            if (restoreBtn) {
                restoreBtn.disabled = false;
                restoreBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-down"></i> Restore Data`;
            }
        }
    },

    async findBackupFileId() {
        const query = `name='${this.BACKUP_FILE_NAME}' and trashed=false`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime)`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${this.accessToken}` }
        });

        if (res.ok) {
            const data = await res.json();
            if (data.files && data.files.length > 0) {
                return data.files[0].id;
            }
        }
        return null;
    },

    // 5. RESTORE CONFIRMATION & STRATEGY (REPLACE vs MERGE)
    openRestoreConfirmModal(backupData) {
        const modal = document.getElementById("gdriveRestoreModal");
        if (!modal) return;

        const dateStr = backupData.backupDate ? new Date(backupData.backupDate).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }) : "Recent Backup";

        document.getElementById("restoreBackupDate").textContent = dateStr;
        document.getElementById("restoreExpenseCount").textContent = `${(backupData.expenses || []).length} expenses`;
        document.getElementById("restoreIncomeCount").textContent = `${(backupData.incomes || []).length} incomes`;

        modal.classList.remove("hidden");
    },

    applyRestore(strategy = "replace") {
        if (!this.pendingRestoreData) return;

        const userEmail = this.getCurrentUserEmail();
        const cloudExpenses = this.pendingRestoreData.expenses || [];
        const cloudIncomes = this.pendingRestoreData.incomes || [];
        const cloudBudget = this.pendingRestoreData.budget || { monthlyLimit: 0 };

        if (strategy === "replace") {
            localStorage.setItem(`expenses_${userEmail}`, JSON.stringify(cloudExpenses));
            localStorage.setItem(`incomes_${userEmail}`, JSON.stringify(cloudIncomes));
            if (this.pendingRestoreData.budget) {
                localStorage.setItem(`budget_${userEmail}`, JSON.stringify(cloudBudget));
            }
            this.showToast(`Restored ${cloudExpenses.length} expenses and ${cloudIncomes.length} incomes!`, "success");
        } else {
            // Merge strategy with deduplication by ID or date+name+amount
            const localExpenses = JSON.parse(localStorage.getItem(`expenses_${userEmail}`)) || [];
            const localIncomes = JSON.parse(localStorage.getItem(`incomes_${userEmail}`)) || [];

            const expenseMap = new Map();
            localExpenses.forEach(e => expenseMap.set(String(e.id || `${e.date}_${e.name}_${e.amount}`), e));
            cloudExpenses.forEach(e => expenseMap.set(String(e.id || `${e.date}_${e.name}_${e.amount}`), e));

            const incomeMap = new Map();
            localIncomes.forEach(i => incomeMap.set(String(i.id || `${i.date}_${i.name}_${i.amount}`), i));
            cloudIncomes.forEach(i => incomeMap.set(String(i.id || `${i.date}_${i.name}_${i.amount}`), i));

            const mergedExpenses = Array.from(expenseMap.values());
            const mergedIncomes = Array.from(incomeMap.values());

            localStorage.setItem(`expenses_${userEmail}`, JSON.stringify(mergedExpenses));
            localStorage.setItem(`incomes_${userEmail}`, JSON.stringify(mergedIncomes));
            if (this.pendingRestoreData.budget) {
                localStorage.setItem(`budget_${userEmail}`, JSON.stringify(cloudBudget));
            }

            this.showToast(`Merged cloud data! Total: ${mergedExpenses.length} expenses, ${mergedIncomes.length} incomes`, "success");
        }

        const modal = document.getElementById("gdriveRestoreModal");
        if (modal) modal.classList.add("hidden");

        // Reload page after a brief moment to refresh charts and tables
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    },

    async checkAutoRestoreOnFreshInstall() {
        const userEmail = this.getCurrentUserEmail();
        const localExpenses = JSON.parse(localStorage.getItem(`expenses_${userEmail}`)) || [];
        const localIncomes = JSON.parse(localStorage.getItem(`incomes_${userEmail}`)) || [];

        if (localExpenses.length === 0 && localIncomes.length === 0) {
            const fileId = await this.findBackupFileId();
            if (fileId) {
                this.showToast("Cloud backup detected for your account! Opening restore...", "info");
                this.restoreNow();
            }
        }
    },

    // 6. UI MODAL INJECTION & EVENT LISTENERS
    injectUI() {
        // Inject Top Bar Sync Button
        const topBarActions = document.querySelector(".top-bar-actions");
        if (topBarActions && !document.getElementById("globalDriveSyncBtn")) {
            const syncBtnHTML = `
                <button type="button" class="btn-cloud-sync" id="globalDriveSyncBtn" title="Google Drive Cloud Backup">
                    <i class="fa-brands fa-google-drive"></i>
                    <span id="topBarSyncText">Cloud Sync</span>
                </button>
            `;
            topBarActions.insertAdjacentHTML("afterbegin", syncBtnHTML);

            document.getElementById("globalDriveSyncBtn").addEventListener("click", () => {
                this.openModal();
            });
        }

        // Inject Cloud Backup Modal
        if (!document.getElementById("gdriveBackupModal")) {
            const modalHTML = `
                <div class="modal-backdrop hidden" id="gdriveBackupModal">
                    <div class="modal-card" style="max-width: 520px;">
                        <div class="modal-header">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <i class="fa-brands fa-google-drive" style="font-size: 20px; color: #4285f4;"></i>
                                <h3>Google Drive Cloud Backup</h3>
                            </div>
                            <button type="button" class="modal-close-btn" id="closeGdriveModalBtn" aria-label="Close modal">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <div class="modal-body">
                            <!-- Status Banner -->
                            <div class="cloud-status-banner">
                                <div class="cloud-status-left">
                                    <div class="cloud-drive-logo-icon">
                                        <i class="fa-brands fa-google-drive"></i>
                                    </div>
                                    <div class="cloud-status-info">
                                        <h4>
                                            Google Drive
                                            <span class="cloud-status-badge disconnected" id="gdriveStatusBadge">Not Connected</span>
                                        </h4>
                                        <p id="gdriveLastBackupText">Last Backup: Never</p>
                                    </div>
                                </div>
                                <div id="gdriveConnectActionContainer">
                                    <button type="button" class="btn-gdrive-connect" id="btnConnectGdrive">
                                        <i class="fa-brands fa-google"></i> Connect
                                    </button>
                                </div>
                            </div>

                            <!-- Actions Grid (Visible when connected) -->
                            <div class="cloud-actions-grid" id="gdriveActionsGrid">
                                <button type="button" class="btn-gdrive-action btn-gdrive-backup" id="btnModalBackupNow">
                                    <i class="fa-solid fa-cloud-arrow-up"></i> Backup Now
                                </button>
                                <button type="button" class="btn-gdrive-action btn-gdrive-restore" id="btnModalRestoreNow">
                                    <i class="fa-solid fa-cloud-arrow-down"></i> Restore Data
                                </button>
                            </div>

                            <!-- Auto Backup Option -->
                            <div class="cloud-setting-row">
                                <div class="cloud-setting-info">
                                    <h5>Automatic Cloud Sync</h5>
                                    <p>Automatically backup current vault before signing out</p>
                                </div>
                                <label style="display: flex; align-items: center; cursor: pointer;">
                                    <input type="checkbox" id="gdriveAutoBackupCheck" style="width: 18px; height: 18px; accent-color: var(--primary);">
                                </label>
                            </div>

                            <!-- Client ID Setup Configuration Accordion -->
                            <div class="gdrive-config-box">
                                <div class="gdrive-config-header" id="toggleGdriveConfigBtn">
                                    <span>⚙️ Google OAuth Client ID Settings</span>
                                    <i class="fa-solid fa-chevron-down" id="configChevronIcon"></i>
                                </div>
                                <div class="gdrive-config-content hidden" id="gdriveConfigContent">
                                    <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">Your Google OAuth Client ID:</label>
                                    <input type="text" id="gdriveClientIdInput" placeholder="e.g. 123456789-abc.apps.googleusercontent.com">
                                    <button type="button" class="btn-save" id="btnSaveClientId" style="padding: 6px 14px; font-size: 12px; align-self: flex-end;">
                                        Save Client ID
                                    </button>
                                    <div class="gdrive-config-help">
                                        <strong>How to get a Client ID:</strong><br>
                                        1. Open <a href="https://console.cloud.google.com/apis/credentials" target="_blank">Google Cloud Console</a>.<br>
                                        2. Create an <em>OAuth 2.0 Web Client ID</em>.<br>
                                        3. Add authorized JavaScript origin: <code>${window.location.origin || "http://localhost"}</code>.<br>
                                        4. Enable the <em>Google Drive API</em> in Google Cloud Library.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="modal-footer">
                            <button type="button" class="btn-cancel" id="closeGdriveModalFooterBtn">Done</button>
                        </div>
                    </div>
                </div>

                <!-- Restore Strategy Modal -->
                <div class="modal-backdrop hidden" id="gdriveRestoreModal">
                    <div class="modal-card" style="max-width: 480px;">
                        <div class="modal-header">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <i class="fa-solid fa-cloud-arrow-down" style="color: var(--primary);"></i>
                                <h3>Restore Cloud Backup</h3>
                            </div>
                            <button type="button" class="modal-close-btn" id="closeRestoreModalBtn">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <div class="modal-body">
                            <p style="font-size: 13.5px; color: var(--text-secondary); margin-bottom: 12px;">
                                An expense tracker backup was found in your Google Drive.
                            </p>

                            <!-- Restore Preview -->
                            <div class="restore-preview-card">
                                <div class="restore-preview-stat">
                                    <span class="label">Backup Timestamp:</span>
                                    <span class="val" id="restoreBackupDate">-</span>
                                </div>
                                <div class="restore-preview-stat">
                                    <span class="label">Expenses in Cloud:</span>
                                    <span class="val" id="restoreExpenseCount">0</span>
                                </div>
                                <div class="restore-preview-stat">
                                    <span class="label">Incomes in Cloud:</span>
                                    <span class="val" id="restoreIncomeCount">0</span>
                                </div>
                            </div>

                            <!-- Strategy Choice -->
                            <label style="font-size: 13px; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 8px;">
                                Choose Restore Action:
                            </label>

                            <div class="restore-options-group">
                                <label class="restore-option-radio">
                                    <input type="radio" name="restoreStrategy" value="merge" checked>
                                    <div class="restore-option-text">
                                        <h5>Merge with Current Data (Recommended)</h5>
                                        <p>Combines cloud records with your local entries, automatically preventing duplicates.</p>
                                    </div>
                                </label>

                                <label class="restore-option-radio">
                                    <input type="radio" name="restoreStrategy" value="replace">
                                    <div class="restore-option-text">
                                        <h5>Replace Existing Data</h5>
                                        <p>Overwrites your local database completely with the cloud backup.</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div class="modal-footer">
                            <button type="button" class="btn-cancel" id="cancelRestoreBtn">Cancel</button>
                            <button type="button" class="btn-save" id="btnConfirmApplyRestore">
                                <i class="fa-solid fa-check"></i> Restore Now
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML("beforeend", modalHTML);
            this.bindModalEvents();
        }
    },

    bindModalEvents() {
        const modal = document.getElementById("gdriveBackupModal");
        const closeBtn = document.getElementById("closeGdriveModalBtn");
        const closeFooterBtn = document.getElementById("closeGdriveModalFooterBtn");

        const closeModal = () => modal.classList.add("hidden");
        if (closeBtn) closeBtn.addEventListener("click", closeModal);
        if (closeFooterBtn) closeFooterBtn.addEventListener("click", closeModal);

        const btnConnect = document.getElementById("btnConnectGdrive");
        if (btnConnect) btnConnect.addEventListener("click", () => this.connect());

        const btnBackup = document.getElementById("btnModalBackupNow");
        if (btnBackup) btnBackup.addEventListener("click", () => this.backupNow());

        const btnRestore = document.getElementById("btnModalRestoreNow");
        if (btnRestore) btnRestore.addEventListener("click", () => this.restoreNow());

        // Config Toggle
        const toggleConfigBtn = document.getElementById("toggleGdriveConfigBtn");
        const configContent = document.getElementById("gdriveConfigContent");
        const chevron = document.getElementById("configChevronIcon");
        const clientIdInput = document.getElementById("gdriveClientIdInput");
        const btnSaveClientId = document.getElementById("btnSaveClientId");

        if (clientIdInput) clientIdInput.value = this.getClientId();

        if (toggleConfigBtn && configContent) {
            toggleConfigBtn.addEventListener("click", () => {
                configContent.classList.toggle("hidden");
                chevron.className = configContent.classList.contains("hidden") ? "fa-solid fa-chevron-down" : "fa-solid fa-chevron-up";
            });
        }

        if (btnSaveClientId) {
            btnSaveClientId.addEventListener("click", () => {
                const val = clientIdInput.value.trim();
                this.setClientId(val);
                this.showToast("Google OAuth Client ID saved!", "success");
            });
        }

        // Auto Backup Setting
        const autoCheck = document.getElementById("gdriveAutoBackupCheck");
        if (autoCheck) {
            autoCheck.checked = localStorage.getItem("gdrive_auto_backup") === "true";
            autoCheck.addEventListener("change", () => {
                localStorage.setItem("gdrive_auto_backup", autoCheck.checked ? "true" : "false");
                this.showToast(`Auto cloud backup ${autoCheck.checked ? 'enabled' : 'disabled'}`, "info");
            });
        }

        // Restore Modal Actions
        const restoreModal = document.getElementById("gdriveRestoreModal");
        const closeRestoreBtn = document.getElementById("closeRestoreModalBtn");
        const cancelRestoreBtn = document.getElementById("cancelRestoreBtn");
        const confirmRestoreBtn = document.getElementById("btnConfirmApplyRestore");

        const closeRestore = () => restoreModal.classList.add("hidden");
        if (closeRestoreBtn) closeRestoreBtn.addEventListener("click", closeRestore);
        if (cancelRestoreBtn) cancelRestoreBtn.addEventListener("click", closeRestore);

        if (confirmRestoreBtn) {
            confirmRestoreBtn.addEventListener("click", () => {
                const selectedRadio = document.querySelector("input[name='restoreStrategy']:checked");
                const strategy = selectedRadio ? selectedRadio.value : "merge";
                this.applyRestore(strategy);
            });
        }
    },

    openModal() {
        const modal = document.getElementById("gdriveBackupModal");
        if (modal) {
            this.updateStatusUI();
            modal.classList.remove("hidden");
        }
    },

    updateStatusUI() {
        const isConnected = !!this.accessToken;
        const statusBadge = document.getElementById("gdriveStatusBadge");
        const lastBackupText = document.getElementById("gdriveLastBackupText");
        const actionContainer = document.getElementById("gdriveConnectActionContainer");
        const syncBtn = document.getElementById("globalDriveSyncBtn");
        const topBarSyncText = document.getElementById("topBarSyncText");

        const lastBackup = localStorage.getItem("gdrive_last_backup") || "Never";

        if (lastBackupText) {
            lastBackupText.textContent = `Last Backup: ${lastBackup}`;
        }

        if (isConnected) {
            if (statusBadge) {
                statusBadge.className = "cloud-status-badge connected";
                statusBadge.textContent = "Connected";
            }
            if (actionContainer) {
                const email = (this.userProfile && this.userProfile.email) || "Google Account";
                actionContainer.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                        <span style="font-size: 11.5px; color: var(--text-muted);">${email}</span>
                        <button type="button" class="btn-gdrive-disconnect" onclick="GoogleDriveSync.disconnect()">
                            <i class="fa-solid fa-link-slash"></i> Disconnect
                        </button>
                    </div>
                `;
            }
            if (syncBtn) {
                syncBtn.classList.add("connected");
                if (topBarSyncText) topBarSyncText.textContent = "Drive Synced";
            }
        } else {
            if (statusBadge) {
                statusBadge.className = "cloud-status-badge disconnected";
                statusBadge.textContent = "Not Connected";
            }
            if (actionContainer) {
                actionContainer.innerHTML = `
                    <button type="button" class="btn-gdrive-connect" id="btnConnectGdrive" onclick="GoogleDriveSync.connect()">
                        <i class="fa-brands fa-google"></i> Connect
                    </button>
                `;
            }
            if (syncBtn) {
                syncBtn.classList.remove("connected");
                if (topBarSyncText) topBarSyncText.textContent = "Cloud Sync";
            }
        }
    },

    showToast(message, type = "info") {
        if (typeof showToast === "function") {
            showToast(message, type);
        } else {
            const container = document.getElementById("toastContainer");
            if (!container) return;
            const toast = document.createElement("div");
            toast.className = `toast ${type}`;
            toast.innerHTML = `<span>${message}</span>`;
            container.appendChild(toast);
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 3500);
        }
    }
};

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
    GoogleDriveSync.init();
});

// Expose globally
window.GoogleDriveSync = GoogleDriveSync;
