#!/usr/bin/env python3
"""
MCP SSE (Server-Sent Events) Server for Cyperf CE Controller
Provides a streamable HTTP interface for MCP clients using SSE
"""

import asyncio
import json
import logging
import os
import sys
from typing import Any, Dict, List, Optional
import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
def get_fastapi_base_url():
    return os.getenv("FASTAPI_BASE_URL", "http://localhost:8000")

FASTAPI_BASE_URL = get_fastapi_base_url()

class MCPSSEServer:
    def __init__(self):
        self.app = FastAPI(
            title="MCP SSE Server for Cyperf CE Controller",
            description="Server-Sent Events based MCP server for Cyperf operations",
            version="1.0.0"
        )
        self.client = httpx.AsyncClient(timeout=30.0)
        self._setup_middleware()
        self._setup_routes()

    def _setup_middleware(self):
        """Setup CORS middleware for cross-origin requests"""
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    def _setup_routes(self):
        """Setup MCP SSE routes"""
        
        @self.app.get("/")
        async def root():
            return {
                "name": "MCP SSE Server for Cyperf CE Controller",
                "version": "1.0.0",
                "protocol": "mcp",
                "transport": "sse",
                "endpoints": {
                    "sse_get": "/sse (GET) - Browser-friendly SSE test",
                    "sse_post": "/sse (POST) - MCP JSON-RPC over SSE",
                    "health": "/health - Health check",
                    "test": "/test - HTML test page"
                }
            }

        @self.app.get("/test")
        async def test_page():
            """Simple HTML test page for SSE connection"""
            html_content = """
            <!DOCTYPE html>
            <html>
            <head>
                <title>MCP SSE Server Test</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    .container { max-width: 800px; }
                    .log { 
                        background: #f5f5f5; 
                        border: 1px solid #ddd; 
                        padding: 20px; 
                        height: 400px; 
                        overflow-y: auto; 
                        white-space: pre-wrap;
                        font-family: monospace;
                    }
                    button { 
                        padding: 10px 20px; 
                        margin: 10px 5px; 
                        background: #007cba; 
                        color: white; 
                        border: none; 
                        cursor: pointer; 
                    }
                    button:hover { background: #005a87; }
                    .status { padding: 10px; margin: 10px 0; }
                    .connected { background: #d4edda; color: #155724; }
                    .disconnected { background: #f8d7da; color: #721c24; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>MCP SSE Server Test</h1>
                    <p>Test the Server-Sent Events connection to your MCP server.</p>
                    
                    <div id="status" class="status disconnected">Disconnected</div>
                    
                    <button onclick="connect()">Connect SSE</button>
                    <button onclick="disconnect()">Disconnect</button>
                    <button onclick="clearLog()">Clear Log</button>
                    
                    <h3>Event Log:</h3>
                    <div id="log" class="log">Click "Connect SSE" to start receiving events...</div>
                </div>

                <script>
                    let eventSource = null;
                    const log = document.getElementById('log');
                    const status = document.getElementById('status');

                    function updateStatus(connected) {
                        if (connected) {
                            status.textContent = 'Connected to SSE stream';
                            status.className = 'status connected';
                        } else {
                            status.textContent = 'Disconnected';
                            status.className = 'status disconnected';
                        }
                    }

                    function addToLog(message) {
                        const timestamp = new Date().toLocaleTimeString();
                        log.textContent += `[${timestamp}] ${message}\\n`;
                        log.scrollTop = log.scrollHeight;
                    }

                    function connect() {
                        if (eventSource) {
                            eventSource.close();
                        }

                        addToLog('Connecting to SSE endpoint...');
                        eventSource = new EventSource('/sse');

                        eventSource.onopen = function(event) {
                            updateStatus(true);
                            addToLog('SSE connection opened');
                        };

                        eventSource.onmessage = function(event) {
                            addToLog('Data: ' + event.data);
                        };

                        eventSource.onerror = function(event) {
                            addToLog('SSE error occurred');
                            updateStatus(false);
                        };

                        eventSource.addEventListener('close', function(event) {
                            addToLog('Server closed the connection');
                            disconnect();
                        });
                    }

                    function disconnect() {
                        if (eventSource) {
                            eventSource.close();
                            eventSource = null;
                        }
                        updateStatus(false);
                        addToLog('Disconnected from SSE');
                    }

                    function clearLog() {
                        log.textContent = '';
                    }
                </script>
            </body>
            </html>
            """
            from fastapi.responses import HTMLResponse
            return HTMLResponse(content=html_content)

        @self.app.options("/sse")
        async def mcp_sse_options():
            """Handle CORS preflight requests for SSE endpoint"""
            return Response(
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
                    "Access-Control-Max-Age": "86400",
                }
            )

        @self.app.get("/sse")
        async def mcp_sse_get_endpoint(request: Request):
            """
            MCP SSE GET endpoint for browser connections
            Returns a simple SSE stream for testing
            """
            async def event_stream():
                yield f"data: {json.dumps({'message': 'MCP SSE Server Ready', 'server': 'cyperf-ce-controller-sse', 'version': '1.0.0'})}\n\n"
                
                # Send available tools
                tools = await self._get_mcp_tools()
                yield f"data: {json.dumps({'available_tools': [tool['name'] for tool in tools]})}\n\n"
                
                # Keep connection alive with periodic pings
                import asyncio
                for i in range(10):  # Send 10 pings then close
                    await asyncio.sleep(2)
                    yield f"data: {json.dumps({'ping': i + 1, 'timestamp': str(__import__('datetime').datetime.now())})}\n\n"
                
                yield "event: close\ndata: {}\n\n"

            return StreamingResponse(
                event_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive"
                }
            )

        @self.app.post("/sse")
        async def mcp_sse_endpoint(request: Request):
            """
            MCP Server-Sent Events endpoint - Handle regular HTTP requests for now
            The mcp-remote client seems to have issues with our SSE implementation
            """
            try:
                body = await request.json()
                logger.info(f"Received MCP request: {body}")
                
                # Handle MCP JSON-RPC requests
                if "method" in body:
                    method = body["method"]
                    params = body.get("params", {})
                    request_id = body.get("id")
                    
                    if method == "initialize":
                        response = {
                            "jsonrpc": "2.0",
                            "id": request_id,
                            "result": {
                                "protocolVersion": "2024-11-05",
                                "capabilities": {
                                    "tools": {},
                                    "logging": {}
                                },
                                "serverInfo": {
                                    "name": "cyperf-ce-controller-sse",
                                    "version": "1.0.0"
                                }
                            }
                        }
                        return response
                        
                    elif method == "tools/list":
                        tools = await self._get_mcp_tools()
                        response = {
                            "jsonrpc": "2.0",
                            "id": request_id,
                            "result": {
                                "tools": tools
                            }
                        }
                        return response
                        
                    elif method == "tools/call":
                        tool_name = params.get("name")
                        arguments = params.get("arguments", {})
                        
                        try:
                            result = await self._handle_mcp_tool_call(tool_name, arguments)
                            
                            response = {
                                "jsonrpc": "2.0",
                                "id": request_id,
                                "result": {
                                    "content": result
                                }
                            }
                            return response
                            
                        except Exception as e:
                            logger.error(f"Tool call error: {e}")
                            response = {
                                "jsonrpc": "2.0",
                                "id": request_id,
                                "error": {
                                    "code": -32000,
                                    "message": str(e)
                                }
                            }
                            return response
                    
                    else:
                        response = {
                            "jsonrpc": "2.0",
                            "id": request_id,
                            "error": {
                                "code": -32601,
                                "message": f"Method not found: {method}"
                            }
                        }
                        return response
                        
            except Exception as e:
                logger.error(f"Request error: {e}")
                error_response = {
                    "jsonrpc": "2.0",
                    "id": None,
                    "error": {
                        "code": -32700,
                        "message": f"Parse error: {str(e)}"
                    }
                }
                return error_response

        @self.app.get("/health")
        async def health_check():
            """Health check endpoint"""
            try:
                # Test connection to main FastAPI app
                response = await self.client.get(f"{get_fastapi_base_url()}/docs")
                if response.status_code == 200:
                    return {"status": "healthy", "fastapi": "connected"}
                else:
                    return {"status": "unhealthy", "fastapi": "disconnected"}
            except Exception as e:
                return {"status": "unhealthy", "error": str(e)}

    async def _get_mcp_tools(self) -> List[Dict[str, Any]]:
        """Get list of available MCP tools"""
        return [
            {
                "name": "start_cyperf_server",
                "description": "Start a Cyperf CE server with specified parameters",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "server_ip": {"type": "string", "description": "IP address of the server machine where Cyperf server will run"},
                        "cps": {"type": "boolean", "description": "Enable connection per second mode", "default": False},
                        "port": {"type": "integer", "description": "Server port", "default": 5202},
                        "length": {"type": "string", "description": "Packet length (e.g., '1k', '64k')", "default": "1k"},
                        "csv_stats": {"type": "boolean", "description": "Enable CSV statistics output", "default": True}
                    },
                    "required": ["server_ip"]
                }
            },
            {
                "name": "start_cyperf_client",
                "description": "Start a Cyperf CE client to connect to a running server",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "test_id": {"type": "string", "description": "Test ID from the server start operation"},
                        "server_ip": {"type": "string", "description": "IP address of the Cyperf server"},
                        "client_ip": {"type": "string", "description": "IP address of the client machine where Cyperf client will run"},
                        "cps": {"type": "boolean", "description": "Enable connection per second mode", "default": False},
                        "port": {"type": "integer", "description": "Server port to connect to", "default": 5202},
                        "length": {"type": "string", "description": "Packet length (e.g., '1k', '64k')", "default": "1k"},
                        "time": {"type": "integer", "description": "Test duration in seconds", "default": 60},
                        "csv_stats": {"type": "boolean", "description": "Enable CSV statistics output", "default": True},
                        "bitrate": {"type": "string", "description": "Target bitrate (e.g., '1M', '100M')"},
                        "parallel": {"type": "integer", "description": "Number of parallel connections", "default": 1},
                        "reverse": {"type": "boolean", "description": "Enable reverse mode", "default": False},
                        "bidi": {"type": "boolean", "description": "Enable bidirectional mode", "default": False},
                        "interval": {"type": "integer", "description": "Statistics reporting interval in seconds"}
                    },
                    "required": ["test_id", "server_ip", "client_ip"]
                }
            },
            {
                "name": "get_server_stats",
                "description": "Get statistics from a running Cyperf server",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "test_id": {"type": "string", "description": "Test ID of the server"}
                    },
                    "required": ["test_id"]
                }
            },
            {
                "name": "get_client_stats",
                "description": "Get statistics from a running Cyperf client",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "test_id": {"type": "string", "description": "Test ID of the client"}
                    },
                    "required": ["test_id"]
                }
            },
            {
                "name": "get_server_stats_image",
                "description": "Get server statistics as a visual table image",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "test_id": {"type": "string", "description": "Test ID of the server"}
                    },
                    "required": ["test_id"]
                }
            },
            {
                "name": "get_client_stats_image",
                "description": "Get client statistics as a visual table image",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "test_id": {"type": "string", "description": "Test ID of the client"}
                    },
                    "required": ["test_id"]
                }
            },
            {
                "name": "get_server_logs",
                "description": "Get server log file contents for debugging",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "test_id": {"type": "string", "description": "Test ID of the server"}
                    },
                    "required": ["test_id"]
                }
            },
            {
                "name": "get_client_logs",
                "description": "Get client log file contents for debugging",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "test_id": {"type": "string", "description": "Test ID of the client"}
                    },
                    "required": ["test_id"]
                }
            },
            {
                "name": "stop_server",
                "description": "Stop all running Cyperf servers on a specific machine",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "server_ip": {"type": "string", "description": "IP address of the server machine where Cyperf servers should be stopped"}
                    },
                    "required": ["server_ip"]
                }
            }
        ]

    async def _handle_mcp_tool_call(self, tool_name: str, arguments: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Handle MCP tool calls by proxying to the main FastAPI app"""
        
        if tool_name == "start_cyperf_server":
            return await self._proxy_start_server(arguments)
        elif tool_name == "start_cyperf_client":
            return await self._proxy_start_client(arguments)
        elif tool_name == "get_server_stats":
            return await self._proxy_get_server_stats(arguments)
        elif tool_name == "get_client_stats":
            return await self._proxy_get_client_stats(arguments)
        elif tool_name == "get_server_stats_image":
            return await self._proxy_get_server_stats_image(arguments)
        elif tool_name == "get_client_stats_image":
            return await self._proxy_get_client_stats_image(arguments)
        elif tool_name == "get_server_logs":
            result = await self._proxy_get_server_logs(arguments)
            return [{
                "type": "text", 
                "text": f"Server Logs for Test ID: {arguments['test_id']}\n\n{result['content']}"
            }]
        elif tool_name == "get_client_logs":
            result = await self._proxy_get_client_logs(arguments)
            return [{
                "type": "text", 
                "text": f"Client Logs for Test ID: {arguments['test_id']}\n\n{result['content']}"
            }]
        elif tool_name == "stop_server":
            return await self._proxy_stop_server(arguments)
        else:
            raise Exception(f"Unknown tool: {tool_name}")

    async def _proxy_start_server(self, arguments: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Proxy server start to main FastAPI app"""
        payload = {
            "server_ip": arguments["server_ip"],
            "params": {
                "cps": arguments.get("cps", False),
                "port": arguments.get("port", 5202),
                "length": arguments.get("length", "1k"),
                "csv_stats": arguments.get("csv_stats", True)
            }
        }
        
        response = await self.client.post(f"{get_fastapi_base_url()}/api/start_server", json=payload)
        response.raise_for_status()
        result = response.json()
        
        return [{
            "type": "text",
            "text": f"Server started successfully!\n"
                   f"Test ID: {result['test_id']}\n"
                   f"Server PID: {result['server_pid']}\n"
                   f"Status: {result['status']}\n"
                   f"Message: {result['message']}"
        }]

    async def _proxy_start_client(self, arguments: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Proxy client start to main FastAPI app"""
        payload = {
            "test_id": arguments["test_id"],
            "server_ip": arguments["server_ip"],
            "client_ip": arguments["client_ip"],
            "params": {
                "cps": arguments.get("cps"),
                "port": arguments.get("port", 5202),
                "length": arguments.get("length", "1k"),
                "time": arguments.get("time", 60),
                "csv_stats": arguments.get("csv_stats", True),
                "bitrate": arguments.get("bitrate"),
                "parallel": arguments.get("parallel", 1),
                "reverse": arguments.get("reverse", False),
                "bidi": arguments.get("bidi", False),
                "interval": arguments.get("interval")
            }
        }
        
        response = await self.client.post(f"{get_fastapi_base_url()}/api/start_client", json=payload)
        response.raise_for_status()
        result = response.json()
        
        return [{
            "type": "text",
            "text": f"Client started successfully!\n"
                   f"Test ID: {result['test_id']}\n"
                   f"Client PID: {result['client_pid']}\n"
                   f"Status: {result['status']}\n"
                   f"Message: {result['message']}"
        }]

    async def _proxy_get_server_stats(self, arguments: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Proxy server stats to main FastAPI app"""
        test_id = arguments["test_id"]
        response = await self.client.get(f"{get_fastapi_base_url()}/api/server/stats/{test_id}")
        response.raise_for_status()
        stats = response.json()
        
        return [{
            "type": "text",
            "text": f"Server Statistics for Test ID: {test_id}\n\n{json.dumps(stats, indent=2)}"
        }]

    async def _proxy_get_client_stats(self, arguments: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Proxy client stats to main FastAPI app"""
        test_id = arguments["test_id"]
        response = await self.client.get(f"{get_fastapi_base_url()}/api/client/stats/{test_id}")
        response.raise_for_status()
        stats = response.json()
        
        return [{
            "type": "text",
            "text": f"Client Statistics for Test ID: {test_id}\n\n{json.dumps(stats, indent=2)}"
        }]

    async def _proxy_get_server_stats_image(self, arguments: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Proxy server stats image to main FastAPI app"""
        import base64
        
        test_id = arguments["test_id"]
        response = await self.client.get(f"{get_fastapi_base_url()}/api/server/stats_image/{test_id}")
        response.raise_for_status()
        
        image_data = response.content
        image_b64 = base64.b64encode(image_data).decode('utf-8')

        return [{
            "type": "image",
            "data": image_b64,
            "mimeType": "image/png"
        }]

    async def _proxy_get_client_stats_image(self, arguments: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Proxy client stats image to main FastAPI app"""
        import base64
        
        test_id = arguments["test_id"]
        response = await self.client.get(f"{get_fastapi_base_url()}/api/client/stats_image/{test_id}")
        response.raise_for_status()
        
        image_data = response.content
        image_b64 = base64.b64encode(image_data).decode('utf-8')
        
        return [{
            "type": "image",
            "data": image_b64,
            "mimeType": "image/png"
        }]

    async def _proxy_get_server_logs(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Proxy get server logs to FastAPI"""
        test_id = arguments["test_id"]
        response = await self.client.get(f"{get_fastapi_base_url()}/api/server/logs/{test_id}")
        response.raise_for_status()
        return response.json()

    async def _proxy_get_client_logs(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Proxy get client logs to FastAPI"""
        test_id = arguments["test_id"]
        response = await self.client.get(f"{get_fastapi_base_url()}/api/client/logs/{test_id}")
        response.raise_for_status()
        return response.json()

    async def _proxy_stop_server(self, arguments: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Proxy server stop to main FastAPI app"""
        server_ip = arguments["server_ip"]
        response = await self.client.delete(f"{get_fastapi_base_url()}/api/server/cleanup", json={"server_ip": server_ip})
        response.raise_for_status()
        result = response.json()
        
        return [{
            "type": "text",
            "text": f"Server cleanup completed on {server_ip}: {json.dumps(result, indent=2)}"
        }]

    def run(self, host: str = "0.0.0.0", port: int = 8001):
        """Run the MCP SSE server"""
        logger.info(f"Starting MCP SSE Server on {host}:{port}")
        logger.info(f"Proxying to FastAPI app at {os.getenv('FASTAPI_BASE_URL', 'http://localhost:8000')}")
        uvicorn.run(self.app, host=host, port=port, log_level="info")

def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="MCP SSE Server for Cyperf CE Controller")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8001, help="Port to bind to")
    parser.add_argument("--fastapi-url", default="http://localhost:8000", help="FastAPI base URL")
    
    args = parser.parse_args()
    
    # Update global configuration
    global FASTAPI_BASE_URL
    FASTAPI_BASE_URL = args.fastapi_url
    
    # Create and run server
    server = MCPSSEServer()
    server.run(host=args.host, port=args.port)

if __name__ == "__main__":
    main()
