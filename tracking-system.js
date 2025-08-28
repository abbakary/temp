/**
 * Advanced Tracking System - Core Business Logic
 * Handles Customer Management, Order Management, and Status Tracking
 */

var TrackingSystem = (function() {
    'use strict';

    // System Configuration
    const CONFIG = {
        storage: {
            customers: 'trackingSystem_customers',
            orders: 'trackingSystem_orders',
            vehicles: 'trackingSystem_vehicles',
            services: 'trackingSystem_services',
            settings: 'trackingSystem_settings'
        },
        orderStatuses: {
            'pending': { label: 'Pending', color: '#ffc107', icon: 'clock' },
            'in-progress': { label: 'In Progress', color: '#17a2b8', icon: 'play-circle' },
            'service-complete': { label: 'Service Complete', color: '#fd7e14', icon: 'check-circle' },
            'ready-for-departure': { label: 'Ready for Departure', color: '#20c997', icon: 'arrow-right-circle' },
            'completed': { label: 'Completed', color: '#28a745', icon: 'check-circle' },
            'cancelled': { label: 'Cancelled', color: '#dc3545', icon: 'x-circle' }
        },
        serviceTypes: {
            'tire-sales': {
                label: 'Tire Sales',
                icon: 'circle',
                color: '#007bff',
                fields: ['item_name', 'brand', 'quantity', 'tire_type']
            },
            'car-service': {
                label: 'Car Service',
                icon: 'tool',
                color: '#28a745',
                fields: ['service_types', 'vehicle_info', 'problem_description', 'estimated_duration', 'priority']
            },
            'general-inquiry': {
                label: 'General Inquiry',
                icon: 'help-circle',
                color: '#ffc107',
                fields: ['inquiry_details']
            }
        },
        customerTypes: ['personal', 'business', 'government', 'ngo', 'boda-boda']
    };

    // Data Models
    class Customer {
        constructor(data) {
            this.id = data.id || generateId('CUST');
            this.name = data.name;
            this.phone = data.phone;
            this.email = data.email || '';
            this.address = data.address || '';
            this.customerType = data.customerType;
            this.notes = data.notes || '';
            this.vehicles = data.vehicles || [];
            this.createdAt = data.createdAt || new Date().toISOString();
            this.updatedAt = data.updatedAt || new Date().toISOString();
            this.totalOrders = data.totalOrders || 0;
            this.lastVisit = data.lastVisit || null;
        }

        addVehicle(vehicle) {
            this.vehicles.push({
                plateNumber: vehicle.plateNumber,
                make: vehicle.make,
                model: vehicle.model,
                vehicleType: vehicle.vehicleType,
                addedAt: new Date().toISOString()
            });
            this.updatedAt = new Date().toISOString();
        }

        toJSON() {
            return {
                id: this.id,
                name: this.name,
                phone: this.phone,
                email: this.email,
                address: this.address,
                customerType: this.customerType,
                notes: this.notes,
                vehicles: this.vehicles,
                createdAt: this.createdAt,
                updatedAt: this.updatedAt,
                totalOrders: this.totalOrders,
                lastVisit: this.lastVisit
            };
        }
    }

    class Order {
        constructor(data) {
            this.id = data.id || generateId('ORD');
            this.orderNumber = data.orderNumber || generateOrderNumber();
            this.customerId = data.customerId;
            this.customerName = data.customerName;
            this.orderType = data.orderType; // 'sales' or 'service'
            this.serviceType = data.serviceType; // 'tire-sales', 'car-service', etc.
            this.status = data.status || 'pending';
            this.priority = data.priority || 'normal'; // 'low', 'normal', 'high', 'urgent'
            this.description = data.description || '';
            this.estimatedCompletion = data.estimatedCompletion || '';
            
            // Timestamps
            this.arrivalTime = data.arrivalTime || new Date().toISOString();
            this.departureTime = data.departureTime || null;
            this.createdAt = data.createdAt || new Date().toISOString();
            this.updatedAt = data.updatedAt || new Date().toISOString();
            
            // Service details
            this.serviceDetails = data.serviceDetails || {};
            
            // Status history
            this.statusHistory = data.statusHistory || [{
                status: this.status,
                timestamp: new Date().toISOString(),
                notes: 'Order created'
            }];
            
            // Duration calculations
            this.actualDuration = data.actualDuration || null;
        }

        updateStatus(newStatus, notes = '') {
            const previousStatus = this.status;
            this.status = newStatus;
            this.updatedAt = new Date().toISOString();
            
            // Add to status history
            this.statusHistory.push({
                status: newStatus,
                previousStatus: previousStatus,
                timestamp: new Date().toISOString(),
                notes: notes
            });
            
            // Auto-set departure time when completed
            if (newStatus === 'completed' && !this.departureTime) {
                this.departureTime = new Date().toISOString();
                this.calculateActualDuration();
            }
            
            return this;
        }

        calculateActualDuration() {
            if (this.arrivalTime && this.departureTime) {
                const arrival = new Date(this.arrivalTime);
                const departure = new Date(this.departureTime);
                const durationMs = departure - arrival;
                const hours = Math.floor(durationMs / (1000 * 60 * 60));
                const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                this.actualDuration = `${hours}h ${minutes}m`;
            }
        }

        getStatusInfo() {
            return CONFIG.orderStatuses[this.status] || CONFIG.orderStatuses['pending'];
        }

        getServiceTypeInfo() {
            return CONFIG.serviceTypes[this.serviceType] || CONFIG.serviceTypes['general-inquiry'];
        }

        toJSON() {
            return {
                id: this.id,
                orderNumber: this.orderNumber,
                customerId: this.customerId,
                customerName: this.customerName,
                orderType: this.orderType,
                serviceType: this.serviceType,
                status: this.status,
                priority: this.priority,
                description: this.description,
                estimatedCompletion: this.estimatedCompletion,
                arrivalTime: this.arrivalTime,
                departureTime: this.departureTime,
                createdAt: this.createdAt,
                updatedAt: this.updatedAt,
                serviceDetails: this.serviceDetails,
                statusHistory: this.statusHistory,
                actualDuration: this.actualDuration
            };
        }
    }

    // Core Functions
    function generateId(prefix = 'ID') {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 8);
        return `${prefix}-${timestamp}-${randomStr}`.toUpperCase();
    }

    function generateOrderNumber() {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const orders = getAllOrders();
        const dailyCount = orders.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate.toDateString() === date.toDateString();
        }).length + 1;
        return `${year}${month}${day}-${dailyCount.toString().padStart(3, '0')}`;
    }

    // Storage Functions
    function saveToStorage(key, data) {
        try {
            localStorage.setItem(CONFIG.storage[key], JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Error saving to storage (${key}):`, error);
            return false;
        }
    }

    function loadFromStorage(key) {
        try {
            const data = localStorage.getItem(CONFIG.storage[key]);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error(`Error loading from storage (${key}):`, error);
            return [];
        }
    }

    // Customer Management
    function createCustomer(customerData) {
        try {
            const customer = new Customer(customerData);
            const customers = getAllCustomers();
            
            // Check for duplicate phone numbers
            const existingCustomer = customers.find(c => c.phone === customer.phone);
            if (existingCustomer) {
                throw new Error('Customer with this phone number already exists');
            }
            
            customers.push(customer.toJSON());
            saveToStorage('customers', customers);
            
            return { success: true, customer: customer, message: 'Customer created successfully' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    function updateCustomer(customerId, updateData) {
        try {
            const customers = getAllCustomers();
            const customerIndex = customers.findIndex(c => c.id === customerId);
            
            if (customerIndex === -1) {
                throw new Error('Customer not found');
            }
            
            const updatedCustomer = { ...customers[customerIndex], ...updateData };
            updatedCustomer.updatedAt = new Date().toISOString();
            
            customers[customerIndex] = updatedCustomer;
            saveToStorage('customers', customers);
            
            return { success: true, customer: updatedCustomer, message: 'Customer updated successfully' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    function searchCustomers(query) {
        const customers = getAllCustomers();
        const searchTerm = query.toLowerCase();
        
        return customers.filter(customer => 
            customer.name.toLowerCase().includes(searchTerm) ||
            customer.phone.includes(searchTerm) ||
            customer.email.toLowerCase().includes(searchTerm) ||
            customer.id.toLowerCase().includes(searchTerm)
        );
    }

    function getCustomerById(customerId) {
        const customers = getAllCustomers();
        return customers.find(customer => customer.id === customerId);
    }

    function getCustomerByPhone(phone) {
        const customers = getAllCustomers();
        return customers.find(customer => customer.phone === phone);
    }

    function getAllCustomers() {
        return loadFromStorage('customers');
    }

    // Order Management
    function createOrder(orderData) {
        try {
            const order = new Order(orderData);
            const orders = getAllOrders();
            
            orders.push(order.toJSON());
            saveToStorage('orders', orders);
            
            // Update customer's total orders and last visit
            updateCustomerOrderStats(order.customerId);
            
            return { success: true, order: order, message: 'Order created successfully' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    function updateOrderStatus(orderId, newStatus, notes = '') {
        try {
            const orders = getAllOrders();
            const orderIndex = orders.findIndex(o => o.id === orderId);
            
            if (orderIndex === -1) {
                throw new Error('Order not found');
            }
            
            const order = new Order(orders[orderIndex]);
            order.updateStatus(newStatus, notes);
            
            orders[orderIndex] = order.toJSON();
            saveToStorage('orders', orders);
            
            // Update customer's last visit if completed
            if (newStatus === 'completed') {
                updateCustomerLastVisit(order.customerId);
            }
            
            return { success: true, order: order, message: 'Order status updated successfully' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    function getOrderById(orderId) {
        const orders = getAllOrders();
        return orders.find(order => order.id === orderId);
    }

    function getOrdersByCustomer(customerId) {
        const orders = getAllOrders();
        return orders.filter(order => order.customerId === customerId);
    }

    function getOrdersByStatus(status) {
        const orders = getAllOrders();
        return orders.filter(order => order.status === status);
    }

    function getAllOrders() {
        return loadFromStorage('orders');
    }

    function searchOrders(query) {
        const orders = getAllOrders();
        const searchTerm = query.toLowerCase();
        
        return orders.filter(order => 
            order.orderNumber.toLowerCase().includes(searchTerm) ||
            order.customerName.toLowerCase().includes(searchTerm) ||
            order.id.toLowerCase().includes(searchTerm) ||
            order.description.toLowerCase().includes(searchTerm)
        );
    }

    // Helper Functions
    function updateCustomerOrderStats(customerId) {
        const customer = getCustomerById(customerId);
        if (customer) {
            const customerOrders = getOrdersByCustomer(customerId);
            updateCustomer(customerId, {
                totalOrders: customerOrders.length,
                lastVisit: new Date().toISOString()
            });
        }
    }

    function updateCustomerLastVisit(customerId) {
        updateCustomer(customerId, {
            lastVisit: new Date().toISOString()
        });
    }

    // Analytics Functions
    function getAnalytics() {
        const customers = getAllCustomers();
        const orders = getAllOrders();
        const today = new Date().toDateString();
        
        return {
            totalCustomers: customers.length,
            totalOrders: orders.length,
            activeOrders: orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length,
            completedToday: orders.filter(o => 
                o.status === 'completed' && 
                o.departureTime && 
                new Date(o.departureTime).toDateString() === today
            ).length,
            pendingOrders: orders.filter(o => o.status === 'pending').length,
            inProgressOrders: orders.filter(o => o.status === 'in-progress').length,
            readyForDeparture: orders.filter(o => o.status === 'ready-for-departure').length,
            averageServiceTime: calculateAverageServiceTime(),
            customerTypes: getCustomerTypeStats(),
            serviceTypeStats: getServiceTypeStats(),
            dailyStats: getDailyStats()
        };
    }

    function calculateAverageServiceTime() {
        const completedOrders = getAllOrders().filter(o => o.status === 'completed' && o.actualDuration);
        if (completedOrders.length === 0) return '0h 0m';
        
        let totalMinutes = 0;
        completedOrders.forEach(order => {
            const arrival = new Date(order.arrivalTime);
            const departure = new Date(order.departureTime);
            totalMinutes += (departure - arrival) / (1000 * 60);
        });
        
        const avgMinutes = totalMinutes / completedOrders.length;
        const hours = Math.floor(avgMinutes / 60);
        const minutes = Math.floor(avgMinutes % 60);
        
        return `${hours}h ${minutes}m`;
    }

    function getCustomerTypeStats() {
        const customers = getAllCustomers();
        const stats = {};
        CONFIG.customerTypes.forEach(type => {
            stats[type] = customers.filter(c => c.customerType === type).length;
        });
        return stats;
    }

    function getServiceTypeStats() {
        const orders = getAllOrders();
        const stats = {};
        Object.keys(CONFIG.serviceTypes).forEach(type => {
            stats[type] = orders.filter(o => o.serviceType === type).length;
        });
        return stats;
    }

    function getDailyStats() {
        const orders = getAllOrders();
        const last7Days = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            
            last7Days.push({
                date: dateStr,
                orders: orders.filter(o => new Date(o.arrivalTime).toDateString() === dateStr).length,
                completed: orders.filter(o => 
                    o.status === 'completed' && 
                    o.departureTime && 
                    new Date(o.departureTime).toDateString() === dateStr
                ).length
            });
        }
        
        return last7Days;
    }

    // Notification System
    function getNotifications() {
        const orders = getAllOrders();
        const notifications = [];
        
        // Long waiting customers
        const longWaitingOrders = orders.filter(order => {
            if (['completed', 'cancelled'].includes(order.status)) return false;
            const arrivalTime = new Date(order.arrivalTime);
            const hoursWaiting = (new Date() - arrivalTime) / (1000 * 60 * 60);
            return hoursWaiting > 3; // More than 3 hours
        });
        
        longWaitingOrders.forEach(order => {
            notifications.push({
                type: 'warning',
                title: 'Long Waiting Customer',
                message: `${order.customerName} has been waiting for more than 3 hours`,
                orderId: order.id,
                timestamp: new Date().toISOString()
            });
        });
        
        // Ready for departure
        const readyOrders = orders.filter(order => order.status === 'ready-for-departure');
        readyOrders.forEach(order => {
            notifications.push({
                type: 'info',
                title: 'Ready for Departure',
                message: `${order.customerName} is ready to leave`,
                orderId: order.id,
                timestamp: new Date().toISOString()
            });
        });
        
        return notifications;
    }

    // Initialize system with sample data if needed
    function initialize() {
        const customers = getAllCustomers();
        const orders = getAllOrders();
        
        // Add sample data if system is empty
        if (customers.length === 0 && orders.length === 0) {
            initializeSampleData();
        }
        
        console.log('Tracking System initialized');
        return {
            totalCustomers: customers.length,
            totalOrders: orders.length
        };
    }

    function initializeSampleData() {
        // Sample customers
        const sampleCustomers = [
            {
                name: 'John Doe',
                phone: '+256701234567',
                email: 'john.doe@email.com',
                customerType: 'personal',
                address: 'Kampala, Uganda'
            },
            {
                name: 'Safari Auto Services',
                phone: '+256702345678',
                email: 'info@safariuato.com',
                customerType: 'business',
                address: 'Industrial Area, Kampala'
            },
            {
                name: 'Ministry of Transport',
                phone: '+256703456789',
                email: 'transport@gov.ug',
                customerType: 'government',
                address: 'Government Buildings, Kampala'
            }
        ];

        sampleCustomers.forEach(customerData => {
            createCustomer(customerData);
        });

        console.log('Sample data initialized');
    }

    // Public API
    return {
        // System
        initialize: initialize,
        getConfig: () => CONFIG,
        getAnalytics: getAnalytics,
        getNotifications: getNotifications,
        
        // Customers
        createCustomer: createCustomer,
        updateCustomer: updateCustomer,
        searchCustomers: searchCustomers,
        getCustomerById: getCustomerById,
        getCustomerByPhone: getCustomerByPhone,
        getAllCustomers: getAllCustomers,
        
        // Orders
        createOrder: createOrder,
        updateOrderStatus: updateOrderStatus,
        getOrderById: getOrderById,
        getOrdersByCustomer: getOrdersByCustomer,
        getOrdersByStatus: getOrdersByStatus,
        getAllOrders: getAllOrders,
        searchOrders: searchOrders,
        
        // Utilities
        generateId: generateId,
        generateOrderNumber: generateOrderNumber
    };
})();

// Initialize the system when loaded
$(document).ready(function() {
    TrackingSystem.initialize();
});