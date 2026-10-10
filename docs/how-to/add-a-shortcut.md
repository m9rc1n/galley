# Add a keyboard shortcut

Shortcuts are single keys that work while the reader has focus, no field is active and no sheet is open. Choose a key that is mnemonic and free: taken are <kbd>J</kbd> <kbd>K</kbd> <kbd>N</kbd> <kbd>P</kbd> <kbd>[</kbd> <kbd>]</kbd> <kbd>F</kbd> <kbd>M</kbd> <kbd>R</kbd> <kbd>V</kbd> <kbd>C</kbd> <kbd>A</kbd> <kbd>L</kbd> <kbd>D</kbd> <kbd>+</kbd> <kbd>=</kbd> <kbd>−</kbd> <kbd>0</kbd> <kbd>,</kbd> <kbd>?</kbd> and <kbd>Esc</kbd>, plus ⌘/Ctrl <kbd>Enter</kbd> in editors. Never take a key with ⌘, Ctrl or Alt: those belong to the browser.

1. **Handle it** in `Reader.onKey()` (`src/ui/reader.ts`): add a `case` in the `switch`. If it changes a setting, call `this.update()` and, when the change is not otherwise visible, `this.toast()` with the new state ("Layout: Review").
2. **List it** in `SHORTCUTS`, in the group where it belongs. The **Keys** tab is generated from this list.
3. **Give its button a hint:** the control that does the same thing gets the key in its `title` and `aria-label` ("Previous change (K)").
4. **Document it** in the README's **Keys** table, the [user guide](../GUIDE.md), and the popup footer if it is one of the essentials.
5. **Test it** in a reader test: the key does the thing, and does nothing while a text field is focused or the settings are open.

Every shortcut needs a pointer and touch equivalent: a key is a faster way to do something visible, never the only way.
