from fastapi import APIRouter, HTTPException
from app.api.models import ServerRequest, ClientRequest, TestResponse
from app.services.cyperf_service import CyperfService
import uuid
from fastapi.responses import StreamingResponse

router = APIRouter()
cyperf_service = CyperfService()

@router.post("/start_server", tags=["Cyperf CE Server"], response_model=TestResponse)
async def start_server(request: ServerRequest):
    test_id = str(uuid.uuid4())
    try:
        result = cyperf_service.start_server(test_id, request.params.dict())
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



