// Charts Module - Enhanced Chart.js functionality

// Chart instances
let performanceChart = null;
let cpsChart = null;
let errorChart = null;

// Global test data storage
let currentTestData = null;

// Chart configuration
const chartColors = {
    server: '#DC3545',
    client: '#FFC107',
    error: '#6F42C1',
    background: {
        server: 'rgba(220, 53, 69, 0.1)',
        client: 'rgba(255, 193, 7, 0.1)',
        error: 'rgba(111, 66, 193, 0.1)'
    }
};

// Chart options template
const baseChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        title: {
            display: true,
            color: '#000000',
            font: {
                size: 16,
                weight: 'bold'
            }
        },
        legend: {
            labels: {
                color: '#000000',
                usePointStyle: true,
                padding: 20
            }
        },
        tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#DC3545',
            borderWidth: 1
        },
        zoom: {
            zoom: {
                wheel: {
                    enabled: true,
                },
                pinch: {
                    enabled: true
                },
                mode: 'x',
            },
            pan: {
                enabled: true,
                mode: 'x',
            }
        }
    },
    scales: {
        x: {
            title: {
                display: true,
                text: 'Time',
                color: '#000000',
                font: {
                    size: 14,
                    weight: 'bold'
                }
            },
            ticks: {
                color: '#000000',
                maxTicksLimit: 10
            },
            grid: {
                color: 'rgba(0, 0, 0, 0.1)'
            }
        },
        y: {
            title: {
                display: true,
                color: '#000000',
                font: {
                    size: 14,
                    weight: 'bold'
                }
            },
            ticks: {
                color: '#000000'
            },
            grid: {
                color: 'rgba(0, 0, 0, 0.1)'
            },
            beginAtZero: true
        }
    },
    interaction: {
        intersect: false,
        mode: 'index'
    },
    animation: {
        duration: 0 // Disable animation for real-time updates
    }
};

// Initialize enhanced performance chart
function initializeEnhancedChart() {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;
    
    performanceChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Server Throughput (Mbps)',
                    data: [],
                    borderColor: chartColors.server,
                    backgroundColor: chartColors.background.server,
                    tension: 0.4,
                    fill: false,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    borderWidth: 2
                },
                {
                    label: 'Client Throughput (Mbps)',
                    data: [],
                    borderColor: chartColors.client,
                    backgroundColor: chartColors.background.client,
                    tension: 0.4,
                    fill: false,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    borderWidth: 2
                }
            ]
        },
        options: {
            ...baseChartOptions,
            plugins: {
                ...baseChartOptions.plugins,
                title: {
                    ...baseChartOptions.plugins.title,
                    text: 'Real-time Throughput Performance'
                }
            },
            scales: {
                ...baseChartOptions.scales,
                y: {
                    ...baseChartOptions.scales.y,
                    title: {
                        ...baseChartOptions.scales.y.title,
                        text: 'Throughput (Mbps)'
                    }
                }
            }
        }
    });
}

// Initialize CPS chart
function initializeCPSChart() {
    const ctx = document.getElementById('cpsChart');
    if (!ctx) return;
    
    cpsChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Server CPS',
                    data: [],
                    borderColor: chartColors.server,
                    backgroundColor: chartColors.background.server,
                    tension: 0.4,
                    fill: false,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    borderWidth: 2
                },
                {
                    label: 'Client CPS',
                    data: [],
                    borderColor: chartColors.client,
                    backgroundColor: chartColors.background.client,
                    tension: 0.4,
                    fill: false,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    borderWidth: 2
                }
            ]
        },
        options: {
            ...baseChartOptions,
            plugins: {
                ...baseChartOptions.plugins,
                title: {
                    ...baseChartOptions.plugins.title,
                    text: 'Connections Per Second'
                }
            },
            scales: {
                ...baseChartOptions.scales,
                y: {
                    ...baseChartOptions.scales.y,
                    title: {
                        ...baseChartOptions.scales.y.title,
                        text: 'Connections/Second'
                    }
                }
            }
        }
    });
}

// Initialize error chart
function initializeErrorChart() {
    const ctx = document.getElementById('errorChart');
    if (!ctx) return;
    
    errorChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Server Errors',
                    data: [],
                    backgroundColor: chartColors.background.server,
                    borderColor: chartColors.server,
                    borderWidth: 1
                },
                {
                    label: 'Client Errors',
                    data: [],
                    backgroundColor: chartColors.background.client,
                    borderColor: chartColors.client,
                    borderWidth: 1
                }
            ]
        },
        options: {
            ...baseChartOptions,
            plugins: {
                ...baseChartOptions.plugins,
                title: {
                    ...baseChartOptions.plugins.title,
                    text: 'Error Count Over Time'
                }
            },
            scales: {
                ...baseChartOptions.scales,
                y: {
                    ...baseChartOptions.scales.y,
                    title: {
                        ...baseChartOptions.scales.y.title,
                        text: 'Error Count'
                    }
                }
            }
        }
    });
}

// Update chart with new data
function updateEnhancedChart(chartData, testType = 'throughput') {
    if (!chartData || !performanceChart) return;
    
    // Update labels
    performanceChart.data.labels = chartData.labels || [];
    
    // Update datasets based on test type
    if (chartData.datasets && chartData.datasets.length > 0) {
        chartData.datasets.forEach((dataset, index) => {
            if (performanceChart.data.datasets[index]) {
                performanceChart.data.datasets[index].data = dataset.data;
                
                // Update label based on test type
                if (testType === 'cps') {
                    performanceChart.data.datasets[index].label = 
                        index === 0 ? 'Server CPS' : 'Client CPS';
                } else {
                    performanceChart.data.datasets[index].label = 
                        index === 0 ? 'Server Throughput (Mbps)' : 'Client Throughput (Mbps)';
                }
            }
        });
    }
    
    // Update Y-axis title
    if (testType === 'cps') {
        performanceChart.options.scales.y.title.text = 'Connections/Second';
        performanceChart.options.plugins.title.text = 'Real-time CPS Performance';
    } else {
        performanceChart.options.scales.y.title.text = 'Throughput (Mbps)';
        performanceChart.options.plugins.title.text = 'Real-time Throughput Performance';
    }
    
    performanceChart.update('none');
}

// Update CPS chart
function updateCPSChart(chartData) {
    if (!chartData || !cpsChart) return;
    
    cpsChart.data.labels = chartData.labels || [];
    
    if (chartData.cpsDatasets && chartData.cpsDatasets.length > 0) {
        chartData.cpsDatasets.forEach((dataset, index) => {
            if (cpsChart.data.datasets[index]) {
                cpsChart.data.datasets[index].data = dataset.data;
            }
        });
    }
    
    cpsChart.update('none');
}

// Update error chart
function updateErrorChart(chartData) {
    if (!chartData || !errorChart) return;
    
    errorChart.data.labels = chartData.labels || [];
    
    if (chartData.errorDatasets && chartData.errorDatasets.length > 0) {
        chartData.errorDatasets.forEach((dataset, index) => {
            if (errorChart.data.datasets[index]) {
                errorChart.data.datasets[index].data = dataset.data;
            }
        });
    }
    
    errorChart.update('none');
}

// Chart utility functions
function resetChart(chart) {
    if (!chart) return;
    
    chart.data.labels = [];
    chart.data.datasets.forEach(dataset => {
        dataset.data = [];
    });
    chart.update();
}

function resetAllCharts() {
    resetChart(performanceChart);
    resetChart(cpsChart);
    resetChart(errorChart);
}

// Export chart as image
function exportChartAsImage(chart, filename) {
    if (!chart) {
        showAlert('No chart available to export', 'warning');
        return;
    }
    
    const canvas = chart.canvas;
    const url = canvas.toDataURL('image/png');
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'chart.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showAlert('Chart exported successfully', 'success');
}

// Export all charts
function exportAllCharts() {
    const testId = currentSelectedTestId ? currentSelectedTestId.substring(0, 8) : 'unknown';
    const timestamp = new Date().toISOString().slice(0, 10);
    
    if (performanceChart) {
        exportChartAsImage(performanceChart, `${testId}-performance-${timestamp}.png`);
    }
    
    if (cpsChart) {
        exportChartAsImage(cpsChart, `${testId}-cps-${timestamp}.png`);
    }
    
    if (errorChart) {
        exportChartAsImage(errorChart, `${testId}-errors-${timestamp}.png`);
    }
}

// Zoom controls
function resetChartZoom(chart) {
    if (chart && chart.resetZoom) {
        chart.resetZoom();
        showAlert('Chart zoom reset', 'info');
    }
}

function resetAllChartsZoom() {
    resetChartZoom(performanceChart);
    resetChartZoom(cpsChart);
    resetChartZoom(errorChart);
}

// Chart theme switching
function switchChartTheme(isDark = false) {
    const textColor = isDark ? '#ffffff' : '#000000';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    
    const charts = [performanceChart, cpsChart, errorChart];
    
    charts.forEach(chart => {
        if (!chart) return;
        
        // Update text colors
        chart.options.plugins.title.color = textColor;
        chart.options.plugins.legend.labels.color = textColor;
        chart.options.scales.x.title.color = textColor;
        chart.options.scales.x.ticks.color = textColor;
        chart.options.scales.y.title.color = textColor;
        chart.options.scales.y.ticks.color = textColor;
        
        // Update grid colors
        chart.options.scales.x.grid.color = gridColor;
        chart.options.scales.y.grid.color = gridColor;
        
        chart.update();
    });
}

// Advanced data processing for charts
function processStatsForCharts(statsHistory) {
    if (!statsHistory || statsHistory.length === 0) {
        return {
            labels: [],
            datasets: [],
            cpsDatasets: [],
            errorDatasets: []
        };
    }
    
    const labels = [];
    const serverThroughput = [];
    const clientThroughput = [];
    const serverCPS = [];
    const clientCPS = [];
    const serverErrors = [];
    const clientErrors = [];
    
    statsHistory.forEach(entry => {
        // Format timestamp
        if (entry.timestamp) {
            const dt = new Date(entry.timestamp * 1000);
            labels.push(dt.toLocaleTimeString());
        } else {
            labels.push('');
        }
        
        // Extract server data
        const serverStats = entry.server || {};
        serverThroughput.push(serverStats.throughput_mbps || 0);
        serverCPS.push(serverStats.connections_per_second || 0);
        serverErrors.push(serverStats.errors || 0);
        
        // Extract client data
        const clientStats = entry.client || {};
        clientThroughput.push(clientStats.throughput_mbps || 0);
        clientCPS.push(clientStats.connections_per_second || 0);
        clientErrors.push(clientStats.errors || 0);
    });
    
    return {
        labels: labels,
        datasets: [
            {
                label: 'Server Throughput (Mbps)',
                data: serverThroughput,
                borderColor: chartColors.server,
                backgroundColor: chartColors.background.server,
                tension: 0.4
            },
            {
                label: 'Client Throughput (Mbps)',
                data: clientThroughput,
                borderColor: chartColors.client,
                backgroundColor: chartColors.background.client,
                tension: 0.4
            }
        ],
        cpsDatasets: [
            {
                label: 'Server CPS',
                data: serverCPS,
                borderColor: chartColors.server,
                backgroundColor: chartColors.background.server,
                tension: 0.4
            },
            {
                label: 'Client CPS',
                data: clientCPS,
                borderColor: chartColors.client,
                backgroundColor: chartColors.background.client,
                tension: 0.4
            }
        ],
        errorDatasets: [
            {
                label: 'Server Errors',
                data: serverErrors,
                backgroundColor: chartColors.background.server,
                borderColor: chartColors.server
            },
            {
                label: 'Client Errors',
                data: clientErrors,
                backgroundColor: chartColors.background.client,
                borderColor: chartColors.client
            }
        ]
    };
}

// Initialize all charts
function initializeAllCharts() {
    initializeEnhancedChart();
    initializeCPSChart();
    initializeErrorChart();
}

// Cleanup charts
function destroyAllCharts() {
    if (performanceChart) {
        performanceChart.destroy();
        performanceChart = null;
    }
    if (cpsChart) {
        cpsChart.destroy();
        cpsChart = null;
    }
    if (errorChart) {
        errorChart.destroy();
        errorChart = null;
    }
}

// Function to update charts with test data from parameters page
function updateChartsWithTestData(testResults) {
    console.log('Updating charts with test data:', testResults);
    
    // Store the test data globally
    currentTestData = testResults;
    
    // Check if we have valid stats
    if (!testResults.final_stats || 
        (!testResults.final_stats.server_stats && !testResults.final_stats.client_stats)) {
        console.log('No valid stats data for charts');
        return;
    }
    
    // Extract server and client data
    const serverData = testResults.final_stats.server_stats?.raw_data || [];
    const clientData = testResults.final_stats.client_stats?.raw_data || [];
    
    // Determine test type based on available data
    const testType = determineTestType(serverData, clientData);
    
    // Update charts based on test type
    if (testType === 'throughput') {
        updateThroughputChart(serverData, clientData);
    } else if (testType === 'cps') {
        updateCPSChartWithData(serverData, clientData);
    }
}

// Determine test type from data
function determineTestType(serverData, clientData) {
    // Check if we have CPS-related fields
    const hasCPSData = serverData.some(data => 
        data.hasOwnProperty('ConnectionRate') || 
        data.hasOwnProperty('ConnectionsSucceeded') ||
        data.hasOwnProperty('ConnectionsPerSecond')
    ) || clientData.some(data => 
        data.hasOwnProperty('ConnectionRate') || 
        data.hasOwnProperty('ConnectionsSucceeded') ||
        data.hasOwnProperty('ConnectionsPerSecond')
    );
    
    return hasCPSData ? 'cps' : 'throughput';
}

// Update throughput chart
function updateThroughputChart(serverData, clientData) {
    console.log('Updating throughput chart');
    
    // Prepare data for Chart.js
    const labels = [];
    const serverThroughput = [];
    const clientThroughput = [];
    
    // Process server data
    serverData.forEach((data, index) => {
        const timestamp = new Date(parseInt(data.Timestamp) * 1000);
        labels.push(timestamp.toLocaleTimeString());
        serverThroughput.push(parseInt(data.Throughput || 0) / 1000000); // Convert to Mbps
    });
    
    // Process client data
    clientData.forEach((data, index) => {
        if (index < labels.length) { // Ensure we don't exceed labels
            clientThroughput.push(parseInt(data.Throughput || 0) / 1000000); // Convert to Mbps
        }
    });
    
    // Update or create the chart
    const ctx = document.getElementById('performanceChart');
    if (ctx) {
        if (performanceChart) {
            performanceChart.destroy();
        }
        
        performanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Server Throughput (Mbps)',
                        data: serverThroughput,
                        borderColor: chartColors.server,
                        backgroundColor: chartColors.background.server,
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: 'Client Throughput (Mbps)',
                        data: clientThroughput,
                        borderColor: chartColors.client,
                        backgroundColor: chartColors.background.client,
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1
                    }
                ]
            },
            options: {
                ...baseChartOptions,
                plugins: {
                    ...baseChartOptions.plugins,
                    title: {
                        ...baseChartOptions.plugins.title,
                        text: 'Throughput Over Time'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Throughput (Mbps)',
                            color: '#ffffff'
                        },
                        ticks: {
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time',
                            color: '#ffffff'
                        },
                        ticks: {
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    }
}

// Update CPS chart with new data
function updateCPSChartWithData(serverData, clientData) {
    console.log('Updating CPS chart');
    
    // Prepare data for Chart.js
    const labels = [];
    const serverCPS = [];
    const clientCPS = [];
    
    // Process server data
    serverData.forEach((data, index) => {
        const timestamp = new Date(parseInt(data.Timestamp) * 1000);
        labels.push(timestamp.toLocaleTimeString());
        // Use ConnectionRate or calculate from ConnectionsSucceeded
        const cps = parseInt(data.ConnectionRate || data.ConnectionsSucceeded || 0);
        serverCPS.push(cps);
    });
    
    // Process client data
    clientData.forEach((data, index) => {
        if (index < labels.length) { // Ensure we don't exceed labels
            const cps = parseInt(data.ConnectionRate || data.ConnectionsSucceeded || 0);
            clientCPS.push(cps);
        }
    });
    
    // Update or create the CPS chart
    const ctx = document.getElementById('cpsChart');
    if (ctx) {
        if (cpsChart) {
            cpsChart.destroy();
        }
        
        cpsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Server CPS',
                        data: serverCPS,
                        borderColor: chartColors.server,
                        backgroundColor: chartColors.background.server,
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: 'Client CPS',
                        data: clientCPS,
                        borderColor: chartColors.client,
                        backgroundColor: chartColors.background.client,
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1
                    }
                ]
            },
            options: {
                ...baseChartOptions,
                plugins: {
                    ...baseChartOptions.plugins,
                    title: {
                        ...baseChartOptions.plugins.title,
                        text: 'Connections Per Second Over Time'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Connections Per Second',
                            color: '#ffffff'
                        },
                        ticks: {
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time',
                            color: '#ffffff'
                        },
                        ticks: {
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    }
}

// Export module functions
window.ChartModule = {
    initializeAllCharts,
    initializeEnhancedChart,
    updateEnhancedChart,
    updateCPSChart,
    updateErrorChart,
    resetAllCharts,
    exportAllCharts,
    exportChartAsImage,
    resetAllChartsZoom,
    switchChartTheme,
    processStatsForCharts,
    destroyAllCharts
};

// Make the update function globally available
window.updateChartsWithTestData = updateChartsWithTestData;
