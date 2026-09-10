"""AlphaZero-style self-play training for the canonical Intransitive rules."""

from .encoding import ACTION_COUNT, decode_action, encode_action, encode_state
from .rules import GameState, initial_board

__all__ = [
    'ACTION_COUNT', 'GameState', 'decode_action', 'encode_action', 'encode_state',
    'initial_board',
]
