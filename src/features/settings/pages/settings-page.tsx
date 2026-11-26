import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ReactNode } from "react";
import {
  Settings,
  Palette,
  HardDrive,
  Sparkles,
  Globe,
  Workflow,
  Bell,
  Info,
  Save,
  FolderOpen,
  Check,
  CheckCircle2,
  CircleX,
  TriangleAlert,
  LoaderCircle,
  Layers3,
  X,
} from "lucide-react";

import {
  PageHeader,
  Panel,
  PanelHeading,
  inputClass,
  buttonClass,
  primaryButtonClass,
} from "@/components/ui/page-ui";

import { notify } from "@/features/notifications/lib/notification";
import { ACCENT_COLORS, type AccentColor } from "../accent-colors";

interface AppPreferences {
  startup: boolean;
  defaultWorkspace: string;
  theme: string;
  accentColor: AccentColor;
  storagePath: string;
  aiProvider: string;
  workerLimit: string;
  retryLimit: string;
  notifications: boolean;
  completionAlerts: boolean;
  errorAlerts: boolean;
  imageGenerationDelay: number;
  publishingDelay: number;
}

const DEFAULT_PREFERENCES: AppPreferences = {
  startup: true,
  defaultWorkspace: "Overview",
  theme: "Dark",
  accentColor: "violet",
  storagePath: "",
  aiProvider: "Gemini",
  imageGenerationDelay: 30,
  publishingDelay: 30,
  workerLimit: "2",
  retryLimit: "3",
  notifications: true,
  completionAlerts: true,
  errorAlerts: true,
};

const sections = [
  { id: "general", label: "General", icon: Settings },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "storage", label: "Storage", icon: HardDrive },
  { id: "ai", label: "AI providers", icon: Sparkles },
  { id: "browser", label: "Browser", icon: Globe },
  { id: "automation", label: "Automation", icon: Workflow },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "about", label: "About", icon: Info },
];

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#272B35] py-4 last:border-0">
      <div className="max-w-sm">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {description}
          </p>
        )}
      </div>

      <div className="w-full sm:max-w-xs">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${
        checked ? "sf-accent-bg" : "bg-[#3A3F4A]"
      }`}
    >
      <span
        className={`absolute top-1 size-4 rounded-full bg-white transition ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("general");

  const [theme, setTheme] = useState(DEFAULT_PREFERENCES.theme);
  const [startup, setStartup] = useState(DEFAULT_PREFERENCES.startup);

  const [defaultWorkspace, setDefaultWorkspace] = useState(
    DEFAULT_PREFERENCES.defaultWorkspace,
  );

  const [notifications, setNotifications] = useState(
    DEFAULT_PREFERENCES.notifications,
  );

  const [accentColor, setAccentColor] = useState<AccentColor>(
    DEFAULT_PREFERENCES.accentColor,
  );

  const [completionAlerts, setCompletionAlerts] = useState(
    DEFAULT_PREFERENCES.completionAlerts,
  );

  const [errorAlerts, setErrorAlerts] = useState(
    DEFAULT_PREFERENCES.errorAlerts,
  );

  const [workerLimit, setWorkerLimit] = useState(
    DEFAULT_PREFERENCES.workerLimit,
  );

  const [retryLimit, setRetryLimit] = useState(DEFAULT_PREFERENCES.retryLimit);

  const [storagePath, setStoragePath] = useState(
    DEFAULT_PREFERENCES.storagePath,
  );

  const [aiProvider, setAiProvider] = useState(DEFAULT_PREFERENCES.aiProvider);

  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [hasGeminiApiKey, setHasGeminiApiKey] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageGenerationDelay, setImageGenerationDelay] = useState(
    DEFAULT_PREFERENCES.imageGenerationDelay ?? 0,
  );

  const [publishingDelay, setPublishingDelay] = useState(
    DEFAULT_PREFERENCES.publishingDelay ?? 30,
  );
  const [loadingToastId, setLoadingToastId] = useState<
    string | number | undefined
  >();

  const active = sections.find((section) => section.id === activeSection)!;

  function update<T>(setter: (value: T) => void, value: T) {
    setter(value);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      try {
        const stored = await invoke<Partial<AppPreferences> | null>(
          "get_setting",
          { key: "app.preferences" },
        );

        if (cancelled) return;

        if (stored == null) {
          return;
        }

        const preferences = {
          ...DEFAULT_PREFERENCES,
          ...stored,
        };

        setStartup(preferences.startup);
        setDefaultWorkspace(preferences.defaultWorkspace);
        setTheme(preferences.theme);
        setAccentColor(preferences.accentColor);
        setStoragePath(preferences.storagePath);
        setAiProvider(preferences.aiProvider);
        setWorkerLimit(preferences.workerLimit);
        setRetryLimit(preferences.retryLimit);
        setNotifications(preferences.notifications);
        setCompletionAlerts(preferences.completionAlerts);
        setErrorAlerts(preferences.errorAlerts);
        setImageGenerationDelay(preferences.imageGenerationDelay);
        setPublishingDelay(preferences.publishingDelay);
      } catch (error) {
        if (!cancelled) {
          notify.error("Failed to load settings", {
            description: String(error),
          });
        }
      } finally {
        if (!cancelled) {
          setLoadingPreferences(false);
        }
      }
    }

    void loadPreferences();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkGeminiApiKey() {
      try {
        const exists = await invoke<boolean>("has_gemini_api_key");

        if (!cancelled) {
          setHasGeminiApiKey(exists);
        }
      } catch (error) {
        if (!cancelled) {
          notify.error("Failed to check Gemini API key", {
            description: String(error),
          });
        }
      }
    }

    void checkGeminiApiKey();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    const preferences: AppPreferences = {
      startup,
      defaultWorkspace,
      theme,
      accentColor,
      storagePath,
      aiProvider,
      imageGenerationDelay,
      publishingDelay,
      workerLimit,
      retryLimit,
      notifications,
      completionAlerts,
      errorAlerts,
    };

    setSaving(true);

    try {
      await invoke("set_setting", {
        key: "app.preferences",
        value: preferences,
      });

      notify.success("Settings saved successfully!", {
        description: "Your preferences have been updated.",
      });
    } catch (error) {
      notify.error("Failed to save settings", {
        description: String(error),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleBrowseStorageDirectory() {
    try {
      const selectedPath = await open({
        directory: true,
        multiple: false,
        title: "Choose asset storage directory",
      });

      if (typeof selectedPath === "string") {
        setStoragePath(selectedPath);
      }
    } catch (error) {
      notify.error("Failed to choose storage directory", {
        description: String(error),
      });
    }
  }

  async function handleSaveGeminiKey() {
    if (!geminiApiKey.trim()) {
      notify.error("Please enter your Gemini API key.");
      return;
    }

    setSavingApiKey(true);

    try {
      await invoke("save_gemini_api_key", {
        apiKey: geminiApiKey.trim(),
      });

      setHasGeminiApiKey(true);
      setGeminiApiKey("");

      notify.success("Gemini API key saved securely.");
    } catch (error) {
      notify.error("Failed to save Gemini API key", {
        description: String(error),
      });
    } finally {
      setSavingApiKey(false);
    }
  }

  async function handleDeleteGeminiKey() {
    setSavingApiKey(true);

    try {
      await invoke("delete_gemini_api_key");

      setHasGeminiApiKey(false);
      setGeminiApiKey("");

      notify.success("Gemini API key removed.");
    } catch (error) {
      notify.error("Failed to remove Gemini API key", {
        description: String(error),
      });
    } finally {
      setSavingApiKey(false);
    }
  }

  async function handleTestGeminiConnection() {
    if (!hasGeminiApiKey) {
      notify.error("Gemini API key is not configured.");
      return;
    }

    setTestingConnection(true);

    try {
      const response = await invoke<string>("test_gemini_connection");

      notify.success("Gemini connection successful!", {
        description: response,
      });
    } catch (error) {
      notify.error("Gemini connection failed", {
        description: String(error),
      });
    } finally {
      setTestingConnection(false);
    }
  }

  // Notification testing functions

  function testMultipleNotifications() {
    notify.success("Changes saved successfully");
    notify.error("Unable to connect to the server");
    notify.warning("Your session will expire soon");
    notify.info("A new update is available");
  }

  function startLoadingNotification() {
    if (loadingToastId !== undefined) return;

    const id = notify.loading("Processing your request...", {
      description: "Please wait while we complete this operation.",
      duration: Infinity,
    });

    setLoadingToastId(id);
  }

  function completeLoadingNotification() {
    if (loadingToastId === undefined) return;

    notify.dismiss(loadingToastId);

    notify.success("Process completed!", {
      description: "Your operation was completed successfully.",
    });

    setLoadingToastId(undefined);
  }

  function dismissLoadingNotification() {
    if (loadingToastId === undefined) return;

    notify.dismiss(loadingToastId);
    setLoadingToastId(undefined);
  }

  useEffect(() => {
    const color = ACCENT_COLORS[accentColor];
    const root = document.documentElement;

    root.style.setProperty("--sf-accent", color.hex);
    root.style.setProperty("--sf-accent-foreground", color.foreground);
    root.style.setProperty("--sf-accent-soft", color.soft);
    root.style.setProperty("--sf-accent-border", color.border);
  }, [accentColor]);

  return (
    <div>
      <PageHeader
        eyebrow="Application"
        title="Settings"
        description="Configure StockForge preferences, integrations, and automation."
        actions={
          <button
            className={primaryButtonClass}
            onClick={handleSave}
            disabled={saving || loadingPreferences}
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save changes"}
          </button>
        }
      />

      {loadingPreferences && (
        <div className="mb-4 rounded-lg border border-[#303541] bg-[#17191F] px-4 py-3 text-sm text-slate-400">
          Loading saved preferences...
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Panel className="h-fit p-2">
          <p className="px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">
            Preferences
          </p>

          <div className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    activeSection === section.id
                      ? "sf-accent-soft font-medium text-white"
                      : "text-slate-400 hover:bg-[#222630] hover:text-white"
                  }`}
                >
                  <Icon size={16} />
                  {section.label}
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <PanelHeading
            title={active.label}
            description={`Manage your ${active.label.toLowerCase()} preferences.`}
          />

          <div className="px-5 py-2">
            {activeSection === "general" && (
              <>
                <Field
                  label="Application name"
                  description="The name displayed in the desktop application."
                >
                  <input className={inputClass} value="StockForge" readOnly />
                </Field>

                <Field
                  label="Launch on startup"
                  description="Open StockForge when you sign in to your computer."
                >
                  <Toggle
                    checked={startup}
                    onChange={(value) => update(setStartup, value)}
                  />
                </Field>

                <Field
                  label="Default workspace"
                  description="Choose the page displayed when the app opens."
                >
                  <select
                    className={inputClass}
                    value={defaultWorkspace}
                    onChange={(event) =>
                      update(setDefaultWorkspace, event.target.value)
                    }
                  >
                    <option>Overview</option>
                    <option>Assets</option>
                    <option>Generation</option>
                    <option>Metadata</option>
                    <option>Submission</option>
                  </select>
                </Field>
                <Field
                  label="Image generation delay"
                  description="Set the delay for image generationin minutes."
                >
                  <input
                    type="number"
                    className={inputClass}
                    value={imageGenerationDelay}
                    onChange={(e) =>
                      setPublishingDelay(Math.max(0, Number(e.target.value)))
                    }
                    placeholder="Enter image generation delay"
                  />
                </Field>

                <Field
                  label="Publishing delay(min)"
                  description="Set the delay before publishing minutes."
                >
                  <input
                    type="number"
                    className={inputClass}
                    value={publishingDelay}
                    onChange={(e) =>
                      setPublishingDelay(Math.max(0, Number(e.target.value)))
                    }
                    placeholder="Enter publishing delay"
                  />
                </Field>
              </>
            )}

            {activeSection === "appearance" && (
              <>
                <Field
                  label="Application theme"
                  description="Choose the appearance of StockForge."
                >
                  <select
                    className={inputClass}
                    value={theme}
                    onChange={(event) => update(setTheme, event.target.value)}
                  >
                    <option>Dark</option>
                    <option>Light</option>
                    <option>System</option>
                  </select>
                </Field>

                <Field
                  label="Accent color"
                  description="Choose the highlight color used throughout StockForge."
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-6 gap-2">
                      {Object.entries(ACCENT_COLORS).map(([key, color]) => {
                        const selected = accentColor === key;

                        return (
                          <button
                            key={key}
                            type="button"
                            title={color.label}
                            aria-label={`Select ${color.label} accent`}
                            aria-pressed={selected}
                            onClick={() =>
                              update(setAccentColor, key as AccentColor)
                            }
                            className={`flex aspect-square items-center justify-center rounded-xl border transition-all ${
                              selected
                                ? "border-white/70 ring-2 ring-white/20 scale-105"
                                : "border-white/10 hover:border-white/30"
                            }`}
                            style={{ backgroundColor: color.hex }}
                          >
                            {selected && (
                              <Check
                                size={17}
                                className="text-white drop-shadow"
                                strokeWidth={3}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-3 rounded-lg border border-[#303541] bg-[#17191F] px-3 py-2.5">
                      <span
                        className="size-5 shrink-0 rounded-md"
                        style={{
                          backgroundColor: ACCENT_COLORS[accentColor].hex,
                        }}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-200">
                          {ACCENT_COLORS[accentColor].label}
                        </p>
                        <p className="text-xs text-slate-500">
                          {ACCENT_COLORS[accentColor].hex}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => update(setAccentColor, "violet")}
                        className="text-xs text-slate-500 transition hover:text-white"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </Field>
              </>
            )}

            {activeSection === "storage" && (
              <>
                <Field
                  label="Asset storage directory"
                  description="Local directory where imported assets will be stored."
                >
                  <div className="flex gap-2">
                    <input
                      className={inputClass}
                      value={storagePath}
                      onChange={(event) =>
                        update(setStoragePath, event.target.value)
                      }
                    />

                    <button
                      type="button"
                      className={buttonClass}
                      aria-label="Browse storage directory"
                      onClick={() => void handleBrowseStorageDirectory()}
                      disabled={saving || loadingPreferences}
                    >
                      <FolderOpen size={16} />
                    </button>
                  </div>
                </Field>

                <Field
                  label="Database"
                  description="StockForge's local application database."
                >
                  <p className="text-xs text-slate-400">
                    SQLite · Local storage
                  </p>
                </Field>
              </>
            )}

            {activeSection === "ai" && (
              <>
                <Field
                  label="AI provider"
                  description="Provider used for metadata assistance."
                >
                  <select
                    className={inputClass}
                    value={aiProvider}
                    onChange={(event) =>
                      update(setAiProvider, event.target.value)
                    }
                  >
                    <option>Gemini</option>
                    <option>Local model (future)</option>
                  </select>
                </Field>

                <Field
                  label="Gemini API key"
                  description="Your API key is stored securely in Windows Credential Manager."
                >
                  <div className="space-y-3">
                    {hasGeminiApiKey && (
                      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                        <span className="text-xs text-emerald-400">
                          API key securely configured
                        </span>
                      </div>
                    )}

                    <input
                      className={inputClass}
                      type="password"
                      value={geminiApiKey}
                      onChange={(event) => setGeminiApiKey(event.target.value)}
                      placeholder={
                        hasGeminiApiKey
                          ? "Enter a new key to replace existing key"
                          : "Enter Gemini API key"
                      }
                      disabled={savingApiKey}
                    />

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={primaryButtonClass}
                        onClick={handleSaveGeminiKey}
                        disabled={savingApiKey || !geminiApiKey.trim()}
                      >
                        <Save size={14} />
                        {savingApiKey ? "Saving..." : "Save API key"}
                      </button>

                      {hasGeminiApiKey && (
                        <button
                          type="button"
                          className={buttonClass}
                          onClick={handleDeleteGeminiKey}
                          disabled={savingApiKey || testingConnection}
                        >
                          <X size={14} />
                          Remove key
                        </button>
                      )}

                      <button
                        type="button"
                        className={buttonClass}
                        onClick={handleTestGeminiConnection}
                        disabled={
                          testingConnection || savingApiKey || !hasGeminiApiKey
                        }
                      >
                        {testingConnection ? (
                          <LoaderCircle size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}

                        {testingConnection ? "Testing..." : "Test Connection"}
                      </button>
                    </div>
                  </div>
                </Field>

                <Field
                  label="Model"
                  description="The text-generation model used for metadata."
                >
                  <input
                    className={inputClass}
                    placeholder="Gemini 3.1 Flash Lite"
                    value="gemini-3.1-flash-lite"
                    readOnly
                  />
                </Field>
              </>
            )}

            {activeSection === "browser" && (
              <>
                <Field
                  label="Browser engine"
                  description="Browser used for assisted Adobe Stock workflows."
                >
                  <input className={inputClass} value="Chromium" readOnly />
                </Field>

                <Field
                  label="Browser profile"
                  description="A dedicated profile keeps the automation session separate."
                >
                  <input
                    className={inputClass}
                    placeholder="Browser profile directory"
                    disabled
                  />
                </Field>
              </>
            )}

            {activeSection === "automation" && (
              <>
                <Field
                  label="Maximum concurrent workers"
                  description="Limit simultaneous background tasks."
                >
                  <select
                    className={inputClass}
                    value={workerLimit}
                    onChange={(event) =>
                      update(setWorkerLimit, event.target.value)
                    }
                  >
                    <option value="1">1 worker</option>
                    <option value="2">2 workers</option>
                    <option value="3">3 workers</option>
                    <option value="4">4 workers</option>
                  </select>
                </Field>

                <Field
                  label="Retry limit"
                  description="Number of retries for recoverable operations."
                >
                  <select
                    className={inputClass}
                    value={retryLimit}
                    onChange={(event) =>
                      update(setRetryLimit, event.target.value)
                    }
                  >
                    <option value="1">1 retry</option>
                    <option value="2">2 retries</option>
                    <option value="3">3 retries</option>
                    <option value="5">5 retries</option>
                  </select>
                </Field>
              </>
            )}

            {activeSection === "notifications" && (
              <>
                <Field
                  label="Notifications"
                  description="Enable application notifications."
                >
                  <Toggle
                    checked={notifications}
                    onChange={(value) => update(setNotifications, value)}
                  />
                </Field>

                <Field
                  label="Task completion"
                  description="Notify when a production task finishes."
                >
                  <Toggle
                    checked={completionAlerts}
                    onChange={(value) => update(setCompletionAlerts, value)}
                  />
                </Field>

                <Field
                  label="Errors and failures"
                  description="Notify when an operation needs attention."
                >
                  <Toggle
                    checked={errorAlerts}
                    onChange={(value) => update(setErrorAlerts, value)}
                  />
                </Field>

                {/* Notification testing */}

                <div className="border-t border-[#272B35] py-5">
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <Bell size={16} className="sf-accent-text" />
                      <h3 className="text-sm font-semibold text-slate-200">
                        Notification testing
                      </h3>
                    </div>

                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Test notification types, appearance and behavior.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() =>
                        notify.success("Changes saved successfully", {
                          description: "Your settings have been updated.",
                        })
                      }
                      className="flex items-center gap-3 rounded-lg border border-[#303541] bg-[#17191F] p-3 text-left transition hover:border-emerald-500/40 hover:bg-[#1C2423]"
                    >
                      <CheckCircle2
                        size={19}
                        className="shrink-0 text-emerald-400"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-200">
                          Success
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Test successful notifications
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        notify.error("Something went wrong", {
                          description:
                            "Unable to complete your request. Please try again.",
                        })
                      }
                      className="flex items-center gap-3 rounded-lg border border-[#303541] bg-[#17191F] p-3 text-left transition hover:border-rose-500/40 hover:bg-[#251C22]"
                    >
                      <CircleX size={19} className="shrink-0 text-rose-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-200">
                          Error
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Test error notifications
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        notify.warning("Storage almost full", {
                          description:
                            "You are using 90% of your available storage.",
                        })
                      }
                      className="flex items-center gap-3 rounded-lg border border-[#303541] bg-[#17191F] p-3 text-left transition hover:border-amber-500/40 hover:bg-[#252219]"
                    >
                      <TriangleAlert
                        size={19}
                        className="shrink-0 text-amber-400"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-200">
                          Warning
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Test warning notifications
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        notify.info("New update available", {
                          description: "A new version of StockForge is ready.",
                        })
                      }
                      className="flex items-center gap-3 rounded-lg border border-[#303541] bg-[#17191F] p-3 text-left transition hover:border-blue-500/40 hover:bg-[#1C222B]"
                    >
                      <Info size={19} className="shrink-0 text-blue-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-200">
                          Information
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Test informational notifications
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Loading notification */}

                  <div className="mt-5 rounded-lg border border-[#303541] bg-[#17191F] p-4">
                    <div className="flex items-center gap-2">
                      <LoaderCircle size={17} className="text-violet-400" />
                      <p className="text-sm font-medium text-slate-200">
                        Loading notification
                      </p>
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      Test persistent loading notifications and their completion
                      behavior.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={startLoadingNotification}
                        disabled={loadingToastId !== undefined}
                        className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        <LoaderCircle size={14} />
                        Start loading
                      </button>

                      <button
                        type="button"
                        onClick={completeLoadingNotification}
                        disabled={loadingToastId === undefined}
                        className={`${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        <Check size={14} />
                        Complete
                      </button>

                      <button
                        type="button"
                        onClick={dismissLoadingNotification}
                        disabled={loadingToastId === undefined}
                        className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        <X size={14} />
                        Dismiss
                      </button>
                    </div>
                  </div>

                  {/* Stack and animation test */}

                  <div className="mt-4 rounded-lg border border-[#303541] bg-[#17191F] p-4">
                    <div className="flex items-center gap-2">
                      <Layers3 size={17} className="sf-accent-text" />
                      <p className="text-sm font-medium text-slate-200">
                        Stack & animation
                      </p>
                    </div>

                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Trigger multiple notifications together to test stacking,
                      spacing and entrance animations.
                    </p>

                    <button
                      type="button"
                      onClick={testMultipleNotifications}
                      className={`${primaryButtonClass} mt-4`}
                    >
                      <Layers3 size={15} />
                      Trigger multiple notifications
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeSection === "about" && (
              <div className="py-5">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-[#302B46]">
                    <Sparkles size={24} className="text-[#B9AEFF]" />
                  </div>

                  <div>
                    <h3 className="font-semibold text-white">StockForge</h3>
                    <p className="text-xs text-slate-500">
                      Desktop asset production workspace
                    </p>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border border-[#303541] bg-[#111318] p-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Version</span>
                    <span className="text-slate-200">0.1.0</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Desktop framework</span>
                    <span className="text-slate-200">Tauri 2</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Frontend</span>
                    <span className="text-slate-200">React + TypeScript</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end border-t sf-accent-border px-5 py-4">
            <button
              className={primaryButtonClass}
              onClick={handleSave}
              disabled={saving || loadingPreferences}
            >
              <Save size={15} />
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
