import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_CENTER = [113.264385, 23.129112];
const AMAP_SCRIPT_ID = "amap-jsapi-v2";
const AMAP_PLUGINS = [
  "AMap.Geolocation",
  "AMap.Geocoder",
  "AMap.PlaceSearch",
  "AMap.ToolBar",
  "AMap.Scale",
].join(",");
const CONFIG_CACHE_KEY = "fubuki-arcade-map-amap-config-v1";
const COORD_CACHE_KEY = "fubuki-arcade-map-coordinate-cache-v1";
const CITY_CODE = "440100";
const DISTRICTS = ["海珠", "天河", "白云", "番禺", "花都", "增城", "黄埔", "越秀", "荔湾", "从化"];
const DISTRICT_COLORS = {
  海珠: "#6cc8ff",
  天河: "#a7a2ff",
  白云: "#f4a7bc",
  番禺: "#f4d06f",
  花都: "#ff9f9f",
  增城: "#d4a4ff",
  黄埔: "#ffc17e",
  越秀: "#fddf9c",
  荔湾: "#83dec2",
  从化: "#a6df7e",
};

let amapLoaderPromise = null;
let amapLoaderSignature = "";

function safeReadJson(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readLocalConfig() {
  const value = safeReadJson(CONFIG_CACHE_KEY);
  if (!value || typeof value !== "object") return { key: "", securityJsCode: "" };
  return {
    key: typeof value.key === "string" ? value.key : "",
    securityJsCode: typeof value.securityJsCode === "string" ? value.securityJsCode : "",
  };
}

function readCoordinateCache() {
  const value = safeReadJson(COORD_CACHE_KEY);
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function writeCoordinateCache(cache) {
  try {
    window.localStorage.setItem(COORD_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* Search and the map still work when storage is unavailable. */
  }
}

function hasCoordinate(item) {
  const lng = item?.lng;
  const lat = item?.lat;
  if (lng == null || lat == null || lng === "" || lat === "") return false;
  return Number.isFinite(Number(lng)) && Number.isFinite(Number(lat));
}

function asCoordinates(point) {
  if (!point) return null;
  const lng = typeof point.getLng === "function" ? point.getLng() : point.lng;
  const lat = typeof point.getLat === "function" ? point.getLat() : point.lat;
  if (lng == null || lat == null || lng === "" || lat === "") return null;
  if (!Number.isFinite(Number(lng)) || !Number.isFinite(Number(lat))) return null;
  return [Number(lng), Number(lat)];
}

function mergeCoordinateCache(arcades, cache) {
  return arcades.map((arcade) => {
    const saved = cache[arcade.id];
    if (!saved || !hasCoordinate(saved)) return arcade;
    return {
      ...arcade,
      lng: Number(saved.lng),
      lat: Number(saved.lat),
      geocodeLabel: saved.label || "",
      geocodeSource: saved.source || "",
    };
  });
}

function distanceMeters(lng1, lat1, lng2, lat2) {
  const earthRadius = 6371000;
  const toRadians = (value) => (value * Math.PI) / 180;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(a));
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return "";
  if (meters < 1000) return `${Math.max(1, Math.round(meters))} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

function formatPrice(value) {
  if (value == null || value === "") return "价格待补";
  const number = Number(value);
  return Number.isFinite(number) ? `¥${number.toFixed(2)}` : "价格待补";
}

function inAppBrowserName() {
  const ua = window.navigator.userAgent.toLowerCase();
  if (ua.includes("micromessenger")) return "微信";
  if (ua.includes("mqqbrowser") || ua.includes(" qq/")) return "QQ";
  return "";
}

function friendlyLocationError(code, message) {
  const app = inAppBrowserName();
  if (code === 1 || /permission|denied/i.test(String(message || ""))) {
    if (app) return app + " 内置浏览器拒绝了定位权限。请点右上角菜单选择在浏览器打开，再允许位置信息。";
    return "浏览器拒绝了定位权限。请点地址栏旁的锁形或站点设置图标，把位置权限改为允许，然后刷新页面；也可以直接使用手动选点。";
  }
  if (code === 2) return "手机没有提供位置。请确认系统定位服务已开启，并允许浏览器使用位置信息。";
  if (code === 3) return "定位超时。请到信号更好的位置重试，或使用手动选点。";
  return message || "定位失败。请允许浏览器使用位置信息，或使用手动选点。";
}

function stripEllipsis(value) {
  return String(value || "").replace(/…/g, "").trim();
}

function mapSearchUrl(arcade) {
  const query = `广州 ${arcade.name || ""} ${stripEllipsis(arcade.address)}`.trim();
  return `https://www.amap.com/search?query=${encodeURIComponent(query)}&city=${CITY_CODE}`;
}

function mapMarkerUrl(arcade) {
  if (!hasCoordinate(arcade)) return mapSearchUrl(arcade);
  return `https://uri.amap.com/marker?position=${arcade.lng},${arcade.lat}&name=${encodeURIComponent(
    arcade.name,
  )}&src=fubuki007.github.io&coordinate=gaode&callnative=1`;
}

function loadAmap(config) {
  const key = config.key?.trim();
  if (!key) return Promise.reject(new Error("请先填写高德地图 JS API Key。"));

  if (window.AMap) return Promise.resolve(window.AMap);

  const signature = `${key}:${config.securityJsCode || ""}`;
  if (amapLoaderPromise && amapLoaderSignature === signature) return amapLoaderPromise;

  amapLoaderSignature = signature;
  amapLoaderPromise = new Promise((resolve, reject) => {
    if (config.securityJsCode?.trim()) {
      window._AMapSecurityConfig = { securityJsCode: config.securityJsCode.trim() };
    }

    const previous = document.getElementById(AMAP_SCRIPT_ID);
    if (previous) previous.remove();

    const script = document.createElement("script");
    script.id = AMAP_SCRIPT_ID;
    script.async = true;
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(
      key,
    )}&plugin=${encodeURIComponent(AMAP_PLUGINS)}`;

    const timer = window.setTimeout(() => {
      cleanup();
      amapLoaderPromise = null;
      reject(new Error("高德地图脚本加载超时，请检查网络、Key 和域名白名单。"));
    }, 18000);

    function cleanup() {
      window.clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
    }

    script.onload = () => {
      cleanup();
      if (window.AMap) {
        resolve(window.AMap);
      } else {
        amapLoaderPromise = null;
        reject(new Error("高德脚本已加载，但没有找到 AMap 对象。请检查 Key 是否有效。"));
      }
    };

    script.onerror = () => {
      cleanup();
      amapLoaderPromise = null;
      reject(new Error("高德地图脚本加载失败。请检查网络和 Key 的域名白名单。"));
    };

    document.head.appendChild(script);
  });

  return amapLoaderPromise;
}

function Icon({ name, size = 18, className = "" }) {
  const paths = {
    back: <><path d="M19 12H5m6-6-6 6 6 6" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    target: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15m6-12v15" /></>,
    fit: <><path d="M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5" /></>,
    settings: <><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.94 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.57 15 1.7 1.7 0 0 0 3 14H3v-4h.08A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.88L4.2 7l2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.57 1.7 1.7 0 0 0 10 3V3h4v.08A1.7 1.7 0 0 0 15.06 4.6a1.7 1.7 0 0 0 1.88-.34L17 4.2 19.83 7l-.06.06A1.7 1.7 0 0 0 19.43 9 1.7 1.7 0 0 0 21 10h.08v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4" /></>,
    refresh: <><path d="M20 10a8 8 0 0 0-14-5L3 8m0-5v5h5M4 14a8 8 0 0 0 14 5l3-3m0 5v-5h-5" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    external: <><path d="M14 4h6v6m0-6-9 9" /><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" /></>,
    spark: <><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3Z" /><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z" /></>,
  };
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function districtColor(district) {
  return DISTRICT_COLORS[district] || "#9da8ff";
}
function SettingsDialog({
  open,
  onClose,
  config,
  mappedCount,
  totalCount,
  geocodeProgress,
  geocodeError,
  onStartGeocode,
  onCancelGeocode,
  onExport,
  onClearCoordinates,
}) {
  const dialogRef = useRef(null);
  const [draft, setDraft] = useState({ key: "", securityJsCode: "" });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (open) {
      setDraft({ key: config.key || "", securityJsCode: config.securityJsCode || "" });
    }
  }, [open, config.key, config.securityJsCode]);

  function save(event) {
    event.preventDefault();
    const next = {
      key: draft.key.trim(),
      securityJsCode: draft.securityJsCode.trim(),
    };
    try {
      if (next.key) {
        window.localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(next));
      } else {
        window.localStorage.removeItem(CONFIG_CACHE_KEY);
      }
    } catch {
      /* The page can still explain the configuration when storage is blocked. */
    }
    window.location.reload();
  }

  function clearLocalKey() {
    try {
      window.localStorage.removeItem(CONFIG_CACHE_KEY);
    } catch {
      /* No-op. */
    }
    window.location.reload();
  }

  const remaining = Math.max(0, totalCount - mappedCount);
  const progressPercent =
    geocodeProgress.total > 0
      ? Math.min(100, Math.round((geocodeProgress.done / geocodeProgress.total) * 100))
      : 0;

  return (
    <dialog
      ref={dialogRef}
      className="arcade-dialog"
      aria-labelledby="arcade-settings-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !geocodeProgress.running) onClose();
      }}
    >
      <div className="arcade-dialog-head">
        <div>
          <p className="arcade-eyebrow">MAP CONFIGURATION</p>
          <h2 id="arcade-settings-title">地图设置</h2>
        </div>
        <button className="arcade-icon-button" type="button" onClick={onClose} aria-label="关闭设置">
          <Icon name="close" size={18} />
        </button>
      </div>
      <form className="amap-settings" onSubmit={save}>
        <div className="config-source-row">
          <span>当前配置来源</span>
          <strong>{config.source}</strong>
        </div>

        <label className="arcade-field">
          <span>高德地图 JS API Key</span>
          <input
            type="text"
            name="amap-key"
            value={draft.key}
            onChange={(event) => setDraft({ ...draft, key: event.target.value })}
            placeholder="例如：0123456789abcdef..."
            autoComplete="off"
            spellCheck="false"
          />
        </label>

        <label className="arcade-field">
          <span>安全密钥 securityJsCode <em>（如控制台要求）</em></span>
          <input
            type="password"
            name="amap-security-code"
            value={draft.securityJsCode}
            onChange={(event) => setDraft({ ...draft, securityJsCode: event.target.value })}
            placeholder="高德 JS API 2.0 安全密钥"
            autoComplete="off"
            spellCheck="false"
          />
        </label>
        <p className="arcade-help">
          前端 Key 会出现在浏览器里，这是 JS API 的正常用法。请只使用限制域名为
          <code> fubuki007.github.io </code>
          的 Key，不要填写服务端 Web 服务 Key。
          <a href="https://console.amap.com/dev/key/app" target="_blank" rel="noreferrer">
            打开高德控制台 <Icon name="external" size={12} />
          </a>
        </p>
        <div className="arcade-dialog-actions">
          <button className="arcade-button ghost" type="button" onClick={clearLocalKey}>
            清除本机 Key
          </button>
          <button className="arcade-button primary" type="submit">
            保存并重新载入
          </button>
        </div>
      </form>

      <div className="dialog-rule" />

      <section className="coordinate-section">
        <div className="coordinate-section-head">
          <div>
            <p className="arcade-eyebrow">COORDINATE PIPELINE</p>
            <h3>补全店铺坐标</h3>
          </div>
          <strong className="coordinate-number">{mappedCount} / {totalCount}</strong>
        </div>
        <p className="arcade-help">
          从截图整理出的地址有部分被截断。配置好 Key 后，可以让高德依次尝试地址和店名解析，
          结果保存在当前浏览器。确认无误后导出 JSON 并替换站点数据，所有访客就能直接使用地图。
        </p>
        {geocodeProgress.running && (
          <div className="geocode-progress" aria-live="polite">
            <div className="geocode-progress-top">
              <span>正在解析：{geocodeProgress.current || "准备中"}</span>
              <span>{geocodeProgress.done} / {geocodeProgress.total}</span>
            </div>
            <div className="progress-track">
              <span style={{ width: progressPercent + "%" }} />
            </div>
            <p>成功 {geocodeProgress.success} 家，失败 {geocodeProgress.failed} 家。</p>
          </div>
        )}

        {geocodeError && <p className="arcade-error" role="alert">{geocodeError}</p>}
        <div className="coordinate-actions">
          {geocodeProgress.running ? (
            <button className="arcade-button ghost" type="button" onClick={onCancelGeocode}>
              停止解析
            </button>
          ) : (
            <button
              className="arcade-button primary"
              type="button"
              onClick={onStartGeocode}
              disabled={!remaining || !config.key}
            >
              <Icon name="spark" size={15} />
              {remaining ? `解析剩余 ${remaining} 家` : "坐标已补全"}
            </button>
          )}
          <button
            className="arcade-button ghost"
            type="button"
            onClick={onExport}
            disabled={!mappedCount}
          >
            <Icon name="download" size={15} />
            导出 arcades.json
          </button>
          <button
            className="arcade-button ghost danger"
            type="button"
            onClick={onClearCoordinates}
            disabled={!mappedCount || geocodeProgress.running}
          >
            清除本机坐标
          </button>
        </div>

        <p className="arcade-help subtle">
          站点配置文件：<code>app/public/data/amap-config.json</code>。填入同一个 Key 后重新构建，
          所有访客无需手动配置即可看到地图。
        </p>
      </section>
    </dialog>
  );
}
export default function ArcadeMap() {
  const [dataset, setDataset] = useState(null);
  const [runtimeConfig, setRuntimeConfig] = useState({ key: "", securityJsCode: "" });
  const [bootReady, setBootReady] = useState(false);
  const [bootError, setBootError] = useState("");
  const [mapRetry, setMapRetry] = useState(0);
  const [engine, setEngine] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState("");
  const [query, setQuery] = useState("");
  const [districtFilter, setDistrictFilter] = useState("全部");
  const [sort, setSort] = useState("price");
  const [radiusKm, setRadiusKm] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationHelp, setLocationHelp] = useState(false);
  const [manualPick, setManualPick] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [geocodeError, setGeocodeError] = useState("");
  const [geocodeProgress, setGeocodeProgress] = useState({
    running: false,
    total: 0,
    done: 0,
    success: 0,
    failed: 0,
    current: "",
  });

  const mapContainerRef = useRef(null);
  const markersRef = useRef(new Map());
  const manualPickRef = useRef(false);
  const geocodeCancelRef = useRef(false);
  const userOverlayRef = useRef({ marker: null, circle: null });

  const activeConfig = useMemo(() => {
    const local = readLocalConfig();
    const envKey = import.meta.env.VITE_AMAP_KEY || "";
    const envSecurity = import.meta.env.VITE_AMAP_SECURITY_CODE || "";
    if (local.key) {
      return { ...local, source: "本机设置" };
    }
    if (envKey) {
      return { key: envKey, securityJsCode: envSecurity, source: "构建环境变量" };
    }
    if (runtimeConfig.key) {
      return {
        key: runtimeConfig.key,
        securityJsCode: runtimeConfig.securityJsCode || "",
        source: "站点配置文件",
      };
    }
    return { key: "", securityJsCode: "", source: "未配置" };
  }, [runtimeConfig]);

  useEffect(() => {
    let active = true;

    async function boot() {
      try {
        const dataResponse = await fetch("/data/arcades.json", { cache: "no-store" });
        if (!dataResponse.ok) throw new Error(`数据文件读取失败（HTTP ${dataResponse.status}）。`);
        const data = await dataResponse.json();
        if (!data || !Array.isArray(data.arcades)) throw new Error("arcades.json 格式不正确。");

        let config = { key: "", securityJsCode: "" };
        try {
          const configResponse = await fetch("/data/amap-config.json", { cache: "no-store" });
          if (configResponse.ok) {
            const value = await configResponse.json();
            config = {
              key: typeof value.key === "string" ? value.key : "",
              securityJsCode: typeof value.securityJsCode === "string" ? value.securityJsCode : "",
            };
          }
        } catch {
          /* The optional config file can be absent during local development. */
        }

        const withCoordinates = mergeCoordinateCache(data.arcades, readCoordinateCache());
        if (active) {
          setDataset({ ...data, arcades: withCoordinates });
          setRuntimeConfig(config);
          setBootReady(true);
        }
      } catch (error) {
        if (active) {
          setBootError(error.message || "无法读取机厅数据。");
          setBootReady(true);
        }
      }
    }

    boot();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!bootReady || !activeConfig.key) return undefined;

    let cancelled = false;
    let localMap = null;
    setMapLoading(true);
    setMapError("");

    loadAmap(activeConfig)
      .then((AMap) => {
        if (cancelled || !mapContainerRef.current) return;
        localMap = new AMap.Map(mapContainerRef.current, {
          center: DEFAULT_CENTER,
          zoom: 11,
          viewMode: "2D",
          mapStyle: "amap://styles/darkblue",
          resizeEnable: true,
        });
        localMap.addControl(new AMap.Scale({ position: "LB" }));
        localMap.addControl(new AMap.ToolBar({ position: { right: "16px", bottom: "84px" } }));
        setEngine({ AMap, map: localMap });
        setMapLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setMapLoading(false);
        setMapError(error.message || "高德地图加载失败。");
      });

    return () => {
      cancelled = true;
      if (localMap) localMap.destroy();
      setEngine(null);
      setMapLoading(false);
    };
  }, [bootReady, activeConfig.key, activeConfig.securityJsCode, mapRetry]);
  useEffect(() => {
    manualPickRef.current = manualPick;
  }, [manualPick]);

  const mappedCount = useMemo(
    () => (dataset?.arcades || []).filter(hasCoordinate).length,
    [dataset],
  );

  const lowestPrice = useMemo(() => {
    const prices = (dataset?.arcades || [])
      .map((item) => Number(item.price))
      .filter((value) => Number.isFinite(value) && value > 0);
    return prices.length ? Math.min(...prices) : null;
  }, [dataset]);

  const districtOptions = useMemo(() => {
    const available = new Set((dataset?.arcades || []).map((item) => item.district));
    return [
      ...DISTRICTS.filter((district) => available.has(district)),
      ...[...available].filter((district) => !DISTRICTS.includes(district)).sort(),
    ];
  }, [dataset]);

  const filteredArcades = useMemo(() => {
    if (!dataset) return [];
    const needle = query.trim().toLowerCase();
    let items = dataset.arcades.map((arcade) => {
      const valid = hasCoordinate(arcade);
      const distance =
        valid && userLocation
          ? distanceMeters(userLocation.lng, userLocation.lat, Number(arcade.lng), Number(arcade.lat))
          : null;
      return { ...arcade, _hasCoordinate: valid, _distance: distance };
    });

    if (needle) {
      items = items.filter((arcade) =>
        [arcade.name, arcade.district, arcade.address, arcade.note]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle),
      );
    }

    if (districtFilter !== "全部") {
      items = items.filter((arcade) => arcade.district === districtFilter);
    }

    if (userLocation && radiusKm != null) {
      items = items.filter(
        (arcade) =>
          arcade._hasCoordinate && Number.isFinite(arcade._distance) && arcade._distance <= radiusKm * 1000,
      );
    }

    const sortMode = sort === "distance" && !userLocation ? "price" : sort;
    items.sort((first, second) => {
      if (sortMode === "distance") {
        const firstDistance = Number.isFinite(first._distance) ? first._distance : Infinity;
        const secondDistance = Number.isFinite(second._distance) ? second._distance : Infinity;
        return firstDistance - secondDistance || first.id - second.id;
      }
      if (sortMode === "name") return String(first.name).localeCompare(String(second.name), "zh-CN");
      const firstPrice = Number.isFinite(Number(first.price)) && Number(first.price) > 0 ? Number(first.price) : Infinity;
      const secondPrice = Number.isFinite(Number(second.price)) && Number(second.price) > 0 ? Number(second.price) : Infinity;
      return firstPrice - secondPrice || first.id - second.id;
    });

    return items;
  }, [dataset, query, districtFilter, userLocation, radiusKm, sort]);

  const selectedArcade = useMemo(
    () => (dataset?.arcades || []).find((item) => item.id === selectedId) || null,
    [dataset, selectedId],
  );

  const positionedVisible = useMemo(
    () => filteredArcades.filter((arcade) => arcade._hasCoordinate),
    [filteredArcades],
  );

  const missingCoordinates = Math.max(0, (dataset?.arcades.length || 0) - mappedCount);
  const radiusActive = Boolean(userLocation && radiusKm != null);
  useEffect(() => {
    if (!engine) return undefined;
    const { AMap, map } = engine;
    const nextMarkers = new Map();

    for (const arcade of positionedVisible) {
      const element = document.createElement("button");
      element.type = "button";
      element.className = `arcade-marker${arcade.id === selectedId ? " is-selected" : ""}`;
      element.style.setProperty("--marker-color", districtColor(arcade.district));
      element.title = `${arcade.name} · ${formatPrice(arcade.price)}`;
      element.setAttribute("aria-label", `${arcade.name}，${formatPrice(arcade.price)}`);
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        setSelectedId(arcade.id);
        map.setZoomAndCenter(Math.max(14, map.getZoom()), [Number(arcade.lng), Number(arcade.lat)]);
      });

      const dot = document.createElement("span");
      dot.className = "arcade-marker-dot";
      const label = document.createElement("span");
      label.className = "arcade-marker-price";
      label.textContent = arcade.price == null || arcade.price === "" || !Number.isFinite(Number(arcade.price)) ? "?" : `¥${Number(arcade.price).toFixed(2)}`;
      element.append(dot, label);

      const marker = new AMap.Marker({
        position: [Number(arcade.lng), Number(arcade.lat)],
        content: element,
        anchor: "bottom-center",
        offset: new AMap.Pixel(0, -2),
        zIndex: arcade.id === selectedId ? 210 : 100,
      });
      nextMarkers.set(arcade.id, marker);
      map.add(marker);
    }

    markersRef.current = nextMarkers;

    return () => {
      const previous = [...markersRef.current.values()];
      if (previous.length) map.remove(previous);
      markersRef.current = new Map();
    };
  }, [engine, positionedVisible, selectedId]);
  useEffect(() => {
    if (!engine || !selectedArcade || !hasCoordinate(selectedArcade)) return undefined;
    const { AMap, map } = engine;
    const content = document.createElement("div");
    content.className = "arcade-info-card";

    const kicker = document.createElement("p");
    kicker.className = "arcade-info-kicker";
    kicker.textContent = `${selectedArcade.district} / ${formatPrice(selectedArcade.price)}`;
    const title = document.createElement("h3");
    title.textContent = selectedArcade.name;
    const detail = document.createElement("p");
    detail.className = "arcade-info-detail";
    detail.textContent = `${selectedArcade.coins == null ? "币数待补" : `${selectedArcade.coins} 币`} · 合计 ${
      selectedArcade.total == null ? "—" : formatPrice(selectedArcade.total)
    }`;
    const address = document.createElement("p");
    address.className = "arcade-info-address";
    address.textContent = selectedArcade.address || "地址待补全";
    const footer = document.createElement("div");
    footer.className = "arcade-info-footer";
    const link = document.createElement("a");
    link.href = mapMarkerUrl(selectedArcade);
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "在高德打开 →";
    const quality = document.createElement("span");
    quality.textContent = selectedArcade.locationTruncated ? "地址在原表中有截断" : "地址来自原表";
    footer.append(link, quality);
    content.append(kicker, title, detail, address, footer);

    const infoWindow = new AMap.InfoWindow({
      content,
      offset: new AMap.Pixel(0, -34),
      autoMove: true,
      closeWhenClickMap: true,
    });
    infoWindow.open(map, [Number(selectedArcade.lng), Number(selectedArcade.lat)]);

    return () => {
      infoWindow.close();
    };
  }, [engine, selectedArcade]);
  useEffect(() => {
    if (!engine) return undefined;
    const { AMap, map } = engine;
    const previous = userOverlayRef.current;
    if (previous.marker) map.remove(previous.marker);
    if (previous.circle) map.remove(previous.circle);
    userOverlayRef.current = { marker: null, circle: null };

    if (!userLocation) return undefined;

    const marker = new AMap.CircleMarker({
      center: [userLocation.lng, userLocation.lat],
      radius: 7,
      strokeColor: "#f8fbff",
      strokeWeight: 3,
      fillColor: "#7be0be",
      fillOpacity: 1,
      zIndex: 250,
    });
    map.add(marker);

    let circle = null;
    if (radiusKm != null) {
      circle = new AMap.Circle({
        center: [userLocation.lng, userLocation.lat],
        radius: radiusKm * 1000,
        strokeColor: "#9da8ff",
        strokeWeight: 1.2,
        strokeOpacity: 0.9,
        fillColor: "#9da8ff",
        fillOpacity: 0.08,
        zIndex: 20,
      });
      map.add(circle);
    }

    userOverlayRef.current = { marker, circle };
    return () => {
      if (marker) map.remove(marker);
      if (circle) map.remove(circle);
      userOverlayRef.current = { marker: null, circle: null };
    };
  }, [engine, userLocation, radiusKm]);

  useEffect(() => {
    if (!engine) return undefined;
    const { map } = engine;
    const handleMapClick = (event) => {
      if (!manualPickRef.current) return;
      const point = asCoordinates(event.lnglat);
      if (!point) return;
      setManualPick(false);
      manualPickRef.current = false;
      setUserLocation({ lng: point[0], lat: point[1], label: "地图手动选点" });
      setRadiusKm(2);
      setSort("distance");
      setLocationError("");
      map.setZoomAndCenter(14, point);
    };
    map.on("click", handleMapClick);
    return () => map.off("click", handleMapClick);
  }, [engine]);

  const locatingTimeout = 16000;
  async function locateMe() {
    if (!engine) {
      setLocationError("高德地图还没有加载。请先在地图设置里填写 Key。");
      return;
    }
    if (locating) return;
    setLocating(true);
    setLocationError("");
    setManualPick(false);
    setLocationHelp(false);

    try {
      const permission = await window.navigator.permissions?.query?.({ name: "geolocation" });
      if (permission?.state === "denied") {
        setLocating(false);
        setLocationError(friendlyLocationError(1));
        setLocationHelp(true);
        return;
      }
    } catch {
      /* Some mobile WebViews do not expose the Permissions API. */
    }

    const AMap = engine.AMap;
    const map = engine.map;
    const geolocation = new AMap.Geolocation({
      enableHighAccuracy: true,
      timeout: 12000,
      showButton: false,
      panToLocation: false,
      zoomToAccuracy: false,
    });

    const result = await new Promise((resolve) => {
      let settled = false;
      const timer = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve({ ok: false, message: "定位超时。请检查浏览器定位权限，或使用手动选点。" });
      }, locatingTimeout);

      geolocation.getCurrentPosition((status, positionResult) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        const point = asCoordinates(positionResult?.position);
        if (status === "complete" && point) {
          resolve({
            ok: true,
            point,
            label: positionResult.formattedAddress || (positionResult.location_type === "html5" ? "浏览器定位" : positionResult.location_type || "当前位置"),
          });
        } else {
          resolve({
            ok: false,
            message: positionResult?.message || "没有取得当前位置。请允许浏览器定位，或使用手动选点。",
          });
        }
      });
    });

    setLocating(false);
    if (!result.ok) {
      setLocationError(friendlyLocationError(0, result.message));
      setLocationHelp(true);
      return;
    }

    setUserLocation({ lng: result.point[0], lat: result.point[1], label: result.label });
    setRadiusKm(2);
    setSort("distance");
    map.setZoomAndCenter(14, result.point);
  }
  function toggleManualPick() {
    if (!engine) {
      setLocationError("地图加载后才能手动选点。请先配置高德 Key。");
      return;
    }
    setLocationError("");
    setManualPick((current) => !current);
  }

  function fitResults() {
    if (!engine) return;
    const overlays = [...markersRef.current.values()];
    if (!overlays.length) return;
    engine.map.setFitView(overlays, false, [64, 64, 64, 64], 15);
  }

  function chooseArcade(arcade) {
    setSelectedId(arcade.id);
    if (engine && hasCoordinate(arcade)) {
      engine.map.setZoomAndCenter(Math.max(14, engine.map.getZoom()), [
        Number(arcade.lng),
        Number(arcade.lat),
      ]);
    }
  }

  async function geocodeOne(geocoder, placeSearch, query) {
    function searchWithPlace() {
      return new Promise((resolve) => {
        let settled = false;
        const timer = window.setTimeout(() => {
          if (!settled) {
            settled = true;
            resolve(null);
          }
        }, 8000);
        placeSearch.search(query, (status, result) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          const point = asCoordinates(result?.poiList?.pois?.[0]?.location);
          resolve(point ? { point, label: result.poiList.pois[0].name, source: "PlaceSearch" } : null);
        });
      });
    }

    function geocodeWithAddress() {
      return new Promise((resolve) => {
        let settled = false;
        const timer = window.setTimeout(() => {
          if (!settled) {
            settled = true;
            resolve(null);
          }
        }, 8000);
        geocoder.getLocation(query, (status, result) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          const geocode = result?.geocodes?.[0];
          const point = asCoordinates(geocode?.location);
          resolve(point ? { point, label: geocode.formattedAddress || query, source: "Geocoder" } : null);
        });
      });
    }

    return (await searchWithPlace()) || (await geocodeWithAddress());
  }
  async function startGeocoding() {
    if (!engine) {
      setGeocodeError("地图尚未加载。请先填写有效的高德 Key 并保存。");
      return;
    }
    if (!dataset) return;

    const remaining = dataset.arcades.filter((arcade) => !hasCoordinate(arcade));
    if (!remaining.length) return;

    geocodeCancelRef.current = false;
    setGeocodeError("");
    setGeocodeProgress({
      running: true,
      total: remaining.length,
      done: 0,
      success: 0,
      failed: 0,
      current: "初始化高德地理编码...",
    });

    const AMap = engine.AMap;
    const placeSearch = new AMap.PlaceSearch({
      city: "广州",
      citylimit: true,
      pageSize: 1,
      extensions: "base",
    });
    const geocoder = new AMap.Geocoder({ city: "广州", citylimit: true });
    const cache = readCoordinateCache();
    let done = 0;
    let success = 0;
    let failed = 0;
    let consecutiveFailures = 0;

    for (const arcade of remaining) {
      if (geocodeCancelRef.current) break;
      setGeocodeProgress((previous) => ({ ...previous, current: arcade.name }));

      let resolved = null;
      for (const geoQuery of arcade.geocodeQueries || []) {
        const cleanQuery = stripEllipsis(geoQuery);
        if (!cleanQuery) continue;
        resolved = await geocodeOne(geocoder, placeSearch, cleanQuery);
        if (resolved) break;
      }
      if (resolved) {
        cache[arcade.id] = {
          lng: resolved.point[0],
          lat: resolved.point[1],
          label: resolved.label,
          source: resolved.source,
          resolvedAt: new Date().toISOString(),
        };
        setDataset((previous) => {
          if (!previous) return previous;
          return {
            ...previous,
            arcades: previous.arcades.map((item) =>
              item.id === arcade.id
                ? {
                    ...item,
                    lng: resolved.point[0],
                    lat: resolved.point[1],
                    geocodeLabel: resolved.label,
                    geocodeSource: resolved.source,
                  }
                : item,
            ),
          };
        });
        success += 1;
        consecutiveFailures = 0;
      } else {
        failed += 1;
        consecutiveFailures += 1;
      }

      done += 1;
      writeCoordinateCache(cache);
      setGeocodeProgress({
        running: true,
        total: remaining.length,
        done,
        success,
        failed,
        current: arcade.name,
      });

      if (consecutiveFailures >= 8) {
        setGeocodeError(
          "连续 8 家没有返回坐标，已暂停。请检查 Key 的 JS API/地理编码权限、安全密钥和域名白名单，再重新尝试。",
        );
        break;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 180));
    }

    writeCoordinateCache(cache);
    setGeocodeProgress((previous) => ({
      ...previous,
      running: false,
      current: geocodeCancelRef.current ? "已停止" : "解析结束",
    }));
  }
  function cancelGeocoding() {
    geocodeCancelRef.current = true;
  }

  function clearCoordinates() {
    try {
      window.localStorage.removeItem(COORD_CACHE_KEY);
    } catch {
      /* No-op. */
    }
    setDataset((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        arcades: previous.arcades.map((arcade) => ({
          ...arcade,
          lng: null,
          lat: null,
          geocodeLabel: "",
          geocodeSource: "",
        })),
      };
    });
    setGeocodeProgress({ running: false, total: 0, done: 0, success: 0, failed: 0, current: "" });
    setSelectedId(null);
  }

  function exportCoordinates() {
    if (!dataset) return;
    const payload = {
      ...dataset,
      updatedAt: new Date().toISOString().slice(0, 10),
      arcades: dataset.arcades.map((arcade) => ({
        ...arcade,
        lng: hasCoordinate(arcade) ? Number(arcade.lng) : null,
        lat: hasCoordinate(arcade) ? Number(arcade.lat) : null,
      })),
    };
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "arcades.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function resetFilters() {
    setQuery("");
    setDistrictFilter("全部");
    setRadiusKm(userLocation ? 2 : null);
  }

  const visiblePriceCount = filteredArcades.filter(
    (arcade) => Number.isFinite(Number(arcade.price)) && Number(arcade.price) > 0,
  ).length;

  return (
    <div className="arcade-page">      <header className="arcade-header">
        <div className="arcade-shell arcade-header-inner">
          <a className="arcade-back" href="/">
            <Icon name="back" size={15} />
            <span>Fubuki.</span>
          </a>
          <nav className="arcade-nav" aria-label="页面导航">
            <a href="/">个人主页</a>
            <a href="/tools/">小工具</a>
            <a href="/tools/arcade-map/" aria-current="page">机厅地图</a>
          </nav>
          <button className="arcade-header-action" type="button" onClick={() => setSettingsOpen(true)}>
            <Icon name="settings" size={15} />
            <span>地图设置</span>
          </button>
        </div>
      </header>

      <main className="arcade-shell arcade-main">
        <section className="arcade-hero">
          <div className="arcade-hero-copy">
            <div className="arcade-eyebrow-row">
              <span className="arcade-eyebrow">GUANGZHOU / ARCADE RADAR</span>
              <span className="arcade-status-line"><i /> 62 家记录</span>
            </div>
            <h1>
              找一家
              <br />
              <span>最近的机厅。</span>
            </h1>
            <p className="arcade-lead">
              把截图里的价格表做成可定位、可搜索、可筛范围的城市机厅雷达。允许定位后，
              以当前位置为圆心查看 1 / 2 / 5 公里内的店铺；不允许定位时，也可以按店名、
              商圈和区域直接检索。
            </p>
            <div className="arcade-hero-actions">
              <button className="arcade-button primary large" type="button" onClick={locateMe} disabled={locating || !engine}>
                <Icon name={locating ? "refresh" : "target"} size={17} />
                {locating ? "正在定位..." : "定位并找附近"}
              </button>
              <button className="arcade-button ghost large" type="button" onClick={toggleManualPick} disabled={!engine}>
                <Icon name="pin" size={16} />
                {manualPick ? "取消手动选点" : "在地图上选点"}
              </button>
            </div>
          </div>          <aside className="arcade-hero-panel" aria-label="数据概览">
            <div className="radar-orbit orbit-one" />
            <div className="radar-orbit orbit-two" />
            <div className="radar-sweep" />
            <div className="hero-panel-top">
              <span>DATA SNAPSHOT</span>
              <span className="hero-panel-live"><i /> LIVE INDEX</span>
            </div>
            <div className="arcade-stats">
              <div className="arcade-stat">
                <strong>{dataset?.arcades.length ?? "—"}</strong>
                <span>家机厅记录</span>
              </div>
              <div className="arcade-stat">
                <strong>{districtOptions.length || "—"}</strong>
                <span>个广州区域</span>
              </div>
              <div className="arcade-stat">
                <strong>{lowestPrice == null ? "—" : `¥${lowestPrice.toFixed(2)}`}</strong>
                <span>截图最低单价</span>
              </div>
              <div className="arcade-stat">
                <strong>{mappedCount}<small>/{dataset?.arcades.length || 0}</small></strong>
                <span>已有坐标</span>
              </div>
            </div>
            <p className="hero-panel-note">
              价格来自截图记录，部分地址在原文中已截断。地图定位结果会经过浏览器本机缓存，
              不会上传到服务器。
            </p>
            <a className="hero-panel-link" href="/data/arcades.csv" download>
              下载原始 CSV <Icon name="download" size={13} />
            </a>
          </aside>
        </section>
        {!bootReady && (
          <div className="arcade-loading-state">
            <span className="arcade-spinner" />
            正在读取机厅数据...
          </div>
        )}

        {bootError && (
          <div className="arcade-error-panel">
            <strong>数据没有加载成功。</strong>
            <p>{bootError}</p>
            <button className="arcade-button ghost" type="button" onClick={() => window.location.reload()}>
              <Icon name="refresh" size={15} /> 重新加载
            </button>
          </div>
        )}

        {bootReady && dataset && (
          <>
            <section className="arcade-controls" aria-label="筛选机厅">
              <div className="arcade-control-row">
                <label className="arcade-search">
                  <Icon name="search" size={17} />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜索店名、商场、地址或区域..."
                    aria-label="搜索机厅"
                  />
                  {query && (
                    <button type="button" className="search-clear" onClick={() => setQuery("")} aria-label="清除搜索">
                      <Icon name="close" size={14} />
                    </button>
                  )}
                </label>

                <label className="arcade-select-wrap">
                  <span>区域</span>
                  <select value={districtFilter} onChange={(event) => setDistrictFilter(event.target.value)}>
                    <option value="全部">全部区域</option>
                    {districtOptions.map((district) => (
                      <option value={district} key={district}>{district}</option>
                    ))}
                  </select>
                </label>

                <label className="arcade-select-wrap">
                  <span>排序</span>
                  <select value={userLocation ? sort : sort === "distance" ? "price" : sort} onChange={(event) => setSort(event.target.value)}>
                    {userLocation && <option value="distance">距离最近</option>}
                    <option value="price">单价最低</option>
                    <option value="name">名称排序</option>
                  </select>
                </label>

                <div className="location-actions">
                  <button className="arcade-button primary compact" type="button" onClick={locateMe} disabled={locating || !engine}>
                    <Icon name="target" size={15} />
                    {locating ? "定位中..." : "定位我"}
                  </button>
                  <button className={`arcade-button compact ${manualPick ? "active" : "ghost"}`} type="button" onClick={toggleManualPick} disabled={!engine}>
                    <Icon name="pin" size={15} />
                    手动选点
                  </button>
                </div>
              </div>
              <div className="arcade-control-row lower">
                <div className="radius-group" aria-label="搜索范围">
                  <span className="radius-label">搜索范围</span>
                  {[1, 2, 5].map((value) => (
                    <button
                      type="button"
                      key={value}
                      className={radiusKm === value ? "is-active" : ""}
                      onClick={() => setRadiusKm(value)}
                      disabled={!userLocation}
                      aria-pressed={radiusKm === value}
                    >
                      {value} km
                    </button>
                  ))}
                  <button
                    type="button"
                    className={radiusKm == null ? "is-active" : ""}
                    onClick={() => setRadiusKm(null)}
                    aria-pressed={radiusKm == null}
                  >
                    全部
                  </button>
                </div>

                <div className="location-summary">
                  <span className={`location-dot${userLocation ? " is-active" : ""}`} />
                  {userLocation ? (
                    <>
                      <span className="location-label" title={userLocation.label}>已定位 · {userLocation.label}</span>
                      <span className="location-count">{filteredArcades.length} 家结果</span>
                    </>
                  ) : (
                    <span>尚未定位。定位后可筛选附近 1 / 2 / 5 公里的机厅。</span>
                  )}
                </div>
              </div>

              {locationError && (
                <div className="arcade-inline-error" role="alert">
                  <span>{locationError}</span>
                  <div className="location-error-actions">
                    <button type="button" onClick={toggleManualPick}>改用手动选点</button>
                    <button type="button" onClick={() => setLocationHelp((value) => !value)}>
                      {locationHelp ? "收起开启方法" : "如何开启定位"}
                    </button>
                  </div>
                </div>
              )}
              {locationHelp && (
                <div className="location-help-card">
                  <strong>定位权限开启方法</strong>
                  <ol>
                    <li>如果在微信或 QQ 内打开：点右上角菜单，选择在浏览器打开。</li>
                    <li>iPhone Safari：点地址栏旁的 aA 或网站设置，把位置权限改为允许，并确认系统定位已开启。</li>
                    <li>Android Chrome 或 Edge：点地址栏旁的锁形图标，进入权限，把位置改为允许。</li>
                    <li>修改后刷新页面，再点定位我；仍然失败时直接用地图手动选点。</li>
                  </ol>
                </div>
              )}
              {manualPick && <p className="arcade-inline-hint">请直接点击地图选择你的位置；选中后会自动启用 2 公里范围。</p>}
            </section>
            <section className="arcade-map-layout" aria-label="地图与结果">
              <div className="arcade-map-panel">
                <div className="arcade-map-toolbar">
                  <div className={`map-connection${engine ? " live" : ""}`}>
                    <span className="map-connection-dot" />
                    {engine ? "高德地图已连接" : activeConfig.key ? "正在连接高德地图" : "等待地图 Key"}
                  </div>
                  <div className="map-toolbar-actions">
                    <span>{mappedCount} / {dataset.arcades.length} 家有坐标</span>
                    <button type="button" onClick={fitResults} disabled={!engine || !positionedVisible.length}>
                      <Icon name="fit" size={14} /> 适配结果
                    </button>
                  </div>
                </div>

                <div className="arcade-map-viewport">
                  <div ref={mapContainerRef} className="arcade-amap" aria-label="广州机厅地图" />
                  <div className="map-vignette" aria-hidden="true" />

                  {!activeConfig.key && (
                    <div className="map-empty-state">
                      <span className="map-empty-icon"><Icon name="map" size={31} /></span>
                      <p className="arcade-eyebrow">AMAP JS API / SETUP</p>
                      <h2>给地图装上一把钥匙。</h2>
                      <p>
                        当前没有读取到高德 JS API Key。列表和搜索仍可使用；填写 Key 后，
                        地图、定位和附近范围筛选会启用。
                      </p>
                      <div className="map-empty-actions">
                        <button className="arcade-button primary" type="button" onClick={() => setSettingsOpen(true)}>
                          填写高德 Key
                        </button>
                        <a className="arcade-button ghost" href="https://console.amap.com/dev/key/app" target="_blank" rel="noreferrer">
                          申请 Key <Icon name="external" size={13} />
                        </a>
                      </div>
                    </div>
                  )}

                  {activeConfig.key && mapLoading && (
                    <div className="map-loading-state">
                      <span className="arcade-spinner" />
                      <p>正在加载高德地图...</p>
                    </div>
                  )}
                  {activeConfig.key && mapError && (
                    <div className="map-empty-state error">
                      <span className="map-empty-icon"><Icon name="map" size={29} /></span>
                      <p className="arcade-eyebrow">MAP LOAD ERROR</p>
                      <h2>地图没有成功加载。</h2>
                      <p>{mapError}</p>
                      <div className="map-empty-actions">
                        <button className="arcade-button primary" type="button" onClick={() => setSettingsOpen(true)}>
                          检查地图设置
                        </button>
                        <button className="arcade-button ghost" type="button" onClick={() => setMapRetry((value) => value + 1)}>
                          <Icon name="refresh" size={14} /> 再试一次
                        </button>
                      </div>
                    </div>
                  )}

                  {engine && !mapLoading && !mapError && mappedCount === 0 && (
                    <div className="map-note">
                      <div>
                        <strong>地图已连接，但还没有店铺坐标。</strong>
                        <span>在地图设置里可以按地址批量解析，并导出坐标 JSON。</span>
                      </div>
                      <button type="button" onClick={() => setSettingsOpen(true)}>去补全</button>
                    </div>
                  )}

                  {engine && mappedCount > 0 && mappedCount < dataset.arcades.length && (
                    <div className="map-quality-badge">
                      <span>{missingCoordinates} 家缺少坐标</span>
                      <button type="button" onClick={() => setSettingsOpen(true)}>补全</button>
                    </div>
                  )}

                  {manualPick && (
                    <div className="manual-pick-banner">
                      <Icon name="pin" size={15} /> 点击地图选择位置
                    </div>
                  )}
                </div>
              </div>
              <aside className="arcade-results-panel">
                <div className="arcade-results-head">
                  <div>
                    <p className="arcade-eyebrow">SEARCH RESULTS</p>
                    <h2>
                      {filteredArcades.length}
                      <small> 家机厅</small>
                    </h2>
                  </div>
                  <span className="results-meta">
                    {radiusActive ? `${radiusKm} km 内` : userLocation ? "按距离排序" : "按单价排序"}
                  </span>
                </div>

                {userLocation && radiusActive && missingCoordinates > 0 && (
                  <p className="results-coverage-note">
                    另有 {missingCoordinates} 家因缺少坐标，暂不参与附近筛选。
                  </p>
                )}

                <div className="arcade-results-list">
                  {filteredArcades.length === 0 && (
                    <div className="arcade-empty-results">
                      <span className="empty-glyph"><Icon name="search" size={24} /></span>
                      <h3>这次没有找到机厅。</h3>
                      <p>试试扩大搜索范围、切换到全部区域，或者清空搜索词。</p>
                      <button className="arcade-button ghost" type="button" onClick={resetFilters}>
                        清空筛选
                      </button>
                    </div>
                  )}
                  {filteredArcades.map((arcade) => {
                    const isSelected = selectedId === arcade.id;
                    return (
                      <article className={`arcade-result-card${isSelected ? " is-selected" : ""}`} key={arcade.id}>
                        <button className="arcade-card-main" type="button" onClick={() => chooseArcade(arcade)}>
                          <span className="arcade-card-topline">
                            <span className="arcade-index">{String(arcade.id).padStart(2, "0")}</span>
                            <span className="arcade-card-title">{arcade.name}</span>
                            <strong className={`arcade-card-price${arcade.priceMissing ? " missing" : ""}`}>
                              {formatPrice(arcade.price)}
                            </strong>
                          </span>
                          <span className="arcade-card-meta">
                            <span
                              className="arcade-district"
                              style={{ "--district-color": districtColor(arcade.district) }}
                            >
                              {arcade.district}
                            </span>
                            {Number.isFinite(arcade._distance) && (
                              <span className="arcade-distance">{formatDistance(arcade._distance)}</span>
                            )}
                            <span>{arcade.coins == null ? "币数待补" : `${arcade.coins} 币`}</span>
                            <span>合计 {arcade.total == null ? "—" : formatPrice(arcade.total)}</span>
                            {arcade.priceMissing && <span className="data-warning">价格缺失</span>}
                            {arcade._hasCoordinate ? (
                              <span className="coordinate-state">已定位</span>
                            ) : (
                              <span className="coordinate-state missing">待补坐标</span>
                            )}
                          </span>
                          <span className="arcade-card-address">{arcade.address || "地址待补全"}</span>
                          {arcade.note && <span className="arcade-card-note">备注：{arcade.note}</span>}
                        </button>
                        <div className="arcade-card-actions">
                          <a href={mapMarkerUrl(arcade)} target="_blank" rel="noreferrer">
                            在高德打开 <Icon name="external" size={12} />
                          </a>
                          {arcade.locationTruncated && <span>原表地址截断</span>}
                        </div>
                      </article>
                    );
                  })}
                </div>
                <div className="arcade-results-footer">
                  <span>显示 {filteredArcades.length} 家</span>
                  <span>{visiblePriceCount} 家有价格</span>
                </div>
              </aside>
            </section>

            <section className="arcade-foot-grid">
              <div>
                <p className="arcade-eyebrow">HOW IT WORKS</p>
                <h2>定位只在你的浏览器里发生。</h2>
                <p>
                  浏览器取得的位置只用于计算与店铺坐标之间的直线距离，不会写入站点数据库。
                  1 / 2 / 5 公里范围按照直线距离筛选，实际步行距离请以高德导航为准。
                </p>
              </div>
              <div>
                <p className="arcade-eyebrow">DATA NOTE</p>
                <h2>先核对坐标，再信赖范围。</h2>
                <p>
                  原始地址中有部分文字被截图截断。高德自动解析可以节省时间，但建议在导出 JSON 前
                  逐家确认定位点，尤其是同名门店和商场内店铺。
                </p>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="arcade-footer">
        <div className="arcade-shell arcade-footer-inner">
          <span>Fubuki / ARCADE RADAR</span>
          <div>
            <a href="/tools/">返回小工具</a>
            <a href="/data/arcades.csv" download>CSV 数据</a>
            <span>地图服务：高德地图</span>
          </div>
        </div>
      </footer>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={activeConfig}
        mappedCount={mappedCount}
        totalCount={dataset?.arcades.length || 0}
        geocodeProgress={geocodeProgress}
        geocodeError={geocodeError}
        onStartGeocode={startGeocoding}
        onCancelGeocode={cancelGeocoding}
        onExport={exportCoordinates}
        onClearCoordinates={clearCoordinates}
      />
    </div>
  );
}
