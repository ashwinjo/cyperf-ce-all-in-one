#!/usr/bin/env python3
"""
MCP Server for Cyperf CE Controller
Exposes FastAPI endpoints as MCP tools for use in MCP clients
"""

import asyncio
import json
import sys
from typing import Any, Dict, List, Optional
import httpx
from mcp.server import Server
from mcp.types import (
    CallToolRequest,
    CallToolResult,
    ListToolsRequest,
    ListToolsResult,
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource
)
from pydantic import BaseModel

# Configuration
FASTAPI_BASE_URL = "http://localhost:8000"

class MCPCyperfServer:
    def __init__(self):
        self.server = Server("cyperf-ce-controller")
        self.client = httpx.AsyncClient(timeout=30.0)
        self._setup_handlers()

    def _setup_handlers(self):
        @self.server.list_tools()
        async def list_tools() -> List[Tool]:
            return [
                Tool(
                    name="start_cyperf_server",
                    description="Start a Cyperf CE server with specified parameters",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "cps": {
                                "type": "boolean",
                                "description": "Enable connection per second mode",
                                "default": False
                            },
                            "port": {
                                "type": "integer", 
                                "description": "Server port",
                                "default": 5202
                            },
                            "length": {
                                "type": "string",
                                "description": "Packet length (e.g., '1k', '64k')",
                                "default": "1k"
                            },
                            "csv_stats": {
                                "type": "boolean",
                                "description": "Enable CSV statistics output",
                                "default": True
                            },
                            "bidi": {
                                "type": "boolean",
                                "description": "Enable bidirectional mode",
                                "default": False
                            }
                        }
                    }
                ),
                Tool(
                    name="start_cyperf_client",
                    description="Start a Cyperf CE client to connect to a running server",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "test_id": {
                                "type": "string",
                                "description": "Test ID from the server start operation"
                            },
                            "server_ip": {
                                "type": "string", 
                                "description": "IP address of the Cyperf server"
                            },
                            "client_ip": {
                                "type": "string", 
                                "description": "IP address of the client machine where Cyperf client will run"
                            },
                            "cps": {
                                "type": "boolean",
                                "description": "Enable connection per second mode. Mutually exclusive with bitrate",
                                "default": False
                            },
                            "cps_rate_limit": {
                                "type": "string",
                                "description": "CPS rate limit (e.g., '1k/s', '100k/s'). Default is 100000 if cps is enabled. Only used when cps=true"
                            },
                            "port": {
                                "type": "integer",
                                "description": "Server port to connect to",
                                "default": 5202
                            },
                            "length": {
                                "type": "string",
                                "description": "Packet length (e.g., '1k', '64k')",
                                "default": "1k"
                            },
                            "time": {
                                "type": "integer",
                                "description": "Test duration in seconds",
                                "default": 60
                            },
                            "csv_stats": {
                                "type": "boolean",
                                "description": "Enable CSV statistics output",
                                "default": True
                            },
                            "bitrate": {
                                "type": "string",
                                "description": "Target bitrate (e.g., '1M', '100M'). Mutually exclusive with cps"
                            },
                            "parallel": {
                                "type": "integer",
                                "description": "Number of parallel connections",
                                "default": 1
                            },
                            "reverse": {
                                "type": "boolean",
                                "description": "Enable reverse mode",
                                "default": False
                            },
                            "bidi": {
                                "type": "boolean",
                                "description": "Enable bidirectional mode",
                                "default": False
                            },
                            "interval": {
                                "type": "integer",
                                "description": "Statistics reporting interval in seconds"
                            }
                        },
                        "required": ["test_id", "server_ip", "client_ip"]
                    }
                ),
                Tool(
                    name="get_server_stats",
                    description="Get statistics from a running Cyperf server",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "test_id": {
                                "type": "string",
                                "description": "Test ID of the server"
                            }
                        },
                        "required": ["test_id"]
                    }
                ),
                Tool(
                    name="get_client_stats", 
                    description="Get statistics from a running Cyperf client",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "test_id": {
                                "type": "string",
                                "description": "Test ID of the client"
                            }
                        },
                        "required": ["test_id"]
                    }
                ),
                Tool(
                    name="get_server_stats_image",
                    description="Get server statistics as a visual table image",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "test_id": {
                                "type": "string",
                                "description": "Test ID of the server"
                            }
                        },
                        "required": ["test_id"]
                    }
                ),
                Tool(
                    name="get_client_stats_image",
                    description="Get client statistics as a visual table image", 
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "test_id": {
                                "type": "string",
                                "description": "Test ID of the client"
                            }
                        },
                        "required": ["test_id"]
                    }
                    ),
                    Tool(
                        name="get_server_logs",
                        description="Get server log file contents for debugging",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "test_id": {
                                    "type": "string",
                                    "description": "Test ID of the server"
                                }
                            },
                            "required": ["test_id"]
                        }
                    ),
                    Tool(
                        name="get_client_logs",
                        description="Get client log file contents for debugging",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "test_id": {
                                    "type": "string",
                                    "description": "Test ID of the client"
                                }
                            },
                            "required": ["test_id"]
                        }
                    ),
                    Tool(
                        name="stop_server",
                    description="Stop all running Cyperf servers",
                    inputSchema={
                        "type": "object",
                        "properties": {}
                    }
                )
            ]

        @self.server.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent | ImageContent]:
            try:
                if name == "start_cyperf_server":
                    return await self._start_server(arguments)
                elif name == "start_cyperf_client":
                    return await self._start_client(arguments)
                elif name == "get_server_stats":
                    return await self._get_server_stats(arguments)
                elif name == "get_client_stats":
                    return await self._get_client_stats(arguments)
                elif name == "get_server_stats_image":
                    return await self._get_server_stats_image(arguments)
                elif name == "get_client_stats_image":
                    return await self._get_client_stats_image(arguments)
                elif name == "get_server_logs":
                    return await self._get_server_logs(arguments)
                elif name == "get_client_logs":
                    return await self._get_client_logs(arguments)
                elif name == "stop_server":
                    return await self._stop_server(arguments)
                else:
                    return [TextContent(type="text", text=f"Unknown tool: {name}")]
            except Exception as e:
                return [TextContent(type="text", text=f"Error: {str(e)}")]

    async def _start_server(self, arguments: Dict[str, Any]) -> List[TextContent]:
        payload = {
            "params": {
                "cps": arguments.get("cps", False),
                "port": arguments.get("port", 5202),
                "length": arguments.get("length", "1k"),
                "csv_stats": arguments.get("csv_stats", True),
                "bidi": arguments.get("bidi", False)
            }
        }
        
        response = await self.client.post(f"{FASTAPI_BASE_URL}/api/start_server", json=payload)
        response.raise_for_status()
        result = response.json()
        
        return [TextContent(
            type="text", 
            text=f"Server started successfully!\n"
                 f"Test ID: {result['test_id']}\n"
                 f"Server PID: {result['server_pid']}\n"
                 f"Status: {result['status']}\n"
                 f"Message: {result['message']}"
        )]

    async def _start_client(self, arguments: Dict[str, Any]) -> List[TextContent]:
        payload = {
            "test_id": arguments["test_id"],
            "server_ip": arguments["server_ip"],
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
        
        response = await self.client.post(f"{FASTAPI_BASE_URL}/api/start_client", json=payload)
        response.raise_for_status()
        result = response.json()
        
        return [TextContent(
            type="text",
            text=f"Client started successfully!\n"
                 f"Test ID: {result['test_id']}\n"
                 f"Client PID: {result['client_pid']}\n" 
                 f"Status: {result['status']}\n"
                 f"Message: {result['message']}"
        )]

    async def _get_server_stats(self, arguments: Dict[str, Any]) -> List[TextContent]:
        test_id = arguments["test_id"]
        response = await self.client.get(f"{FASTAPI_BASE_URL}/api/server/stats/{test_id}")
        response.raise_for_status()
        stats = response.json()
        
        return [TextContent(
            type="text",
            text=f"Server Statistics for Test ID: {test_id}\n\n{json.dumps(stats, indent=2)}"
        )]

    async def _get_client_stats(self, arguments: Dict[str, Any]) -> List[TextContent]:
        test_id = arguments["test_id"]
        response = await self.client.get(f"{FASTAPI_BASE_URL}/api/client/stats/{test_id}")
        response.raise_for_status()
        stats = response.json()
        
        return [TextContent(
            type="text",
            text=f"Client Statistics for Test ID: {test_id}\n\n{json.dumps(stats, indent=2)}"
        )]

    async def _get_server_stats_image(self, arguments: Dict[str, Any]) -> List[ImageContent]:
        test_id = arguments["test_id"]
        response = await self.client.get(f"{FASTAPI_BASE_URL}/api/server/stats_image/{test_id}")
        response.raise_for_status()
        
        image_data = response.content
        
        return [ImageContent(
            type="image",
            data=image_data,
            mimeType="image/png"
        )]

    async def _get_client_stats_image(self, arguments: Dict[str, Any]) -> List[ImageContent]:
        test_id = arguments["test_id"]
        response = await self.client.get(f"{FASTAPI_BASE_URL}/api/client/stats_image/{test_id}")
        response.raise_for_status()
        
        image_data = response.content
        
        return [ImageContent(
            type="image", 
            data=image_data,
            mimeType="image/png"
        )]

    async def _get_server_logs(self, arguments: Dict[str, Any]) -> List[TextContent]:
        """Get server logs"""
        test_id = arguments["test_id"]
        response = await self.client.get(f"{FASTAPI_BASE_URL}/api/server/logs/{test_id}")
        response.raise_for_status()
        result = response.json()
        
        return [TextContent(
            type="text",
            text=f"Server Logs for Test ID: {test_id}\n\n{result['content']}"
        )]

    async def _get_client_logs(self, arguments: Dict[str, Any]) -> List[TextContent]:
        """Get client logs"""
        test_id = arguments["test_id"]
        response = await self.client.get(f"{FASTAPI_BASE_URL}/api/client/logs/{test_id}")
        response.raise_for_status()
        result = response.json()
        
        return [TextContent(
            type="text",
            text=f"Client Logs for Test ID: {test_id}\n\n{result['content']}"
        )]

    async def _stop_server(self, arguments: Dict[str, Any]) -> List[TextContent]:
        response = await self.client.delete(f"{FASTAPI_BASE_URL}/api/server/cleanup")
        response.raise_for_status()
        result = response.json()
        
        return [TextContent(
            type="text",
            text=f"Server cleanup completed: {json.dumps(result, indent=2)}"
        )]

    async def run(self):
        # Run the MCP server
        from mcp.server.stdio import stdio_server
        
        async with stdio_server() as (read_stream, write_stream):
            await self.server.run(
                read_stream,
                write_stream,
                self.server.create_initialization_options()
            )

async def main():
    server = MCPCyperfServer()
    await server.run()

if __name__ == "__main__":
    asyncio.run(main())
