"""PUCT search with batched leaf evaluation and path-safe tree nodes."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Sequence

import numpy as np
import torch

from .encoding import encode_batch
from .rules import BLUE, GameState


@dataclass
class Edge:
    action: int
    parent_turn: int
    child: 'Node'
    prior: float
    visits: int = 0
    value_sum: float = 0.0

    @property
    def q(self) -> float:
        return self.value_sum / self.visits if self.visits else 0.0


@dataclass
class Node:
    state: GameState
    children: dict[int, Edge] = field(default_factory=dict)

    @property
    def visits(self) -> int:
        return sum(edge.visits for edge in self.children.values())


class NetworkEvaluator:
    def __init__(self, model: torch.nn.Module, device: torch.device, amp: bool = True):
        self.model = model
        self.device = device
        self.amp = bool(amp and device.type == 'cuda')

    def predict(self, states: Sequence[GameState]) -> tuple[np.ndarray, np.ndarray]:
        if not states:
            return np.empty((0, 648), dtype=np.float32), np.empty((0,), dtype=np.float32)
        x = torch.from_numpy(encode_batch(list(states))).to(self.device, non_blocking=True)
        with torch.inference_mode(), torch.autocast(device_type=self.device.type, dtype=torch.float16, enabled=self.amp):
            logits, values = self.model(x)
        return logits.float().cpu().numpy(), values.float().cpu().numpy()


def _expand(node: Node, logits: np.ndarray) -> None:
    if node.state.is_terminal() or node.children:
        return
    legal = node.state.legal_actions()
    if not legal:
        return
    selected = np.asarray(legal, dtype=np.int64)
    values = logits[selected].astype(np.float64)
    values -= np.max(values)
    priors = np.exp(values)
    priors /= np.sum(priors)
    for action, prior in zip(legal, priors):
        child_state = node.state.copy()
        child_state.play(action)
        node.children[action] = Edge(action, node.state.turn, Node(child_state), float(prior))


def _select(node: Node, c_puct: float) -> Edge:
    parent_visits = max(1, node.visits)
    return max(
        node.children.values(),
        key=lambda edge: edge.q + c_puct * edge.prior * math.sqrt(parent_visits) / (1 + edge.visits),
    )


def _add_root_noise(node: Node, rng: np.random.Generator, alpha: float, epsilon: float) -> None:
    if not node.children:
        return
    noise = rng.dirichlet(np.full(len(node.children), alpha, dtype=np.float64))
    for edge, value in zip(node.children.values(), noise):
        edge.prior = (1.0 - epsilon) * edge.prior + epsilon * float(value)


def _backup(path: list[Edge], leaf_value: float) -> None:
    value = float(leaf_value)
    for edge in reversed(path):
        if edge.parent_turn != edge.child.state.turn:
            value = -value
        edge.visits += 1
        edge.value_sum += value


def search_batch(
    states: Sequence[GameState], evaluator: NetworkEvaluator, simulations: int,
    c_puct: float = 1.5, add_noise: bool = False, rng: np.random.Generator | None = None,
    dirichlet_alpha: float = 0.3, noise_epsilon: float = 0.25,
) -> list[np.ndarray]:
    """Run equal-depth PUCT searches for multiple roots, batching leaf NN calls."""
    if simulations < 1:
        raise ValueError('simulations must be positive')
    rng = rng or np.random.default_rng()
    roots = [Node(state.copy()) for state in states]
    nonterminal = [root for root in roots if not root.state.is_terminal()]
    if nonterminal:
        logits, _ = evaluator.predict([root.state for root in nonterminal])
        for root, row in zip(nonterminal, logits):
            _expand(root, row)
            if add_noise:
                _add_root_noise(root, rng, dirichlet_alpha, noise_epsilon)

    for _ in range(simulations):
        leaves: list[Node] = []
        paths: list[list[Edge]] = []
        terminal_values: list[tuple[list[Edge], float]] = []
        for root in roots:
            node = root
            path: list[Edge] = []
            while node.children:
                edge = _select(node, c_puct)
                path.append(edge)
                node = edge.child
            if node.state.is_terminal():
                terminal_values.append((path, node.state.terminal_value()))
            else:
                leaves.append(node)
                paths.append(path)
        if leaves:
            logits, values = evaluator.predict([leaf.state for leaf in leaves])
            for leaf, path, row, value in zip(leaves, paths, logits, values):
                _expand(leaf, row)
                _backup(path, float(value))
        for path, value in terminal_values:
            _backup(path, value)

    policies: list[np.ndarray] = []
    for root in roots:
        policy = np.zeros(648, dtype=np.float32)
        if root.children:
            visits = np.asarray([edge.visits for edge in root.children.values()], dtype=np.float64)
            if visits.sum() == 0:
                visits.fill(1.0)
            visits /= visits.sum()
            for action, probability in zip(root.children, visits):
                policy[action] = float(probability)
        else:
            legal = root.state.legal_actions()
            if legal:
                policy[legal] = 1.0 / len(legal)
        policies.append(policy)
    return policies


def choose_from_policy(policy: np.ndarray, temperature: float, rng: np.random.Generator) -> int:
    legal = np.flatnonzero(policy > 0)
    if len(legal) == 0:
        raise ValueError('policy contains no legal action')
    if temperature <= 1e-8:
        return int(legal[np.argmax(policy[legal])])
    weights = np.power(policy[legal].astype(np.float64), 1.0 / temperature)
    weights /= weights.sum()
    return int(rng.choice(legal, p=weights))
