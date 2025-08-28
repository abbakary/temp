/**
 * Tracking System Dashboard
 * Handles all dashboard functionality including charts, statistics, and real-time updates
 */

var TrackingDashboard = (function() {
    'use strict';

    // Private variables
    let charts = {};
    let updateInterval;
    let realtimeData = {
        totalCustomers: 0,
        activeOrders: 0,
        completedToday: 0,
        inProgress: 0
    };

    // Sample data for demonstration
    const sampleData = {
        customers: [
            { id: 1, name: 'John Doe', phone: '+256701234567', email: 'john@email.com', type: 'personal' },
            { id: 2, name: 'Jane Smith', phone: '+256709876543', email: 'jane@email.com', type: 'business' },
            { id: 3, name: 'Bob Wilson', phone: '+256705555555', email: 'bob@email.com', type: 'personal' }
        ],
        orders: [
            {
                id: 'ORD-001',
                customerId: 1,
                customerName: 'John Doe',
                service: 'Tire Sales',
                status: 'in-progress',
                arrivalTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                estimatedDuration: '2hr'
            },
            {
                id: 'ORD-002',
                customerId: 2,
                customerName: 'Jane Smith',
                service: 'Car Service',
                status: 'completed',
                arrivalTime: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
                departureTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
                estimatedDuration: '3hr'
            }
        ]
    };

    // Initialize dashboard
    function init() {
        console.log('Initializing Tracking Dashboard...');
        
        initializeData();
        updateStatistics();
        
        // Initialize charts with delay to ensure ApexCharts is loaded
        setTimeout(function() {
            if (typeof ApexCharts !== 'undefined') {
                initializeCharts();
            } else {
                loadApexCharts();
            }
        }, 1000);
        
        loadRecentActivities();
        startRealTimeUpdates();
        bindEvents();
    }

    // Load ApexCharts if not available
    function loadApexCharts() {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/apexcharts@latest';
        script.onload = function() {
            console.log('ApexCharts loaded successfully');
            initializeCharts();
        };
        script.onerror = function() {
            console.error('Failed to load ApexCharts');
        };
        document.head.appendChild(script);
    }

    // Initialize sample data in localStorage if not exists
    function initializeData() {
        if (!localStorage.getItem('trackingSystem_customers')) {
            localStorage.setItem('trackingSystem_customers', JSON.stringify(sampleData.customers));
        }
        if (!localStorage.getItem('trackingSystem_orders')) {
            localStorage.setItem('trackingSystem_orders', JSON.stringify(sampleData.orders));
        }
    }

    // Update statistics cards
    function updateStatistics() {
        const customers = JSON.parse(localStorage.getItem('trackingSystem_customers') || '[]');
        const orders = JSON.parse(localStorage.getItem('trackingSystem_orders') || '[]');
        
        const today = new Date().toDateString();
        const activeOrders = orders.filter(order => 
            ['pending', 'in-progress', 'service-complete', 'ready-for-departure'].includes(order.status)
        );
        const completedToday = orders.filter(order => 
            order.status === 'completed' && 
            order.departureTime && 
            new Date(order.departureTime).toDateString() === today
        );

        realtimeData = {
            totalCustomers: customers.length,
            activeOrders: activeOrders.length,
            completedToday: completedToday.length,
            inProgress: orders.filter(order => order.status === 'in-progress').length
        };

        // Update DOM
        updateCounter('#totalCustomers', realtimeData.totalCustomers);
        updateCounter('#activeOrders', realtimeData.activeOrders);
        updateCounter('#completedToday', realtimeData.completedToday);
        updateCounter('#inProgress', realtimeData.inProgress);
    }

    // Update counter with animation
    function updateCounter(selector, value) {
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = value;
        }
    }

    // Initialize all charts
    function initializeCharts() {
        if (typeof ApexCharts === 'undefined') {
            console.error('ApexCharts is not available');
            return;
        }
        
        try {
            initDailyOrdersChart();
            initOrderStatusChart();
            initServiceTypesChart();
            initAverageDurationChart();
            console.log('All charts initialized successfully');
        } catch (error) {
            console.error('Error initializing charts:', error);
        }
    }

    // Daily Orders Overview Chart
    function initDailyOrdersChart() {
        const element = document.querySelector('#dailyOrdersChart');
        if (!element) return;

        const orders = JSON.parse(localStorage.getItem('trackingSystem_orders') || '[]');
        const last7Days = getLast7Days();
        const dailyData = last7Days.map(date => {
            const dayOrders = orders.filter(order => 
                new Date(order.arrivalTime).toDateString() === date.toDateString()
            );
            return dayOrders.length;
        });

        const options = {
            series: [{
                name: 'Orders',
                data: dailyData
            }],
            chart: {
                type: 'area',
                height: 350,
                toolbar: {
                    show: false
                }
            },
            colors: ['#007bff'],
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.7,
                    opacityTo: 0.9,
                    stops: [0, 90, 100]
                }
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                curve: 'smooth',
                width: 2
            },
            xaxis: {
                categories: last7Days.map(date => date.toLocaleDateString('en-US', { weekday: 'short' }))
            },
            yaxis: {
                min: 0
            },
            tooltip: {
                y: {
                    formatter: function(val) {
                        return val + ' orders';
                    }
                }
            }
        };

        charts.dailyOrders = new ApexCharts(element, options);
        charts.dailyOrders.render();
    }

    // Order Status Distribution Chart
    function initOrderStatusChart() {
        const element = document.querySelector('#orderStatusChart');
        if (!element) return;

        const orders = JSON.parse(localStorage.getItem('trackingSystem_orders') || '[]');
        const statusCounts = {
            pending: 0,
            'in-progress': 0,
            'service-complete': 0,
            'ready-for-departure': 0,
            completed: 0,
            cancelled: 0
        };

        orders.forEach(order => {
            if (statusCounts.hasOwnProperty(order.status)) {
                statusCounts[order.status]++;
            }
        });

        const options = {
            series: Object.values(statusCounts),
            chart: {
                type: 'donut',
                height: 350
            },
            labels: ['Pending', 'In Progress', 'Service Complete', 'Ready for Departure', 'Completed', 'Cancelled'],
            colors: ['#ffc107', '#17a2b8', '#fd7e14', '#20c997', '#28a745', '#dc3545'],
            legend: {
                position: 'bottom'
            },
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: {
                        width: 200
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }]
        };

        charts.orderStatus = new ApexCharts(element, options);
        charts.orderStatus.render();
    }

    // Service Types Performance Chart
    function initServiceTypesChart() {
        const element = document.querySelector('#serviceTypesChart');
        if (!element) return;

        const orders = JSON.parse(localStorage.getItem('trackingSystem_orders') || '[]');
        const serviceTypes = {
            'Tire Sales': 0,
            'Car Service': 0,
            'General Inquiry': 0
        };

        orders.forEach(order => {
            const service = order.service || 'General Inquiry';
            if (serviceTypes.hasOwnProperty(service)) {
                serviceTypes[service]++;
            }
        });

        const options = {
            series: [{
                data: Object.entries(serviceTypes).map(([service, count]) => ({
                    x: service,
                    y: count
                }))
            }],
            chart: {
                type: 'bar',
                height: 350,
                toolbar: {
                    show: false
                }
            },
            colors: ['#007bff', '#28a745', '#ffc107'],
            plotOptions: {
                bar: {
                    horizontal: true,
                    distributed: true
                }
            },
            dataLabels: {
                enabled: false
            },
            legend: {
                show: false
            }
        };

        charts.serviceTypes = new ApexCharts(element, options);
        charts.serviceTypes.render();
    }

    // Average Service Duration Chart
    function initAverageDurationChart() {
        const element = document.querySelector('#averageDurationChart');
        if (!element) return;

        const orders = JSON.parse(localStorage.getItem('trackingSystem_orders') || '[]');
        const completedOrders = orders.filter(order => order.status === 'completed' && order.departureTime);
        
        const durationData = completedOrders.map(order => {
            const arrival = new Date(order.arrivalTime);
            const departure = new Date(order.departureTime);
            const duration = (departure - arrival) / (1000 * 60 * 60); // hours
            return {
                service: order.service,
                duration: Math.round(duration * 10) / 10
            };
        });

        const avgByService = {};
        durationData.forEach(item => {
            if (!avgByService[item.service]) {
                avgByService[item.service] = { total: 0, count: 0 };
            }
            avgByService[item.service].total += item.duration;
            avgByService[item.service].count++;
        });

        const chartData = Object.entries(avgByService).map(([service, data]) => ({
            x: service,
            y: Math.round((data.total / data.count) * 10) / 10
        }));

        // Add default data if no completed orders
        if (chartData.length === 0) {
            chartData.push(
                { x: 'Tire Sales', y: 1.5 },
                { x: 'Car Service', y: 2.5 },
                { x: 'General Inquiry', y: 0.5 }
            );
        }

        const options = {
            series: [{
                name: 'Average Duration (hours)',
                data: chartData
            }],
            chart: {
                type: 'column',
                height: 350,
                toolbar: {
                    show: false
                }
            },
            colors: ['#28a745'],
            dataLabels: {
                enabled: true,
                formatter: function(val) {
                    return val + 'h';
                }
            },
            xaxis: {
                type: 'category'
            },
            yaxis: {
                title: {
                    text: 'Hours'
                }
            }
        };

        charts.averageDuration = new ApexCharts(element, options);
        charts.averageDuration.render();
    }

    // Get last 7 days
    function getLast7Days() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date);
        }
        return days;
    }

    // Load recent activities
    function loadRecentActivities() {
        const orders = JSON.parse(localStorage.getItem('trackingSystem_orders') || '[]');
        const customers = JSON.parse(localStorage.getItem('trackingSystem_customers') || '[]');
        
        // Recent arrivals
        const today = new Date().toDateString();
        const recentArrivals = orders
            .filter(order => new Date(order.arrivalTime).toDateString() === today)
            .sort((a, b) => new Date(b.arrivalTime) - new Date(a.arrivalTime))
            .slice(0, 5);

        const arrivalsElement = document.querySelector('#recentArrivals');
        if (arrivalsElement) {
            const arrivalsHtml = recentArrivals.map(order => {
                const customer = customers.find(c => c.id == order.customerId);
                const timeAgo = getTimeAgo(new Date(order.arrivalTime));
                return `
                    <div class="timeline-item">
                        <h6>${customer ? customer.name : order.customerName}</h6>
                        <p class="text-muted mb-1">${order.service}</p>
                        <small class="text-info">${timeAgo}</small>
                    </div>
                `;
            }).join('');
            
            arrivalsElement.innerHTML = arrivalsHtml || '<p class="text-muted">No recent arrivals today</p>';
        }

        // Pending departures
        const pendingDepartures = orders
            .filter(order => ['service-complete', 'ready-for-departure'].includes(order.status))
            .sort((a, b) => new Date(a.arrivalTime) - new Date(b.arrivalTime))
            .slice(0, 5);

        const departuresElement = document.querySelector('#pendingDepartures');
        if (departuresElement) {
            const departuresHtml = pendingDepartures.map(order => {
                const customer = customers.find(c => c.id == order.customerId);
                const waitTime = getWaitTime(new Date(order.arrivalTime));
                return `
                    <div class="timeline-item">
                        <h6>${customer ? customer.name : order.customerName}</h6>
                        <p class="text-muted mb-1">${order.service}</p>
                        <small class="text-warning">Waiting: ${waitTime}</small>
                    </div>
                `;
            }).join('');
            
            departuresElement.innerHTML = departuresHtml || '<p class="text-muted">No pending departures</p>';
        }
    }

    // Helper functions
    function getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return Math.floor(diffInSeconds / 60) + ' minutes ago';
        if (diffInSeconds < 86400) return Math.floor(diffInSeconds / 3600) + ' hours ago';
        return Math.floor(diffInSeconds / 86400) + ' days ago';
    }

    function getWaitTime(arrivalTime) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - arrivalTime) / 1000);
        
        if (diffInSeconds < 3600) return Math.floor(diffInSeconds / 60) + ' minutes';
        return Math.floor(diffInSeconds / 3600) + ' hours ' + Math.floor((diffInSeconds % 3600) / 60) + ' minutes';
    }

    function startRealTimeUpdates() {
        updateInterval = setInterval(() => {
            updateStatistics();
            loadRecentActivities();
            updateNotifications();
        }, 30000); // Update every 30 seconds
    }

    function updateNotifications() {
        // Implementation for notifications
    }

    function bindEvents() {
        // Event bindings
    }

    function cleanup() {
        if (updateInterval) {
            clearInterval(updateInterval);
        }
        Object.values(charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
    }

    // Public API
    return {
        init: init,
        cleanup: cleanup,
        updateStatistics: updateStatistics
    };
})();