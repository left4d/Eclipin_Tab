(() => {
  'use strict';

  const MESSAGE_TYPE = 'eclipin:local-web-package:init';
  const objectUrls = new Set();
  const objectUrlPaths = new Map();

  const revokeAll = () => {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.clear();
    objectUrlPaths.clear();
  };

  const createObjectUrl = (blob, sourcePath = '') => {
    const url = URL.createObjectURL(blob);
    objectUrls.add(url);
    if (sourcePath) objectUrlPaths.set(url, sourcePath);
    return url;
  };

  const normalizePath = (value) => {
    const out = [];
    String(value || '').replace(/\\/g, '/').split('/').forEach((segment) => {
      if (!segment || segment === '.') return;
      if (segment === '..') out.pop();
      else out.push(segment);
    });
    return out.join('/');
  };

  const dirname = (path) => {
    const index = path.lastIndexOf('/');
    return index >= 0 ? path.slice(0, index + 1) : '';
  };

  const isExternalUrl = (raw) => /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(raw);

  const splitSuffix = (raw) => {
    const match = String(raw).match(/^([^?#]*)([?#].*)?$/);
    return { path: match ? match[1] : String(raw), suffix: match?.[2] || '' };
  };

  const resolvePackagePath = (rawUrl, fromPath, entryRoot, knownPaths) => {
    const raw = String(rawUrl || '').trim();
    if (!raw || isExternalUrl(raw)) return null;
    const { path: clean } = splitSuffix(raw);
    let candidate;
    try { candidate = decodeURIComponent(clean); } catch { candidate = clean; }
    if (candidate.startsWith('/')) candidate = `${entryRoot}${candidate.replace(/^\/+/, '')}`;
    else candidate = `${dirname(fromPath)}${candidate}`;
    const normalized = normalizePath(candidate);
    if (knownPaths.has(normalized)) return normalized;

    // Some exported sites use root-relative paths even when the ZIP contains a wrapping directory.
    const rooted = normalizePath(`${entryRoot}${clean.replace(/^\/+/, '')}`);
    return knownPaths.has(rooted) ? rooted : null;
  };

  const packageUrl = (raw, fromPath, entryRoot, knownPaths, urlMap) => {
    const target = resolvePackagePath(raw, fromPath, entryRoot, knownPaths);
    if (!target) return null;
    const suffix = splitSuffix(String(raw || '')).suffix;
    const mapped = urlMap.get(target);
    return mapped ? `${mapped}${suffix}` : null;
  };

  const replaceCssUrls = (css, cssPath, entryRoot, knownPaths, urlMap) => {
    const resolve = (raw) => packageUrl(raw, cssPath, entryRoot, knownPaths, urlMap) || raw;
    let output = css.replace(/url\(\s*(['"]?)([^'"\)]+)\1\s*\)/gi, (_full, quote, raw) => {
      const next = resolve(raw.trim());
      return `url(${quote || '"'}${next}${quote || '"'})`;
    });
    output = output.replace(/@import\s+(['"])([^'"]+)\1/gi, (_full, quote, raw) => `@import ${quote}${resolve(raw)}${quote}`);
    return output;
  };

  const replaceModuleImports = (code, jsPath, entryRoot, knownPaths, urlMap) => {
    const resolve = (raw) => packageUrl(raw, jsPath, entryRoot, knownPaths, urlMap) || raw;
    return code
      .replace(/(\b(?:import|export)\s+(?:[^'";]*?\s+from\s*)?)(['"])([^'"]+)\2/g, (full, prefix, quote, raw) => {
        if (!raw.startsWith('.') && !raw.startsWith('/')) return full;
        return `${prefix}${quote}${resolve(raw)}${quote}`;
      })
      .replace(/(\bimport\s*\(\s*)(['"])([^'"]+)\2(\s*\))/g, (full, prefix, quote, raw, suffix) => {
        if (!raw.startsWith('.') && !raw.startsWith('/')) return full;
        return `${prefix}${quote}${resolve(raw)}${quote}${suffix}`;
      });
  };

  const replaceSrcset = (value, fromPath, entryRoot, knownPaths, urlMap) => {
    const source = String(value || '');
    if (!source || /data:/i.test(source)) return source;
    return source.split(',').map((candidate) => {
      const trimmed = candidate.trim();
      if (!trimmed) return trimmed;
      const match = trimmed.match(/^(\S+)(\s+.*)?$/);
      if (!match) return trimmed;
      const next = packageUrl(match[1], fromPath, entryRoot, knownPaths, urlMap) || match[1];
      return `${next}${match[2] || ''}`;
    }).join(', ');
  };

  const rewriteImportMap = (source, htmlPath, entryRoot, knownPaths, urlMap) => {
    let parsed;
    try { parsed = JSON.parse(source); } catch { return source; }
    const rewriteValueMap = (record) => {
      if (!record || typeof record !== 'object') return;
      Object.keys(record).forEach((key) => {
        const value = record[key];
        if (typeof value !== 'string') return;
        const next = packageUrl(value, htmlPath, entryRoot, knownPaths, urlMap);
        if (next) record[key] = next;
      });
    };
    rewriteValueMap(parsed.imports);
    if (parsed.scopes && typeof parsed.scopes === 'object') {
      const nextScopes = {};
      Object.entries(parsed.scopes).forEach(([scope, mappings]) => {
        let scopeKey = scope;
        const nextScope = packageUrl(scope, htmlPath, entryRoot, knownPaths, urlMap);
        if (nextScope) scopeKey = nextScope;
        rewriteValueMap(mappings);
        nextScopes[scopeKey] = mappings;
      });
      parsed.scopes = nextScopes;
    }
    return JSON.stringify(parsed);
  };

  const makeRuntimeBridge = (pagePath, entryRoot, knownPaths, urlMap, localProfile) => {
    const pathMap = {};
    knownPaths.forEach((path) => { pathMap[path] = urlMap.get(path) || ''; });
    const reverseMap = {};
    objectUrlPaths.forEach((path, url) => { reverseMap[url] = path; });

    return `(() => {
      'use strict';
      const pagePath = ${JSON.stringify(pagePath)};
      const entryRoot = ${JSON.stringify(entryRoot)};
      const files = ${JSON.stringify(pathMap)};
      const reverseFiles = ${JSON.stringify(reverseMap)};
      const localProfile = ${JSON.stringify(localProfile || {})};
      const known = new Set(Object.keys(files));
      const knownDirectories = new Set(['']);
      known.forEach((path) => {
        let slash = path.lastIndexOf('/');
        while (slash >= 0) {
          knownDirectories.add(path.slice(0, slash + 1));
          slash = path.lastIndexOf('/', slash - 1);
        }
      });
      // Packages such as Unity/Godot often resolve a directory first and append child
      // paths later. Blob URLs cannot be hierarchical bases, so package directories
      // get a virtual HTTPS URL and are translated back to file Blobs at API boundaries.
      const VIRTUAL_ROOT = 'https://eclipin-local.invalid/__package__/';
      const NativeURL = window.URL;
      const NativeBlob = window.Blob;
      const dirname = (path) => { const i = path.lastIndexOf('/'); return i >= 0 ? path.slice(0, i + 1) : ''; };
      const baseDir = (path) => String(path || '').endsWith('/') ? String(path || '') : dirname(String(path || ''));
      const normalize = (value) => { const out=[]; String(value||'').replace(/\\\\/g,'/').split('/').forEach((segment)=>{ if(!segment||segment==='.')return; if(segment==='..')out.pop(); else out.push(segment); }); return out.join('/'); };
      const splitSuffix = (raw) => { const m=String(raw).match(/^([^?#]*)([?#].*)?$/); return { path:m?m[1]:String(raw), suffix:m?.[2]||'' }; };
      const decodePath = (value) => { let out=String(value||''); try { out=decodeURIComponent(out); } catch {} return out; };
      const virtualPackagePath = (text) => {
        if (typeof text !== 'string' || !text.startsWith(VIRTUAL_ROOT)) return null;
        const relative = splitSuffix(text.slice(VIRTUAL_ROOT.length)).path;
        const trailingSlash = relative.endsWith('/');
        const normalized = normalize(decodePath(relative));
        return trailingSlash && normalized ? normalized + '/' : normalized;
      };
      const virtualDirectoryUrl = (path) => {
        const normalized = normalize(path);
        const encoded = normalized.split('/').filter(Boolean).map(encodeURIComponent).join('/');
        return VIRTUAL_ROOT + (encoded ? encoded + '/' : '');
      };
      const resolveCandidate = (raw, fromPath = pagePath) => {
        const parts = splitSuffix(raw);
        const decoded = decodePath(parts.path);
        let candidate = decoded.startsWith('/') ? entryRoot + decoded.replace(/^\\/+/, '') : baseDir(fromPath) + decoded;
        candidate = normalize(candidate);
        const rooted = normalize(entryRoot + decoded.replace(/^\\/+/, ''));
        return { parts, candidate, rooted };
      };
      const packageTarget = (raw, fromPath = pagePath) => {
        if (raw == null) return null;
        const text = typeof raw === 'string' ? raw : (raw instanceof NativeURL ? raw.href : String(raw));
        if (!text) return null;
        const virtualPath = virtualPackagePath(text);
        if (virtualPath != null) {
          const parts = splitSuffix(text);
          const normalized = normalize(virtualPath);
          return known.has(normalized) && files[normalized] ? { path: normalized, url: files[normalized] + parts.suffix } : null;
        }
        const parts = splitSuffix(text);
        const directPath = reverseFiles[parts.path];
        if (directPath && files[directPath]) return { path: directPath, url: files[directPath] + parts.suffix };
        if (/^(?:[a-z][a-z0-9+.-]*:|\\/\\/|#)/i.test(text)) return null;
        const resolved = resolveCandidate(text, fromPath);
        if (known.has(resolved.candidate) && files[resolved.candidate]) return { path: resolved.candidate, url: files[resolved.candidate] + resolved.parts.suffix };
        return known.has(resolved.rooted) && files[resolved.rooted] ? { path: resolved.rooted, url: files[resolved.rooted] + resolved.parts.suffix } : null;
      };
      const packageDirectory = (raw, fromPath = pagePath) => {
        if (raw == null) return null;
        const text = typeof raw === 'string' ? raw : (raw instanceof NativeURL ? raw.href : String(raw));
        if (!text) return null;
        const virtualPath = virtualPackagePath(text);
        if (virtualPath != null) {
          const normalized = normalize(virtualPath);
          const directory = normalized ? normalized + '/' : '';
          return knownDirectories.has(directory) ? directory : null;
        }
        if (/^(?:[a-z][a-z0-9+.-]*:|\\/\\/|#)/i.test(text)) return null;
        const resolved = resolveCandidate(text, fromPath);
        const candidateDir = resolved.candidate ? resolved.candidate + '/' : '';
        if (knownDirectories.has(candidateDir)) return candidateDir;
        const rootedDir = resolved.rooted ? resolved.rooted + '/' : '';
        return knownDirectories.has(rootedDir) ? rootedDir : null;
      };
      const local = (raw, fromPath = pagePath) => packageTarget(raw, fromPath)?.url || null;
      const cssUrls = (source, fromPath = pagePath) => String(source || '').replace(/url\\(\\s*(['"]?)([^'"\\)]+)\\1\\s*\\)/gi, (_all, quote, raw) => {
        const next = local(raw.trim(), fromPath) || raw.trim();
        return 'url(' + (quote || '"') + next + (quote || '"') + ')';
      });
      const srcset = (source, fromPath = pagePath) => {
        const text = String(source || '');
        if (!text || /data:/i.test(text)) return text;
        return text.split(',').map((candidate) => {
          const match = candidate.trim().match(/^(\\S+)(\\s+.*)?$/);
          if (!match) return candidate.trim();
          return (local(match[1], fromPath) || match[1]) + (match[2] || '');
        }).join(', ');
      };
      const packageBasePath = (base) => {
        const baseText = base == null ? '' : String(base);
        const virtualPath = virtualPackagePath(baseText);
        if (virtualPath != null) return virtualPath;
        return reverseFiles[baseText] || ((baseText === document.baseURI || baseText === location.href) ? pagePath : '');
      };
      const resolveAgainstBase = (input, base) => {
        if (typeof input !== 'string' || !input) return null;
        const directVirtual = packageTarget(input);
        if (directVirtual) return directVirtual.url;
        if (/^(?:[a-z][a-z0-9+.-]*:|\\/\\/|#)/i.test(input)) return null;
        const fromPath = packageBasePath(base);
        return fromPath ? local(input, fromPath) : null;
      };
      const resolveDirectoryAgainstBase = (input, base) => {
        if (typeof input !== 'string' || !input) return null;
        const directVirtual = packageDirectory(input);
        if (directVirtual != null) return virtualDirectoryUrl(directVirtual);
        if (/^(?:[a-z][a-z0-9+.-]*:|\\/\\/|#)/i.test(input)) return null;
        const fromPath = packageBasePath(base);
        if (!fromPath) return null;
        const directory = packageDirectory(input, fromPath);
        return directory != null ? virtualDirectoryUrl(directory) : null;
      };

      // Make new URL('./asset', import.meta.url) work even though modules are Blob URLs.
      // Directory targets (for example Unity's StreamingAssets) stay hierarchical via
      // a virtual URL until a concrete child file is requested.
      const URLProxy = new Proxy(NativeURL, {
        construct(Target, args, newTarget) {
          if (args.length >= 2) {
            const replacement = resolveAgainstBase(args[0], args[1]);
            if (replacement) args = [replacement];
            else {
              const directoryReplacement = resolveDirectoryAgainstBase(args[0], args[1]);
              if (directoryReplacement) args = [directoryReplacement];
            }
          }
          return Reflect.construct(Target, args, newTarget === URLProxy ? Target : newTarget);
        },
        apply(Target, thisArg, args) { return Reflect.apply(Target, thisArg, args); }
      });
      try { window.URL = URLProxy; } catch {}

      const originalFetch = window.fetch?.bind(window);
      if (originalFetch) window.fetch = (input, init) => {
        if (typeof input === 'string') return originalFetch(local(input) || input, init);
        if (input instanceof NativeURL) return originalFetch(local(input.href) || input, init);
        if (input instanceof Request) {
          const replacement = local(input.url);
          if (replacement) return originalFetch(new Request(replacement, input), init);
        }
        return originalFetch(input, init);
      };

      const NativeRequest = window.Request;
      if (NativeRequest) {
        const RequestProxy = function(input, init) {
          const next = typeof input === 'string' ? (local(input) || input) : input;
          return new NativeRequest(next, init);
        };
        RequestProxy.prototype = NativeRequest.prototype;
        try { Object.setPrototypeOf(RequestProxy, NativeRequest); window.Request = RequestProxy; } catch {}
      }

      const XHR = window.XMLHttpRequest;
      if (XHR) {
        const originalOpen = XHR.prototype.open;
        XHR.prototype.open = function(method, url, ...rest) {
          const next = typeof url === 'string' ? (local(url) || url) : url;
          return originalOpen.call(this, method, next, ...rest);
        };
      }

      const patchUrlProperty = (Ctor, property, mode = 'url') => {
        const proto = Ctor?.prototype;
        if (!proto) return;
        const descriptor = Object.getOwnPropertyDescriptor(proto, property);
        if (!descriptor?.set || !descriptor.get) return;
        try {
          Object.defineProperty(proto, property, {
            configurable: descriptor.configurable,
            enumerable: descriptor.enumerable,
            get: descriptor.get,
            set(value) {
              let next = value;
              if (typeof value === 'string') {
                if (mode === 'srcset') next = srcset(value);
                else if (mode === 'css') next = cssUrls(value);
                else next = local(value) || value;
              }
              return descriptor.set.call(this, next);
            },
          });
        } catch {}
      };
      patchUrlProperty(window.HTMLImageElement, 'src');
      patchUrlProperty(window.HTMLImageElement, 'srcset', 'srcset');
      patchUrlProperty(window.HTMLSourceElement, 'src');
      patchUrlProperty(window.HTMLSourceElement, 'srcset', 'srcset');
      patchUrlProperty(window.HTMLMediaElement, 'src');
      patchUrlProperty(window.HTMLVideoElement, 'poster');
      patchUrlProperty(window.HTMLScriptElement, 'src');
      patchUrlProperty(window.HTMLLinkElement, 'href');
      patchUrlProperty(window.HTMLIFrameElement, 'src');
      patchUrlProperty(window.HTMLObjectElement, 'data');
      patchUrlProperty(window.HTMLEmbedElement, 'src');
      patchUrlProperty(window.HTMLTrackElement, 'src');
      patchUrlProperty(window.HTMLInputElement, 'src');
      patchUrlProperty(window.HTMLAnchorElement, 'href');

      const originalSetAttribute = Element.prototype.setAttribute;
      Element.prototype.setAttribute = function(name, value) {
        const key = String(name).toLowerCase();
        let next = value;
        if (typeof value === 'string') {
          if (key === 'srcset') next = srcset(value);
          else if (key === 'style') next = cssUrls(value);
          else if (key === 'src' || key === 'href' || key === 'poster' || key === 'data') next = local(value) || value;
        }
        return originalSetAttribute.call(this, name, next);
      };

      const rewriteElementAssets = (element) => {
        if (!(element instanceof Element)) return;
        for (const name of ['src', 'href', 'poster', 'data']) {
          const value = element.getAttribute(name);
          const next = value ? (local(value) || value) : value;
          if (value && next !== value) originalSetAttribute.call(element, name, next);
        }
        const set = element.getAttribute('srcset');
        if (set) { const next = srcset(set); if (next !== set) originalSetAttribute.call(element, 'srcset', next); }
        const style = element.getAttribute('style');
        if (style) { const next = cssUrls(style); if (next !== style) originalSetAttribute.call(element, 'style', next); }
        if (element.tagName === 'STYLE' && element.textContent) {
          const next = cssUrls(element.textContent);
          if (next !== element.textContent) element.textContent = next;
        }
      };
      if (window.MutationObserver) {
        const observer = new MutationObserver((records) => {
          for (const record of records) {
            if (record.type === 'attributes') rewriteElementAssets(record.target);
            for (const node of record.addedNodes || []) {
              if (!(node instanceof Element)) continue;
              rewriteElementAssets(node);
              node.querySelectorAll?.('[src],[href],[poster],[data],[srcset],[style],style').forEach(rewriteElementAssets);
            }
          }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src','href','poster','data','srcset','style'] });
      }

      const CSSStyle = window.CSSStyleDeclaration?.prototype;
      if (CSSStyle) {
        const originalSetProperty = CSSStyle.setProperty;
        if (originalSetProperty) CSSStyle.setProperty = function(name, value, priority) {
          return originalSetProperty.call(this, name, typeof value === 'string' ? cssUrls(value) : value, priority);
        };
        const cssTextDescriptor = Object.getOwnPropertyDescriptor(CSSStyle, 'cssText');
        if (cssTextDescriptor?.set && cssTextDescriptor.get) {
          try {
            Object.defineProperty(CSSStyle, 'cssText', {
              configurable: cssTextDescriptor.configurable,
              enumerable: cssTextDescriptor.enumerable,
              get: cssTextDescriptor.get,
              set(value) { return cssTextDescriptor.set.call(this, typeof value === 'string' ? cssUrls(value) : value); }
            });
          } catch {}
        }
      }

      const Sheet = window.CSSStyleSheet?.prototype;
      if (Sheet) {
        const originalInsertRule = Sheet.insertRule;
        if (originalInsertRule) Sheet.insertRule = function(rule, index) { return originalInsertRule.call(this, cssUrls(rule), index); };
        const originalReplace = Sheet.replace;
        if (originalReplace) Sheet.replace = function(text) { return originalReplace.call(this, cssUrls(text)); };
        const originalReplaceSync = Sheet.replaceSync;
        if (originalReplaceSync) Sheet.replaceSync = function(text) { return originalReplaceSync.call(this, cssUrls(text)); };
      }

      const NativeFontFace = window.FontFace;
      if (NativeFontFace) {
        const FontFaceProxy = function(family, source, descriptors) {
          return new NativeFontFace(family, typeof source === 'string' ? cssUrls(source) : source, descriptors);
        };
        FontFaceProxy.prototype = NativeFontFace.prototype;
        try { Object.setPrototypeOf(FontFaceProxy, NativeFontFace); window.FontFace = FontFaceProxy; } catch {}
      }

      const NativeAudio = window.Audio;
      if (NativeAudio) {
        const AudioProxy = function(src) { return new NativeAudio(typeof src === 'string' ? (local(src) || src) : src); };
        AudioProxy.prototype = NativeAudio.prototype;
        try { Object.setPrototypeOf(AudioProxy, NativeAudio); window.Audio = AudioProxy; } catch {}
      }

      const workerBridgeSource = (workerPath) => {
        return '(' + function(workerPath, files, reverseFiles, entryRoot) {
          const NativeURL = self.URL;
          const known = new Set(Object.keys(files));
          const knownDirectories = new Set(['']);
          known.forEach((path) => {
            let slash = path.lastIndexOf('/');
            while (slash >= 0) {
              knownDirectories.add(path.slice(0, slash + 1));
              slash = path.lastIndexOf('/', slash - 1);
            }
          });
          const VIRTUAL_ROOT = 'https://eclipin-local.invalid/__package__/';
          const dirname = (path) => { const i = path.lastIndexOf('/'); return i >= 0 ? path.slice(0, i + 1) : ''; };
          const baseDir = (path) => String(path || '').endsWith('/') ? String(path || '') : dirname(String(path || ''));
          const normalize = (value) => { const out=[]; String(value||'').replace(/\\\\/g,'/').split('/').forEach((segment)=>{ if(!segment||segment==='.')return; if(segment==='..')out.pop(); else out.push(segment); }); return out.join('/'); };
          const splitSuffix = (raw) => { const m=String(raw).match(/^([^?#]*)([?#].*)?$/); return { path:m?m[1]:String(raw), suffix:m?.[2]||'' }; };
          const decodePath = (value) => { let out=String(value||''); try { out=decodeURIComponent(out); } catch {} return out; };
          const virtualPackagePath = (text) => {
            if (typeof text !== 'string' || !text.startsWith(VIRTUAL_ROOT)) return null;
            const relative = splitSuffix(text.slice(VIRTUAL_ROOT.length)).path;
            const trailingSlash = relative.endsWith('/');
            const normalized = normalize(decodePath(relative));
            return trailingSlash && normalized ? normalized + '/' : normalized;
          };
          const virtualDirectoryUrl = (path) => {
            const normalized = normalize(path);
            const encoded = normalized.split('/').filter(Boolean).map(encodeURIComponent).join('/');
            return VIRTUAL_ROOT + (encoded ? encoded + '/' : '');
          };
          const resolveCandidate = (raw, fromPath = workerPath) => {
            const parts = splitSuffix(raw);
            const decoded = decodePath(parts.path);
            let candidate = decoded.startsWith('/') ? entryRoot + decoded.replace(/^\\/+/, '') : baseDir(fromPath) + decoded;
            candidate = normalize(candidate);
            const rooted = normalize(entryRoot + decoded.replace(/^\\/+/, ''));
            return { parts, candidate, rooted };
          };
          const target = (raw, fromPath = workerPath) => {
            if (raw == null) return null;
            const text = typeof raw === 'string' ? raw : (raw instanceof NativeURL ? raw.href : String(raw));
            if (!text) return null;
            const virtualPath = virtualPackagePath(text);
            if (virtualPath != null) {
              const normalized = normalize(virtualPath);
              const parts = splitSuffix(text);
              return known.has(normalized) && files[normalized] ? files[normalized] + parts.suffix : null;
            }
            const parts = splitSuffix(text);
            const directPath = reverseFiles[parts.path];
            if (directPath && files[directPath]) return files[directPath] + parts.suffix;
            if (/^(?:[a-z][a-z0-9+.-]*:|\\/\\/|#)/i.test(text)) return null;
            const resolved = resolveCandidate(text, fromPath);
            if (known.has(resolved.candidate)) return files[resolved.candidate] + resolved.parts.suffix;
            return known.has(resolved.rooted) ? files[resolved.rooted] + resolved.parts.suffix : null;
          };
          const directory = (raw, fromPath = workerPath) => {
            if (raw == null) return null;
            const text = typeof raw === 'string' ? raw : (raw instanceof NativeURL ? raw.href : String(raw));
            if (!text) return null;
            const virtualPath = virtualPackagePath(text);
            if (virtualPath != null) {
              const normalized = normalize(virtualPath);
              const dir = normalized ? normalized + '/' : '';
              return knownDirectories.has(dir) ? dir : null;
            }
            if (/^(?:[a-z][a-z0-9+.-]*:|\\/\\/|#)/i.test(text)) return null;
            const resolved = resolveCandidate(text, fromPath);
            const candidateDir = resolved.candidate ? resolved.candidate + '/' : '';
            if (knownDirectories.has(candidateDir)) return candidateDir;
            const rootedDir = resolved.rooted ? resolved.rooted + '/' : '';
            return knownDirectories.has(rootedDir) ? rootedDir : null;
          };
          const local = (raw, fromPath = workerPath) => target(raw, fromPath);
          const URLProxy = new Proxy(NativeURL, {
            construct(Target, args, newTarget) {
              if (args.length >= 2 && typeof args[0] === 'string') {
                const base = String(args[1]);
                const fromPath = virtualPackagePath(base) ?? reverseFiles[base] ?? workerPath;
                const replacement = local(args[0], fromPath);
                if (replacement) args = [replacement];
                else {
                  const dir = directory(args[0], fromPath);
                  if (dir != null) args = [virtualDirectoryUrl(dir)];
                }
              }
              return Reflect.construct(Target, args, newTarget === URLProxy ? Target : newTarget);
            }
          });
          try { self.URL = URLProxy; } catch {}
          const nativeFetch = self.fetch?.bind(self);
          if (nativeFetch) self.fetch = (input, init) => {
            if (typeof input === 'string') return nativeFetch(local(input) || input, init);
            if (input instanceof NativeURL) return nativeFetch(local(input.href) || input, init);
            if (input instanceof Request) {
              const replacement = local(input.url);
              if (replacement) return nativeFetch(new Request(replacement, input), init);
            }
            return nativeFetch(input, init);
          };
          const nativeImportScripts = self.importScripts?.bind(self);
          if (nativeImportScripts) self.importScripts = (...urls) => nativeImportScripts(...urls.map((url) => typeof url === 'string' ? (local(url) || url) : url));
          self.__eclipinResolveLocalWebAsset = (url, fromPath = workerPath) => local(url, fromPath) || url;
        }.toString() + ')(' + JSON.stringify(workerPath) + ',' + JSON.stringify(files) + ',' + JSON.stringify(reverseFiles) + ',' + JSON.stringify(entryRoot) + ');';
      };

      const patchWorker = (name) => {
        const NativeWorker = window[name];
        if (typeof NativeWorker !== 'function') return;
        const WorkerProxy = function(specifier, options) {
          const text = specifier instanceof NativeURL ? specifier.href : String(specifier);
          const target = packageTarget(text);
          if (!target) return new NativeWorker(specifier, options);
          const isModule = options?.type === 'module';
          const bootstrap = workerBridgeSource(target.path) + '\\n' + (isModule
            ? 'import(' + JSON.stringify(target.url) + ');'
            : 'importScripts(' + JSON.stringify(target.url) + ');');
          const bootstrapUrl = NativeURL.createObjectURL(new NativeBlob([bootstrap], { type: 'text/javascript' }));
          return new NativeWorker(bootstrapUrl, options);
        };
        WorkerProxy.prototype = NativeWorker.prototype;
        try { Object.setPrototypeOf(WorkerProxy, NativeWorker); window[name] = WorkerProxy; } catch {}
      };
      patchWorker('Worker');
      patchWorker('SharedWorker');

      const patchAddModule = (target) => {
        if (!target || typeof target.addModule !== 'function') return;
        const original = target.addModule.bind(target);
        try { target.addModule = (url, options) => original(typeof url === 'string' ? (local(url) || url) : url, options); } catch {}
      };
      try { patchAddModule(window.CSS?.paintWorklet); } catch {}
      try { patchAddModule(window.CSS?.layoutWorklet); } catch {}
      try { patchAddModule(window.animationWorklet); } catch {}

      if (localProfile.web7Unity) {
        try { Object.defineProperty(window, 'caches', { configurable: true, value: undefined }); } catch {}
        const fitUnityCanvas = (canvas) => {
          if (!canvas) return;
          canvas.style.width = '100vw';
          canvas.style.height = '100vh';
          canvas.style.display = 'block';
          const sync = () => {
            const rect = canvas.getBoundingClientRect();
            if (!(rect.width > 0) || !(rect.height > 0)) return;
            const ratio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
            const width = Math.max(1, Math.round(rect.width * ratio));
            const height = Math.max(1, Math.round(rect.height * ratio));
            if (canvas.width !== width) canvas.width = width;
            if (canvas.height !== height) canvas.height = height;
            window.dispatchEvent(new Event('resize'));
          };
          sync();
          setTimeout(sync, 60);
          setTimeout(sync, 240);
          setTimeout(sync, 800);
          try { new ResizeObserver(sync).observe(canvas); } catch {}
        };
        const patchCreateUnityInstance = (fn) => function(canvas, config, ...rest) {
          const nextConfig = { ...(config || {}) };
          nextConfig.companyName = '';
          nextConfig.productName = '';
          nextConfig.matchWebGLToCanvasSize = true;
          nextConfig.devicePixelRatio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
          nextConfig.webglContextAttributes = {
            ...(nextConfig.webglContextAttributes || {}),
            alpha: false,
            antialias: true,
            preserveDrawingBuffer: true,
            powerPreference: 'high-performance',
          };
          fitUnityCanvas(canvas);
          const result = fn.call(this, canvas, nextConfig, ...rest);
          Promise.resolve(result).then(() => fitUnityCanvas(canvas)).catch(() => {});
          return result;
        };
        const descriptor = Object.getOwnPropertyDescriptor(window, 'createUnityInstance');
        if (typeof window.createUnityInstance === 'function') window.createUnityInstance = patchCreateUnityInstance(window.createUnityInstance);
        else if (!descriptor || descriptor.configurable) {
          let unityFactory;
          Object.defineProperty(window, 'createUnityInstance', {
            configurable: true,
            get() { return unityFactory; },
            set(value) { unityFactory = typeof value === 'function' ? patchCreateUnityInstance(value) : value; },
          });
        }
        const canvas = document.getElementById('unity-canvas');
        if (canvas instanceof HTMLCanvasElement) fitUnityCanvas(canvas);
      }

      window.__eclipinResolveLocalWebAsset = (url, fromPath = pagePath) => local(url, fromPath) || url;

      // Compatibility for older Wallpaper Engine Spine pages that overwrite the
      // player's responsive camera zoom every frame with a fixed nrb_zoom value.
      // We only activate this when the specific legacy shape is detected.
      const patchLegacySpinePlayer = (player) => {
        if (!player || player.__eclipinAdaptiveSpineFit) return false;
        if (!Number.isFinite(player.nrb_zoom) || !player.sceneRenderer?.camera || !player.canvas || !player.config || typeof player.config.update !== 'function') return false;
        const baselineZoom = Math.abs(player.nrb_zoom) > 1e-9 ? player.nrb_zoom : 1;
        const originalUpdate = player.config.update;
        player.config.update = function(...args) {
          const result = originalUpdate.apply(this, args);
          const current = args[0] || player;
          const viewport = current.viewport || current.currentViewport;
          const canvas = current.canvas;
          const camera = current.sceneRenderer?.camera;
          if (!viewport || !canvas || !camera || !canvas.width || !canvas.height) return result;
          const width = Number(viewport.width);
          const height = Number(viewport.height);
          if (!(width > 0) || !(height > 0)) return result;
          const fitZoom = canvas.height / canvas.width > height / width ? width / canvas.width : height / canvas.height;
          const requestedZoom = Number(current.nrb_zoom);
          const userScale = Number.isFinite(requestedZoom) ? requestedZoom / baselineZoom : 1;
          if (Number.isFinite(fitZoom) && fitZoom > 0 && Number.isFinite(userScale) && userScale > 0) camera.zoom = fitZoom * userScale;
          return result;
        };
        try { Object.defineProperty(player, '__eclipinAdaptiveSpineFit', { value: true, configurable: true }); } catch { player.__eclipinAdaptiveSpineFit = true; }
        return true;
      };
      let spineProbeCount = 0;
      const probeSpine = () => {
        spineProbeCount += 1;
        let patched = false;
        try { patched = patchLegacySpinePlayer(window.reproductor) || patched; } catch {}
        if (patched || spineProbeCount >= 80) clearInterval(spineProbeTimer);
      };
      const spineProbeTimer = setInterval(probeSpine, 125);
      queueMicrotask(probeSpine);

      window.addEventListener('load', () => {
        try { window.parent.postMessage({ type: 'eclipin:local-web-package:loaded' }, '*'); } catch {}
      }, { once: true });
    })();`;
  };

  const injectRuntimeBridge = (doc, pagePath, entryRoot, knownPaths, urlMap, localProfile) => {
    const bridge = makeRuntimeBridge(pagePath, entryRoot, knownPaths, urlMap, localProfile);
    const scriptUrl = createObjectUrl(new Blob([bridge], { type: 'text/javascript' }));
    const script = doc.createElement('script');
    script.src = scriptUrl;
    (doc.head || doc.documentElement).prepend(script);
  };

  const rewriteDocument = (html, pagePath, entryRoot, knownPaths, urlMap, localProfile) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('base').forEach((node) => node.remove());
    doc.querySelectorAll('meta[http-equiv="Content-Security-Policy" i]').forEach((node) => node.remove());

    const rewriteAttr = (element, attr) => {
      const raw = element.getAttribute(attr);
      if (!raw) return;
      const next = packageUrl(raw, pagePath, entryRoot, knownPaths, urlMap);
      if (next) element.setAttribute(attr, next);
    };

    doc.querySelectorAll('[src]').forEach((node) => rewriteAttr(node, 'src'));
    doc.querySelectorAll('link[href], use[href], image[href], feImage[href], a[href]').forEach((node) => rewriteAttr(node, 'href'));
    doc.querySelectorAll('[xlink\\:href]').forEach((node) => rewriteAttr(node, 'xlink:href'));
    doc.querySelectorAll('[poster]').forEach((node) => rewriteAttr(node, 'poster'));
    doc.querySelectorAll('object[data]').forEach((node) => rewriteAttr(node, 'data'));
    doc.querySelectorAll('[srcset]').forEach((node) => {
      const raw = node.getAttribute('srcset');
      if (raw) node.setAttribute('srcset', replaceSrcset(raw, pagePath, entryRoot, knownPaths, urlMap));
    });
    doc.querySelectorAll('[style]').forEach((node) => {
      const raw = node.getAttribute('style');
      if (raw) node.setAttribute('style', replaceCssUrls(raw, pagePath, entryRoot, knownPaths, urlMap));
    });
    doc.querySelectorAll('script[integrity], link[integrity]').forEach((node) => node.removeAttribute('integrity'));
    doc.querySelectorAll('style').forEach((style) => {
      style.textContent = replaceCssUrls(style.textContent || '', pagePath, entryRoot, knownPaths, urlMap);
    });
    doc.querySelectorAll('script[type="module"]:not([src])').forEach((script) => {
      script.textContent = replaceModuleImports(script.textContent || '', pagePath, entryRoot, knownPaths, urlMap);
    });
    if (localProfile?.web7Unity) {
      doc.querySelectorAll('script:not([src])').forEach((script) => {
        const source = script.textContent || '';
        if (!source.includes('createUnityInstance')) return;
        const next = source
          .replace(/companyName\s*:\s*(['"])(?:[^'"\\]|\\.)*\1/g, 'companyName: ""')
          .replace(/productName\s*:\s*(['"])(?:[^'"\\]|\\.)*\1/g, 'productName: ""');
        if (next !== source) script.textContent = next;
      });
    }
    doc.querySelectorAll('script[type="importmap"]').forEach((script) => {
      script.textContent = rewriteImportMap(script.textContent || '', pagePath, entryRoot, knownPaths, urlMap);
    });
    injectRuntimeBridge(doc, pagePath, entryRoot, knownPaths, urlMap, localProfile);
    return `<!doctype html>\n${doc.documentElement.outerHTML}`;
  };

  const renderPackage = async (message) => {
    revokeAll();
    const files = new Map();
    for (const item of message.files || []) {
      if (!item?.path || !(item.data instanceof Blob)) continue;
      files.set(normalizePath(item.path), item);
    }
    const entryPath = normalizePath(message.entryPath || '');
    const entry = files.get(entryPath);
    if (!entry) throw new Error(`入口文件不存在：${entryPath || 'index.html'}`);

    const entryRoot = dirname(entryPath);
    const knownPaths = new Set(files.keys());
    const urlMap = new Map();
    const project = files.get('project.json');
    let localProfile = {};
    if (project && knownPaths.has('Build/4k0.1.loader.js') && knownPaths.has('Build/4k0.1.data') && knownPaths.has('Build/4k0.1.wasm')) {
      try {
        const meta = JSON.parse(await project.data.text());
        if (meta?.workshopid === '3756621387' || meta?.title === '阿洛娜指纹识别2.0[网页版]') localProfile = { web7Unity: true };
      } catch {}
    }
    // Stable first-generation URLs make every binary asset immediately addressable.
    for (const [path, item] of files) urlMap.set(path, createObjectUrl(item.data, path));

    // CSS needs rewriting so fonts/images/@imports keep working from Blob stylesheets.
    // A few rounds let nested @imports converge while old Blob generations remain valid.
    for (let pass = 0; pass < 4; pass++) {
      for (const [path, item] of files) {
        if (!/\.css$/i.test(path)) continue;
        const css = await item.data.text();
        const rewritten = replaceCssUrls(css, path, entryRoot, knownPaths, urlMap);
        urlMap.set(path, createObjectUrl(new Blob([rewritten], { type: item.mimeType || 'text/css;charset=utf-8' }), path));
      }
    }

    // Static module specifiers must be rewritten because Blob URLs are not hierarchical.
    // Runtime new URL(..., import.meta.url), Worker, fetch/XHR and fonts are handled by the bridge.
    for (let pass = 0; pass < 6; pass++) {
      for (const [path, item] of files) {
        if (!/\.(?:m?js|cjs)$/i.test(path)) continue;
        const code = await item.data.text();
        const rewritten = replaceModuleImports(code, path, entryRoot, knownPaths, urlMap);
        urlMap.set(path, createObjectUrl(new Blob([rewritten], { type: item.mimeType || 'text/javascript;charset=utf-8' }), path));
      }
    }

    // Preprocess secondary HTML files so package-local iframe/anchor navigation has a useful target.
    // The main entry is written into the runner document below so the extension keeps one stable URL.
    const htmlPaths = [...files.keys()].filter((path) => /\.html?$/i.test(path) && path !== entryPath);
    for (let pass = 0; pass < 3; pass++) {
      for (const path of htmlPaths) {
        const item = files.get(path);
        if (!item) continue;
        const rewritten = rewriteDocument(await item.data.text(), path, entryRoot, knownPaths, urlMap, localProfile);
        urlMap.set(path, createObjectUrl(new Blob([rewritten], { type: item.mimeType || 'text/html;charset=utf-8' }), path));
      }
    }

    const serialized = rewriteDocument(await entry.data.text(), entryPath, entryRoot, knownPaths, urlMap, localProfile);
    document.open();
    document.write(serialized);
    document.close();
  };

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (!message || message.type !== MESSAGE_TYPE) return;
    void renderPackage(message).catch((error) => {
      console.error('Local web package runner failed:', error);
      const status = document.getElementById('status') || document.body;
      status.textContent = `本地网页包载入失败：${error instanceof Error ? error.message : String(error)}`;
    });
  });

  window.addEventListener('pagehide', revokeAll, { once: true });
})();
