/**
 * Order Creation System
 * Handles new order creation for existing customers
 */

(function($) {
    'use strict';

    let selectedCustomer = null;
    let selectedServiceType = null;
    let searchTimer;

    // Initialize the order creation system
    function init() {
        bindEvents();
        checkUrlParameters();
        feather.replace();
        console.log('Order Creation initialized');
    }

    // Bind all events
    function bindEvents() {
        // Customer search
        $('#customerSearch').on('input', function() {
            const query = $(this).val().trim();
            
            clearTimeout(searchTimer);
            
            if (query.length >= 2) {
                searchTimer = setTimeout(() => {
                    searchCustomers(query);
                }, 300);
            } else {
                hideCustomerSearchResults();
            }
        });

        // Search customer button
        $('#searchCustomerBtn').on('click', function() {
            const query = $('#customerSearch').val().trim();
            if (query) {
                searchCustomers(query);
            }
        });

        // Service type selection
        $('.service-type-card').on('click', function() {
            selectServiceType($(this).data('service'));
        });

        // Priority selection
        $('.priority-selector .btn').on('click', function() {
            $('.priority-selector .btn').removeClass('active');
            $(this).addClass('active');
            $('#priority').val($(this).data('priority'));
        });

        // Form submission
        $('#orderCreationForm').on('submit', function(e) {
            e.preventDefault();
            createOrder();
        });

        // Service type checkboxes for car service
        $('input[name="serviceTypes[]"]').on('change', function() {
            updateServiceTypeValidation();
        });
    }

    // Check URL parameters for pre-selected customer
    function checkUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const customerId = urlParams.get('customerId');
        
        if (customerId) {
            const customer = TrackingSystem.getCustomerById(customerId);
            if (customer) {
                selectCustomer(customer);
            }
        }
    }

    // Search for customers
    function searchCustomers(query) {
        try {
            const customers = TrackingSystem.searchCustomers(query);
            displayCustomerSearchResults(customers);
        } catch (error) {
            console.error('Customer search error:', error);
            showAlert('Error searching customers', 'error');
        }
    }

    // Display customer search results
    function displayCustomerSearchResults(customers) {
        const resultsContainer = $('#customerResultsList');
        const searchResultsSection = $('#customerSearchResults');
        
        if (customers.length === 0) {
            hideCustomerSearchResults();
            showAlert('No customers found matching your search', 'warning');
            return;
        }
        
        let html = '';
        customers.forEach(customer => {
            const orders = TrackingSystem.getOrdersByCustomer(customer.id);
            const activeOrders = orders.filter(o => !['completed', 'cancelled'].includes(o.status));
            
            html += `
                <div class="customer-result-item border rounded p-3 mb-2 cursor-pointer" data-customer-id="${customer.id}">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <h6 class="mb-1">${customer.name}</h6>
                            <p class="mb-1">
                                <small class="text-muted">
                                    <i data-feather="phone" class="me-1"></i>${customer.phone}
                                    ${customer.email ? ` | <i data-feather="mail" class="me-1"></i>${customer.email}` : ''}
                                </small>
                            </p>
                            <small class="text-info">${customer.customerType} | ${orders.length} total orders</small>
                        </div>
                        <div class="col-md-4 text-end">
                            ${activeOrders.length > 0 ? `<span class="badge bg-warning">${activeOrders.length} Active Orders</span>` : ''}
                            <br>
                            <button class="btn btn-primary btn-sm mt-2" onclick="selectCustomerById('${customer.id}')">
                                Select
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        resultsContainer.html(html);
        searchResultsSection.show();
        feather.replace();
    }

    function hideCustomerSearchResults() {
        $('#customerSearchResults').hide();
    }

    // Select customer
    window.selectCustomerById = function(customerId) {
        const customer = TrackingSystem.getCustomerById(customerId);
        if (customer) {
            selectCustomer(customer);
        }
    };

    function selectCustomer(customer) {
        selectedCustomer = customer;
        
        // Update hidden fields
        $('#selectedCustomerId').val(customer.id);
        $('#selectedCustomerName').val(customer.name);
        
        // Display selected customer info
        const customerInfoHtml = `
            <div>
                <h6 class="mb-2">${customer.name} <small class="text-muted">(${customer.customerType})</small></h6>
                <p class="mb-1">
                    <i data-feather="phone" class="me-2"></i>${customer.phone}
                    ${customer.email ? ` | <i data-feather="mail" class="me-2"></i>${customer.email}` : ''}
                </p>
                <small class="text-info">Customer ID: ${customer.id}</small>
            </div>
        `;
        
        $('#customerInfoContent').html(customerInfoHtml);
        $('#selectedCustomerDisplay').show();
        hideCustomerSearchResults();
        
        // Clear search input
        $('#customerSearch').val('');
        
        // Show service type selection
        $('#serviceTypeSection').show();
        
        feather.replace();
        
        console.log('Customer selected:', customer);
    }

    // Clear customer selection
    window.clearCustomerSelection = function() {
        selectedCustomer = null;
        $('#selectedCustomerId').val('');
        $('#selectedCustomerName').val('');
        $('#selectedCustomerDisplay').hide();
        $('#serviceTypeSection').hide();
        $('#serviceDetailsSection').hide();
        $('#actionButtons').hide();
        selectedServiceType = null;
        $('.service-type-card').removeClass('selected');
    };

    // Select service type
    function selectServiceType(serviceType) {
        selectedServiceType = serviceType;
        
        // Update UI
        $('.service-type-card').removeClass('selected');
        $(`.service-type-card[data-service="${serviceType}"]`).addClass('selected');
        $('#selectedServiceType').val(serviceType);
        
        // Show service details section
        showServiceDetails(serviceType);
        $('#serviceDetailsSection').show();
        $('#actionButtons').show();
        
        console.log('Service type selected:', serviceType);
    }

    // Show service-specific details
    function showServiceDetails(serviceType) {
        // Hide all service detail sections
        $('#tireSalesDetails, #carServiceDetails, #consultationDetails').hide();
        
        // Update progress indicator
        updateProgressIndicator(serviceType);
        
        // Show relevant section with animation
        if (serviceType === 'tire-sales') {
            $('#tireSalesDetails').slideDown(300);
        } else if (serviceType === 'car-service') {
            $('#carServiceDetails').slideDown(300);
            
            // Pre-fill vehicle info if customer has vehicles
            if (selectedCustomer && selectedCustomer.vehicles && selectedCustomer.vehicles.length > 0) {
                const vehicle = selectedCustomer.vehicles[0];
                $('#plateNumber').val(vehicle.plateNumber || '');
                $('#vehicleMake').val(vehicle.make || '');
                $('#vehicleModel').val(vehicle.model || '');
                $('#vehicleType').val(vehicle.type || '');
            }
        } else if (serviceType === 'consultation') {
            $('#consultationDetails').slideDown(300);
        }
        
        // Scroll to service details section
        $('html, body').animate({
            scrollTop: $('#serviceDetailsSection').offset().top - 100
        }, 500);
    }
    
    // Update progress indicator
    function updateProgressIndicator(serviceType) {
        // Reset all steps
        $('.progress-step').removeClass('completed');
        
        // Mark completed steps
        $('#step1, #step2').addClass('completed');
        
        if (serviceType) {
            $('#step3').addClass('completed');
        }
    }

    // Validate service types for car service
    function updateServiceTypeValidation() {
        const checkedServices = $('input[name="serviceTypes[]"]:checked');
        const isCarService = selectedServiceType === 'car-service';
        
        if (isCarService && checkedServices.length === 0) {
            $('input[name="serviceTypes[]"]').first().get(0).setCustomValidity('Please select at least one service type');
        } else {
            $('input[name="serviceTypes[]"]').each(function() {
                this.setCustomValidity('');
            });
        }
    }

    // Create the order
    function createOrder() {
        if (!validateForm()) {
            return;
        }
        
        try {
            // Collect form data
            const formData = collectFormData();
            
            // Prepare order data
            const orderData = {
                customerId: selectedCustomer.id,
                customerName: selectedCustomer.name,
                orderType: selectedServiceType === 'tire-sales' ? 'sales' : 'service',
                serviceType: selectedServiceType,
                priority: formData.priority || 'normal',
                description: formData.description || '',
                estimatedCompletion: formData.estimatedDuration || '',
                serviceDetails: prepareServiceDetails(formData)
            };
            
            // Create the order
            const result = TrackingSystem.createOrder(orderData);
            
            if (result.success) {
                showSuccessMessage(result.order);
            } else {
                showAlert('Error creating order: ' + result.error, 'error');
            }
            
        } catch (error) {
            console.error('Order creation error:', error);
            showAlert('An unexpected error occurred while creating the order', 'error');
        }
    }

    // Validate the form
    function validateForm() {
        let isValid = true;
        
        // Remove previous validation states
        $('.is-invalid').removeClass('is-invalid');
        
        // Check customer selection
        if (!selectedCustomer) {
            $('#customerSearch').addClass('is-invalid');
            showAlert('Please select a customer', 'error');
            isValid = false;
        }
        
        // Check service type selection
        if (!selectedServiceType) {
            showAlert('Please select a service type', 'error');
            isValid = false;
        }
        
        // Service-specific validation
        if (selectedServiceType === 'tire-sales') {
            const requiredFields = ['tireItemName', 'tireBrand'];
            requiredFields.forEach(field => {
                const input = $(`#${field}`);
                if (!input.val().trim()) {
                    input.addClass('is-invalid');
                    isValid = false;
                }
            });
        } else if (selectedServiceType === 'car-service') {
            // Check if at least one service type is selected
            const checkedServices = $('input[name="serviceTypes[]"]:checked');
            if (checkedServices.length === 0) {
                showAlert('Please select at least one service type for car service', 'error');
                isValid = false;
            }
            
            // Check problem description
            const problemDesc = $('#problemDescription').val().trim();
            if (!problemDesc) {
                $('#problemDescription').addClass('is-invalid');
                isValid = false;
            }
        } else if (selectedServiceType === 'consultation') {
            // Check consultation required fields
            const requiredFields = ['inquiryType', 'consultationQuestions'];
            requiredFields.forEach(field => {
                const input = $(`#${field}`);
                if (!input.val().trim()) {
                    input.addClass('is-invalid');
                    isValid = false;
                }
            });
        }
        
        return isValid;
    }

    // Collect form data
    function collectFormData() {
        const form = $('#orderCreationForm')[0];
        const formDataObj = {};
        
        // Get all form elements
        $(form).find('input, select, textarea').each(function() {
            const element = $(this);
            const name = element.attr('name');
            const type = element.attr('type');
            
            if (name) {
                if (type === 'checkbox') {
                    if (element.is(':checked')) {
                        if (!formDataObj[name]) formDataObj[name] = [];
                        formDataObj[name].push(element.val());
                    }
                } else {
                    formDataObj[name] = element.val();
                }
            }
        });
        
        return formDataObj;
    }

    // Prepare service-specific details
    function prepareServiceDetails(formData) {
        const details = {};
        
        if (selectedServiceType === 'tire-sales') {
            details.service_type = 'tire-sales';
            details.items = [formData.itemName];
            details.brand = formData.tireBrand;
            details.quantity = parseInt(formData.quantity) || 1;
            details.tire_type = formData.tireType;
        } else if (selectedServiceType === 'car-service') {
            details.service_type = 'car-service';
            details.service_types = formData['serviceTypes[]'] || [];
            details.vehicle_info = {
                plate_number: formData.plateNumber || '',
                make: formData.vehicleMake || '',
                model: formData.vehicleModel || ''
            };
            details.problem_description = formData.problemDescription || '';
            details.estimated_duration = formData.estimatedDuration || '';
            details.priority = formData.priority || 'normal';
        }
        
        return details;
    }

    // Show success message
    function showSuccessMessage(order) {
        const message = `
            <div class="text-center">
                <h5>Order Created Successfully!</h5>
                <div class="my-4">
                    <div class="alert alert-success">
                        <strong>Order Number:</strong> ${order.orderNumber}<br>
                        <strong>Customer:</strong> ${selectedCustomer.name}<br>
                        <strong>Service:</strong> ${order.serviceType}<br>
                        <strong>Status:</strong> Pending<br>
                        <strong>Arrival Time:</strong> ${new Date(order.arrivalTime).toLocaleString()}
                    </div>
                </div>
                <p>The customer has arrived and their order has been created. What would you like to do next?</p>
            </div>
        `;
        
        Swal.fire({
            title: 'Order Created!',
            html: message,
            icon: 'success',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'View Dashboard',
            denyButtonText: 'Create Another Order',
            cancelButtonText: 'Track This Order',
            confirmButtonColor: '#28a745',
            denyButtonColor: '#007bff',
            cancelButtonColor: '#ffc107'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = 'index.html';
            } else if (result.isDenied) {
                resetForm();
            } else if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
                window.location.href = `order-tracking.html?orderId=${order.id}`;
            }
        });
    }

    // Reset the form
    function resetForm() {
        selectedCustomer = null;
        selectedServiceType = null;
        
        // Reset form
        $('#orderCreationForm')[0].reset();
        
        // Reset UI
        $('#selectedCustomerDisplay').hide();
        $('#serviceTypeSection').hide();
        $('#serviceDetailsSection').hide();
        $('#actionButtons').hide();
        hideCustomerSearchResults();
        
        // Reset selections
        $('.service-type-card').removeClass('selected');
        $('.priority-selector .btn').removeClass('active');
        $('.priority-selector .btn[data-priority="normal"]').addClass('active');
        $('#priority').val('normal');
        
        // Reset validation
        $('.is-invalid').removeClass('is-invalid');
        
        console.log('Form reset');
    }

    // Show alert
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