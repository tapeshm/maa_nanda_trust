## Issues / edge cases to address

1. **Duplicate payload for HTMX**
   As noted, you currently (a) write hidden inputs **and** (b) add the same JSON to `event.detail.parameters`. Recommend picking one in HTMX path to avoid duplicate keys; simplest is to **skip `updateEventParameters`** and rely on the already-updated hidden inputs. This matches your step-05 acceptance (“Hidden inputs are kept in sync before each HTMX submission”).

2. **Editor root `id` required**
   Serialization skips any `[data-editor]` without an `id`. Consider asserting/logging once when an editor has no `id` so bugs are surfaced earlier.

3. **Lifecycle on HTMX swaps**
   You rely on consumers to call `window.initEditors()` after swaps (you exposed it), which is okay. For better DX, listen for `htmx:afterSwap` in bootstrap and call the scan routines automatically; Hono prefers small route files and explicit structure, but this client event hook is a localized improvement.

4. **Destroy on unmount**
   If an editor root is removed (e.g., via HTMX swap), you should `destroy()` the instance and `unregisterEditorContentSource(root)` to avoid memory leaks. You already have `unregister…`; wire it using a `MutationObserver` in bootstrap. (Hono best-practice is about server structure, but on the client this keeps things tidy.)

5. **Security reminder (rendering)**
   You persist JSON and render server-side. Keep doing that. If you **ever** render HTML client-side, follow OWASP guidance: sanitise and avoid unsafe sinks like direct `innerHTML` of untrusted content. Don’t mutate sanitised HTML afterward.

---

## Targeted refactor (simpler & harder to misuse)

**Goals**: 1) avoid duplication for HTMX, 2) make registration obvious, 3) centralize serialization logic, 4) ease tests.

### A. Make HTMX path single-source of truth

Change `onHtmxConfigRequest` to **not** add parameters if hidden inputs already exist:

```ts
function onHtmxConfigRequest(this: unknown, event: Event): void {
  const form = resolveFormFromEvent(event, this)
  if (!form) return

  // Always refresh hidden inputs – they are our single source of truth.
  serializeForm(form)

  // Avoid duplicating params if the hidden fields are present (they are).
  // If you want param-only mode for forms without hidden fields, gate it:
  // if (!form.querySelector('input[type="hidden"][data-editor-field]')) {
  //   updateEventParameters(form, event)
  // }
}
```

(Your existing `serializeForm` and hidden-field creation already satisfy step-05 acceptance for HTMX; this just avoids doubles.)

### B. Extract a tiny “FormSync” helper

Encapsulate the maps and operations; surface a small API:

```ts
class FormSync {
  private editorGetters = new WeakMap<HTMLElement, () => JSONContent>()
  private registeredForms = new WeakSet<HTMLFormElement>()

  registerEditor(root: HTMLElement, instance?: EditorInstance) {
    if (!instance?.getJSON) { this.editorGetters.delete(root); return }
    this.editorGetters.set(root, () => instance.getJSON())
    this.refreshFormsForEditor(root)
  }

  registerForm(form: HTMLFormElement) {
    if (this.registeredForms.has(form)) return
    form.addEventListener('submit', (e) => this.onSubmit(form, e), { capture: true })
    form.addEventListener('htmx:configRequest' as any, (e) => this.onHtmx(form, e))
    this.registeredForms.add(form)
    this.serializeForm(form) // progressive enhancement
  }

  // …implement serializeForm(form), updateHiddenField(form, root), editorsWithin(form)
  // …use readInitialContent(root) fallback as you do today
}
```

This pushes most `form.ts` free functions behind an instance. Your existing functions can be moved in nearly unchanged; tests become easier (one instance, reset between tests). (All current logic is already good/decoupled; this just makes lifecycle clearer.)

### C. Bootstrap nicety: auto-rescan after swaps

In `bootstrap.ts`:

```ts
document.body.addEventListener('htmx:afterSwap', () => {
  runInitializers() // already calls scanForEditors + initEditorForms
})
```

This uses your existing `runInitializers()` that scans editors and forms; no risk thanks to your WeakMaps/WeakSets.

### D. Developer-experience & safety nits

* Add a one-time console.warn if an editor root has **no id**, so serialization isn’t silently skipped.
* Consider a helper `hasEditorHiddenFields(form)` to guard future behavior and tests:

```ts
const hasEditorHiddenFields = (form: HTMLFormElement) =>
  !!form.querySelector('input[type="hidden"][data-editor-field]')
```

* Keep SSR JSON loader as is (solid): find `<script id="<id>__content" type="application/json">...` and validate minimal PM shape before use.

---

## Server & structure (brief)

* On the **server** side, keep Hono routes small and composed; prefer route files and `app.route()` over heavyweight controllers—this is Hono’s published guidance for maintainable apps.
* Ensure you continue to **persist JSON** and render HTML server-side with the same extension list to avoid schema drift (as your spec states).

## Additional Refactoring

wire a tiny MutationObserver and an htmx:afterSwap hook in bootstrap.ts to auto-destroy/re-scan editors

A surgical patch to bootstrap.ts that wires:

* a MutationObserver to auto-mount/unmount editors on DOM changes, and
* HTMX hooks (htmx:afterSwap, htmx:beforeCleanup) to rescan or clean up just-in-time.

No API changes. Idempotent. Works with or without HTMX present.

Also add a tiny observeOnce unit around MutationObserver and wire a low-cost test shim that injects/removes a fake [data-editor] node to assert mount/unmount calls.

