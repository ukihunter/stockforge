import { useCallback, useEffect, useMemo, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
// import ManualBatchWorkspace from "../components/manual-batch-workspace";
import {
  AlertCircle,
  Check,
  Clock3,
  Image as ImageIcon,
  Search,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import {
  PageHeader,
  Panel,
  PanelHeading,
  StatusBadge,
  inputClass,
  buttonClass,
} from "@/components/ui/page-ui";

interface MetadataStudioImage {
  assetId: string;
  imagePath: string | null;
  imageGenerationStatus: string;
  isSelected: boolean;
  status: string;
  createdAt: string;
}

interface MetadataStudioItem {
  id: string;
  name: string;
  source: "generated" | "manual";
  category: string;
  title: string;
  description: string;
  keywords: string[];
  imagePrompt: string;
  images: MetadataStudioImage[];
  createdAt: string;
}

type EditableMetadata = Pick<
  MetadataStudioItem,
  "name" | "category" | "title" | "description" | "keywords" | "imagePrompt"
>;

interface MetadataStudioData {
  items: MetadataStudioItem[];
  total: number;
  missingImages: number;
  imagesReady: number;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}

function getAvailableImages(item: MetadataStudioItem) {
  return item.images.filter((image) => image.imagePath);
}

function getSelectedImage(item: MetadataStudioItem) {
  const availableImages = getAvailableImages(item);

  return (
    availableImages.find((image) => image.isSelected) ??
    availableImages[0] ??
    null
  );
}

function hasImage(item: MetadataStudioItem) {
  return getAvailableImages(item).length > 0;
}

function getImageStatus(item: MetadataStudioItem) {
  if (hasImage(item)) return "Ready";

  const statuses = item.images.map((image) => image.imageGenerationStatus);

  if (statuses.includes("running")) return "Generating";
  if (statuses.includes("queued") || statuses.includes("pending")) {
    return "Queued";
  }
  if (statuses.includes("failed")) return "Failed";

  return "Missing image";
}

function getFileName(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}

export default function MetadataPage() {
  const [data, setData] = useState<MetadataStudioData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"all" | "generated" | "manual">(
    "all",
  );

  const [metadataDrafts, setMetadataDrafts] = useState<
    Record<string, EditableMetadata>
  >({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadMetadataStudio = useCallback(async () => {
    const result = await invoke<MetadataStudioData>("get_metadata_studio_data");

    setData(result);

    setSelectedId((current) => {
      if (current && result.items.some((item) => item.id === current)) {
        return current;
      }

      return result.items[0]?.id ?? null;
    });

    setSelectedIds((current) => {
      const validIds = new Set(
        result.items.filter((item) => !hasImage(item)).map((item) => item.id),
      );

      return new Set([...current].filter((id) => validIds.has(id)));
    });
  }, []);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        setLoading(true);
        setError(null);

        const result = await invoke<MetadataStudioData>(
          "get_metadata_studio_data",
        );

        if (!active) return;

        setData(result);
        setSelectedId(result.items[0]?.id ?? null);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, []);

  const items = data?.items ?? [];

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesTab = activeTab === "all" || item.source === activeTab;

      if (!matchesTab) return false;

      if (!query) return true;

      return [
        item.name,
        item.category,
        item.title,
        item.description,
        ...item.keywords,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [items, search, activeTab]);

  const selectedAsset =
    filteredItems.find((item) => item.id === selectedId) ??
    filteredItems[0] ??
    null;

  const selectedImage = selectedAsset ? getSelectedImage(selectedAsset) : null;

  const selectedMetadata: EditableMetadata | null = selectedAsset
    ? (metadataDrafts[selectedAsset.id] ?? {
        name: selectedAsset.name,
        category: selectedAsset.category,
        title: selectedAsset.title,
        description: selectedAsset.description,
        keywords: selectedAsset.keywords,
        imagePrompt: selectedAsset.imagePrompt,
      })
    : null;

  const hasUnsavedChanges = Boolean(
    selectedAsset &&
    selectedMetadata &&
    (selectedMetadata.name !== selectedAsset.name ||
      selectedMetadata.category !== selectedAsset.category ||
      selectedMetadata.title !== selectedAsset.title ||
      selectedMetadata.description !== selectedAsset.description ||
      JSON.stringify(selectedMetadata.keywords) !==
        JSON.stringify(selectedAsset.keywords) ||
      selectedMetadata.imagePrompt !== selectedAsset.imagePrompt),
  );

  function updateSelectedMetadata<K extends keyof EditableMetadata>(
    field: K,
    value: EditableMetadata[K],
  ) {
    if (!selectedAsset) return;

    setMetadataDrafts((current) => ({
      ...current,
      [selectedAsset.id]: {
        ...(current[selectedAsset.id] ?? {
          name: selectedAsset.name,
          category: selectedAsset.category,
          title: selectedAsset.title,
          description: selectedAsset.description,
          keywords: selectedAsset.keywords,
          imagePrompt: selectedAsset.imagePrompt,
        }),
        [field]: value,
      },
    }));
  }

  async function handleSaveMetadataChanges() {
    if (!selectedAsset || !selectedMetadata || !hasUnsavedChanges) return;

    const assetId = selectedAsset.id;
    const toastId = toast.loading("Saving metadata...");

    try {
      await invoke("save_metadata_studio_item", {
        input: {
          id: selectedAsset.id,
          source: selectedAsset.source,
          name: selectedMetadata.name,
          category: selectedMetadata.category,
          title: selectedMetadata.title,
          description: selectedMetadata.description,
          keywords: selectedMetadata.keywords,
          imagePrompt: selectedMetadata.imagePrompt,
        },
      });

      setData((current) => {
        if (!current) return current;

        return {
          ...current,
          items: current.items.map((item) =>
            item.id === assetId ? { ...item, ...selectedMetadata } : item,
          ),
        };
      });

      setMetadataDrafts((current) => {
        const next = { ...current };
        delete next[assetId];
        return next;
      });

      toast.success("Metadata saved successfully.", { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error), {
        id: toastId,
      });
    }
  }

  // Only generated ideas can be selected for bulk image generation.
  const missingImageItems = filteredItems.filter(
    (item) => item.source === "generated" && !hasImage(item),
  );

  const missingImageCount = filteredItems.filter(
    (item) => !hasImage(item),
  ).length;

  const imagesReadyCount = filteredItems.filter(hasImage).length;

  const selectedMissingCount = selectedIds.size;

  async function handleImportImage() {
    if (!selectedAsset || importing || selectedAsset.source !== "generated")
      return;

    try {
      setError(null);
      setSuccess(null);

      const selectedPath = await open({
        multiple: false,
        directory: false,
        title: "Select an image for this stock idea",
        filters: [
          {
            name: "Images",
            extensions: ["jpg", "jpeg", "png", "webp", "tif", "tiff"],
          },
        ],
      });

      if (!selectedPath || Array.isArray(selectedPath)) {
        return;
      }

      setImporting(true);

      await invoke<string>("import_manual_image", {
        stockIdeaId: selectedAsset.id,
        sourcePath: selectedPath,
      });

      await loadMetadataStudio();

      setSuccess(`Image successfully imported for "${selectedAsset.name}".`);

      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(selectedAsset.id);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  }

  function toggleSelection(item: MetadataStudioItem) {
    if (item.source !== "generated" || hasImage(item)) return;

    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }

      return next;
    });
  }
  function toggleSelectAll() {
    setSelectedIds((current) => {
      const allSelected = missingImageItems.every((item) =>
        current.has(item.id),
      );

      if (allSelected) {
        return new Set();
      }

      return new Set(missingImageItems.map((item) => item.id));
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  return (
    <div>
      <PageHeader
        eyebrow="Optimization"
        title="Metadata Studio"
        description="Review generated metadata, manage image attempts and prepare your stock ideas for production."
      />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />

          <div className="min-w-0">
            <p className="font-medium">Metadata Studio error</p>

            <p className="mt-1 break-words text-xs">{error}</p>
          </div>

          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto shrink-0 text-red-400 hover:text-white"
            aria-label="Dismiss error"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          <Check size={17} />

          <p>{success}</p>

          <button
            type="button"
            onClick={() => setSuccess(null)}
            className="ml-auto text-emerald-400 hover:text-white"
            aria-label="Dismiss success message"
          >
            <X size={15} />
          </button>
        </div>
      )}
      <div className="mb-5 flex flex-wrap gap-2 border-b border-[#272B35] pb-3">
        {(
          [
            { id: "all", label: "All" },
            { id: "generated", label: "Generated" },
            { id: "manual", label: "Manual" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              setSelectedIds(new Set());

              const firstItem = items.find(
                (item) => tab.id === "all" || item.source === tab.id,
              );

              setSelectedId(firstItem?.id ?? null);
            }}
            className={`rounded-lg px-4 py-2 text-xs font-medium transition ${
              activeTab === tab.id
                ? "sf-accent-soft text-white"
                : "text-slate-400 hover:bg-[#222630] hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Panel className="p-4">
          <p className="text-xs text-slate-400">Unpublished ideas</p>

          <p className="mt-2 text-2xl font-semibold text-white">
            {loading ? "—" : filteredItems.length}
          </p>
        </Panel>

        <Panel className="p-4">
          <p className="text-xs text-slate-400">Missing images</p>

          <p className="mt-2 text-2xl font-semibold text-amber-400">
            {loading ? "—" : missingImageCount}
          </p>
        </Panel>

        <Panel className="p-4">
          <p className="text-xs text-slate-400">Images ready</p>

          <p className="mt-2 text-2xl font-semibold text-emerald-400">
            {loading ? "—" : imagesReadyCount}
          </p>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_280px]">
        {/* Stock ideas list */}
        <Panel>
          <PanelHeading
            title={
              selectedAsset?.source === "manual"
                ? "Imported metadata"
                : "Generated metadata"
            }
            description={
              selectedAsset?.source === "manual"
                ? "Metadata associated with this imported asset"
                : "Information saved from Gemini"
            }
          />
          <div className="border-b border-[#272B35] p-3">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                className={`${inputClass} py-2 pl-8 text-xs`}
                placeholder="Search assets..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={toggleSelectAll}
                disabled={missingImageItems.length === 0}
                className="text-xs sf-accent-text  transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {missingImageItems.length > 0 &&
                missingImageItems.every((item) => selectedIds.has(item.id))
                  ? "Deselect all"
                  : "Select missing images"}
              </button>

              <span className="text-[11px] text-slate-500">
                {selectedMissingCount} selected
              </span>
            </div>
          </div>

          <div className="max-h-[650px] space-y-1 overflow-y-auto p-2">
            {loading ? (
              <p className="p-4 text-center text-xs text-slate-500">
                Loading stock ideas...
              </p>
            ) : filteredItems.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-500">
                No assets found in this collection.
              </p>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedId === item.id;
                const isChecked = selectedIds.has(item.id);
                const canSelect =
                  item.source === "generated" && !hasImage(item);

                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-2 rounded-lg p-3 transition ${
                      isSelected ? "sf-accent-soft " : "hover:bg-[#222630]"
                    }`}
                  >
                    {canSelect && (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelection(item)}
                        aria-label={`Select ${item.name} for image generation`}
                        className="mt-1 size-3.5 shrink-0 sf-accent-soft"
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-start gap-2">
                        <ImageIcon
                          size={17}
                          className="mt-0.5 shrink-0 text-slate-400"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-slate-200">
                            {item.name}
                          </p>

                          <p className="mt-1 truncate text-[11px] text-slate-500">
                            {item.category}
                          </p>

                          <div className="mt-2">
                            <StatusBadge status={getImageStatus(item)} />
                          </div>

                          {item.images.length > 0 && (
                            <p className="mt-2 text-[10px] text-slate-500">
                              {item.images.length} image attempt
                              {item.images.length !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </Panel>

        {/* Metadata and image details */}

        <div className="min-w-0 space-y-4">
          <Panel>
            <PanelHeading
              title="Asset preview"
              description={selectedAsset?.name ?? "Select a stock idea"}
            />

            <div className="flex aspect-[16/7] flex-col items-center justify-center gap-3 bg-gradient-to-br from-indigo-500/10 via-[#25283A] to-slate-900">
              {selectedImage?.imagePath ? (
                <>
                  <Check size={36} className="text-emerald-400" />

                  <p className="text-sm text-emerald-300">Image file linked</p>

                  <p className="max-w-[80%] break-all text-center text-[11px] text-slate-500">
                    {getFileName(selectedImage.imagePath)}
                  </p>

                  {selectedImage.isSelected && (
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] text-emerald-400">
                      Selected image
                    </span>
                  )}
                </>
              ) : (
                <>
                  <ImageIcon size={48} className="text-white/30" />

                  <p className="text-xs text-slate-500">
                    No image available yet
                  </p>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#272B35] p-4">
              <div>
                <p className="text-xs font-medium text-slate-200">
                  Manual image import
                </p>

                <p className="mt-1 text-[11px] text-slate-500">
                  Add an existing image to this idea.
                </p>
              </div>

              <button
                type="button"
                onClick={handleImportImage}
                disabled={
                  !selectedAsset ||
                  selectedAsset.source !== "generated" ||
                  importing
                }
                className={`${buttonClass} shrink-0`}
              >
                <Upload size={14} />
                {importing ? "Importing..." : "Import image"}
              </button>
            </div>
          </Panel>

          {/* Image attempts */}

          <Panel>
            <PanelHeading
              title="Image attempts"
              description={
                selectedAsset
                  ? `${selectedAsset.images.length} saved attempts`
                  : "Select a stock idea"
              }
            />

            {selectedAsset ? (
              selectedAsset.images.length > 0 ? (
                <div className="divide-y divide-[#272B35]">
                  {selectedAsset.images.map((image, index) => (
                    <div
                      key={image.assetId}
                      className="flex items-center gap-3 p-4"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#303541] bg-[#191C24]">
                        <ImageIcon size={16} className="text-slate-400" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-200">
                          Image attempt {index + 1}
                        </p>

                        <p className="mt-1 truncate text-[11px] text-slate-500">
                          {image.imagePath
                            ? getFileName(image.imagePath)
                            : image.imageGenerationStatus}
                        </p>

                        <p className="mt-1 text-[10px] text-slate-500">
                          {formatDate(image.createdAt)}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <StatusBadge
                          status={
                            image.imagePath
                              ? "Ready"
                              : image.imageGenerationStatus
                          }
                        />

                        {image.isSelected && (
                          <span className="text-[10px] text-emerald-400">
                            Selected
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 text-center">
                  <ImageIcon size={28} className="mx-auto text-slate-600" />

                  <p className="mt-3 text-xs text-slate-400">
                    No image attempts yet.
                  </p>

                  <p className="mt-1 text-[11px] text-slate-500">
                    Import an existing image or generate one later.
                  </p>
                </div>
              )
            ) : (
              <p className="p-5 text-xs text-slate-500">
                Select a stock idea to view its image attempts.
              </p>
            )}
          </Panel>

          {/* Generated metadata */}

          <Panel>
            <PanelHeading
              title="Generated metadata"
              description="Information saved from Gemini"
            />

            {selectedAsset ? (
              <div className="space-y-5 p-5">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-300">
                    Asset name
                  </label>

                  <input
                    className={inputClass}
                    value={selectedMetadata?.name ?? ""}
                    onChange={(event) =>
                      updateSelectedMetadata("name", event.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-300">
                    Category
                  </label>

                  <input
                    className={inputClass}
                    value={selectedMetadata?.category ?? ""}
                    onChange={(event) =>
                      updateSelectedMetadata("category", event.target.value)
                    }
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-300">
                      Title
                    </label>

                    <span className="text-[11px] text-slate-500">
                      {selectedAsset.title.length} characters
                    </span>
                  </div>

                  <textarea
                    className={`${inputClass} min-h-20 resize-y`}
                    value={selectedMetadata?.title ?? ""}
                    onChange={(event) =>
                      updateSelectedMetadata("title", event.target.value)
                    }
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-300">
                      Description
                    </label>

                    <span className="text-[11px] text-slate-500">
                      {selectedAsset.description.length} characters
                    </span>
                  </div>

                  <textarea
                    className={`${inputClass} min-h-32 resize-y`}
                    value={selectedMetadata?.description ?? ""}
                    onChange={(event) =>
                      updateSelectedMetadata("description", event.target.value)
                    }
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-300">
                      Keywords
                    </label>

                    <span className="text-[11px] text-slate-500">
                      {selectedAsset.keywords.length} keywords
                    </span>
                  </div>

                  <textarea
                    className={`${inputClass} min-h-24 resize-y`}
                    placeholder="Enter keywords separated by commas"
                    value={selectedMetadata?.keywords.join(", ") ?? ""}
                    onChange={(event) =>
                      updateSelectedMetadata(
                        "keywords",
                        event.target.value
                          .split(",")
                          .map((keyword) => keyword.trim())
                          .filter(Boolean),
                      )
                    }
                  />
                </div>
              </div>
            ) : (
              <p className="p-5 text-xs text-slate-500">
                Select a stock idea to view its metadata.
              </p>
            )}
          </Panel>
        </div>

        {/* Image generation and idea information */}

        <div className="space-y-4">
          <Panel>
            <PanelHeading
              title="Image generation"
              description="Saved Gemini image prompt"
            />

            <div className="p-4">
              {selectedAsset ? (
                <>
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#C5BCFF]">
                    <Sparkles size={16} />
                    Image prompt
                  </div>

                  <textarea
                    readOnly
                    className={`${inputClass} min-h-44 resize-y text-xs leading-relaxed`}
                    value={selectedAsset.imagePrompt}
                  />

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Image status</span>

                    <StatusBadge status={getImageStatus(selectedAsset)} />
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-500">
                  Select an idea to view its image prompt.
                </p>
              )}
            </div>
          </Panel>

          <Panel className="p-4">
            <h3 className="text-sm font-semibold text-white">Bulk selection</h3>

            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Select multiple ideas without images. They will be available for
              bulk image generation.
            </p>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-400">Selected ideas</span>

              <span className="text-sm font-semibold text-white">
                {selectedMissingCount}
              </span>
            </div>

            {selectedMissingCount > 0 && (
              <button
                type="button"
                className={`${buttonClass} mt-3 w-full`}
                onClick={clearSelection}
              >
                <X size={14} />
                Clear selection
              </button>
            )}

            <div className="mt-3 rounded-lg border border-[#303541] bg-[#111318] p-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock3 size={14} />
                Image generation queue will be implemented next.
              </div>
            </div>
          </Panel>

          <Panel className="p-4">
            <h3 className="text-sm font-semibold text-white">
              Idea information
            </h3>

            {selectedAsset ? (
              <div className="mt-3 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">Category</span>

                  <span className="text-right text-slate-200">
                    {selectedMetadata?.category ?? selectedAsset.category}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">Created</span>

                  <span className="text-right text-slate-200">
                    {formatDate(selectedAsset.createdAt)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">Image attempts</span>

                  <span className="text-right text-slate-200">
                    {selectedAsset.images.length}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-500">No idea selected.</p>
            )}
          </Panel>
          <div className="flex items-center justify-between gap-3 border-t border-[#272B35] p-4">
            <span className="text-xs text-slate-400">
              {hasUnsavedChanges ? "Unsaved changes" : "All changes saved"}
            </span>

            <button
              type="button"
              onClick={handleSaveMetadataChanges}
              disabled={!hasUnsavedChanges}
              className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
