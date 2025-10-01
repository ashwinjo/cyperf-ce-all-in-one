// Logs Module - Real-time log display and management

let autoScroll = true;
let liveUpdates = true;
let logUpdateInterval = null;

// Initialize logs page
document.addEventListener('DOMContentLoaded', function() {
    initializeLogs();
    startLogUpdates();
});

// Initialize logs functionality
function initializeLogs() {
    console.log('Initializing logs page...');
    
    // Show the log display section
    $('#logDisplaySection').removeClass('hidden');
    
    // Load initial logs
    loadLogs();
    
    // Set up periodic updates
    if (liveUpdates) {
        startLogUpdates();
    }
}

// Start periodic log updates
function startLogUpdates() {
    if (logUpdateInterval) {
        clearInterval(logUpdateInterval);
    }
    
    logUpdateInterval = setInterval(() => {
        if (liveUpdates) {
            loadLogs();
        }
    }, 2000); // Update every 2 seconds
}

// Load logs from server
function loadLogs() {
    $.ajax({
        url: '/api/logs',
        method: 'GET',
        success: function(response) {
            displayLogs(response.logs);
        },
        error: function(xhr, status, error) {
            console.error('Failed to load logs:', error);
        }
    });
}

// Display logs in the containers
function displayLogs(logs) {
    // Group logs by type
    const serverLogs = logs.filter(log => log.source === 'SERVER' || log.source === 'SYSTEM');
    const clientLogs = logs.filter(log => log.source === 'CLIENT' || log.source === 'TEST');
    const apiLogs = logs.filter(log => log.message.includes('[API CALL]') || 
                                     log.message.includes('[API PAYLOAD]') ||
                                     log.message.includes('[API RESPONSE]'));
    
    // Update server logs
    updateLogContainer('serverLogContainer', serverLogs);
    
    // Update client logs  
    updateLogContainer('clientLogContainer', clientLogs);
    
    // Update terminal logs
    updateTerminalLogContainer('terminalLogContainer', logs);
}

// Update a specific log container
function updateLogContainer(containerId, logs) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    if (logs.length === 0) {
        container.innerHTML = `
            <div class="flex items-center justify-center h-full">
                <div class="text-center">
                    <svg class="w-12 h-12 mx-auto text-gray-500 mb-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/>
                    </svg>
                    <p class="text-gray-400">No logs available</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Create log entries
    logs.forEach(log => {
        const logEntry = createLogEntry(log);
        container.appendChild(logEntry);
    });
    
    // Auto-scroll to bottom if enabled
    if (autoScroll) {
        container.scrollTop = container.scrollHeight;
    }
}

// Create a single log entry element
function createLogEntry(log) {
    const logDiv = document.createElement('div');
    logDiv.className = 'log-entry p-3 border-b border-gray-700 hover:bg-gray-750 transition-colors';
    
    // Format timestamp
    const timestamp = new Date(log.timestamp).toLocaleTimeString();
    
    // Determine log level styling
    let levelClass = 'text-gray-300';
    let levelIcon = '•';
    
    switch (log.level) {
        case 'ERROR':
            levelClass = 'text-red-400';
            levelIcon = '✗';
            break;
        case 'SUCCESS':
            levelClass = 'text-green-400';
            levelIcon = '✓';
            break;
        case 'INFO':
            levelClass = 'text-blue-400';
            levelIcon = 'ℹ';
            break;
        default:
            levelClass = 'text-gray-300';
            levelIcon = '•';
    }
    
    logDiv.innerHTML = `
        <div class="flex items-start space-x-3">
            <span class="${levelClass} font-bold text-lg">${levelIcon}</span>
            <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-2 mb-1">
                    <span class="text-xs text-gray-400 font-mono">${timestamp}</span>
                    <span class="text-xs px-2 py-1 rounded ${levelClass} bg-opacity-20 font-semibold">${log.level}</span>
                    <span class="text-xs px-2 py-1 rounded bg-gray-600 text-gray-300">${log.source}</span>
                    ${log.test_id ? `<span class="text-xs px-2 py-1 rounded bg-cyperf-red bg-opacity-20 text-cyperf-red font-mono">TEST: ${log.test_id.slice(-8)}</span>` : ''}
                </div>
                <div class="text-sm text-white break-words">${escapeHtml(log.message)}</div>
            </div>
        </div>
    `;
    
    return logDiv;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Toggle auto-scroll
function toggleAutoScroll() {
    autoScroll = !autoScroll;
    const button = document.getElementById('autoScrollText');
    if (button) {
        button.textContent = `Auto Scroll: ${autoScroll ? 'ON' : 'OFF'}`;
    }
}

// Toggle live updates
function toggleLiveUpdates() {
    liveUpdates = !liveUpdates;
    
    if (liveUpdates) {
        startLogUpdates();
    } else {
        if (logUpdateInterval) {
            clearInterval(logUpdateInterval);
            logUpdateInterval = null;
        }
    }
}

// Clear all logs
function clearLogs() {
    if (confirm('Are you sure you want to clear all logs?')) {
        $.ajax({
            url: '/api/logs/clear',
            method: 'POST',
            success: function(response) {
                console.log('Logs cleared successfully');
                loadLogs(); // Reload to show empty state
            },
            error: function(xhr, status, error) {
                console.error('Failed to clear logs:', error);
                alert('Failed to clear logs. Please try again.');
            }
        });
    }
}

// Update terminal log container
function updateTerminalLogContainer(containerId, logs) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    if (logs.length === 0) {
        container.innerHTML = `
            <div class="flex items-center justify-center h-full">
                <div class="text-center">
                    <svg class="w-12 h-12 mx-auto text-gray-500 mb-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/>
                    </svg>
                    <p class="text-gray-400">No terminal logs available</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Create terminal-style container
    const terminalDiv = document.createElement('div');
    terminalDiv.className = 'font-mono text-sm bg-gray-900 p-4 rounded-lg';
    
    // Process logs
    logs.forEach(log => {
        const logLine = document.createElement('div');
        logLine.className = 'whitespace-pre-wrap break-all mb-1';
        
        // Style based on log type
        if (log.message.includes('[API CALL]')) {
            logLine.className += ' text-blue-400 font-bold';
        } else if (log.message.includes('[API PAYLOAD]')) {
            logLine.className += ' text-purple-400 pl-4';
            // Format JSON payload
            try {
                const payload = JSON.parse(log.message.split('[API PAYLOAD] ')[1]);
                log.message = `[API PAYLOAD] ${JSON.stringify(payload, null, 2)}`;
            } catch (e) {}
        } else if (log.message.includes('[API RESPONSE]')) {
            logLine.className += ' text-green-400 pl-4';
            // Format JSON response
            if (log.message.includes('JSON Response:')) {
                try {
                    const response = JSON.parse(log.message.split('[API RESPONSE] ')[1]);
                    log.message = `[API RESPONSE] ${JSON.stringify(response, null, 2)}`;
                } catch (e) {}
            }
        } else if (log.message.includes('============')) {
            logLine.className += ' text-gray-500';
        } else if (log.level === 'ERROR') {
            logLine.className += ' text-red-400';
        } else if (log.level === 'SUCCESS') {
            logLine.className += ' text-green-400';
        } else {
            logLine.className += ' text-gray-300';
        }
        
        logLine.textContent = log.message;
        terminalDiv.appendChild(logLine);
    });
    
    container.appendChild(terminalDiv);
    
    // Auto-scroll to bottom if enabled
    if (autoScroll) {
        container.scrollTop = container.scrollHeight;
    }
}

// Export logs as text file
function exportLogs() {
    $.ajax({
        url: '/api/logs',
        method: 'GET',
        success: function(response) {
            const logs = response.logs;
            let logText = 'cyperf-ce Test Logs Export\n';
            logText += '================================\n';
            logText += `Exported at: ${new Date().toISOString()}\n`;
            logText += `Total logs: ${logs.length}\n\n`;
            
            logs.forEach(log => {
                const timestamp = new Date(log.timestamp).toISOString();
                logText += `[${timestamp}] [${log.level}] [${log.source}]`;
                if (log.test_id) {
                    logText += ` [TEST: ${log.test_id}]`;
                }
                logText += ` ${log.message}\n`;
            });
            
            // Create and download file
            const blob = new Blob([logText], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cyperf-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        },
        error: function(xhr, status, error) {
            console.error('Failed to export logs:', error);
            alert('Failed to export logs. Please try again.');
        }
    });
}

// Search logs (placeholder for future implementation)
function searchLogs() {
    const searchTerm = document.getElementById('logSearchInput').value.toLowerCase();
    // TODO: Implement log filtering based on search term
    console.log('Searching logs for:', searchTerm);
}

// Refresh server logs
function refreshServerLogs() {
    loadLogs();
}

// Refresh client logs  
function refreshClientLogs() {
    loadLogs();
}

// Download server logs
function downloadServerLogs() {
    exportLogs(); // For now, export all logs
}

// Download client logs
function downloadClientLogs() {
    exportLogs(); // For now, export all logs
}