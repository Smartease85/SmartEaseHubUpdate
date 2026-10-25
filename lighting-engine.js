/* SmartEase scene model. No DOM or radio access: adapters own transport. */
(function (root) {
  "use strict";
  const zones = [
    "front-bumper",
    "canopy",
    "left-under",
    "right-under",
    "rear-bumper",
  ];
  const positions = {
    "front-bumper": 0,
    canopy: 0.32,
    "left-under": 0.56,
    "right-under": 0.56,
    "rear-bumper": 1,
  };
  const effects = [25, 1, 3, 6, 7, 8, 16, 17];
  const color = (c) => typeof c === "string" && /^#[\da-f]{6}$/i.test(c);
  function mix(a, b, t) {
    return (
      "#" +
      [1, 3, 5]
        .map((i) =>
          Math.round(
            parseInt(a.slice(i, i + 2), 16) * (1 - t) +
              parseInt(b.slice(i, i + 2), 16) * t,
          )
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")
    );
  }
  function rows(
    palette = ["#49e3d2", "#278dff"],
    effect = 25,
    brightness = 45,
  ) {
    return Object.fromEntries(
      zones.map((id) => [
        id,
        {
          on: true,
          color: mix(palette[0], palette[palette.length - 1], positions[id]),
          effect,
          brightness,
          speed: 5,
        },
      ]),
    );
  }
  function validateRows(raw) {
    if (!raw || typeof raw !== "object")
      throw Error("Choose a complete five-zone scene.");
    return Object.fromEntries(
      zones.map((id) => {
        const r = raw[id];
        if (
          !r ||
          typeof r.on !== "boolean" ||
          !color(r.color) ||
          !effects.includes(r.effect) ||
          !Number.isFinite(r.brightness) ||
          r.brightness < 0 ||
          r.brightness > 100 ||
          !Number.isFinite(r.speed) ||
          r.speed < 1 ||
          r.speed > 10
        )
          throw Error("This scene contains an invalid light setting.");
        return [
          id,
          {
            on: r.on,
            color: r.color,
            effect: r.effect,
            brightness: Math.round(r.brightness),
            speed: Math.round(r.speed),
          },
        ];
      }),
    );
  }
  function accessories(raw, front = { color: "#49e3d2", brightness: 45 }) {
    const n = raw?.nokins || {},
      t = raw?.trinka || {};
    const percent = (v, fallback) =>
      Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : fallback;
    return {
      nokins: {
        on: n.on !== false,
        follow: n.follow === "custom" ? "custom" : "front",
        color: color(n.color) ? n.color : front.color,
        brightness: percent(n.brightness, front.brightness),
      },
      trinka: {
        on: t.on !== false,
        pattern: ["devil", "blink", "sleep"].includes(t.pattern)
          ? t.pattern
          : "devil",
        color: color(t.color) ? t.color : front.color,
        brightness: percent(t.brightness, 70),
      },
    };
  }
  function commands(raw, mapping, active, calibrate) {
    const valid = validateRows(raw),
      seen = new Set(),
      jobs = [];
    for (const id of zones) {
      const r = valid[id],
        ports = mapping[id]?.channels || [];
      for (const n of ports) {
        if (
          !Number.isInteger(n) ||
          n < 1 ||
          n > 8 ||
          seen.has(n) ||
          !active.includes(n)
        )
          throw Error("Check the light connections in Advanced.");
        seen.add(n);
        const m = 1 << (n - 1),
          p = (op, args) => [0x88, op, args.length, ...args];
        if (!r.on) {
          jobs.push(p(0x82, [m, 0]));
          continue;
        }
        // Apply the selected RGB only AFTER the controller is powered on.
        // The working physical color test uses this ordering; sending 0x82
        // last can cause some firmware to display an older/default color.
        jobs.push(p(0x83, [m, r.effect]));
        jobs.push(p(0x85, [m, Math.round((r.brightness * 255) / 100)]));
        if (r.effect !== 25) jobs.push(p(0x86, [m, r.speed]));
        jobs.push(p(0x82, [m, 1]));
        if (r.effect !== 1) jobs.push(calibrate(n, r.color));
      }
    }
    if (!seen.size)
      throw Error("Add your light connections in Advanced first.");
    return jobs;
  }
  const preset = (
    id,
    name,
    caption,
    palette,
    effect = 25,
    category = "Everyday",
  ) => ({ id, name, caption, palette, category, rows: rows(palette, effect) });
  const presets = [
    preset(
      "haunted",
      "Haunted Surge",
      "A little wicked. A lot of wow.",
      ["#46ef77", "#a24aec", "#ff751e"],
      3,
      "Holidays",
    ),
    preset("signature", "SmartEase glow", "Your signature after-dark look.", [
      "#49e3d2",
      "#278dff",
    ]),
    preset("sunset", "Golden hour", "Sunset, wherever you go.", [
      "#ffb957",
      "#e057a2",
    ]),
    preset(
      "starlight",
      "Starlight",
      "A canopy full of little wonders.",
      ["#c1abff", "#3475ff"],
      3,
    ),
    preset(
      "coastal",
      "Coastal drift",
      "Cool blues. Easy evenings.",
      ["#42f5cf", "#3077ff"],
      17,
    ),
    preset(
      "rainbow",
      "Color parade",
      "Every color gets a moment.",
      ["#fb75cc", "#46ef77"],
      1,
    ),
    preset(
      "christmas",
      "Merry & bright",
      "Make the season sparkle.",
      ["#ff334f", "#32df88"],
      3,
      "Holidays",
    ),
    preset(
      "patriot",
      "Stars & stripes",
      "Red, white, and a beautiful night.",
      ["#ff334f", "#286bff"],
      25,
      "Holidays",
    ),
    preset(
      "valentine",
      "Love in lights",
      "Rose-colored everything.",
      ["#ff5ca7", "#a360ff"],
      17,
      "Holidays",
    ),
    preset("warm", "Porch light", "A softer kind of glow.", [
      "#ffd99c",
      "#ffb45b",
    ]),
  ];
  presets[0].rows = Object.fromEntries(
    zones.map((id, i) => [
      id,
      {
        on: true,
        color: ["#46ef77", "#a24aec", "#a24aec", "#a24aec", "#ff751e"][i],
        effect: 3,
        brightness: 45,
        speed: 7,
      },
    ]),
  );
  presets.find((p) => p.id === "patriot").rows.canopy.color = "#ffffff";
  // A scene can store its preferred animation while the playback mode
  // prioritizes its EXACT chosen RGB colors. This never changes the saved scene.
  // "Color parade" intentionally uses its rainbow generator instead.
  function forPlayback(scene, trueColors = true) {
    if (!trueColors || scene?.id === "rainbow") return scene;
    if (!scene || !scene.rows) throw Error("Choose a scene to play.");
    return {
      ...scene,
      rows: Object.fromEntries(
        zones.map((id) => {
          const row = scene.rows[id];
          if (!row) throw Error("This scene is missing a cart light.");
          return [id, { ...row, effect: 25 }];
        }),
      ),
    };
  }
  const api = {
    zones,
    positions,
    effects,
    color,
    mix,
    rows,
    validateRows,
    accessories,
    commands,
    forPlayback,
    presets,
  };
  root.SmartEaseEngine = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
