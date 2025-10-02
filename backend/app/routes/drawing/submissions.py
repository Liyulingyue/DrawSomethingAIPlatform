from __future__ import annotations

import time
from fastapi import APIRouter

from ...models.schemas import (
    SubmitDrawingRequest,
    SyncDrawingRequest,
    TriggerAIGuessRequest,
)
from ...services.ai import guess_drawing
from ..rooms import ensure_player_state, export_scores, update_room_activity
from .common import (
    all_guessers_resolved,
    complete_turn,
    ensure_player,
    ensure_room,
    finalize_ai_success,
    normalize_guess_payload,
    record_history_entry,
    record_human_guess,
    resolve_guesser,
)

router = APIRouter()


@router.post("/submit")
async def submit_drawing(request: SubmitDrawingRequest):
    room, error = ensure_room(request.room_id)
    if error:
        return error
    err = ensure_player(room, request.username)
    if err:
        return err

    if room.get("status") not in {"drawing", "review", "success"}:
        return {"success": False, "message": "当前不在绘画阶段"}
    if room.get("current_drawer") != request.username:
        return {"success": False, "message": "仅指定绘画者可以提交作品"}
    current_target = room.get("current_target") or room.get("current_hint")
    if not current_target:
        return {"success": False, "message": "提示词尚未设置"}

    clue = room.get("current_clue")
    timestamp = time.time()
    room["current_submission"] = {
        "image": request.image,
        "submitted_by": request.username,
        "submitted_at": timestamp,
    }
    drawer_state = ensure_player_state(room, request.username)
    model_config = drawer_state.get_model_config()
    guess_result = guess_drawing(request.image, clue, model_config, current_target)
    guess_payload, success = normalize_guess_payload(guess_result, current_target, timestamp)
    drawer_state.set_ai_guess(guess_payload, timestamp)
    room["ai_result"] = guess_payload
    room["status"] = "success" if success else "review"

    record_history_entry(room, timestamp, guess_payload, success, request.username)

    completion = None
    if success:
        completion = finalize_ai_success(room, timestamp)
    update_room_activity(request.room_id)
    return {
        "success": True,
        "guess": guess_payload,
        "status": "success" if success else "review",
        "round_finished": bool(completion.get("round_finished")) if completion else False,
        "next_drawer": None if not completion or completion.get("round_finished") else completion.get("next_drawer"),
    }


@router.post("/ai_guess")
async def trigger_ai_guess(request: TriggerAIGuessRequest):
    room, error = ensure_room(request.room_id)
    if error:
        return error
    err = ensure_player(room, request.username)
    if err:
        return err

    player_state = ensure_player_state(room, request.username)

    if room.get("status") != "drawing":
        return {"success": False, "message": "当前不在绘画阶段"}

    image = request.image or room.get("current_drawing")
    if not image and room.get("current_submission"):
        image = room["current_submission"].get("image")

    if not image:
        return {"success": False, "message": "暂无可用于猜词的绘画数据"}

    drawer_username = room.get("current_drawer")
    status_texts = {
        "guessed": "已经猜中过这幅画",
        "skipped": "已经跳过这幅画",
    }
    if player_state.guess_status in status_texts:
        return {"success": False, "message": f"您{status_texts[player_state.guess_status]}"}

    clue = room.get("current_clue")
    current_target = room.get("current_target") or room.get("current_hint")
    timestamp = time.time()
    model_config = player_state.get_model_config()

    guess_result = guess_drawing(image, clue, model_config, current_target)
    guess_payload, success = normalize_guess_payload(guess_result, current_target, timestamp)
    player_state.set_ai_guess(guess_payload, timestamp)

    if success:
        player_state.mark_guess("guessed", timestamp)
        resolve_guesser(room, request.username, "guessed")
        player_state.add_score(1)
        if drawer_username:
            drawer_state = ensure_player_state(room, drawer_username)
            if drawer_state is not player_state:
                drawer_state.add_score(1)
            else:
                # Drawer testing their own AI gains an extra point as guesser and as drawer.
                drawer_state.add_score(1)

    record_human_guess(
        room,
        request.username,
        f"AI猜词: {guess_payload.get('best_guess', 'N/A')}",
        success,
        timestamp,
    )

    share_result = not drawer_username or drawer_username == request.username
    record_timestamp = timestamp

    if share_result:
        room["ai_result"] = guess_payload
        drawer_for_history = drawer_username or request.username
        submission = room.get("current_submission")
        if not submission:
            submission = {
                "image": image,
                "submitted_by": drawer_for_history,
                "submitted_at": timestamp,
            }
            room["current_submission"] = submission
        elif image:
            submission["image"] = image

        record_timestamp = submission.get("submitted_at", timestamp) if submission else timestamp
        record_history_entry(room, record_timestamp, guess_payload, success, drawer_for_history)

    completion = None
    if success and all_guessers_resolved(room):
        completion = complete_turn(room, record_timestamp)

    scores_snapshot = export_scores(room)

    if completion:
        update_room_activity(request.room_id)
        round_finished = bool(completion.get("round_finished"))
        next_drawer = None if round_finished else completion.get("next_drawer")
        return {
            "success": True,
            "correct": success,
            "guess": guess_payload,
            "round_finished": round_finished,
            "next_drawer": next_drawer,
            "scores": scores_snapshot,
        }

    update_room_activity(request.room_id)
    return {
        "success": True,
        "correct": success,
        "guess": guess_payload,
        "scores": scores_snapshot,
    }


@router.post("/sync_drawing")
async def sync_drawing(request: SyncDrawingRequest):
    room, error = ensure_room(request.room_id)
    if error:
        return error
    err = ensure_player(room, request.username)
    if err:
        return err

    if room.get("status") != "drawing":
        return {"success": False, "message": "当前不在绘画阶段"}

    if room.get("current_drawer") != request.username:
        return {"success": False, "message": "仅当前绘画者可以同步绘画数据"}

    room["current_drawing"] = request.image

    update_room_activity(request.room_id)
    return {"success": True}
