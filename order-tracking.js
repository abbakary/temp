/**
 * Order Tracking System
 * Real-time order monitoring and management interface
 */

(function($) {
    'use strict';

    let currentFilter = 'all';
    let searchQuery = '';
    let refreshInterval;
    let orders = [];
    let currentOrder = null;

    // Initialize the order tracking system
    function init() {
        bindEvents();
        loadOrders();
        startAutoRefresh();
        updateStatistics();
        feather.replace();
        console.log('Order Tracking initialized');
    }

    // Bind all events
    function bindEvents() {
        // Filter chips
        $('.filter-chip').on('click', function() {
            const status = $(this).data('status');
            setFilter(status);
        });

        // Search functionality
        $('#orderSearchInput').on('input', function() {
            const query = $(this).val().trim();
            searchQuery = query;
            filterAndDisplayOrders();
        });

        // Refresh button
        $('#refreshOrdersBtn').on('click', function() {
            $(this).find('i').addClass('fa-spin');
            setTimeout(() => {
                $(this).find('i').removeClass('fa-spin');
            }, 1000);
            
            loadOrders();
            updateStatistics();
        });

        // Status update
        $('#confirmStatusUpdate').on('click', function() {
            updateOrderStatus();
        });

        // Status select change
        $('#newStatus').on('change', function() {
            const status = $(this).val();
            if (status === 'completed') {
                $('#completionAlert').show();
            } else {
                $('#completionAlert').hide();
            }
        });
    }

    // Set active filter
    function setFilter(status) {
        currentFilter = status;
        
        // Update UI
        $('.filter-chip').removeClass('active');
        $(`.filter-chip[data-status="${status}"]`).addClass('active');
        
        // Filter and display orders
        filterAndDisplayOrders();
    }

    // Load orders from TrackingSystem
    function loadOrders() {
        try {
            orders = TrackingSystem.getAllOrders();
            filterAndDisplayOrders();
        } catch (error) {
            console.error('Error loading orders:', error);
            showToast('Error loading orders', 'error');
        }
    }

    // Filter and display orders based on current criteria
    function filterAndDisplayOrders() {
        let filteredOrders = [...orders];

        // Apply status filter
        if (currentFilter !== 'all') {
            filteredOrders = filteredOrders.filter(order => order.status === currentFilter);
        }

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filteredOrders = filteredOrders.filter(order => 
                order.orderNumber.toLowerCase().includes(query) ||
                order.customerName.toLowerCase().includes(query) ||
                order.serviceType.toLowerCase().includes(query) ||
                (order.description && order.description.toLowerCase().includes(query))
            );
        }

        // Sort by arrival time (newest first)
        filteredOrders.sort((a, b) => new Date(b.arrivalTime) - new Date(a.arrivalTime));

        displayOrders(filteredOrders);
        updateOrderCount(filteredOrders.length);
    }

    // Display orders in the UI
    function displayOrders(ordersToDisplay) {
        const container = $('#ordersContainer');
        
        if (ordersToDisplay.length === 0) {
            container.html(`
                <div class="text-center py-5">
                    <i data-feather="search" size="48" class="text-muted mb-3"></i>
                    <h5 class="text-muted">No orders found</h5>
                    <p class="text-muted mb-0">
                        ${searchQuery ? 'Try adjusting your search criteria' : 'No orders match the selected filter'}
                    </p>
                </div>
            `);
            feather.replace();
            return;
        }

        let html = '<div class="row">';

        ordersToDisplay.forEach(order => {
            const customer = TrackingSystem.getCustomerById(order.customerId);
            const waitingTime = calculateWaitingTime(order);
            const waitingClass = getWaitingTimeClass(waitingTime);
            
            html += `
                <div class="col-xl-6 col-lg-12 mb-4">
                    <div class="card order-card h-100">
                        <div class="card-header">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-1">${order.orderNumber}</h6>
                                    <small class="text-muted">${customer ? customer.name : order.customerName}</small>
                                </div>
                                <div class="text-end">
                                    <span class="status-badge status-${order.status}">
                                        ${getStatusLabel(order.status)}
                                    </span>
                                    ${order.priority !== 'normal' ? `
                                        <br>
                                        <span class="priority-badge priority-${order.priority} mt-1">
                                            ${order.priority.toUpperCase()}
                                        </span>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <p class="mb-2">
                                        <i data-feather="tool" class="me-2"></i>
                                        <strong>Service:</strong> ${getServiceTypeLabel(order.serviceType)}
                                    </p>
                                    <p class="mb-2">
                                        <i data-feather="calendar" class="me-2"></i>
                                        <strong>Arrived:</strong> ${formatDateTime(order.arrivalTime)}
                                    </p>
                                    ${order.departureTime ? `
                                        <p class="mb-2">
                                            <i data-feather="check-circle" class="me-2"></i>
                                            <strong>Departed:</strong> ${formatDateTime(order.departureTime)}
                                        </p>
                                    ` : ''}
                                </div>
                                <div class="col-md-6">
                                    ${!['completed', 'cancelled'].includes(order.status) ? `
                                        <p class="mb-2">
                                            <i data-feather="clock" class="me-2"></i>
                                            <strong>Waiting:</strong> 
                                            <span class="waiting-time ${waitingClass}">${waitingTime}</span>
                                        </p>
                                    ` : ''}
                                    
                                    ${order.actualDuration ? `
                                        <p class="mb-2">
                                            <i data-feather="trending-up" class="me-2"></i>
                                            <strong>Duration:</strong> ${order.actualDuration}
                                        </p>
                                    ` : ''}
                                    
                                    ${order.description ? `
                                        <p class="mb-2">
                                            <i data-feather="file-text" class="me-2"></i>
                                            <strong>Notes:</strong> ${order.description.substring(0, 50)}${order.description.length > 50 ? '...' : ''}
                                        </p>
                                    ` : ''}
                                </div>
                            </div>
                            
                            ${order.serviceDetails ? `
                                <div class="mt-3">
                                    <h6 class="mb-2">Service Details:</h6>
                                    <div class="row">
                                        ${renderServiceDetails(order.serviceDetails)}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div class="d-flex justify-content-between align-items-center mt-3">
                                <div class="btn-group" role="group">
                                    <button class="btn btn-outline-primary btn-sm" onclick="viewOrderDetails('${order.id}')">
                                        <i data-feather="eye" class="me-1"></i>Details
                                    </button>
                                    ${customer ? `
                                        <button class="btn btn-outline-secondary btn-sm" onclick="viewCustomerProfile('${customer.id}')">
                                            <i data-feather="user" class="me-1"></i>Customer
                                        </button>
                                    ` : ''}
                                </div>
                                ${!['completed', 'cancelled'].includes(order.status) ? `
                                    <button class="btn btn-primary btn-sm" onclick="updateOrderStatusModal('${order.id}')">
                                        <i data-feather="edit" class="me-1"></i>Update Status
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.html(html);
        feather.replace();
    }

    // Calculate waiting time for an order
    function calculateWaitingTime(order) {
        if (['completed', 'cancelled'].includes(order.status)) {
            return 'N/A';
        }

        const arrivalTime = new Date(order.arrivalTime);
        const currentTime = new Date();
        const diffMs = currentTime - arrivalTime;
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    // Get CSS class for waiting time color coding
    function getWaitingTimeClass(waitingTime) {
        if (waitingTime === 'N/A') return '';
        
        const totalMinutes = parseWaitingTime(waitingTime);
        
        if (totalMinutes < 30) {
            return 'waiting-normal';
        } else if (totalMinutes < 120) {
            return 'waiting-warning';
        } else {
            return 'waiting-danger';
        }
    }

    // Parse waiting time string to minutes
    function parseWaitingTime(timeString) {
        const hourMatch = timeString.match(/(\d+)h/);
        const minuteMatch = timeString.match(/(\d+)m/);
        
        const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
        const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
        
        return hours * 60 + minutes;
    }

    // Render service-specific details
    function renderServiceDetails(details) {
        let html = '';
        
        if (details.service_type === 'tire-sales') {
            html += `
                <div class="col-md-6">
                    <small class="text-muted">Brand:</small>
                    <div class="fw-bold">${details.brand || 'Not specified'}</div>
                </div>
                <div class="col-md-6">
                    <small class="text-muted">Quantity:</small>
                    <div class="fw-bold">${details.quantity || 1}</div>
                </div>
            `;
        } else if (details.service_type === 'car-service') {
            html += `
                <div class="col-md-6">
                    <small class="text-muted">Services:</small>
                    <div class="fw-bold">${details.service_types ? details.service_types.join(', ') : 'General service'}</div>
                </div>
                ${details.vehicle_info && details.vehicle_info.plate_number ? `
                    <div class="col-md-6">
                        <small class="text-muted">Vehicle:</small>
                        <div class="fw-bold">${details.vehicle_info.plate_number}</div>
                    </div>
                ` : ''}
            `;
        }
        
        return html;
    }

    // Update statistics
    function updateStatistics() {
        const stats = {
            pending: 0,
            'in-progress': 0,
            'service-complete': 0,
            'ready-for-departure': 0,
            completedToday: 0,
            total: orders.length
        };

        const today = new Date().toDateString();

        orders.forEach(order => {
            // Count by status
            if (stats.hasOwnProperty(order.status)) {
                stats[order.status]++;
            }

            // Count completed today
            if (order.status === 'completed' && new Date(order.departureTime).toDateString() === today) {
                stats.completedToday++;
            }
        });

        // Update UI
        $('#pendingCount').text(stats.pending);
        $('#inProgressCount').text(stats['in-progress']);
        $('#serviceCompleteCount').text(stats['service-complete']);
        $('#readyCount').text(stats['ready-for-departure']);
        $('#completedTodayCount').text(stats.completedToday);
        $('#totalOrdersCount').text(stats.total);
    }

    // Update order count display
    function updateOrderCount(count) {
        const totalCount = orders.length;
        const filterLabel = currentFilter === 'all' ? 'All' : getStatusLabel(currentFilter);
        
        let countText = `Showing ${count} of ${totalCount} orders`;
        if (currentFilter !== 'all') {
            countText += ` (${filterLabel})`;
        }
        if (searchQuery) {
            countText += ` matching "${searchQuery}"`;
        }
        
        $('#orderCount').text(countText);
    }

    // View order details
    window.viewOrderDetails = function(orderId) {
        const order = orders.find(o => o.id === orderId);
        if (!order) {
            showToast('Order not found', 'error');
            return;
        }

        currentOrder = order;
        const customer = TrackingSystem.getCustomerById(order.customerId);
        
        let modalContent = `
            <div class="row">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h6>Order Information</h6>
                        </div>
                        <div class="card-body">
                            <table class="table table-borderless">
                                <tr><td><strong>Order Number:</strong></td><td>${order.orderNumber}</td></tr>
                                <tr><td><strong>Customer:</strong></td><td>${customer ? customer.name : order.customerName}</td></tr>
                                <tr><td><strong>Service Type:</strong></td><td>${getServiceTypeLabel(order.serviceType)}</td></tr>
                                <tr><td><strong>Status:</strong></td><td><span class="status-badge status-${order.status}">${getStatusLabel(order.status)}</span></td></tr>
                                <tr><td><strong>Priority:</strong></td><td><span class="priority-badge priority-${order.priority}">${order.priority.toUpperCase()}</span></td></tr>
                                <tr><td><strong>Arrived:</strong></td><td>${formatDateTime(order.arrivalTime)}</td></tr>
                                ${order.departureTime ? `<tr><td><strong>Departed:</strong></td><td>${formatDateTime(order.departureTime)}</td></tr>` : ''}
                                ${order.actualDuration ? `<tr><td><strong>Duration:</strong></td><td>${order.actualDuration}</td></tr>` : ''}
                            </table>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h6>Status History</h6>
                        </div>
                        <div class="card-body" style="max-height: 300px; overflow-y: auto;">
                            ${order.statusHistory && order.statusHistory.length > 0 ? `
                                <div class="timeline">
                                    ${order.statusHistory.slice().reverse().map(history => `
                                        <div class="timeline-item">
                                            <strong>${getStatusLabel(history.status)}</strong><br>
                                            <small class="text-muted">${formatDateTime(history.timestamp)}</small>
                                            ${history.notes ? `<br><em class="text-muted">${history.notes}</em>` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            ` : '<p class="text-muted">No status history available.</p>'}
                        </div>
                    </div>
                </div>
            </div>
            
            ${order.description ? `
                <div class="row mt-3">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <h6>Order Description</h6>
                            </div>
                            <div class="card-body">
                                <p class="mb-0">${order.description}</p>
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}
        `;

        $('#orderDetailsContent').html(modalContent);
        $('#orderDetailsModal').modal('show');
        feather.replace();
    };

    // View customer profile
    window.viewCustomerProfile = function(customerId) {
        window.location.href = `customer-search.html?customerId=${customerId}`;
    };

    // Update order status modal
    window.updateOrderStatusModal = function(orderId) {
        const order = orders.find(o => o.id === orderId);
        if (!order) {
            showToast('Order not found', 'error');
            return;
        }

        currentOrder = order;
        const customer = TrackingSystem.getCustomerById(order.customerId);
        
        $('#updateOrderId').val(orderId);
        $('#newStatus').val('');
        $('#statusNotes').val('');
        $('#completionAlert').hide();
        
        // Display current order info
        $('#currentOrderInfo').html(`
            <strong>${order.orderNumber}</strong> - ${customer ? customer.name : order.customerName}<br>
            <small class="text-muted">Current Status: <span class="status-badge status-${order.status}">${getStatusLabel(order.status)}</span></small>
        `);
        
        $('#statusUpdateModal').modal('show');
    };

    // Update order status
    function updateOrderStatus() {
        const orderId = $('#updateOrderId').val();
        const newStatus = $('#newStatus').val();
        const notes = $('#statusNotes').val();
        
        if (!newStatus) {
            showToast('Please select a status', 'error');
            return;
        }
        
        try {
            const result = TrackingSystem.updateOrderStatus(orderId, newStatus, notes);
            
            if (result.success) {
                $('#statusUpdateModal').modal('hide');
                showToast('Order status updated successfully', 'success');
                
                // Refresh orders and statistics
                loadOrders();
                updateStatistics();
                
                // Close order details modal if open
                if (currentOrder && currentOrder.id === orderId) {
                    $('#orderDetailsModal').modal('hide');
                }
            } else {
                showToast('Error updating order status: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            showToast('Error updating order status', 'error');
        }
    }

    // Start auto-refresh
    function startAutoRefresh() {
        refreshInterval = setInterval(() => {
            loadOrders();
            updateStatistics();
        }, 30000); // Refresh every 30 seconds
    }

    // Helper functions
    function getStatusLabel(status) {
        const statusLabels = {
            'pending': 'Pending',
            'in-progress': 'In Progress',
            'service-complete': 'Service Complete',
            'ready-for-departure': 'Ready for Departure',
            'completed': 'Completed',
            'cancelled': 'Cancelled'
        };
        return statusLabels[status] || status;
    }

    function getServiceTypeLabel(serviceType) {
        const labels = {
            'car-service': 'Car Service',
            'tire-sales': 'Tire Sales',
            'inquiry': 'Consultation'
        };
        return labels[serviceType] || serviceType;
    }

    function formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function showToast(message, type = 'info') {
        // Use SweetAlert for notifications
        const icon = type === 'error' ? 'error' : type === 'success' ? 'success' : 'info';
        Swal.fire({
            text: message,
            icon: icon,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', function() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
    });

    // Initialize when document is ready
    $(document).ready(function() {
        if (typeof TrackingSystem !== 'undefined') {
            init();
        } else {
            console.error('TrackingSystem not loaded');
        }
    });

})(jQuery);