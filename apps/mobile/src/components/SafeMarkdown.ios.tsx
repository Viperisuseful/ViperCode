// iOS: the Nitro markdown native modules are registered, so use the real
// rich renderer. (Android/web get the plain-text SafeMarkdown.tsx, which never
// imports react-native-nitro-markdown.)
export { Markdown } from "react-native-nitro-markdown";
