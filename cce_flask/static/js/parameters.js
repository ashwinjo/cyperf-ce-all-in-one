// Parameters Page JavaScript


// Initialize page
$(document).ready(function() {
    updateConfigSummary();
    updateTestSpecificFields();
    
    // Add event listeners for real-time summary updates
    $('#testConfigForm input, #testConfigForm select').on('input change', function() {
        updateConfigSummary();
    });
    
    // Check backend status on page load
    checkBackendStatus();
    
    // Auto-refresh backend status every 30 seconds
    setInterval(checkBackendStatus, 30000);
});

// Alert function for Tailwind
function showAlert(message, type = 'info') {
    const typeClasses = {
        'success': 'alert-success',
        'error': 'alert-error',
        'danger': 'alert-error', // Map Bootstrap's danger to error
        'warning': 'alert-warning',
        'info': 'alert-info'
    };
    
    const alertHtml = `
        <div class="alert ${typeClasses[type] || typeClasses['info']} flex items-center justify-between fade-in">
            <div class="flex-1">${message}</div>
            <button type="button" class="ml-4 text-gray-400 hover:text-white" onclick="this.parentElement.remove()">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
            </button>
        </div>
    `;
    
    // Insert into alert container
    $('#alertContainer').append(alertHtml);
    
    // Auto-dismiss after 5 seconds
    setTimeout(function() {
        $('#alertContainer .alert').first().fadeOut(function() {
            $(this).remove();
        });
    }, 5000);
}

function updateTestSpecificFields() {
    const testType = $('#testType').val();
    
    if (testType === 'throughput') {
        $('#throughputParams').removeClass('hidden');
        $('#cpsParams').addClass('hidden');
        
        // Make throughput fields required
        $('#bandwidth, #packetSize').prop('required', true);
        $('#connectionsPerSecond, #concurrentConnections').prop('required', false);
    } else if (testType === 'cps') {
        $('#throughputParams').addClass('hidden');
        $('#cpsParams').removeClass('hidden');
        
        // Make CPS fields required
        $('#bandwidth, #packetSize').prop('required', false);
        $('#connectionsPerSecond, #concurrentConnections').prop('required', true);
    }
    
    updateConfigSummary();
}

function updateConfigSummary() {
    // Update basic info
    const testType = $('#testType').val();
    const duration = $('#testDuration').val();
    const serverIP = $('#serverIP').val();
    const clientIP = $('#clientIP').val();
    const direction = $('#direction').val();
    
    $('#summaryTestType').text(testType === 'throughput' ? 'Throughput' : 'CPS');
    $('#summaryDuration').text(`${duration} seconds`);
    $('#summaryEndpoints').text(`${serverIP} → ${clientIP}`);
    $('#summaryDirection').text(direction.charAt(0).toUpperCase() + direction.slice(1));
    
    // Update test-specific summary
    if (testType === 'throughput') {
        const bandwidth = $('#bandwidth').val();
        $('#summaryBandwidth').closest('tr').removeClass('hidden');
        $('#summaryBandwidth').text(`${bandwidth} Mbps`);
        $('#summaryCPS').closest('tr').addClass('hidden');
    } else if (testType === 'cps') {
        const cps = $('#connectionsPerSecond').val();
        $('#summaryBandwidth').closest('tr').addClass('hidden');
        $('#summaryCPS').closest('tr').removeClass('hidden');
        $('#summaryCPS').text(`${cps} conn/s`);
    }
}



function validateConfig() {
    const formData = new FormData($('#testConfigForm')[0]);
    const config = Object.fromEntries(formData.entries());
    
    // Client-side validation
    const validation = validateConfigClient(config);
    
    if (!validation.valid) {
        let errorMsg = 'Configuration validation failed:\n';
        validation.errors.forEach(error => {
            errorMsg += `• ${error}\n`;
        });
        showAlert(errorMsg, 'danger');
        return false;
    }
    
    if (validation.warnings.length > 0) {
        let warningMsg = 'Configuration warnings:\n';
        validation.warnings.forEach(warning => {
            warningMsg += `• ${warning}\n`;
        });
        showAlert(warningMsg, 'warning');
    }
    
    showAlert('Configuration is valid!', 'success');
    return true;
}

function validateConfigClient(config) {
    const errors = [];
    const warnings = [];
    
    // Validate IP addresses
    const ipPattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipPattern.test(config.server_ip)) {
        errors.push('Invalid server IP address format');
    }
    if (!ipPattern.test(config.client_ip)) {
        errors.push('Invalid client IP address format');
    }
    
    // Validate numeric ranges
    const duration = parseInt(config.duration);
    if (duration < 1 || duration > 3600) {
        errors.push('Duration must be between 1 and 3600 seconds');
    }
    
    const interval = parseInt(config.snapshot_interval);
    if (interval < 1 || interval > 60) {
        errors.push('Snapshot interval must be between 1 and 60 seconds');
    }
    
    if (config.test_type === 'throughput') {
        const bandwidth = parseInt(config.bandwidth_mbps);
        if (bandwidth < 1 || bandwidth > 10000) {
            warnings.push('Bandwidth outside typical range (1-10000 Mbps)');
        }
        
        const packetSize = parseInt(config.packet_size);
        if (packetSize < 64 || packetSize > 9000) {
            warnings.push('Packet size outside typical range (64-9000 bytes)');
        }
    } else if (config.test_type === 'cps') {
        const cps = parseInt(config.connections_per_second);
        if (cps < 1 || cps > 100000) {
            warnings.push('CPS outside typical range (1-100000)');
        }
        
        const concurrent = parseInt(config.concurrent_connections);
        if (concurrent < 1 || concurrent > 1000000) {
            warnings.push('Concurrent connections outside typical range (1-1000000)');
        }
    }
    
    return {
        valid: errors.length === 0,
        errors: errors,
        warnings: warnings
    };
}


function submitTestConfig(event) {
    event.preventDefault();
    
    // Validate configuration first
    if (!validateConfig()) {
        return false;
    }
    
    const formData = new FormData($('#testConfigForm')[0]);
    const config = Object.fromEntries(formData.entries());
    
    // Set bidi parameter based on direction
    config.bidi = config.direction === 'bidirectional';
    
    // Show progress modal
    $('#testProgressModal').removeClass('hidden');
    $('#runTestBtn').prop('disabled', true);
    
    // Start simple progress countdown
    const duration = parseInt(config.duration);
    startSimpleProgress(duration);
    
    // Submit test configuration using simplified endpoint
    $.ajax({
        url: '/api/run_test_simple',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(config),
        timeout: (parseInt(config.duration) + 30) * 1000, // Add timeout buffer
        success: function(response) {
            clearSimpleProgress();
            $('#testProgressModal').addClass('hidden');
            $('#runTestBtn').prop('disabled', false);
            
            if (response.status === 'success') {
                showAlert('Test completed successfully!', 'success');
                
                // Display results on the same page
                displayTestResults(response);
                
                // Scroll to results
                document.getElementById('testResultsSection').scrollIntoView({ 
                    behavior: 'smooth' 
                });
            } else {
                showAlert(`Test failed: ${response.message}`, 'danger');
            }
        },
        error: function(xhr, status, error) {
            clearSimpleProgress();
            $('#testProgressModal').addClass('hidden');
            $('#runTestBtn').prop('disabled', false);
            
            let errorMessage = 'Test execution failed';
            if (xhr.responseJSON && xhr.responseJSON.message) {
                errorMessage = xhr.responseJSON.message;
            } else if (status === 'timeout') {
                errorMessage = 'Test execution timed out';
            } else {
                errorMessage = `Test execution failed: ${error}`;
            }
            
            showAlert(errorMessage, 'danger');
        }
    });
    
    return false;
}

function startTestMonitoring(testId, duration) {
    let progressInterval = setInterval(function() {
        // Get real test status from API
        $.ajax({
            url: `/api/test_status/${testId}`,
            method: 'GET',
            success: function(response) {
                if (response.status === 'success') {
                    let progress = response.progress_percentage;
                    let testStatus = response.test_status;
                    let elapsed = response.elapsed_time || 0;
                    
                    $('#testProgressBar').css('width', progress + '%').text(Math.round(progress) + '%');
                    
                    let remaining = Math.max(0, duration - elapsed);
                    $('#testTimeRemaining').text(`Time remaining: ${formatDuration(remaining)}`);
                    
                    // Update status text based on actual test status
                    switch(testStatus) {
                        case 'initializing':
                            $('#testStatusText').text('Initializing test...');
                            break;
                        case 'starting_server':
                            $('#testStatusText').text('Starting server...');
                            break;
                        case 'starting_client':
                            $('#testStatusText').text('Starting client...');
                            break;
                        case 'running':
                            $('#testStatusText').text('Running test...');
                            break;
                        case 'stopping':
                            $('#testStatusText').text('Collecting final statistics...');
                            break;
                        case 'completed':
                            clearInterval(progressInterval);
                            $('#testProgressBar').css('width', '100%').text('100%');
                            $('#testStatusText').text('Test completed successfully!');
                            
                            setTimeout(function() {
                                $('#testProgressModal').addClass('hidden');
                                $('#runTestBtn').prop('disabled', false);
                                showAlert('Test completed! Check the Statistics section for results.', 'success');
                                
                                // Redirect to statistics page
                                setTimeout(function() {
                                    window.location.href = '/statistics';
                                }, 2000);
                            }, 1000);
                            break;
                        case 'error':
                            clearInterval(progressInterval);
                            $('#testProgressModal').addClass('hidden');
                            $('#runTestBtn').prop('disabled', false);
                            let errorMsg = response.error_message || 'Unknown error occurred';
                            showAlert(`Test failed: ${errorMsg}`, 'danger');
                            break;
                        case 'cancelled':
                            clearInterval(progressInterval);
                            $('#testProgressModal').addClass('hidden');
                            $('#runTestBtn').prop('disabled', false);
                            showAlert('Test was cancelled.', 'warning');
                            break;
                    }
                }
            },
            error: function() {
                clearInterval(progressInterval);
                $('#testProgressModal').addClass('hidden');
                $('#runTestBtn').prop('disabled', false);
                showAlert('Lost connection to test monitoring.', 'danger');
            }
        });
    }, 1000);
    
    // Add cancel button functionality
    if (!$('#cancelTestBtn').length) {
        $('#testProgressModal .modal-body').append(`
            <div class="text-center mt-3">
                <button type="button" class="btn btn-outline-danger" id="cancelTestBtn">
                    <i class="bi bi-x-circle me-1"></i>Cancel Test
                </button>
            </div>
        `);
        
        $('#cancelTestBtn').click(function() {
            if (confirm('Are you sure you want to cancel this test?')) {
                $.ajax({
                    url: `/api/cancel_test/${testId}`,
                    method: 'POST',
                    success: function(response) {
                        showAlert('Test cancelled successfully.', 'warning');
                    },
                    error: function() {
                        showAlert('Failed to cancel test.', 'danger');
                    }
                });
            }
        });
    }
}

// Display test results in side-by-side format
function displayTestResults(response) {
    // Show the results section
    $('#testResultsSection').removeClass('hidden');
    
    // DEBUG: Log the entire response to see what we're getting
    console.log('=== FULL RESPONSE DEBUG ===');
    console.log('Response:', response);
    console.log('Final Stats:', response.final_stats);
    console.log('Has final_stats?', !!response.final_stats);
    if (response.final_stats) {
        console.log('Server data:', response.final_stats.server);
        console.log('Client data:', response.final_stats.client);
    }
    console.log('=== END DEBUG ===');
    
    // Update test summary - show api_test_id since that's what we use for API calls
    $('#resultTestId').text(response.api_test_id || '-');
    $('#resultDuration').text(`${response.duration || 0} seconds`);
    
    // Check if we have valid stats or if test failed
    const hasValidStats = response.final_stats && 
                         (response.final_stats.server_stats || response.final_stats.client_stats);
    
    if (!hasValidStats) {
        // Check if we have ANY final_stats at all
        if (response.final_stats) {
            console.log('We have final_stats but not in expected format. Showing raw data...');
            $('#resultStatus').text('Completed (Raw Data)').removeClass('text-red-400').addClass('text-yellow-400');
            
            // Show whatever data we have
            $('#serverThroughput').html('<pre style="font-size: 10px; color: #10B981;">' + JSON.stringify(response.final_stats, null, 2) + '</pre>');
            $('#serverBytes').text('See raw data above');
            $('#serverConnections').text('See raw data above');
            $('#serverErrors').text('See raw data above');
            $('#serverLatency').text('See raw data above');
            
            $('#clientThroughput').text('See server section for all data');
            $('#clientBytes').text('See server section for all data');
            $('#clientConnections').text('See server section for all data');
            $('#clientErrors').text('See server section for all data');
            $('#clientLatency').text('See server section for all data');
            
            showAlert('Test completed but data format unexpected. Check raw data above.', 'warning');
        } else {
            // Truly no data
            $('#resultStatus').text('Failed').removeClass('text-green-400').addClass('text-red-400');
            
            const errorMsg = 'Test failed - No backend connection';
            $('#serverThroughput').text(errorMsg);
            $('#serverBytes').text(errorMsg);
            $('#serverConnections').text(errorMsg);
            $('#serverErrors').text('N/A');
            $('#serverLatency').text(errorMsg);
            
            $('#clientThroughput').text(errorMsg);
            $('#clientBytes').text(errorMsg);
            $('#clientConnections').text(errorMsg);
            $('#clientErrors').text('N/A');
            $('#clientLatency').text(errorMsg);
            
            // Add a helpful message
            showAlert('Test failed: Make sure cyperf-ce backend is running on port 8000', 'warning');
        }
        
    } else {
        // Test succeeded - show actual stats
        $('#resultStatus').text('Completed').removeClass('text-red-400').addClass('text-green-400');
        
        // Extract raw API response data - NEW STRUCTURE
        const serverData = response.final_stats?.server_stats?.raw_data || [];
        const clientData = response.final_stats?.client_stats?.raw_data || [];
        
        // Display raw API response for debugging
        console.log('Server API Response:', serverData);
        console.log('Client API Response:', clientData);
        
        // Display server stats as table
        if (Array.isArray(serverData) && serverData.length > 0) {
            const serverTableHtml = generateStatsTable(serverData, 'Server');
            $('#serverStatsTable').html(serverTableHtml);
        } else {
            $('#serverStatsTable').html('<p class="text-gray-400">No server data available</p>');
        }
        
        // Display client stats as table
        if (Array.isArray(clientData) && clientData.length > 0) {
            const clientTableHtml = generateStatsTable(clientData, 'Client');
            $('#clientStatsTable').html(clientTableHtml);
        } else {
            $('#clientStatsTable').html('<p class="text-gray-400">No client data available</p>');
        }
    }
    
    // Store results for later use
    window.lastTestResults = response;
    
    // Update charts if available
    if (response.final_stats?.server_stats?.raw_data || response.final_stats?.client_stats?.raw_data) {
        const serverData = response.final_stats?.server_stats?.raw_data || [];
        const clientData = response.final_stats?.client_stats?.raw_data || [];
        
        // Get test type from the form
        const isCpsTest = $('#testType').val() === 'cps';
        
        // Update charts
        if (window.updateCharts) {
            window.updateCharts({
                serverData,
                clientData,
                isConnectionTest: isCpsTest
            });
        }
    }
}

// Function to show client logs
function showClientLogs() {
    // Get the API test ID from the stored test results
    const testId = window.lastTestResults?.api_test_id;
    if (!testId) {
        showAlert('No test results available or missing API test ID', 'warning');
        return;
    }

    // Show modal
    $('#clientLogsModal').removeClass('hidden');
    $('#clientLogsContent').text('Loading logs...');

    // Fetch client logs
    $.ajax({
        url: `http://localhost:8000/api/client/logs/${testId}`,
        method: 'GET',
        headers: {
            'accept': 'application/json'
        },
        success: function(response) {
            console.log('Client logs success:', response);
            // Parse and format the log content
            const logContent = response.content;
            let formattedContent = '';

            // Extract test configuration
            const configMatch = logContent.match(/Test Configuration Summary([\s\S]*?)(?=\n\n---)/);
            if (configMatch) {
                formattedContent += `
                    <div class="mb-6">
                        <h3 class="text-lg font-semibold text-blue-400 mb-2">Test Configuration</h3>
                        <div class="bg-gray-800 rounded-lg p-4">
                            <table class="w-full">
                                ${configMatch[1].trim().split('\n').map(line => {
                                    const [key, value] = line.split(/\s{2,}/);
                                    if (key && value) {
                                        return `
                                            <tr>
                                                <td class="py-1 pr-4 text-gray-400">${key.trim()}</td>
                                                <td class="py-1 text-white">${value.trim()}</td>
                                            </tr>
                                        `;
                                    }
                                    return '';
                                }).join('')}
                            </table>
                        </div>
                    </div>`;
            }

            // Extract and format stats blocks
            const statsBlocks = logContent.match(/╭[^╰]*╰[^╮]*╯/g) || [];
            if (statsBlocks.length > 0) {
                formattedContent += `
                    <div class="space-y-6">
                        ${statsBlocks.map(block => {
                            // Extract timestamp
                            const timestampMatch = block.match(/Timestamp: ([^\n]+)/);
                            const timestamp = timestampMatch ? timestampMatch[1].trim() : 'N/A';

                            // Extract stats
                            const stats = block.match(/│([^│]+)│([^│]+)│/g) || [];
                            
                            return `
                                <div class="bg-gray-800 rounded-lg overflow-hidden">
                                    <div class="bg-gray-700 px-4 py-2">
                                        <span class="text-blue-400">Timestamp:</span>
                                        <span class="text-white ml-2">${timestamp}</span>
                                    </div>
                                    <div class="p-4">
                                        <table class="w-full">
                                            ${stats.map(stat => {
                                                const [key, value] = stat.split('│').slice(1, 3).map(s => s.trim());
                                                if (key && key !== 'Basic Stats' && value) {
                                                    return `
                                                        <tr>
                                                            <td class="py-1 pr-4 text-gray-400">${key}</td>
                                                            <td class="py-1 text-green-400 font-mono">${value}</td>
                                                        </tr>
                                                    `;
                                                }
                                                return '';
                                            }).join('')}
                                        </table>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>`;
            }

            // Add raw log option
            formattedContent += `
                <div class="mt-6 pt-6 border-t border-gray-700">
                    <button type="button" class="text-sm text-gray-400 hover:text-white" 
                            onclick="toggleRawLog(this, 'client')">
                        Show Raw Log
                    </button>
                    <pre class="hidden mt-4 text-gray-400 text-sm" id="clientRawLog">${logContent}</pre>
                </div>`;

            $('#clientLogsContent').html(formattedContent);
        },
        error: function(xhr, status, error) {
            console.error('Client logs error:', {
                status: xhr.status,
                statusText: xhr.statusText,
                responseText: xhr.responseText,
                error: error
            });
            let errorMessage = 'Failed to fetch client logs';
            try {
                const errorResponse = JSON.parse(xhr.responseText);
                errorMessage = errorResponse.message || errorResponse.detail || xhr.statusText;
            } catch (e) {
                errorMessage = xhr.responseText || xhr.statusText || error;
            }
            $('#clientLogsContent').html(`<div class="text-red-400">
                <p>Error: ${errorMessage}</p>
                <p class="mt-2 text-sm">Status: ${xhr.status} ${xhr.statusText}</p>
                <p class="mt-2 text-sm">Endpoint: ${this.url}</p>
            </div>`);
        }
    });
}

// Function to show server logs
function showServerLogs() {
    // Get the API test ID from the stored test results
    const testId = window.lastTestResults?.api_test_id;
    if (!testId) {
        showAlert('No test results available or missing API test ID', 'warning');
        return;
    }

    // Show modal
    $('#serverLogsModal').removeClass('hidden');
    $('#serverLogsContent').text('Loading logs...');

    // Fetch server logs
    $.ajax({
        url: `http://localhost:8000/api/server/logs/${testId}`,
        method: 'GET',
        headers: {
            'accept': 'application/json'
        },
        success: function(response) {
            console.log('Server logs success:', response);
            // Parse and format the log content
            const logContent = response.content;
            let formattedContent = '';

            // Extract test configuration
            const configMatch = logContent.match(/Test Configuration Summary([\s\S]*?)(?=\n\n---)/);
            if (configMatch) {
                formattedContent += `
                    <div class="mb-6">
                        <h3 class="text-lg font-semibold text-blue-400 mb-2">Test Configuration</h3>
                        <div class="bg-gray-800 rounded-lg p-4">
                            <table class="w-full">
                                ${configMatch[1].trim().split('\n').map(line => {
                                    const [key, value] = line.split(/\s{2,}/);
                                    if (key && value) {
                                        return `
                                            <tr>
                                                <td class="py-1 pr-4 text-gray-400">${key.trim()}</td>
                                                <td class="py-1 text-white">${value.trim()}</td>
                                            </tr>
                                        `;
                                    }
                                    return '';
                                }).join('')}
                            </table>
                        </div>
                    </div>`;
            }

            // Extract and format stats blocks
            const statsBlocks = logContent.match(/╭[^╰]*╰[^╮]*╯/g) || [];
            if (statsBlocks.length > 0) {
                formattedContent += `
                    <div class="space-y-6">
                        ${statsBlocks.map(block => {
                            // Extract timestamp
                            const timestampMatch = block.match(/Timestamp: ([^\n]+)/);
                            const timestamp = timestampMatch ? timestampMatch[1].trim() : 'N/A';

                            // Extract stats
                            const stats = block.match(/│([^│]+)│([^│]+)│/g) || [];
                            
                            return `
                                <div class="bg-gray-800 rounded-lg overflow-hidden">
                                    <div class="bg-gray-700 px-4 py-2">
                                        <span class="text-blue-400">Timestamp:</span>
                                        <span class="text-white ml-2">${timestamp}</span>
                                    </div>
                                    <div class="p-4">
                                        <table class="w-full">
                                            ${stats.map(stat => {
                                                const [key, value] = stat.split('│').slice(1, 3).map(s => s.trim());
                                                if (key && key !== 'Basic Stats' && value) {
                                                    return `
                                                        <tr>
                                                            <td class="py-1 pr-4 text-gray-400">${key}</td>
                                                            <td class="py-1 text-green-400 font-mono">${value}</td>
                                                        </tr>
                                                    `;
                                                }
                                                return '';
                                            }).join('')}
                                        </table>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>`;
            }

            // Add raw log option
            formattedContent += `
                <div class="mt-6 pt-6 border-t border-gray-700">
                    <button type="button" class="text-sm text-gray-400 hover:text-white" 
                            onclick="toggleRawLog(this, 'server')">
                        Show Raw Log
                    </button>
                    <pre class="hidden mt-4 text-gray-400 text-sm" id="serverRawLog">${logContent}</pre>
                </div>`;

            $('#serverLogsContent').html(formattedContent);
        },
        error: function(xhr, status, error) {
            console.error('Server logs error:', {
                status: xhr.status,
                statusText: xhr.statusText,
                responseText: xhr.responseText,
                error: error
            });
            let errorMessage = 'Failed to fetch server logs';
            try {
                const errorResponse = JSON.parse(xhr.responseText);
                errorMessage = errorResponse.message || errorResponse.detail || xhr.statusText;
            } catch (e) {
                errorMessage = xhr.responseText || xhr.statusText || error;
            }
            $('#serverLogsContent').html(`<div class="text-red-400">
                <p>Error: ${errorMessage}</p>
                <p class="mt-2 text-sm">Status: ${xhr.status} ${xhr.statusText}</p>
                <p class="mt-2 text-sm">Endpoint: ${this.url}</p>
            </div>`);
        }
    });
}

// Function to close modals
function closeModal(modalId) {
    $(`#${modalId}`).addClass('hidden');
}

// Close modals when clicking outside
$(document).on('click', '.modal-overlay', function(e) {
    if (e.target === this) {
        $(this).addClass('hidden');
    }
});

// Toggle raw log display
function toggleRawLog(button, type) {
    const rawLog = $(`#${type}RawLog`);
    if (rawLog.hasClass('hidden')) {
        rawLog.removeClass('hidden');
        button.textContent = 'Hide Raw Log';
    } else {
        rawLog.addClass('hidden');
        button.textContent = 'Show Raw Log';
    }
}


// Run another test - reset form and hide results
function runAnotherTest() {
    // Hide results section
    $('#testResultsSection').addClass('hidden');
    
    // Clear charts
    if (typeof clearCharts === 'function') {
        clearCharts();
    }
    
    // Reset form
    $('#testConfigForm')[0].reset();
    
    // Scroll back to form
    document.getElementById('testConfigForm').scrollIntoView({ 
        behavior: 'smooth' 
    });
    
    // Clear stored results
    window.lastTestResults = null;
}

// View detailed stats - redirect to statistics page
function viewDetailedStats() {
    if (window.lastTestResults) {
        // Store results in sessionStorage for the statistics page
        sessionStorage.setItem('lastTestResults', JSON.stringify(window.lastTestResults));
        
        // Redirect to statistics page
        window.location.href = '/statistics';
    } else {
        showAlert('No test results available', 'warning');
    }
}

// Simple progress countdown for test execution
function startSimpleProgress(duration) {
    let elapsed = 0;
    let phase = 'starting'; // starting, running, finishing
    
    // Update initial status
    $('#testStatusText').text('Starting server...');
    updateProgressBar(0, 'Starting...');
    $('#testTimeRemaining').text(`Test will run for ${duration} seconds`);
    
    const progressInterval = setInterval(() => {
        elapsed += 1;
        
        // Simulate phases
        if (elapsed <= 3) {
            phase = 'starting';
            $('#testStatusText').text('Starting server and client...');
            const startProgress = Math.min((elapsed / 3) * 10, 10); // 0-10% for starting
            updateProgressBar(startProgress, 'Starting...');
        } else if (elapsed > 3 && elapsed <= duration + 3) {
            phase = 'running';
            const testElapsed = elapsed - 3;
            const testProgress = 10 + Math.min((testElapsed / duration) * 80, 80); // 10-90% for running
            const remaining = Math.max(0, duration - testElapsed);
            
            $('#testStatusText').text('Running test...');
            updateProgressBar(testProgress, `${Math.round(testProgress)}%`);
            $('#testTimeRemaining').text(`Time remaining: ${formatDuration(remaining)}`);
        } else {
            phase = 'finishing';
            $('#testStatusText').text('Collecting final statistics...');
            updateProgressBar(95, 'Finishing...');
            $('#testTimeRemaining').text('Finishing...');
        }
        
        // Clear interval when AJAX completes (handled in success/error callbacks)
    }, 1000);
    
    // Store interval ID for cleanup
    window.currentProgressInterval = progressInterval;
}

// Update progress bar with animation
function updateProgressBar(percentage, text) {
    const progressBar = $('#testProgressBar');
    
    // Animate the width change
    progressBar.animate({
        width: percentage + '%'
    }, 300, 'swing');
    
    // Update text
    progressBar.text(text);
    
    // Add visual effects based on progress
    if (percentage < 30) {
        progressBar.removeClass('bg-yellow-500 bg-green-500').addClass('bg-cyperf-red');
    } else if (percentage < 80) {
        progressBar.removeClass('bg-cyperf-red bg-green-500').addClass('bg-yellow-500');
    } else {
        progressBar.removeClass('bg-cyperf-red bg-yellow-500').addClass('bg-green-500');
    }
}

// Clear progress interval
function clearSimpleProgress() {
    if (window.currentProgressInterval) {
        clearInterval(window.currentProgressInterval);
        window.currentProgressInterval = null;
    }
}

// Generate HTML table from stats data
function generateStatsTable(statsArray, type) {
    if (!Array.isArray(statsArray) || statsArray.length === 0) {
        return '<p class="text-gray-400">No data available</p>';
    }
    
    // Get the keys from the first object to create table headers
    const firstStats = statsArray[0];
    const keys = Object.keys(firstStats);
    
    // Define field sets for different test types
    const throughputFields = {
        server: [
            'Timestamp', 'Throughput', 'ThroughputTX', 'ThroughputRX',
            'TCPDataThroughput', 'TCPDataThroughputRX', 'BytesSent', 'BytesReceived',
            'PacketsSent', 'PacketsReceived', 'TXPacketsPerSecond', 'RXPacketsPerSecond',
            'TXError', 'RXError', 'PSHRetransmitted', 'PSHRetransmissionAborted'
        ],
        client: [
            'Timestamp', 'Throughput', 'ThroughputTX', 'ThroughputRX',
            'TCPDataThroughput', 'TCPDataThroughputTX', 'ParallelClientSessions',
            'ActiveConnections', 'ConnectionsSucceeded', 'AverageConnectionLatency',
            'BytesSent', 'BytesReceived', 'PacketsSent', 'PacketsReceived',
            'TXPacketsPerSecond', 'RXPacketsPerSecond'
        ]
    };

    const cpsFields = {
        server: [
            'Timestamp', 'Throughput', 'TCPDataThroughput', 'ConnectionsAccepted',
            'ConnectionRate', 'AverageConnectionLatency', 'SYNReceived', 'SYN_ACKSent',
            'FIN_ACKSent', 'FINReceived', 'BytesSent', 'BytesReceived',
            'PacketsSent', 'PacketsReceived', 'TXPacketsPerSecond', 'RXPacketsPerSecond',
            'TXError', 'RXError', 'TXDroppedPackets', 'RXDroppedPackets',
            'SYNRetransmitted', 'PSHRetransmitted'
        ],
        client: [
            'Timestamp', 'Throughput', 'ParallelClientSessions', 'ConnectionsSucceeded',
            'ConnectionsFailed', 'ConnectionsAccepted', 'ConnectionRate',
            'AverageConnectionLatency', 'SYNSent', 'SYN_ACKReceived',
            'FINSent', 'FIN_ACKReceived', 'BytesSent', 'BytesReceived',
            'PacketsSent', 'PacketsReceived', 'TXPacketsPerSecond', 'RXPacketsPerSecond',
            'TXError', 'RXError'
        ]
    };

    // Determine test type and get appropriate fields
    const isConnectionTest = statsArray.some(stat => 
        stat.hasOwnProperty('ConnectionRate') || 
        stat.hasOwnProperty('ConnectionsSucceeded') ||
        stat.hasOwnProperty('ConnectionsAccepted')
    );

    const fields = isConnectionTest ? 
        (type.toLowerCase() === 'server' ? cpsFields.server : cpsFields.client) :
        (type.toLowerCase() === 'server' ? throughputFields.server : throughputFields.client);
    
    // Use the determined fields
    const finalKeys = fields.filter(key => keys.includes(key));
    
    let tableHtml = `
        <div class="overflow-x-auto">
            <table class="min-w-full text-sm text-white border-collapse">
                <thead class="bg-gray-700">
                    <tr class="whitespace-nowrap">
                        <th class="px-3 py-2 text-left border-b border-gray-600 sticky left-0 bg-gray-700">#</th>`;
    
    // Add headers with improved styling
    finalKeys.forEach(key => {
        const displayName = key.replace(/([A-Z])/g, ' $1').trim(); // Add spaces before capitals
        tableHtml += `<th class="px-3 py-2 text-left border-b border-gray-600 font-semibold">${displayName}</th>`;
    });
    
    tableHtml += `</tr></thead><tbody class="bg-gray-800">`;
    
    // Add data rows
    statsArray.forEach((stats, index) => {
        tableHtml += `<tr class="${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'} hover:bg-gray-700 transition-colors whitespace-nowrap">`;
        tableHtml += `<td class="px-3 py-2 text-gray-400 sticky left-0 ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}">${index + 1}</td>`;
        
        finalKeys.forEach(key => {
            let value = stats[key] || '0';
            let displayValue = value;
            
            // Format specific values for better readability
            if (key.includes('Throughput') && parseInt(value) > 1000) {
                displayValue = `${(parseInt(value) / 1000000).toFixed(2)} Mbps`;
            } else if (key.includes('Bytes') && parseInt(value) > 1000) {
                displayValue = `${(parseInt(value) / 1000).toFixed(1)} KB`;
            } else if (key.includes('Latency') && parseInt(value) > 1000) {
                displayValue = `${(parseInt(value) / 1000).toFixed(1)} ms`;
            } else if (key === 'Timestamp') {
                // Convert timestamp to readable time
                const date = new Date(parseInt(value) * 1000);
                displayValue = date.toLocaleTimeString();
            } else if (key === 'ConnectionRate') {
                displayValue = `${value} conn/s`;
            } else if (key.includes('PacketsPerSecond')) {
                displayValue = `${value} pps`;
            }
            
            // Color code and style cells
            let cellClass = 'px-3 py-2 border-b border-gray-700';
            
            // Add specific styling based on field type
            if (key.includes('Error') || key.includes('Failed') || key.includes('Dropped')) {
                cellClass += parseInt(value) > 0 ? ' text-red-400 font-bold' : ' text-green-400';
            } else if (key.includes('Throughput')) {
                cellClass += ' text-green-400 font-semibold';
            } else if (key.includes('Latency')) {
                cellClass += ' text-yellow-400';
            } else if (key.includes('Connections') || key.includes('Rate')) {
                cellClass += ' text-blue-400';
            } else if (key.includes('Bytes') || key.includes('Packets')) {
                cellClass += ' text-purple-400';
            }
            
            tableHtml += `<td class="${cellClass}">${displayValue}</td>`;
        });
        
        tableHtml += `</tr>`;
    });
    
    tableHtml += `</tbody></table></div>`;
    
    return tableHtml;
}

// Test function to simulate API response and test stats display
function testStatsDisplay() {
    // Create mock response based on actual API data structure from your screenshot
    const mockResponse = {
        status: 'success',
        test_id: 'test-12345',
        api_test_id: 'api-test-id-from-cyperf',
        duration: 10,
        final_stats: {
            server_stats: {
                raw_data: [
                    {
                        'Timestamp': '1759205494',
                        'Throughput': '2195408',
                        'ThroughputTX': '2135488',
                        'ThroughputRX': '59920',
                        'TCPDataThroughput': '234700',
                        'ActiveConnections': '1',
                        'AverageConnectionLatency': '89563',
                        'BytesSent': '1253656',
                        'BytesReceived': '28696',
                        'PacketsSent': '1145',
                        'PacketsReceived': '410',
                        'TXError': '0',
                        'RXError': '0'
                    },
                    {
                        'Timestamp': '1759205495',
                        'Throughput': '2205408',
                        'ThroughputTX': '2145488',
                        'ThroughputRX': '61920',
                        'TCPDataThroughput': '244700',
                        'ActiveConnections': '1',
                        'AverageConnectionLatency': '85563',
                        'BytesSent': '1263656',
                        'BytesReceived': '30696',
                        'PacketsSent': '1155',
                        'PacketsReceived': '420',
                        'TXError': '0',
                        'RXError': '0'
                    }
                ]
            },
            client_stats: {
                raw_data: [
                    {
                        'Timestamp': '1759205494',
                        'Throughput': '2254080',
                        'ThroughputTX': '2188000',
                        'ThroughputRX': '66080',
                        'TCPDataThroughput': '242688',
                        'ActiveConnections': '1',
                        'AverageConnectionLatency': '72278',
                        'BytesSent': '1296322',
                        'BytesReceived': '37096',
                        'PacketsSent': '1184',
                        'PacketsReceived': '530',
                        'TXError': '0',
                        'RXError': '0'
                    },
                    {
                        'Timestamp': '1759205495',
                        'Throughput': '2264080',
                        'ThroughputTX': '2198000',
                        'ThroughputRX': '68080',
                        'TCPDataThroughput': '252688',
                        'ActiveConnections': '1',
                        'AverageConnectionLatency': '70278',
                        'BytesSent': '1306322',
                        'BytesReceived': '39096',
                        'PacketsSent': '1194',
                        'PacketsReceived': '540',
                        'TXError': '0',
                        'RXError': '0'
                    }
                ]
            }
        }
    };
    
    // Test the display function
    displayTestResults(mockResponse);
    
    // Show success message
    showAlert('Stats display test completed! Check the results below.', 'success');
}

// Backend Status Check Function
function checkBackendStatus() {
    console.log('🔍 Checking backend status...');
    
    // Update UI to show checking state
    const indicator = $('#backendStatusIndicator');
    const statusText = $('#backendStatusText');
    const refreshBtn = $('#refreshBackendBtn');
    const backendUrl = $('#backendUrl');
    const lastCheckedTime = $('#lastCheckedTime');
    const statusDetails = $('#backendStatusDetails');
    
    console.log('📊 Found elements:', {
        indicator: indicator.length,
        statusText: statusText.length,
        refreshBtn: refreshBtn.length
    });
    
    // Set checking state
    indicator.removeClass('bg-green-500 bg-red-500 bg-yellow-500')
             .addClass('bg-yellow-500 animate-pulse');
    statusText.text('Checking...');
    refreshBtn.prop('disabled', true);
    
    // Make AJAX call to health endpoint
    $.ajax({
        url: '/health',
        method: 'GET',
        timeout: 10000, // 10 second timeout
        success: function(response) {
            const now = new Date().toLocaleTimeString();
            lastCheckedTime.text(now);
            statusDetails.removeClass('hidden');
            
            if (response.status === 'healthy' && response.backend_status === 'healthy') {
                // Backend is healthy
                indicator.removeClass('bg-red-500 bg-yellow-500 animate-pulse')
                         .addClass('bg-green-500')
                         .css('background-color', '#10B981 !important'); // Force green color
                statusText.text('Connected').removeClass('text-red-400 text-yellow-400').addClass('text-green-400');
                backendUrl.text(response.flask_config?.api_base_url || 'Unknown URL');
                console.log('✅ Backend is healthy and connected');
            } else {
                // Backend is unhealthy
                indicator.removeClass('bg-green-500 bg-yellow-500 animate-pulse')
                         .addClass('bg-red-500')
                         .css('background-color', '#EF4444 !important'); // Force red color
                statusText.text('Backend Issues').removeClass('text-green-400 text-yellow-400').addClass('text-red-400');
                backendUrl.text(response.flask_config?.api_base_url || 'Unknown URL');
                console.log('❌ Backend is unhealthy');
            }
        },
        error: function(xhr, status, error) {
            const now = new Date().toLocaleTimeString();
            lastCheckedTime.text(now);
            statusDetails.removeClass('hidden');
            
            // Connection failed
            indicator.removeClass('bg-green-500 bg-yellow-500 animate-pulse')
                     .addClass('bg-red-500')
                     .css('background-color', '#EF4444 !important'); // Force red color
            
            if (status === 'timeout') {
                statusText.text('Connection Timeout').removeClass('text-green-400 text-yellow-400').addClass('text-red-400');
                console.log('⏰ Backend connection timeout');
            } else {
                statusText.text('Connection Failed').removeClass('text-green-400 text-yellow-400').addClass('text-red-400');
                console.log('💥 Backend connection failed:', error);
            }
            
            backendUrl.text('Unable to reach backend');
        },
        complete: function() {
            // Re-enable refresh button
            refreshBtn.prop('disabled', false);
        }
    });
}
