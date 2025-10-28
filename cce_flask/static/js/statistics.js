// Statistics Page JavaScript

let currentSelectedTestId = null;
let statisticsUpdateInterval = null;
let performanceChart = null;
let currentTestType = 'throughput'; // Default test type

// Initialize page
$(document).ready(function() {
    loadActiveTests();
    initializeChart();
    
    // Auto-refresh every 5 seconds
    setInterval(loadActiveTests, 5000);
});

function loadActiveTests() {
    $.ajax({
        url: '/api/active_tests',
        method: 'GET',
        success: function(response) {
            if (response.status === 'success') {
                displayActiveTests(response.active_tests);
            } else {
                $('#activeTestsContainer').html(`
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Failed to load active tests: ${response.message}
                    </div>
                `);
            }
        },
        error: function() {
            $('#activeTestsContainer').html(`
                <div class="alert alert-danger">
                    <i class="bi bi-x-circle me-2"></i>
                    Error connecting to server
                </div>
            `);
        }
    });
}

function displayActiveTests(tests) {
    const container = $('#activeTestsContainer');
    
    if (tests.length === 0) {
        container.html(`
            <div class="text-center">
                <i class="bi bi-inbox" style="font-size: 3rem; color: #6c757d;"></i>
                <p class="mt-2 text-muted">No active tests found</p>
                <a href="/parameters" class="btn btn-primary">
                    <i class="bi bi-play-fill me-1"></i>Start New Test
                </a>
            </div>
        `);
        $('#statisticsContent').hide();
        return;
    }
    
    let html = '<div class="row">';
    
    tests.forEach(test => {
        const isSelected = test.test_id === currentSelectedTestId;
        const cardClass = isSelected ? 'border-danger' : '';
        const statusClass = getStatusClass(test.status);
        
        html += `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card ${cardClass}" style="cursor: pointer;" onclick="selectTest('${test.test_id}')">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">Test ${test.test_id.substring(0, 8)}</h6>
                            <span class="badge ${statusClass}">${test.status.toUpperCase()}</span>
                        </div>
                        <p class="card-text">
                            <small class="text-muted">
                                Type: ${test.config.test_type || 'Unknown'}<br>
                                Started: ${test.start_time ? new Date(test.start_time).toLocaleTimeString() : 'N/A'}
                            </small>
                        </p>
                        <div class="progress" style="height: 5px;">
                            <div class="progress-bar" style="width: ${test.progress_percentage}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.html(html);
    
    // Auto-select first test if none selected
    if (!currentSelectedTestId && tests.length > 0) {
        selectTest(tests[0].test_id);
    }
}

function selectTest(testId) {
    currentSelectedTestId = testId;
    
    // Update UI to show selected test
    $('.card').removeClass('border-danger');
    $(`[onclick="selectTest('${testId}')"]`).addClass('border-danger');
    
    // Show statistics content
    $('#statisticsContent').show();
    
    // Start monitoring this test
    startStatisticsMonitoring(testId);
    
    showAlert(`Selected test ${testId.substring(0, 8)} for monitoring`, 'info');
}

function startStatisticsMonitoring(testId) {
    // Clear existing interval
    if (statisticsUpdateInterval) {
        clearInterval(statisticsUpdateInterval);
    }
    
    // Update immediately
    updateTestStatistics(testId);
    
    // Set up recurring updates
    statisticsUpdateInterval = setInterval(() => {
        updateTestStatistics(testId);
    }, 2000); // Update every 2 seconds
}

function updateTestStatistics(testId) {
    // Get test status
    $.ajax({
        url: `/api/test_status/${testId}`,
        method: 'GET',
        success: function(response) {
            if (response.status === 'success') {
                updateTestStatusDisplay(response);
            }
        },
        error: function() {
            console.error('Failed to get test status');
        }
    });
    
    // Get current statistics
    $.ajax({
        url: `/api/current_stats/${testId}`,
        method: 'GET',
        success: function(response) {
            if (response.status === 'success') {
                updateStatisticsDisplay(response);
                updateChart(response.chart_data);
            }
        },
        error: function() {
            console.error('Failed to get test statistics');
        }
    });
}

function updateTestStatusDisplay(statusData) {
    $('#currentTestProgress').css('width', statusData.progress_percentage + '%')
                             .text(Math.round(statusData.progress_percentage) + '%');
    
    $('#currentTestStatus').text(statusData.test_status.toUpperCase());
    $('#currentTestElapsed').text(formatDuration(statusData.elapsed_time || 0));
    
    const remaining = statusData.duration - (statusData.elapsed_time || 0);
    $('#currentTestRemaining').text(formatDuration(Math.max(0, remaining)));
    
    // Update test type display and store it globally
    if (statusData.test_type) {
        currentTestType = statusData.test_type.toLowerCase();
        $('#currentTestType').text(statusData.test_type.toUpperCase());
    }
    
    // Enable/disable cancel button
    const canCancel = ['running', 'starting_server', 'starting_client'].includes(statusData.test_status);
    $('#cancelTestBtn').prop('disabled', !canCancel);
    
    // Update status class
    $('#currentTestStatus').removeClass('status-idle status-running status-completed status-error')
                           .addClass(`status-${statusData.test_status}`);
}

function updateStatisticsDisplay(statsData) {
    const currentStats = statsData.current_stats;
    
    if (currentStats && currentStats.status === 'success') {
        // Update server stats
        updateStatsPanel('server', currentStats.server_stats);
        
        // Update client stats  
        updateStatsPanel('client', currentStats.client_stats);
        
        // Update performance metrics based on test type
        updatePerformanceMetrics(statsData);
    } else {
        // Show no data message
        resetStatsDisplay();
        resetPerformanceMetrics();
    }
}

function updateStatsPanel(type, stats) {
    if (!stats) return;
    
    const prefix = type; // 'server' or 'client'
    
    // Update throughput
    if (stats.throughput_mbps) {
        $(`#${prefix}Throughput`).text(stats.throughput_mbps.formatted || '0 Mbps');
    }
    
    // Update bytes transferred
    if (stats.bytes_transferred) {
        $(`#${prefix}Bytes`).text(stats.bytes_transferred.formatted || '0 B');
    }
    
    // Update CPS
    if (stats.connections_per_second) {
        $(`#${prefix}CPS`).text(stats.connections_per_second.formatted || '0');
    }
    
    // Update active connections
    if (stats.active_connections) {
        $(`#${prefix}Connections`).text(stats.active_connections.formatted || '0');
    }
    
    // Update errors
    if (stats.errors) {
        $(`#${prefix}Errors`).text(stats.errors.formatted || '0');
    }
}

function resetStatsDisplay() {
    ['server', 'client'].forEach(type => {
        $(`#${type}Throughput`).text('0 Mbps');
        $(`#${type}Bytes`).text('0 B');
        $(`#${type}CPS`).text('0');
        $(`#${type}Connections`).text('0');
        $(`#${type}Errors`).text('0');
    });
}

function initializeChart() {
    // Use the enhanced chart module
    if (window.ChartModule) {
        window.ChartModule.initializeAllCharts();
    }
}

function updateChart(chartData) {
    if (!chartData) return;
    
    // Use the enhanced chart module for updates
    if (window.ChartModule) {
        const processedData = window.ChartModule.processStatsForCharts(chartData.stats_history || []);
        
        // Update main performance chart
        window.ChartModule.updateEnhancedChart(processedData, getCurrentChartType());
        
        // Update additional charts
        window.ChartModule.updateCPSChart(processedData);
        window.ChartModule.updateErrorChart(processedData);
    }
}

function getStatusClass(status) {
    switch(status) {
        case 'running': return 'bg-success';
        case 'completed': return 'bg-primary';
        case 'error': return 'bg-danger';
        case 'cancelled': return 'bg-warning';
        default: return 'bg-secondary';
    }
}

function cancelCurrentTest() {
    if (!currentSelectedTestId) return;
    
    if (confirm('Are you sure you want to cancel this test?')) {
        $.ajax({
            url: `/api/cancel_test/${currentSelectedTestId}`,
            method: 'POST',
            success: function(response) {
                if (response.status === 'success') {
                    showAlert('Test cancelled successfully', 'warning');
                } else {
                    showAlert(`Failed to cancel test: ${response.message}`, 'danger');
                }
            },
            error: function() {
                showAlert('Error cancelling test', 'danger');
            }
        });
    }
}

function refreshStats() {
    if (currentSelectedTestId) {
        updateTestStatistics(currentSelectedTestId);
        showAlert('Statistics refreshed', 'info');
    } else {
        loadActiveTests();
        showAlert('Active tests refreshed', 'info');
    }
}

function exportData() {
    if (!currentSelectedTestId) {
        showAlert('No test selected for export', 'warning');
        return;
    }
    
    // Get current stats for export
    $.ajax({
        url: `/api/current_stats/${currentSelectedTestId}`,
        method: 'GET',
        success: function(response) {
            if (response.status === 'success') {
                const data = {
                    test_id: currentSelectedTestId,
                    export_time: new Date().toISOString(),
                    current_stats: response.current_stats,
                    stats_history: response.stats_history
                };
                
                // Create and download JSON file
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `test-${currentSelectedTestId.substring(0, 8)}-stats.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                showAlert('Statistics exported successfully', 'success');
            } else {
                showAlert('Failed to export data', 'danger');
            }
        },
        error: function() {
            showAlert('Error exporting data', 'danger');
        }
    });
}

function clearHistory() {
    if (confirm('Are you sure you want to clear the test history?')) {
        // This would typically call an API to clear history
        // For now, just show a message
        showAlert('History clearing not yet implemented', 'info');
    }
}

// Chart control functions
function getCurrentChartType() {
    return $('#chartTypeSelector').val() || 'throughput';
}

function switchChartType() {
    const chartType = getCurrentChartType();
    
    if (currentSelectedTestId) {
        updateTestStatistics(currentSelectedTestId);
    }
    
    showAlert(`Switched to ${chartType} chart view`, 'info');
}

function updateTimeRange() {
    const timeRange = $('#timeRangeSelector').val();
    
    if (currentSelectedTestId) {
        updateTestStatistics(currentSelectedTestId);
    }
    
    showAlert(`Updated time range to ${timeRange}`, 'info');
}

function resetAllChartsZoom() {
    if (window.ChartModule) {
        window.ChartModule.resetAllChartsZoom();
    }
}

function exportAllCharts() {
    if (window.ChartModule) {
        window.ChartModule.exportAllCharts();
    } else {
        showAlert('Chart export not available', 'warning');
    }
}

// Performance Metrics Functions
function updatePerformanceMetrics(statsData) {
    // Determine test type from config or stats
    const testType = getTestType(statsData);
    
    // Show/hide appropriate metrics section
    if (testType === 'cps') {
        $('#throughputMetrics').addClass('hidden');
        $('#cpsMetrics').removeClass('hidden');
        updateCPSMetrics(statsData);
    } else {
        $('#cpsMetrics').addClass('hidden');
        $('#throughputMetrics').removeClass('hidden');
        updateThroughputMetrics(statsData);
    }
}

function getTestType(statsData) {
    // First check if we have test_type directly in statsData
    if (statsData.test_type) {
        return statsData.test_type.toLowerCase();
    }
    
    // Use the globally stored currentTestType
    if (currentTestType) {
        return currentTestType;
    }
    
    // Check if stats contain CPS-specific fields
    const statsHistory = statsData.stats_history || [];
    if (statsHistory.length > 0) {
        const latestStats = statsHistory[statsHistory.length - 1];
        const clientStats = latestStats.client || [];
        const serverStats = latestStats.server || [];
        
        // If we see ConnectionRate or ConnectionsSucceeded, it's a CPS test
        if (clientStats.length > 0 && (clientStats[0].ConnectionRate || clientStats[0].ConnectionsSucceeded)) {
            return 'cps';
        }
        if (serverStats.length > 0 && (serverStats[0].ConnectionRate || serverStats[0].ConnectionsAccepted)) {
            return 'cps';
        }
    }
    
    // Default to throughput
    return 'throughput';
}

function updateThroughputMetrics(statsData) {
    const statsHistory = statsData.stats_history || [];
    
    if (statsHistory.length === 0) {
        resetThroughputMetrics();
        return;
    }
    
    let clientThroughputValues = [];
    let serverThroughputValues = [];
    let clientLatencyValues = [];
    let serverLatencyValues = [];
    
    // Process stats history
    statsHistory.forEach(entry => {
        const clientStats = entry.client || [];
        const serverStats = entry.server || [];
        
        // Process client stats
        clientStats.forEach(stat => {
            // Collect Throughput values (in bps, convert to Mbps)
            if (stat.Throughput !== undefined && stat.Throughput !== null) {
                const throughputMbps = parseFloat(stat.Throughput) / 1000000;
                clientThroughputValues.push(throughputMbps);
            }
            // Collect AverageConnectionLatency values (in microseconds, convert to ms)
            if (stat.AverageConnectionLatency !== undefined && stat.AverageConnectionLatency !== null) {
                clientLatencyValues.push(parseFloat(stat.AverageConnectionLatency) / 1000);
            }
        });
        
        // Process server stats
        serverStats.forEach(stat => {
            // Collect Throughput values (in bps, convert to Mbps)
            if (stat.Throughput !== undefined && stat.Throughput !== null) {
                const throughputMbps = parseFloat(stat.Throughput) / 1000000;
                serverThroughputValues.push(throughputMbps);
            }
            // Collect AverageConnectionLatency values (in microseconds, convert to ms)
            if (stat.AverageConnectionLatency !== undefined && stat.AverageConnectionLatency !== null) {
                serverLatencyValues.push(parseFloat(stat.AverageConnectionLatency) / 1000);
            }
        });
    });
    
    // Calculate average throughput from all Throughput values
    const avgClientThroughput = calculateAverage(clientThroughputValues);
    const avgServerThroughput = calculateAverage(serverThroughputValues);
    
    // Calculate peak throughput (maximum value from all Throughput values)
    const peakClientThroughput = calculateMax(clientThroughputValues);
    const peakServerThroughput = calculateMax(serverThroughputValues);
    
    // For display purposes, show the same value for Rx and Tx
    // (since Throughput represents bidirectional throughput)
    $('#avgClientRx').text(formatThroughput(avgClientThroughput));
    $('#avgClientTx').text(formatThroughput(avgClientThroughput));
    $('#avgServerRx').text(formatThroughput(avgServerThroughput));
    $('#avgServerTx').text(formatThroughput(avgServerThroughput));
    
    $('#peakClientRx').text(formatThroughput(peakClientThroughput));
    $('#peakClientTx').text(formatThroughput(peakClientThroughput));
    $('#peakServerRx').text(formatThroughput(peakServerThroughput));
    $('#peakServerTx').text(formatThroughput(peakServerThroughput));
    
    // Calculate and display average latency
    $('#avgClientLatency').text(formatLatency(calculateAverage(clientLatencyValues)));
    $('#avgServerLatency').text(formatLatency(calculateAverage(serverLatencyValues)));
}

function updateCPSMetrics(statsData) {
    const statsHistory = statsData.stats_history || [];
    
    if (statsHistory.length === 0) {
        resetCPSMetrics();
        return;
    }
    
    let clientConnRates = [];
    let serverConnRates = [];
    let clientLatencyValues = [];
    let serverLatencyValues = [];
    let clientSuccessLast = 0;
    let serverSuccessLast = 0;
    let clientFailedValues = [];
    let serverFailedValues = [];
    
    // Process stats history
    statsHistory.forEach(entry => {
        const clientStats = entry.client || [];
        const serverStats = entry.server || [];
        
        // Process client stats
        clientStats.forEach(stat => {
            // Collect ConnectionRate values for average
            if (stat.ConnectionRate !== undefined && stat.ConnectionRate !== null) {
                clientConnRates.push(parseFloat(stat.ConnectionRate));
            }
            // Get last value of ConnectionsSucceeded
            if (stat.ConnectionsSucceeded !== undefined && stat.ConnectionsSucceeded !== null) {
                clientSuccessLast = parseInt(stat.ConnectionsSucceeded);
            }
            // Collect all ConnectionsFailed values for sum
            if (stat.ConnectionsFailed !== undefined && stat.ConnectionsFailed !== null) {
                clientFailedValues.push(parseInt(stat.ConnectionsFailed));
            }
            // Collect AverageConnectionLatency for highest value
            if (stat.AverageConnectionLatency !== undefined && stat.AverageConnectionLatency !== null) {
                clientLatencyValues.push(parseFloat(stat.AverageConnectionLatency) / 1000); // Convert to ms
            }
        });
        
        // Process server stats
        serverStats.forEach(stat => {
            // Collect ConnectionRate values for average
            if (stat.ConnectionRate !== undefined && stat.ConnectionRate !== null) {
                serverConnRates.push(parseFloat(stat.ConnectionRate));
            }
            // Get last value of ConnectionsAccepted (server equivalent of ConnectionsSucceeded)
            if (stat.ConnectionsAccepted !== undefined && stat.ConnectionsAccepted !== null) {
                serverSuccessLast = parseInt(stat.ConnectionsAccepted);
            }
            // Collect all ConnectionsFailed values for sum
            if (stat.ConnectionsFailed !== undefined && stat.ConnectionsFailed !== null) {
                serverFailedValues.push(parseInt(stat.ConnectionsFailed));
            }
            // Collect AverageConnectionLatency for highest value
            if (stat.AverageConnectionLatency !== undefined && stat.AverageConnectionLatency !== null) {
                serverLatencyValues.push(parseFloat(stat.AverageConnectionLatency) / 1000); // Convert to ms
            }
        });
    });
    
    // Calculate metrics
    // 1. Average Connection Rate
    $('#avgClientConnRate').text(formatConnectionRate(calculateAverage(clientConnRates)));
    $('#avgServerConnRate').text(formatConnectionRate(calculateAverage(serverConnRates)));
    
    // 2. Total Connections Succeeded (last value)
    $('#clientConnSuccess').text(formatNumber(clientSuccessLast));
    $('#serverConnSuccess').text(formatNumber(serverSuccessLast));
    
    // 3. Total Connections Failed (sum of all values)
    const clientFailedSum = clientFailedValues.reduce((a, b) => a + b, 0);
    const serverFailedSum = serverFailedValues.reduce((a, b) => a + b, 0);
    $('#clientConnFailed').text(formatNumber(clientFailedSum));
    $('#serverConnFailed').text(formatNumber(serverFailedSum));
    
    // 4. Highest Connection Latency
    $('#highestClientLatency').text(formatLatency(calculateMax(clientLatencyValues)));
    $('#highestServerLatency').text(formatLatency(calculateMax(serverLatencyValues)));
}

function resetPerformanceMetrics() {
    resetThroughputMetrics();
    resetCPSMetrics();
}

function resetThroughputMetrics() {
    $('#avgClientRx, #avgClientTx, #avgServerRx, #avgServerTx').text('0 Mbps');
    $('#peakClientRx, #peakClientTx, #peakServerRx, #peakServerTx').text('0 Mbps');
    $('#avgClientLatency, #avgServerLatency').text('0 ms');
}

function resetCPSMetrics() {
    $('#avgClientConnRate, #avgServerConnRate').text('0 /s');
    $('#clientConnSuccess, #serverConnSuccess').text('0');
    $('#clientConnFailed, #serverConnFailed').text('0');
    $('#highestClientLatency, #highestServerLatency').text('0 ms');
}

// Helper functions
function calculateAverage(values) {
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
}

function calculateMax(values) {
    if (values.length === 0) return 0;
    return Math.max(...values);
}

function formatThroughput(value) {
    return value.toFixed(2) + ' Mbps';
}

function formatLatency(value) {
    return value.toFixed(2) + ' ms';
}

function formatConnectionRate(value) {
    return value.toFixed(0) + ' /s';
}

function formatNumber(value) {
    return value.toLocaleString();
}

// Clean up on page unload
$(window).on('beforeunload', function() {
    if (statisticsUpdateInterval) {
        clearInterval(statisticsUpdateInterval);
    }
    
    // Clean up charts
    if (window.ChartModule) {
        window.ChartModule.destroyAllCharts();
    }
});
