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
        return;
    }
    
    // Show appropriate section only for custom test configuration
    if (testType === 'throughput') {
        $('#throughputParams').removeClass('hidden');
        $('#cpsParams').addClass('hidden');
        
        // Enable validation for throughput fields, disable for CPS
        $('#bandwidth, #packetSize').prop('required', true);
        $('#connectionsPerSecond').prop('required', false);
        
        // Enable other common fields
        $('#testType, #testDuration, #snapshotInterval, #parallelSessions, #direction').prop('required', true);
    } else if (testType === 'cps') {
        $('#throughputParams').addClass('hidden');
        $('#cpsParams').removeClass('hidden');
        
        // Enable validation for CPS fields, disable for throughput
        $('#bandwidth, #packetSize').prop('required', false);
        $('#connectionsPerSecond').prop('required', true);
        
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
            formData.packet_size = 1; // CPS uses 1 byte packets
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

        // Handle array format - use the latest entry for summary
        let latestStats = stats;
        if (Array.isArray(stats)) {
            if (stats.length === 0) return;
            latestStats = stats[stats.length - 1]; // Get the most recent entry
        }

        // Extract throughput from Throughput field
        const throughput = parseFloat(latestStats.Throughput) || 0;
        const throughputTX = parseFloat(latestStats.ThroughputTX) || 0;
        const throughputRX = parseFloat(latestStats.ThroughputRX) || 0;
        
        // Update throughput displays
        $('#avgThroughput .text-cyperf-red').text('Server: ' + formatNumber(throughput, 'bps'));
        $('#peakThroughput .text-cyperf-red').text('Server TX/RX: ' + 
            formatNumber(throughputTX, 'bps') + ' / ' + 
            formatNumber(throughputRX, 'bps'));

        // Extract and display CPS/Connection data if available
        const tcpDataThroughput = parseFloat(latestStats.TCPDataThroughput) || 0;
        const connectionRate = parseFloat(latestStats.ConnectionRate) || 0;
        const activeConnections = parseFloat(latestStats.ActiveConnections) || 0;
        
        // Update displays
        $('#avgLatency .text-cyperf-red').text('Server TCP: ' + formatNumber(tcpDataThroughput, 'bps') + 
            ' | Conn Rate: ' + formatNumber(connectionRate, '/s') +
            ' | Active: ' + formatNumber(activeConnections, ''));
    } catch (e) {
        console.error('Error parsing server stats:', e);
    }

    // Update server stats table
    const serverStatsTable = $('#serverStatsTable');
    if (serverStatsTable.length) {
        let html = '';
        
        // If array, show each timestamp as a row
        if (Array.isArray(stats) && stats.length > 0) {
            // Get all keys from the first entry (excluding Timestamp)
            const keys = Object.keys(stats[0]).filter(k => k !== 'Timestamp');
            
            html = '<table class="min-w-full divide-y divide-gray-700 border-collapse">';
            
            // Build header row with metric names - sticky header
            html += '<thead class="sticky top-0 z-10"><tr>';
            html += '<th class="px-3 py-2 text-center text-xs font-semibold text-white bg-gray-800 border-b border-gray-600 sticky left-0 z-20 w-12">#</th>';
            html += '<th class="px-3 py-2 text-left text-xs font-semibold text-white bg-gray-800 border-b border-gray-600 sticky left-[48px] z-20 min-w-[120px]">Timestamp</th>';
            keys.forEach(key => {
                html += `<th class="px-3 py-2 text-right text-xs font-semibold text-white bg-gray-800 border-b border-gray-600 whitespace-nowrap">${key}</th>`;
            });
            html += '</tr></thead><tbody>';
            
            // Add a row for each timestamp
            stats.forEach((entry, idx) => {
                const time = new Date(parseInt(entry.Timestamp) * 1000).toLocaleTimeString();
                html += '<tr class="transition-colors hover:bg-gray-700 border-b border-gray-800">';
                html += `<td class="px-3 py-2 text-xs text-center text-gray-400 bg-gray-900 sticky left-0 z-10 w-12">${idx + 1}</td>`;
                html += `<td class="px-3 py-2 text-xs text-left text-blue-400 whitespace-nowrap bg-gray-900 sticky left-[48px] z-10 min-w-[120px]">${time}</td>`;
                
                keys.forEach(key => {
                    const value = parseFloat(entry[key]) || 0;
                    const unit = key.includes('Throughput') || key.includes('Bytes') ? 'bps' : 
                                key.includes('Latency') ? 'μs' :
                                key.includes('Rate') ? '/s' : '';
                    const formattedValue = unit ? formatNumber(value, unit) : value.toFixed(0);
                    
                    // Apply color coding based on metric type
                    let colorClass = 'text-white';
                    if (key.includes('Throughput') || key.includes('TCPData')) colorClass = 'text-green-400';
                    else if (key.includes('Failed') || key.includes('Error') || key.includes('Dropped') || key.includes('RST')) colorClass = 'text-red-500';
                    else if (key.includes('Succeeded') || key.includes('Accepted') || key.includes('ACK')) colorClass = 'text-blue-400';
                    else if (key.includes('Rate') || key.includes('Active') || key.includes('Parallel')) colorClass = 'text-yellow-400';
                    
                    html += `<td class="px-3 py-2 text-xs text-right ${colorClass} whitespace-nowrap">${formattedValue}</td>`;
                });
                html += '</tr>';
            });
            
            html += '</tbody></table>';
        } else {
            // Fallback for empty or invalid data
            html = '<p class="text-gray-400 p-4 text-center">No server statistics available</p>';
        }
        
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

        // Handle array format - use the latest entry for summary
        let latestStats = stats;
        if (Array.isArray(stats)) {
            if (stats.length === 0) return;
            latestStats = stats[stats.length - 1]; // Get the most recent entry
        }

        // Extract throughput from Throughput field
        const throughput = parseFloat(latestStats.Throughput) || 0;
        const throughputTX = parseFloat(latestStats.ThroughputTX) || 0;
        const throughputRX = parseFloat(latestStats.ThroughputRX) || 0;
        
        // Update throughput displays
        $('#avgThroughput .text-yellow-500').text('Client: ' + formatNumber(throughput, 'bps'));
        $('#peakThroughput .text-yellow-500').text('Client TX/RX: ' + 
            formatNumber(throughputTX, 'bps') + ' / ' + 
            formatNumber(throughputRX, 'bps'));

        // Extract and display CPS/Connection data if available
        const tcpDataThroughput = parseFloat(latestStats.TCPDataThroughput) || 0;
        const connectionRate = parseFloat(latestStats.ConnectionRate) || 0;
        const activeConnections = parseFloat(latestStats.ActiveConnections) || 0;
        
        // Update displays
        $('#avgLatency .text-yellow-500').text('Client TCP: ' + formatNumber(tcpDataThroughput, 'bps') + 
            ' | Conn Rate: ' + formatNumber(connectionRate, '/s') +
            ' | Active: ' + formatNumber(activeConnections, ''));
    } catch (e) {
        console.error('Error parsing client stats:', e);
    }

    // Update client stats table
    const clientStatsTable = $('#clientStatsTable');
    if (clientStatsTable.length) {
        let html = '';
        
        // If array, show each timestamp as a row
        if (Array.isArray(stats) && stats.length > 0) {
            // Get all keys from the first entry (excluding Timestamp)
            const keys = Object.keys(stats[0]).filter(k => k !== 'Timestamp');
            
            html = '<table class="min-w-full divide-y divide-gray-700 border-collapse">';
            
            // Build header row with metric names - sticky header
            html += '<thead class="sticky top-0 z-10"><tr>';
            html += '<th class="px-3 py-2 text-center text-xs font-semibold text-white bg-gray-800 border-b border-gray-600 sticky left-0 z-20 w-12">#</th>';
            html += '<th class="px-3 py-2 text-left text-xs font-semibold text-white bg-gray-800 border-b border-gray-600 sticky left-[48px] z-20 min-w-[120px]">Timestamp</th>';
            keys.forEach(key => {
                html += `<th class="px-3 py-2 text-right text-xs font-semibold text-white bg-gray-800 border-b border-gray-600 whitespace-nowrap">${key}</th>`;
            });
            html += '</tr></thead><tbody>';
            
            // Add a row for each timestamp
            stats.forEach((entry, idx) => {
                const time = new Date(parseInt(entry.Timestamp) * 1000).toLocaleTimeString();
                html += '<tr class="transition-colors hover:bg-gray-700 border-b border-gray-800">';
                html += `<td class="px-3 py-2 text-xs text-center text-gray-400 bg-gray-900 sticky left-0 z-10 w-12">${idx + 1}</td>`;
                html += `<td class="px-3 py-2 text-xs text-left text-blue-400 whitespace-nowrap bg-gray-900 sticky left-[48px] z-10 min-w-[120px]">${time}</td>`;
                
                keys.forEach(key => {
                    const value = parseFloat(entry[key]) || 0;
                    const unit = key.includes('Throughput') || key.includes('Bytes') ? 'bps' : 
                                key.includes('Latency') ? 'μs' :
                                key.includes('Rate') ? '/s' : '';
                    const formattedValue = unit ? formatNumber(value, unit) : value.toFixed(0);
                    
                    // Apply color coding based on metric type
                    let colorClass = 'text-white';
                    if (key.includes('Throughput') || key.includes('TCPData')) colorClass = 'text-green-400';
                    else if (key.includes('Failed') || key.includes('Error') || key.includes('Dropped') || key.includes('RST')) colorClass = 'text-red-500';
                    else if (key.includes('Succeeded') || key.includes('Accepted') || key.includes('ACK')) colorClass = 'text-blue-400';
                    else if (key.includes('Rate') || key.includes('Active') || key.includes('Parallel')) colorClass = 'text-yellow-400';
                    else if (key.includes('Latency')) colorClass = 'text-yellow-400';
                    
                    html += `<td class="px-3 py-2 text-xs text-right ${colorClass} whitespace-nowrap">${formattedValue}</td>`;
                });
                html += '</tr>';
            });
            
            html += '</tbody></table>';
        } else {
            // Fallback for empty or invalid data
            html = '<p class="text-gray-400 p-4 text-center">No client statistics available</p>';
        }
        
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
        
        // If test is complete
        if (progress >= 100) {
            clearInterval(progressInterval);
            setTimeout(() => {
                $('#testProgressModal').addClass('hidden');
                $('#testResultsSection').removeClass('hidden');
                
                // Populate Test ID and Duration
                $('#resultTestId').text(testId);
                $('#resultDuration').text($('#testDuration').val() + ' seconds');
                
                // Variables to store stats for chart update
                let finalServerStats = null;
                let finalClientStats = null;
                
                // Get final stats with error handling
                $.ajax({
                    url: window.baseUrl + '/api/server/stats/' + testId,
                    method: 'GET',
                    success: function(serverStats) {
                        finalServerStats = serverStats;
                        updateServerStats(serverStats);
                        
                        // If both stats are loaded, update charts
                        if (finalServerStats && finalClientStats) {
                            updateChartsWithStats(finalServerStats, finalClientStats);
                        }
                    },
                    error: function(xhr) {
                        console.error('Failed to get final server stats:', xhr.status);
                        showAlert('Failed to retrieve server statistics', 'warning');
                    }
                });
                
                $.ajax({
                    url: window.baseUrl + '/api/client/stats/' + testId,
                    method: 'GET',
                    success: function(clientStats) {
                        finalClientStats = clientStats;
                        updateClientStats(clientStats);
                        
                        // If both stats are loaded, update charts
                        if (finalServerStats && finalClientStats) {
                            updateChartsWithStats(finalServerStats, finalClientStats);
                        }
                    },
                    error: function(xhr) {
                        console.error('Failed to get final client stats:', xhr.status);
                        showAlert('Failed to retrieve client statistics', 'warning');
                    }
                });
                
                // Get logs with error handling
                $.ajax({
                    url: window.baseUrl + '/api/server/logs/' + testId,
                    method: 'GET',
                    success: function(response) {
                        const formattedLogs = formatLogs(response.content || '');
                        $('#serverLogsContent').html(formattedLogs);
                    },
                    error: function(xhr) {
                        console.error('Failed to get server logs:', xhr.status);
                        $('#serverLogsContent').html('<p class="text-red-400">Failed to retrieve server logs</p>');
                    }
                });
                
                $.ajax({
                    url: window.baseUrl + '/api/client/logs/' + testId,
                    method: 'GET',
                    success: function(response) {
                        const formattedLogs = formatLogs(response.content || '');
                        $('#clientLogsContent').html(formattedLogs);
                    },
                    error: function(xhr) {
                        console.error('Failed to get client logs:', xhr.status);
                        $('#clientLogsContent').html('<p class="text-red-400">Failed to retrieve client logs</p>');
                    }
                });
            }, 1000);
        }
    }, 1000);
}

// Function to show client logs modal
function showClientLogs() {
    $('#clientLogsModal').removeClass('hidden');
}

// Function to show server logs modal
function showServerLogs() {
    $('#serverLogsModal').removeClass('hidden');
}

// Function to close modal
function closeModal(modalId) {
    $('#' + modalId).addClass('hidden');
}

// Function to update charts with stats data
function updateChartsWithStats(serverStats, clientStats) {
    // Determine if this is a CPS test based on test type
    const testType = $('#testType').val();
    const isConnectionTest = testType === 'cps';
    
    // Parse stats if they're strings
    if (typeof serverStats === 'string') {
        serverStats = JSON.parse(serverStats);
    }
    if (typeof clientStats === 'string') {
        clientStats = JSON.parse(clientStats);
    }
    
    // Ensure stats are arrays
    if (!Array.isArray(serverStats)) {
        serverStats = [serverStats];
    }
    if (!Array.isArray(clientStats)) {
        clientStats = [clientStats];
    }
    
    // Update charts using the global function from performance-charts.js
    if (typeof window.updateCharts === 'function') {
        window.updateCharts({
            serverData: serverStats,
            clientData: clientStats,
            isConnectionTest: isConnectionTest
        });
    } else {
        console.warn('updateCharts function not found. Make sure performance-charts.js is loaded.');
    }
}

// Function to format logs with better styling
function formatLogs(logContent) {
    if (!logContent) return '<p class="text-gray-400">No logs available</p>';
    
    // Add log-container class for styling
    let formattedLogs = `<div class="log-container">`;
    
    // Split by lines
    const lines = logContent.split('\n');
    let inTimestampSection = false;
    let timestampBuffer = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Detect timestamp section start
        if (line.includes('Timestamp:')) {
            // Close previous section if exists
            if (timestampBuffer.length > 0) {
                formattedLogs += formatTimestampSection(timestampBuffer);
                timestampBuffer = [];
            }
            inTimestampSection = true;
            timestampBuffer.push(line);
        }
        // Detect section boundaries
        else if (line.match(/^╭─+╮$/) || line.match(/^╰─+╯$/)) {
            timestampBuffer.push(line);
            if (line.match(/^╰─+╯$/)) {
                // End of section
                formattedLogs += formatTimestampSection(timestampBuffer);
                timestampBuffer = [];
                inTimestampSection = false;
            }
        }
        // Regular lines
        else {
            if (inTimestampSection) {
                timestampBuffer.push(line);
            } else {
                formattedLogs += formatLine(line) + '\n';
            }
        }
    }
    
    // Handle any remaining buffer
    if (timestampBuffer.length > 0) {
        formattedLogs += formatTimestampSection(timestampBuffer);
    }
    
    formattedLogs += '</div>';
    return formattedLogs;
}

// Format individual timestamp sections
function formatTimestampSection(lines) {
    let html = '<div class="log-section">';
    
    for (const line of lines) {
        if (line.includes('Timestamp:')) {
            const timestamp = line.match(/Timestamp:\s*(.+)/)?.[1] || '';
            html += `<div class="log-timestamp">📊 ${timestamp.trim()}</div>\n`;
        } else if (line.includes('Basic Stats') || line.includes('Extended Stats')) {
            html += `<div class="log-stat-header">${line.replace(/[│├─┤]/g, '').trim()}</div>\n`;
        } else if (line.includes('│') && line.includes('│') && !line.match(/^[╭╰├─┤]+$/)) {
            // Parse stat rows
            const parts = line.split('│').filter(p => p.trim());
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts[1].trim();
                
                // Determine value class based on content
                let valueClass = 'log-stat-value';
                if (value.match(/error|failed|dropped|rst/i)) {
                    valueClass += ' error-value';
                } else if (value.match(/\d+\.\d+\s*(Gb\/s|Mb\/s)/)) {
                    valueClass += ' high-value';
                } else if (value.match(/\d+/)) {
                    const num = parseInt(value);
                    if (num > 0) valueClass += ' low-value';
                }
                
                html += `<div class="log-stat-row">
                    <span class="log-stat-key">${escapeHtml(key)}</span>
                    <span class="${valueClass}">${escapeHtml(value)}</span>
                </div>\n`;
            } else {
                html += `<span class="log-box">${escapeHtml(line)}</span>\n`;
            }
        } else {
            html += `<span class="log-box">${escapeHtml(line)}</span>\n`;
        }
    }
    
    html += '</div>';
    return html;
}

// Format individual lines
function formatLine(line) {
    if (!line.trim()) return '';
    
    // Highlight important keywords
    if (line.includes('Test Configuration Summary')) {
        return `<div class="log-header">${escapeHtml(line)}</div>`;
    } else if (line.includes('Test started')) {
        return `<div class="text-green-400 font-bold">${escapeHtml(line)}</div>`;
    } else if (line.includes('Test completed')) {
        return `<div class="text-blue-400 font-bold">${escapeHtml(line)}</div>`;
    } else if (line.match(/^-+$/)) {
        return `<div class="text-gray-600">${escapeHtml(line)}</div>`;
    }
    
    return escapeHtml(line);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Function to export test results to PDF
function exportToPDF() {
    // Show loading indicator
    const exportBtn = $('#exportPDF');
    const originalText = exportBtn.html();
    exportBtn.html('<svg class="animate-spin h-5 w-5 mr-2 inline" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Generating PDF...');
    exportBtn.prop('disabled', true);
    
    // Get the test results section
    const element = document.getElementById('testResultsSection');
    
    // Get test ID and duration for filename
    const testId = $('#resultTestId').text() || 'test';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `cyperf-test-${testId.substring(0, 8)}-${timestamp}.pdf`;
    
    // Temporarily hide all hidden chart containers to prevent rendering errors
    const throughputContainer = document.getElementById('throughputChartsContainer');
    const cpsContainer = document.getElementById('cpsChartsContainer');
    const hiddenContainers = [];
    
    // Track which containers are hidden and temporarily remove them from DOM
    if (throughputContainer && throughputContainer.classList.contains('hidden')) {
        hiddenContainers.push({
            element: throughputContainer,
            parent: throughputContainer.parentNode,
            nextSibling: throughputContainer.nextSibling
        });
        throughputContainer.remove();
    }
    
    if (cpsContainer && cpsContainer.classList.contains('hidden')) {
        hiddenContainers.push({
            element: cpsContainer,
            parent: cpsContainer.parentNode,
            nextSibling: cpsContainer.nextSibling
        });
        cpsContainer.remove();
    }
    
    // PDF options
    const opt = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#1F2937',
            onclone: function(clonedDoc) {
                // Ensure all visible canvases in the clone have proper dimensions
                const canvases = clonedDoc.querySelectorAll('canvas');
                canvases.forEach(canvas => {
                    if (canvas.width === 0 || canvas.height === 0) {
                        // Set minimum dimensions if canvas has zero size
                        canvas.width = 800;
                        canvas.height = 400;
                    }
                });
            }
        },
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait',
            compress: true
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    
    // Generate PDF with proper error handling
    html2pdf().set(opt).from(element).save().then(function() {
        // Restore hidden containers
        hiddenContainers.forEach(item => {
            if (item.nextSibling) {
                item.parent.insertBefore(item.element, item.nextSibling);
            } else {
                item.parent.appendChild(item.element);
            }
        });
        
        // Restore button state
        exportBtn.html(originalText);
        exportBtn.prop('disabled', false);
        showAlert('PDF report generated successfully!', 'success');
    }).catch(function(error) {
        console.error('PDF generation error:', error);
        
        // Restore hidden containers even on error
        hiddenContainers.forEach(item => {
            if (item.nextSibling) {
                item.parent.insertBefore(item.element, item.nextSibling);
            } else {
                item.parent.appendChild(item.element);
            }
        });
        
        exportBtn.html(originalText);
        exportBtn.prop('disabled', false);
        showAlert('Failed to generate PDF report. Please try again.', 'error');
    });
}