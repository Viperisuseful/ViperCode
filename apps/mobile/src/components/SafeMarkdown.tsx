import type { ComponentProps } from "react";
import { Text } from "react-native";
// Type-only import: erased at build, so `react-native-nitro-markdown` is NEVER
// evaluated on Android. Its module init creates Nitro HybridObjects
// (MarkdownParser/MarkdownSession) that aren't registered on Android and throw
// uncaught, which blanks the whole screen. iOS uses SafeMarkdown.ios.tsx.
import type { Markdown as NitroMarkdown } from "react-native-nitro-markdown";

import { useThemeColor } from "../lib/useThemeColor";

type MarkdownComponentProps = ComponentProps<typeof NitroMarkdown>;

export function Markdown(props: MarkdownComponentProps) {
  const foreground = useThemeColor("--color-foreground");
  const text = typeof props.children === "string" ? props.children : "";

  return (
    <Text
      style={{
        color: foreground,
        fontSize: 15,
        lineHeight: 22,
        fontFamily: "DMSans_400Regular",
      }}
    >
      {text}
    </Text>
  );
}
