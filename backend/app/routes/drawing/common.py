from __future__ import annotations

import random
from typing import Any, Dict, Tuple

from ...shared import rooms
from ..rooms import ensure_player_state

TARGET_WORDS: Tuple[str, ...] = (
    "苹果",
    "猫",
    "房子",
    "汽车",
    "树",
    "太阳",
    "月亮",
    "星星",
    "鱼",
    "鸟",
)


def ensure_room(room_id: str) -> tuple[dict | None, dict | None]:
    if room_id not in rooms:
        return None, {"success": False, "message": "房间不存在"}
    return rooms[room_id], None


def ensure_player(room: dict, username: str) -> dict | None:
    if username not in room.get("players", []):
        return {"success": False, "message": "不在房间中"}
    return None


def get_pending_guessers(room: dict) -> set[str]:
    pending = room.get("pending_guessers")
    if isinstance(pending, set):
        return pending
    if isinstance(pending, list):
        converted = set(pending)
        room["pending_guessers"] = converted
        return converted
    converted: set[str] = set()
    room["pending_guessers"] = converted
    return converted


def get_guess_tracker(room: dict) -> Dict[str, str]:
    tracker = room.get("guess_tracker")
    if isinstance(tracker, dict):
        return tracker
    tracker = {}
    room["guess_tracker"] = tracker
    return tracker


def reset_guess_tracker(room: dict, drawer: str | None) -> Dict[str, str]:
    tracker = get_guess_tracker(room)
    tracker.clear()
    if not drawer:
        return tracker
    for player in room.get("players", []):
        if player != drawer:
            tracker[player] = "pending"
    return tracker


def reset_pending_guessers(room: dict, drawer: str | None) -> None:
    tracker = reset_guess_tracker(room, drawer)
    pending = get_pending_guessers(room)
    pending.clear()
    for player, status in tracker.items():
        if status == "pending":
            pending.add(player)


def resolve_guesser(room: dict, username: str, status: str) -> None:
    tracker = get_guess_tracker(room)
    tracker[username] = status


def update_pending_guesser(room: dict, username: str) -> bool:
    resolved = False
    pending = get_pending_guessers(room)
    if username in pending:
        pending.discard(username)
        resolved = True
    tracker = get_guess_tracker(room)
    if username in tracker and tracker[username] == "pending":
        tracker[username] = "resolved"
    elif username not in tracker:
        tracker[username] = "resolved"
    return resolved


def all_guessers_resolved(room: dict) -> bool:
    tracker = get_guess_tracker(room)
    current_drawer = room.get("current_drawer")
    players = room.get("players", [])

    if not players:
        return True

    all_resolved = True

    for player in list(tracker.keys()):
        if player not in players or player == current_drawer:
            tracker.pop(player, None)

    for player in players:
        if player == current_drawer:
            continue

        state = ensure_player_state(room, player)
        status = state.guess_status

        if status in {"guessed", "skipped"}:
            tracker[player] = status
            continue

        tracker[player] = "pending"
        all_resolved = False

    return all_resolved


def normalize_guess_payload(guess_result: dict | None, current_target: str | None, timestamp: float) -> tuple[dict, bool]:
    guess_result = guess_result or {}
    guess_payload = dict(guess_result)
    guess_payload["timestamp"] = timestamp
    if current_target:
        guess_payload["target_word"] = current_target

    best_guess = guess_payload.get("best_guess")
    if best_guess is not None and not isinstance(best_guess, str):
        guess_payload["best_guess"] = str(best_guess)

    alternatives = guess_payload.get("alternatives") or []
    if not isinstance(alternatives, list):
        alternatives = [alternatives]
    guess_payload["alternatives"] = [
        str(item) for item in alternatives if isinstance(item, (str, int, float))
    ]

    success = False
    matched_with: str | None = None

    if current_target:
        target_normalized = current_target.strip().lower()

        def _matches(candidate: str | None) -> bool:
            if not candidate:
                return False
            candidate_norm = candidate.strip().lower()
            return target_normalized in candidate_norm or candidate_norm in target_normalized

        if guess_result.get("success", True):
            primary_guess = guess_payload.get("best_guess") if isinstance(guess_payload.get("best_guess"), str) else None
            if primary_guess and _matches(primary_guess):
                success = True
                matched_with = primary_guess
            else:
                for alt in guess_payload["alternatives"]:
                    if isinstance(alt, str) and _matches(alt):
                        success = True
                        matched_with = alt
                        break

    guess_payload["matched"] = success
    if matched_with:
        guess_payload["matched_with"] = matched_with

    return guess_payload, success


def ensure_history_entry(room: dict, drawer: str | None, timestamp: float) -> dict:
    history = room.setdefault("draw_history", [])
    current_round = room.get("current_round", 1)
    entry = None
    for existing in reversed(history):
        if existing.get("round") == current_round and existing.get("drawer") == drawer:
            entry = existing
            break
    if entry is None:
        entry = {
            "round": current_round,
            "target_word": None,
            "drawer": drawer,
            "submitted_at": timestamp,
            "guess": None,
            "success": False,
            "human_guesses": [],
            "correct_players": [],
        }
        history.append(entry)
        if len(history) > 10:
            del history[:-10]

    entry.setdefault("human_guesses", [])
    entry.setdefault("correct_players", [])
    return entry


def record_history_entry(room: dict, timestamp: float, guess_payload: dict, success: bool, drawer: str | None) -> None:
    entry = ensure_history_entry(room, drawer, timestamp)
    entry.update({
        "target_word": room.get("current_target") or room.get("current_hint"),
        "submitted_at": timestamp,
        "guess": guess_payload,
    })
    entry["success"] = entry.get("success", False) or success


def record_human_guess(room: dict, username: str, guess_text: str, correct: bool, timestamp: float) -> None:
    drawer = room.get("current_drawer")
    entry = ensure_history_entry(room, drawer, timestamp)
    human_guesses: list[dict[str, Any]] = entry.setdefault("human_guesses", [])
    human_guesses.append({
        "player": username,
        "guess": guess_text,
        "correct": correct,
        "timestamp": timestamp,
    })
    if correct:
        correct_players: list[str] = entry.setdefault("correct_players", [])
        if username not in correct_players:
            correct_players.append(username)
    entry["success"] = entry.get("success", False) or correct


def choose_target_word() -> str:
    return random.choice(TARGET_WORDS)


def prepare_turn(room: dict, drawer: str, target: str | None = None, clue: str | None = None) -> None:
    players = room.get("players", [])
    chosen_target = (target or "").strip() if isinstance(target, str) else None
    if not chosen_target:
        chosen_target = choose_target_word()

    room["current_drawer"] = drawer
    room["current_target"] = chosen_target
    room["current_hint"] = chosen_target
    normalized_clue = (clue or "").strip() if isinstance(clue, str) else None
    room["current_clue"] = normalized_clue or None
    room["status"] = "drawing"
    room["current_submission"] = None
    room["current_drawing"] = None
    room["ai_result"] = None
    room["ai_success_awarded"] = False
    room.pop("round_finished_at", None)

    for player in players:
        ensure_player_state(room, player).reset_for_round()

    reset_pending_guessers(room, drawer)


def complete_turn(room: dict, timestamp: float) -> dict:
    drawer_queue = room.get("drawer_queue") or []
    current_index = room.get("current_drawer_index", 0) + 1
    room["current_drawer_index"] = current_index

    if current_index >= len(drawer_queue):
        room["status"] = "finished"
        room["current_drawer"] = None
        room["current_target"] = None
        room["current_hint"] = None
        room["current_clue"] = None
        room["current_drawing"] = None
        room["ai_result"] = None
        room["ai_success_awarded"] = False
        room["round_finished_at"] = timestamp
        get_pending_guessers(room).clear()
        get_guess_tracker(room).clear()
        return {"round_finished": True}

    next_drawer = drawer_queue[current_index]
    prepare_turn(room, next_drawer)
    return {
        "round_finished": False,
        "next_drawer": next_drawer,
    }


def finalize_ai_success(room: dict, timestamp: float) -> dict | None:
    if room.get("ai_success_awarded"):
        return None

    drawer = room.get("current_drawer")
    if drawer:
        drawer_state = ensure_player_state(room, drawer)
        drawer_state.add_score(1)
        if drawer_state.guess_status != "guessed":
            drawer_state.mark_guess("guessed", timestamp)

    room["ai_success_awarded"] = True
    if all_guessers_resolved(room):
        return complete_turn(room, timestamp)
    return None


__all__ = [
    "TARGET_WORDS",
    "ensure_room",
    "ensure_player",
    "get_pending_guessers",
    "get_guess_tracker",
    "reset_pending_guessers",
    "resolve_guesser",
    "update_pending_guesser",
    "all_guessers_resolved",
    "normalize_guess_payload",
    "ensure_history_entry",
    "record_history_entry",
    "record_human_guess",
    "choose_target_word",
    "prepare_turn",
    "complete_turn",
    "finalize_ai_success",
]
