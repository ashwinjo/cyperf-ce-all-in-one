"""
Data Processing Utilities

This module contains utilities for processing and formatting data
from the cyperf-ce API for display in the web interface.
"""

import json
from datetime import datetime
from typing import Dict, List, Any, Optional


class DataProcessor:
    """Utility class for processing cyperf-ce API data"""
    
    @staticmethod
    def format_stats_for_display(stats_data: Dict) -> Dict:
        """
        Format statistics data for display in the web interface
        
        Args:
            stats_data: Raw statistics data from API
            
        Returns:
            Formatted statistics data
        """
        if not stats_data or 'error' in stats_data:
            return {
                'status': 'error',
                'message': stats_data.get('error', 'No data available'),
                'formatted_stats': {}
            }
        
        formatted = {
            'status': 'success',
            'timestamp': datetime.now().isoformat(),
            'server_stats': DataProcessor._format_single_stats(stats_data.get('server', {})),
            'client_stats': DataProcessor._format_single_stats(stats_data.get('client', {})),
        }
        
        return formatted
    
    @staticmethod
    def _format_single_stats(stats: Dict) -> Dict:
        """Format statistics for a single endpoint (server or client)"""
        if not stats:
            return {}
        
        formatted = {}
        
        # Format common metrics
        if 'bytes_transferred' in stats:
            formatted['bytes_transferred'] = {
                'raw': stats['bytes_transferred'],
                'formatted': DataProcessor._format_bytes(stats['bytes_transferred'])
            }
        
        if 'throughput_mbps' in stats:
            formatted['throughput_mbps'] = {
                'raw': stats['throughput_mbps'],
                'formatted': f"{stats['throughput_mbps']:.2f} Mbps"
            }
        
        if 'connections_per_second' in stats:
            formatted['connections_per_second'] = {
                'raw': stats['connections_per_second'],
                'formatted': f"{stats['connections_per_second']:,} CPS"
            }
        
        if 'active_connections' in stats:
            formatted['active_connections'] = {
                'raw': stats['active_connections'],
                'formatted': f"{stats['active_connections']:,}"
            }
        
        if 'errors' in stats:
            formatted['errors'] = {
                'raw': stats['errors'],
                'formatted': f"{stats['errors']:,}"
            }
        
        # Include any additional raw data
        formatted['raw_data'] = stats
        
        return formatted
    
    @staticmethod
    def format_chart_data(stats_history: List[Dict]) -> Dict:
        """
        Format statistics history for Chart.js consumption
        
        Args:
            stats_history: List of historical statistics data
            
        Returns:
            Chart.js compatible data structure
        """
        if not stats_history:
            return {
                'labels': [],
                'datasets': []
            }
        
        # Extract timestamps for labels
        labels = []
        server_throughput = []
        client_throughput = []
        server_cps = []
        client_cps = []
        
        for entry in stats_history:
            # Format timestamp
            timestamp = entry.get('timestamp')
            if timestamp:
                dt = datetime.fromtimestamp(timestamp)
                labels.append(dt.strftime('%H:%M:%S'))
            else:
                labels.append('')
            
            # Extract server data
            server_stats = entry.get('server', {})
            server_throughput.append(server_stats.get('throughput_mbps', 0))
            server_cps.append(server_stats.get('connections_per_second', 0))
            
            # Extract client data
            client_stats = entry.get('client', {})
            client_throughput.append(client_stats.get('throughput_mbps', 0))
            client_cps.append(client_stats.get('connections_per_second', 0))
        
        return {
            'labels': labels,
            'datasets': [
                {
                    'label': 'Server Throughput (Mbps)',
                    'data': server_throughput,
                    'borderColor': '#DC3545',
                    'backgroundColor': 'rgba(220, 53, 69, 0.1)',
                    'tension': 0.1
                },
                {
                    'label': 'Client Throughput (Mbps)',
                    'data': client_throughput,
                    'borderColor': '#FFC107',
                    'backgroundColor': 'rgba(255, 193, 7, 0.1)',
                    'tension': 0.1
                }
            ]
        }
    
    @staticmethod
    def format_logs_for_display(logs_data: Dict) -> Dict:
        """
        Format log data for display in the web interface
        
        Args:
            logs_data: Raw log data from API
            
        Returns:
            Formatted log data
        """
        if not logs_data or 'error' in logs_data:
            return {
                'status': 'error',
                'message': logs_data.get('error', 'No logs available'),
                'logs': []
            }
        
        # Assume logs come as a list of log entries or as raw text
        logs = logs_data.get('logs', [])
        if isinstance(logs, str):
            # Split raw log text into lines
            logs = logs.split('\n')
        
        formatted_logs = []
        for log_entry in logs:
            if isinstance(log_entry, str):
                formatted_logs.append({
                    'timestamp': datetime.now().isoformat(),
                    'level': DataProcessor._extract_log_level(log_entry),
                    'message': log_entry.strip()
                })
            elif isinstance(log_entry, dict):
                formatted_logs.append({
                    'timestamp': log_entry.get('timestamp', datetime.now().isoformat()),
                    'level': log_entry.get('level', 'INFO'),
                    'message': log_entry.get('message', str(log_entry))
                })
        
        return {
            'status': 'success',
            'logs': formatted_logs,
            'count': len(formatted_logs)
        }
    
    @staticmethod
    def _format_bytes(bytes_value: int) -> str:
        """Format bytes value to human readable string"""
        if bytes_value == 0:
            return "0 B"
        
        units = ['B', 'KB', 'MB', 'GB', 'TB']
        size = bytes_value
        unit_index = 0
        
        while size >= 1024 and unit_index < len(units) - 1:
            size /= 1024
            unit_index += 1
        
        return f"{size:.2f} {units[unit_index]}"
    
    @staticmethod
    def _extract_log_level(log_message: str) -> str:
        """Extract log level from log message"""
        log_message_upper = log_message.upper()
        
        if 'ERROR' in log_message_upper or 'ERR' in log_message_upper:
            return 'ERROR'
        elif 'WARN' in log_message_upper:
            return 'WARNING'
        elif 'INFO' in log_message_upper:
            return 'INFO'
        elif 'DEBUG' in log_message_upper:
            return 'DEBUG'
        else:
            return 'INFO'
    
    @staticmethod
    def convert_web_config_to_api(config: Dict) -> Dict:
        """
        Convert web form configuration to OpenAPI request format
        
        Args:
            config: Configuration from web interface
            
        Returns:
            Dictionary with server_request and client_request for API calls
        """
        # Extract common parameters
        test_type = config.get('test_type', 'throughput').lower()
        port = int(config.get('port', 5202))
        duration = int(config.get('duration', 60))
        
        # Server parameters (ServerParams schema from OpenAPI)
        server_params = {
            "cps": test_type == 'cps',
            "port": port,
            "length": f"{config.get('packet_size', 1500)}",  # Use packet_size from form
            "csv_stats": True,
            "bidi": config.get('direction') == 'bidirectional',
            "reverse": config.get('traffic_direction') == 'server_to_client'
        }
        
        # Client parameters (ClientParams schema from OpenAPI)
        client_params = {
            "cps": test_type == 'cps',
            "port": port,
            "length": f"{config.get('packet_size', 1500)}",  # Use packet_size from form
            "time": duration,
            "csv_stats": True,
            "parallel": int(config.get('parallel_sessions', 1)),  # Use parallel_sessions from form
            "reverse": config.get('traffic_direction') == 'server_to_client',
            "bidi": config.get('direction') == 'bidirectional',
            "interval": int(config.get('snapshot_interval', 5))
        }
        
        # Add optional parameters
        # Map bandwidth_mbps to bitrate parameter (convert to string with 'M' suffix)
        if test_type == 'throughput' and 'bandwidth_mbps' in config:
            try:
                bandwidth = int(config['bandwidth_mbps'])
                if bandwidth <= 0:
                    raise ValueError("Bandwidth must be greater than 0")
                # Format as #M/s (e.g., "100M/s")
                client_params['bitrate'] = f"{bandwidth}M/s"
                print(f"Setting bitrate to {client_params['bitrate']} based on bandwidth {bandwidth} Mbps")
            except (ValueError, TypeError) as e:
                print(f"Error setting bitrate: {str(e)}")
                raise ValueError(f"Invalid bandwidth value: {config.get('bandwidth_mbps')}. Must be a positive integer.")
        
        # For CPS tests, map Target CPS rate
        if test_type == 'cps' and 'connections_per_second' in config:
            try:
                cps_rate = int(config['connections_per_second'])
                if cps_rate <= 0:
                    raise ValueError("CPS rate must be greater than 0")
                client_params['cps_rate_limit'] = f"{cps_rate}/s"
                print(f"Setting cps_rate_limit to {client_params['cps_rate_limit']} based on target CPS {cps_rate}")
            except (ValueError, TypeError) as e:
                print(f"Error setting cps_rate_limit: {str(e)}")
                raise ValueError(f"Invalid CPS rate value: {config.get('connections_per_second')}. Must be a positive integer.")
        
        return {
            'server_request': {
                'server_ip': config['server_ip'],
                'server_params': server_params
            },
            'client_request': {
                'server_ip': config['server_ip'],
                'client_ip': config['client_ip'],
                'client_params': client_params
            }
        }
    
    @staticmethod
    def validate_test_config(config: Dict) -> Dict:
        """
        Validate test configuration parameters
        
        Args:
            config: Test configuration dictionary
            
        Returns:
            Validation result with errors if any
        """
        errors = []
        warnings = []
        
        # Required fields
        required_fields = ['test_type', 'duration', 'server_ip', 'client_ip']
        for field in required_fields:
            if field not in config or not config[field]:
                errors.append(f"Missing required field: {field}")
        
        # Validate IP addresses (basic validation)
        for ip_field in ['server_ip', 'client_ip']:
            if ip_field in config:
                ip_value = config[ip_field]
                if not DataProcessor._is_valid_ip(ip_value):
                    errors.append(f"Invalid IP address format: {ip_field}")
        
        # Validate test type specific fields
        test_type = config.get('test_type', '').lower()
        if test_type == 'throughput':
            if 'bandwidth_mbps' not in config:
                errors.append("Missing required field: bandwidth_mbps for throughput test")
            else:
                try:
                    bandwidth = int(config['bandwidth_mbps'])
                    if bandwidth <= 0:
                        errors.append("Bandwidth must be greater than 0")
                    elif bandwidth > 10000:
                        warnings.append("Bandwidth exceeds recommended maximum (10000 Mbps)")
                except (ValueError, TypeError):
                    errors.append("Invalid bandwidth value: must be a positive integer")
        
        # Validate numeric fields
        numeric_fields = {
            'duration': (1, 3600),  # 1 second to 1 hour
            'snapshot_interval': (1, 60),  # 1 to 60 seconds
            'packet_size': (64, 9000),  # 64 bytes to 9KB
            'connections_per_second': (1, 100000)  # 1 to 100k CPS
        }
        
        for field, (min_val, max_val) in numeric_fields.items():
            if field in config:
                try:
                    value = int(config[field])
                    if value < min_val or value > max_val:
                        warnings.append(f"{field} value {value} is outside recommended range ({min_val}-{max_val})")
                except (ValueError, TypeError):
                    errors.append(f"Invalid numeric value for {field}")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings
        }
    
    @staticmethod
    def _is_valid_ip(ip_string: str) -> bool:
        """Basic IP address validation"""
        try:
            parts = ip_string.split('.')
            if len(parts) != 4:
                return False
            for part in parts:
                if not (0 <= int(part) <= 255):
                    return False
            return True
        except (ValueError, AttributeError):
            return False
