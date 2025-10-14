// Parameters Page JavaScript

// Define preset configurations
const TEST_PRESETS = {
    highThroughput: {
        test_type: 'throughput',
        duration: 30,
        snapshot_interval: 5,
        parallel_sessions: 6500,
        bandwidth_mbps: 10000,  // 10 Gbps
        packet_size: 1500,
        direction: 'unidirectional',
        traffic_direction: 'client_to_server'
    },
    highCPS: {
        test_type: 'cps',
        duration: 30,
        snapshot_interval: 5,
        parallel_sessions: 6400,
        connections_per_second: 10000,
        packet_size: 1,  // 1 byte packets
        direction: 'unidirectional',
        traffic_direction: 'client_to_server'
    }
};

// Initialize page
$(document).ready(function() {
    // Apply High Throughput configuration by default
    applyPresetConfiguration('highThroughput');
    $('#customConfigSection').hide();
    
    updateConfigSummary();
    updateTestSpecificFields();
    updateTrafficDirectionOptions(); // Show traffic direction dropdown on initial load
    
    // Add event listener for preset selection
    $('input[name="testPreset"]').on('change', function() {
        const selectedPreset = $(this).val();
        
        // Save IP and bind values before any changes
        const savedValues = {
            clientIP: $('#clientIP').val(),
            clientBind: $('#clientBind').val(),
            serverIP: $('#serverIP').val(),
            serverBind: $('#serverBind').val()
        };

        if (selectedPreset === 'custom') {
            $('#customConfigSection').slideDown(300);
            
            // Reset form to defaults while preserving IPs and radio selection
            const form = $('#testConfigForm')[0];
            form.reset();
            
            // Restore the custom radio selection
            $('#custom').prop('checked', true);
            
            // Restore saved IP values
            $('#clientIP').val(savedValues.clientIP);
            $('#clientBind').val(savedValues.clientBind);
            $('#serverIP').val(savedValues.serverIP);
            $('#serverBind').val(savedValues.serverBind);

            // Disable validation for cps_packet_size
            $('#cpsPacketSize').prop('required', false);
        } else {
            $('#customConfigSection').slideUp(300);
            applyPresetConfiguration(selectedPreset);
        }
        
        updateTestSpecificFields();  // Update visibility of parameter sections
        updateConfigSummary();
    });
    
    // Initial state - hide custom config if a preset is selected
    const initialPreset = $('input[name="testPreset"]:checked').val();
    if (initialPreset !== 'custom') {
        $('#customConfigSection').hide();
    }

    // Add event listeners for real-time summary updates
    $('#testConfigForm input, #testConfigForm select').on('input change', function() {
        updateConfigSummary();
    });
    
    // Check backend status on page load
    checkBackendStatus();
    
    // Auto-refresh backend status every 30 seconds
    setInterval(checkBackendStatus, 30000);
});

// Function to apply preset configuration
function applyPresetConfiguration(preset) {
    const config = TEST_PRESETS[preset];
    if (!config) return;

    // Save current IP and bind values
    const savedValues = {
        clientIP: $('#clientIP').val(),
        clientBind: $('#clientBind').val(),
        serverIP: $('#serverIP').val(),
        serverBind: $('#serverBind').val()
    };

    // Apply the configuration to form fields
    $('#testType').val(config.test_type);
    $('#testDuration').val(config.duration);
    $('#snapshotInterval').val(config.snapshot_interval);
    $('#parallelSessions').val(config.parallel_sessions);
    $('#direction').val(config.direction);
    $('#trafficDirection').val(config.traffic_direction);

    if (config.test_type === 'throughput') {
        $('#bandwidth').val(config.bandwidth_mbps);
        $('#packetSize').val(config.packet_size);
    } else if (config.test_type === 'cps') {
        $('#connectionsPerSecond').val(config.connections_per_second);
        $('#cpsPacketSize').val(config.packet_size);
    }

    // Restore saved IP and bind values
    $('#clientIP').val(savedValues.clientIP);
    $('#clientBind').val(savedValues.clientBind);
    $('#serverIP').val(savedValues.serverIP);
    $('#serverBind').val(savedValues.serverBind);

    // Disable validation on all custom fields when using presets
    $('#customConfigSection input, #customConfigSection select').prop('required', false);
    $('#throughputParams input, #cpsParams input').prop('required', false);
    $('#cpsPacketSize').prop('required', false); // Explicitly disable validation for cps_packet_size

    // Update form visibility based on test type
    updateTestSpecificFields();
    updateTrafficDirectionOptions();
}

// Function to reset form to default values
function resetToDefaultValues() {
    $('#testConfigForm')[0].reset();
    updateTestSpecificFields();
    updateTrafficDirectionOptions();
}

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
    const selectedPreset = $('input[name="testPreset"]:checked').val();
    const isCustom = selectedPreset === 'custom';
    
    // First handle preset vs custom mode
    if (!isCustom) {
        // Hide and disable validation for all custom sections when using presets
        $('#throughputParams, #cpsParams').addClass('hidden');
        $('#customConfigSection input, #customConfigSection select').prop('required', false);
        $('#throughputParams input, #cpsParams input').prop('required', false);
        $('#cpsPacketSize').prop('required', false); // Always disable cps_packet_size validation
        return;
    }
    
    // Show appropriate section only for custom test configuration
    if (testType === 'throughput') {
        $('#throughputParams').removeClass('hidden');
        $('#cpsParams').addClass('hidden');
        
        // Enable validation for throughput fields, disable for CPS
        $('#bandwidth, #packetSize').prop('required', true);
        $('#connectionsPerSecond').prop('required', false);
        $('#cpsPacketSize').prop('required', false); // Always disable cps_packet_size validation
        
        // Enable other common fields
        $('#testType, #testDuration, #snapshotInterval, #parallelSessions, #direction').prop('required', true);
    } else if (testType === 'cps') {
        $('#throughputParams').addClass('hidden');
        $('#cpsParams').removeClass('hidden');
        
        // Enable validation for CPS fields, disable for throughput
        $('#bandwidth, #packetSize').prop('required', false);
        $('#connectionsPerSecond').prop('required', true);
        $('#cpsPacketSize').prop('required', false); // Always disable cps_packet_size validation
        
        // Enable other common fields
        $('#testType, #testDuration, #snapshotInterval, #parallelSessions, #direction').prop('required', true);
    }
    
    updateConfigSummary();
}

function updateTrafficDirectionOptions() {
    const direction = $('#direction').val();
    const trafficDirectionContainer = $('#trafficDirectionContainer');
    
    if (direction === 'unidirectional') {
        trafficDirectionContainer.removeClass('hidden');
    } else {
        trafficDirectionContainer.addClass('hidden');
    }
    
    updateConfigSummary();
}

function updateConfigSummary() {
    // Update basic info
    const testType = $('#testType').val();
    const duration = $('#testDuration').val();
    const serverIP = $('#serverIP').val();
    const serverBind = $('#serverBind').val();
    const clientIP = $('#clientIP').val();
    const clientBind = $('#clientBind').val();
    const direction = $('#direction').val();
    const trafficDirection = $('#trafficDirection').val();
    const snapshotInterval = $('#snapshotInterval').val();
    const parallelSessions = $('#parallelSessions').val();
    
    // Update test type and basic parameters
    $('#summaryTestType').text(testType === 'throughput' ? 'Throughput' : 'CPS');
    $('#summaryDuration').text(`${duration} seconds`);
    $('#summaryInterval').text(`${snapshotInterval} seconds`);
    $('#summaryParallelSessions').text(parallelSessions);
    
    // Update IP addresses
    $('#summaryClientIP').text(clientIP);
    $('#summaryServerIP').text(serverIP);
    
    // Update direction text
    let directionText = direction.charAt(0).toUpperCase() + direction.slice(1);
    if (direction === 'unidirectional') {
        directionText += ` (${trafficDirection === 'server_to_client' ? 'Server to Client' : 'Client to Server'})`;
    }
    $('#summaryDirection').text(directionText);
    
    // Update test-specific summary
    if (testType === 'throughput') {
        const bandwidth = $('#bandwidth').val();
        const packetSize = $('#packetSize').val();
        
        // Show throughput fields, hide CPS fields
        $('#summaryBandwidthRow, #summaryPacketSizeRow').removeClass('hidden');
        $('#summaryCPSRow').addClass('hidden');
        
        // Update values
        $('#summaryBandwidth').text(`${bandwidth} Mbps`);
        $('#summaryPacketSize').text(`${packetSize} bytes`);
    } else if (testType === 'cps') {
        const cps = $('#connectionsPerSecond').val();
        const cpsPacketSize = $('#cpsPacketSize').val();
        
        // Show CPS fields, hide throughput fields
        $('#summaryBandwidthRow, #summaryPacketSizeRow').addClass('hidden');
        $('#summaryCPSRow').removeClass('hidden');
        
        // Update values
        $('#summaryCPS').text(`${cps} conn/s`);
    }
}

// Function to check backend status.
function checkBackendStatus() {
    const apiUrl = window.baseUrl + '/docs';
    
    $.ajax({
        url: '/health',  // This will proxy through Flask to check FastAPI
        method: 'GET',
        success: function(response) {
            const indicator = $('#backendStatusIndicator');
            const statusText = $('#backendStatusText');
            const backendUrl = $('#backendUrl');
            const lastChecked = $('#lastCheckedTime');
            
            if (response.status === 'healthy') {
                indicator.removeClass('bg-yellow-500 bg-red-500').addClass('bg-green-500');
                statusText.text('Connected');
                backendUrl.text(apiUrl);
            } else {
                indicator.removeClass('bg-yellow-500 bg-green-500').addClass('bg-red-500');
                statusText.text('Disconnected');
                backendUrl.text('Not Available');
            }
            
            lastChecked.text(new Date().toLocaleTimeString());
        },
        error: function() {
            const indicator = $('#backendStatusIndicator');
            const statusText = $('#backendStatusText');
            const backendUrl = $('#backendUrl');
            const lastChecked = $('#lastCheckedTime');
            
            indicator.removeClass('bg-yellow-500 bg-green-500').addClass('bg-red-500');
            statusText.text('Connection Failed');
            backendUrl.text('Not Available');
            lastChecked.text(new Date().toLocaleTimeString());
        }
    });
}

// Function to handle form submission
function submitTestConfig(event) {
    event.preventDefault(); // Prevent form from submitting normally
    
    // Show progress modal
    $('#testProgressModal').removeClass('hidden');
    
    // Get form data and convert to JSON object
    const formData = {};
    const selectedPreset = $('input[name="testPreset"]:checked').val();
    
    // If using a preset, use those values
    if (selectedPreset !== 'custom') {
        Object.assign(formData, TEST_PRESETS[selectedPreset]);
    } else {
        // Get custom values
        formData.test_type = $('#testType').val();
        formData.duration = parseInt($('#testDuration').val());
        formData.snapshot_interval = parseInt($('#snapshotInterval').val());
        formData.parallel_sessions = parseInt($('#parallelSessions').val());
        formData.direction = $('#direction').val();
        formData.traffic_direction = $('#trafficDirection').val();
        
        if (formData.test_type === 'throughput') {
            formData.bandwidth_mbps = parseInt($('#bandwidth').val());
            formData.packet_size = parseInt($('#packetSize').val());
        } else if (formData.test_type === 'cps') {
            formData.connections_per_second = parseInt($('#connectionsPerSecond').val());
            formData.packet_size = parseInt($('#cpsPacketSize').val());
        }
    }
    
    // Always include IP configurations regardless of preset/custom
    formData.client_ip = $('#clientIP').val();
    formData.client_bind = $('#clientBind').val() || null;
    formData.server_ip = $('#serverIP').val();
    formData.server_bind = $('#serverBind').val() || null;
    
    // Optional port configurations
    const serverPort = $('#serverPort').val();
    const clientPort = $('#clientPort').val();
    if (serverPort) formData.server_port = parseInt(serverPort);
    if (clientPort) formData.client_port = parseInt(clientPort);
    
    // Prepare server and client parameters
    const serverParams = {
        cps: formData.test_type === 'cps',
        port: formData.server_port || 5202,
        length: formData.packet_size ? `${formData.packet_size}` : '1k',
        csv_stats: true,
        bidi: formData.direction === 'bidirectional',
        reverse: formData.traffic_direction === 'server_to_client',
        bind: formData.server_bind
    };

    const clientParams = {
        cps: formData.test_type === 'cps',
        cps_rate_limit: formData.test_type === 'cps' ? `${formData.connections_per_second}/s` : undefined,
        port: formData.client_port || 5202,
        length: formData.packet_size ? `${formData.packet_size}` : '1k',
        time: formData.duration,
        csv_stats: true,
        bitrate: formData.test_type === 'throughput' ? `${formData.bandwidth_mbps}M` : undefined,
        parallel: formData.parallel_sessions,
        reverse: formData.traffic_direction === 'server_to_client',
        bidi: formData.direction === 'bidirectional',
        interval: formData.snapshot_interval,
        bind: formData.client_bind
    };

    // First start the server
    $.ajax({
        url: window.baseUrl + '/api/start_server',  // Updated to match OpenAPI spec
        method: 'POST',
        data: JSON.stringify({
            server_ip: formData.server_ip,
            params: serverParams
        }),
        contentType: 'application/json',
        success: function(serverResponse) {
            // Now start the client
            $.ajax({
                url: window.baseUrl + '/api/start_client',  // Updated to match OpenAPI spec
                method: 'POST',
                data: JSON.stringify({
                    test_id: serverResponse.test_id,
                    server_ip: formData.server_ip,
                    client_ip: formData.client_ip,
                    params: clientParams
                }),
                contentType: 'application/json',
                success: function(clientResponse) {
                    showAlert('Test started successfully', 'success');
                    updateTestProgress(serverResponse.test_id);
                },
                error: function(xhr) {
                    $('#testProgressModal').addClass('hidden');
                    showAlert('Failed to start client: ' + (xhr.responseJSON?.detail || 'Unknown error'), 'error');
                }
            });
        },
        error: function(xhr) {
            $('#testProgressModal').addClass('hidden');
            showAlert('Failed to start server: ' + (xhr.responseJSON?.detail || 'Unknown error'), 'error');
        }
    });
}

// Function to format numbers with units
function formatNumber(num, unit) {
    // Handle non-numeric or invalid values
    if (typeof num !== 'number' || isNaN(num)) {
        return '0 ' + unit;
    }
    
    const absNum = Math.abs(num);
    if (absNum >= 1000000000) {
        return (num / 1000000000).toFixed(2) + ' G' + unit;
    } else if (absNum >= 1000000) {
        return (num / 1000000).toFixed(2) + ' M' + unit;
    } else if (absNum >= 1000) {
        return (num / 1000).toFixed(2) + ' K' + unit;
    }
    return num.toFixed(2) + ' ' + unit;
}

// Function to update server statistics in the UI
function updateServerStats(stats) {
    if (!stats) return;

    try {
        // Parse stats if it's a string
        if (typeof stats === 'string') {
            stats = JSON.parse(stats);
        }

        // Extract throughput from Throughput field
        const throughput = parseFloat(stats.Throughput) || 0;
        const throughputTX = parseFloat(stats.ThroughputTX) || 0;
        const throughputRX = parseFloat(stats.ThroughputRX) || 0;
        
        // Update throughput displays
        $('#avgThroughput .text-cyperf-red').text('Server: ' + formatNumber(throughput, 'bps'));
        $('#peakThroughput .text-cyperf-red').text('Server TX/RX: ' + 
            formatNumber(throughputTX, 'bps') + ' / ' + 
            formatNumber(throughputRX, 'bps'));

        // Extract and display CPS data if available
        const tcpDataThroughput = parseFloat(stats.TCPDataThroughput) || 0;
        const tcpDataThroughputTX = parseFloat(stats.TCPDataThroughputTX) || 0;
        const tcpDataThroughputRX = parseFloat(stats.TCPDataThroughputRX) || 0;
        
        // Update CPS displays
        $('#avgLatency .text-cyperf-red').text('Server TCP: ' + formatNumber(tcpDataThroughput, 'bps'));
    } catch (e) {
        console.error('Error parsing server stats:', e);
    }

    // Update server stats table
    const serverStatsTable = $('#serverStatsTable');
    if (serverStatsTable.length) {
        let html = '<table class="min-w-full divide-y divide-gray-700">';
        html += '<thead><tr>';
        html += '<th class="px-4 py-2 text-left text-sm font-semibold text-white">Metric</th>';
        html += '<th class="px-4 py-2 text-right text-sm font-semibold text-white">Value</th>';
        html += '</tr></thead><tbody>';
        
        // Add all available stats
        Object.entries(stats).forEach(([key, value]) => {
            if (typeof value === 'object') {
                Object.entries(value).forEach(([subKey, subValue]) => {
                    html += '<tr class="transition-colors hover:bg-gray-700">';
                    html += `<td class="px-4 py-2 text-sm text-gray-300">${key} ${subKey}</td>`;
                    html += `<td class="px-4 py-2 text-sm text-right text-white">${formatNumber(parseFloat(subValue) || 0, key === 'throughput' ? 'bps' : 'ms')}</td>`;
                    html += '</tr>';
                });
            } else {
                html += '<tr class="transition-colors hover:bg-gray-700">';
                html += `<td class="px-4 py-2 text-sm text-gray-300">${key}</td>`;
                html += `<td class="px-4 py-2 text-sm text-right text-white">${value}</td>`;
                html += '</tr>';
            }
        });
        
        html += '</tbody></table>';
        serverStatsTable.html(html);
    }
}

// Function to update client statistics in the UI
function updateClientStats(stats) {
    if (!stats) return;

    try {
        // Parse stats if it's a string
        if (typeof stats === 'string') {
            stats = JSON.parse(stats);
        }

        // Extract throughput from Throughput field
        const throughput = parseFloat(stats.Throughput) || 0;
        const throughputTX = parseFloat(stats.ThroughputTX) || 0;
        const throughputRX = parseFloat(stats.ThroughputRX) || 0;
        
        // Update throughput displays
        $('#avgThroughput .text-yellow-500').text('Client: ' + formatNumber(throughput, 'bps'));
        $('#peakThroughput .text-yellow-500').text('Client TX/RX: ' + 
            formatNumber(throughputTX, 'bps') + ' / ' + 
            formatNumber(throughputRX, 'bps'));

        // Extract and display CPS data if available
        const tcpDataThroughput = parseFloat(stats.TCPDataThroughput) || 0;
        const tcpDataThroughputTX = parseFloat(stats.TCPDataThroughputTX) || 0;
        const tcpDataThroughputRX = parseFloat(stats.TCPDataThroughputRX) || 0;
        
        // Update CPS displays
        $('#avgLatency .text-yellow-500').text('Client TCP: ' + formatNumber(tcpDataThroughput, 'bps'));
    } catch (e) {
        console.error('Error parsing client stats:', e);
    }

    // Update client stats table
    const clientStatsTable = $('#clientStatsTable');
    if (clientStatsTable.length) {
        let html = '<table class="min-w-full divide-y divide-gray-700">';
        html += '<thead><tr>';
        html += '<th class="px-4 py-2 text-left text-sm font-semibold text-white">Metric</th>';
        html += '<th class="px-4 py-2 text-right text-sm font-semibold text-white">Value</th>';
        html += '</tr></thead><tbody>';
        
        // Add all available stats
        Object.entries(stats).forEach(([key, value]) => {
            if (typeof value === 'object') {
                Object.entries(value).forEach(([subKey, subValue]) => {
                    html += '<tr class="transition-colors hover:bg-gray-700">';
                    html += `<td class="px-4 py-2 text-sm text-gray-300">${key} ${subKey}</td>`;
                    html += `<td class="px-4 py-2 text-sm text-right text-white">${formatNumber(parseFloat(subValue) || 0, key === 'throughput' ? 'bps' : 'ms')}</td>`;
                    html += '</tr>';
                });
            } else {
                html += '<tr class="transition-colors hover:bg-gray-700">';
                html += `<td class="px-4 py-2 text-sm text-gray-300">${key}</td>`;
                html += `<td class="px-4 py-2 text-sm text-right text-white">${value}</td>`;
                html += '</tr>';
            }
        });
        
        html += '</tbody></table>';
        clientStatsTable.html(html);
    }
}

// Function to update test progress
function updateTestProgress(testId) {
    let progress = 0;
    const duration = parseInt($('#testDuration').val());
    const startTime = Date.now();
    
    const progressInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        progress = Math.min((elapsed / duration) * 100, 100);
        
        // Update progress bar
        $('#testProgressBar').css('width', progress + '%')
            .removeClass('bg-red-500 bg-yellow-500')
            .addClass(progress < 30 ? 'bg-red-500' : progress < 70 ? 'bg-yellow-500' : 'bg-green-500');
        $('#progressText').text(Math.round(progress) + '%');
        
        // Update time remaining
        const remaining = Math.max(duration - elapsed, 0);
        $('#testTimeRemaining').text('Time remaining: ' + Math.round(remaining) + 's');
        
        // Get current stats
        $.ajax({
            url: window.baseUrl + '/api/server/stats/' + testId,
            method: 'GET',
            success: function(serverStats) {
                if (serverStats) {
                    updateServerStats(serverStats);
                }
            }
        });
        
        $.ajax({
            url: window.baseUrl + '/api/client/stats/' + testId,
            method: 'GET',
            success: function(clientStats) {
                if (clientStats) {
                    updateClientStats(clientStats);
                }
            }
        });
        
        // If test is complete
        if (progress >= 100) {
            clearInterval(progressInterval);
            setTimeout(() => {
                $('#testProgressModal').addClass('hidden');
                $('#testResultsSection').removeClass('hidden');
                
                // Get final stats
                $.ajax({
                    url: window.baseUrl + '/api/server/stats/' + testId,
                    method: 'GET',
                    success: updateServerStats
                });
                
                $.ajax({
                    url: window.baseUrl + '/api/client/stats/' + testId,
                    method: 'GET',
                    success: updateClientStats
                });
                
                // Get logs
                $.ajax({
                    url: window.baseUrl + '/api/server/logs/' + testId,
                    method: 'GET',
                    success: function(response) {
                        $('#serverLogsContent').text(response.content || 'No logs available');
                    }
                });
                
                $.ajax({
                    url: window.baseUrl + '/api/client/logs/' + testId,
                    method: 'GET',
                    success: function(response) {
                        $('#clientLogsContent').text(response.content || 'No logs available');
                    }
                });
            }, 1000);
        }
    }, 1000);
}