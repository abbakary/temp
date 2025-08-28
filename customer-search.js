/**
 * Customer Search & Order Management
 * Advanced customer search with real-time results and order management
 */

(function($) {
    'use strict';

    let searchResults = [];
    let currentCustomer = null;
    let searchTimer;

    // Initialize the search system
    function init() {
        bindEvents();
        feather.replace();
        console.log('Customer Search initialized');
    }

    // Bind all events
    function bindEvents() {
        // Real-time search
        $('#customerSearchInput').on('input', function() {
            const query = $(this).val().trim();
            
            clearTimeout(searchTimer);
            
            if (query.length >= 2) {
                searchTimer = setTimeout(() => {
                    performSearch(query);
                }, 300);
            } else {
                clearSearchResults();
            }
        });

        // Search button
        $('#searchBtn').on('click', function() {
            const query = $('#customerSearchInput').val().trim();
            if (query) {
                performSearch(query);
            }
        });

        // Enter key search
        $('#customerSearchInput').on('keypress', function(e) {
            if (e.which === 13) {
                const query = $(this).val().trim();
                if (query) {
                    performSearch(query);
                }
            }
        });

        // Order status update
        $('#updateStatusBtn').on('click', function() {
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

        // Create new order button
        $('#createNewOrderBtn').on('click', function() {
            if (currentCustomer) {
                createNewOrderForCustomer();
            }
        });
    }

    // Perform customer search
    function performSearch(query) {
        showLoading();
        
        try {
            // Search customers
            const customers = TrackingSystem.searchCustomers(query);
            const orders = TrackingSystem.searchOrders(query);
            
            // Combine and deduplicate results
            const customerIds = new Set();
            searchResults = [];
            
            // Add customers from direct search
            customers.forEach(customer => {
                if (!customerIds.has(customer.id)) {
                    customerIds.add(customer.id);
                    const customerOrders = TrackingSystem.getOrdersByCustomer(customer.id);
                    searchResults.push({
                        customer: customer,
                        orders: customerOrders
                    });
                }
            });
            
            // Add customers from order search
            orders.forEach(order => {
                if (!customerIds.has(order.customerId)) {
                    customerIds.add(order.customerId);
                    const customer = TrackingSystem.getCustomerById(order.customerId);
                    if (customer) {
                        const customerOrders = TrackingSystem.getOrdersByCustomer(customer.id);
                        searchResults.push({
                            customer: customer,
                            orders: customerOrders
                        });
                    }
                }
            });
            
            displaySearchResults();
            
        } catch (error) {
            console.error('Search error:', error);
            showAlert('Error performing search', 'error');
        }
    }

    // Quick filter functions
    window.quickFilter = function(type) {
        let results = [];
        
        try {
            const customers = TrackingSystem.getAllCustomers();
            const today = new Date().toDateString();
            
            switch (type) {
                case 'today':
                    // Customers with orders today
                    const todaysOrders = TrackingSystem.getAllOrders().filter(order => 
                        new Date(order.arrivalTime).toDateString() === today
                    );
                    
                    const todaysCustomerIds = [...new Set(todaysOrders.map(o => o.customerId))];
                    results = todaysCustomerIds.map(id => {
                        const customer = TrackingSystem.getCustomerById(id);
                        const orders = TrackingSystem.getOrdersByCustomer(id);
                        return { customer, orders };
                    }).filter(r => r.customer);
                    break;
                    
                case 'active':
                    // Customers with active orders
                    const activeOrders = TrackingSystem.getAllOrders().filter(order => 
                        !['completed', 'cancelled'].includes(order.status)
                    );
                    
                    const activeCustomerIds = [...new Set(activeOrders.map(o => o.customerId))];
                    results = activeCustomerIds.map(id => {
                        const customer = TrackingSystem.getCustomerById(id);
                        const orders = TrackingSystem.getOrdersByCustomer(id);
                        return { customer, orders };
                    }).filter(r => r.customer);
                    break;
                    
                case 'pending':
                    // Customers ready for departure
                    const pendingOrders = TrackingSystem.getOrdersByStatus('ready-for-departure');
                    
                    const pendingCustomerIds = [...new Set(pendingOrders.map(o => o.customerId))];
                    results = pendingCustomerIds.map(id => {
                        const customer = TrackingSystem.getCustomerById(id);
                        const orders = TrackingSystem.getOrdersByCustomer(id);
                        return { customer, orders };
                    }).filter(r => r.customer);
                    break;
            }
            
            searchResults = results;
            displaySearchResults();
            
            // Update search input to show what was filtered
            const filterLabels = {
                'today': "Today's Customers",
                'active': 'Active Orders',
                'pending': 'Pending Departure'
            };
            $('#customerSearchInput').val(filterLabels[type]);
            
        } catch (error) {
            console.error('Quick filter error:', error);
            showAlert('Error applying filter', 'error');
        }
    };

    // Display search results
    function displaySearchResults() {
        const resultsContainer = $('#searchResults');
        
        if (searchResults.length === 0) {
            resultsContainer.html(`
                <div class="no-results">
                    <i data-feather="alert-circle" size="48" class="mb-3"></i>
                    <h5>No Results Found</h5>
                    <p>No customers found matching your search criteria.</p>
                </div>
            `);
            feather.replace();
            return;
        }
        
        let html = '<div class="row">';
        
        searchResults.forEach(result => {
            const customer = result.customer;
            const orders = result.orders;
            
            // Get active orders
            const activeOrders = orders.filter(o => !['completed', 'cancelled'].includes(o.status));
            const lastOrder = orders.length > 0 ? orders[orders.length - 1] : null;
            
            html += `
                <div class="col-xl-6 col-lg-12 mb-4">
                    <div class="customer-card card h-100">
                        <div class="card-header">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-1">${customer.name}</h6>
                                    <small class="text-muted">ID: ${customer.id}</small>
                                </div>
                                <div class="text-end">
                                    <span class="badge bg-primary">${customer.customerType}</span>
                                    ${activeOrders.length > 0 ? `<span class="badge bg-success ms-1">${activeOrders.length} Active</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <p class="mb-2">
                                        <i data-feather="phone" class="me-2"></i>
                                        ${customer.phone}
                                    </p>
                                    ${customer.email ? `
                                        <p class="mb-2">
                                            <i data-feather="mail" class="me-2"></i>
                                            ${customer.email}
                                        </p>
                                    ` : ''}
                                    <p class="mb-2">
                                        <i data-feather="calendar" class="me-2"></i>
                                        Total Orders: ${orders.length}
                                    </p>
                                </div>
                                <div class="col-md-6">
                                    ${lastOrder ? `
                                        <p class="mb-2">
                                            <i data-feather="clock" class="me-2"></i>
                                            Last Visit: ${formatDate(lastOrder.arrivalTime)}
                                        </p>
                                        <p class="mb-2">
                                            <span class="order-status status-${lastOrder.status}">
                                                ${getStatusLabel(lastOrder.status)}
                                            </span>
                                        </p>
                                    ` : '<p class="text-muted">No orders yet</p>'}
                                </div>
                            </div>
                            
                            ${activeOrders.length > 0 ? `
                                <div class="mt-3">
                                    <h6 class="mb-2">Active Orders:</h6>
                                    ${activeOrders.slice(0, 2).map(order => `
                                        <div class="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded">
                                            <div>
                                                <small class="fw-bold">${order.orderNumber}</small>
                                                <br>
                                                <small class="text-muted">${order.serviceType}</small>
                                            </div>
                                            <div>
                                                <span class="order-status status-${order.status}">
                                                    ${getStatusLabel(order.status)}
                                                </span>
                                            </div>
                                        </div>
                                    `).join('')}
                                    ${activeOrders.length > 2 ? `<small class="text-muted">+${activeOrders.length - 2} more orders</small>` : ''}
                                </div>
                            ` : ''}
                            
                            <div class="quick-actions">
                                <div class="d-flex gap-2 flex-wrap">
                                    <button class="btn btn-primary btn-sm" onclick="viewCustomerDetails('${customer.id}')">
                                        <i data-feather="eye" class="me-1"></i>View Details
                                    </button>
                                    <button class="btn btn-success btn-sm" onclick="createOrderForCustomer('${customer.id}')">
                                        <i data-feather="plus" class="me-1"></i>New Order
                                    </button>
                                    ${activeOrders.length > 0 ? `
                                        <button class="btn btn-warning btn-sm" onclick="manageOrders('${customer.id}')">
                                            <i data-feather="settings" class="me-1"></i>Manage Orders
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        resultsContainer.html(html);
        feather.replace();
    }

    // View customer details
    window.viewCustomerDetails = function(customerId) {
        const customer = TrackingSystem.getCustomerById(customerId);
        if (!customer) {
            showAlert('Customer not found', 'error');
            return;
        }
        
        currentCustomer = customer;
        const orders = TrackingSystem.getOrdersByCustomer(customerId);
        
        let modalContent = `
            <div class="row">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h6>Customer Information</h6>
                        </div>
                        <div class="card-body">
                            <table class="table table-borderless">
                                <tr><td><strong>Name:</strong></td><td>${customer.name}</td></tr>
                                <tr><td><strong>Phone:</strong></td><td>${customer.phone}</td></tr>
                                <tr><td><strong>Email:</strong></td><td>${customer.email || 'Not provided'}</td></tr>
                                <tr><td><strong>Type:</strong></td><td>${customer.customerType}</td></tr>
                                <tr><td><strong>Address:</strong></td><td>${customer.address || 'Not provided'}</td></tr>
                                <tr><td><strong>Total Orders:</strong></td><td>${orders.length}</td></tr>
                                <tr><td><strong>Last Visit:</strong></td><td>${customer.lastVisit ? formatDate(customer.lastVisit) : 'Never'}</td></tr>
                            </table>
                            
                            ${customer.vehicles && customer.vehicles.length > 0 ? `
                                <h6 class="mt-3">Registered Vehicles</h6>
                                ${customer.vehicles.map(vehicle => `
                                    <div class="mb-2 p-2 bg-light rounded">
                                        <strong>${vehicle.plateNumber || 'No Plate'}</strong><br>
                                        <small>${vehicle.make} ${vehicle.model} (${vehicle.vehicleType})</small>
                                    </div>
                                `).join('')}
                            ` : ''}
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h6>Order History (${orders.length})</h6>
                        </div>
                        <div class="card-body" style="max-height: 400px; overflow-y: auto;">
                            ${orders.length > 0 ? `
                                ${orders.slice().reverse().map(order => `
                                    <div class="mb-3 p-3 border rounded">
                                        <div class="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <h6 class="mb-1">${order.orderNumber}</h6>
                                                <small class="text-muted">${order.serviceType}</small>
                                            </div>
                                            <div class="text-end">
                                                <span class="order-status status-${order.status}">
                                                    ${getStatusLabel(order.status)}
                                                </span>
                                                ${!['completed', 'cancelled'].includes(order.status) ? `
                                                    <br>
                                                    <button class="btn btn-outline-primary btn-sm mt-1" onclick="updateOrderStatusModal('${order.id}')">
                                                        Update Status
                                                    </button>
                                                ` : ''}
                                            </div>
                                        </div>
                                        <p class="mb-1"><small><strong>Arrival:</strong> ${formatDateTime(order.arrivalTime)}</small></p>
                                        ${order.departureTime ? `<p class="mb-1"><small><strong>Departure:</strong> ${formatDateTime(order.departureTime)}</small></p>` : ''}
                                        ${order.actualDuration ? `<p class="mb-1"><small><strong>Duration:</strong> ${order.actualDuration}</small></p>` : ''}
                                        ${order.description ? `<p class="mb-0"><small><strong>Description:</strong> ${order.description}</small></p>` : ''}
                                        
                                        ${order.statusHistory && order.statusHistory.length > 1 ? `
                                            <div class="mt-2">
                                                <small class="text-muted">Status History:</small>
                                                <div class="order-timeline mt-1">
                                                    ${order.statusHistory.slice().reverse().map(history => `
                                                        <div class="timeline-item">
                                                            <small>
                                                                <strong>${getStatusLabel(history.status)}</strong> - ${formatDateTime(history.timestamp)}
                                                                ${history.notes ? `<br><em>${history.notes}</em>` : ''}
                                                            </small>
                                                        </div>
                                                    `).join('')}
                                                </div>
                                            </div>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            ` : '<p class="text-muted">No orders found for this customer.</p>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('#customerDetailsContent').html(modalContent);
        $('#customerDetailsModal').modal('show');
        feather.replace();
    };

    // Manage orders for customer
    window.manageOrders = function(customerId) {
        viewCustomerDetails(customerId);
    };

    // Create new order for customer
    window.createOrderForCustomer = function(customerId) {
        window.location.href = `customer-registration.html?customerId=${customerId}`;
    };

    function createNewOrderForCustomer() {
        if (currentCustomer) {
            $('#customerDetailsModal').modal('hide');
            window.location.href = `order-create.html?customerId=${currentCustomer.id}`;
        }
    }

    // Update order status modal
    window.updateOrderStatusModal = function(orderId) {
        const order = TrackingSystem.getOrderById(orderId);
        if (!order) {
            showAlert('Order not found', 'error');
            return;
        }
        
        $('#updateOrderId').val(orderId);
        $('#newStatus').val('');
        $('#statusNotes').val('');
        $('#completionAlert').hide();
        
        $('#orderStatusModal').modal('show');
    };

    // Update order status
    function updateOrderStatus() {
        const orderId = $('#updateOrderId').val();
        const newStatus = $('#newStatus').val();
        const notes = $('#statusNotes').val();
        
        if (!newStatus) {
            showAlert('Please select a status', 'error');
            return;
        }
        
        const result = TrackingSystem.updateOrderStatus(orderId, newStatus, notes);
        
        if (result.success) {
            $('#orderStatusModal').modal('hide');
            showAlert('Order status updated successfully', 'success');
            
            // Refresh customer details if modal is open
            if (currentCustomer) {
                viewCustomerDetails(currentCustomer.id);
            }
            
            // Refresh search results
            const query = $('#customerSearchInput').val().trim();
            if (query && query.length >= 2) {
                performSearch(query);
            }
        } else {
            showAlert('Error updating order status: ' + result.error, 'error');
        }
    }

    // Helper functions
    function showLoading() {
        $('#searchResults').html(`
            <div class="text-center p-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Searching...</span>
                </div>
                <p class="mt-3">Searching customers...</p>
            </div>
        `);
    }

    function clearSearchResults() {
        $('#searchResults').html(`
            <div class="no-results" id="noResultsMessage">
                <i data-feather="search" size="48" class="mb-3"></i>
                <h5>Search for Customers</h5>
                <p>Enter a customer's name, phone number, email, or ID to find their information and orders.</p>
            </div>
        `);
        feather.replace();
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
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

    function showAlert(message, type) {
        const icon = type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'success';
        Swal.fire({
            title: type.charAt(0).toUpperCase() + type.slice(1),
            text: message,
            icon: icon,
            timer: 3000,
            showConfirmButton: false
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