'use strict';

// The web process owns this private child. Neither its executable nor its
// checkpoint path is derived from a browser message.
const { spawn } = require('child_process');

const PYTHON = '/home/ubuntu/intransitive-ai-venv/bin/python';
let child = null;
let stdoutBuffer = '';
let readyPromise = null;
let readyResolve = null;
let readyReject = null;
let sequence = 0;
const pending = new Map();

function rejectPending(error) {
  for (const request of pending.values()) request.reject(error);
  pending.clear();
}

function resetChild(error) {
  const current = child;
  child = null;
  stdoutBuffer = '';
  if (readyReject) readyReject(error);
  readyResolve = null;
  readyReject = null;
  readyPromise = null;
  rejectPending(error);
  if (current && !current.killed) current.kill();
}

function startChild() {
  if (child && readyPromise) return readyPromise;
  child = spawn(PYTHON, ['-u', '-m', 'ai.inference'], {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });
  readyPromise = new Promise((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  const current = child;
  child.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk.toString('utf8');
    let newline;
    while ((newline = stdoutBuffer.indexOf('\n')) >= 0) {
      const line = stdoutBuffer.slice(0, newline);
      stdoutBuffer = stdoutBuffer.slice(newline + 1);
      let message;
      try { message = JSON.parse(line); } catch (error) { resetChild(new Error('AI inference protocol error')); return; }
      if (message.type === 'ready') {
        if (message.ok) readyResolve(message);
        else readyResolve(message);
      } else if (message.type === 'result' || message.type === 'error') {
        const request = pending.get(message.id);
        if (!request) continue;
        pending.delete(message.id);
        if (message.type === 'result') request.resolve(message);
        else request.reject(new Error(message.error || 'AI inference failed.'));
      }
    }
  });
  child.stderr.on('data', () => {});
  child.on('error', (error) => {
    if (child === current) resetChild(error);
  });
  child.on('exit', (code, signal) => {
    if (child !== current) return;
    resetChild(new Error(`AI inference stopped (${code ?? 'signal ' + signal})`));
  });
  return readyPromise;
}

function request(payload) {
  const id = `${Date.now().toString(36)}-${(++sequence).toString(36)}`;
  return startChild().then((ready) => {
    if (!ready || !ready.ok) {
      const error = new Error((ready && ready.error) || 'AI checkpoint unavailable');
      resetChild(error);
      throw error;
    }
    return new Promise((resolve, reject) => {
      if (!child || !child.stdin.writable) {
        reject(new Error('AI inference is unavailable.'));
        return;
      }
      pending.set(id, { resolve, reject });
      try {
        child.stdin.write(JSON.stringify({ ...payload, id }) + '\n');
      } catch (error) {
        pending.delete(id);
        reject(error);
      }
    });
  });
}

function close() {
  if (child) {
    const current = child;
    child = null;
    rejectPending(new Error('AI inference stopped.'));
    current.kill();
  }
  readyPromise = null;
  readyResolve = null;
  readyReject = null;
}

process.once('exit', close);

module.exports = { request, close };
