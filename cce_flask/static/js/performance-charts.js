// Chart instances
let clientThroughputChart = null;
let serverThroughputChart = null;
let clientConnectionsChart = null;
let clientFailuresChart = null;
let serverConnectionsChart = null;

// Chart colors
const colors = {
    client: {
        primary: '#FFC107',
        secondary: 'rgba(255, 193, 7, 0.1)'
    },
    server: {
        primary: '#DC3545',
        secondary: 'rgba(220, 53, 69, 0.1)'
    },
    success: {
        primary: '#10B981',
        secondary: 'rgba(16, 185, 129, 0.1)'
    },
    error: {
        primary: '#EF4444',
        secondary: 'rgba(239, 68, 68, 0.1)'
    }
};

// Common chart options
const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
        legend: {
            display: true,
            position: 'top',
            align: 'center',
            labels: {
                color: '#ffffff',
                font: { 
                    size: 14,
                    weight: 'bold'
                },
                padding: 20,
                usePointStyle: true,
                pointStyle: 'circle'
            }
        },
        tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(17, 24, 39, 0.9)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
            padding: 12,
            bodyFont: {
                size: 12
            },
            titleFont: {
                size: 14,
                weight: 'bold'
            },
            callbacks: {
                label: function(context) {
                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    if (context.parsed.y !== null) {
                        label += context.parsed.y.toFixed(2) + ' Mbps';
                    }
                    return label;
                }
            }
        }
    },
    interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
    },
    scales: {
        x: {
            grid: {
                color: 'rgba(255, 255, 255, 0.1)',
                drawBorder: false
            },
            ticks: {
                color: '#ffffff',
                font: {
                    size: 12
                },
                maxRotation: 0
            },
            title: {
                display: true,
                text: 'Time',
                color: '#ffffff',
                font: {
                    size: 14,
                    weight: 'bold'
                },
                padding: {
                    top: 10
                }
            }
        },
        y: {
            beginAtZero: true,
            grid: {
                color: 'rgba(255, 255, 255, 0.1)',
                drawBorder: false
            },
            ticks: {
                color: '#ffffff',
                font: {
                    size: 12
                },
                callback: function(value) {
                    return value.toFixed(0) + ' Mbps';
                }
            },
            title: {
                display: true,
                text: 'Throughput (Mbps)',
                color: '#ffffff',
                font: {
                    size: 14,
                    weight: 'bold'
                },
                padding: {
                    bottom: 10
                }
            }
        }
    }
};

// Initialize charts
function initCharts() {
    const throughputOptions = {
        ...commonOptions,
        plugins: {
            ...commonOptions.plugins,
            title: {
                display: true,
                color: '#ffffff',
                font: { size: 14 }
            }
        },
        scales: {
            ...commonOptions.scales,
            y: {
                ...commonOptions.scales.y,
                title: {
                    display: true,
                    text: 'Throughput (Mbps)',
                    color: '#ffffff'
                }
            }
        }
    };

    const cpsOptions = {
        ...commonOptions,
        plugins: {
            ...commonOptions.plugins,
            tooltip: {
                ...commonOptions.plugins.tooltip,
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += context.parsed.y.toFixed(0); // No decimals for connection counts
                        }
                        return label;
                    }
                }
            },
            title: {
                display: true,
                color: '#ffffff',
                font: { size: 14 }
            }
        },
        scales: {
            ...commonOptions.scales,
            y: {
                ...commonOptions.scales.y,
                title: {
                    display: true,
                    text: 'Connections',
                    color: '#ffffff'
                },
                ticks: {
                    color: '#ffffff',
                    font: {
                        size: 12
                    },
                    callback: function(value) {
                        return value.toFixed(0); // No decimals or Mbps label for connection counts
                    }
                }
            }
        }
    };

    // Initialize throughput charts
    const clientThroughputCtx = document.getElementById('clientThroughputChart');
    if (clientThroughputCtx) {
        clientThroughputChart = new Chart(clientThroughputCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Client Throughput',
                    data: [],
                    borderColor: colors.client.primary,
                    backgroundColor: colors.client.secondary,
                    fill: true
                }]
            },
            options: {
                ...throughputOptions,
                plugins: {
                    ...throughputOptions.plugins,
                    title: {
                        ...throughputOptions.plugins.title,
                        text: 'Client Throughput'
                    }
                }
            }
        });
    }

    const serverThroughputCtx = document.getElementById('serverThroughputChart');
    if (serverThroughputCtx) {
        serverThroughputChart = new Chart(serverThroughputCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Server Throughput',
                    data: [],
                    borderColor: colors.server.primary,
                    backgroundColor: colors.server.secondary,
                    fill: true
                }]
            },
            options: {
                ...throughputOptions,
                plugins: {
                    ...throughputOptions.plugins,
                    title: {
                        ...throughputOptions.plugins.title,
                        text: 'Server Throughput'
                    }
                }
            }
        });
    }

    // Initialize CPS charts
    const clientConnectionsCtx = document.getElementById('clientConnectionsChart');
    if (clientConnectionsCtx) {
        clientConnectionsChart = new Chart(clientConnectionsCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Connections Succeeded',
                    data: [],
                    borderColor: colors.success.primary,
                    backgroundColor: colors.success.secondary,
                    fill: true
                }]
            },
            options: {
                ...cpsOptions,
                plugins: {
                    ...cpsOptions.plugins,
                    title: {
                        ...cpsOptions.plugins.title,
                        text: 'Client Connections Succeeded'
                    }
                }
            }
        });
    }

    const clientFailuresCtx = document.getElementById('clientFailuresChart');
    if (clientFailuresCtx) {
        clientFailuresChart = new Chart(clientFailuresCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Connections Failed',
                    data: [],
                    borderColor: colors.error.primary,
                    backgroundColor: colors.error.secondary,
                    fill: true
                }]
            },
            options: {
                ...cpsOptions,
                plugins: {
                    ...cpsOptions.plugins,
                    title: {
                        ...cpsOptions.plugins.title,
                        text: 'Client Connection Failures'
                    }
                }
            }
        });
    }

    const serverConnectionsCtx = document.getElementById('serverConnectionsChart');
    if (serverConnectionsCtx) {
        serverConnectionsChart = new Chart(serverConnectionsCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Connections Accepted',
                    data: [],
                    borderColor: colors.server.primary,
                    backgroundColor: colors.server.secondary,
                    fill: true
                }]
            },
            options: {
                ...cpsOptions,
                plugins: {
                    ...cpsOptions.plugins,
                    title: {
                        ...cpsOptions.plugins.title,
                        text: 'Server Connections Accepted'
                    }
                }
            }
        });
    }
}

// Update charts with new data
function updateCharts({ serverData, clientData, isConnectionTest }) {
    // Show/hide appropriate containers
    $('#throughputChartsContainer').toggleClass('hidden', isConnectionTest);
    $('#cpsChartsContainer').toggleClass('hidden', !isConnectionTest);

    if (isConnectionTest) {
        updateCPSCharts(serverData, clientData);
    } else {
        updateThroughputCharts(serverData, clientData);
    }
}

// Update throughput charts
function updateThroughputCharts(serverData, clientData) {
    const timestamps = serverData.map(stat => {
        const date = new Date(parseInt(stat.Timestamp) * 1000);
        return date.toLocaleTimeString();
    });

    // Update client chart
    if (clientThroughputChart) {
        clientThroughputChart.data.labels = timestamps;
        clientThroughputChart.data.datasets[0].data = clientData.map(stat => 
            (parseInt(stat.Throughput) / 1000000).toFixed(2)
        );
        clientThroughputChart.update();
    }

    // Update server chart
    if (serverThroughputChart) {
        serverThroughputChart.data.labels = timestamps;
        serverThroughputChart.data.datasets[0].data = serverData.map(stat => 
            (parseInt(stat.Throughput) / 1000000).toFixed(2)
        );
        serverThroughputChart.update();
    }
}

// Update CPS charts
function updateCPSCharts(serverData, clientData) {
    const timestamps = serverData.map(stat => {
        const date = new Date(parseInt(stat.Timestamp) * 1000);
        return date.toLocaleTimeString();
    });

    // Update client connections chart
    if (clientConnectionsChart) {
        clientConnectionsChart.data.labels = timestamps;
        clientConnectionsChart.data.datasets[0].data = clientData.map(stat => 
            parseInt(stat.ConnectionsSucceeded || 0)
        );
        clientConnectionsChart.update();
    }

    // Update client failures chart
    if (clientFailuresChart) {
        clientFailuresChart.data.labels = timestamps;
        clientFailuresChart.data.datasets[0].data = clientData.map(stat => 
            parseInt(stat.ConnectionsFailed || 0)
        );
        clientFailuresChart.update();
    }

    // Update server connections chart
    if (serverConnectionsChart) {
        serverConnectionsChart.data.labels = timestamps;
        serverConnectionsChart.data.datasets[0].data = serverData.map(stat => 
            parseInt(stat.ConnectionsAccepted || 0)
        );
        serverConnectionsChart.update();
    }
}

// Clear all charts
function clearCharts() {
    [
        clientThroughputChart,
        serverThroughputChart,
        clientConnectionsChart,
        clientFailuresChart,
        serverConnectionsChart
    ].forEach(chart => {
        if (chart) {
            chart.data.labels = [];
            chart.data.datasets[0].data = [];
            chart.update();
        }
    });
}

// Test function to verify charts
function testCharts() {
    // Generate sample timestamps
    const now = Date.now();
    const timestamps = Array.from({length: 10}, (_, i) => new Date(now - (9-i) * 1000).toLocaleTimeString());
    
    // Test Throughput Charts
    const throughputData = {
        serverData: timestamps.map((time, i) => ({
            Timestamp: Math.floor(now/1000) - (9-i),
            Throughput: (Math.sin(i/3) * 500 + 1000).toString() // 500-1500 Mbps range
        })),
        clientData: timestamps.map((time, i) => ({
            Timestamp: Math.floor(now/1000) - (9-i),
            Throughput: (Math.cos(i/3) * 500 + 1000).toString() // 500-1500 Mbps range
        })),
        isConnectionTest: false
    };

    // Show throughput charts
    updateCharts(throughputData);
    
    // After 3 seconds, switch to CPS charts
    setTimeout(() => {
        const cpsData = {
            serverData: timestamps.map((time, i) => ({
                Timestamp: Math.floor(now/1000) - (9-i),
                ConnectionRate: '10',
                ConnectionsAccepted: ((i + 1) * 10).toString(),
                ConnectionsSucceeded: '0',
                ConnectionsFailed: '0'
            })),
            clientData: timestamps.map((time, i) => ({
                Timestamp: Math.floor(now/1000) - (9-i),
                ConnectionRate: '10',
                ConnectionsSucceeded: ((i + 1) * 8).toString(),
                ConnectionsFailed: ((i + 1) * 2).toString(),
                ConnectionsAccepted: '0'
            })),
            isConnectionTest: true
        };

        // Show CPS charts
        updateCharts(cpsData);
        
        // After 3 more seconds, switch back to throughput
        setTimeout(() => {
            updateCharts(throughputData);
        }, 3000);
    }, 3000);
}

// Initialize charts when page loads
document.addEventListener('DOMContentLoaded', function() {
    initCharts();
    
    // Make functions globally available
    window.updateCharts = updateCharts;
    window.testCharts = testCharts;
});