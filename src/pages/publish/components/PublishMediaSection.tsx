import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import type { ServerPhoto } from "@/lib/publishDraft";

type PendingPhoto = { file: File; preview: string };

type PublishMediaSectionProps = {
  serverPhotos: ServerPhoto[];
  pendingPhotos: PendingPhoto[];
  videoUrl: string;
  virtualTourUrl: string;
  labels: {
    mainPhotoFirst: string;
    chooseFiles: string;
    localOnly: string;
    videoUrl: string;
    tourUrl: string;
  };
  onPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMakeCoverAtIndex: (index: number) => void;
  onRemovePhotoAt: (index: number) => void;
  onVideoUrlChange: (value: string) => void;
  onVirtualTourUrlChange: (value: string) => void;
};

export function PublishMediaSection({
  serverPhotos,
  pendingPhotos,
  videoUrl,
  virtualTourUrl,
  labels,
  onPhotoSelect,
  onMakeCoverAtIndex,
  onRemovePhotoAt,
  onVideoUrlChange,
  onVirtualTourUrlChange,
}: PublishMediaSectionProps) {
  return (
    <div className="space-y-5 form-surface">
      <p className="text-sm text-muted-foreground font-sans">{labels.mainPhotoFirst}</p>
      <div className="border-2 border-dashed border-border rounded-2xl p-6 sm:p-10 text-center">
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <input type="file" multiple accept="image/*" onChange={onPhotoSelect} className="hidden" id="photo-upload" />
        <label htmlFor="photo-upload">
          <Button variant="outline" className="font-sans" type="button" asChild>
            <span>{labels.chooseFiles}</span>
          </Button>
        </label>
      </div>
      {(serverPhotos.length > 0 || pendingPhotos.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {serverPhotos.map((ph, i) => (
            <div key={ph.id} className="relative rounded-xl overflow-hidden border border-border aspect-square group">
              <img src={ph.url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex gap-1 p-1 bg-background/80">
                {i > 0 && (
                  <Button type="button" size="sm" variant="secondary" className="text-[10px] h-7 flex-1 font-sans" onClick={() => onMakeCoverAtIndex(i)}>
                    Couverture
                  </Button>
                )}
                <Button type="button" size="sm" variant="destructive" className="text-[10px] h-7 font-sans" onClick={() => onRemovePhotoAt(i)}>
                  ×
                </Button>
              </div>
              {i === 0 && (
                <span className="absolute top-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-sans">
                  Couverture
                </span>
              )}
            </div>
          ))}
          {pendingPhotos.map((p, i) => {
            const gi = serverPhotos.length + i;
            return (
              <div key={`${p.file.name}-${p.file.size}-${i}`} className="relative rounded-xl overflow-hidden border border-border aspect-square group border-dashed">
                <img src={p.preview} alt="" className="w-full h-full object-cover opacity-90" />
                <div className="absolute inset-x-0 bottom-0 flex gap-1 p-1 bg-background/80">
                  {gi > 0 && (
                    <Button type="button" size="sm" variant="secondary" className="text-[10px] h-7 flex-1 font-sans" onClick={() => onMakeCoverAtIndex(gi)}>
                      Couverture
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="destructive" className="text-[10px] h-7 font-sans" onClick={() => onRemovePhotoAt(gi)}>
                    ×
                  </Button>
                </div>
                {gi === 0 && (
                  <span className="absolute top-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-sans">
                    Couverture
                  </span>
                )}
                <span className="absolute top-1 right-1 text-[9px] bg-muted px-1 rounded font-sans">{labels.localOnly}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="space-y-2">
        <Label className="font-sans">{labels.videoUrl}</Label>
        <Input value={videoUrl} onChange={(e) => onVideoUrlChange(e.target.value)} className="font-sans" placeholder="https://" />
      </div>
      <div className="space-y-2">
        <Label className="font-sans">{labels.tourUrl}</Label>
        <Input value={virtualTourUrl} onChange={(e) => onVirtualTourUrlChange(e.target.value)} className="font-sans" placeholder="https://" />
      </div>
    </div>
  );
}

