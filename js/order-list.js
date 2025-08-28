/**
 * Order List Management System
 * Display, filter, and manage order listings
 */

(function($) {
    'use strict';

    let orders = [];
    let filteredOrders = [];
    let currentView = 'card';
    let currentFilter = 'all';

    // Initialize the order list system
    function init() {
        bindEvents();
        loadOrders();
        updateStatistics();
        feather.replace();
        console.log('Order List initialized');
    }

    // Bind all events
    function bindEvents() {
        // Filter chips
        $('.filter-chip').on('click', function() {
            const filter = $(this).data('filter');
            setActiveFilter(filter);
        });

        // Search functionality
        $('#orderSearch, #headerSearch').on('input', function() {
            const query = $(this).val().trim();
            // Sync both search inputs
            $('#orderSearch, #headerSearch').val(query);
            filterOrders();
        });

        // Status and service type filters
        $('#statusFilter, #serviceTypeFilter').on('change', function() {
            filterOrders();
        });

        // View switching
        $('#cardView, #tableView').on('click', function() {
            const viewType = $(this).attr('id') === 'cardView' ? 'card' : 'table';
            switchView(viewType);
        });
    }

    // Load orders from TrackingSystem
    function loadOrders() {
        try {
            orders = TrackingSystem.getAllOrders();
            filterOrders();
        } catch (error) {
            console.error('Error loading orders:', error);
            showToast('Error loading orders', 'error');
        }
    }

    // Update statistics
    function updateStatistics() {
        let totalOrders = orders.length;
        let pendingOrders = 0;
        let inProgressOrders = 0;
        let completedOrders = 0;

        orders.forEach(order => {
            switch (order.status) {
                case 'pending':
                case 'arrived':
                    pendingOrders++;
                    break;
                case 'in-progress':
                case 'in-service':
                    inProgressOrders++;
                    break;
                case 'completed':
                case 'ready-for-departure':
                case 'departed':
                    completedOrders++;
                    break;
            }
        });

        // Update UI
        $('#totalOrders').text(totalOrders);
        $('#pendingOrders').text(pendingOrders);
        $('#inProgressOrders').text(inProgressOrders);
        $('#completedOrders').text(completedOrders);
    }

    // Set active filter
    function setActiveFilter(filter) {
        currentFilter = filter;
        
        // Update UI
        $('.filter-chip').removeClass('active');
        $(`.filter-chip[data-filter="${filter}"]`).addClass('active');
        
        filterOrders();
    }

    // Filter orders based on current criteria
    function filterOrders() {
        let filtered = [...orders];

        // Apply quick filter
        switch (currentFilter) {
            case 'today':
                const today = new Date().toDateString();
                filtered = filtered.filter(order => 
                    new Date(order.arrivalTime).toDateString() === today
                );
                break;
            case 'pending':
                filtered = filtered.filter(order => 
                    ['pending', 'arrived'].includes(order.status)
                );
                break;
            case 'in_progress':
                filtered = filtered.filter(order => 
                    ['in-progress', 'in-service'].includes(order.status)
                );
                break;
            case 'completed':
                filtered = filtered.filter(order => 
                    ['completed', 'ready-for-departure', 'departed'].includes(order.status)
                );
                break;
            case 'high_priority':
                filtered = filtered.filter(order => order.priority === 'high');
                break;
            case 'all':
            default:
                // No additional filtering
                break;
        }

        // Apply search filter
        const searchQuery = $('#orderSearch').val().trim().toLowerCase();
        if (searchQuery) {
            filtered = filtered.filter(order => {
                const customer = TrackingSystem.getCustomerById(order.customerId);
                return order.orderNumber.toLowerCase().includes(searchQuery) ||
                       (customer && customer.name.toLowerCase().includes(searchQuery)) ||
                       order.serviceType.toLowerCase().includes(searchQuery);
            });
        }

        // Apply status filter
        const statusFilter = $('#statusFilter').val();
        if (statusFilter) {
            if (statusFilter === 'pending') {
                filtered = filtered.filter(order => ['pending', 'arrived'].includes(order.status));
            } else if (statusFilter === 'in-progress') {
                filtered = filtered.filter(order => ['in-progress', 'in-service'].includes(order.status));
            } else if (statusFilter === 'completed') {
                filtered = filtered.filter(order => ['completed', 'ready-for-departure', 'departed'].includes(order.status));
            } else {
                filtered = filtered.filter(order => order.status === statusFilter);
            }
        }

        // Apply service type filter
        const serviceTypeFilter = $('#serviceTypeFilter').val();
        if (serviceTypeFilter) {
            filtered = filtered.filter(order => order.serviceType === serviceTypeFilter);
        }

        filteredOrders = filtered;
        displayOrders();
        updateOrderCount();
    }

    // Display orders in current view
    function displayOrders() {
        if (filteredOrders.length === 0) {
            showEmptyState();
            return;
        }

        hideEmptyState();

        if (currentView === 'card') {
            displayCardView();
        } else {
            displayTableView();
        }
    }

    // Display orders in card view
    function displayCardView() {
        const container = $('#orderCardsContainer');
        let html = '';

        filteredOrders.forEach(order => {
            const customer = TrackingSystem.getCustomerById(order.customerId);
            const statusClass = getStatusClass(order.status);
            const priorityClass = getPriorityClass(order.priority);
            
            html += `
                <div class="col-xl-4 col-lg-6 col-md-6 mb-4">
                    <div class="card order-card h-100">
                        <span class="order-status ${statusClass}">${getStatusLabel(order.status)}</span>
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <h6 class="mb-1">${order.orderNumber}</h6>
                                    <p class="text-muted mb-0">${customer ? customer.name : 'Unknown Customer'}</p>
                                </div>
                                <span class="order-priority ${priorityClass}">
                                    ${order.priority || 'Normal'}
                                </span>
                            </div>
                            
                            <div class="mb-3">
                                <span class="service-type-badge badge bg-info">${getServiceTypeLabel(order.serviceType)}</span>
                            </div>
                            
                            <div class="row text-center mb-3">
                                <div class="col-6">
                                    <small class="text-muted">Arrival Time</small>
                                    <div class="fw-bold">${formatTime(order.arrivalTime)}</div>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">Created</small>
                                    <div class="fw-bold">${formatDate(order.createdAt)}</div>
                                </div>
                            </div>
                            
                            ${order.notes ? `
                                <div class="mb-3">
                                    <small class="text-muted">Notes:</small>
                                    <p class="mb-0">${order.notes.substring(0, 100)}${order.notes.length > 100 ? '...' : ''}</p>
                                </div>
                            ` : ''}
                            
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="btn-group" role="group">
                                    <button class="btn btn-outline-primary btn-sm" onclick="viewOrder('${order.id}')">
                                        <i data-feather="eye" class="me-1"></i>View
                                    </button>
                                    <button class="btn btn-outline-secondary btn-sm" onclick="editOrder('${order.id}')">
                                        <i data-feather="edit" class="me-1"></i>Edit
                                    </button>
                                </div>
                                <button class="btn btn-success btn-sm" onclick="updateOrderStatus('${order.id}')">
                                    <i data-feather="refresh-cw" class="me-1"></i>Update
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.html(html);
        feather.replace();
    }

    // Display orders in table view
    function displayTableView() {
        const tbody = $('#orderTableBody');
        let html = '';

        filteredOrders.forEach(order => {
            const customer = TrackingSystem.getCustomerById(order.customerId);
            const statusClass = getStatusClass(order.status);
            const priorityClass = getPriorityClass(order.priority);
            
            html += `
                <tr>
                    <td>
                        <div class="fw-bold">${order.orderNumber}</div>
                        <small class="text-muted">${formatTime(order.arrivalTime)}</small>
                    </td>
                    <td>
                        <div class="fw-bold">${customer ? customer.name : 'Unknown'}</div>
                        <small class="text-muted">${customer ? customer.phone : ''}</small>
                    </td>
                    <td>
                        <span class="service-type-badge badge bg-info">${getServiceTypeLabel(order.serviceType)}</span>
                    </td>
                    <td>
                        <span class="order-status ${statusClass}">${getStatusLabel(order.status)}</span>
                    </td>
                    <td>
                        <span class="order-priority ${priorityClass}">${order.priority || 'Normal'}</span>
                    </td>
                    <td>${formatDate(order.createdAt)}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-outline-primary btn-sm" onclick="viewOrder('${order.id}')" title="View Details">
                                <i data-feather="eye"></i>
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="editOrder('${order.id}')" title="Edit Order">
                                <i data-feather="edit"></i>
                            </button>
                            <button class="btn btn-success btn-sm" onclick="updateOrderStatus('${order.id}')" title="Update Status">
                                <i data-feather="refresh-cw"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.html(html);
        feather.replace();
    }

    // Switch between card and table view
    window.switchView = function(viewType) {
        currentView = viewType;
        
        // Update buttons
        $('#cardView, #tableView').removeClass('active');
        $(`#${viewType}View`).addClass('active');
        
        // Show/hide views
        if (viewType === 'card') {
            $('#orderCardView').show();
            $('#orderTableView').hide();
        } else {
            $('#orderCardView').hide();
            $('#orderTableView').show();
        }
        
        displayOrders();
    };

    // Update order count display
    function updateOrderCount() {
        const total = orders.length;
        const showing = filteredOrders.length;
        
        let countText = `Showing ${showing} of ${total} orders`;
        
        if (currentFilter !== 'all') {
            const filterLabels = {
                'today': "Today's Orders",
                'pending': 'Pending Orders',
                'in_progress': 'In Progress',
                'completed': 'Completed',
                'high_priority': 'High Priority'
            };
            countText += ` (${filterLabels[currentFilter]})`;
        }
        
        $('#orderCount').text(countText);
    }

    // Show empty state
    function showEmptyState() {
        $('#orderCardView, #orderTableView').hide();
        $('#emptyState').show();
    }

    // Hide empty state
    function hideEmptyState() {
        $('#emptyState').hide();
        if (currentView === 'card') {
            $('#orderCardView').show();
        } else {
            $('#orderTableView').show();
        }
    }

    // Clear all filters
    window.clearFilters = function() {
        $('#orderSearch').val('');
        $('#statusFilter').val('');
        $('#serviceTypeFilter').val('');
        setActiveFilter('all');
    };

    // Search orders
    window.searchOrders = function() {
        filterOrders();
    };

    // View order details
    window.viewOrder = function(orderId) {
        window.location.href = `order-tracking.html?orderId=${orderId}`;
    };

    // Edit order
    window.editOrder = function(orderId) {
        // For now, redirect to order tracking with edit mode
        window.location.href = `order-tracking.html?orderId=${orderId}&mode=edit`;
    };

    // Update order status
    window.updateOrderStatus = function(orderId) {
        const order = TrackingSystem.getOrderById(orderId);
        if (!order) {
            showToast('Order not found', 'error');
            return;
        }

        const statusOptions = {
            'pending': 'Pending',
            'arrived': 'Arrived',
            'in-service': 'In Service',
            'completed': 'Completed',
            'ready-for-departure': 'Ready for Departure',
            'departed': 'Departed',
            'cancelled': 'Cancelled'
        };

        let optionsHtml = '';
        Object.keys(statusOptions).forEach(status => {
            const selected = order.status === status ? 'selected' : '';
            optionsHtml += `<option value="${status}" ${selected}>${statusOptions[status]}</option>`;
        });

        Swal.fire({
            title: 'Update Order Status',
            html: `
                <div class="text-start">
                    <p><strong>Order:</strong> ${order.orderNumber}</p>
                    <div class="mb-3">
                        <label class="form-label">New Status:</label>
                        <select class="form-select" id="newStatus">
                            ${optionsHtml}
                        </select>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Update Status',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
                const newStatus = document.getElementById('newStatus').value;
                return newStatus;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                try {
                    TrackingSystem.updateOrderStatus(orderId, result.value);
                    showToast('Order status updated successfully', 'success');
                    loadOrders();
                    updateStatistics();
                } catch (error) {
                    console.error('Error updating order status:', error);
                    showToast('Error updating order status', 'error');
                }
            }
        });
    };

    // Export orders
    window.exportOrders = function() {
        try {
            const csvData = generateCSV(filteredOrders);
            downloadCSV(csvData, 'orders_export.csv');
            showToast('Order list exported successfully', 'success');
        } catch (error) {
            console.error('Export error:', error);
            showToast('Error exporting order list', 'error');
        }
    };

    // Generate CSV data
    function generateCSV(orders) {
        const headers = ['Order Number', 'Customer', 'Service Type', 'Status', 'Priority', 'Arrival Time', 'Created At', 'Notes'];
        const rows = orders.map(order => {
            const customer = TrackingSystem.getCustomerById(order.customerId);
            
            return [
                order.orderNumber || '',
                customer ? customer.name : 'Unknown',
                getServiceTypeLabel(order.serviceType),
                getStatusLabel(order.status),
                order.priority || 'Normal',
                formatDateTime(order.arrivalTime),
                formatDateTime(order.createdAt),
                order.notes || ''
            ];
        });
        
        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
            .join('\n');
            
        return csvContent;
    }

    // Download CSV file
    function downloadCSV(csvData, filename) {
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // Helper functions
    function getStatusClass(status) {
        const statusMap = {
            'pending': 'pending',
            'arrived': 'pending',
            'in-service': 'in-progress',
            'in-progress': 'in-progress',
            'completed': 'completed',
            'ready-for-departure': 'completed',
            'departed': 'completed',
            'cancelled': 'cancelled'
        };
        return statusMap[status] || 'pending';
    }

    function getPriorityClass(priority) {
        const priorityMap = {
            'high': 'priority-high',
            'medium': 'priority-medium',
            'normal': 'priority-normal'
        };
        return priorityMap[priority] || 'priority-normal';
    }

    function getStatusLabel(status) {
        const labels = {
            'pending': 'Pending',
            'arrived': 'Arrived',
            'in-service': 'In Service',
            'in-progress': 'In Progress',
            'completed': 'Completed',
            'ready-for-departure': 'Ready for Departure',
            'departed': 'Departed',
            'cancelled': 'Cancelled'
        };
        return labels[status] || status;
    }

    function getServiceTypeLabel(type) {
        const labels = {
            'tire-sales': 'Tire Sales',
            'car-service': 'Car Service',
            'consultation': 'Consultation'
        };
        return labels[type] || type;
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
        });
    }

    function formatTime(timeString) {
        if (!timeString) return '';
        const date = new Date(timeString);
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit'
        });
    }

    function formatDateTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function showToast(message, type = 'info') {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
        
        Toast.fire({
            icon: type,
            title: message
        });
    }

    // Initialize when document is ready
    $(document).ready(function() {
        if (typeof TrackingSystem !== 'undefined') {
            init();
        } else {
            console.error('TrackingSystem not loaded');
        }
    });

})(jQuery);