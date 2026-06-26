(function () {
  const nav = document.querySelector(".top-nav");
  const button = document.querySelector(".menu-toggle");
  const menu = document.getElementById("primary-menu");
  if (!nav || !button || !menu) return;

  function setOpen(open) {
    nav.classList.toggle("menu-open", open);
    button.setAttribute("aria-expanded", String(open));
  }

  button.addEventListener("click", () => {
    setOpen(!nav.classList.contains("menu-open"));
  });

  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
})();
