import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SHARE_CHANNELS, type ShareChannel, type ShareUrlParams } from "./shareChannels";

interface ShareModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  shareParams: ShareUrlParams;
  onChannelClick: (channel: Exclude<ShareChannel, "native">, url: string) => void;
}

export function ShareModal({ isOpen, onOpenChange, shareParams, onChannelClick }: ShareModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Partager cette annonce</DialogTitle>
          <DialogDescription>Choisissez un canal pour transmettre ce véhicule.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {SHARE_CHANNELS.map((channel) => {
            const Icon = channel.icon;
            const url = channel.buildUrl(shareParams);
            return (
              <button
                key={channel.id}
                type="button"
                onClick={() => onChannelClick(channel.id, url)}
                aria-label={`Partager via ${channel.label}`}
                className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-full text-white", channel.iconBg)}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium">{channel.label}</span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
