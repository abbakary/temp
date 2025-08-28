/**
 * Customer List Management System
 * Display, filter, and manage customer listings
 */

(function($) {
    'use strict';

    let customers = [];
    let filteredCustomers = [];
    let currentView = 'card';
    let currentFilter = 'all';

    // Initialize the customer list system
    function init() {
        bindEvents();
        loadCustomers();
        updateStatistics();
        feather.replace();
        console.log('Customer List initialized');
    }

    // Bind all events
    function bindEvents() {
        // Filter chips
        $('.filter-chip').on('click', function() {
            const filter = $(this).data('filter');
            setActiveFilter(filter);
        });

        // Search functionality
        $('#customerSearch, #headerSearch').on('input', function() {
            const query = $(this).val().trim();
            // Sync both search inputs
            $('#customerSearch, #headerSearch').val(query);
            filterCustomers();
        });

        // Customer type filter
        $('#customerTypeFilter').on('change', function() {
            filterCustomers();
        });

        // View switching
        $('#cardView, #tableView').on('click', function() {
            const viewType = $(this).attr('id') === 'cardView' ? 'card' : 'table';
            switchView(viewType);
        });
    }

    // Load customers from TrackingSystem
    function loadCustomers() {
        try {
            customers = TrackingSystem.getAllCustomers();
            filterCustomers();
        } catch (error) {
            console.error('Error loading customers:', error);
            showToast('Error loading customers', 'error');
        }
    }

    // Update statistics
    function updateStatistics() {
        const today = new Date().toDateString();
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        let totalCustomers = customers.length;
        let activeToday = 0;
        let newThisWeek = 0;
        let returningCustomers = 0;

        customers.forEach(customer => {
            // Active today (customers with visit status or recent activity)
            if (customer.currentVisitStatus && customer.currentVisitStatus !== 'departed') {
                activeToday++;
            }

            // New this week
            const registrationDate = new Date(customer.registrationDate);
            if (registrationDate >= weekAgo) {
                newThisWeek++;
            }

            // Returning customers (more than 1 visit)
            if (customer.totalVisits > 1) {
                returningCustomers++;
            }
        });

        // Update UI
        $('#totalCustomers').text(totalCustomers);
        $('#activeCustomers').text(activeToday);
        $('#newCustomers').text(newThisWeek);
        $('#returningCustomers').text(returningCustomers);
    }

    // Set active filter
    function setActiveFilter(filter) {
        currentFilter = filter;
        
        // Update UI
        $('.filter-chip').removeClass('active');
        $(`.filter-chip[data-filter="${filter}"]`).addClass('active');
        
        filterCustomers();
    }

    // Filter customers based on current criteria
    function filterCustomers() {
        let filtered = [...customers];

        // Apply quick filter
        switch (currentFilter) {
            case 'active_today':
                filtered = filtered.filter(customer => 
                    customer.currentVisitStatus && customer.currentVisitStatus !== 'departed'
                );
                break;
            case 'new_week':
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                filtered = filtered.filter(customer => 
                    new Date(customer.registrationDate) >= weekAgo
                );
                break;
            case 'returning':
                filtered = filtered.filter(customer => customer.totalVisits > 1);
                break;
            case 'no_orders':
                filtered = filtered.filter(customer => customer.totalVisits === 0);
                break;
            case 'all':
            default:
                // No additional filtering
                break;
        }

        // Apply search filter
        const searchQuery = $('#customerSearch').val().trim().toLowerCase();
        if (searchQuery) {
            filtered = filtered.filter(customer => 
                customer.name.toLowerCase().includes(searchQuery) ||
                customer.phone.toLowerCase().includes(searchQuery) ||
                (customer.email && customer.email.toLowerCase().includes(searchQuery)) ||
                (customer.customerCode && customer.customerCode.toLowerCase().includes(searchQuery))
            );
        }

        // Apply type filter
        const typeFilter = $('#customerTypeFilter').val();
        if (typeFilter) {
            filtered = filtered.filter(customer => customer.customerType === typeFilter);
        }

        filteredCustomers = filtered;
        displayCustomers();
        updateCustomerCount();
    }

    // Display customers in current view
    function displayCustomers() {
        if (filteredCustomers.length === 0) {
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

    // Display customers in card view
    function displayCardView() {
        const container = $('#customerCardsContainer');
        let html = '';

        filteredCustomers.forEach(customer => {
            const orders = TrackingSystem.getOrdersByCustomer(customer.id);
            const activeOrders = orders.filter(order => !['completed', 'cancelled'].includes(order.status));
            const lastOrder = orders.length > 0 ? orders[orders.length - 1] : null;
            
            const initials = customer.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            
            html += `
                <div class="col-xl-4 col-lg-6 col-md-6 mb-4">
                    <div class="card customer-card h-100">
                        <div class="card-body">
                            <div class="d-flex align-items-start">
                                <div class="customer-avatar me-3">
                                    ${initials}
                                </div>
                                <div class="flex-grow-1">
                                    <h6 class="mb-1">${customer.name}</h6>
                                    <p class="text-muted mb-2">${customer.customerCode}</p>
                                    <span class="customer-type-badge badge bg-primary">${getCustomerTypeLabel(customer.customerType)}</span>
                                    ${customer.currentVisitStatus ? `
                                        <span class="visit-status ${customer.currentVisitStatus} ms-2">
                                            ${getVisitStatusLabel(customer.currentVisitStatus)}
                                        </span>
                                    ` : ''}
                                </div>
                                ${activeOrders.length > 0 ? `
                                    <span class="badge bg-success">${activeOrders.length} Active</span>
                                ` : ''}
                            </div>
                            
                            <div class="mt-3">
                                <div class="row">
                                    <div class="col-6">
                                        <small class="text-muted">Phone:</small>
                                        <div class="fw-bold">${customer.phone}</div>
                                    </div>
                                    <div class="col-6">
                                        <small class="text-muted">Total Orders:</small>
                                        <div class="fw-bold">${customer.totalVisits || 0}</div>
                                    </div>
                                </div>
                                ${customer.email ? `
                                    <div class="mt-2">
                                        <small class="text-muted">Email:</small>
                                        <div class="fw-bold">${customer.email}</div>
                                    </div>
                                ` : ''}
                                ${lastOrder ? `
                                    <div class="mt-2">
                                        <small class="text-muted">Last Visit:</small>
                                        <div class="fw-bold">${formatDate(lastOrder.arrivalTime)}</div>
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div class="d-flex justify-content-between align-items-center mt-3">
                                <div class="btn-group" role="group">
                                    <button class="btn btn-outline-primary btn-sm" onclick="viewCustomer('${customer.id}')">
                                        <i data-feather="eye" class="me-1"></i>View
                                    </button>
                                    <button class="btn btn-outline-secondary btn-sm" onclick="editCustomer('${customer.id}')">
                                        <i data-feather="edit" class="me-1"></i>Edit
                                    </button>
                                </div>
                                <button class="btn btn-success btn-sm" onclick="createOrder('${customer.id}')">
                                    <i data-feather="plus" class="me-1"></i>New Order
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

    // Display customers in table view
    function displayTableView() {
        const tbody = $('#customerTableBody');
        let html = '';

        filteredCustomers.forEach(customer => {
            const orders = TrackingSystem.getOrdersByCustomer(customer.id);
            const lastOrder = orders.length > 0 ? orders[orders.length - 1] : null;
            
            html += `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="customer-avatar me-2" style="width: 35px; height: 35px; font-size: 0.9rem;">
                                ${customer.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                            </div>
                            <div>
                                <div class="fw-bold">${customer.name}</div>
                                <small class="text-muted">${customer.customerCode}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="customer-type-badge badge bg-primary">${getCustomerTypeLabel(customer.customerType)}</span>
                    </td>
                    <td>
                        <div>${customer.phone}</div>
                        ${customer.email ? `<small class="text-muted">${customer.email}</small>` : ''}
                    </td>
                    <td>
                        <span class="badge bg-info">${customer.totalVisits || 0}</span>
                    </td>
                    <td>
                        ${lastOrder ? formatDate(lastOrder.arrivalTime) : '<span class="text-muted">Never</span>'}
                    </td>
                    <td>
                        ${customer.currentVisitStatus ? `
                            <span class="visit-status ${customer.currentVisitStatus}">
                                ${getVisitStatusLabel(customer.currentVisitStatus)}
                            </span>
                        ` : '<span class="text-muted">Not in facility</span>'}
                    </td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-outline-primary btn-sm" onclick="viewCustomer('${customer.id}')" title="View Details">
                                <i data-feather="eye"></i>
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="editCustomer('${customer.id}')" title="Edit Customer">
                                <i data-feather="edit"></i>
                            </button>
                            <button class="btn btn-success btn-sm" onclick="createOrder('${customer.id}')" title="Create Order">
                                <i data-feather="plus"></i>
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
            $('#customerCardView').show();
            $('#customerTableView').hide();
        } else {
            $('#customerCardView').hide();
            $('#customerTableView').show();
        }
        
        displayCustomers();
    };

    // Update customer count display
    function updateCustomerCount() {
        const total = customers.length;
        const showing = filteredCustomers.length;
        
        let countText = `Showing ${showing} of ${total} customers`;
        
        if (currentFilter !== 'all') {
            const filterLabels = {
                'active_today': 'Active Today',
                'new_week': 'New This Week',
                'returning': 'Returning',
                'no_orders': 'No Orders'
            };
            countText += ` (${filterLabels[currentFilter]})`;
        }
        
        $('#customerCount').text(countText);
    }

    // Show empty state
    function showEmptyState() {
        $('#customerCardView, #customerTableView').hide();
        $('#emptyState').show();
    }

    // Hide empty state
    function hideEmptyState() {
        $('#emptyState').hide();
        if (currentView === 'card') {
            $('#customerCardView').show();
        } else {
            $('#customerTableView').show();
        }
    }

    // Clear all filters
    window.clearFilters = function() {
        $('#customerSearch').val('');
        $('#customerTypeFilter').val('');
        setActiveFilter('all');
    };

    // Search customers
    window.searchCustomers = function() {
        filterCustomers();
    };

    // View customer details
    window.viewCustomer = function(customerId) {
        window.location.href = `customer-search.html?customerId=${customerId}`;
    };

    // Edit customer
    window.editCustomer = function(customerId) {
        // For now, redirect to customer search with edit mode
        window.location.href = `customer-search.html?customerId=${customerId}&mode=edit`;
    };

    // Create order for customer
    window.createOrder = function(customerId) {
        window.location.href = `order-create.html?customerId=${customerId}`;
    };

    // Export customers
    window.exportCustomers = function() {
        try {
            const csvData = generateCSV(filteredCustomers);
            downloadCSV(csvData, 'customers_export.csv');
            showToast('Customer list exported successfully', 'success');
        } catch (error) {
            console.error('Export error:', error);
            showToast('Error exporting customer list', 'error');
        }
    };

    // Generate CSV data
    function generateCSV(customers) {
        const headers = ['Customer Code', 'Name', 'Phone', 'Email', 'Customer Type', 'Registration Date', 'Total Orders', 'Last Visit'];
        const rows = customers.map(customer => {
            const orders = TrackingSystem.getOrdersByCustomer(customer.id);
            const lastOrder = orders.length > 0 ? orders[orders.length - 1] : null;
            
            return [
                customer.customerCode || '',
                customer.name || '',
                customer.phone || '',
                customer.email || '',
                getCustomerTypeLabel(customer.customerType),
                formatDate(customer.registrationDate),
                customer.totalVisits || 0,
                lastOrder ? formatDate(lastOrder.arrivalTime) : 'Never'
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
    function getCustomerTypeLabel(type) {
        const labels = {
            'personal': 'Personal',
            'government': 'Government',
            'ngo': 'NGO',
            'company': 'Company'
        };
        return labels[type] || type;
    }

    function getVisitStatusLabel(status) {
        const labels = {
            'arrived': 'Arrived',
            'in_service': 'In Service',
            'completed': 'Completed',
            'departed': 'Departed'
        };
        return labels[status] || status;
    }

    function formatDate(dateString) {
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