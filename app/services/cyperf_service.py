import paramiko
from typing import Dict, Any
from app.core.config import settings
import re
import csv
import pandas as pd
import matplotlib.pyplot as plt
from io import BytesIO

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

    def start_server(self, test_id: str, server_ip: str, params: Dict[str, Any]) -> Dict[str, Any]:
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
        ssh = self._connect_ssh(server_ip)
        ssh.exec_command(command)
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
        command = f"nohup sudo cyperf -c {server_ip}"
        if params.get("cps"):
            command += " --cps"
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
        ssh = self._connect_ssh(client_ip)
        ssh.exec_command(command)
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
        pids = "sudo ps aux | grep -i \"[c]yperf\|[s]erver\" | awk '{print $2}'"
        ssh.exec_command(pids)
        kill_cmd = "sudo ps aux | grep -i \"[c]yperf\|[s]erver\" | awk '{print $2}' | sudo xargs kill -9"
        ssh.exec_command(kill_cmd)
        ssh.close()
        return {"cyperf_server_pids_killed": "true", "server_ip": server_ip}
        
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
        if test_id not in self.active_tests:
            raise Exception("Test not found")
        client_ip = self.active_tests[test_id].get("client_ip", settings.CLIENT_IP)
        csv_path = f"{test_id}_client.csv"
        stats = []
        ssh = self._connect_ssh(client_ip)
        sftp = ssh.open_sftp()
        with sftp.open(csv_path, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                stats.append(row)
        sftp.close()
        ssh.close()
        return stats

    def read_server_csv_stats(self, test_id: str) -> list:
        if test_id not in self.active_tests:
            raise Exception("Test not found")
        server_ip = self.active_tests[test_id].get("server_ip", settings.SERVER_IP)
        csv_path = f"{test_id}_server.csv"
        stats = []
        ssh = self._connect_ssh(server_ip)
        sftp = ssh.open_sftp()
        with sftp.open(csv_path, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                stats.append(row)
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


