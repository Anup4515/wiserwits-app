import { createContext, useContext } from "react";
import type { TextInput } from "react-native";

export type FocusedInput = NonNullable<ReturnType<typeof TextInput.State.currentlyFocusedInput>>;

/**
 * Lets a <Field> ask the nearest keyboard-aware screen (AuthScaffold) to scroll
 * it above the keyboard when it gains focus. Lives in its own module so ui.tsx
 * and AuthScaffold don't import each other. Outside a provider it's a no-op.
 */
export const KeyboardRevealContext = createContext<(input: FocusedInput | null) => void>(() => {});
export const useKeyboardReveal = () => useContext(KeyboardRevealContext);
