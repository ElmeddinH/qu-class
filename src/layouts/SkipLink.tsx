// KUDS §21 — klaviatura istifadəçiləri üçün "əsas məzmuna keç" linki.
// Stil `globals.css`-dəki `.skip-link` sinfindən gəlir (sr-only → focus-da görünür).
// Hədəf `#main`-dir; hər shell-in <main> elementində `id="main"` olmalıdır.
export function SkipLink() {
  return (
    <a href="#main" className="skip-link">
      Əsas məzmuna keç
    </a>
  );
}
