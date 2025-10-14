from flask import Flask, render_template, request, jsonify, redirect, url_for
import os
from dotenv import load_dotenv
from config import config
import logging
from datetime import datetime
import json
from collections import deque

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configure app based on environment
env = os.environ.get('FLASK_ENV', 'production')
app.config.from_object(config.get(env, config['default']))

# Import utility modules
import uuid
import time

# Global log storage (in-memory for simplicity)
app_logs = deque(maxlen=1000)  # Store last 1000 log entries

# Logging function
def add_log(level, source, message, test_id=None):
    """Add a log entry to the global log storage"""
    log_entry = {
        'timestamp': datetime.now().isoformat(),
        'level': level,
        'source': source,
        'message': message,
        'test_id': test_id
    }
    app_logs.append(log_entry)
    print(f"[{log_entry['timestamp']}] [{level}] [{source}] {message}")

from utils.api_client import get_api_client
from utils.test_manager import get_test_manager
from utils.data_processor import DataProcessor

@app.route('/')
def index():
    """Main landing page - redirects to parameters section"""
    return redirect(url_for('parameters'))

@app.route('/parameters')
def parameters():
    """Section 1: Test Parameters Interface"""
    # Extract base URL from CYPERF_API_BASE_URL
    api_base_url = app.config.get('CYPERF_API_BASE_URL', 'http://localhost:8000/api')
    base_url_parts = api_base_url.split('/')
    base_url = '/'.join(base_url_parts[:3])  # Get http://hostname:port part
    return render_template('parameters.html', base_url=base_url)

@app.route('/statistics')
def statistics():
    """Section 2: Real-time Statistics Dashboard"""
    return render_template('statistics.html')

@app.route('/logs')
def logs():
    """Section 3: Live Log Streaming Interface"""
    return render_template('logs.html')

@app.route('/api/logs')
def get_logs():
    """Get all logs as JSON"""
    return jsonify({
        'logs': list(app_logs),
        'count': len(app_logs)
    })

@app.route('/api/logs/clear', methods=['POST'])
def clear_logs():
    """Clear all logs"""
    app_logs.clear()
    add_log('INFO', 'SYSTEM', 'Logs cleared by user')
    return jsonify({'status': 'success', 'message': 'Logs cleared'})

@app.route('/resources')
def resources():
    """Resources and Documentation Page"""
    return render_template('resources.html')

@app.route('/about')
def about():
    """Section 4: About and Tutorials Page"""
    return render_template('about.html')

# Health check endpoint for container
@app.route('/health')
def health_check():
    """Health check endpoint for container orchestration"""
    try:
        # Check if we can reach the FastAPI backend
        api_client = get_api_client()
        health_status = api_client.health_check()
        
        # Get the actual URL being checked (docs endpoint)
        base_url_parts = app.config.get('CYPERF_API_BASE_URL', '').rstrip('/').split('/')
        if base_url_parts[-1] == 'api':
            docs_url = '/'.join(base_url_parts[:-1]) + '/docs'
        else:
            docs_url = app.config.get('CYPERF_API_BASE_URL', '').rstrip('/') + '/docs'
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'backend_status': health_status.get('status', 'unknown'),
            'flask_config': {
                'api_base_url': docs_url,
                'environment': os.environ.get('FLASK_ENV', 'production')
            }
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 503

# API Routes
@app.route('/api/run_test', methods=['POST'])
def run_test():
    """API endpoint to start a test"""
    try:
        test_manager = get_test_manager()
        config = request.get_json()
        
        if not config:
            return jsonify({
                "status": "error",
                "message": "No configuration data provided"
            }), 400
        
        result = test_manager.start_test(config)
        print(result)
        
        if result['status'] == 'success':
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Internal server error: {str(e)}"
        }), 500

@app.route('/api/test_status/<test_id>')
def test_status(test_id):
    """API endpoint to get test status"""
    try:
        test_manager = get_test_manager()
        result = test_manager.get_test_status(test_id)
        
        if result['status'] == 'success':
            return jsonify(result), 200
        else:
            return jsonify(result), 404
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Internal server error: {str(e)}"
        }), 500

@app.route('/api/current_stats/<test_id>')
def current_stats(test_id):
    """API endpoint for real-time statistics"""
    try:
        test_manager = get_test_manager()
        result = test_manager.get_test_stats(test_id)
        
        if result['status'] == 'success':
            return jsonify(result), 200
        else:
            return jsonify(result), 404
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Internal server error: {str(e)}"
        }), 500

@app.route('/api/logs/<log_type>/<test_id>')
def get_test_logs(log_type, test_id):
    """API endpoint to fetch logs for a specific test"""
    try:
        test_manager = get_test_manager()
        result = test_manager.get_test_logs(test_id, log_type)
        
        if result['status'] == 'success':
            return jsonify(result), 200
        else:
            return jsonify(result), 404
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Internal server error: {str(e)}"
        }), 500

@app.route('/api/cancel_test/<test_id>', methods=['POST'])
def cancel_test(test_id):
    """API endpoint to cancel a running test"""

@app.route('/api/proxy/client/logs/<test_id>')
def proxy_client_logs(test_id):
    """Proxy endpoint for client logs"""
    try:
        api_client = get_api_client()
        result = api_client.get_client_logs(test_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch client logs: {str(e)}"
        }), 500

@app.route('/api/proxy/server/logs/<test_id>')
def proxy_server_logs(test_id):
    """Proxy endpoint for server logs"""
    try:
        api_client = get_api_client()
        result = api_client.get_server_logs(test_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch server logs: {str(e)}"
        }), 500
    try:
        test_manager = get_test_manager()
        result = test_manager.cancel_test(test_id)
        
        if result['status'] == 'success':
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Internal server error: {str(e)}"
        }), 500

@app.route('/api/active_tests')
def active_tests():
    """API endpoint to get list of active tests"""
    try:
        test_manager = get_test_manager()
        result = test_manager.list_active_tests()
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Internal server error: {str(e)}"
        }), 500

@app.route('/api/run_test_simple', methods=['POST'])
def run_test_simple():
    """
    Simplified test execution - no threading, clean flow
    1. Validate config
    2. Start server -> get API test_id  
    3. Start client with API test_id
    4. Wait for duration
    5. Get final stats
    6. Stop server
    """
    try:
        config = request.get_json()
        if not config:
            return jsonify({"status": "error", "message": "No configuration provided"}), 400
        
        # Initialize components
        api_client = get_api_client()
        data_processor = DataProcessor()
        
        # Step 1: Validate configuration
        validation = data_processor.validate_test_config(config)
        if not validation['valid']:
            return jsonify({
                "status": "error", 
                "message": "Configuration validation failed",
                "errors": validation['errors']
            }), 400
        
        # Generate test ID
        test_id = str(uuid.uuid4())
        add_log('INFO', 'TEST', f'Test {test_id} initiated', test_id)
        
        # Step 2: Convert config to API format
        api_requests = data_processor.convert_web_config_to_api(config)
        server_request = api_requests['server_request']
        client_request = api_requests['client_request']
        
        add_log('INFO', 'TEST', f'Starting server on {server_request["server_ip"]}', test_id)
        print(f"[TEST {test_id}] Starting server on {server_request['server_ip']}")
        
        # Step 3: Start Server
        server_response = api_client.start_server(
            server_request['server_ip'],
            server_request['server_params']
        )
        
        if 'error' in server_response:
            add_log('ERROR', 'SERVER', f'Server start failed: {server_response["error"]}', test_id)
            return jsonify({
                "status": "error",
                "message": f"Server start failed: {server_response['error']}"
            }), 400
        
        # Step 4: Extract API test_id
        api_test_id = server_response.get('test_id')
        if not api_test_id:
            add_log('ERROR', 'SERVER', 'No test_id returned from server', test_id)
            return jsonify({
                "status": "error", 
                "message": "No test_id returned from server"
            }), 400
        
        add_log('SUCCESS', 'SERVER', f'Server started successfully, API test_id: {api_test_id}', test_id)
        print(f"[TEST {test_id}] Server started, API test_id: {api_test_id}")

        # Step 5: Start Client
        add_log('INFO', 'CLIENT', f'Starting client with API test_id: {api_test_id}', test_id)
        print(f"[TEST {test_id}] Starting client with API test_id: {api_test_id}")
        
        client_response = api_client.start_client(
            api_test_id,
            client_request['server_ip'], 
            client_request['client_ip'],
            client_request['client_params']
        )
        
        if 'error' in client_response:
            add_log('ERROR', 'CLIENT', f'Client start failed: {client_response["error"]}', test_id)
            # Cleanup server on client failure
            try:
                api_client.stop_server(server_request['server_ip'])
                add_log('INFO', 'SERVER', 'Server stopped due to client failure', test_id)
            except:
                pass
            return jsonify({
                "status": "error",
                "message": f"Client start failed: {client_response['error']}"
            }), 400
        
        add_log('SUCCESS', 'CLIENT', 'Client started successfully', test_id)
        print(f"[TEST {test_id}] Client started successfully")

        # Step 6: Wait for test duration (no threading!)
        duration = int(config.get('duration', 60))
        add_log('INFO', 'TEST', f'Test running for {duration} seconds...', test_id)
        print(f"[TEST {test_id}] Test running for {duration} seconds...")
        
        time.sleep(duration)
        
        # Step 7: Get final stats
        add_log('INFO', 'TEST', 'Collecting final statistics...', test_id)
        print(f"[TEST {test_id}] Collecting final stats...")
        final_stats = api_client.get_combined_stats(api_test_id)
        formatted_stats = data_processor.format_stats_for_display(final_stats)
        
        # Step 8: Stop server
        add_log('INFO', 'SERVER', 'Stopping server...', test_id)
        print(f"[TEST {test_id}] Stopping server...")
        stop_response = api_client.stop_server(server_request['server_ip'])
        
        add_log('SUCCESS', 'TEST', 'Test completed successfully!', test_id)
        print(f"[TEST {test_id}] Test completed successfully!")

        return jsonify({
            "status": "success",
            "message": "Test completed successfully",
            "test_id": test_id,
            "api_test_id": api_test_id,
            "duration": duration,
            "final_stats": formatted_stats,
            "server_response": server_response,
            "client_response": client_response,
            "stop_response": stop_response
        }), 200
        
    except Exception as e:
        add_log('ERROR', 'SYSTEM', f'Test execution failed: {str(e)}', test_id if 'test_id' in locals() else None)
        print(f"[TEST] Error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Test execution failed: {str(e)}"
        }), 500

if __name__ == '__main__':
    # Container-friendly configuration
    host = '0.0.0.0'  # Listen on all interfaces in container
    port = int(os.environ.get('PORT', 5001))
    debug = app.config.get('DEBUG', False)
    
    print(f"Starting Flask app on {host}:{port}")
    print(f"Environment: {os.environ.get('FLASK_ENV', 'production')}")
    print(f"API Base URL: {app.config.get('CYPERF_API_BASE_URL')}")
    
    app.run(debug=debug, host=host, port=port)
