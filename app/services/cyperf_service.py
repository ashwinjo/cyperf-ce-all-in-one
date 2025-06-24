import paramiko
from typing import Dict, Any
from app.core.config import settings
import re
import csv

class CyperfService:
    def __init__(self):
        self.active_tests: Dict[str, Dict[str, Any]] = {}

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

    def start_server(self, test_id: str, params: Dict[str, Any]) -> Dict[str, Any]:
        command = f"nohup sudo cyperf -s"
        if params.get("cps"):
            command += " --cps"
        if params.get("port"):
            command += f" --port {params['port']}"
        if params.get("length"):
            command += f" --length {params['length']}"
        if params.get("csv_stats"):
            command += " --csv-stats"
        command += f" {test_id}_server.csv > {test_id}_server.log 2>&1 &"
        print(command)
        ssh = self._connect_ssh(settings.SERVER_IP)
        ssh.exec_command(command)
        find_cmd = "ps -ef | grep 'cyperf -s' | grep root | awk '{print $2}'"
        _, stdout, _ = ssh.exec_command(find_cmd)
        pids = stdout.read().decode().strip().split('\n')
        server_pid = int(pids[0]) if pids and pids[0] else None
        self.active_tests[test_id] = {
            "server_pid": server_pid,
            "command": command,
            "server_csv_path": f"{test_id}_server.csv"
        }
        ssh.close()
        return {"server_pid": server_pid}

    def start_client(self, test_id: str, server_ip: str, params: Dict[str, Any]) -> Dict[str, Any]:
        if test_id not in self.active_tests:
            raise Exception("Server not started for this test_id")
        command = f"nohup sudo cyperf -c {server_ip}"
        if params.get("cps"):
            command += f" --cps {params['cps']}"
        if params.get("port"):
            command += f" --port {params['port']}"
        if params.get("length"):
            command += f" --length {params['length']}"
        if params.get("time"):
            command += f" --time {params['time']}"
        if params.get("bitrate"):
            command += f" --bitrate {params['bitrate']}"
        if params.get("parallel"):
            command += f" --parallel {params['parallel']}"
        if params.get("reverse"):
            command += " --reverse"
        if params.get("bidi"):
            command += " --bidir"
        if params.get("interval"):
            command += f" --interval {params['interval']}"
        if params.get("csv_stats"):
            command += " --csv-stats"
        command += f" {test_id}_client.csv > {test_id}_client.log 2>&1 &"    
        ssh = self._connect_ssh(settings.CLIENT_IP)
        ssh.exec_command(command)
        find_cmd = "ps -ef | grep 'cyperf -c' | grep root | awk '{print $2}'"
        _, stdout, _ = ssh.exec_command(find_cmd)
        pids = stdout.read().decode().strip().split('\n')
        client_pid = int(pids[0]) if pids and pids[0] else None
        self.active_tests[test_id]["client_pid"] = client_pid
        self.active_tests[test_id]["client_log_path"] = f"{test_id}_client.log"
        self.active_tests[test_id]["client_csv_path"] = f"{test_id}_client.csv"
        ssh.close()
        return {"client_pid": client_pid, 
                "command": command, 
                "client_csv_path": f"{test_id}_client.csv"}

    def stop_server(self) -> Dict[str, Any]:
        ssh = self._connect_ssh(settings.SERVER_IP)
        pids = "sudo ps aux | grep -i \"[c]yperf\|[s]erver\" | awk '{print $2}'"
        ssh.exec_command(pids)
        kill_cmd = "sudo ps aux | grep -i \"[c]yperf\|[s]erver\" | awk '{print $2}' | sudo xargs kill -9"
        ssh.exec_command(kill_cmd)
        ssh.close()
        return {"cyperf_server_pids_killed": "true"}
        
    def get_server_stats(self, test_id: str):
        if test_id not in self.active_tests:
            raise Exception("Test not found")
        output = self.read_server_csv_stats(test_id)
        return output

    def get_client_stats(self, test_id: str) -> str:
        if test_id not in self.active_tests:
            raise Exception("Test not found")
        output = self.read_client_csv_stats(test_id)
        return output

    def read_client_csv_stats(self, test_id: str) -> list:
        csv_path = f"{test_id}_client.csv"
        stats = []
        ssh = self._connect_ssh(settings.CLIENT_IP)
        sftp = ssh.open_sftp()
        with sftp.open(csv_path, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                stats.append(row)
        sftp.close()
        ssh.close()
        return stats

    def read_server_csv_stats(self, test_id: str) -> list:
        csv_path = f"{test_id}_server.csv"
        stats = []
        ssh = self._connect_ssh(settings.SERVER_IP)
        sftp = ssh.open_sftp()
        with sftp.open(csv_path, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                stats.append(row)
        sftp.close()
        ssh.close()
        return stats


