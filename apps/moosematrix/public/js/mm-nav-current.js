// Marks a header hub link as the current section on the pages it holds (data-mm-also="/builds /lab ..."):
// aria-current="true" (a section, not the page itself). tokens nav.js already marks exact-path matches with "page".
(function () {
  "use strict";
  var path = window.location.pathname.replace(/\/+$/, "") || "/";
  var links = document.querySelectorAll(".mm-nav a[data-mm-also], .mm-menu-nav a[data-mm-also]");
  for (var i = 0; i < links.length; i++) {
    if (links[i].hasAttribute("aria-current")) continue;
    var also = links[i].getAttribute("data-mm-also").split(" ");
    for (var j = 0; j < also.length; j++) {
      if (path === also[j] || path.indexOf(also[j] + "/") === 0) { links[i].setAttribute("aria-current", "true"); break; }
    }
  }
})();
