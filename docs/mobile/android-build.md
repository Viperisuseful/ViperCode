# Android APK Build Guide

## Prerequisites

- Node.js 22+
- pnpm 9+
- Android SDK (API 34+, build-tools)
- JDK 17+
- Expo account (for EAS builds)

## Environment Variables

Set these before building. For local development, create `.env`:

```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
EXPO_PUBLIC_CLERK_JWT_TEMPLATE=viper-connect
EXPO_PUBLIC_RELAY_URL=https://relay.vipercode.io
```

## Local APK Build

```bash
cd apps/mobile
pnpm run build:android:local
```

This invokes `eas build --platform android --profile preview --local` which produces a debug APK.

The output APK is written to the current directory as `*.apk`.

### Install APK on Device

```bash
adb install build-output.apk
# or copy to device and open in file manager
```

## EAS Remote Build (Preview)

```bash
cd apps/mobile
npx eas build --platform android --profile preview
```

The APK is hosted on Expo's build service and accessible via a QR code link.

## Production Release Build

```bash
cd apps/mobile
npx eas build --platform android --profile production
```

Requires an upload keystore and signing key configured in `eas.json` or via `credentials.json`.

## Troubleshooting

| Problem                                             | Fix                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------- |
| `eas` command not found                             | Install Expo CLI: `npm install -g eas-cli`                                |
| Android SDK not found                               | Set `ANDROID_HOME` and `JAVA_HOME` or install Android Studio              |
| Expo auth failure                                   | Run `npx eas login` and authenticate                                      |
| Build hangs on "Installing JavaScript dependencies" | Run `pnpm install` first in the workspace root                            |
| APK crashes on launch                               | Ensure `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is set during build            |
| Missing `metro.config.js`                           | Ensure workspace root has `pnpm-workspace.yaml` with `apps/*` in packages |
