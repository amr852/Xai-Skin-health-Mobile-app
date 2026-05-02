import React, { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { AvatarMenu } from '@/components/ui/AvatarMenu';

interface UiOverlayCtx {
  openAvatarMenu: () => void;
  closeAvatarMenu: () => void;
}

const Ctx = createContext<UiOverlayCtx | null>(null);

export function UiOverlayProvider({ children }: { children: ReactNode }) {
  const [avatarOpen, setAvatarOpen] = useState(false);

  const openAvatarMenu  = useCallback(() => setAvatarOpen(true),  []);
  const closeAvatarMenu = useCallback(() => setAvatarOpen(false), []);

  return (
    <Ctx.Provider value={{ openAvatarMenu, closeAvatarMenu }}>
      {children}
      <AvatarMenu visible={avatarOpen} onClose={closeAvatarMenu} />
    </Ctx.Provider>
  );
}

export function useUiOverlay(): UiOverlayCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUiOverlay must be used within UiOverlayProvider');
  return ctx;
}
