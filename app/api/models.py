from pydantic import BaseModel, Field
from typing import Optional, Dict

class ServerParams(BaseModel):
    cps: Optional[bool] = False
    port: Optional[int] = 5202
    length: Optional[str] = "1k"
    csv_stats: Optional[bool] = True
    bidi: bool = False
    reverse: bool = False
    bind: Optional[str] = Field(default="", description="Bind to specific IP address (leave empty for default)")

class ClientParams(BaseModel):
    cps: Optional[bool] = False
    cps_rate_limit: Optional[str] = None  # e.g., "1k/s", "100k/s", default is 100000
    port: Optional[int] = 5202
    length: Optional[str] = "1k"
    time: Optional[int] = 60
    csv_stats: Optional[bool] = True
    bitrate: Optional[str] = None
    parallel: Optional[int] = 1
    reverse: bool = False
    bidi: bool = False
    interval: Optional[int] = None
    bind: Optional[str] = Field(default="", description="Bind to specific IP address (leave empty for default)")

class ServerRequest(BaseModel):
    server_ip: str
    params: ServerParams

class ClientRequest(BaseModel):
    test_id: str
    server_ip: str
    client_ip: str
    params: ClientParams

class StopServerRequest(BaseModel):
    server_ip: str

class TestResponse(BaseModel):
    test_id: str
    status: str
    message: str
    server_pid: Optional[int] = None
    client_pid: Optional[int] = None
