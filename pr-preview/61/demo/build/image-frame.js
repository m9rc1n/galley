"use strict";
(() => {
  // src/ui/image-frame.ts
  function imageAddress(value) {
    if (typeof value != "string" || value.length > 8192) return !1;
    try {
      let url = new URL(value);
      return /^https?:$/.test(url.protocol) && !url.username && !url.password;
    } catch {
      return !1;
    }
  }
  function showImage(port, src) {
    let img = document.createElement("img");
    img.alt = "", img.referrerPolicy = "no-referrer", img.style.cssText = "display:block;width:100%;height:auto", img.addEventListener(
      "load",
      () => {
        port.postMessage({ width: img.naturalWidth, height: img.naturalHeight }), port.close();
      },
      { once: !0 }
    ), img.addEventListener(
      "error",
      () => {
        port.postMessage({ error: !0 }), port.close();
      },
      { once: !0 }
    ), img.src = src, document.body.append(img);
  }
  addEventListener("message", (event) => {
    let data = event.data, [port] = event.ports;
    data?.type !== "galley-image" || !port || document.querySelector("img") || !imageAddress(data.src) || showImage(port, data.src);
  });
})();
