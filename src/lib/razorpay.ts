/**
 * Razorpay native-checkout wrapper (plan Q4 — native SDK, no web deep-link).
 *
 * `react-native-razorpay` is a NATIVE module: importing it constructs a
 * `NativeEventEmitter` at module-load time, which THROWS in Expo Go (the native
 * side isn't linked). So we NEVER `import` it statically — we load it lazily
 * behind a try/catch and cache the result. In Expo Go `load()` returns null and
 * `isRazorpayAvailable()` is false; the subscription screen then degrades to a
 * "needs the full app" notice instead of crashing. In a dev/production build the
 * module loads and checkout works.
 */

export interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number; // paise
  currency: string;
  name: string;
  description?: string;
  image?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  notes?: Record<string, string>;
}

/** Payload Razorpay returns on a successful payment (fed straight to /verify). */
export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

/** Shape of the error Razorpay rejects with (code 0 / 2 = user cancelled). */
export interface RazorpayError {
  code?: number;
  description?: string;
}

interface CheckoutModule {
  open: (options: RazorpayOptions) => Promise<RazorpaySuccess>;
}

let cached: CheckoutModule | null | undefined;

function load(): CheckoutModule | null {
  if (cached !== undefined) return cached;
  try {
    // Lazy require — importing statically would crash Expo Go at load time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-razorpay") as
      | CheckoutModule
      | { default: CheckoutModule };
    cached = ("default" in mod ? mod.default : mod) ?? null;
  } catch {
    cached = null;
  }
  return cached;
}

/** True only in a dev/production build where the native module is linked. */
export function isRazorpayAvailable(): boolean {
  return load() != null;
}

/** True when the rejection is a user-initiated cancel (not a real failure). */
export function isRazorpayCancel(err: unknown): boolean {
  const code = (err as RazorpayError | null)?.code;
  // Razorpay: 0 = network, 1 = invalid options, 2 = payment cancelled by user.
  return code === 2 || code === 0;
}

/**
 * Open the native Razorpay checkout. Rejects with `RazorpayUnavailableError`
 * in Expo Go so callers can show the "install the full app" path.
 */
export async function openRazorpayCheckout(
  options: RazorpayOptions
): Promise<RazorpaySuccess> {
  const checkout = load();
  if (!checkout) throw new RazorpayUnavailableError();
  return checkout.open(options);
}

export class RazorpayUnavailableError extends Error {
  constructor() {
    super("Payments aren't available in Expo Go. Use the installed app.");
    this.name = "RazorpayUnavailableError";
  }
}
