import { create } from 'zustand';

// FIFO queue of incoming pickup/delivery/return broadcast offers, feeding
// IncomingOfferModal.tsx - the Rapido/Ola-style full-screen "New offer!"
// takeover. Populated by useAppSocket.ts's handleNotification the instant a
// WS NOTIFICATION frame of the matching type arrives (see that file's
// enqueue calls), not by polling - this is what lets the popup appear with
// zero navigation required, instead of the previous toast-only behavior
// (OfferAlerts.tsx) that left the employee to notice and manually go find
// the offer in a list screen.
//
// Same module-level-store + plain-function-object convention as
// wsStatusStore.ts, so non-component callers (useAppSocket.ts) can enqueue
// without needing a hook.

export type IncomingOfferKind = 'pickup' | 'delivery' | 'return' | 'repair_pickup' | 'repair_delivery';

export interface IncomingOfferLocation {
  full_name?: string | null;
  mobile?: string | null;
  tailor_name?: string | null;
  tailor_mobile?: string | null;
  location?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  landmark?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  // Real server-computed distance for THIS leg (employee -> pickup point on
  // the pickup leg; pickup-point -> drop-point on the drop leg) - mirrors
  // the tailor side's distance_km field. Replaces the old client-side
  // haversine-from-live-GPS approximation, which only ever covered the
  // pickup leg.
  distance_km?: number | null;
}

export interface IncomingOffer {
  kind: IncomingOfferKind;
  orderId: string;
  orderCode?: string | null;
  // Pickup offers arrive over WS with no location payload (single-location
  // by design - the "pickup" point IS the customer's own address, and the
  // backend notification for that leg only carries order_id/order_code) -
  // null here means IncomingOfferModal.tsx must resolve it from the
  // already-invalidated GET /pickup-broadcasts list instead.
  pickup?: IncomingOfferLocation | null;
  drop?: IncomingOfferLocation | null;
  expiresAt?: string | null;
  broadcastRound?: number | null;
}

interface IncomingOfferState {
  queue: IncomingOffer[];
  enqueue: (offer: IncomingOffer) => void;
  dequeue: () => void;
}

export const useIncomingOfferStore = create<IncomingOfferState>((set, get) => ({
  queue: [],
  enqueue: (offer) => {
    const { queue } = get();
    // An order already queued (e.g. a duplicate WS delivery, or the
    // scheduler re-broadcasting the same offer to this employee in a later
    // round) replaces the existing entry in place rather than duplicating
    // it in the queue - the employee should never see the same order twice.
    const existingIndex = queue.findIndex(
      (o) => o.kind === offer.kind && o.orderId === offer.orderId,
    );
    if (existingIndex !== -1) {
      const next = [...queue];
      next[existingIndex] = offer;
      set({ queue: next });
      return;
    }
    set({ queue: [...queue, offer] });
  },
  dequeue: () => set((state) => ({ queue: state.queue.slice(1) })),
}));

export const incomingOfferQueue = {
  enqueue: (offer: IncomingOffer) => useIncomingOfferStore.getState().enqueue(offer),
  dequeue: () => useIncomingOfferStore.getState().dequeue(),
};
