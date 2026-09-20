import { create } from 'zustand';

interface OpenSheetState {
  /** Count of currently-mounted BottomSheet instances with visible=true.
   * A counter, not a boolean, because a sheet can itself open another sheet
   * (e.g. a confirm dialog on top of a form sheet) - background scroll must
   * only re-enable once every stacked sheet has closed. */
  count: number;
  increment: () => void;
  decrement: () => void;
}

export const useOpenSheetStore = create<OpenSheetState>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
  decrement: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
}));

/** True while at least one BottomSheet is open anywhere in the app - use to
 * disable a screen's own ScrollView (scrollEnabled={!isAnySheetOpen()})
 * so the background can't be dragged/scrolled underneath an open sheet.
 * RN's <Modal transparent> does not reliably block touches reaching the
 * view behind it in every case, so this is enforced explicitly rather than
 * relied on implicitly. */
export const useIsAnySheetOpen = () => useOpenSheetStore((s) => s.count > 0);
