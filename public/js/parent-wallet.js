// Parent Wallet Management
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the wallet page
    if (document.getElementById('parent-wallet-container')) {
        initializeWallet();
    }
    
    // Handle send money button clicks if they exist
    const sendMoneyButtons = document.querySelectorAll('.send-money-btn');
    if (sendMoneyButtons.length > 0) {
        sendMoneyButtons.forEach(button => {
            button.addEventListener('click', function() {
                const studentId = this.getAttribute('data-student-id');
                const studentData = this.getAttribute('data-student-json');
                let student;
                
                try {
                    student = JSON.parse(studentData);
                } catch (e) {
                    console.error('Error parsing student data:', e);
                }
                
                if (student) {
                    const studentIdInput = document.getElementById('student-id');
                    const recipientInput = document.getElementById('recipient');
                    
                    if (studentIdInput) studentIdInput.value = studentId;
                    if (recipientInput) recipientInput.value = student.username;
                    
                    // Show modal
                    const sendMoneyModal = document.getElementById('sendMoneyModal');
                    if (sendMoneyModal) {
                        new bootstrap.Modal(sendMoneyModal).show();
                    }
                }
            });
        });
    }
    
    // Handle send money form submission
    const sendMoneyBtn = document.getElementById('send-money-btn');
    if (sendMoneyBtn) {
        sendMoneyBtn.addEventListener('click', function() {
            const studentIdInput = document.getElementById('student-id');
            const amountInput = document.getElementById('amount');
            const pinCodeInput = document.getElementById('pin-code');
            const errorElement = document.getElementById('send-money-error');
            
            if (!studentIdInput || !amountInput || !pinCodeInput) {
                console.error('Required form elements not found');
                return;
            }
            
            const studentId = studentIdInput.value;
            const amount = amountInput.value;
            const pinCode = pinCodeInput.value;
            
            // Validate inputs
            if (!amount || amount <= 0) {
                if (errorElement) {
                    errorElement.textContent = 'Please enter a valid amount';
                    errorElement.classList.remove('d-none');
                }
                return;
            }
            
            if (!pinCode) {
                if (errorElement) {
                    errorElement.textContent = 'Please enter your PIN code';
                    errorElement.classList.remove('d-none');
                }
                return;
            }
            
            // Hide error if previously shown
            if (errorElement) {
                errorElement.classList.add('d-none');
            }
            
            // Disable button and show loading state
            this.disabled = true;
            this.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Processing...';
            
            // Get token from localStorage
            const token = localStorage.getItem('token');
            if (!token) {
                showAlert('error', 'You are not logged in. Please log in to continue.');
                return;
            }
            
            // Send request
            fetch(`/parent/sendMoney/${studentId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount, pinCode })
            })
            .then(response => response.json())
            .then(data => {
                // Reset button state
                this.disabled = false;
                this.innerHTML = 'Send Money';
                
                if (data.message === true || data.success) {
                    // Hide modal
                    const sendMoneyModal = document.getElementById('sendMoneyModal');
                    if (sendMoneyModal) {
                        const modalInstance = bootstrap.Modal.getInstance(sendMoneyModal);
                        if (modalInstance) modalInstance.hide();
                    }
                    
                    // Show success message
                    showAlert('success', 'Money sent successfully');
                    
                    // Reload page after a short delay
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    // Show error message
                    if (errorElement) {
                        errorElement.textContent = data.message || 'Failed to send money';
                        errorElement.classList.remove('d-none');
                    }
                }
            })
            .catch(error => {
                console.error('Error sending money:', error);
                
                // Reset button state
                this.disabled = false;
                this.innerHTML = 'Send Money';
                
                // Show error message
                if (errorElement) {
                    errorElement.textContent = 'An error occurred while sending money';
                    errorElement.classList.remove('d-none');
                }
            });
        });
    }
});

// Initialize wallet functionality
function initializeWallet() {
    // Load pending transactions
    loadPendingTransactions();
    
    // Set up event listeners
    setupEventListeners();
}

// Load pending transactions from the API
function loadPendingTransactions() {
    // Get auth token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
        showAlert('error', 'You are not logged in. Please log in to continue.');
        return;
    }
    
    // Show loading state
    const pendingTransactionsContainer = document.getElementById('pending-transactions-container');
    if (!pendingTransactionsContainer) return;
    
    pendingTransactionsContainer.innerHTML = '<div class="text-center my-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Loading pending transactions...</p></div>';
    
    // Fetch pending transactions
    fetch('/parent/pending-transactions', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load pending transactions');
        }
        return response.json();
    })
    .then(data => {
        if (data.success && data.transactions) {
            displayPendingTransactions(data.transactions);
        } else {
            showAlert('error', data.message || 'Failed to load pending transactions');
            // Show empty state
            pendingTransactionsContainer.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No pending transactions available.
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error loading pending transactions:', error);
        showAlert('error', 'Failed to load pending transactions. Please try again later.');
        // Show error state
        if (pendingTransactionsContainer) {
            pendingTransactionsContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Error loading transactions. Please try again later.
                </div>
            `;
        }
    });
}

// Display pending transactions in the UI
function displayPendingTransactions(transactions) {
    const pendingTransactionsContainer = document.getElementById('pending-transactions-container');
    if (!pendingTransactionsContainer) return;
    
    if (!transactions || transactions.length === 0) {
        pendingTransactionsContainer.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                You have no pending transactions at this time.
            </div>
        `;
        return;
    }
    
    // Create table for transactions
    let html = `
        <div class="card shadow-sm mb-4">
            <div class="card-header bg-warning bg-opacity-10">
                <h5 class="card-title mb-0">
                    <i class="fas fa-clock me-2"></i>
                    Pending Transactions
                </h5>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Description</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
    `;
    
    // Add each transaction to the table
    transactions.forEach(transaction => {
        const date = transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : 'N/A';
        const typeClass = transaction.type === 'deposit' ? 'success' : 'primary';
        const typeText = transaction.type ? transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1) : 'Unknown';
        const amount = transaction.amount ? transaction.amount.toFixed(2) : '0.00';
        const description = transaction.description || 'No description';
        
        html += `
            <tr data-transaction-id="${transaction._id}">
                <td>${date}</td>
                <td><span class="badge bg-${typeClass}">${typeText}</span></td>
                <td>$${amount}</td>
                <td>${description}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-success approve-btn" data-transaction-id="${transaction._id}">
                            <i class="fas fa-check me-1"></i> Approve
                        </button>
                        <button class="btn btn-danger reject-btn" data-transaction-id="${transaction._id}">
                            <i class="fas fa-times me-1"></i> Reject
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="card-footer bg-light">
                <small class="text-muted">
                    <i class="fas fa-info-circle me-1"></i>
                    Approve or reject these transactions to update your account balance.
                </small>
            </div>
        </div>
    `;
    
    pendingTransactionsContainer.innerHTML = html;
    
    // Add event listeners to the newly created buttons
    document.querySelectorAll('.approve-btn').forEach(button => {
        button.addEventListener('click', function() {
            const transactionId = this.getAttribute('data-transaction-id');
            if (transactionId) {
                showPinConfirmation(transactionId, 'approve');
            }
        });
    });
    
    document.querySelectorAll('.reject-btn').forEach(button => {
        button.addEventListener('click', function() {
            const transactionId = this.getAttribute('data-transaction-id');
            if (transactionId) {
                showRejectConfirmation(transactionId);
            }
        });
    });
}

// Setup event listeners
function setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-transactions-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadPendingTransactions();
        });
    }
}

// Show PIN confirmation modal for transaction approval
function showPinConfirmation(transactionId, action) {
    if (!transactionId) return;
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('pin-confirmation-modal');
    if (!modal) {
        const modalHtml = `
            <div class="modal fade" id="pin-confirmation-modal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Enter PIN to Confirm</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>Please enter your PIN code to confirm this transaction.</p>
                            <div class="form-group mb-3">
                                <label for="pin-code" class="form-label">PIN Code</label>
                                <input type="password" class="form-control" id="pin-code" placeholder="Enter your PIN">
                            </div>
                            <div id="pin-error" class="text-danger d-none"></div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-success" id="confirm-pin-btn">Confirm</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modal = document.getElementById('pin-confirmation-modal');
    }
    
    if (!modal) {
        console.error('Failed to create PIN confirmation modal');
        return;
    }
    
    // Get modal instance
    const modalInstance = new bootstrap.Modal(modal);
    
    // Set up confirm button
    const confirmBtn = document.getElementById('confirm-pin-btn');
    if (!confirmBtn) {
        console.error('Confirm button not found in PIN modal');
        return;
    }
    
    confirmBtn.onclick = function() {
        const pinCodeInput = document.getElementById('pin-code');
        const pinErrorElement = document.getElementById('pin-error');
        
        if (!pinCodeInput) {
            console.error('PIN code input not found');
            return;
        }
        
        const pinCode = pinCodeInput.value;
        if (!pinCode) {
            if (pinErrorElement) {
                pinErrorElement.textContent = 'Please enter your PIN code';
                pinErrorElement.classList.remove('d-none');
            }
            return;
        }
        
        // Hide error message if previously shown
        if (pinErrorElement) {
            pinErrorElement.classList.add('d-none');
        }
        
        // Disable button and show loading state
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Processing...';
        
        // Approve transaction
        approveTransaction(transactionId, pinCode, modalInstance);
    };
    
    // Reset modal when hidden
    modal.addEventListener('hidden.bs.modal', function() {
        const pinCodeInput = document.getElementById('pin-code');
        const pinErrorElement = document.getElementById('pin-error');
        
        if (pinCodeInput) pinCodeInput.value = '';
        if (pinErrorElement) pinErrorElement.classList.add('d-none');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = 'Confirm';
        }
    });
    
    // Show modal
    modalInstance.show();
}

// Approve transaction with PIN
function approveTransaction(transactionId, pinCode, modalInstance) {
    if (!transactionId || !pinCode) return;
    
    // Get auth token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
        showAlert('error', 'You are not logged in. Please log in to continue.');
        return;
    }
    
    // Send approval request
    fetch(`/parent/transactions/${transactionId}/approve`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pinCode })
    })
    .then(response => response.json())
    .then(data => {
        // Hide modal
        if (modalInstance) modalInstance.hide();
        
        if (data.success) {
            // Show success message
            showAlert('success', data.message || 'Transaction approved successfully');
            
            // Reload pending transactions
            setTimeout(() => {
                loadPendingTransactions();
                
                // Update balance display if available
                const parentBalanceElement = document.getElementById('parent-balance');
                if (data.newBalance !== undefined && parentBalanceElement) {
                    parentBalanceElement.textContent = `$${data.newBalance.toFixed(2)}`;
                }
            }, 1000);
        } else {
            showAlert('error', data.message || 'Failed to approve transaction');
        }
    })
    .catch(error => {
        console.error('Error approving transaction:', error);
        if (modalInstance) modalInstance.hide();
        showAlert('error', 'An error occurred while approving the transaction');
    });
}

// Show rejection confirmation modal
function showRejectConfirmation(transactionId) {
    if (!transactionId) return;
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('reject-confirmation-modal');
    if (!modal) {
        const modalHtml = `
            <div class="modal fade" id="reject-confirmation-modal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Reject Transaction</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>Are you sure you want to reject this transaction?</p>
                            <div class="form-group mb-3">
                                <label for="reject-reason" class="form-label">Reason (Optional)</label>
                                <textarea class="form-control" id="reject-reason" rows="3" placeholder="Enter reason for rejection"></textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger" id="confirm-reject-btn">Reject Transaction</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modal = document.getElementById('reject-confirmation-modal');
    }
    
    if (!modal) {
        console.error('Failed to create rejection confirmation modal');
        return;
    }
    
    // Get modal instance
    const modalInstance = new bootstrap.Modal(modal);
    
    // Set up confirm button
    const confirmBtn = document.getElementById('confirm-reject-btn');
    if (!confirmBtn) {
        console.error('Confirm reject button not found');
        return;
    }
    
    confirmBtn.onclick = function() {
        const reasonTextarea = document.getElementById('reject-reason');
        const reason = reasonTextarea ? reasonTextarea.value : '';
        
        // Disable button and show loading state
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Processing...';
        
        // Reject transaction
        rejectTransaction(transactionId, reason, modalInstance);
    };
    
    // Reset modal when hidden
    modal.addEventListener('hidden.bs.modal', function() {
        const reasonTextarea = document.getElementById('reject-reason');
        if (reasonTextarea) reasonTextarea.value = '';
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = 'Reject Transaction';
        }
    });
    
    // Show modal
    modalInstance.show();
}

// Reject transaction
function rejectTransaction(transactionId, reason, modalInstance) {
    if (!transactionId) return;
    
    // Get auth token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
        showAlert('error', 'You are not logged in. Please log in to continue.');
        return;
    }
    
    // Send rejection request
    fetch(`/parent/transactions/${transactionId}/reject`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
    })
    .then(response => response.json())
    .then(data => {
        // Hide modal
        if (modalInstance) modalInstance.hide();
        
        if (data.success) {
            // Show success message
            showAlert('success', data.message || 'Transaction rejected successfully');
            
            // Reload pending transactions
            setTimeout(() => {
                loadPendingTransactions();
            }, 1000);
        } else {
            showAlert('error', data.message || 'Failed to reject transaction');
        }
    })
    .catch(error => {
        console.error('Error rejecting transaction:', error);
        if (modalInstance) modalInstance.hide();
        showAlert('error', 'An error occurred while rejecting the transaction');
    });
}

// Show alert message
function showAlert(type, message) {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Create unique ID for this toast
    const toastId = 'toast-' + Date.now();
    
    // Set toast color based on type
    let bgColor = 'bg-primary';
    if (type === 'success') bgColor = 'bg-success';
    if (type === 'error') bgColor = 'bg-danger';
    if (type === 'warning') bgColor = 'bg-warning';
    
    // Create toast HTML
    const toastHtml = `
        <div id="${toastId}" class="toast ${bgColor} text-white" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <strong class="me-auto">Notification</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    // Add toast to container
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    // Initialize and show toast
    const toastElement = document.getElementById(toastId);
    if (toastElement) {
        try {
            const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 5000 });
            toast.show();
            
            // Remove toast from DOM after it's hidden
            toastElement.addEventListener('hidden.bs.toast', function() {
                toastElement.remove();
            });
        } catch (error) {
            console.error('Error showing toast:', error);
            // Fallback alert if toast fails
            console.log(type + ': ' + message);
        }
    }
} 