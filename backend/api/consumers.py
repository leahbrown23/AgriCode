from channels.generic.websocket import AsyncJsonWebsocketConsumer

class SoilConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        try:
            # Grab plot_id from the URL route kwargs
            self.plot_id = self.scope["url_route"]["kwargs"]["plot_id"]
            self.group_name = f"plot-{self.plot_id}"

            print(f"[CONNECT] Incoming WebSocket for plot {self.plot_id}")
            print(f"[CONNECT] Group name: {self.group_name}")

            # Join the channel layer group
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            print(f"[CONNECT] Joined channel layer group {self.group_name}")

            # Accept the WebSocket connection
            await self.accept()
            print(f"[CONNECT] WebSocket connection accepted for plot {self.plot_id}")

            # Optional initial confirmation message to frontend
            await self.send_json({
                "type": "connection_established",
                "message": f"Connected to plot {self.plot_id}"
            })

        except Exception as e:
            print(f"[ERROR] SoilConsumer.connect() failed: {e}")
            await self.close()

    async def disconnect(self, close_code):
        print(f"[DISCONNECT] WebSocket closed for plot {getattr(self, 'plot_id', '?')} (code={close_code})")
        try:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            print(f"[DISCONNECT] Left group {getattr(self, 'group_name', '?')}")
        except Exception as e:
            print(f"[ERROR] SoilConsumer.disconnect() failed: {e}")

    async def receive_json(self, content, **kwargs):
        print(f"[RECEIVE] Message from client on plot {getattr(self, 'plot_id', '?')}: {content}")
        # (You can later process messages sent from frontend here)

    async def new_reading(self, event):
        print(f"[SEND] new_reading event for plot {getattr(self, 'plot_id', '?')}: {event['payload']}")
        await self.send_json(event["payload"])

    async def soil_update(self, event):
        print(f"[SEND] soil_update event for plot {getattr(self, 'plot_id', '?')}: {event['payload']}")
        await self.send_json(event["payload"])
