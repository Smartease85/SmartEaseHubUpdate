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
  // MELK-OA10 native mode IDs are documented by independent hardware
  // tests. They are NOT interchangeable with ELK-BLEDOB or unknown lights.
  // Descriptions are intentionally generic until checked on this cart.
  const categories = Object.freeze([
    { id: "basic", name: "Basic", description: "Auto, jumps and strobes" },
    { id: "trans", name: "Transitions", description: "Light/dark fades" },
    { id: "tail", name: "Comet trails", description: "Tailing patterns" },
    { id: "water", name: "Running water", description: "Moving water patterns" },
    { id: "curtain", name: "Curtains", description: "Open and close" },
    { id: "run", name: "Forward runs", description: "Forward chase effects" },
    { id: "runback", name: "Reverse runs", description: "Reverse chase effects" },
    { id: "flow", name: "Flow", description: "White/color breathing" },
  ]);
  function categoryForMode(mode) {
    if (!Number.isInteger(mode) || mode < 0 || mode > 212) return null;
    if (mode <= 2 || (mode >= 77 && mode <= 88) || mode >= 181) return "basic";
    if (mode <= 22) return "trans";
    if (mode <= 38) return "tail";
    if (mode <= 56) return "water";
    if (mode <= 76) return "curtain";
    if (mode <= 142) return mode % 2 ? "run" : "runback";
    if (mode <= 166) return "flow";
    return mode % 2 ? "run" : "runback";
  }
  const melKModeCatalog = Object.freeze(Array.from({length: 213}, (_, id) =>
    Object.freeze({
      id,
      category: categoryForMode(id),
      label: id === 0 ? "Auto play (0)" : "Controller mode " + id,
    })
  ));
  function nativeModes(kind, category = "all") {
    if (kind !== "melk-oa10") return [];
    return melKModeCatalog.filter(m => category === "all" || m.category === category);
  }
  function nativeModeCommands(kind, mode, settings = {}) {
    if (kind !== "melk-oa10")
      throw Error("Native mode catalog requires a verified MELK-OA10 controller.");
    if (!Number.isInteger(mode) || mode < 0 || mode > 212)
      throw Error("Choose a valid MELK-OA10 mode (0–212).");
    const brightness = settings.brightness ?? 50;
    const speed = settings.speed ?? 50;
    if (!Number.isInteger(brightness) || brightness < 0 || brightness > 100 ||
        !Number.isInteger(speed) || speed < 0 || speed > 100)
      throw Error("Brightness and speed must be whole numbers from 0 to 100.");
    return [
      [0x7e, 0x07, 0x03, mode, 0xff, 0xff, 0xff, 0x00, 0xef],
      [0x7e, 0x04, 0x02, speed, 0xff, 0xff, 0xff, 0x00, 0xef],
      [0x7e, 0x07, 0x01, brightness, 0xff, 0xff, 0xff, 0x00, 0xef],
    ];
  }
  root.SmartEaseLotus = {
    profile, commands, categories, categoryForMode, nativeModes, nativeModeCommands
  };
  if (typeof module !== "undefined") module.exports = root.SmartEaseLotus;
})(globalThis);
