export function cinematicSceneSelector() {
  return `<label class="order-fields__wide order-cinematic-scenes" data-cinematic-fields hidden>
    <span>How many cinematic scenes?</span>
    <select name="cinematicSceneCount" disabled>
      <option value="">Choose 3 or 4 scenes</option>
      <option value="3">3 scenes — a focused beginning, middle, and finish</option>
      <option value="4">4 scenes — one extra moment for more story or product detail</option>
    </select>
    <small><strong>Both choices are completely included in your plan.</strong> A scene is one full-screen visual moment that changes as the visitor scrolls. You will review two complete visual directions before animation begins.</small>
  </label>`;
}
