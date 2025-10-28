"""
Test Manager Module

This module orchestrates the complete test workflow including:
- Parameter validation
- API call sequencing  
- Test state tracking
- Error handling and recovery
- Statistics collection
"""

import time
import uuid
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum

from .api_client import get_api_client
from .data_processor import DataProcessor


class TestStatus(Enum):
    """Test execution status enumeration"""
    IDLE = "idle"
    INITIALIZING = "initializing"
    STARTING_SERVER = "starting_server"
    STARTING_CLIENT = "starting_client"
    RUNNING = "running"
    STOPPING = "stopping"
    COMPLETED = "completed"
    ERROR = "error"
    CANCELLED = "cancelled"


@dataclass
class TestState:
    """Test state tracking data class"""
    test_id: str
    status: TestStatus = TestStatus.IDLE
    config: Dict = field(default_factory=dict)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration: int = 0
    elapsed_time: int = 0
    progress_percentage: float = 0.0
    current_stats: Dict = field(default_factory=dict)
    stats_history: List[Dict] = field(default_factory=list)
    error_message: Optional[str] = None
    server_started: bool = False
    client_started: bool = False


class TestManager:
    """Manages test execution workflow and state"""
    
    def __init__(self):
        self.api_client = get_api_client()
        self.data_processor = DataProcessor()
        self.active_tests: Dict[str, TestState] = {}
        self.stats_collection_threads: Dict[str, threading.Thread] = {}
        self._stop_stats_collection: Dict[str, bool] = {}
    
    def validate_test_config(self, config: Dict) -> Dict:
        """
        Validate test configuration using DataProcessor
        
        Args:
            config: Test configuration dictionary
            
        Returns:
            Validation result with errors/warnings
        """
        return self.data_processor.validate_test_config(config)
    
    def start_test(self, config: Dict) -> Dict:
        """
        Start a new test with the provided configuration
        
        Args:
            config: Test configuration dictionary
            
        Returns:
            Test start result with test_id or error
        """
        # Validate configuration
        validation = self.validate_test_config(config)
        if not validation['valid']:
            return {
                'status': 'error',
                'message': 'Configuration validation failed',
                'errors': validation['errors'],
                'warnings': validation['warnings']
            }
        
        # Generate unique test ID
        test_id = str(uuid.uuid4())
        
        # Create test state
        test_state = TestState(
            test_id=test_id,
            status=TestStatus.INITIALIZING,
            config=config,
            duration=int(config.get('duration', 60))
        )
        
        self.active_tests[test_id] = test_state
        
        try:
            # Start test execution in background thread
            test_thread = threading.Thread(
                target=self._execute_test_workflow,
                args=(test_id,),
                daemon=True
            )
            test_thread.start()
            
            return {
                'status': 'success',
                'test_id': test_id,
                'message': 'Test started successfully',
                'warnings': validation.get('warnings', [])
            }
            
        except Exception as e:
            test_state.status = TestStatus.ERROR
            test_state.error_message = str(e)
            
            return {
                'status': 'error',
                'message': f'Failed to start test: {str(e)}',
                'test_id': test_id
            }
    
    def _execute_test_workflow(self, test_id: str):
        """
        Execute the complete test workflow in background thread
        Following OpenAPI specification flow:
        1. Start server -> get test_id
        2. Start client with test_id
        3. Monitor via stats endpoints
        
        Args:
            test_id: Test ID to execute (our internal ID, will be replaced by API test_id)
        """
        test_state = self.active_tests[test_id]
        config = test_state.config
        
        try:
            # Convert web config to API format
            api_requests = self.data_processor.convert_web_config_to_api(config)
            server_request = api_requests['server_request']
            client_request = api_requests['client_request']
            
            # Phase 1: Start Server (returns actual test_id from API)
            test_state.status = TestStatus.STARTING_SERVER
            server_response = self.api_client.start_server(
                server_request['server_ip'],
                server_request['server_params']
            )
            
            if 'error' in server_response:
                raise Exception(f"Server start failed: {server_response['error']}")
            
            # Get the actual test_id from API response (TestResponse schema)
            api_test_id = server_response.get('test_id')
            if not api_test_id:
                raise Exception("No test_id returned from server start")
            
            # Store API test_id for stats/logs polling
            test_state.config['api_test_id'] = api_test_id
            test_state.server_started = True
            
            # Phase 2: Start Client with API test_id
            test_state.status = TestStatus.STARTING_CLIENT
            client_response = self.api_client.start_client(
                api_test_id,  # Use API test_id
                client_request['server_ip'],
                client_request['client_ip'],
                client_request['client_params']
            )
            
            if 'error' in client_response:
                raise Exception(f"Client start failed: {client_response['error']}")
            
            test_state.client_started = True
            
            # Phase 3: Run Test
            test_state.status = TestStatus.RUNNING
            test_state.start_time = datetime.now()
            
            # Start statistics collection
            self._start_stats_collection(test_id)
            
            # Wait for test duration
            duration = test_state.duration
            start_time = time.time()
            
            while time.time() - start_time < duration:
                if test_state.status == TestStatus.CANCELLED:
                    break
                
                # Update progress
                elapsed = time.time() - start_time
                test_state.elapsed_time = int(elapsed)
                test_state.progress_percentage = min((elapsed / duration) * 100, 100)
                
                time.sleep(1)
            
            # Phase 4: Stop Test
            test_state.status = TestStatus.STOPPING
            self._stop_stats_collection[test_id] = True
            
            # Stop server (requires server_ip, not test_id)
            server_ip = test_state.config.get('server_ip')
            if server_ip:
                stop_response = self.api_client.stop_server(server_ip)
            
            # Phase 5: Complete
            test_state.status = TestStatus.COMPLETED
            test_state.end_time = datetime.now()
            test_state.progress_percentage = 100.0
            
        except Exception as e:
            test_state.status = TestStatus.ERROR
            test_state.error_message = str(e)
            test_state.end_time = datetime.now()
            
            # Clean up on error
            self._cleanup_test(test_id)
    
    def _start_stats_collection(self, test_id: str):
        """
        Start background statistics collection for a test
        
        Args:
            test_id: Test ID to collect stats for
        """
        test_state = self.active_tests[test_id]
        interval = int(test_state.config.get('snapshot_interval', 5))
        
        self._stop_stats_collection[test_id] = False
        
        def collect_stats():
            while not self._stop_stats_collection.get(test_id, False):
                try:
                    # Get combined stats using API test_id
                    api_test_id = test_state.config.get('api_test_id', test_id)
                    stats = self.api_client.get_combined_stats(api_test_id)
                    
                    # Process and store stats
                    processed_stats = self.data_processor.format_stats_for_display(stats)
                    test_state.current_stats = processed_stats
                    test_state.stats_history.append(stats)
                    
                    # Limit history size to prevent memory issues
                    if len(test_state.stats_history) > 1000:
                        test_state.stats_history = test_state.stats_history[-500:]
                    
                except Exception as e:
                    print(f"Stats collection error for test {test_id}: {e}")
                
                time.sleep(interval)
        
        stats_thread = threading.Thread(target=collect_stats, daemon=True)
        stats_thread.start()
        self.stats_collection_threads[test_id] = stats_thread
    
    def cancel_test(self, test_id: str) -> Dict:
        """
        Cancel a running test
        
        Args:
            test_id: Test ID to cancel
            
        Returns:
            Cancellation result
        """
        if test_id not in self.active_tests:
            return {
                'status': 'error',
                'message': f'Test {test_id} not found'
            }
        
        test_state = self.active_tests[test_id]
        
        if test_state.status in [TestStatus.COMPLETED, TestStatus.ERROR, TestStatus.CANCELLED]:
            return {
                'status': 'error',
                'message': f'Test {test_id} is already finished'
            }
        
        # Mark for cancellation
        test_state.status = TestStatus.CANCELLED
        test_state.end_time = datetime.now()
        
        # Clean up
        self._cleanup_test(test_id)
        
        return {
            'status': 'success',
            'message': f'Test {test_id} cancelled successfully'
        }
    
    def _cleanup_test(self, test_id: str):
        """
        Clean up test resources
        
        Args:
            test_id: Test ID to clean up
        """
        # Stop stats collection
        self._stop_stats_collection[test_id] = True
        
        # Try to stop server if it was started
        test_state = self.active_tests.get(test_id)
        if test_state and test_state.server_started:
            try:
                server_ip = test_state.config.get('server_ip')
                if server_ip:
                    self.api_client.stop_server(server_ip)
            except Exception as e:
                print(f"Error stopping server for test {test_id}: {e}")
    
    def get_test_status(self, test_id: str) -> Dict:
        """
        Get current status of a test
        
        Args:
            test_id: Test ID to get status for
            
        Returns:
            Test status information
        """
        if test_id not in self.active_tests:
            return {
                'status': 'error',
                'message': f'Test {test_id} not found'
            }
        
        test_state = self.active_tests[test_id]
        
        return {
            'status': 'success',
            'test_id': test_id,
            'test_status': test_state.status.value,
            'test_type': test_state.config.get('test_type', 'throughput'),
            'progress_percentage': test_state.progress_percentage,
            'elapsed_time': test_state.elapsed_time,
            'duration': test_state.duration,
            'start_time': test_state.start_time.isoformat() if test_state.start_time else None,
            'end_time': test_state.end_time.isoformat() if test_state.end_time else None,
            'error_message': test_state.error_message,
            'current_stats': test_state.current_stats
        }
    
    def get_test_stats(self, test_id: str) -> Dict:
        """
        Get current statistics for a test
        
        Args:
            test_id: Test ID to get stats for
            
        Returns:
            Current test statistics
        """
        if test_id not in self.active_tests:
            return {
                'status': 'error',
                'message': f'Test {test_id} not found'
            }
        
        test_state = self.active_tests[test_id]
        
        return {
            'status': 'success',
            'test_id': test_id,
            'test_type': test_state.config.get('test_type', 'throughput'),
            'current_stats': test_state.current_stats,
            'stats_history': test_state.stats_history[-50:],  # Last 50 data points
            'chart_data': self.data_processor.format_chart_data(test_state.stats_history[-50:])
        }
    
    def get_test_logs(self, test_id: str, log_type: str = 'both') -> Dict:
        """
        Get logs for a test
        
        Args:
            test_id: Test ID to get logs for
            log_type: 'client', 'server', or 'both'
            
        Returns:
            Test logs
        """
        try:
            # Get API test_id for log retrieval
            test_state = self.active_tests.get(test_id)
            api_test_id = test_state.config.get('api_test_id', test_id) if test_state else test_id
            
            logs = {}
            
            if log_type in ['client', 'both']:
                client_logs = self.api_client.get_client_logs(api_test_id)
                logs['client'] = self.data_processor.format_logs_for_display(client_logs)
            
            if log_type in ['server', 'both']:
                server_logs = self.api_client.get_server_logs(api_test_id)
                logs['server'] = self.data_processor.format_logs_for_display(server_logs)
            
            return {
                'status': 'success',
                'test_id': test_id,
                'logs': logs
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Failed to get logs: {str(e)}'
            }
    
    def list_active_tests(self) -> Dict:
        """
        Get list of all active tests
        
        Returns:
            List of active tests with their status
        """
        tests = []
        
        for test_id, test_state in self.active_tests.items():
            tests.append({
                'test_id': test_id,
                'status': test_state.status.value,
                'progress_percentage': test_state.progress_percentage,
                'start_time': test_state.start_time.isoformat() if test_state.start_time else None,
                'config': test_state.config
            })
        
        return {
            'status': 'success',
            'active_tests': tests,
            'count': len(tests)
        }
    
    def cleanup_completed_tests(self, max_age_hours: int = 24):
        """
        Clean up completed tests older than specified age
        
        Args:
            max_age_hours: Maximum age in hours for completed tests
        """
        cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
        tests_to_remove = []
        
        for test_id, test_state in self.active_tests.items():
            if (test_state.status in [TestStatus.COMPLETED, TestStatus.ERROR, TestStatus.CANCELLED] 
                and test_state.end_time 
                and test_state.end_time < cutoff_time):
                tests_to_remove.append(test_id)
        
        for test_id in tests_to_remove:
            del self.active_tests[test_id]
            if test_id in self.stats_collection_threads:
                del self.stats_collection_threads[test_id]
            if test_id in self._stop_stats_collection:
                del self._stop_stats_collection[test_id]


# Global test manager instance
test_manager = None

def get_test_manager() -> TestManager:
    """Get or create the test manager singleton"""
    global test_manager
    if test_manager is None:
        test_manager = TestManager()
    return test_manager
