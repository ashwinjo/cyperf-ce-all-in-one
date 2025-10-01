// Statistics Page JavaScript

let currentSelectedTestId = null;
let statisticsUpdateInterval = null;
let performanceChart = null;

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
    } else {
        // Show no data message
        resetStatsDisplay();
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
