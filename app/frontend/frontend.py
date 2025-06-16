import reflex as rx
import requests
import json

class State(rx.State):
    """The app state."""
    server_running: bool = False
    client_running: bool = False
    statistics: str = ""
    error: str = ""
    server_response: str = ""
    # Start Server form fields
    cps: bool = False
    port: int = 5202
    length: str = "1k"
    csv_stats: bool = True
    # Keep client/stats input for now
    client_input: str = ""
    stats_input: str = ""
    # Add new state fields for client form
    test_id: str = ""
    server_ip: str = ""
    client_cps: str = ""
    client_port: int = 5202
    client_length: str = "1k"
    client_time: int = 60
    client_csv_stats: bool = True
    client_bitrate: str = ""
    client_parallel: int = 1
    client_reverse: bool = False
    client_bidi: bool = False
    client_interval: int = 0
    latest_stats_pretty: str = ""

    def increment(self):
        self.count += 1

    def decrement(self):
        self.count -= 1

    def set_cps(self, value):
        # Accept both string and boolean
        if value in [True, "true", "True"]:
            self.cps = True
        else:
            self.cps = False
    def set_port(self, value):
        try:
            self.port = int(value)
        except Exception:
            self.port = 0
    def set_length(self, value):
        self.length = value
    def set_csv_stats(self, value):
        if value in [True, "true", "True"]:
            self.csv_stats = True
        else:
            self.csv_stats = False

    def set_client_input(self, value):
        self.client_input = value
    def set_stats_input(self, value):
        self.stats_input = value

    def set_test_id(self, value):
        self.test_id = value
    def set_server_ip(self, value):
        self.server_ip = value
    def set_client_cps(self, value):
        self.client_cps = value
    def set_client_port(self, value):
        try:
            self.client_port = int(value)
        except Exception:
            self.client_port = 0
    def set_client_length(self, value):
        self.client_length = value
    def set_client_time(self, value):
        try:
            self.client_time = int(value)
        except Exception:
            self.client_time = 0
    def set_client_csv_stats(self, value):
        if value in [True, "true", "True"]:
            self.client_csv_stats = True
        else:
            self.client_csv_stats = False
    def set_client_bitrate(self, value):
        self.client_bitrate = value
    def set_client_parallel(self, value):
        try:
            self.client_parallel = int(value)
        except Exception:
            self.client_parallel = 0
    def set_client_reverse(self, value):
        if value in [True, "true", "True"]:
            self.client_reverse = True
        else:
            self.client_reverse = False
    def set_client_bidi(self, value):
        if value in [True, "true", "True"]:
            self.client_bidi = True
        else:
            self.client_bidi = False
    def set_client_interval(self, value):
        try:
            self.client_interval = int(value)
        except Exception:
            self.client_interval = 0

    def start_server(self):
        try:
            payload = {
                "params": {
                    "cps": self.cps,
                    "port": self.port,
                    "length": self.length,
                    "csv_stats": self.csv_stats,
                }
            }
            response = requests.post(
                "http://localhost:8088/start_server",
                json=payload
            )
            if response.status_code == 200:
                self.server_running = True
                self.error = ""
                self.server_response = response.text
            else:
                self.error = f"Failed to start server: {response.text}"
                self.server_response = ""
        except Exception as e:
            self.error = str(e)
            self.server_response = ""

    def start_client(self):
        try:
            payload = {
                "test_id": self.test_id,
                "server_ip": self.server_ip,
                "params": {
                    "cps": self.client_cps,
                    "port": self.client_port,
                    "length": self.client_length,
                    "time": self.client_time,
                    "csv_stats": self.client_csv_stats,
                    "bitrate": self.client_bitrate,
                    "parallel": self.client_parallel,
                    "reverse": self.client_reverse,
                    "bidi": self.client_bidi,
                    "interval": self.client_interval,
                }
            }
            response = requests.post(
                "http://localhost:8088/start_client",
                json=payload
            )
            if response.status_code == 200:
                self.client_running = True
                self.error = ""
                self.server_response = response.text
            else:
                self.error = f"Failed to start client: {response.text}"
                self.server_response = ""
        except Exception as e:
            self.error = str(e)
            self.server_response = ""

    def kill_server(self):
        try:
            response = requests.post("http://localhost:8088/kill_server")
            if response.status_code == 200:
                self.server_running = False
                self.client_running = False
                self.error = ""
            else:
                self.error = f"Failed to kill server: {response.text}"
        except Exception as e:
            self.error = str(e)

    def get_statistics(self):
        try:
            data = self.stats_input or "{}"
            response = requests.get(
                "http://localhost:8088/statistics",
                params=eval(data) if data.strip().startswith("{") else data
            )
            if response.status_code:
                self.statistics = response.text
                self.error = ""
                # Compute pretty latest stats
                try:
                    #stats = json.loads(self.statistics)
                    stats = [
                        {
                            "interface": "eth0",
                            "rx_bytes": 123456789,
                            "tx_bytes": 987654321,
                            "rx_packets": 123456,
                            "tx_packets": 654321,
                            "status": "up",
                            "speed_mbps": 1000
                        },
                        {
                            "interface": "eth1",
                            "rx_bytes": 234567890,
                            "tx_bytes": 876543210,
                            "rx_packets": 234567,
                            "tx_packets": 543210,
                            "status": "down",
                            "speed_mbps": 100
                        },
                        {
                            "interface": "lo",
                            "rx_bytes": 345678901,
                            "tx_bytes": 765432109,
                            "rx_packets": 345678,
                            "tx_packets": 432109,
                            "status": "up",
                            "speed_mbps": 0
                        }
                        ]
                    if isinstance(stats, list) and stats:
                        self.latest_stats_pretty = json.dumps(stats[-1], indent=2)
                    else:
                        self.latest_stats_pretty = "No data"
                except Exception:
                    self.latest_stats_pretty = "No data"
            else:
                self.statistics = ""
                self.error = f"Failed to get statistics: {response.text}"
                self.latest_stats_pretty = "No data"
        except Exception as e:
            self.statistics = ""
            self.error = str(e)
            self.latest_stats_pretty = "No data"

def index():
    return rx.flex(
        rx.box(
            rx.vstack(
                rx.heading(
                    "Cyperf-CE Lightweight UI",
                    size="6",
                    color="#22223b",
                    font_weight="bold",
                    margin_bottom="2",
                    font_family="'Inter', sans-serif",
                    text_align="center",
                    width="100%",
                ),
                rx.divider(margin_y="2"),
                # 1) Start Server
                rx.box(
                    rx.form(
                        rx.vstack(
                            rx.hstack(
                                rx.text("cps:", width="80px", font_size="1.1em", color="#2563eb", font_weight="bold"),
                                rx.checkbox(
                                    label="Enable cps",
                                    is_checked=State.cps,
                                    on_change=State.set_cps,
                                    color_scheme="blue",
                                ),
                            ),
                            rx.hstack(
                                rx.text("port:", width="80px", font_size="1.1em", color="#2563eb", font_weight="bold"),
                                rx.input(
                                    value=State.port,
                                    on_change=State.set_port,
                                    type_="number",
                                    width="100%",
                                    font_size="1.1em",
                                    color="#22223b",
                                    font_weight="medium",
                                    bg="#f7f7fa",
                                    border_radius="6px",
                                    border="1px solid #e0e0e0",
                                ),
                            ),
                            rx.hstack(
                                rx.text("length:", width="80px", font_size="1.1em", color="#2563eb", font_weight="bold"),
                                rx.input(
                                    value=State.length,
                                    on_change=State.set_length,
                                    width="100%",
                                    font_size="1.1em",
                                    color="#22223b",
                                    font_weight="medium",
                                    bg="#f7f7fa",
                                    border_radius="6px",
                                    border="1px solid #e0e0e0",
                                ),
                            ),
                            rx.hstack(
                                rx.text("csv_stats:", width="80px", font_size="1.1em", color="#2563eb", font_weight="bold"),
                                rx.checkbox(
                                    label="Enable csv_stats",
                                    is_checked=State.csv_stats,
                                    on_change=State.set_csv_stats,
                                    color_scheme="blue",
                                ),
                            ),
                            rx.button(
                                "Start Server",
                                on_click=State.start_server,
                                is_disabled=State.server_running,
                                width="100%",
                                color_scheme="blue",
                                font_size="1.1em",
                                padding_y="1.2em",
                                border_radius="6px",
                                _hover={"bg": "#2563eb", "color": "white"},
                            ),
                            spacing="2",
                        ),
                        width="100%",
                    ),
                    bg="#e0f2fe",
                    border="1.5px solid #2563eb",
                    border_radius="10px",
                    margin_y="2em",
                    box_shadow="0 2px 8px 0 rgba(37, 99, 235, 0.08)",
                    width="100%",
                    max_width="100%",
                    min_width="0",
                    margin_x="0",
                    padding="2.5em",
                ),
                rx.cond(
                    State.server_response != "",
                    rx.box(
                        rx.text(State.server_response, color="#16a34a", font_weight="bold", font_size="1.1em", bg="#e6f9ed", padding="2", border_radius="6px", margin_top="2"),
                        margin_left="2",
                        align="center",
                    ),
                ),
                rx.text(rx.cond(State.server_running, "Server Running", "Server Stopped"), color="#22223b", font_weight="medium", margin_bottom="2"),
                # 2) Start Client
                rx.box(
                    rx.form(
                        rx.vstack(
                            rx.hstack(
                                rx.text("test_id:", width="110px", font_size="1.1em", color="#2563eb", font_weight="bold"),
                                rx.input(
                                    value=State.test_id,
                                    on_change=State.set_test_id,
                                    width="100%",
                                    font_size="1.1em",
                                    color="#22223b",
                                    font_weight="medium",
                                    bg="#f7f7fa",
                                    border_radius="6px",
                                    border="1px solid #e0e0e0",
                                ),
                            ),
                            rx.hstack(
                                rx.text("server_ip:", width="110px", font_size="1.1em", color="#2563eb", font_weight="bold"),
                                rx.input(
                                    value=State.server_ip,
                                    on_change=State.set_server_ip,
                                    width="100%",
                                    font_size="1.1em",
                                    color="#22223b",
                                    font_weight="medium",
                                    bg="#f7f7fa",
                                    border_radius="6px",
                                    border="1px solid #e0e0e0",
                                ),
                            ),
                            rx.hstack(
                                rx.text("cps:", width="110px", font_size="1.1em", color="#2563eb", font_weight="bold"),
                                rx.input(
                                    value=State.client_cps,
                                    on_change=State.set_client_cps,
                                    width="100%",
                                    font_size="1.1em",
                                    color="#22223b",
                                    font_weight="medium",
                                    bg="#f7f7fa",
                                    border_radius="6px",
                                    border="1px solid #e0e0e0",
                                ),
                            ),
                            rx.hstack(
                                rx.text("port:", width="110px", font_size="1.1em", color="#2563eb", font_weight="bold"),
                                rx.input(
                                    value=State.client_port,
                                    on_change=State.set_client_port,
                                    type_="number",
                                    width="100%",
                                    font_size="1.1em",
                                    color="#22223b",
                                    font_weight="medium",
                                    bg="#f7f7fa",
                                    border_radius="6px",
                                    border="1px solid #e0e0e0",
                                ),
                            ),
                            rx.hstack(
                                rx.text("length:", width="110px", font_size="1.1em", color="#2563eb", font_weight="bold"),
                                rx.input(
                                    value=State.client_length,
                                    on_change=State.set_client_length,
                                    width="100%",
                                    font_size="1.1em",
                                    color="#22223b",
                                    font_weight="medium",
                                    bg="#f7f7fa",
                                    border_radius="6px",
                                    border="1px solid #e0e0e0",
                                ),
                            ),
                            rx.hstack(
                                rx.text("time:", width="110px", font_size="1.1em", color="#2563eb", font_weight="bold"),
                                rx.input(
                                    value=State.client_time,
                                    on_change=State.set_client_time,
                                    type_="number",
                                    width="100%",
                                    font_size="1.1em",
                                    color="#22223b",
                                    font_weight="medium",
                                    bg="#f7f7fa",
                                    border_radius="6px",
                                    border="1px solid #e0e0e0",
                                ),
                            ),
                            rx.hstack(
                                rx.text("csv_stats:", width="110px", font_size="1.1em", color="#2563eb", font_weight="bold"),
                                rx.checkbox(
                                    label="Enable csv_stats",
                                    is_checked=State.client_csv_stats,
                                    on_change=State.set_client_csv_stats,
                                    color_scheme="blue",
                                ),
                            ),
                            rx.hstack(
                                rx.text("bitrate:", width="110px", font_size="1.1em", color="#2563eb", font_weight="bold"),
                                rx.input(
                                    value=State.client_bitrate,
                                    on_change=State.set_client_bitrate,
                                    width="100%",
                                    font_size="1.1em",
                                    color="#22223b",
                                    font_weight="medium",
                                    bg="#f7f7fa",
                                    border_radius="6px",
                                    border="1px solid #e0e0e0",
                                ),
                            ),
                            rx.hstack(
                                rx.text("parallel:", width="110px", font_size="1.1em", color="#2563eb", font_weight="bold"),
                                rx.input(
                                    value=State.client_parallel,
                                    on_change=State.set_client_parallel,
                                    type_="number",
                                    width="100%",
                                    font_size="1.1em",
                                    color="#22223b",
                                    font_weight="medium",
                                    bg="#f7f7fa",
                                    border_radius="6px",
                                    border="1px solid #e0e0e0",
                                ),
                            ),
                            rx.hstack(
                                rx.text("reverse:", width="110px", font_size="1.1em", color="#2563eb", font_weight="bold"),
                                rx.checkbox(
                                    label="Enable reverse",
                                    is_checked=State.client_reverse,
                                    on_change=State.set_client_reverse,
                                    color_scheme="blue",
                                ),
                            ),
                            rx.hstack(
                                rx.text("bidi:", width="110px", font_size="1.1em", color="#2563eb", font_weight="bold"),
                                rx.checkbox(
                                    label="Enable bidi",
                                    is_checked=State.client_bidi,
                                    on_change=State.set_client_bidi,
                                    color_scheme="blue",
                                ),
                            ),
                            rx.hstack(
                                rx.text("interval:", width="110px", font_size="1.1em", color="#2563eb", font_weight="bold"),
                                rx.input(
                                    value=State.client_interval,
                                    on_change=State.set_client_interval,
                                    type_="number",
                                    width="100%",
                                    font_size="1.1em",
                                    color="#22223b",
                                    font_weight="medium",
                                    bg="#f7f7fa",
                                    border_radius="6px",
                                    border="1px solid #e0e0e0",
                                ),
                            ),
                            rx.button(
                                "Start Client",
                                on_click=State.start_client,
                                is_disabled=(~State.server_running) | State.client_running,
                                width="100%",
                                color_scheme="blue",
                                font_size="1.1em",
                                padding_y="1.2em",
                                border_radius="6px",
                                _hover={"bg": "#2563eb", "color": "white"},
                            ),
                            spacing="2",
                        ),
                        width="100%",
                    ),
                    bg="#e0f2fe",
                    border="1.5px solid #2563eb",
                    border_radius="10px",
                    margin_y="2em",
                    box_shadow="0 2px 8px 0 rgba(37, 99, 235, 0.08)",
                    width="100%",
                    max_width="100%",
                    min_width="0",
                    margin_x="0",
                    padding="2.5em",
                ),
                rx.text(rx.cond(State.client_running, "Client Running", "Client Stopped"), color="#22223b", font_weight="medium", margin_bottom="2"),
                # 3) Kill Server
                rx.text("Kill Server", font_weight="bold", font_size="1.1em", color="#4f4f4f", margin_top="3"),
                rx.button(
                    "Kill Server",
                    on_click=State.kill_server,
                    color_scheme="red",
                    is_disabled=~State.server_running,
                    width="100%",
                    font_size="1.1em",
                    padding_y="1.2em",
                    border_radius="6px",
                    _hover={"bg": "#b91c1c", "color": "white"},
                ),
                # 4) Show statistics
                rx.box(
                    rx.text("Show Statistics", font_weight="bold", font_size="1.1em", color="#2563eb", margin_bottom="2"),
                    rx.button(
                        "Show Statistics",
                        on_click=State.get_statistics,
                        is_disabled=~State.server_running,
                        width="100%",
                        color_scheme="blue",
                        font_size="1.1em",
                        padding_y="1.2em",
                        border_radius="6px",
                        _hover={"bg": "#2563eb", "color": "white"},
                    ),
                    # Parse statistics and plot graph + show final entry
                    rx.cond(
                        State.statistics != "",
                        rx.vstack(
                            # Parse JSON and plot
                            rx.text("Statistics Graph", font_weight="bold", font_size="1.1em", color="#2563eb", margin_top="2"),
                            rx.box(
                                # Mock plot: replace with rx.plot or similar if available
                                rx.text("[Graph would be rendered here]", color="#2563eb", font_style="italic", margin_bottom="1em"),
                                bg="#e0f2fe",
                                border_radius="8px",
                                padding="1em",
                                margin_bottom="1em",
                            ),
                            # Show final entry as a widget/card
                            rx.text("Latest Statistics", font_weight="bold", font_size="1.1em", color="#2563eb", margin_top="1em"),
                            rx.box(
                                rx.text(
                                    rx.cond(State.statistics != "", State.latest_stats_pretty, "No data"),
                                    font_family="monospace",
                                    font_size="1em",
                                    color="#22223b",
                                ),
                                bg="#f0fdfa",
                                border="1px solid #2563eb",
                                border_radius="8px",
                                padding="1em",
                                margin_top="0.5em",
                            ),
                        ),
                    ),
                    bg="#e0f2fe",
                    border="1.5px solid #2563eb",
                    border_radius="10px",
                    padding="2.5em",
                    margin_y="2em",
                    box_shadow="0 2px 8px 0 rgba(37, 99, 235, 0.08)",
                    width="100%",
                ),
                rx.text(State.error, color="#b91c1c", margin_top="2", font_weight="bold"),
                rx.text("Made with Reflex • Modern Python UI", color="#a0aec0", font_size="0.9em", margin_top="4", align="center"),
                spacing="3",
                padding="3vw",
                bg="#fff",
                border_radius="16px",
                box_shadow="0 8px 32px 0 rgba(31, 38, 135, 0.15)",
                width="100vw",
                max_width="100vw",
                min_width="0",
                margin_x="0",
                padding_y="3em",
            ),
        ),
        align="center",
        justify="center",
        min_height="100vh",
        bg="linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%)",
        width="100vw",
        font_family="'Inter', sans-serif",
    )

# Create the app
app = rx.App()
app.add_page(index, title="Cyperf-CE Lightweight UI") 