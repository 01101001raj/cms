from pydantic import BaseModel, Field
from .base_config import base_config
from .common import NotificationType

class Notification(BaseModel):
    id: str
    date: str
    message: str
    is_read: bool = Field(alias="isRead")
    type: NotificationType
    
    model_config = base_config
