import { create } from 'zustand';

// FIFO queue of incoming TAILOR broadcast offers, feeding
// IncomingBroadcastModal.tsx - the tailor-role sibling of
// IncomingOfferModal.tsx (Bridge/employee pickup/delivery/return).
//
// Kept as a separate store rather than a new kind on incomingOfferStore.ts:
// a tailor broadcast has a completely different data shape (service/garment/
// TAT/notes, no pickup/drop address pair) and the WS notification for it
// carries almost nothing (see broadcast_service.py's _notify_tailors -
// order_id/order_code/status/action only), so the modal always resolves the
// real details from GET /orders/broadcasts (useBroadcastOffers) rather than
// from the WS payload - there's no location payload to thread through here
// the way pickup/delivery/return do.
//
// Same module-level-store + plain-function-object convention as
// incomingOfferStore.ts/wsStatusStore.ts, so useAppSocket.ts can enqueue
// without needing a hook.

export interface IncomingBroadcast {
  orderId: string;
  orderCode?: string | null;
}

interface IncomingBroadcastState {
  queue: IncomingBroadcast[];
  enqueue: (offer: IncomingBroadcast) => void;
  dequeue: () => void;
  remove: (orderId: string) => void;
  clear: () => void;
}

export const useIncomingBroadcastStore = create<IncomingBroadcastState>((set, get) => ({
  queue: [],
  enqueue: (offer) => {
    const { queue } = get();
    const existingIndex = queue.findIndex((o) => o.orderId === offer.orderId);
    if (existingIndex !== -1) {
      const next = [...queue];
      next[existingIndex] = offer;
      set({ queue: next });
      return;
    }
    set({ queue: [...queue, offer] });
  },
  dequeue: () => set((state) => ({ queue: state.queue.slice(1) })),
  remove: (orderId) => set((state) => ({ queue: state.queue.filter((o) => o.orderId !== orderId) })),
  clear: () => set({ queue: [] }),
}));

export const incomingBroadcastQueue = {
  enqueue: (offer: IncomingBroadcast) => useIncomingBroadcastStore.getState().enqueue(offer),
  dequeue: () => useIncomingBroadcastStore.getState().dequeue(),
  remove: (orderId: string) => useIncomingBroadcastStore.getState().remove(orderId),
  clear: () => useIncomingBroadcastStore.getState().clear(),
};
