import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, Loader2, Upload } from "lucide-react";
import type { ServerPhoto } from "@/lib/publishDraft";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import type { PublishFormValues } from "@/pages/publish/publishFormSchema";

type PendingPhoto = { file: File; preview: string };

type PublishMediaSectionProps = {
  /**
   * Photos state lives in `usePublishMedia` (parent-owned hook). It cannot
   * be moved into this section without splitting the source of truth that
   * also feeds publishValidationInput and step 3's photoCount. Photos are
   * therefore passed as props (hybrid pattern documented in Phase 6.4.a).
   */
  serverPhotos: ServerPhoto[];
  pendingPhotos: PendingPhoto[];
  isUploading: boolean;
  labels: {
    mainPhotoFirst: string;
    chooseFiles: string;
    localOnly: string;
    uploading: string;
    videoUrl: string;
    tourUrl: string;
    mainPhotosTitle: string;
    cover: string;
    advancedMediaTitle: string;
    advancedMediaHint: string;
  };
  onPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMakeCoverAtIndex: (index: number) => void;
  onRemovePhotoAt: (index: number) => void;
};

/**
 * Step 2 of the publish flow — photos + optional video / virtual-tour URLs.
 *
 * Phase 6.4.d: hybrid form-aware. The 2 form fields (videoUrl, virtualTourUrl)
 * are read/written via useFormContext; photos and their handlers stay on
 * props because usePublishMedia is owned by PublishPage (cross-step photoCount,
 * upload flush, validation input).
 */
export function PublishMediaSection({
  serverPhotos,
  pendingPhotos,
  isUploading,
  labels,
  onPhotoSelect,
  onMakeCoverAtIndex,
  onRemovePhotoAt,
}: PublishMediaSectionProps) {
  const form = useFormContext<PublishFormValues>();
  const videoUrl = form.watch("videoUrl");
  const virtualTourUrl = form.watch("virtualTourUrl");
  const [showAdvancedMedia, setShowAdvancedMedia] = useState(false);
  return (
    <div className="space-y-5 form-surface">
      <div className="rounded-xl border border-border/75 bg-gradient-to-br from-card to-secondary/15 px-4 py-3.5">
        <p className="text-sm text-foreground font-sans font-medium">{labels.mainPhotosTitle}</p>
        <p className="mt-1 text-[13px] text-muted-foreground font-sans leading-relaxed">{labels.mainPhotoFirst}</p>
      </div>
      <div className="border-2 border-dashed border-border rounded-2xl p-6 sm:p-10 text-center bg-background/70">
        {isUploading ? (
          <Loader2 className="h-10 w-10 mx-auto text-primary mb-3 animate-spin" />
        ) : (
          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        )}
        <input type="file" multiple accept="image/*" onChange={onPhotoSelect} className="hidden" id="photo-upload" />
        <label htmlFor="photo-upload">
          <Button variant="outline" className="font-sans" type="button" asChild>
            <span>{labels.chooseFiles}</span>
          </Button>
        </label>
        {isUploading && (
          <p className="mt-3 text-xs font-sans text-muted-foreground">{labels.uploading}</p>
        )}
      </div>
      {(serverPhotos.length > 0 || pendingPhotos.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {serverPhotos.map((ph, i) => (
            <div key={ph.id} className="relative rounded-xl overflow-hidden border border-border aspect-square group">
              <img src={ph.url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex gap-1.5 p-1.5 bg-background/85">
                {i > 0 && (
                  <Button type="button" size="sm" variant="secondary" className="text-xs min-h-10 flex-1 font-sans" onClick={() => onMakeCoverAtIndex(i)}>
                    {labels.cover}
                  </Button>
                )}
                <Button type="button" size="sm" variant="destructive" className="text-xs min-h-10 px-3 font-sans" onClick={() => onRemovePhotoAt(i)}>
                  Suppr.
                </Button>
              </div>
              {i === 0 && (
                <span className="absolute top-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-sans">
                  {labels.cover}
                </span>
              )}
            </div>
          ))}
          {pendingPhotos.map((p, i) => {
            const gi = serverPhotos.length + i;
            return (
              <div key={`${p.file.name}-${p.file.size}-${i}`} className="relative rounded-xl overflow-hidden border border-border aspect-square group border-dashed">
                <img src={p.preview} alt="" className="w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 pointer-events-none">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                  <span className="text-[11px] font-sans text-white">{labels.uploading}</span>
                </div>
                <div className="absolute inset-x-0 bottom-0 flex gap-1.5 p-1.5 bg-background/85">
                  {gi > 0 && (
                    <Button type="button" size="sm" variant="secondary" className="text-xs min-h-10 flex-1 font-sans" onClick={() => onMakeCoverAtIndex(gi)}>
                      {labels.cover}
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="destructive" className="text-xs min-h-10 px-3 font-sans" onClick={() => onRemovePhotoAt(gi)}>
                    Suppr.
                  </Button>
                </div>
                {gi === 0 && (
                  <span className="absolute top-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-sans">
                    {labels.cover}
                  </span>
                )}
                <span className="absolute top-1 right-1 text-[9px] bg-muted px-1 rounded font-sans">{labels.localOnly}</span>
              </div>
            );
          })}
        </div>
      )}
      <section className="rounded-xl border border-border/70 bg-background/70">
        <button
          type="button"
          onClick={() => setShowAdvancedMedia((prev) => !prev)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          aria-expanded={showAdvancedMedia}
        >
          <div>
            <p className="font-serif text-sm text-foreground">{labels.advancedMediaTitle}</p>
            <p className="mt-0.5 font-sans text-[13px] text-muted-foreground leading-relaxed">{labels.advancedMediaHint}</p>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showAdvancedMedia ? "rotate-180" : ""}`} />
        </button>
        {showAdvancedMedia && (
          <div className="space-y-3 border-t border-border/70 px-4 py-4">
            <div className="space-y-2">
              <Label className="font-sans">{labels.videoUrl}</Label>
              <Input
                value={videoUrl}
                onChange={(e) => form.setValue("videoUrl", e.target.value)}
                className="font-sans"
                placeholder="https://"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">{labels.tourUrl}</Label>
              <Input
                value={virtualTourUrl}
                onChange={(e) => form.setValue("virtualTourUrl", e.target.value)}
                className="font-sans"
                placeholder="https://"
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
