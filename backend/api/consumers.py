from channels.generic.websocket import AsyncJsonWebsocketConsumer

class SoilConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.plot_id = self.scope["url_route"]["kwargs"]["plot_id"]
        self.group_name = f"plot-{self.plot_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def new_reading(self, event):
        await self.send_json(event["payload"])
