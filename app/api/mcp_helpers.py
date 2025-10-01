"""
Helper functions for MCP (Model Context Protocol) implementation
"""

import json
from typing import Dict, Any, List
from app.api.models import ServerRequest, ClientRequest
from app.services.cyperf_service import CyperfService

cyperf_service = CyperfService()


def _get_mcp_tools() -> List[Dict[str, Any]]:
    """Return the list of available MCP tools"""
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
                    "csv_stats": {"type": "boolean", "description": "Enable CSV statistics output", "default": True},
                    "bidi": {"type": "boolean", "description": "Enable bidirectional mode", "default": False}
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
                    "cps": {"type": "boolean", "description": "Enable connection per second mode. Mutually exclusive with bitrate", "default": False},
                    "cps_rate_limit": {"type": "string", "description": "CPS rate limit (e.g., '1k/s', '100k/s'). Default is 100000 if cps is enabled. Only used when cps=true"},
                    "port": {"type": "integer", "description": "Server port to connect to", "default": 5202},
                    "length": {"type": "string", "description": "Packet length (e.g., '1k', '64k')", "default": "1k"},
                    "time": {"type": "integer", "description": "Test duration in seconds", "default": 60},
                    "csv_stats": {"type": "boolean", "description": "Enable CSV statistics output", "default": True},
                    "bitrate": {"type": "string", "description": "Target bitrate (e.g., '1M', '100M'). Mutually exclusive with cps"},
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
            "description": "Stop and cleanup all running Cyperf server processes on a specific machine",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "server_ip": {"type": "string", "description": "IP address of the server machine where Cyperf servers should be stopped and cleaned up"}
                },
                "required": ["server_ip"]
            }
        }
    ]


async def _handle_mcp_tool_call(tool_name: str, arguments: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Handle MCP tool calls and return appropriate responses"""
    
    if tool_name == "start_cyperf_server":
        return await _mcp_start_server(arguments)
    elif tool_name == "start_cyperf_client":
        return await _mcp_start_client(arguments)
    elif tool_name == "get_server_stats":
        return await _mcp_get_server_stats(arguments)
    elif tool_name == "get_client_stats":
        return await _mcp_get_client_stats(arguments)
    elif tool_name == "get_server_stats_image":
        return await _mcp_get_server_stats_image(arguments)
    elif tool_name == "get_client_stats_image":
        return await _mcp_get_client_stats_image(arguments)
    elif tool_name == "get_server_logs":
        return await _mcp_get_server_logs(arguments)
    elif tool_name == "get_client_logs":
        return await _mcp_get_client_logs(arguments)
    elif tool_name == "stop_server":
        return await _mcp_stop_server(arguments)
    else:
        raise Exception(f"Unknown tool: {tool_name}")


async def _mcp_start_server(arguments: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Start Cyperf server via MCP"""
    server_ip = arguments["server_ip"]
    payload = {
        "params": {
            "cps": arguments.get("cps", False),
            "port": arguments.get("port", 5202),
            "length": arguments.get("length", "1k"),
            "csv_stats": arguments.get("csv_stats", True),
            "bidi": arguments.get("bidi", False)
        }
    }
    
    # Call the service directly
    test_id = str(__import__('uuid').uuid4())
    result = cyperf_service.start_server(test_id, server_ip, payload["params"])
    
    return [{
        "type": "text",
        "text": f"Server started successfully!\n"
               f"Test ID: {test_id}\n"
               f"Server IP: {server_ip}\n"
               f"Server PID: {result['server_pid']}\n"
               f"Status: SERVER_RUNNING\n"
               f"Message: Cyperf server started. Use test_id for all related operations."
    }]


async def _mcp_start_client(arguments: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Start Cyperf client via MCP"""
    test_id = arguments["test_id"]
    server_ip = arguments["server_ip"]
    client_ip = arguments["client_ip"]
    params = {
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
    
    result = cyperf_service.start_client(test_id, server_ip, client_ip, params)
    
    return [{
        "type": "text",
        "text": f"Client started successfully!\n"
               f"Test ID: {test_id}\n"
               f"Server IP: {server_ip}\n"
               f"Client IP: {client_ip}\n"
               f"Client PID: {result['client_pid']}\n"
               f"Status: CLIENT_RUNNING\n"
               f"Message: Cyperf client started and linked to server."
    }]


async def _mcp_get_server_stats(arguments: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Get server statistics via MCP"""
    test_id = arguments["test_id"]
    stats = cyperf_service.get_server_stats(test_id)
    
    return [{
        "type": "text",
        "text": f"Server Statistics for Test ID: {test_id}\n\n{json.dumps(stats, indent=2)}"
    }]


async def _mcp_get_client_stats(arguments: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Get client statistics via MCP"""
    test_id = arguments["test_id"]
    stats = cyperf_service.get_client_stats(test_id)
    
    return [{
        "type": "text",
        "text": f"Client Statistics for Test ID: {test_id}\n\n{json.dumps(stats, indent=2)}"
    }]


async def _mcp_get_server_stats_image(arguments: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Get server statistics image via MCP"""
    import base64
    
    test_id = arguments["test_id"]
    stats = cyperf_service.get_server_stats(test_id)
    img_bytes = cyperf_service.stats_to_image(stats)
    
    # Read the image bytes and encode as base64
    img_bytes.seek(0)
    image_data = img_bytes.read()
    image_b64 = base64.b64encode(image_data).decode('utf-8')
    
    return [{
        "type": "image",
        "data": image_b64,
        "mimeType": "image/png"
    }]


async def _mcp_get_client_stats_image(arguments: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Get client statistics image via MCP"""
    import base64
    
    test_id = arguments["test_id"]
    stats = cyperf_service.get_client_stats(test_id)
    img_bytes = cyperf_service.stats_to_image(stats)
    
    # Read the image bytes and encode as base64
    img_bytes.seek(0)
    image_data = img_bytes.read()
    image_b64 = base64.b64encode(image_data).decode('utf-8')
    
    return [{
        "type": "image",
        "data": image_b64,
        "mimeType": "image/png"
    }]


async def _mcp_get_server_logs(arguments: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Get server logs via MCP"""
    test_id = arguments["test_id"]
    logs = cyperf_service.read_server_logs(test_id)
    
    return [{
        "type": "text",
        "text": f"Server Logs for Test ID: {test_id}\n\n{logs}"
    }]


async def _mcp_get_client_logs(arguments: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Get client logs via MCP"""
    test_id = arguments["test_id"]
    logs = cyperf_service.read_client_logs(test_id)
    
    return [{
        "type": "text",
        "text": f"Client Logs for Test ID: {test_id}\n\n{logs}"
    }]


async def _mcp_stop_server(arguments: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Stop server via MCP"""
    server_ip = arguments["server_ip"]
    result = cyperf_service.stop_server(server_ip)
    
    return [{
        "type": "text",
        "text": f"Server cleanup completed on {server_ip}: {json.dumps(result, indent=2)}"
    }]
