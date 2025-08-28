/**
 * Customer Registration System
 * Multi-step customer registration with validation and draft saving
 */

(function($) {
    'use strict';

    let currentStep = 1;
    let totalSteps = 4;
    let formData = {};
    let draftTimer;

    // Initialize the registration system
    function init() {
        bindEvents();
        loadDraft();
        updateStepDisplay();
        feather.replace();
        console.log('Customer Registration initialized');
    }

    // Bind all events
    function bindEvents() {
        // Service intent selection
        $('.service-card[data-intent]').on('click', function() {
            const intent = $(this).data('intent');
            selectServiceIntent(intent);
        });

        // Service type selection
        $('.service-card[data-service]').on('click', function() {
            const service = $(this).data('service');
            selectServiceType(service);
        });

        // Customer type selection
        $('.customer-type-card').on('click', function() {
            const type = $(this).data('type');
            selectCustomerType(type);
        });

        // Form submission
        $('#customerRegistrationForm').on('submit', function(e) {
            e.preventDefault();
            submitRegistration();
        });

        // Input change events for auto-draft saving
        $('#customerRegistrationForm input, #customerRegistrationForm textarea, #customerRegistrationForm select').on('change', function() {
            clearTimeout(draftTimer);
            draftTimer = setTimeout(() => {
                saveDraft();
            }, 2000);
        });

        // Phone number formatting
        $('#customerPhone').on('input', function() {
            formatPhoneNumber(this);
        });
    }

    // Change step function
    window.changeStep = function(direction) {
        if (direction === 1) {
            // Moving forward - validate current step
            if (!validateCurrentStep()) {
                return;
            }
            
            if (currentStep < totalSteps) {
                currentStep++;
            }
        } else {
            // Moving backward
            if (currentStep > 1) {
                currentStep--;
            }
        }

        updateStepDisplay();
        populateFormData();
        
        // Special handling for step transitions
        if (currentStep === 3) {
            handleServiceTypeStep();
        }
        
        if (currentStep === 4) {
            updateRegistrationSummary();
        }
    };

    // Validate current step
    function validateCurrentStep() {
        let isValid = true;
        let errorMessage = '';

        switch (currentStep) {
            case 1:
                const name = $('#customerName').val().trim();
                const phone = $('#customerPhone').val().trim();
                
                if (!name) {
                    errorMessage = 'Customer name is required';
                    isValid = false;
                } else if (!phone) {
                    errorMessage = 'Phone number is required';
                    isValid = false;
                } else if (!isValidPhoneNumber(phone)) {
                    errorMessage = 'Please enter a valid phone number';
                    isValid = false;
                }
                break;

            case 2:
                const intent = $('#serviceIntent').val();
                if (!intent) {
                    errorMessage = 'Please select a service intent';
                    isValid = false;
                }
                break;

            case 3:
                const serviceType = $('#serviceType').val();
                if (!serviceType) {
                    errorMessage = 'Please select a service type';
                    isValid = false;
                }
                break;

            case 4:
                const customerType = $('#customerType').val();
                if (!customerType) {
                    errorMessage = 'Please select a customer type';
                    isValid = false;
                }
                
                // Validate organization details if required
                if (['government', 'ngo', 'company'].includes(customerType)) {
                    const orgName = $('#organizationName').val().trim();
                    if (!orgName) {
                        errorMessage = 'Organization name is required';
                        isValid = false;
                    }
                }
                
                // Validate personal subtype if required
                if (customerType === 'personal') {
                    const personalType = $('input[name="personalType"]:checked').val();
                    if (!personalType) {
                        errorMessage = 'Please select personal customer type';
                        isValid = false;
                    }
                }
                break;
        }

        if (!isValid) {
            Swal.fire({
                title: 'Validation Error',
                text: errorMessage,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }

        return isValid;
    }

    // Update step display
    function updateStepDisplay() {
        // Update step wizard
        $('.step').removeClass('active completed');
        for (let i = 1; i <= totalSteps; i++) {
            const stepElement = $(`.step[data-step="${i}"]`);
            if (i < currentStep) {
                stepElement.addClass('completed');
            } else if (i === currentStep) {
                stepElement.addClass('active');
            }
        }

        // Update step content
        $('.step-content').removeClass('active');
        $(`#step${currentStep}`).addClass('active');

        // Update navigation buttons
        if (currentStep === 1) {
            $('#prevBtn').hide();
        } else {
            $('#prevBtn').show();
        }

        if (currentStep === totalSteps) {
            $('#nextBtn').hide();
            $('#submitBtn').show();
        } else {
            $('#nextBtn').show();
            $('#submitBtn').hide();
        }

        // Refresh feather icons
        feather.replace();
    }

    // Select service intent
    function selectServiceIntent(intent) {
        $('.service-card[data-intent]').removeClass('selected');
        $(`.service-card[data-intent="${intent}"]`).addClass('selected');
        $('#serviceIntent').val(intent);
        
        formData.serviceIntent = intent;
    }

    // Select service type
    function selectServiceType(service) {
        $('.service-card[data-service]').removeClass('selected');
        $(`.service-card[data-service="${service}"]`).addClass('selected');
        $('#serviceType').val(service);
        
        formData.serviceType = service;
    }

    // Handle service type step logic
    function handleServiceTypeStep() {
        const intent = $('#serviceIntent').val();
        
        if (intent === 'inquiry') {
            // For inquiries, automatically select consultation and move to next step
            selectServiceType('inquiry');
            // Auto-advance after a short delay
            setTimeout(() => {
                changeStep(1);
            }, 1000);
        }
    }

    // Select customer type
    function selectCustomerType(type) {
        $('.customer-type-card').removeClass('selected');
        $(`.customer-type-card[data-type="${type}"]`).addClass('selected');
        $('#customerType').val(type);
        
        formData.customerType = type;

        // Show/hide relevant sections
        if (['government', 'ngo', 'company'].includes(type)) {
            $('#organizationDetails').show();
            $('#personalSubtype').hide();
            $('#bodabodaOption').hide();
        } else if (type === 'personal') {
            $('#organizationDetails').hide();
            $('#personalSubtype').show();
            $('#bodabodaOption').show();
        } else {
            $('#organizationDetails').hide();
            $('#personalSubtype').hide();
            $('#bodabodaOption').hide();
        }
    }

    // Populate form data from inputs
    function populateFormData() {
        formData = {
            // Basic info
            name: $('#customerName').val().trim(),
            phone: $('#customerPhone').val().trim(),
            email: $('#customerEmail').val().trim(),
            address: $('#customerAddress').val().trim(),
            notes: $('#customerNotes').val().trim(),
            
            // Service info
            serviceIntent: $('#serviceIntent').val(),
            serviceType: $('#serviceType').val(),
            
            // Customer type
            customerType: $('#customerType').val(),
            organizationName: $('#organizationName').val().trim(),
            taxNumber: $('#taxNumber').val().trim(),
            personalType: $('input[name="personalType"]:checked').val(),
            isBodaboda: $('#isBodaboda').is(':checked'),
            
            // Metadata
            registrationDate: new Date().toISOString(),
            registrationStep: currentStep
        };
    }

    // Update registration summary
    function updateRegistrationSummary() {
        populateFormData();
        
        const summary = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Customer Information</h6>
                    <p><strong>Name:</strong> ${formData.name}</p>
                    <p><strong>Phone:</strong> ${formData.phone}</p>
                    ${formData.email ? `<p><strong>Email:</strong> ${formData.email}</p>` : ''}
                    ${formData.address ? `<p><strong>Address:</strong> ${formData.address}</p>` : ''}
                </div>
                <div class="col-md-6">
                    <h6>Service & Customer Type</h6>
                    <p><strong>Service Intent:</strong> ${getServiceIntentLabel(formData.serviceIntent)}</p>
                    <p><strong>Service Type:</strong> ${getServiceTypeLabel(formData.serviceType)}</p>
                    <p><strong>Customer Type:</strong> ${getCustomerTypeLabel(formData.customerType)}</p>
                    ${formData.organizationName ? `<p><strong>Organization:</strong> ${formData.organizationName}</p>` : ''}
                    ${formData.personalType ? `<p><strong>Personal Type:</strong> ${formData.personalType}</p>` : ''}
                    ${formData.isBodaboda ? `<p><strong>Bodaboda Operator:</strong> Yes</p>` : ''}
                </div>
            </div>
        `;
        
        $('#registrationSummary').html(summary);
    }

    // Submit registration
    function submitRegistration() {
        if (!validateCurrentStep()) {
            return;
        }

        populateFormData();

        try {
            // Generate customer code
            const customerCode = 'CUST' + Date.now();
            formData.customerCode = customerCode;
            formData.id = customerCode;

            // Create customer using TrackingSystem
            const result = TrackingSystem.createCustomer(formData);
            
            if (result.success) {
                // Clear draft
                localStorage.removeItem('customerRegistrationDraft');
                
                // Show success message
                Swal.fire({
                    title: 'Registration Successful!',
                    text: `Customer ${formData.name} has been registered successfully. Customer Code: ${customerCode}`,
                    icon: 'success',
                    showCancelButton: true,
                    confirmButtonText: 'Create Order',
                    cancelButtonText: 'Register Another',
                    reverseButtons: true
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Redirect to order creation with customer pre-selected
                        window.location.href = `order-create.html?customerId=${customerCode}`;
                    } else {
                        // Reset form for new registration
                        resetForm();
                    }
                });
            } else {
                throw new Error(result.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            Swal.fire({
                title: 'Registration Failed',
                text: 'There was an error registering the customer. Please try again.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    }

    // Save draft
    window.saveDraft = function() {
        populateFormData();
        localStorage.setItem('customerRegistrationDraft', JSON.stringify(formData));
        
        // Show brief save notification
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000
        });
        
        Toast.fire({
            icon: 'info',
            title: 'Draft saved'
        });
    };

    // Load draft
    function loadDraft() {
        const draft = localStorage.getItem('customerRegistrationDraft');
        if (draft) {
            try {
                const data = JSON.parse(draft);
                
                // Populate form fields
                $('#customerName').val(data.name || '');
                $('#customerPhone').val(data.phone || '');
                $('#customerEmail').val(data.email || '');
                $('#customerAddress').val(data.address || '');
                $('#customerNotes').val(data.notes || '');
                $('#organizationName').val(data.organizationName || '');
                $('#taxNumber').val(data.taxNumber || '');
                
                if (data.personalType) {
                    $(`input[name="personalType"][value="${data.personalType}"]`).prop('checked', true);
                }
                
                if (data.isBodaboda) {
                    $('#isBodaboda').prop('checked', true);
                }

                // Set hidden fields
                if (data.serviceIntent) {
                    selectServiceIntent(data.serviceIntent);
                }
                
                if (data.serviceType) {
                    selectServiceType(data.serviceType);
                }
                
                if (data.customerType) {
                    selectCustomerType(data.customerType);
                }

                // Restore step if available
                if (data.registrationStep && data.registrationStep > 1) {
                    currentStep = data.registrationStep;
                    updateStepDisplay();
                }

                console.log('Draft loaded successfully');
            } catch (error) {
                console.error('Error loading draft:', error);
                localStorage.removeItem('customerRegistrationDraft');
            }
        }
    }

    // Reset form
    function resetForm() {
        currentStep = 1;
        formData = {};
        $('#customerRegistrationForm')[0].reset();
        $('.service-card, .customer-type-card').removeClass('selected');
        $('#organizationDetails, #personalSubtype, #bodabodaOption').hide();
        updateStepDisplay();
        
        // Clear draft
        localStorage.removeItem('customerRegistrationDraft');
    }

    // Helper functions
    function formatPhoneNumber(input) {
        let value = input.value.replace(/\D/g, '');
        
        if (value.startsWith('255')) {
            value = '+' + value;
        } else if (value.startsWith('0')) {
            value = '+255' + value.substring(1);
        } else if (!value.startsWith('+')) {
            value = '+255' + value;
        }
        
        input.value = value;
    }

    function isValidPhoneNumber(phone) {
        const phoneRegex = /^\+255\d{9}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    function getServiceIntentLabel(intent) {
        const labels = {
            'service': 'I need a service',
            'inquiry': 'Just an inquiry'
        };
        return labels[intent] || intent;
    }

    function getServiceTypeLabel(type) {
        const labels = {
            'tire-sales': 'Tire Sales',
            'car-service': 'Car Service',
            'inquiry': 'Consultation'
        };
        return labels[type] || type;
    }

    function getCustomerTypeLabel(type) {
        const labels = {
            'government': 'Government',
            'ngo': 'NGO',
            'company': 'Private Company',
            'personal': 'Personal'
        };
        return labels[type] || type;
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