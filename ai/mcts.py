"""Batched neural search with PUCT and Full Gumbel root policy improvement.

The Gumbel path follows DeepMind mctx's Full Gumbel MuZero structure: legal
root actions are sampled without replacement with Gumbel-Top-k, simulations
are allocated by sequential halving, unvisited root Q values are completed by
the mixed value estimate, and the resulting improved policy is trained.
Interior nodes use the deterministic completed-policy selection rule. Nodes
are never transposition-merged because repetition and the halfmove clock are
path-dependent.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Sequence

import numpy as np
import torch

from .encoding import encode_batch
from .rules import GameState


@dataclass
class Edge:
    action: int
    parent_turn: int
    child: 'Node | None'
    prior: float
    prior_logit: float
    visits: int = 0
    value_sum: float = 0.0

    @property
    def q(self) -> float:
        return self.value_sum / self.visits if self.visits else 0.0


@dataclass
class Node:
    state: GameState
    children: dict[int, Edge] = field(default_factory=dict)
    expanded: bool = False
    raw_value: float = 0.0
    legal_actions: tuple[int, ...] = ()
    root_prior_logits: dict[int, float] = field(default_factory=dict)
    root_gumbel: dict[int, float] = field(default_factory=dict)
    root_schedule: tuple[int, ...] = ()

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


def _softmax(values: np.ndarray) -> np.ndarray:
    shifted = values - np.max(values)
    probabilities = np.exp(shifted)
    total = probabilities.sum()
    return probabilities / total if total > 0 and np.isfinite(total) else np.full_like(values, 1.0 / len(values))


def _expand(node: Node, logits: np.ndarray, value: float, actions: Sequence[int] | None = None) -> None:
    """Create edge statistics; successor states are created on selection."""
    if node.state.is_terminal() or node.expanded:
        return
    legal = tuple(node.state.legal_actions() if actions is None else actions)
    node.legal_actions = legal
    node.raw_value = float(value)
    node.expanded = True
    if not legal:
        return
    selected = np.asarray(legal, dtype=np.int64)
    selected_logits = np.asarray(logits[selected], dtype=np.float64)
    priors = _softmax(selected_logits)
    for action, prior, logit in zip(legal, priors, selected_logits):
        node.children[action] = Edge(action, node.state.turn, None, float(prior), float(logit))


def _materialize_child(edge: Edge, parent: Node) -> Node:
    if edge.child is None:
        # MCTS already carries exact position_counts, clock, and ply_count.
        # The public Move list is retained by ordinary copies, but is not
        # needed by a search child and must not be copied at every expansion.
        child_state = parent.state.copy(include_history=False)
        child_state.play_trusted(edge.action)
        edge.child = Node(child_state)
    return edge.child


def _select(node: Node, c_puct: float) -> Edge:
    parent_visits = max(1, node.visits)
    return max(
        node.children.values(),
        key=lambda edge: edge.q + c_puct * edge.prior * math.sqrt(parent_visits) / (1 + edge.visits),
    )


def _completed_qvalues(node: Node, edges: Sequence[Edge] | None = None,
                       value_scale: float = 0.1, maxvisit_init: float = 50.0) -> np.ndarray:
    """Return mixed-value completed Q values in the current node perspective."""
    edges = list(node.children.values()) if edges is None else list(edges)
    if not edges:
        return np.empty((0,), dtype=np.float64)
    visits = np.asarray([edge.visits for edge in edges], dtype=np.float64)
    qvalues = np.asarray([edge.q for edge in edges], dtype=np.float64)
    priors = _softmax(np.asarray([edge.prior_logit for edge in edges], dtype=np.float64))
    visited_probability = float(np.sum(priors * (visits > 0)))
    weighted_q = float(np.sum(np.where(visits > 0, priors * qvalues, 0.0))) / max(visited_probability, 1e-12)
    mixed_value = (float(node.raw_value) + float(np.sum(visits)) * weighted_q) / (float(np.sum(visits)) + 1.0)
    completed = np.where(visits > 0, qvalues, mixed_value)
    low, high = float(np.min(completed)), float(np.max(completed))
    normalized = (completed - low) / max(high - low, 1e-8)
    return normalized * (maxvisit_init + float(np.max(visits))) * value_scale


def _select_gumbel_interior(node: Node, value_scale: float = 0.1, maxvisit_init: float = 50.0) -> Edge:
    edges = list(node.children.values())
    completed = _completed_qvalues(node, edges, value_scale, maxvisit_init)
    logits = np.asarray([edge.prior_logit for edge in edges], dtype=np.float64)
    improved = _softmax(logits + completed)
    visits = np.asarray([edge.visits for edge in edges], dtype=np.float64)
    scores = improved - visits / (1.0 + float(visits.sum()))
    return edges[int(np.argmax(scores))]


def sequential_halving_schedule(max_num_considered_actions: int, simulations: int) -> tuple[int, ...]:
    """Return mctx-compatible considered-visit counts for each simulation."""
    max_num_considered_actions = int(max_num_considered_actions)
    simulations = int(simulations)
    if max_num_considered_actions < 1 or simulations < 1:
        raise ValueError('sequential-halving counts must be positive')
    if max_num_considered_actions == 1:
        return tuple(range(simulations))
    log2_max = int(math.ceil(math.log2(max_num_considered_actions)))
    sequence: list[int] = []
    visits = [0] * max_num_considered_actions
    considered = max_num_considered_actions
    while len(sequence) < simulations:
        extra = max(1, int(simulations / (log2_max * considered)))
        for _ in range(extra):
            sequence.extend(visits[:considered])
            # The official mctx schedule increments each considered arm for
            # every extra-visit pass, not once after the whole inner loop.
            for index in range(considered):
                visits[index] += 1
        considered = max(2, considered // 2)
    return tuple(sequence[:simulations])


def _initialize_gumbel_root(node: Node, logits: np.ndarray, value: float, simulations: int,
                            max_num_considered_actions: int, gumbel_scale: float,
                            rng: np.random.Generator) -> None:
    legal = tuple(node.state.legal_actions())
    node.legal_actions = legal
    node.raw_value = float(value)
    node.expanded = True
    if not legal:
        return
    legal_logits = np.asarray(logits[list(legal)], dtype=np.float64)
    node.root_prior_logits = {action: float(logit) for action, logit in zip(legal, legal_logits)}
    gumbels = rng.gumbel(0.0, 1.0, len(legal)) * float(gumbel_scale)
    considered = min(int(max_num_considered_actions), len(legal))
    node.root_gumbel = {action: float(gumbel) for action, gumbel in zip(legal, gumbels)}
    node.root_schedule = sequential_halving_schedule(considered, simulations)
    priors = _softmax(legal_logits)
    for action, prior, logit in zip(legal, priors, legal_logits):
        # Keep every legal root edge as statistics. This is the mctx layout:
        # sequential halving samples without replacement through visit-count
        # eligibility, while unvisited actions remain in completed-Q targets.
        node.children[action] = Edge(action, node.state.turn, None, float(prior), float(logit))


def _select_gumbel_root(node: Node, value_scale: float = 0.1, maxvisit_init: float = 50.0) -> Edge:
    simulation_index = node.visits
    considered_visit = node.root_schedule[min(simulation_index, len(node.root_schedule) - 1)]
    edges = list(node.children.values())
    completed = _completed_qvalues(node, edges, value_scale, maxvisit_init)
    scores = np.asarray([node.root_gumbel[edge.action] + edge.prior_logit + qvalue
                         for edge, qvalue in zip(edges, completed)], dtype=np.float64)
    eligible = [index for index, edge in enumerate(edges) if edge.visits == considered_visit]
    if not eligible:
        minimum = min(edge.visits for edge in edges)
        eligible = [index for index, edge in enumerate(edges) if edge.visits == minimum]
    return edges[eligible[int(np.argmax(scores[eligible]))]]


def _gumbel_selected_action(root: Node, value_scale: float = 0.1,
                            maxvisit_init: float = 50.0) -> int | None:
    """Return mctx's executed root action, separate from its train target."""
    if not root.children:
        return None
    edges = list(root.children.values())
    completed = _completed_qvalues(root, edges, value_scale, maxvisit_init)
    considered_visit = max(edge.visits for edge in edges)
    scores = np.asarray([
        root.root_gumbel[edge.action] + root.root_prior_logits[edge.action] + qvalue
        for edge, qvalue in zip(edges, completed)
    ], dtype=np.float64)
    eligible = [index for index, edge in enumerate(edges) if edge.visits == considered_visit]
    if not eligible:
        raise RuntimeError('Gumbel root has no max-visit action')
    return edges[eligible[int(np.argmax(scores[eligible]))]].action


def _add_root_noise(node: Node, rng: np.random.Generator, alpha: float, epsilon: float) -> None:
    if not node.children:
        return
    noise = rng.dirichlet(np.full(len(node.children), alpha, dtype=np.float64))
    for edge, value in zip(node.children.values(), noise):
        edge.prior = (1.0 - epsilon) * edge.prior + epsilon * float(value)


def _backup(path: list[Edge], leaf_value: float) -> None:
    value = float(leaf_value)
    if not np.isfinite(value):
        raise FloatingPointError('non-finite MCTS leaf value')
    for edge in reversed(path):
        child_turn = edge.child.state.turn if edge.child is not None else edge.parent_turn
        if edge.parent_turn != child_turn:
            value = -value
        edge.visits += 1
        edge.value_sum += value


def _gumbel_policy_target(root: Node, value_scale: float = 0.1, maxvisit_init: float = 50.0) -> np.ndarray:
    policy = np.zeros(648, dtype=np.float32)
    if not root.legal_actions:
        return policy
    edges = list(root.children.values())
    completed = _completed_qvalues(root, edges, value_scale, maxvisit_init)
    # The candidate edges retain exact network logits; unvisited actions still
    # participate in the improved policy with their exact original logits.
    logits = np.asarray([root.root_prior_logits[action] for action in root.legal_actions], dtype=np.float64)
    values = completed
    values -= np.min(values)
    target = _softmax(logits + values)
    for action, probability in zip(root.legal_actions, target):
        policy[action] = float(probability)
    return policy


@dataclass(frozen=True)
class SearchResult:
    """The action to execute and the distinct policy target for training."""

    action: int | None
    policy: np.ndarray


def search_batch(
    states: Sequence[GameState], evaluator: NetworkEvaluator, simulations: int,
    c_puct: float = 1.5, add_noise: bool = False, rng: np.random.Generator | None = None,
    dirichlet_alpha: float = 0.3, noise_epsilon: float = 0.25,
    algorithm: str = 'gumbel', max_num_considered_actions: int = 4,
    gumbel_scale: float = 1.0, gumbel_value_scale: float = 0.1,
    gumbel_maxvisit_init: float = 50.0,
) -> list[SearchResult]:
    """Run batched searches with distinct execution actions and targets."""
    if simulations < 1:
        raise ValueError('simulations must be positive')
    if algorithm not in ('gumbel', 'puct'):
        raise ValueError('unknown search algorithm')
    rng = rng or np.random.default_rng()
    # Search never consumes the public Move list. Keep exact repetition/clock
    # state while avoiding an unbounded history copy for every root and child.
    roots = [Node(state.copy(include_history=False)) for state in states]
    nonterminal = [root for root in roots if not root.state.is_terminal()]
    if nonterminal:
        logits, values = evaluator.predict([root.state for root in nonterminal])
        for root, row, value in zip(nonterminal, logits, values):
            if algorithm == 'gumbel':
                _initialize_gumbel_root(root, row, float(value), simulations, max_num_considered_actions, gumbel_scale, rng)
            else:
                _expand(root, row, float(value))
                if add_noise:
                    _add_root_noise(root, rng, dirichlet_alpha, noise_epsilon)

    for _ in range(simulations):
        leaves: list[Node] = []
        paths: list[list[Edge]] = []
        terminal_values: list[tuple[list[Edge], float]] = []
        for root in roots:
            node = root
            path: list[Edge] = []
            while node.expanded and node.children:
                if node is root and algorithm == 'gumbel':
                    edge = _select_gumbel_root(node, gumbel_value_scale, gumbel_maxvisit_init)
                elif algorithm == 'gumbel':
                    edge = _select_gumbel_interior(node, gumbel_value_scale, gumbel_maxvisit_init)
                else:
                    edge = _select(node, c_puct)
                path.append(edge)
                node = _materialize_child(edge, node)
                if node.state.is_terminal() or not node.expanded:
                    break
            if node.state.is_terminal():
                terminal_values.append((path, node.state.terminal_value()))
            else:
                leaves.append(node)
                paths.append(path)
        if leaves:
            logits, values = evaluator.predict([leaf.state for leaf in leaves])
            for leaf, path, row, value in zip(leaves, paths, logits, values):
                _expand(leaf, row, float(value))
                _backup(path, float(value))
        for path, value in terminal_values:
            _backup(path, value)

    results: list[SearchResult] = []
    for root in roots:
        if algorithm == 'gumbel':
            results.append(SearchResult(_gumbel_selected_action(root, gumbel_value_scale, gumbel_maxvisit_init),
                                        _gumbel_policy_target(root, gumbel_value_scale, gumbel_maxvisit_init)))
            continue
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
        action = max(root.children.values(), key=lambda edge: (edge.visits, -edge.action)).action if root.children else None
        results.append(SearchResult(action, policy))
    return results


def choose_from_policy(policy: np.ndarray, temperature: float, rng: np.random.Generator) -> int:
    legal = np.flatnonzero(policy > 0)
    if len(legal) == 0:
        raise ValueError('policy contains no legal action')
    if temperature <= 1e-8:
        return int(legal[np.argmax(policy[legal])])
    weights = np.power(policy[legal].astype(np.float64), 1.0 / temperature)
    weights /= weights.sum()
    return int(rng.choice(legal, p=weights))
