from typing import Optional
from pydantic import BaseModel, Field


class UpdateUsernameRequest(BaseModel):
    old_username: str
    new_username: str


class CreateRoomRequest(BaseModel):
    username: str


class JoinRoomRequest(BaseModel):
    room_id: str
    username: str


class LeaveRoomRequest(BaseModel):
    room_id: str
    username: str


class DeleteRoomRequest(BaseModel):
    room_id: str
    username: str


class SetReadyRequest(BaseModel):
    room_id: str
    username: str
    ready: bool


class SetRoundConfigRequest(BaseModel):
    room_id: str
    username: str
    target_word: Optional[str] = Field(default=None, max_length=50)
    hint: Optional[str] = Field(default=None, max_length=50)  # legacy field name
    clue: Optional[str] = Field(default=None, max_length=120)


class SelectDrawerRequest(BaseModel):
    room_id: str
    username: str
    drawer: str


class SubmitDrawingRequest(BaseModel):
    room_id: str
    username: str
    image: str  # base64 encoded PNG data URL


class SendMessageRequest(BaseModel):
    room_id: str
    username: str
    message: str = Field(..., max_length=200)


class DrawingStatusRequest(BaseModel):
    room_id: str
    username: Optional[str] = None


class StartRoundRequest(BaseModel):
    room_id: str
    username: str


class ResetRoundRequest(BaseModel):
    room_id: str
    username: str


class GuessWordRequest(BaseModel):
    room_id: str
    username: str
    guess: str = Field(..., max_length=50)


class SkipGuessRequest(BaseModel):
    room_id: str
    username: str


class SyncDrawingRequest(BaseModel):
    room_id: str
    username: str
    image: str  # base64 encoded PNG data URL


class TriggerAIGuessRequest(BaseModel):
    room_id: str
    username: str
    image: Optional[str] = None


class ModelConfigPayload(BaseModel):
    url: Optional[str] = Field(default=None, max_length=200)
    key: Optional[str] = Field(default=None, max_length=200)
    model: Optional[str] = Field(default=None, max_length=100)
    prompt: Optional[str] = Field(default=None, max_length=2000)


class UpdateModelConfigRequest(BaseModel):
    room_id: str
    username: str
    config: ModelConfigPayload
