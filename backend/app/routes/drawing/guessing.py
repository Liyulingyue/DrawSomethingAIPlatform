from __future__ import annotations

import time
from fastapi import APIRouter

from ...models.schemas import GuessWordRequest, SkipGuessRequest
from ..rooms import ensure_player_state, export_scores, update_room_activity
from .common import (
    all_guessers_resolved,
    complete_turn,
    ensure_player,
    ensure_room,
    record_human_guess,
    resolve_guesser,
    update_pending_guesser,
)

router = APIRouter()


@router.post("/guess")
async def guess_word(request: GuessWordRequest):
    room, error = ensure_room(request.room_id)
    if error:
        return error
    err = ensure_player(room, request.username)
    if err:
        return err

    if room.get("status") not in {"drawing", "review", "success"}:
        return {"success": False, "message": "当前不在绘画阶段"}

    current_target = room.get("current_target") or room.get("current_hint")
    if not current_target:
        return {"success": False, "message": "目标词尚未设置"}

    if room.get("current_drawer") == request.username:
        return {"success": False, "message": "绘画者无需参与猜词"}

    player_state = ensure_player_state(room, request.username)

    if player_state.guess_status == "skipped":
        return {"success": False, "message": "您已经跳过了这幅画"}
    if player_state.guess_status == "guessed":
        return {"success": False, "message": "您已经猜中过这幅画"}

    target_normalized = current_target.strip().lower()
    raw_guess = request.guess.strip()
    guess_normalized = raw_guess.lower()
    is_correct = target_normalized in guess_normalized or guess_normalized in target_normalized

    guess_timestamp = time.time()
    if is_correct:
        player_state.mark_guess("guessed", guess_timestamp)
        resolve_guesser(room, request.username, "guessed")
        player_state.add_score(1)
        drawer = room.get("current_drawer")
        if drawer:
            ensure_player_state(room, drawer).add_score(1)
    else:
        player_state.last_guess_at = guess_timestamp
        player_state.last_action_at = guess_timestamp

    record_human_guess(room, request.username, raw_guess, is_correct, guess_timestamp)

    scores_snapshot = export_scores(room)

    if all_guessers_resolved(room):
        completion = complete_turn(room, guess_timestamp)
        update_room_activity(request.room_id)
        round_finished = bool(completion.get("round_finished"))
        next_drawer = None if round_finished else completion.get("next_drawer")
        return {
            "success": True,
            "correct": is_correct,
            "target_word": current_target if is_correct else None,
            "round_finished": round_finished,
            "next_drawer": next_drawer,
            "scores": scores_snapshot,
        }

    update_room_activity(request.room_id)
    return {
        "success": True,
        "correct": is_correct,
        "target_word": current_target if is_correct else None,
        "scores": scores_snapshot,
    }


@router.post("/skip_guess")
async def skip_guess(request: SkipGuessRequest):
    room, error = ensure_room(request.room_id)
    if error:
        return error
    err = ensure_player(room, request.username)
    if err:
        return err

    if room.get("status") not in {"drawing", "review", "success"}:
        return {"success": False, "message": "当前不在绘画阶段"}

    player_state = ensure_player_state(room, request.username)

    if player_state.guess_status in ["skipped", "guessed"]:
        return {"success": False, "message": "您已经跳过或猜过这幅画了"}

    skip_timestamp = time.time()
    player_state.mark_guess("skipped", skip_timestamp)
    resolve_guesser(room, request.username, "skipped")

    record_human_guess(room, request.username, "(skip)", False, skip_timestamp)

    scores_snapshot = export_scores(room)

    if all_guessers_resolved(room):
        completion = complete_turn(room, skip_timestamp)
        current_target = room.get("current_target") or room.get("current_hint")
        update_room_activity(request.room_id)
        round_finished = bool(completion.get("round_finished"))
        next_drawer = None if round_finished else completion.get("next_drawer")
        return {
            "success": True,
            "round_finished": round_finished,
            "target_word": current_target,
            "next_drawer": next_drawer,
            "scores": scores_snapshot,
        }

    update_room_activity(request.room_id)
    return {
        "success": True,
        "scores": scores_snapshot,
    }
