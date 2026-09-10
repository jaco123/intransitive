# Reproducible AI environment

The deployed trainer uses Python 3.12 and the pinned CUDA build
`torch==2.7.1+cu128` from the official PyTorch wheel index. The complete
environment currently installed on this host is recorded in
`requirements.lock`.

```sh
python3.12 -m venv /home/ubuntu/intransitive-ai-venv
source /home/ubuntu/intransitive-ai-venv/bin/activate
python -m pip install --upgrade pip
python -m pip install --index-url https://download.pytorch.org/whl/cu128 \
  torch==2.7.1+cu128
python -m pip install --requirement /home/ubuntu/rps-prod/ai/requirements.lock \
  --extra-index-url https://download.pytorch.org/whl/cu128
```

The first install obtains the official PyTorch wheel and its pinned CUDA
dependencies. The lock file prevents dependency drift; verify it with
`python -m pip freeze`. Do not execute downloaded artifacts or use an
untrusted package index. The trainer has no network listener and does not
download model artifacts.
