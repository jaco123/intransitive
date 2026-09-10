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
canonical directions. Search masks to legal actions before softmax, uses PUCT,
adds Dirichlet root noise only for self-play, and backs up value with the
player-to-move perspective (including goal states where the engine retains the
turn). Self-play samples visit distributions with a configurable temperature;
later plies are greedy. Samples store encoded history planes, visit policy, and
the final outcome from the player-to-move perspective. Draws are zero.

Training uses AdamW, policy cross-entropy plus value MSE, gradient clipping,
fixed-shape GPU batches, and CUDA AMP when CUDA is available. Candidate models
play a color-swapped arena against the promoted checkpoint; promotion requires
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
include progress, losses, throughput, checkpoint/promotion state, CUDA device,
and disk headroom. A service restart loads the latest checkpoint and existing
replay shards; a crash cannot expose a partially written shard/checkpoint.

## Hardware decisions

Measured host facts are four CPUs, 26 GiB RAM, and a Quadro RTX 5000 with
15,360 MiB visible VRAM, driver CUDA 13.2. The default network (48 filters, 2
residual blocks) and 8 simulations are intentionally modest. Four self-play
roots advance in lockstep and each MCTS simulation batches its leaves for GPU
inference; optimizer batches are also GPU-resident. Torch threads are capped at
2 and the service is CPU-limited to leave capacity for the website. Fixed board
shapes enable cuDNN benchmarking. The included `benchmark.py` measures both
inference batches and batched MCTS on this host.

KataGo's domain-independent efficiency ideas were considered from its paper.
The implementation adopts batched inference, bounded replay, and explicit
resource limits. Playout-cap randomization and large-scale actor parallelism
are rejected initially: this four-thread host has no reliable calibration
budget, and excessive actors would create stale data and compete with the
website. Tree reuse is also not used across moves because repetition/clock
history is part of the state; each tree is path-safe.

The design follows the AlphaZero paper's tabula-rasa policy/value plus MCTS
loop, the OpenSpiel decomposition into actors, evaluator, learner, replay,
checkpoints, and arena evaluators, and PyTorch's guidance on pinned/batched
work, `set_to_none`, AMP, and fixed-shape kernels. References:

- https://arxiv.org/abs/1712.01815
- https://arxiv.org/abs/1902.10565
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
