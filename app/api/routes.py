from fastapi import APIRouter, HTTPException, Request
from app.api.models import ServerRequest, ClientRequest, TestResponse
from app.services.cyperf_service import CyperfService
import uuid
from fastapi.responses import StreamingResponse
from app.api.mcp_helpers import _get_mcp_tools, _handle_mcp_tool_call

router = APIRouter()
cyperf_service = CyperfService()

@router.post("/start_server", tags=["Cyperf CE Server"], response_model=TestResponse)
async def start_server(request: ServerRequest):
    test_id = str(uuid.uuid4())
    try:
        result = cyperf_service.start_server(test_id, request.server_ip, request.params.dict())
        return TestResponse(
            test_id=test_id,
            server_pid=result["server_pid"],
            status="SERVER_RUNNING",
            message="Cyperf server started. Use test_id for all related operations."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/start_client", tags=["Cyperf CE Client"],response_model=TestResponse)
async def start_client(request: ClientRequest):
    try:
        result = cyperf_service.start_client(
            request.test_id,
            request.server_ip,
            request.client_ip,
            request.params.dict()
        )
        return TestResponse(
            test_id=request.test_id,
            client_pid=result["client_pid"],
            status="CLIENT_RUNNING",
            message="Cyperf client started and linked to server."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/server/stats/{test_id}", tags=["Cyperf CE Server"])
async def get_server_stats(test_id: str):
    try:
        stats = cyperf_service.get_server_stats(test_id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/client/stats/{test_id}", tags=["Cyperf CE Client"])
async def get_client_stats(test_id: str):
    try:
        stats = cyperf_service.get_client_stats(test_id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.delete("/server/cleanup", tags=["Cyperf CE Server"])
async def stop_server():
    try:
        result = cyperf_service.stop_server()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/server/stats_image/{test_id}", tags=["Cyperf CE Server"])
async def get_server_stats_image(test_id: str):
    try:
        stats = cyperf_service.get_server_stats(test_id)
        img_bytes = cyperf_service.stats_to_image(stats)
        return StreamingResponse(img_bytes, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/client/stats_image/{test_id}", tags=["Cyperf CE Client"])
async def get_client_stats_image(test_id: str):
    try:
        stats = cyperf_service.get_client_stats(test_id)
        img_bytes = cyperf_service.stats_to_image(stats)
        return StreamingResponse(img_bytes, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# MCP HTTP Endpoint for Streamable HTTP
@router.post("/mcp", tags=["MCP"])
async def mcp_endpoint(request: Request):
    """
    MCP (Model Context Protocol) HTTP endpoint for streamable HTTP communication
    """
    try:
        body = await request.json()
        
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
                            "tools": {}
                        },
                        "serverInfo": {
                            "name": "cyperf-ce-controller",
                            "version": "1.0.0"
                        }
                    }
                }
                return response
                
            elif method == "tools/list":
                tools = _get_mcp_tools()
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
                    result = await _handle_mcp_tool_call(tool_name, arguments)
                    response = {
                        "jsonrpc": "2.0",
                        "id": request_id,
                        "result": {
                            "content": result
                        }
                    }
                    return response
                    
                except Exception as e:
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
        return {
            "jsonrpc": "2.0",
            "id": None,
            "error": {
                "code": -32700,
                "message": f"Parse error: {str(e)}"
            }
        }


