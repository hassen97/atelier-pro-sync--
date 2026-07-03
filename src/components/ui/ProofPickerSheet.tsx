import { useRef } from "react";
import { Camera, Images, X } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";

interface ProofPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileSelected: (file: File) => void;
}

export function ProofPickerSheet({ open, onOpenChange, onFileSelected }: ProofPickerSheetProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
      onOpenChange(false);
    }
    // Reset so same file can be re-selected
    e.target.value = "";
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="relative">
          <DrawerTitle className="text-center">Preuve de paiement</DrawerTitle>
          <DrawerClose className="absolute right-4 top-4 rounded-full p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </DrawerClose>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-3">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="w-full flex items-center gap-4 rounded-xl p-4 transition-colors bg-muted/50 hover:bg-muted border border-border"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Camera className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">Utiliser l'appareil photo</p>
              <p className="text-xs text-muted-foreground">Prendre une photo maintenant</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="w-full flex items-center gap-4 rounded-xl p-4 transition-colors bg-accent/30 hover:bg-accent/50 border-2 border-primary/30"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Images className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">Choisir dans la galerie/fichiers</p>
              <p className="text-xs text-muted-foreground">Sélectionner une image existante</p>
            </div>
          </button>
        </div>

        {/* Hidden inputs */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </DrawerContent>
    </Drawer>
  );
}
