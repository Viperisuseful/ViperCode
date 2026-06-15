import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { RootStackParamList } from "../navigation/AppNavigator.tsx";
import { theme } from "../../theme/index.ts";
import type { ModelOption } from "../../components/ModelPickerSheet.tsx";
import { ModelPickerSheet } from "../../components/ModelPickerSheet.tsx";

type Props = NativeStackScreenProps<RootStackParamList, "NewThread">;

interface ProviderParam {
  readonly instanceId: string;
  readonly displayName: string;
  readonly driver: string;
  readonly accentColor: string | null;
  readonly enabled: boolean;
  readonly installed: boolean;
  readonly status: "ready" | "warning" | "error" | "disabled";
  readonly availability: "available" | "unavailable";
  readonly models: ReadonlyArray<{
    slug: string;
    name: string;
    shortName: string | null;
    subProvider: string | null;
    isCustom: boolean;
    availability: "available" | "unavailable" | null;
    unavailableReason: string | null;
  }>;
  readonly authStatus: string | null;
  readonly message: string | null;
}

export function NewThreadScreen({ navigation, route }: Props) {
  const { environmentId: _envId, label: _label, projects, providers } = route.params;

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelOption | null>(null);
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const [creating, setCreating] = useState(false);

  const modelOptions = useMemo<ReadonlyArray<ModelOption>>(() => {
    const options: ModelOption[] = [];
    for (const provider of providers as ReadonlyArray<ProviderParam>) {
      if (
        !provider.enabled ||
        !provider.installed ||
        provider.availability === "unavailable" ||
        provider.status !== "ready"
      )
        continue;
      for (const model of provider.models) {
        if (model.availability === "unavailable") continue;
        options.push({
          instanceId: provider.instanceId,
          label: provider.displayName,
          model: model.slug,
          modelName: model.shortName ?? model.name,
          subProvider: model.subProvider,
          providerLabel: provider.displayName,
        });
      }
    }
    return options;
  }, [providers]);

  const handleCreate = useCallback(() => {
    if (creating || !title.trim() || !message.trim() || !selectedProjectId) return;
    setCreating(true);

    // TODO: dispatch ThreadCreateCommand + ThreadTurnStartCommand via client RPC
    // For now navigates back after simulating creation
    setTimeout(() => {
      setCreating(false);
      navigation.goBack();
    }, 300);
  }, [creating, title, message, selectedProjectId, navigation]);

  const canCreate =
    title.trim().length > 0 && message.trim().length > 0 && selectedProjectId !== null && !creating;

  const selectedProviderLabel = selectedModel
    ? `${selectedModel.providerLabel} · ${selectedModel.modelName}`
    : "Tap to select...";

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Project</Text>
      <ScrollView
        style={styles.projectList}
        contentContainerStyle={styles.projectListContent}
        nestedScrollEnabled
        bounces={false}
      >
        {projects.map((project) => {
          const isSelected = selectedProjectId === project.id;
          return (
            <Pressable
              key={project.id}
              style={[styles.projectOption, isSelected && styles.projectOptionSelected]}
              onPress={() => setSelectedProjectId(project.id)}
            >
              <Text style={[styles.projectName, isSelected && styles.projectNameSelected]}>
                {project.title}
              </Text>
              <Text style={styles.projectPath}>{project.workspaceRoot}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.sectionLabel}>Model</Text>
      <Pressable style={styles.modelPicker} onPress={() => setModelPickerVisible(true)}>
        <Text style={[styles.modelPickerText, !selectedModel && styles.modelPickerPlaceholder]}>
          {selectedProviderLabel}
        </Text>
      </Pressable>

      <Text style={styles.sectionLabel}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Thread title..."
        placeholderTextColor={theme.colors.textMuted}
        autoCapitalize="sentences"
      />

      <Text style={styles.sectionLabel}>First Message</Text>
      <TextInput
        style={[styles.input, styles.messageInput]}
        value={message}
        onChangeText={setMessage}
        placeholder="What should the agent do?"
        placeholderTextColor={theme.colors.textMuted}
        multiline
        textAlignVertical="top"
        autoCapitalize="sentences"
      />

      <Pressable
        style={[styles.createButton, !canCreate && styles.createButtonDisabled]}
        onPress={handleCreate}
        disabled={!canCreate}
      >
        <Text style={[styles.createText, !canCreate && styles.createTextDisabled]}>
          {creating ? "Creating..." : "Create Thread"}
        </Text>
      </Pressable>

      <ModelPickerSheet
        visible={modelPickerVisible}
        options={modelOptions}
        selected={selectedModel}
        onSelect={setSelectedModel}
        onClose={() => setModelPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.md,
    fontFamily: theme.font.sans,
  },
  projectList: {
    maxHeight: 160,
  },
  projectListContent: {
    gap: theme.spacing.xs,
  },
  projectOption: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    padding: theme.spacing.md,
  },
  projectOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceElevated,
  },
  projectName: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
    fontFamily: theme.font.sans,
  },
  projectNameSelected: {
    color: theme.colors.primary,
  },
  projectPath: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontFamily: theme.font.mono,
  },
  modelPicker: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    padding: theme.spacing.md,
  },
  modelPickerText: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.font.sans,
  },
  modelPickerPlaceholder: {
    color: theme.colors.textMuted,
  },
  input: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: 14,
    fontFamily: theme.font.sans,
  },
  messageInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.button,
    padding: theme.spacing.md,
    alignItems: "center",
    marginTop: theme.spacing.lg,
    height: 48,
    justifyContent: "center",
  },
  createButtonDisabled: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    opacity: 0.5,
  },
  createText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.primaryForeground,
    fontFamily: theme.font.sans,
  },
  createTextDisabled: {
    color: theme.colors.textMuted,
  },
});
