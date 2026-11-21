
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
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
  CircleAlert,
  XCircle,
  Loader2,
  Play,
} from "lucide-react";
import {
  PageHeader,
  Panel,
  PanelHeading,
  inputClass,
  buttonClass,
  primaryButtonClass,
} from "@/components/ui/page-ui";
import { toast } from "sonner";
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
}

const DEFAULT_PREFERENCES: AppPreferences = {
  startup: true,
  defaultWorkspace: "Overview",
  theme: "Dark",
  accentColor: "violet",
  storagePath: "D:\\StockForge\\Assets",
  aiProvider: "Gemini",
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
  { id: "toast-test", label: "Toast Playground", icon: Bell },
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
      className={`relative h-6 w-11 rounded-full transition ${checked ? "sf-accent-bg" : "bg-[#3A3F4A]"}`}
    >
      <span
        className={`absolute top-1 size-4 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`}
      />
    </button>
  );
}

function ToastPlayground() {
  function testSuccess() {
    toast.success("Success notification", {
      description: "Your operation completed successfully.",
    });
  }

  function testError() {
    toast.error("Error notification", {
      description: "Something went wrong. This is a test error.",
    });
  }

  function testWarning() {
    toast.warning("Warning notification", {
      description: "Please review this warning message.",
    });
  }

  function testInfo() {
    toast.info("Information notification", {
      description: "Here is some useful information.",
    });
  }

  function testLoading() {
    const toastId = toast.loading("Processing...", {
      description: "Please wait while the task is running.",
    });

    setTimeout(() => {
      toast.success("Task completed", {
        id: toastId,
        description: "The loading notification was updated successfully.",
      });
    }, 2500);
  }

  function testAll() {
    testSuccess();
    setTimeout(testError, 700);
    setTimeout(testWarning, 1400);
    setTimeout(testInfo, 2100);
    setTimeout(testLoading, 2800);
  }

  const tests = [
    {
      label: "Success",
      description: "Test successful operations",
      icon: CheckCircle2,
      color: "text-emerald-400",
      action: testSuccess,
    },
    {
      label: "Error",
      description: "Test failed operations",
      icon: XCircle,
      color: "text-rose-400",
      action: testError,
    },
    {
      label: "Warning",
      description: "Test warning messages",
      icon: CircleAlert,
      color: "text-amber-400",
      action: testWarning,
    },
    {
      label: "Info",
      description: "Test information messages",
      icon: Info,
      color: "text-sky-400",
      action: testInfo,
    },
    {
      label: "Loading",
      description: "Test loading and completion",
      icon: Loader2,
      color: "text-violet-400",
      action: testLoading,
    },
  ];

  return (
    <div className="space-y-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Notification Playground
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Test all StockForge notification styles and animations.
          </p>
        </div>

        <button
          type="button"
          onClick={testAll}
          className="flex items-center gap-2 rounded-lg sf-accent-bg px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          <Play size={16} />
          Test all notifications
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {tests.map((test) => {
          const Icon = test.icon;

          return (
            <div
              key={test.label}
              className="flex items-center justify-between gap-4 rounded-xl border border-[#303541] bg-[#17191F] p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#222630]">
                  <Icon size={19} className={test.color} />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200">
                    {test.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {test.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={test.action}
                className="shrink-0 rounded-lg border border-[#3A3F4A] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/30 hover:bg-[#252A35] hover:text-white"
              >
                Test
              </button>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-[#303541] bg-[#111318] p-4">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-slate-400" />
          <p className="text-sm font-medium text-slate-300">
            Test instructions
          </p>
        </div>

        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-500">
          <li>• Test each notification individually.</li>
          <li>• Check icons, backgrounds, borders and text colors.</li>
          <li>• Check entrance and exit animations.</li>
          <li>• Test all notifications to inspect stacking behavior.</li>
          <li>• Loading should automatically change into success.</li>
        </ul>
      </div>
    </div>
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

  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [saving, setSaving] = useState(false);

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

        if (cancelled || stored == null) return;

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
      } catch (error) {
        if (!cancelled) {
          toast.error("Failed to load settings", {
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

  async function handleSave() {
    const preferences: AppPreferences = {
      startup,
      defaultWorkspace,
      theme,
      accentColor,
      storagePath,
      aiProvider,
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

      toast.success("Settings saved", {
        description: "Your preferences have been saved successfully.",
      });
    } catch (error) {
      toast.error("Failed to save settings", {
        description: String(error),
      });
    } finally {
      setSaving(false);
    }
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
            {activeSection === "toast-test" && <ToastPlayground />}

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
                  label="API key"
                  description="Your provider key should be stored securely, not in plain-text configuration."
                >
                  <input
                    className={inputClass}
                    type="password"
                    placeholder="Configure API key later"
                    disabled
                  />
                </Field>

                <Field
                  label="Model"
                  description="The text-generation model used for metadata."
                >
                  <input
                    className={inputClass}
                    placeholder="Model selection will be configured later"
                    disabled
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

          {activeSection !== "toast-test" && (
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
          )}
        </Panel>
      </div>
    </div>
  );
}
