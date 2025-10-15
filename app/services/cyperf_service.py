import paramiko
from typing import Dict, Any
from app.core.config import settings
import re
import csv
import pandas as pd
import matplotlib.pyplot as plt
from io import BytesIO
import time

class CyperfService:
    def __init__(self):
        self.active_tests: Dict[str, Dict[str, Any]] = {}

    def _escape_shell_arg(self, arg: str) -> str:
        """Escape special characters in shell arguments"""
        # Replace single quotes with '\'' pattern for safe shell execution
        return arg.replace("'", "'\"'\"'")

    def _connect_ssh(self, hostname: str):
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        if settings.SSH_PASSWORD:
            ssh.connect(
                hostname=hostname,
                username=settings.SSH_USERNAME,
                password=settings.SSH_PASSWORD
            )
        else:
            ssh.connect(
                hostname=hostname,
                username=settings.SSH_USERNAME,
                key_filename=settings.SSH_KEY_PATH
            )
        return ssh

    def start_server(self, test_id: str, server_ip: str, params: Dict[str, Any]) -> Dict[str, Any]:
        # Build the cyperf command with full path (without sudo, we'll add it in the wrapper)
        cyperf_cmd = "/usr/local/bin/cyperf -s --detailed-stats"
        if params.get("cps"):
            cyperf_cmd += " --cps"
        if params.get("port"):
            cyperf_cmd += f" --port {params['port']}"
        if params.get("length"):
            cyperf_cmd += f" --length {params['length']}"
        if params.get("bidi"):
            cyperf_cmd += " --bidir"
        if params.get("reverse"):
            cyperf_cmd += " --reverse"
        if params.get("csv_stats"):
            cyperf_cmd += " --csv-stats"
        bind_value = params.get("bind")
        if bind_value and str(bind_value).strip():
            cyperf_cmd += f" --bind {bind_value}"
        cyperf_cmd += f" {test_id}_server.csv"
        
        # Pipe password into sudo command with nohup and backgrounding
        if settings.SSH_PASSWORD:
            escaped_pwd = self._escape_shell_arg(settings.SSH_PASSWORD)
            command = f"nohup bash -c \"echo '{escaped_pwd}' | sudo -S {cyperf_cmd}\" > {test_id}_server.log 2>&1 &"
            # Print command with redacted password for security
            print(f"nohup bash -c \"echo '[REDACTED]' | sudo -S {cyperf_cmd}\" > {test_id}_server.log 2>&1 &")
        else:
            # If using SSH key auth, user might have passwordless sudo configured
            command = f"nohup sudo {cyperf_cmd} > {test_id}_server.log 2>&1 &"
            print(command)
        ssh = self._connect_ssh(server_ip)
        ssh.exec_command(command)
        
        # Give it a moment to start
        time.sleep(1)
        
        find_cmd = "ps -ef | grep 'cyperf -s' | grep root | awk '{print $2}'"
        _, stdout, _ = ssh.exec_command(find_cmd)
        pids = stdout.read().decode().strip().split('\n')
        server_pid = int(pids[0]) if pids and pids[0] else None
        self.active_tests[test_id] = {
            "server_pid": server_pid,
            "command": command,
            "server_csv_path": f"{test_id}_server.csv",
            "server_ip": server_ip
        }
        ssh.close()
        return {"server_pid": server_pid}

    def start_client(self, test_id: str, server_ip: str, client_ip: str, params: Dict[str, Any]) -> Dict[str, Any]:
        if test_id not in self.active_tests:
            raise Exception("Server not started for this test_id")
        
        # Build the cyperf command with full path (without sudo, we'll add it in the wrapper)
        cyperf_cmd = f"/usr/local/bin/cyperf -c {server_ip} --detailed-stats"
        # CPS and bitrate are mutually exclusive
        if params.get("cps"):
            # Handle CPS rate limit if provided
            if params.get("cps_rate_limit"):
                cyperf_cmd += f" --cps {params['cps_rate_limit']}"
            else:
                cyperf_cmd += " --cps"
        elif params.get("bitrate"):
            # Only add bitrate if CPS is not enabled
            cyperf_cmd += f" --bitrate {params['bitrate']}"
        
        if params.get("port"):
            cyperf_cmd += f" --port {params['port']}"
        if params.get("length"):
            cyperf_cmd += f" --length {params['length']}"
        if params.get("time"):
            cyperf_cmd += f" --time {params['time']}"
        if params.get("parallel"):
            cyperf_cmd += f" --parallel {params['parallel']}"
        if params.get("reverse"):
            cyperf_cmd += " --reverse"
        if params.get("bidi"):
            cyperf_cmd += " --bidir"
        if params.get("interval"):
            cyperf_cmd += f" --interval {params['interval']}"
        if params.get("csv_stats"):
            cyperf_cmd += " --csv-stats"
        bind_value = params.get("bind")
        if bind_value and str(bind_value).strip():
            cyperf_cmd += f" --bind {bind_value}"
        cyperf_cmd += f" {test_id}_client.csv"
        
        # Pipe password into sudo command with nohup and backgrounding
        if settings.SSH_PASSWORD:
            escaped_pwd = self._escape_shell_arg(settings.SSH_PASSWORD)
            command = f"nohup bash -c \"echo '{escaped_pwd}' | sudo -S {cyperf_cmd}\" > {test_id}_client.log 2>&1 &"
            # Print command with redacted password for security
            print(f"nohup bash -c \"echo '[REDACTED]' | sudo -S {cyperf_cmd}\" > {test_id}_client.log 2>&1 &")
        else:
            # If using SSH key auth, user might have passwordless sudo configured
            command = f"nohup sudo {cyperf_cmd} > {test_id}_client.log 2>&1 &"
            print(command)    
        ssh = self._connect_ssh(client_ip)
        ssh.exec_command(command)
        
        # Give it a moment to start
        time.sleep(1)
        
        find_cmd = "ps -ef | grep 'cyperf -c' | grep root | awk '{print $2}'"
        _, stdout, _ = ssh.exec_command(find_cmd)
        pids = stdout.read().decode().strip().split('\n')
        client_pid = int(pids[0]) if pids and pids[0] else None
        self.active_tests[test_id]["client_pid"] = client_pid
        self.active_tests[test_id]["client_log_path"] = f"{test_id}_client.log"
        self.active_tests[test_id]["client_csv_path"] = f"{test_id}_client.csv"
        self.active_tests[test_id]["client_ip"] = client_ip
        ssh.close()
        return {"client_pid": client_pid, 
                "command": command, 
                "client_csv_path": f"{test_id}_client.csv"}

    def stop_server(self, server_ip: str) -> Dict[str, Any]:
        ssh = self._connect_ssh(server_ip)
        
        # Build kill command with password piped in
        # Wrap entire command in a single sudo bash -c so password only needed once
        if settings.SSH_PASSWORD:
            escaped_pwd = self._escape_shell_arg(settings.SSH_PASSWORD)
            kill_cmd = f"echo '{escaped_pwd}' | sudo -S bash -c \"ps aux | grep -i '[c]yperf\|[s]erver' | awk '{{print \\$2}}' | xargs -r kill -9\""
        else:
            kill_cmd = "sudo bash -c \"ps aux | grep -i '[c]yperf\|[s]erver' | awk '{print $2}' | xargs -r kill -9\""
        
        ssh.exec_command(kill_cmd)
        ssh.close()
        return {"cyperf_server_pids_killed": "true", "server_ip": server_ip}
        
    def get_server_stats(self, test_id: str):
        # Read stats directly - will use fallback IP if test not in active_tests
        output = self.read_server_csv_stats(test_id)
        return output

    def get_client_stats(self, test_id: str) -> str:
        # Read stats directly - will use fallback IP if test not in active_tests
        output = self.read_client_csv_stats(test_id)
        return output

    def read_client_csv_stats(self, test_id: str) -> list:
        # Use client_ip from active_tests if available, otherwise fall back to settings
        if test_id in self.active_tests:
            client_ip = self.active_tests[test_id].get("client_ip", settings.CLIENT_IP)
        else:
            client_ip = settings.CLIENT_IP
        
        csv_path = f"{test_id}_client.csv"
        stats = []
        ssh = self._connect_ssh(client_ip)
        sftp = ssh.open_sftp()
        try:
            with sftp.open(csv_path, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    stats.append(row)
        except FileNotFoundError:
            raise Exception(f"Client CSV file not found: {csv_path}")
        finally:
            sftp.close()
            ssh.close()
        return stats

    def read_server_csv_stats(self, test_id: str) -> list:
        # Use server_ip from active_tests if available, otherwise fall back to settings
        if test_id in self.active_tests:
            server_ip = self.active_tests[test_id].get("server_ip", settings.SERVER_IP)
        else:
            server_ip = settings.SERVER_IP
        
        csv_path = f"{test_id}_server.csv"
        stats = []
        ssh = self._connect_ssh(server_ip)
        sftp = ssh.open_sftp()
        try:
            with sftp.open(csv_path, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    stats.append(row)
        except FileNotFoundError:
            raise Exception(f"Server CSV file not found: {csv_path}")
        finally:
            sftp.close()
            ssh.close()
        return stats

    ALLOWED_KEYS = [
        "Timestamp",
        "Throughput",
        "ThroughputTX",
        "ThroughputRX",
        "TCPDataThroughput",
        "TCPDataThroughputTX",
        "TCPDataThroughputRX",
        "ParallelClientSessions",
        "ActiveConnections",
        "ConnectionsSucceeded",
        "ConnectionsFailed",
        "ConnectionsAccepted",
        "ConnectionRate",
        "AverageConnectionLatency",
    ]

    def stats_to_image(self, stats: list) -> BytesIO:
        # Filter each dictionary to only include allowed keys
        filtered_stats = [
            {k: d.get(k, "") for k in self.ALLOWED_KEYS}
            for d in stats
        ]
        df = pd.DataFrame(filtered_stats)
        fig_width = max(16, min(2.5 * len(df.columns), 48))
        fig_height = max(4, min(0.8 * len(df), 36))
        fig, ax = plt.subplots(figsize=(fig_width, fig_height))
        ax.axis('off')
        tbl = ax.table(cellText=df.values, colLabels=df.columns, loc='center')
        tbl.auto_set_font_size(False)
        tbl.set_fontsize(16)
        tbl.scale(1.4, 1.4)

        # Adjust column widths based on header text length
        for i, key in enumerate(df.columns):
            col_width = max(0.15, min(len(str(key)) * 0.13, 0.5))  # Adjust these factors as needed
            tbl.auto_set_column_width([i])
            for j in range(len(df) + 1):  # +1 for header
                cell = tbl[(j, i)]
                cell.set_width(col_width)

        plt.tight_layout()
        img_bytes = BytesIO()
        plt.savefig(img_bytes, format='png', bbox_inches='tight')
        plt.close(fig)
        img_bytes.seek(0)
        return img_bytes

    def read_server_logs(self, test_id: str) -> str:
        """Read server log file for the given test_id"""
        # Use server_ip from active_tests if available, otherwise fall back to settings
        if test_id in self.active_tests:
            server_ip = self.active_tests[test_id].get("server_ip", settings.SERVER_IP)
        else:
            server_ip = settings.SERVER_IP
        
        log_path = f"{test_id}_server.log"
        
        ssh = self._connect_ssh(server_ip)
        sftp = ssh.open_sftp()
        
        try:
            with sftp.open(log_path, 'r') as f:
                log_content = f.read()
        except FileNotFoundError:
            raise Exception(f"Server log file not found: {log_path}")
        finally:
            sftp.close()
            ssh.close()
            
        return log_content

    def read_client_logs(self, test_id: str) -> str:
        """Read client log file for the given test_id"""
        # Use client_ip from active_tests if available, otherwise fall back to settings
        if test_id in self.active_tests:
            client_ip = self.active_tests[test_id].get("client_ip", settings.CLIENT_IP)
        else:
            client_ip = settings.CLIENT_IP
        
        log_path = f"{test_id}_client.log"
        
        ssh = self._connect_ssh(client_ip)
        sftp = ssh.open_sftp()
        
        try:
            with sftp.open(log_path, 'r') as f:
                log_content = f.read()
        except FileNotFoundError:
            raise Exception(f"Client log file not found: {log_path}")
        finally:
            sftp.close()
            ssh.close()
            
        return log_content


