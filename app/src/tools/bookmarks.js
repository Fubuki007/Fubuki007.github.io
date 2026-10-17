export const repository = {
  owner: "Fubuki007",
  name: "Fubuki007.github.io",
  branch: "master",
  path: "app/public/data/tools.json",
};

const repositoryUrl = `https://api.github.com/repos/${repository.owner}/${repository.name}`;
const fileUrl = `${repositoryUrl}/contents/${repository.path}`;

export class BookmarkError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
  }
}

function textField(value, label, max, required = false) {
  if (value != null && typeof value !== "string") {
    throw new BookmarkError(`${label}格式不正确。`);
  }
  const text = (value ?? "").trim();
  if ((required && !text) || text.length > max) {
    throw new BookmarkError(`${label}${required && !text ? "不能为空" : `不能超过 ${max} 个字符`}。`);
  }
  return text;
}

function webUrl(value, required = false) {
  const text = textField(value, "链接", 2048, required);
  if (!text) return "";
  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      throw new Error();
    }
    return url.href;
  } catch {
    throw new BookmarkError("请填写完整的 http:// 或 https:// 链接，链接中不能包含账号密码。");
  }
}

export function validateBookmark(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BookmarkError("收藏格式不正确。");
  }
  return {
    id: textField(value.id, "收藏 ID", 100, true),
    title: textField(value.title, "名称", 80, true),
    url: webUrl(value.url, true),
    sourceUrl: webUrl(value.sourceUrl),
    category: textField(value.category, "分类", 30) || "未分类",
    description: textField(value.description, "说明", 500),
  };
}

export function validateCollection(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.bookmarks) || value.bookmarks.length > 500) {
    throw new BookmarkError("收藏文件格式不正确，应为版本 1，最多包含 500 条收藏。");
  }
  const bookmarks = value.bookmarks.map(validateBookmark);
  if (new Set(bookmarks.map((item) => item.id)).size !== bookmarks.length ||
      new Set(bookmarks.map((item) => item.url)).size !== bookmarks.length) {
    throw new BookmarkError("收藏文件中存在重复 ID 或链接。");
  }
  return { version: 1, bookmarks };
}

function encodeContent(value) {
  const bytes = new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`);
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
}

function decodeContent(content) {
  try {
    const bytes = Uint8Array.from(atob(content.replace(/\s/g, "")), (char) => char.charCodeAt(0));
    return validateCollection(JSON.parse(new TextDecoder().decode(bytes)));
  } catch (error) {
    if (error instanceof BookmarkError) throw error;
    throw new BookmarkError("无法读取仓库中的收藏文件，请检查 JSON 格式。");
  }
}

async function request(url, { token, signal, ...options } = {}) {
  let response;
  try {
    const timeout = AbortSignal.timeout(15000);
    response = await fetch(url, {
      ...options,
      cache: "no-store",
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new BookmarkError("暂时无法连接 GitHub，请检查网络后重试。修改尚未保存。");
  }
  if (!response.ok) {
    const messages = {
      401: "GitHub 令牌无效或已过期，请重新连接。",
      403: "GitHub 拒绝了请求：请检查令牌是否选择了此仓库并开启 Contents 读写权限，或稍后重试。",
      404: "无法读取收藏文件，请检查令牌的仓库访问范围。",
      409: "收藏刚被其他设备修改，请刷新后重试。",
      422: "GitHub 未接受修改，请检查收藏内容和仓库写入权限。",
      429: "请求过于频繁，请稍后重试。",
    };
    throw new BookmarkError(messages[response.status] || "GitHub 暂时不可用，请稍后重试。修改尚未保存。", response.status);
  }
  return response.json();
}

export async function readBookmarks({ token, signal } = {}) {
  const file = await request(`${fileUrl}?ref=${repository.branch}`, { token, signal });
  if (file.encoding !== "base64" || typeof file.content !== "string" || !file.sha) {
    throw new BookmarkError("GitHub 返回了无法识别的收藏文件。");
  }
  return { ...decodeContent(file.content), sha: file.sha };
}

export async function connectGitHub(token) {
  const user = await request("https://api.github.com/user", { token });
  if (user.login?.toLowerCase() !== repository.owner.toLowerCase()) {
    throw new BookmarkError(`仅 ${repository.owner} 的 GitHub 账号可以管理这个收藏夹。`);
  }
  const collection = await readBookmarks({ token });
  return { login: user.login, collection };
}

function sameBookmark(first, second) {
  return JSON.stringify(validateBookmark(first)) === JSON.stringify(validateBookmark(second));
}

function applyChange(collection, change) {
  const bookmarks = [...collection.bookmarks];
  const index = bookmarks.findIndex((item) => item.id === change.item.id);
  if (change.type === "add") {
    if (index !== -1) throw new BookmarkError("这条收藏已存在，请刷新后重试。");
    bookmarks.unshift(validateBookmark(change.item));
  } else {
    if (index === -1 || !sameBookmark(bookmarks[index], change.original)) {
      throw new BookmarkError("这条收藏已在其他设备修改或删除。请关闭窗口并刷新，再进行修改。");
    }
    if (change.type === "delete") bookmarks.splice(index, 1);
    else if (change.type === "edit") bookmarks[index] = validateBookmark(change.item);
    else throw new BookmarkError("无法识别的收藏操作。");
  }
  return validateCollection({ version: 1, bookmarks });
}

// Read the latest file before every write; GitHub's SHA check prevents overwriting
// concurrent changes. Only unrelated edits can be retried automatically.
export async function saveBookmarkChange(token, change) {
  if (!token) throw new BookmarkError("请先连接 GitHub，再管理收藏。");
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const latest = await readBookmarks({ token });
    const next = applyChange(latest, change);
    try {
      const result = await request(fileUrl, {
        token,
        method: "PUT",
        body: JSON.stringify({
          message: `${change.type === "delete" ? "Remove" : change.type === "add" ? "Add" : "Update"} tool bookmark`,
          content: encodeContent(next),
          sha: latest.sha,
          branch: repository.branch,
        }),
      });
      return { ...next, sha: result.content.sha };
    } catch (error) {
      if (error.status !== 409 || attempt === 1) throw error;
    }
  }
}
