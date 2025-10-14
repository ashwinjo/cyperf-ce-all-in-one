/**
 * API Trace Module - Real-time API call monitoring
 * Shows all backend API calls with payloads and responses
 */

class APITrace {
    constructor() {
        this.traces = [];
        this.maxTraces = 100;
        this.isVisible = false;
        this.init();
    }

    init() {
        this.createTracePanel();
        this.interceptAjaxCalls();
        this.setupKeyboardShortcut();
    }

    createTracePanel() {
        // Create the trace panel HTML
        const traceHTML = `
            <div id="apiTracePanel" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden">
                <div class="flex h-full">
                    <!-- Main trace panel -->
                    <div class="w-2/3 bg-gray-900 border-r border-gray-600 flex flex-col">
                        <div class="bg-gray-800 px-4 py-3 border-b border-gray-600 flex justify-between items-center">
                            <h3 class="text-white font-semibold">API Trace Monitor</h3>
                            <div class="flex space-x-2">
                                <button onclick="apiTrace.clearTraces()" class="btn-outline btn-sm">
                                    <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clip-rule="evenodd"/>
                                        <path fill-rule="evenodd" d="M10 5a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2H10zm0 2h6v6h-6V7z" clip-rule="evenodd"/>
                                    </svg>
                                    Clear
                                </button>
                                <button onclick="apiTrace.exportTraces()" class="btn-outline btn-sm">
                                    <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"/>
                                    </svg>
                                    Export
                                </button>
                                <button onclick="apiTrace.toggle()" class="btn-outline btn-sm">
                                    <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                                    </svg>
                                    Close
                                </button>
                            </div>
                        </div>
                        
                        <!-- Trace list -->
                        <div class="flex-1 overflow-y-auto custom-scrollbar" id="traceList">
                            <div class="p-4 text-center text-gray-400">
                                <svg class="w-12 h-12 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 11-2 0V4zm9 1a1 1 0 110-2h4a1 1 0 011 1v4a1 1 0 11-2 0V6.414l-2.293 2.293a1 1 0 01-1.414-1.414L13.586 5H12zm-9 7a1 1 0 112 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 110 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 110-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15.586 13H14a1 1 0 01-1-1z" clip-rule="evenodd"/>
                                </svg>
                                <p>No API calls yet</p>
                                <p class="text-sm mt-1">Press <kbd class="px-2 py-1 bg-gray-700 rounded text-xs">Ctrl+Shift+T</kbd> to toggle this panel</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Details panel -->
                    <div class="w-1/3 bg-gray-800 flex flex-col">
                        <div class="bg-gray-700 px-4 py-3 border-b border-gray-600">
                            <h4 class="text-white font-semibold">Request Details</h4>
                        </div>
                        <div class="flex-1 overflow-y-auto custom-scrollbar p-4" id="traceDetails">
                            <div class="text-center text-gray-400 mt-8">
                                <p>Select a trace to view details</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add to body
        document.body.insertAdjacentHTML('beforeend', traceHTML);
    }

    interceptAjaxCalls() {
        const self = this;
        
        // Intercept jQuery AJAX calls
        if (window.jQuery) {
            const originalAjax = jQuery.ajax;
            jQuery.ajax = function(options) {
                const traceId = self.generateTraceId();
                const startTime = Date.now();
                
                // Create trace entry
                const trace = {
                    id: traceId,
                    method: (options.type || options.method || 'GET').toUpperCase(),
                    url: options.url,
                    timestamp: new Date().toISOString(),
                    startTime: startTime,
                    status: 'pending',
                    requestHeaders: options.headers || {},
                    requestData: options.data,
                    responseData: null,
                    responseHeaders: {},
                    duration: null,
                    error: null
                };

                self.addTrace(trace);

                // Store original callbacks
                const originalSuccess = options.success;
                const originalError = options.error;
                const originalComplete = options.complete;

                // Override success callback
                options.success = function(data, textStatus, jqXHR) {
                    const endTime = Date.now();
                    self.updateTrace(traceId, {
                        status: 'success',
                        responseData: data,
                        responseHeaders: self.parseHeaders(jqXHR.getAllResponseHeaders()),
                        duration: endTime - startTime,
                        statusCode: jqXHR.status,
                        statusText: jqXHR.statusText
                    });
                    
                    if (originalSuccess) originalSuccess.apply(this, arguments);
                };

                // Override error callback
                options.error = function(jqXHR, textStatus, errorThrown) {
                    const endTime = Date.now();
                    self.updateTrace(traceId, {
                        status: 'error',
                        responseData: jqXHR.responseText,
                        responseHeaders: self.parseHeaders(jqXHR.getAllResponseHeaders()),
                        duration: endTime - startTime,
                        statusCode: jqXHR.status,
                        statusText: jqXHR.statusText,
                        error: errorThrown
                    });
                    
                    if (originalError) originalError.apply(this, arguments);
                };

                return originalAjax.call(this, options);
            };
        }

        // Intercept fetch calls
        if (window.fetch) {
            const originalFetch = window.fetch;
            window.fetch = function(url, options = {}) {
                const traceId = self.generateTraceId();
                const startTime = Date.now();
                
                const trace = {
                    id: traceId,
                    method: (options.method || 'GET').toUpperCase(),
                    url: url,
                    timestamp: new Date().toISOString(),
                    startTime: startTime,
                    status: 'pending',
                    requestHeaders: options.headers || {},
                    requestData: options.body,
                    responseData: null,
                    responseHeaders: {},
                    duration: null,
                    error: null
                };

                self.addTrace(trace);

                return originalFetch.apply(this, arguments)
                    .then(response => {
                        const endTime = Date.now();
                        
                        // Clone response to read body
                        const responseClone = response.clone();
                        responseClone.text().then(text => {
                            self.updateTrace(traceId, {
                                status: response.ok ? 'success' : 'error',
                                responseData: text,
                                responseHeaders: self.parseHeaders(response.headers),
                                duration: endTime - startTime,
                                statusCode: response.status,
                                statusText: response.statusText
                            });
                        });

                        return response;
                    })
                    .catch(error => {
                        const endTime = Date.now();
                        self.updateTrace(traceId, {
                            status: 'error',
                            duration: endTime - startTime,
                            error: error.message
                        });
                        throw error;
                    });
            };
        }
    }

    generateTraceId() {
        return 'trace_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    addTrace(trace) {
        this.traces.unshift(trace);
        
        // Limit traces
        if (this.traces.length > this.maxTraces) {
            this.traces = this.traces.slice(0, this.maxTraces);
        }
        
        this.updateTraceList();
        this.updateBadge();
    }

    updateTrace(traceId, updates) {
        const trace = this.traces.find(t => t.id === traceId);
        if (trace) {
            Object.assign(trace, updates);
            this.updateTraceList();
        }
    }

    updateTraceList() {
        const traceList = document.getElementById('traceList');
        if (!traceList) return;

        if (this.traces.length === 0) {
            traceList.innerHTML = `
                <div class="p-4 text-center text-gray-400">
                    <svg class="w-12 h-12 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 11-2 0V4zm9 1a1 1 0 110-2h4a1 1 0 011 1v4a1 1 0 11-2 0V6.414l-2.293 2.293a1 1 0 01-1.414-1.414L13.586 5H12zm-9 7a1 1 0 112 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 110 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 110-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15.586 13H14a1 1 0 01-1-1z" clip-rule="evenodd"/>
                    </svg>
                    <p>No API calls yet</p>
                    <p class="text-sm mt-1">Press <kbd class="px-2 py-1 bg-gray-700 rounded text-xs">Ctrl+Shift+T</kbd> to toggle this panel</p>
                </div>
            `;
            return;
        }

        const tracesHTML = this.traces.map(trace => {
            const statusClass = this.getStatusClass(trace.status);
            const methodClass = this.getMethodClass(trace.method);
            
            return `
                <div class="border-b border-gray-700 p-3 hover:bg-gray-800 cursor-pointer" onclick="apiTrace.selectTrace('${trace.id}')">
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex items-center space-x-2">
                            <span class="px-2 py-1 text-xs font-medium rounded ${methodClass}">${trace.method}</span>
                            <span class="px-2 py-1 text-xs font-medium rounded ${statusClass}">${trace.status.toUpperCase()}</span>
                            ${trace.statusCode ? `<span class="text-xs text-gray-400">${trace.statusCode}</span>` : ''}
                        </div>
                        <div class="text-xs text-gray-400">
                            ${trace.duration ? `${trace.duration}ms` : 'pending...'}
                        </div>
                    </div>
                    <div class="text-sm text-white truncate mb-1">${trace.url}</div>
                    <div class="text-xs text-gray-400">${new Date(trace.timestamp).toLocaleTimeString()}</div>
                </div>
            `;
        }).join('');

        traceList.innerHTML = tracesHTML;
    }

    selectTrace(traceId) {
        const trace = this.traces.find(t => t.id === traceId);
        if (!trace) return;

        const detailsPanel = document.getElementById('traceDetails');
        if (!detailsPanel) return;

        const requestDataFormatted = this.formatData(trace.requestData);
        const responseDataFormatted = this.formatData(trace.responseData);

        detailsPanel.innerHTML = `
            <div class="space-y-6">
                <!-- Request Info -->
                <div>
                    <h5 class="text-white font-semibold mb-2">Request</h5>
                    <div class="bg-gray-900 rounded-lg p-3 space-y-2">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Method:</span>
                            <span class="text-white">${trace.method}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">URL:</span>
                            <span class="text-white text-sm break-all">${trace.url}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Time:</span>
                            <span class="text-white">${new Date(trace.timestamp).toLocaleString()}</span>
                        </div>
                        ${trace.duration ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">Duration:</span>
                            <span class="text-white">${trace.duration}ms</span>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Request Headers -->
                ${Object.keys(trace.requestHeaders).length > 0 ? `
                <div>
                    <h5 class="text-white font-semibold mb-2">Request Headers</h5>
                    <div class="bg-gray-900 rounded-lg p-3">
                        <pre class="text-xs text-gray-300 whitespace-pre-wrap">${JSON.stringify(trace.requestHeaders, null, 2)}</pre>
                    </div>
                </div>
                ` : ''}

                <!-- Request Payload -->
                ${trace.requestData ? `
                <div>
                    <h5 class="text-white font-semibold mb-2">Request Payload</h5>
                    <div class="bg-gray-900 rounded-lg p-3">
                        <pre class="text-xs text-gray-300 whitespace-pre-wrap custom-scrollbar" style="max-height: 200px; overflow-y: auto;">${requestDataFormatted}</pre>
                    </div>
                </div>
                ` : ''}

                <!-- Response Info -->
                <div>
                    <h5 class="text-white font-semibold mb-2">Response</h5>
                    <div class="bg-gray-900 rounded-lg p-3 space-y-2">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Status:</span>
                            <span class="text-white">${trace.status.toUpperCase()}</span>
                        </div>
                        ${trace.statusCode ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">Status Code:</span>
                            <span class="text-white">${trace.statusCode} ${trace.statusText || ''}</span>
                        </div>
                        ` : ''}
                        ${trace.error ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">Error:</span>
                            <span class="text-red-400">${trace.error}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Response Headers -->
                ${Object.keys(trace.responseHeaders).length > 0 ? `
                <div>
                    <h5 class="text-white font-semibold mb-2">Response Headers</h5>
                    <div class="bg-gray-900 rounded-lg p-3">
                        <pre class="text-xs text-gray-300 whitespace-pre-wrap">${JSON.stringify(trace.responseHeaders, null, 2)}</pre>
                    </div>
                </div>
                ` : ''}

                <!-- Response Data -->
                ${trace.responseData ? `
                <div>
                    <h5 class="text-white font-semibold mb-2">Response Data</h5>
                    <div class="bg-gray-900 rounded-lg p-3">
                        <pre class="text-xs text-gray-300 whitespace-pre-wrap custom-scrollbar" style="max-height: 300px; overflow-y: auto;">${responseDataFormatted}</pre>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    formatData(data) {
        if (!data) return 'No data';
        
        if (typeof data === 'string') {
            try {
                return JSON.stringify(JSON.parse(data), null, 2);
            } catch (e) {
                return data;
            }
        }
        
        if (typeof data === 'object') {
            return JSON.stringify(data, null, 2);
        }
        
        return String(data);
    }

    getStatusClass(status) {
        switch (status) {
            case 'success': return 'bg-green-600 text-white';
            case 'error': return 'bg-red-600 text-white';
            case 'pending': return 'bg-yellow-600 text-white';
            default: return 'bg-gray-600 text-white';
        }
    }

    getMethodClass(method) {
        switch (method) {
            case 'GET': return 'bg-blue-600 text-white';
            case 'POST': return 'bg-green-600 text-white';
            case 'PUT': return 'bg-orange-600 text-white';
            case 'DELETE': return 'bg-red-600 text-white';
            default: return 'bg-gray-600 text-white';
        }
    }

    parseHeaders(headers) {
        if (!headers) return {};
        
        if (typeof headers === 'string') {
            const headerObj = {};
            headers.split('\r\n').forEach(line => {
                const parts = line.split(': ');
                if (parts.length === 2) {
                    headerObj[parts[0]] = parts[1];
                }
            });
            return headerObj;
        }
        
        if (headers instanceof Headers) {
            const headerObj = {};
            for (let [key, value] of headers.entries()) {
                headerObj[key] = value;
            }
            return headerObj;
        }
        
        return headers;
    }

    setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    toggle() {
        this.isVisible = !this.isVisible;
        const panel = document.getElementById('apiTracePanel');
        if (panel) {
            if (this.isVisible) {
                panel.classList.remove('hidden');
            } else {
                panel.classList.add('hidden');
            }
        }
    }

    show() {
        this.isVisible = true;
        const panel = document.getElementById('apiTracePanel');
        if (panel) {
            panel.classList.remove('hidden');
        }
    }

    hide() {
        this.isVisible = false;
        const panel = document.getElementById('apiTracePanel');
        if (panel) {
            panel.classList.add('hidden');
        }
    }

    updateBadge() {
        const badge = document.getElementById('apiCallBadge');
        if (badge) {
            const count = this.traces.length;
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count.toString();
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    clearTraces() {
        this.traces = [];
        this.updateTraceList();
        this.updateBadge();
        
        // Clear details panel
        const detailsPanel = document.getElementById('traceDetails');
        if (detailsPanel) {
            detailsPanel.innerHTML = `
                <div class="text-center text-gray-400 mt-8">
                    <p>Select a trace to view details</p>
                </div>
            `;
        }
    }

    exportTraces() {
        const data = {
            timestamp: new Date().toISOString(),
            traces: this.traces
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `api-traces-${new Date().toISOString().slice(0, 19)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize API trace when DOM is ready
let apiTrace;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        apiTrace = new APITrace();
        window.apiTrace = apiTrace;
    });
} else {
    // DOM is already loaded
    apiTrace = new APITrace();
    window.apiTrace = apiTrace;
}
