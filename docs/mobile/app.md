# Viper Code Mobile App

The Viper Code mobile app (Android) lets you connect to your Viper Code desktop/server
environment and control coding agents from your phone. It shares the same product model,
auth, and runtime contracts as the web app.

## Setup

### 1. Enable Viper Connect on PC

1. Open Viper Code on your PC.
2. Go to **Settings > Connections**.
3. Under **Viper Connect**, sign in with your account and toggle the link switch.
4. Optionally enable **Publish agent activity** to receive notifications on mobile.

### 2. Install the APK

Download the latest Viper Code Android APK from your Viper Connect environment's
Settings > Connections page, or build from source (see `docs/mobile/android-build.md`).

Install the APK on your Android device. You may need to allow "Install unknown apps"
in Android settings for your browser or file manager.

### 3. Sign In

1. Open the Viper Code app.
2. Sign in with the **same Viper Connect account** you used on PC.
3. If your account is not yet approved, you will see a waitlist screen.

### 4. Connect to Your Environment

After signing in, your linked PC environment appears in the home screen. Tap it to
connect. The app loads your projects, threads, messages, model controls, and task status.

If Viper Connect is unavailable or your environment is not listed, use manual pairing:

1. In the PC app, go to **Settings > Connections > Authorized clients** and click **Create link**.
2. Copy the pairing URL or scan the QR code from the mobile app's **Pair Environment** screen.
3. The mobile app exchanges the pairing credential and saves the environment.

## Daily Use

- **Browse threads** — tap an environment to see projects and threads.
- **Send messages** — open a thread, type a message, and tap Send.
- **Handle approvals** — approve or deny agent actions from the thread view.
- **Respond to inputs** — the agent may ask for input; respond inline.
- **View proposed plans** — plans are shown as cards in the thread view.
- **Inspect changed files** — expand the file tree to see what changed, tap for a diff preview.
- **Switch models** — tap the model picker in the new-thread flow or thread settings.
- **Start new threads** — use the "+ New" button in an environment thread list.

## Managing Access

### Revoke Mobile Access

To remove mobile access:

1. On PC: go to **Settings > Connections > Authorized clients**, find the mobile session, and click **Revoke**.
2. To unlink the environment entirely: toggle off **Viper Connect**. This removes access for all linked devices.
3. To sign out on mobile only: open **Settings** in the app and tap **Sign Out**. This clears the local session without affecting the PC environment.

### How Revocation Works

| Action                  | Effect                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Sign out on mobile      | Clears local session tokens. The PC environment is unaffected.                           |
| Revoke a client session | Removes that specific client's access. Other clients remain connected.                   |
| Unlink Viper Connect    | Removes the environment from your Viper Connect account. All mobile devices lose access. |

## Notifications

When "Publish agent activity" is enabled on PC, the mobile app receives push
notifications for:

- Task completed
- Task blocked / errored
- Approval needed
- User input needed

Tapping a notification opens the app directly to the relevant thread.

## Limitations

- The mobile app connects to your PC/server environment; it does not run agents locally.
- Terminal input is not yet supported in this version.
- Full file editing is not available on mobile.
- iOS is not yet supported.
