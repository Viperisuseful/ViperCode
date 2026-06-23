# ViperCode Antigravity bridge

`vipercode_antigravity_bridge.py` is the Python process ViperCode spawns to
drive the [`google-antigravity`](https://github.com/google-antigravity/antigravity-sdk-python)
SDK. The Node side (`AntigravityDriver`) talks to it over stdio using the
newline-delimited JSON protocol defined in
[`../antigravityBridgeProtocol.ts`](../antigravityBridgeProtocol.ts) and
supervises it via [`../antigravityBridgeProcess.ts`](../antigravityBridgeProcess.ts).

## Protocol

- One JSON object per line. Requests in on **stdin**, events out on **stdout**.
- Diagnostics go to **stderr** only — anything non-protocol on stdout would
  corrupt the stream.
- Requests carry a correlation `id`; the bridge replies with a `response` event
  echoing that `id`.

Implemented without third-party imports:

| Request      | Behavior                                                      |
| ------------ | ------------------------------------------------------------- |
| `initialize` | Returns `{ protocolVersion }`.                                |
| `probe`      | Returns `{ sdkAvailable, sdkVersion, python }` for status UI. |

Session methods lazily import `google.antigravity` and drive the live SDK:

- `start_session`
- `send_turn`
- `interrupt_turn`
- `respond_to_request`
- `respond_to_user_input`
- `read_thread`
- `rollback_thread`
- `stop_session`

`rollback_thread` performs local-history rollback: it trims ViperCode's bridge
turn snapshots and, where the installed SDK keeps history in memory, trims the
SDK conversation history. The installed SDK build still does not expose a
backend checkpoint restore API.

`start_session` accepts `authMode`, `gcpProject`, and `gcpLocation`. The default
auth mode is `google-oauth`, which maps to SDK Vertex/ADC configuration when
project/location are set: `LocalAgentConfig(vertex=True, project=...,
location=...)`. If project/location are absent, `google-oauth` can reuse a
readable Antigravity CLI OAuth profile. `agy-oauth` forces CLI profile reuse.
`api-key` mode is available as an explicit fallback and relies on
`GEMINI_API_KEY`.

## Requirements

- Python 3.9+ (stdlib only for the transport/probe).
- `pip install google-antigravity` for session functionality (probe reports
  availability without it).

## Manual smoke test

```bash
printf '%s\n' '{"id":"1","type":"initialize"}' '{"id":"2","type":"probe"}' \
  | python vipercode_antigravity_bridge.py
```

Expect two `response` lines on stdout; the `probe` response reports whether the
SDK is importable in the active interpreter.
