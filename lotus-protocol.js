/* Interoperability from independently tested LotusLamp X implementations.
 * See docs/HARDWARE.md for pinned sources. No generic ELK protocol assumption. */
(function (root) {
  "use strict";
  function profile(name) {
    if (/^ELK-BLEDOB(?:\s|$)/i.test(name || "")) return "bledob";
    if (/^MELK-OA10(?:\s|$)/i.test(name || "")) return "melk-oa10";
    return null;
  }
  function commands(kind, row) {
    if (!["bledob", "melk-oa10"].includes(kind))
      throw Error("This LotusLamp model still needs setup.");
    if (
      !row ||
      !/^#[\da-f]{6}$/i.test(row.color) ||
      !Number.isFinite(row.brightness) ||
      row.brightness < 0 ||
      row.brightness > 100
    )
      throw Error("Choose a valid scene color.");
    const level = row.on ? Math.round(row.brightness) : 0;
    const rgb = [1, 3, 5].map((i) => parseInt(row.color.slice(i, i + 2), 16));
    const color = [0x7e, 7, 5, 3, ...rgb, 0x10, 0xef];
    const brightness =
      kind === "bledob"
        ? [0x7e, 4, 1, level, 1, 255, 2, 1, 0xef]
        : [0x7e, 7, 1, level, 255, 255, 255, 0, 0xef];
    // MELK's public power framing is tentative: zero brightness is used instead.
    const power =
      kind === "bledob"
        ? [0x7e, 7, 4, row.on ? 255 : 0, 0, row.on ? 1 : 0, 2, 1, 0xef]
        : null;
    return row.on
      ? [...(power ? [power] : []), color, brightness]
      : [...(power ? [power] : []), brightness];
  }
  root.SmartEaseLotus = { profile, commands };
  if (typeof module !== "undefined") module.exports = root.SmartEaseLotus;
})(globalThis);
