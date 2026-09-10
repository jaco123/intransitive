# Intransitive self-play learner

This subsystem is deliberately not part of the website request path. The
checked-in code is deployed with the application, while learned state lives at
`/home/ubuntu/intransitive-ai-data` and the Python environment lives at
`/home/ubuntu/intransitive-ai-venv`.

## Rules contract

`engine.js` is the canonical website rules implementation. `ai/rules.py` is a
numeric mirror used for fast self-play. `tests/ai_engine_bridge.js` executes
the real engine and `tests/ai_tests.py` compares 120 generated legal
trajectories plus custom goal, no-move, repetition, and clock positions. The
contract covers the 9x9 default setup, editor-provided valid positions, blue's
first turn, eight adjacent directions, RPS-only captures, I9/A1 goals,
no-legal-move loss, third-position repetition draw, and the 100 non-capture-ply
draw. The Python state retains complete position counts and a board history;
MCTS nodes are never transposition-merged across histories.

## Algorithm

The network is a randomly initialized residual convolutional policy/value
network. Its 648 policy outputs encode source square plus one of the eight
canonical directions. Search masks to legal actions. The default low-budget
search is Full Gumbel: Gumbel-Top-k samples root actions without replacement,
the official sequential-halving visit schedule allocates the small budget,
unvisited actions receive mixed-value completed Q values, rescaled using the
mctx reference transform (`0.1 * (50 + max visits) * normalized Q`). The
executed action is selected only among maximum-visit root actions by
`gumbel + prior logits + completed Q`; separately, completed `softmax(logit + Q)`
is the policy training target. Interior selection
uses the deterministic completed-policy rule. Classic PUCT remains available
as an explicit benchmark option; it is not used for self-play. Values are backed up
with the player-to-move perspective, including goal states where the engine
retains the turn. Self-play executes the selected Gumbel action and stores the
separate improved policy target; the temperature sampler applies only to an
explicit PUCT benchmark. Samples store encoded history planes,
improved policy, and the final outcome from the player-to-move perspective.
Draws are zero.

Training uses AdamW, policy cross-entropy plus value MSE, gradient clipping,
fixed-shape GPU batches, and CUDA AMP when CUDA is available. Candidate models
play a color-swapped, paired arena against the promoted checkpoint. Each pair
reuses one exploration seed with models/colors swapped, while distinct pair
seeds produce genuinely distinct algorithmically explored games; promotion requires
the configured score threshold. The first trained model is promoted so a
checkpoint is immediately usable, but no strength claim is made from the small
initial arena.

## Storage and recovery

Episodes are compressed NumPy shards written to a temporary file, fsynced, and
atomically renamed. A fixed episode/sample/byte budget prunes oldest shards.
Checkpoints include model, optimizer, scaler, counters, configuration, Python,
NumPy, Torch, CUDA, and local generator RNG state. `checkpoint-latest.pt` and
numbered checkpoints are atomically written; only the configured recent
numbered set plus `promoted.pt` are retained. Status JSON and JSONL metrics
include progress, losses, throughput, outcome distribution, game-length
statistics, arena outcomes, checkpoint/model ages, recovery events, CUDA
device, staleness, and disk headroom. A corrupt latest checkpoint is repaired
from the newest valid numbered checkpoint inside the owner-controlled
directory. A service restart loads that checkpoint and existing replay shards;
a crash cannot expose a partially written shard/checkpoint. Fatal errors exit
for systemd recovery, while only the configured low-disk condition is paused.

## Hardware decisions

Measured host facts are four CPUs, 26 GiB RAM, and a Quadro RTX 5000 with
15,360 MiB visible VRAM, driver CUDA 13.2. The default network (48 filters, 2
residual blocks), sixteen Gumbel considered actions, 8 simulations, and a
16.0 self-play Gumbel scale are intentionally modest for the 36-action root.
The larger scale is a measured, rule-neutral exploration setting: on the
collapsed latest model, a read-only four-game comparison produced 1 decisive
game at scale 16 versus 0 at scales 1 and 4. Eight self-play games are split
over three bounded `spawn` actors. Each actor owns its rule/search state and a
read-only snapshot of the current network, initializes CUDA in the child, and
uses one Torch thread; this removes the Python GIL from MCTS selection while
keeping the parent free for persistence. Actor results are finite and
collected in worker order, parent-derived RNG seeds are persisted through the
normal checkpoint stream, the queue is bounded, and cancellation or a worker
exception terminates and joins every child. Parent training uses four Torch
intra-op threads and one inter-op thread; the actor budget is three CPU threads
plus the parent, never four Torch threads per actor. The service CPU quota is
400% while the website is intentionally stopped. Fixed board shapes enable
cuDNN benchmarking. The static legality predicate uses precomputed action
geometry and NumPy's C loops; it remains differential-tested against engine.js.
Lazy edges avoid materializing unvisited successors, trusted internal
transitions avoid repeating public legal validation, byte position keys avoid
rebuilding board strings, and only the four-board observation tail is copied;
complete move/repetition state remains exact.

The same-checkpoint, same-seed, same-budget comparison of the pre-change and
current single-process path measured 114.1 and 114.1 positions/sec,
respectively, so the byte-key/vectorized-encoding change is not claimed as an
end-to-end speedup. It remains a rule-neutral hot-path cleanup with no
conformance difference. A separate fixed-checkpoint process-actor probe
measured one process at 89.3, two at 120.5, three at 138.0, and four at 133.2
positions/sec over repeated 8-game runs. The production default is therefore
three actors; games/sec is not used as the selection criterion. The random
episode lengths differ, so positions/sec and repeated fixed-workload
measurements are the meaningful ongoing measures.

Torch 2.7.1+cu128 was tested with warmed eager inference and both
`torch.compile` `reduce-overhead` and `max-autotune` modes. The compiler could
not initialize on this host because the Python installation lacks `Python.h`,
so no unverified compiler fallback is enabled; the exact failure is retained
in the optimization evidence log. JAX is not installed in the pinned
environment. A migration would also duplicate the Python path-dependent rules
unless the actor/search representation were rewritten; no JAX prototype
outperformed the measured PyTorch/process design, so no unpinned dependency or
migration was added.

KataGo's domain-independent efficiency ideas were considered from its paper.
The implementation adopts batched inference, bounded replay, explicit
resource limits, and only the measured three-actor parallelism. Playout-cap
randomization was rejected because this small server has no reliable
calibration budget and it would change the existing search distribution.
Tree reuse is also not used across moves because repetition/clock history is
part of the state; each tree is path-safe.

The neural input contains four recent board snapshots, side to move, the
halfmove clock, current-position count, and 16 rule-derived action planes: for
each direction they identify moves revisiting a prior position once or at
least twice. This is a principled bounded representation of every imminent
threefold consequence while exact unbounded counts remain in the rules and
MCTS. Replay shards written with the earlier 27-channel representation are
zero-padded on load, and old model stems/optimizer moments are migrated once
to the 43-channel representation.

The design follows the AlphaZero paper's tabula-rasa policy/value plus MCTS
loop, the OpenSpiel decomposition into actors, evaluator, learner, replay,
checkpoints, and arena evaluators, and PyTorch's guidance on pinned/batched
work, `set_to_none`, AMP, and fixed-shape kernels. References:

- https://arxiv.org/abs/1712.01815
- https://arxiv.org/abs/1902.10565
- https://openreview.net/forum?id=bERaNdoegnO
- https://github.com/google-deepmind/mctx/blob/main/mctx/_src/policies.py
- https://openspiel.readthedocs.io/en/stable/alpha_zero.html
- https://docs.pytorch.org/tutorials/recipes/recipes/tuning_guide.html

## Future engine integration

The future website engine should load `checkpoints/promoted.pt` with the model
configuration stored inside the checkpoint, use `ai/encoding.py`, and apply
the same legal mask before selecting an action. It should treat the checkpoint
as an optional read-only artifact and never write to the training directory
from a request handler.

## Operations

The deployed unit is `intransitive-ai.service`. It can be inspected with:

```sh
sudo systemctl status intransitive-ai.service
cat /home/ubuntu/intransitive-ai-data/status.json
journalctl -u intransitive-ai.service -f
```

Use `sudo systemctl stop intransitive-ai.service` for a clean stop, and
`sudo systemctl start intransitive-ai.service` or
`sudo systemctl restart intransitive-ai.service` to resume. It is enabled at
boot and automatically restarts after an unexpected process exit. Learned
state is in `/home/ubuntu/intransitive-ai-data`; code/config are loaded from
`/home/ubuntu/rps-prod/ai`, never from an uncommitted checkout.
