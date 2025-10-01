"""
cyperf-ce API Client Module

This module handles all communication with the cyperf-ce REST API endpoints.
Provides methods for starting/stopping tests, fetching statistics, and retrieving logs.
"""

import requests
import json
import time
from typing import Dict, Optional, List, Any
from flask import current_app


class CyperfAPIClient:
    """Client for communicating with cyperf-ce REST API"""
    
    def __init__(self, base_url: str = None, timeout: int = 30):
        """
        Initialize the API client
        
        Args:
            base_url: Base URL for the cyperf-ce API
            timeout: Request timeout in seconds
        """
        self.base_url = base_url or current_app.config.get('CYPERF_API_BASE_URL', 'http://localhost:8000/api')
        self.timeout = timeout or current_app.config.get('CYPERF_API_TIMEOUT', 30)
        self.session = requests.Session()
        
        # Set default headers
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
    
    def _make_request(self, method: str, endpoint: str, data: Dict = None) -> Dict:
        """
        Make HTTP request to the API
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path
            data: Request payload data
            
        Returns:
            Response data as dictionary
            
        Raises:
            requests.exceptions.RequestException: For API communication errors
        """
        url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"
        
        # Log the API call
        print(f"\n{'='*60}")
        print(f"[API CALL] {method.upper()} {url}")
        if data:
            print(f"[API PAYLOAD] {data}")
        print(f"{'='*60}")
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, timeout=self.timeout)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, timeout=self.timeout)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            
            # Try to parse JSON response
            try:
                json_response = response.json()
                print(f"[API RESPONSE] {response.status_code} - JSON Response:")
                print(f"[API RESPONSE] {json_response}")
                print(f"{'='*60}\n")
                return json_response
            except json.JSONDecodeError:
                print(f"[API RESPONSE] {response.status_code} - Raw Response:")
                print(f"[API RESPONSE] {response.text}")
                print(f"{'='*60}\n")
                return {"raw_response": response.text}
                
        except requests.exceptions.Timeout:
            error_msg = f"API request timed out after {self.timeout} seconds"
            print(f"[API ERROR] {error_msg}")
            raise requests.exceptions.RequestException(error_msg)
        except requests.exceptions.ConnectionError:
            error_msg = f"Failed to connect to cyperf-ce API at {url}"
            print(f"[API ERROR] {error_msg}")
            raise requests.exceptions.RequestException(error_msg)
        except requests.exceptions.HTTPError as e:
            error_msg = f"HTTP error {e.response.status_code}: {e.response.text}"
            print(f"[API ERROR] {error_msg}")
            print(f"[API ERROR] Full Error Response: {e.response.text}")
            raise requests.exceptions.RequestException(error_msg)
    
    def start_server(self, server_ip: str, server_params: Dict) -> Dict:
        """
        Start the cyperf-ce server with test configuration
        
        Args:
            server_ip: IP address of the server
            server_params: Server configuration parameters (ServerParams schema)
            
        Returns:
            TestResponse with test_id, status, message, server_pid
        """
        endpoint = "start_server"
        payload = {
            "server_ip": server_ip,
            "params": server_params
        }
        return self._make_request('POST', endpoint, payload)
    
    def start_client(self, test_id: str, server_ip: str, client_ip: str, client_params: Dict) -> Dict:
        """
        Start the cyperf-ce client for the specified test
        
        Args:
            test_id: Test ID returned from start_server
            server_ip: IP address of the server
            client_ip: IP address of the client
            client_params: Client configuration parameters (ClientParams schema)
            
        Returns:
            TestResponse with test_id, status, message, client_pid
        """
        endpoint = "start_client"
        payload = {
            "test_id": test_id,
            "server_ip": server_ip,
            "client_ip": client_ip,
            "params": client_params
        }
        return self._make_request('POST', endpoint, payload)
    
    def stop_server(self, server_ip: str) -> Dict:
        """
        Stop the cyperf-ce server processes on specified server IP
        
        Args:
            server_ip: IP address of the server to stop
            
        Returns:
            Dictionary with cleanup results and server_ip
        """
        endpoint = "stop_server"
        payload = {"server_ip": server_ip}
        return self._make_request('POST', endpoint, payload)
    
    def get_server_stats(self, test_id: str) -> Dict:
        """
        Get current server statistics for the specified test
        
        Args:
            test_id: Test ID to get stats for
            
        Returns:
            Server statistics data
        """
        endpoint = f"server/stats/{test_id}"
        return self._make_request('GET', endpoint)
    
    def get_client_stats(self, test_id: str) -> Dict:
        """
        Get current client statistics for the specified test
        
        Args:
            test_id: Test ID to get stats for
            
        Returns:
            Client statistics data
        """
        endpoint = f"client/stats/{test_id}"
        return self._make_request('GET', endpoint)
    
    def get_server_logs(self, test_id: str) -> Dict:
        """
        Get server logs for the specified test
        
        Args:
            test_id: Test ID to get logs for
            
        Returns:
            Server logs data
        """
        endpoint = f"server/logs/{test_id}"
        return self._make_request('GET', endpoint)
    
    def get_client_logs(self, test_id: str) -> Dict:
        """
        Get client logs for the specified test
        
        Args:
            test_id: Test ID to get logs for
            
        Returns:
            Client logs data
        """
        endpoint = f"client/logs/{test_id}"
        return self._make_request('GET', endpoint)
    
    def get_combined_stats(self, test_id: str) -> Dict:
        """
        Get both server and client statistics in a single call
        
        Args:
            test_id: Test ID to get stats for
            
        Returns:
            Combined statistics data
        """
        try:
            server_stats = self.get_server_stats(test_id)
            client_stats = self.get_client_stats(test_id)
            
            return {
                "test_id": test_id,
                "timestamp": time.time(),
                "server": server_stats,
                "client": client_stats
            }
        except Exception as e:
            return {
                "test_id": test_id,
                "timestamp": time.time(),
                "error": str(e),
                "server": {},
                "client": {}
            }
    
    def health_check(self) -> Dict:
        """
        Check if the cyperf-ce API is accessible
        
        Returns:
            Health check response
        """
        try:
            # Get the base URL without /api suffix
            base_url_parts = self.base_url.rstrip('/').split('/')
            if base_url_parts[-1] == 'api':
                base_url = '/'.join(base_url_parts[:-1])
            else:
                base_url = self.base_url.rstrip('/')
            
            # Try to access the docs endpoint which we know exists
            docs_url = f"{base_url}/docs"
            response = self.session.get(docs_url, timeout=self.timeout)
            response.raise_for_status()
            
            # If we can get the docs page, the API is healthy
            return {"status": "healthy", "response": {"message": "FastAPI docs accessible", "status_code": response.status_code}}
        except Exception as e:
            # Fallback: try the OpenAPI spec
            try:
                base_url_parts = self.base_url.rstrip('/').split('/')
                if base_url_parts[-1] == 'api':
                    base_url = '/'.join(base_url_parts[:-1])
                else:
                    base_url = self.base_url.rstrip('/')
                    
                openapi_url = f"{base_url}/openapi.json"
                openapi_response = self.session.get(openapi_url, timeout=self.timeout)
                openapi_response.raise_for_status()
                
                return {"status": "healthy", "response": {"message": "FastAPI OpenAPI spec accessible", "status_code": openapi_response.status_code}}
            except Exception as openapi_error:
                return {"status": "unhealthy", "error": f"Cannot reach FastAPI: docs failed ({str(e)}), openapi failed ({str(openapi_error)})"}


# Singleton instance for use across the application
api_client = None

def get_api_client() -> CyperfAPIClient:
    """Get or create the API client singleton"""
    global api_client
    if api_client is None:
        api_client = CyperfAPIClient()
    return api_client
