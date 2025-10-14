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
        if (selectedPreset === 'custom') {
            $('#customConfigSection').slideDown(300);
            resetToDefaultValues();
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
    
    // First hide both parameter sections if not custom
    if (!isCustom) {
        $('#throughputParams, #cpsParams').addClass('hidden');
        return;
    }
    
    // Show appropriate section only for custom testconfiguration
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

// Function to check backend status
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

// Rest of your existing functions...