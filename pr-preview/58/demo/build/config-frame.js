"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: !0 });
  };

  // node_modules/yaml/browser/dist/nodes/identity.js
  var ALIAS = /* @__PURE__ */ Symbol.for("yaml.alias"), DOC = /* @__PURE__ */ Symbol.for("yaml.document"), MAP = /* @__PURE__ */ Symbol.for("yaml.map"), PAIR = /* @__PURE__ */ Symbol.for("yaml.pair"), SCALAR = /* @__PURE__ */ Symbol.for("yaml.scalar"), SEQ = /* @__PURE__ */ Symbol.for("yaml.seq"), NODE_TYPE = /* @__PURE__ */ Symbol.for("yaml.node.type"), isAlias = (node) => !!node && typeof node == "object" && node[NODE_TYPE] === ALIAS, isDocument = (node) => !!node && typeof node == "object" && node[NODE_TYPE] === DOC, isMap = (node) => !!node && typeof node == "object" && node[NODE_TYPE] === MAP, isPair = (node) => !!node && typeof node == "object" && node[NODE_TYPE] === PAIR, isScalar = (node) => !!node && typeof node == "object" && node[NODE_TYPE] === SCALAR, isSeq = (node) => !!node && typeof node == "object" && node[NODE_TYPE] === SEQ;
  function isCollection(node) {
    if (node && typeof node == "object")
      switch (node[NODE_TYPE]) {
        case MAP:
        case SEQ:
          return !0;
      }
    return !1;
  }
  function isNode(node) {
    if (node && typeof node == "object")
      switch (node[NODE_TYPE]) {
        case ALIAS:
        case MAP:
        case SCALAR:
        case SEQ:
          return !0;
      }
    return !1;
  }
  var hasAnchor = (node) => (isScalar(node) || isCollection(node)) && !!node.anchor;

  // node_modules/yaml/browser/dist/visit.js
  var BREAK = /* @__PURE__ */ Symbol("break visit"), SKIP = /* @__PURE__ */ Symbol("skip children"), REMOVE = /* @__PURE__ */ Symbol("remove node");
  function visit(node, visitor) {
    let visitor_ = initVisitor(visitor);
    isDocument(node) ? visit_(null, node.contents, visitor_, Object.freeze([node])) === REMOVE && (node.contents = null) : visit_(null, node, visitor_, Object.freeze([]));
  }
  visit.BREAK = BREAK;
  visit.SKIP = SKIP;
  visit.REMOVE = REMOVE;
  function visit_(key, node, visitor, path) {
    let ctrl = callVisitor(key, node, visitor, path);
    if (isNode(ctrl) || isPair(ctrl))
      return replaceNode(key, path, ctrl), visit_(key, ctrl, visitor, path);
    if (typeof ctrl != "symbol") {
      if (isCollection(node)) {
        path = Object.freeze(path.concat(node));
        for (let i = 0; i < node.items.length; ++i) {
          let ci = visit_(i, node.items[i], visitor, path);
          if (typeof ci == "number")
            i = ci - 1;
          else {
            if (ci === BREAK)
              return BREAK;
            ci === REMOVE && (node.items.splice(i, 1), i -= 1);
          }
        }
      } else if (isPair(node)) {
        path = Object.freeze(path.concat(node));
        let ck = visit_("key", node.key, visitor, path);
        if (ck === BREAK)
          return BREAK;
        ck === REMOVE && (node.key = null);
        let cv = visit_("value", node.value, visitor, path);
        if (cv === BREAK)
          return BREAK;
        cv === REMOVE && (node.value = null);
      }
    }
    return ctrl;
  }
  async function visitAsync(node, visitor) {
    let visitor_ = initVisitor(visitor);
    isDocument(node) ? await visitAsync_(null, node.contents, visitor_, Object.freeze([node])) === REMOVE && (node.contents = null) : await visitAsync_(null, node, visitor_, Object.freeze([]));
  }
  visitAsync.BREAK = BREAK;
  visitAsync.SKIP = SKIP;
  visitAsync.REMOVE = REMOVE;
  async function visitAsync_(key, node, visitor, path) {
    let ctrl = await callVisitor(key, node, visitor, path);
    if (isNode(ctrl) || isPair(ctrl))
      return replaceNode(key, path, ctrl), visitAsync_(key, ctrl, visitor, path);
    if (typeof ctrl != "symbol") {
      if (isCollection(node)) {
        path = Object.freeze(path.concat(node));
        for (let i = 0; i < node.items.length; ++i) {
          let ci = await visitAsync_(i, node.items[i], visitor, path);
          if (typeof ci == "number")
            i = ci - 1;
          else {
            if (ci === BREAK)
              return BREAK;
            ci === REMOVE && (node.items.splice(i, 1), i -= 1);
          }
        }
      } else if (isPair(node)) {
        path = Object.freeze(path.concat(node));
        let ck = await visitAsync_("key", node.key, visitor, path);
        if (ck === BREAK)
          return BREAK;
        ck === REMOVE && (node.key = null);
        let cv = await visitAsync_("value", node.value, visitor, path);
        if (cv === BREAK)
          return BREAK;
        cv === REMOVE && (node.value = null);
      }
    }
    return ctrl;
  }
  function initVisitor(visitor) {
    return typeof visitor == "object" && (visitor.Collection || visitor.Node || visitor.Value) ? Object.assign({
      Alias: visitor.Node,
      Map: visitor.Node,
      Scalar: visitor.Node,
      Seq: visitor.Node
    }, visitor.Value && {
      Map: visitor.Value,
      Scalar: visitor.Value,
      Seq: visitor.Value
    }, visitor.Collection && {
      Map: visitor.Collection,
      Seq: visitor.Collection
    }, visitor) : visitor;
  }
  function callVisitor(key, node, visitor, path) {
    if (typeof visitor == "function")
      return visitor(key, node, path);
    if (isMap(node))
      return visitor.Map?.(key, node, path);
    if (isSeq(node))
      return visitor.Seq?.(key, node, path);
    if (isPair(node))
      return visitor.Pair?.(key, node, path);
    if (isScalar(node))
      return visitor.Scalar?.(key, node, path);
    if (isAlias(node))
      return visitor.Alias?.(key, node, path);
  }
  function replaceNode(key, path, node) {
    let parent = path[path.length - 1];
    if (isCollection(parent))
      parent.items[key] = node;
    else if (isPair(parent))
      key === "key" ? parent.key = node : parent.value = node;
    else if (isDocument(parent))
      parent.contents = node;
    else {
      let pt = isAlias(parent) ? "alias" : "scalar";
      throw new Error(`Cannot replace node with ${pt} parent`);
    }
  }

  // node_modules/yaml/browser/dist/doc/directives.js
  var escapeChars = {
    "!": "%21",
    ",": "%2C",
    "[": "%5B",
    "]": "%5D",
    "{": "%7B",
    "}": "%7D"
  }, escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]), Directives = class _Directives {
    constructor(yaml, tags) {
      this.docStart = null, this.docEnd = !1, this.yaml = Object.assign({}, _Directives.defaultYaml, yaml), this.tags = Object.assign({}, _Directives.defaultTags, tags);
    }
    clone() {
      let copy = new _Directives(this.yaml, this.tags);
      return copy.docStart = this.docStart, copy;
    }
    /**
     * During parsing, get a Directives instance for the current document and
     * update the stream state according to the current version's spec.
     */
    atDocument() {
      let res = new _Directives(this.yaml, this.tags);
      switch (this.yaml.version) {
        case "1.1":
          this.atNextDocument = !0;
          break;
        case "1.2":
          this.atNextDocument = !1, this.yaml = {
            explicit: _Directives.defaultYaml.explicit,
            version: "1.2"
          }, this.tags = Object.assign({}, _Directives.defaultTags);
          break;
      }
      return res;
    }
    /**
     * @param onError - May be called even if the action was successful
     * @returns `true` on success
     */
    add(line, onError) {
      this.atNextDocument && (this.yaml = { explicit: _Directives.defaultYaml.explicit, version: "1.1" }, this.tags = Object.assign({}, _Directives.defaultTags), this.atNextDocument = !1);
      let parts = line.trim().split(/[ \t]+/), name = parts.shift();
      switch (name) {
        case "%TAG": {
          if (parts.length !== 2 && (onError(0, "%TAG directive should contain exactly two parts"), parts.length < 2))
            return !1;
          let [handle, prefix] = parts;
          return this.tags[handle] = prefix, !0;
        }
        case "%YAML": {
          if (this.yaml.explicit = !0, parts.length !== 1)
            return onError(0, "%YAML directive should contain exactly one part"), !1;
          let [version] = parts;
          if (version === "1.1" || version === "1.2")
            return this.yaml.version = version, !0;
          {
            let isValid = /^\d+\.\d+$/.test(version);
            return onError(6, `Unsupported YAML version ${version}`, isValid), !1;
          }
        }
        default:
          return onError(0, `Unknown directive ${name}`, !0), !1;
      }
    }
    /**
     * Resolves a tag, matching handles to those defined in %TAG directives.
     *
     * @returns Resolved tag, which may also be the non-specific tag `'!'` or a
     *   `'!local'` tag, or `null` if unresolvable.
     */
    tagName(source, onError) {
      if (source === "!")
        return "!";
      if (source[0] !== "!")
        return onError(`Not a valid tag: ${source}`), null;
      if (source[1] === "<") {
        let verbatim = source.slice(2, -1);
        return verbatim === "!" || verbatim === "!!" ? (onError(`Verbatim tags aren't resolved, so ${source} is invalid.`), null) : (source[source.length - 1] !== ">" && onError("Verbatim tags must end with a >"), verbatim);
      }
      let [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
      suffix || onError(`The ${source} tag has no suffix`);
      let prefix = this.tags[handle];
      if (prefix)
        try {
          return prefix + decodeURIComponent(suffix);
        } catch (error2) {
          return onError(String(error2)), null;
        }
      return handle === "!" ? source : (onError(`Could not resolve tag: ${source}`), null);
    }
    /**
     * Given a fully resolved tag, returns its printable string form,
     * taking into account current tag prefixes and defaults.
     */
    tagString(tag) {
      for (let [handle, prefix] of Object.entries(this.tags))
        if (tag.startsWith(prefix))
          return handle + escapeTagName(tag.substring(prefix.length));
      return tag[0] === "!" ? tag : `!<${tag}>`;
    }
    toString(doc) {
      let lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [], tagEntries = Object.entries(this.tags), tagNames;
      if (doc && tagEntries.length > 0 && isNode(doc.contents)) {
        let tags = {};
        visit(doc.contents, (_key, node) => {
          isNode(node) && node.tag && (tags[node.tag] = !0);
        }), tagNames = Object.keys(tags);
      } else
        tagNames = [];
      for (let [handle, prefix] of tagEntries)
        handle === "!!" && prefix === "tag:yaml.org,2002:" || (!doc || tagNames.some((tn) => tn.startsWith(prefix))) && lines.push(`%TAG ${handle} ${prefix}`);
      return lines.join(`
`);
    }
  };
  Directives.defaultYaml = { explicit: !1, version: "1.2" };
  Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };

  // node_modules/yaml/browser/dist/doc/anchors.js
  function anchorIsValid(anchor) {
    if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
      let msg = `Anchor must not contain whitespace or control characters: ${JSON.stringify(anchor)}`;
      throw new Error(msg);
    }
    return !0;
  }
  function anchorNames(root) {
    let anchors = /* @__PURE__ */ new Set();
    return visit(root, {
      Value(_key, node) {
        node.anchor && anchors.add(node.anchor);
      }
    }), anchors;
  }
  function findNewAnchor(prefix, exclude) {
    for (let i = 1; ; ++i) {
      let name = `${prefix}${i}`;
      if (!exclude.has(name))
        return name;
    }
  }
  function createNodeAnchors(doc, prefix) {
    let aliasObjects = [], sourceObjects = /* @__PURE__ */ new Map(), prevAnchors = null;
    return {
      onAnchor: (source) => {
        aliasObjects.push(source), prevAnchors ?? (prevAnchors = anchorNames(doc));
        let anchor = findNewAnchor(prefix, prevAnchors);
        return prevAnchors.add(anchor), anchor;
      },
      /**
       * With circular references, the source node is only resolved after all
       * of its child nodes are. This is why anchors are set only after all of
       * the nodes have been created.
       */
      setAnchors: () => {
        for (let source of aliasObjects) {
          let ref = sourceObjects.get(source);
          if (typeof ref == "object" && ref.anchor && (isScalar(ref.node) || isCollection(ref.node)))
            ref.node.anchor = ref.anchor;
          else {
            let error2 = new Error("Failed to resolve repeated object (this should not happen)");
            throw error2.source = source, error2;
          }
        }
      },
      sourceObjects
    };
  }

  // node_modules/yaml/browser/dist/doc/applyReviver.js
  function applyReviver(reviver, obj, key, val) {
    if (val && typeof val == "object")
      if (Array.isArray(val))
        for (let i = 0, len = val.length; i < len; ++i) {
          let v0 = val[i], v1 = applyReviver(reviver, val, String(i), v0);
          v1 === void 0 ? delete val[i] : v1 !== v0 && (val[i] = v1);
        }
      else if (val instanceof Map)
        for (let k of Array.from(val.keys())) {
          let v0 = val.get(k), v1 = applyReviver(reviver, val, k, v0);
          v1 === void 0 ? val.delete(k) : v1 !== v0 && val.set(k, v1);
        }
      else if (val instanceof Set)
        for (let v0 of Array.from(val)) {
          let v1 = applyReviver(reviver, val, v0, v0);
          v1 === void 0 ? val.delete(v0) : v1 !== v0 && (val.delete(v0), val.add(v1));
        }
      else
        for (let [k, v0] of Object.entries(val)) {
          let v1 = applyReviver(reviver, val, k, v0);
          v1 === void 0 ? delete val[k] : v1 !== v0 && (val[k] = v1);
        }
    return reviver.call(obj, key, val);
  }

  // node_modules/yaml/browser/dist/nodes/toJS.js
  function toJS(value, arg, ctx) {
    if (Array.isArray(value))
      return value.map((v, i) => toJS(v, String(i), ctx));
    if (value && typeof value.toJSON == "function") {
      if (!ctx || !hasAnchor(value))
        return value.toJSON(arg, ctx);
      let data = { aliasCount: 0, count: 1, res: void 0 };
      ctx.anchors.set(value, data), ctx.onCreate = (res2) => {
        data.res = res2, delete ctx.onCreate;
      };
      let res = value.toJSON(arg, ctx);
      return ctx.onCreate && ctx.onCreate(res), res;
    }
    return typeof value == "bigint" && !ctx?.keep ? Number(value) : value;
  }

  // node_modules/yaml/browser/dist/nodes/Node.js
  var NodeBase = class {
    constructor(type) {
      Object.defineProperty(this, NODE_TYPE, { value: type });
    }
    /** Create a copy of this node.  */
    clone() {
      let copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
      return this.range && (copy.range = this.range.slice()), copy;
    }
    /** A plain JavaScript representation of this node. */
    toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
      if (!isDocument(doc))
        throw new TypeError("A document argument is required");
      let ctx = {
        anchors: /* @__PURE__ */ new Map(),
        doc,
        keep: !0,
        mapAsMap: mapAsMap === !0,
        mapKeyWarned: !1,
        maxAliasCount: typeof maxAliasCount == "number" ? maxAliasCount : 100
      }, res = toJS(this, "", ctx);
      if (typeof onAnchor == "function")
        for (let { count, res: res2 } of ctx.anchors.values())
          onAnchor(res2, count);
      return typeof reviver == "function" ? applyReviver(reviver, { "": res }, "", res) : res;
    }
  };

  // node_modules/yaml/browser/dist/nodes/Alias.js
  var Alias = class extends NodeBase {
    constructor(source) {
      super(ALIAS), this.source = source, Object.defineProperty(this, "tag", {
        set() {
          throw new Error("Alias nodes cannot have tags");
        }
      });
    }
    /**
     * Resolve the value of this alias within `doc`, finding the last
     * instance of the `source` anchor before this node.
     */
    resolve(doc, ctx) {
      if (ctx?.maxAliasCount === 0)
        throw new ReferenceError("Alias resolution is disabled");
      let nodes;
      ctx?.aliasResolveCache ? nodes = ctx.aliasResolveCache : (nodes = [], visit(doc, {
        Node: (_key, node) => {
          (isAlias(node) || hasAnchor(node)) && nodes.push(node);
        }
      }), ctx && (ctx.aliasResolveCache = nodes));
      let found;
      for (let node of nodes) {
        if (node === this)
          break;
        node.anchor === this.source && (found = node);
      }
      if (found && ctx) {
        let { anchors, doc: doc2, maxAliasCount } = ctx, data = anchors.get(found);
        if (data || (toJS(found, null, ctx), data = anchors.get(found)), data?.res === void 0) {
          let msg = "This should not happen: Alias anchor was not resolved?";
          throw new ReferenceError(msg);
        }
        if (maxAliasCount >= 0 && (data.count += 1, data.aliasCount === 0 && (data.aliasCount = getAliasCount(doc2, found, anchors)), data.count * data.aliasCount > maxAliasCount)) {
          let msg = "Excessive alias count indicates a resource exhaustion attack";
          throw new ReferenceError(msg);
        }
      }
      return found;
    }
    toJSON(_arg, ctx) {
      if (!ctx)
        return { source: this.source };
      let source = this.resolve(ctx.doc, ctx);
      if (!source) {
        let msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
        throw new ReferenceError(msg);
      }
      return ctx.anchors.get(source).res;
    }
    toString(ctx, _onComment, _onChompKeep) {
      let src = `*${this.source}`;
      if (ctx) {
        if (anchorIsValid(this.source), ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
          let msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw new Error(msg);
        }
        if (ctx.implicitKey)
          return `${src} `;
      }
      return src;
    }
  };
  function getAliasCount(doc, node, anchors) {
    if (isAlias(node)) {
      let source = node.resolve(doc), anchor = anchors && source && anchors.get(source);
      return anchor ? anchor.count * anchor.aliasCount : 0;
    } else if (isCollection(node)) {
      let count = 0;
      for (let item of node.items) {
        let c = getAliasCount(doc, item, anchors);
        c > count && (count = c);
      }
      return count;
    } else if (isPair(node)) {
      let kc = getAliasCount(doc, node.key, anchors), vc = getAliasCount(doc, node.value, anchors);
      return Math.max(kc, vc);
    }
    return 1;
  }

  // node_modules/yaml/browser/dist/nodes/Scalar.js
  var isScalarValue = (value) => !value || typeof value != "function" && typeof value != "object", Scalar = class extends NodeBase {
    constructor(value) {
      super(SCALAR), this.value = value;
    }
    toJSON(arg, ctx) {
      return ctx?.keep ? this.value : toJS(this.value, arg, ctx);
    }
    toString() {
      return String(this.value);
    }
  };
  Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
  Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
  Scalar.PLAIN = "PLAIN";
  Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
  Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";

  // node_modules/yaml/browser/dist/doc/createNode.js
  var defaultTagPrefix = "tag:yaml.org,2002:";
  function findTagObject(value, tagName, tags) {
    if (tagName) {
      let match = tags.filter((t) => t.tag === tagName), tagObj = match.find((t) => !t.format) ?? match[0];
      if (!tagObj)
        throw new Error(`Tag ${tagName} not found`);
      return tagObj;
    }
    return tags.find((t) => t.identify?.(value) && !t.format);
  }
  function createNode(value, tagName, ctx) {
    if (isDocument(value) && (value = value.contents), isNode(value))
      return value;
    if (isPair(value)) {
      let map3 = ctx.schema[MAP].createNode?.(ctx.schema, null, ctx);
      return map3.items.push(value), map3;
    }
    (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt < "u" && value instanceof BigInt) && (value = value.valueOf());
    let { aliasDuplicateObjects, onAnchor, onTagObj, schema: schema4, sourceObjects } = ctx, ref;
    if (aliasDuplicateObjects && value && typeof value == "object") {
      if (ref = sourceObjects.get(value), ref)
        return ref.anchor ?? (ref.anchor = onAnchor(value)), new Alias(ref.anchor);
      ref = { anchor: null, node: null }, sourceObjects.set(value, ref);
    }
    tagName?.startsWith("!!") && (tagName = defaultTagPrefix + tagName.slice(2));
    let tagObj = findTagObject(value, tagName, schema4.tags);
    if (!tagObj) {
      if (value && typeof value.toJSON == "function" && (value = value.toJSON()), !value || typeof value != "object") {
        let node2 = new Scalar(value);
        return ref && (ref.node = node2), node2;
      }
      tagObj = value instanceof Map ? schema4[MAP] : Symbol.iterator in Object(value) ? schema4[SEQ] : schema4[MAP];
    }
    onTagObj && (onTagObj(tagObj), delete ctx.onTagObj);
    let node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from == "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar(value);
    return tagName ? node.tag = tagName : tagObj.default || (node.tag = tagObj.tag), ref && (ref.node = node), node;
  }

  // node_modules/yaml/browser/dist/nodes/Collection.js
  function collectionFromPath(schema4, path, value) {
    let v = value;
    for (let i = path.length - 1; i >= 0; --i) {
      let k = path[i];
      if (typeof k == "number" && Number.isInteger(k) && k >= 0) {
        let a = [];
        a[k] = v, v = a;
      } else
        v = /* @__PURE__ */ new Map([[k, v]]);
    }
    return createNode(v, void 0, {
      aliasDuplicateObjects: !1,
      keepUndefined: !1,
      onAnchor: () => {
        throw new Error("This should not happen, please report a bug.");
      },
      schema: schema4,
      sourceObjects: /* @__PURE__ */ new Map()
    });
  }
  var isEmptyPath = (path) => path == null || typeof path == "object" && !!path[Symbol.iterator]().next().done, Collection = class extends NodeBase {
    constructor(type, schema4) {
      super(type), Object.defineProperty(this, "schema", {
        value: schema4,
        configurable: !0,
        enumerable: !1,
        writable: !0
      });
    }
    /**
     * Create a copy of this collection.
     *
     * @param schema - If defined, overwrites the original's schema
     */
    clone(schema4) {
      let copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
      return schema4 && (copy.schema = schema4), copy.items = copy.items.map((it) => isNode(it) || isPair(it) ? it.clone(schema4) : it), this.range && (copy.range = this.range.slice()), copy;
    }
    /**
     * Adds a value to the collection. For `!!map` and `!!omap` the value must
     * be a Pair instance or a `{ key, value }` object, which may not have a key
     * that already exists in the map.
     */
    addIn(path, value) {
      if (isEmptyPath(path))
        this.add(value);
      else {
        let [key, ...rest] = path, node = this.get(key, !0);
        if (isCollection(node))
          node.addIn(rest, value);
        else if (node === void 0 && this.schema)
          this.set(key, collectionFromPath(this.schema, rest, value));
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
    }
    /**
     * Removes a value from the collection.
     * @returns `true` if the item was found and removed.
     */
    deleteIn(path) {
      let [key, ...rest] = path;
      if (rest.length === 0)
        return this.delete(key);
      let node = this.get(key, !0);
      if (isCollection(node))
        return node.deleteIn(rest);
      throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
    }
    /**
     * Returns item at `key`, or `undefined` if not found. By default unwraps
     * scalar values from their surrounding node; to disable set `keepScalar` to
     * `true` (collections are always returned intact).
     */
    getIn(path, keepScalar) {
      let [key, ...rest] = path, node = this.get(key, !0);
      return rest.length === 0 ? !keepScalar && isScalar(node) ? node.value : node : isCollection(node) ? node.getIn(rest, keepScalar) : void 0;
    }
    hasAllNullValues(allowScalar) {
      return this.items.every((node) => {
        if (!isPair(node))
          return !1;
        let n = node.value;
        return n == null || allowScalar && isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
      });
    }
    /**
     * Checks if the collection includes a value with the key `key`.
     */
    hasIn(path) {
      let [key, ...rest] = path;
      if (rest.length === 0)
        return this.has(key);
      let node = this.get(key, !0);
      return isCollection(node) ? node.hasIn(rest) : !1;
    }
    /**
     * Sets a value in this collection. For `!!set`, `value` needs to be a
     * boolean to add/remove the item from the set.
     */
    setIn(path, value) {
      let [key, ...rest] = path;
      if (rest.length === 0)
        this.set(key, value);
      else {
        let node = this.get(key, !0);
        if (isCollection(node))
          node.setIn(rest, value);
        else if (node === void 0 && this.schema)
          this.set(key, collectionFromPath(this.schema, rest, value));
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
    }
  };

  // node_modules/yaml/browser/dist/stringify/stringifyComment.js
  var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
  function indentComment(comment, indent) {
    return /^\n+$/.test(comment) ? comment.substring(1) : indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
  }
  var lineComment = (str, indent, comment) => str.endsWith(`
`) ? indentComment(comment, indent) : comment.includes(`
`) ? `
` + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;

  // node_modules/yaml/browser/dist/stringify/foldFlowLines.js
  var FOLD_FLOW = "flow", FOLD_BLOCK = "block", FOLD_QUOTED = "quoted";
  function foldFlowLines(text3, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
    if (!lineWidth || lineWidth < 0)
      return text3;
    lineWidth < minContentWidth && (minContentWidth = 0);
    let endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
    if (text3.length <= endStep)
      return text3;
    let folds = [], escapedFolds = {}, end = lineWidth - indent.length;
    typeof indentAtStart == "number" && (indentAtStart > lineWidth - Math.max(2, minContentWidth) ? folds.push(0) : end = lineWidth - indentAtStart);
    let split, prev, overflow = !1, i = -1, escStart = -1, escEnd = -1;
    mode === FOLD_BLOCK && (i = consumeMoreIndentedLines(text3, i, indent.length), i !== -1 && (end = i + endStep));
    for (let ch; ch = text3[i += 1]; ) {
      if (mode === FOLD_QUOTED && ch === "\\") {
        switch (escStart = i, text3[i + 1]) {
          case "x":
            i += 3;
            break;
          case "u":
            i += 5;
            break;
          case "U":
            i += 9;
            break;
          default:
            i += 1;
        }
        escEnd = i;
      }
      if (ch === `
`)
        mode === FOLD_BLOCK && (i = consumeMoreIndentedLines(text3, i, indent.length)), end = i + indent.length + endStep, split = void 0;
      else {
        if (ch === " " && prev && prev !== " " && prev !== `
` && prev !== "	") {
          let next = text3[i + 1];
          next && next !== " " && next !== `
` && next !== "	" && (split = i);
        }
        if (i >= end)
          if (split)
            folds.push(split), end = split + endStep, split = void 0;
          else if (mode === FOLD_QUOTED) {
            for (; prev === " " || prev === "	"; )
              prev = ch, ch = text3[i += 1], overflow = !0;
            let j = i > escEnd + 1 ? i - 2 : escStart - 1;
            if (escapedFolds[j])
              return text3;
            folds.push(j), escapedFolds[j] = !0, end = j + endStep, split = void 0;
          } else
            overflow = !0;
      }
      prev = ch;
    }
    if (overflow && onOverflow && onOverflow(), folds.length === 0)
      return text3;
    onFold && onFold();
    let res = text3.slice(0, folds[0]);
    for (let i2 = 0; i2 < folds.length; ++i2) {
      let fold = folds[i2], end2 = folds[i2 + 1] || text3.length;
      fold === 0 ? res = `
${indent}${text3.slice(0, end2)}` : (mode === FOLD_QUOTED && escapedFolds[fold] && (res += `${text3[fold]}\\`), res += `
${indent}${text3.slice(fold + 1, end2)}`);
    }
    return res;
  }
  function consumeMoreIndentedLines(text3, i, indent) {
    let end = i, start = i + 1, ch = text3[start];
    for (; ch === " " || ch === "	"; )
      if (i < start + indent)
        ch = text3[++i];
      else {
        do
          ch = text3[++i];
        while (ch && ch !== `
`);
        end = i, start = i + 1, ch = text3[start];
      }
    return end;
  }

  // node_modules/yaml/browser/dist/stringify/stringifyString.js
  var getFoldOptions = (ctx, isBlock2) => ({
    indentAtStart: isBlock2 ? ctx.indent.length : ctx.indentAtStart,
    lineWidth: ctx.options.lineWidth,
    minContentWidth: ctx.options.minContentWidth
  }), containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
  function lineLengthOverLimit(str, lineWidth, indentLength) {
    if (!lineWidth || lineWidth < 0)
      return !1;
    let limit = lineWidth - indentLength, strLen = str.length;
    if (strLen <= limit)
      return !1;
    for (let i = 0, start = 0; i < strLen; ++i)
      if (str[i] === `
`) {
        if (i - start > limit)
          return !0;
        if (start = i + 1, strLen - start <= limit)
          return !1;
      }
    return !0;
  }
  function doubleQuotedString(value, ctx) {
    let json = JSON.stringify(value);
    if (ctx.options.doubleQuotedAsJSON)
      return json;
    let { implicitKey } = ctx, minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength, indent = ctx.indent || (containsDocumentMarker(value) ? "  " : ""), str = "", start = 0;
    for (let i = 0, ch = json[i]; ch; ch = json[++i])
      if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n" && (str += json.slice(start, i) + "\\ ", i += 1, start = i, ch = "\\"), ch === "\\")
        switch (json[i + 1]) {
          case "u":
            {
              str += json.slice(start, i);
              let code2 = json.substr(i + 2, 4);
              switch (code2) {
                case "0000":
                  str += "\\0";
                  break;
                case "0007":
                  str += "\\a";
                  break;
                case "000b":
                  str += "\\v";
                  break;
                case "001b":
                  str += "\\e";
                  break;
                case "0085":
                  str += "\\N";
                  break;
                case "00a0":
                  str += "\\_";
                  break;
                case "2028":
                  str += "\\L";
                  break;
                case "2029":
                  str += "\\P";
                  break;
                default:
                  code2.substr(0, 2) === "00" ? str += "\\x" + code2.substr(2) : str += json.substr(i, 6);
              }
              i += 5, start = i + 1;
            }
            break;
          case "n":
            if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength)
              i += 1;
            else {
              for (str += json.slice(start, i) + `

`; json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== '"'; )
                str += `
`, i += 2;
              str += indent, json[i + 2] === " " && (str += "\\"), i += 1, start = i + 1;
            }
            break;
          default:
            i += 1;
        }
    return str = start ? str + json.slice(start) : json, implicitKey ? str : foldFlowLines(str, indent, FOLD_QUOTED, getFoldOptions(ctx, !1));
  }
  function singleQuotedString(value, ctx) {
    if (ctx.options.singleQuote === !1 || ctx.implicitKey && value.includes(`
`) || /[ \t]\n|\n[ \t]/.test(value))
      return doubleQuotedString(value, ctx);
    let indent = ctx.indent || (containsDocumentMarker(value) ? "  " : ""), res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
    return ctx.implicitKey ? res : foldFlowLines(res, indent, FOLD_FLOW, getFoldOptions(ctx, !1));
  }
  function quotedString(value, ctx) {
    let { singleQuote } = ctx.options, qs;
    if (singleQuote === !1)
      qs = doubleQuotedString;
    else {
      let hasDouble = value.includes('"'), hasSingle = value.includes("'");
      hasDouble && !hasSingle ? qs = singleQuotedString : hasSingle && !hasDouble ? qs = doubleQuotedString : qs = singleQuote ? singleQuotedString : doubleQuotedString;
    }
    return qs(value, ctx);
  }
  var blockEndNewlines;
  try {
    blockEndNewlines = new RegExp(`(^|(?<!
))
+(?!
|$)`, "g");
  } catch {
    blockEndNewlines = /\n+(?!\n|$)/g;
  }
  function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
    let { blockQuote, commentString, lineWidth } = ctx.options;
    if (!blockQuote || /\n[\t ]+$/.test(value))
      return quotedString(value, ctx);
    let indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : ""), literal = blockQuote === "literal" ? !0 : blockQuote === "folded" || type === Scalar.BLOCK_FOLDED ? !1 : type === Scalar.BLOCK_LITERAL ? !0 : !lineLengthOverLimit(value, lineWidth, indent.length);
    if (!value)
      return literal ? `|
` : `>
`;
    let chomp, endStart;
    for (endStart = value.length; endStart > 0; --endStart) {
      let ch = value[endStart - 1];
      if (ch !== `
` && ch !== "	" && ch !== " ")
        break;
    }
    let end = value.substring(endStart), endNlPos = end.indexOf(`
`);
    endNlPos === -1 ? chomp = "-" : value === end || endNlPos !== end.length - 1 ? (chomp = "+", onChompKeep && onChompKeep()) : chomp = "", end && (value = value.slice(0, -end.length), end[end.length - 1] === `
` && (end = end.slice(0, -1)), end = end.replace(blockEndNewlines, `$&${indent}`));
    let startWithSpace = !1, startEnd, startNlPos = -1;
    for (startEnd = 0; startEnd < value.length; ++startEnd) {
      let ch = value[startEnd];
      if (ch === " ")
        startWithSpace = !0;
      else if (ch === `
`)
        startNlPos = startEnd;
      else
        break;
    }
    let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
    start && (value = value.substring(start.length), start = start.replace(/\n+/g, `$&${indent}`));
    let header = (startWithSpace ? indent ? "2" : "1" : "") + chomp;
    if (comment && (header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " ")), onComment && onComment()), !literal) {
      let foldedValue = value.replace(/\n+/g, `
$&`).replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`), literalFallback = !1, foldOptions = getFoldOptions(ctx, !0);
      blockQuote !== "folded" && type !== Scalar.BLOCK_FOLDED && (foldOptions.onOverflow = () => {
        literalFallback = !0;
      });
      let body = foldFlowLines(`${start}${foldedValue}${end}`, indent, FOLD_BLOCK, foldOptions);
      if (!literalFallback)
        return `>${header}
${indent}${body}`;
    }
    return value = value.replace(/\n+/g, `$&${indent}`), `|${header}
${indent}${start}${value}${end}`;
  }
  function plainString(item, ctx, onComment, onChompKeep) {
    let { type, value } = item, { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
    if (implicitKey && value.includes(`
`) || inFlow && /[[\]{},]/.test(value))
      return quotedString(value, ctx);
    if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value))
      return implicitKey || inFlow || !value.includes(`
`) ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
    if (!implicitKey && !inFlow && type !== Scalar.PLAIN && value.includes(`
`))
      return blockString(item, ctx, onComment, onChompKeep);
    if (containsDocumentMarker(value)) {
      if (indent === "")
        return ctx.forceBlockIndent = !0, blockString(item, ctx, onComment, onChompKeep);
      if (implicitKey && indent === indentStep)
        return quotedString(value, ctx);
    }
    let str = value.replace(/\n+/g, `$&
${indent}`);
    if (actualString) {
      let test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str), { compat, tags } = ctx.doc.schema;
      if (tags.some(test) || compat?.some(test))
        return quotedString(value, ctx);
    }
    return implicitKey ? str : foldFlowLines(str, indent, FOLD_FLOW, getFoldOptions(ctx, !1));
  }
  function stringifyString(item, ctx, onComment, onChompKeep) {
    let { implicitKey, inFlow } = ctx, ss = typeof item.value == "string" ? item : Object.assign({}, item, { value: String(item.value) }), { type } = item;
    type !== Scalar.QUOTE_DOUBLE && /[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value) && (type = Scalar.QUOTE_DOUBLE);
    let _stringify = (_type) => {
      switch (_type) {
        case Scalar.BLOCK_FOLDED:
        case Scalar.BLOCK_LITERAL:
          return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
        case Scalar.QUOTE_DOUBLE:
          return doubleQuotedString(ss.value, ctx);
        case Scalar.QUOTE_SINGLE:
          return singleQuotedString(ss.value, ctx);
        case Scalar.PLAIN:
          return plainString(ss, ctx, onComment, onChompKeep);
        default:
          return null;
      }
    }, res = _stringify(type);
    if (res === null) {
      let { defaultKeyType, defaultStringType } = ctx.options, t = implicitKey && defaultKeyType || defaultStringType;
      if (res = _stringify(t), res === null)
        throw new Error(`Unsupported default string type ${t}`);
    }
    return res;
  }

  // node_modules/yaml/browser/dist/stringify/stringify.js
  function createStringifyContext(doc, options) {
    let opt = Object.assign({
      blockQuote: !0,
      commentString: stringifyComment,
      defaultKeyType: null,
      defaultStringType: "PLAIN",
      directives: null,
      doubleQuotedAsJSON: !1,
      doubleQuotedMinMultiLineLength: 40,
      falseStr: "false",
      flowCollectionPadding: !0,
      indentSeq: !0,
      lineWidth: 80,
      minContentWidth: 20,
      nullStr: "null",
      simpleKeys: !1,
      singleQuote: null,
      trailingComma: !1,
      trueStr: "true",
      verifyAliasOrder: !0
    }, doc.schema.toStringOptions, options), inFlow;
    switch (opt.collectionStyle) {
      case "block":
        inFlow = !1;
        break;
      case "flow":
        inFlow = !0;
        break;
      default:
        inFlow = null;
    }
    return {
      anchors: /* @__PURE__ */ new Set(),
      doc,
      flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
      indent: "",
      indentStep: typeof opt.indent == "number" ? " ".repeat(opt.indent) : "  ",
      inFlow,
      options: opt
    };
  }
  function getTagObject(tags, item) {
    if (item.tag) {
      let match = tags.filter((t) => t.tag === item.tag);
      if (match.length > 0)
        return match.find((t) => t.format === item.format) ?? match[0];
    }
    let tagObj, obj;
    if (isScalar(item)) {
      obj = item.value;
      let match = tags.filter((t) => t.identify?.(obj));
      if (match.length > 1) {
        let testMatch = match.filter((t) => t.test);
        testMatch.length > 0 && (match = testMatch);
      }
      tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
    } else
      obj = item, tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
    if (!tagObj) {
      let name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
      throw new Error(`Tag not resolved for ${name} value`);
    }
    return tagObj;
  }
  function stringifyProps(node, tagObj, { anchors, doc }) {
    if (!doc.directives)
      return "";
    let props = [], anchor = (isScalar(node) || isCollection(node)) && node.anchor;
    anchor && anchorIsValid(anchor) && (anchors.add(anchor), props.push(`&${anchor}`));
    let tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
    return tag && props.push(doc.directives.tagString(tag)), props.join(" ");
  }
  function stringify(item, ctx, onComment, onChompKeep) {
    if (isPair(item))
      return item.toString(ctx, onComment, onChompKeep);
    if (isAlias(item)) {
      if (ctx.doc.directives)
        return item.toString(ctx);
      if (ctx.resolvedAliases?.has(item))
        throw new TypeError("Cannot stringify circular structure without alias nodes");
      ctx.resolvedAliases ? ctx.resolvedAliases.add(item) : ctx.resolvedAliases = /* @__PURE__ */ new Set([item]), item = item.resolve(ctx.doc);
    }
    let tagObj, node = isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
    tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
    let props = stringifyProps(node, tagObj, ctx);
    props.length > 0 && (ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1);
    let str = typeof tagObj.stringify == "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : isScalar(node) ? stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
    return props ? isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}
${ctx.indent}${str}` : str;
  }

  // node_modules/yaml/browser/dist/stringify/stringifyPair.js
  function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
    let { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx, keyComment = isNode(key) && key.comment || null;
    if (simpleKeys) {
      if (keyComment)
        throw new Error("With simple keys, key nodes cannot have comments");
      if (isCollection(key) || !isNode(key) && typeof key == "object") {
        let msg = "With simple keys, collection cannot be used as a key value";
        throw new Error(msg);
      }
    }
    let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || isCollection(key) || (isScalar(key) ? key.type === Scalar.BLOCK_FOLDED || key.type === Scalar.BLOCK_LITERAL : typeof key == "object"));
    ctx = Object.assign({}, ctx, {
      allNullValues: !1,
      implicitKey: !explicitKey && (simpleKeys || !allNullValues),
      indent: indent + indentStep
    });
    let keyCommentDone = !1, chompKeep = !1, str = stringify(key, ctx, () => keyCommentDone = !0, () => chompKeep = !0);
    if (!explicitKey && !ctx.inFlow && str.length > 1024) {
      if (simpleKeys)
        throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
      explicitKey = !0;
    }
    if (ctx.inFlow) {
      if (allNullValues || value == null)
        return keyCommentDone && onComment && onComment(), str === "" ? "?" : explicitKey ? `? ${str}` : str;
    } else if (allNullValues && !simpleKeys || value == null && explicitKey)
      return str = `? ${str}`, keyComment && !keyCommentDone ? str += lineComment(str, ctx.indent, commentString(keyComment)) : chompKeep && onChompKeep && onChompKeep(), str;
    keyCommentDone && (keyComment = null), explicitKey ? (keyComment && (str += lineComment(str, ctx.indent, commentString(keyComment))), str = `? ${str}
${indent}:`) : (str = `${str}:`, keyComment && (str += lineComment(str, ctx.indent, commentString(keyComment))));
    let vsb, vcb, valueComment;
    isNode(value) ? (vsb = !!value.spaceBefore, vcb = value.commentBefore, valueComment = value.comment) : (vsb = !1, vcb = null, valueComment = null, value && typeof value == "object" && (value = doc.createNode(value))), ctx.implicitKey = !1, !explicitKey && !keyComment && isScalar(value) && (ctx.indentAtStart = str.length + 1), chompKeep = !1, !indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && isSeq(value) && !value.flow && !value.tag && !value.anchor && (ctx.indent = ctx.indent.substring(2));
    let valueCommentDone = !1, valueStr = stringify(value, ctx, () => valueCommentDone = !0, () => chompKeep = !0), ws = " ";
    if (keyComment || vsb || vcb) {
      if (ws = vsb ? `
` : "", vcb) {
        let cs = commentString(vcb);
        ws += `
${indentComment(cs, ctx.indent)}`;
      }
      valueStr === "" && !ctx.inFlow ? ws === `
` && valueComment && (ws = `

`) : ws += `
${ctx.indent}`;
    } else if (!explicitKey && isCollection(value)) {
      let vs0 = valueStr[0], nl0 = valueStr.indexOf(`
`), hasNewline = nl0 !== -1, flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
      if (hasNewline || !flow) {
        let hasPropsLine = !1;
        if (hasNewline && (vs0 === "&" || vs0 === "!")) {
          let sp0 = valueStr.indexOf(" ");
          vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!" && (sp0 = valueStr.indexOf(" ", sp0 + 1)), (sp0 === -1 || nl0 < sp0) && (hasPropsLine = !0);
        }
        hasPropsLine || (ws = `
${ctx.indent}`);
      }
    } else (valueStr === "" || valueStr[0] === `
`) && (ws = "");
    return str += ws + valueStr, ctx.inFlow ? valueCommentDone && onComment && onComment() : valueComment && !valueCommentDone ? str += lineComment(str, ctx.indent, commentString(valueComment)) : chompKeep && onChompKeep && onChompKeep(), str;
  }

  // node_modules/yaml/browser/dist/log.js
  function warn(logLevel, warning) {
    (logLevel === "debug" || logLevel === "warn") && console.warn(warning);
  }

  // node_modules/yaml/browser/dist/schema/yaml-1.1/merge.js
  var MERGE_KEY = "<<", merge = {
    identify: (value) => value === MERGE_KEY || typeof value == "symbol" && value.description === MERGE_KEY,
    default: "key",
    tag: "tag:yaml.org,2002:merge",
    test: /^<<$/,
    resolve: () => Object.assign(new Scalar(Symbol(MERGE_KEY)), {
      addToJSMap: addMergeToJSMap
    }),
    stringify: () => MERGE_KEY
  }, isMergeKey = (ctx, key) => (merge.identify(key) || isScalar(key) && (!key.type || key.type === Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
  function addMergeToJSMap(ctx, map3, value) {
    let source = resolveAliasValue(ctx, value);
    if (isSeq(source))
      for (let it of source.items)
        mergeValue(ctx, map3, it);
    else if (Array.isArray(source))
      for (let it of source)
        mergeValue(ctx, map3, it);
    else
      mergeValue(ctx, map3, source);
  }
  function mergeValue(ctx, map3, value) {
    let source = resolveAliasValue(ctx, value);
    if (!isMap(source))
      throw new Error("Merge sources must be maps or map aliases");
    let srcMap = source.toJSON(null, ctx, Map);
    for (let [key, value2] of srcMap)
      map3 instanceof Map ? map3.has(key) || map3.set(key, value2) : map3 instanceof Set ? map3.add(key) : Object.prototype.hasOwnProperty.call(map3, key) || Object.defineProperty(map3, key, {
        value: value2,
        writable: !0,
        enumerable: !0,
        configurable: !0
      });
    return map3;
  }
  function resolveAliasValue(ctx, value) {
    return ctx && isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
  }

  // node_modules/yaml/browser/dist/nodes/addPairToJSMap.js
  function addPairToJSMap(ctx, map3, { key, value }) {
    if (isNode(key) && key.addToJSMap)
      key.addToJSMap(ctx, map3, value);
    else if (isMergeKey(ctx, key))
      addMergeToJSMap(ctx, map3, value);
    else {
      let jsKey = toJS(key, "", ctx);
      if (map3 instanceof Map)
        map3.set(jsKey, toJS(value, jsKey, ctx));
      else if (map3 instanceof Set)
        map3.add(jsKey);
      else {
        let stringKey = stringifyKey(key, jsKey, ctx), jsValue = toJS(value, stringKey, ctx);
        stringKey in map3 ? Object.defineProperty(map3, stringKey, {
          value: jsValue,
          writable: !0,
          enumerable: !0,
          configurable: !0
        }) : map3[stringKey] = jsValue;
      }
    }
    return map3;
  }
  function stringifyKey(key, jsKey, ctx) {
    if (jsKey === null)
      return "";
    if (typeof jsKey != "object")
      return String(jsKey);
    if (isNode(key) && ctx?.doc) {
      let strCtx = createStringifyContext(ctx.doc, {});
      strCtx.anchors = /* @__PURE__ */ new Set();
      for (let node of ctx.anchors.keys())
        strCtx.anchors.add(node.anchor);
      strCtx.inFlow = !0, strCtx.inStringifyKey = !0;
      let strKey = key.toString(strCtx);
      if (!ctx.mapKeyWarned) {
        let jsonStr = JSON.stringify(strKey);
        jsonStr.length > 40 && (jsonStr = jsonStr.substring(0, 36) + '..."'), warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`), ctx.mapKeyWarned = !0;
      }
      return strKey;
    }
    return JSON.stringify(jsKey);
  }

  // node_modules/yaml/browser/dist/nodes/Pair.js
  function createPair(key, value, ctx) {
    let k = createNode(key, void 0, ctx), v = createNode(value, void 0, ctx);
    return new Pair(k, v);
  }
  var Pair = class _Pair {
    constructor(key, value = null) {
      Object.defineProperty(this, NODE_TYPE, { value: PAIR }), this.key = key, this.value = value;
    }
    clone(schema4) {
      let { key, value } = this;
      return isNode(key) && (key = key.clone(schema4)), isNode(value) && (value = value.clone(schema4)), new _Pair(key, value);
    }
    toJSON(_, ctx) {
      let pair = ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
      return addPairToJSMap(ctx, pair, this);
    }
    toString(ctx, onComment, onChompKeep) {
      return ctx?.doc ? stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
    }
  };

  // node_modules/yaml/browser/dist/stringify/stringifyCollection.js
  function stringifyCollection(collection, ctx, options) {
    return (ctx.inFlow ?? collection.flow ? stringifyFlowCollection : stringifyBlockCollection)(collection, ctx, options);
  }
  function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
    let { indent, options: { commentString } } = ctx, itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null }), chompKeep = !1, lines = [];
    for (let i = 0; i < items.length; ++i) {
      let item = items[i], comment2 = null;
      if (isNode(item))
        !chompKeep && item.spaceBefore && lines.push(""), addCommentBefore(ctx, lines, item.commentBefore, chompKeep), item.comment && (comment2 = item.comment);
      else if (isPair(item)) {
        let ik = isNode(item.key) ? item.key : null;
        ik && (!chompKeep && ik.spaceBefore && lines.push(""), addCommentBefore(ctx, lines, ik.commentBefore, chompKeep));
      }
      chompKeep = !1;
      let str2 = stringify(item, itemCtx, () => comment2 = null, () => chompKeep = !0);
      comment2 && (str2 += lineComment(str2, itemIndent, commentString(comment2))), chompKeep && comment2 && (chompKeep = !1), lines.push(blockItemPrefix + str2);
    }
    let str;
    if (lines.length === 0)
      str = flowChars.start + flowChars.end;
    else {
      str = lines[0];
      for (let i = 1; i < lines.length; ++i) {
        let line = lines[i];
        str += line ? `
${indent}${line}` : `
`;
      }
    }
    return comment ? (str += `
` + indentComment(commentString(comment), indent), onComment && onComment()) : chompKeep && onChompKeep && onChompKeep(), str;
  }
  function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
    let { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
    itemIndent += indentStep;
    let itemCtx = Object.assign({}, ctx, {
      indent: itemIndent,
      inFlow: !0,
      type: null
    }), reqNewline = !1, linesAtValue = 0, lines = [];
    for (let i = 0; i < items.length; ++i) {
      let item = items[i], comment = null;
      if (isNode(item))
        item.spaceBefore && lines.push(""), addCommentBefore(ctx, lines, item.commentBefore, !1), item.comment && (comment = item.comment);
      else if (isPair(item)) {
        let ik = isNode(item.key) ? item.key : null;
        ik && (ik.spaceBefore && lines.push(""), addCommentBefore(ctx, lines, ik.commentBefore, !1), ik.comment && (reqNewline = !0));
        let iv = isNode(item.value) ? item.value : null;
        iv ? (iv.comment && (comment = iv.comment), iv.commentBefore && (reqNewline = !0)) : item.value == null && ik?.comment && (comment = ik.comment);
      }
      comment && (reqNewline = !0);
      let str = stringify(item, itemCtx, () => comment = null);
      reqNewline || (reqNewline = lines.length > linesAtValue || str.includes(`
`)), i < items.length - 1 ? str += "," : ctx.options.trailingComma && (ctx.options.lineWidth > 0 && (reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth)), reqNewline && (str += ",")), comment && (str += lineComment(str, itemIndent, commentString(comment))), lines.push(str), linesAtValue = lines.length;
    }
    let { start, end } = flowChars;
    if (lines.length === 0)
      return start + end;
    if (!reqNewline) {
      let len = lines.reduce((sum, line) => sum + line.length + 2, 2);
      reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
    }
    if (reqNewline) {
      let str = start;
      for (let line of lines)
        str += line ? `
${indentStep}${indent}${line}` : `
`;
      return `${str}
${indent}${end}`;
    } else
      return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
  }
  function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
    if (comment && chompKeep && (comment = comment.replace(/^\n+/, "")), comment) {
      let ic = indentComment(commentString(comment), indent);
      lines.push(ic.trimStart());
    }
  }

  // node_modules/yaml/browser/dist/nodes/YAMLMap.js
  function findPair(items, key) {
    let k = isScalar(key) ? key.value : key;
    for (let it of items)
      if (isPair(it) && (it.key === key || it.key === k || isScalar(it.key) && it.key.value === k))
        return it;
  }
  var YAMLMap = class extends Collection {
    static get tagName() {
      return "tag:yaml.org,2002:map";
    }
    constructor(schema4) {
      super(MAP, schema4), this.items = [];
    }
    /**
     * A generic collection parsing method that can be extended
     * to other node classes that inherit from YAMLMap
     */
    static from(schema4, obj, ctx) {
      let { keepUndefined, replacer } = ctx, map3 = new this(schema4), add = (key, value) => {
        if (typeof replacer == "function")
          value = replacer.call(obj, key, value);
        else if (Array.isArray(replacer) && !replacer.includes(key))
          return;
        (value !== void 0 || keepUndefined) && map3.items.push(createPair(key, value, ctx));
      };
      if (obj instanceof Map)
        for (let [key, value] of obj)
          add(key, value);
      else if (obj && typeof obj == "object")
        for (let key of Object.keys(obj))
          add(key, obj[key]);
      return typeof schema4.sortMapEntries == "function" && map3.items.sort(schema4.sortMapEntries), map3;
    }
    /**
     * Adds a value to the collection.
     *
     * @param overwrite - If not set `true`, using a key that is already in the
     *   collection will throw. Otherwise, overwrites the previous value.
     */
    add(pair, overwrite) {
      let _pair;
      isPair(pair) ? _pair = pair : !pair || typeof pair != "object" || !("key" in pair) ? _pair = new Pair(pair, pair?.value) : _pair = new Pair(pair.key, pair.value);
      let prev = findPair(this.items, _pair.key), sortEntries = this.schema?.sortMapEntries;
      if (prev) {
        if (!overwrite)
          throw new Error(`Key ${_pair.key} already set`);
        isScalar(prev.value) && isScalarValue(_pair.value) ? prev.value.value = _pair.value : prev.value = _pair.value;
      } else if (sortEntries) {
        let i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
        i === -1 ? this.items.push(_pair) : this.items.splice(i, 0, _pair);
      } else
        this.items.push(_pair);
    }
    delete(key) {
      let it = findPair(this.items, key);
      return it ? this.items.splice(this.items.indexOf(it), 1).length > 0 : !1;
    }
    get(key, keepScalar) {
      let node = findPair(this.items, key)?.value;
      return (!keepScalar && isScalar(node) ? node.value : node) ?? void 0;
    }
    has(key) {
      return !!findPair(this.items, key);
    }
    set(key, value) {
      this.add(new Pair(key, value), !0);
    }
    /**
     * @param ctx - Conversion context, originally set in Document#toJS()
     * @param {Class} Type - If set, forces the returned collection type
     * @returns Instance of Type, Map, or Object
     */
    toJSON(_, ctx, Type) {
      let map3 = Type ? new Type() : ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
      ctx?.onCreate && ctx.onCreate(map3);
      for (let item of this.items)
        addPairToJSMap(ctx, map3, item);
      return map3;
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx)
        return JSON.stringify(this);
      for (let item of this.items)
        if (!isPair(item))
          throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
      return !ctx.allNullValues && this.hasAllNullValues(!1) && (ctx = Object.assign({}, ctx, { allNullValues: !0 })), stringifyCollection(this, ctx, {
        blockItemPrefix: "",
        flowChars: { start: "{", end: "}" },
        itemIndent: ctx.indent || "",
        onChompKeep,
        onComment
      });
    }
  };

  // node_modules/yaml/browser/dist/schema/common/map.js
  var map = {
    collection: "map",
    default: !0,
    nodeClass: YAMLMap,
    tag: "tag:yaml.org,2002:map",
    resolve(map3, onError) {
      return isMap(map3) || onError("Expected a mapping for this tag"), map3;
    },
    createNode: (schema4, obj, ctx) => YAMLMap.from(schema4, obj, ctx)
  };

  // node_modules/yaml/browser/dist/nodes/YAMLSeq.js
  var YAMLSeq = class extends Collection {
    static get tagName() {
      return "tag:yaml.org,2002:seq";
    }
    constructor(schema4) {
      super(SEQ, schema4), this.items = [];
    }
    add(value) {
      this.items.push(value);
    }
    /**
     * Removes a value from the collection.
     *
     * `key` must contain a representation of an integer for this to succeed.
     * It may be wrapped in a `Scalar`.
     *
     * @returns `true` if the item was found and removed.
     */
    delete(key) {
      let idx = asItemIndex(key);
      return typeof idx != "number" ? !1 : this.items.splice(idx, 1).length > 0;
    }
    get(key, keepScalar) {
      let idx = asItemIndex(key);
      if (typeof idx != "number")
        return;
      let it = this.items[idx];
      return !keepScalar && isScalar(it) ? it.value : it;
    }
    /**
     * Checks if the collection includes a value with the key `key`.
     *
     * `key` must contain a representation of an integer for this to succeed.
     * It may be wrapped in a `Scalar`.
     */
    has(key) {
      let idx = asItemIndex(key);
      return typeof idx == "number" && idx < this.items.length;
    }
    /**
     * Sets a value in this collection. For `!!set`, `value` needs to be a
     * boolean to add/remove the item from the set.
     *
     * If `key` does not contain a representation of an integer, this will throw.
     * It may be wrapped in a `Scalar`.
     */
    set(key, value) {
      let idx = asItemIndex(key);
      if (typeof idx != "number")
        throw new Error(`Expected a valid index, not ${key}.`);
      let prev = this.items[idx];
      isScalar(prev) && isScalarValue(value) ? prev.value = value : this.items[idx] = value;
    }
    toJSON(_, ctx) {
      let seq2 = [];
      ctx?.onCreate && ctx.onCreate(seq2);
      let i = 0;
      for (let item of this.items)
        seq2.push(toJS(item, String(i++), ctx));
      return seq2;
    }
    toString(ctx, onComment, onChompKeep) {
      return ctx ? stringifyCollection(this, ctx, {
        blockItemPrefix: "- ",
        flowChars: { start: "[", end: "]" },
        itemIndent: (ctx.indent || "") + "  ",
        onChompKeep,
        onComment
      }) : JSON.stringify(this);
    }
    static from(schema4, obj, ctx) {
      let { replacer } = ctx, seq2 = new this(schema4);
      if (obj && Symbol.iterator in Object(obj)) {
        let i = 0;
        for (let it of obj) {
          if (typeof replacer == "function") {
            let key = obj instanceof Set ? it : String(i++);
            it = replacer.call(obj, key, it);
          }
          seq2.items.push(createNode(it, void 0, ctx));
        }
      }
      return seq2;
    }
  };
  function asItemIndex(key) {
    let idx = isScalar(key) ? key.value : key;
    return idx && typeof idx == "string" && (idx = Number(idx)), typeof idx == "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
  }

  // node_modules/yaml/browser/dist/schema/common/seq.js
  var seq = {
    collection: "seq",
    default: !0,
    nodeClass: YAMLSeq,
    tag: "tag:yaml.org,2002:seq",
    resolve(seq2, onError) {
      return isSeq(seq2) || onError("Expected a sequence for this tag"), seq2;
    },
    createNode: (schema4, obj, ctx) => YAMLSeq.from(schema4, obj, ctx)
  };

  // node_modules/yaml/browser/dist/schema/common/string.js
  var string = {
    identify: (value) => typeof value == "string",
    default: !0,
    tag: "tag:yaml.org,2002:str",
    resolve: (str) => str,
    stringify(item, ctx, onComment, onChompKeep) {
      return ctx = Object.assign({ actualString: !0 }, ctx), stringifyString(item, ctx, onComment, onChompKeep);
    }
  };

  // node_modules/yaml/browser/dist/schema/common/null.js
  var nullTag = {
    identify: (value) => value == null,
    createNode: () => new Scalar(null),
    default: !0,
    tag: "tag:yaml.org,2002:null",
    test: /^(?:~|[Nn]ull|NULL)?$/,
    resolve: () => new Scalar(null),
    stringify: ({ source }, ctx) => typeof source == "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
  };

  // node_modules/yaml/browser/dist/schema/core/bool.js
  var boolTag = {
    identify: (value) => typeof value == "boolean",
    default: !0,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
    resolve: (str) => new Scalar(str[0] === "t" || str[0] === "T"),
    stringify({ source, value }, ctx) {
      if (source && boolTag.test.test(source)) {
        let sv = source[0] === "t" || source[0] === "T";
        if (value === sv)
          return source;
      }
      return value ? ctx.options.trueStr : ctx.options.falseStr;
    }
  };

  // node_modules/yaml/browser/dist/stringify/stringifyNumber.js
  function stringifyNumber({ format: format2, minFractionDigits, tag, value }) {
    if (typeof value == "bigint")
      return String(value);
    let num = typeof value == "number" ? value : Number(value);
    if (!isFinite(num))
      return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
    let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
    if (!format2 && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n) && !n.includes("e")) {
      let i = n.indexOf(".");
      i < 0 && (i = n.length, n += ".");
      let d = minFractionDigits - (n.length - i - 1);
      for (; d-- > 0; )
        n += "0";
    }
    return n;
  }

  // node_modules/yaml/browser/dist/schema/core/float.js
  var floatNaN = {
    identify: (value) => typeof value == "number",
    default: !0,
    tag: "tag:yaml.org,2002:float",
    test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
    resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
    stringify: stringifyNumber
  }, floatExp = {
    identify: (value) => typeof value == "number",
    default: !0,
    tag: "tag:yaml.org,2002:float",
    format: "EXP",
    test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
    resolve: (str) => parseFloat(str),
    stringify(node) {
      let num = Number(node.value);
      return isFinite(num) ? num.toExponential() : stringifyNumber(node);
    }
  }, float = {
    identify: (value) => typeof value == "number",
    default: !0,
    tag: "tag:yaml.org,2002:float",
    test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
    resolve(str) {
      let node = new Scalar(parseFloat(str)), dot = str.indexOf(".");
      return dot !== -1 && str[str.length - 1] === "0" && (node.minFractionDigits = str.length - dot - 1), node;
    },
    stringify: stringifyNumber
  };

  // node_modules/yaml/browser/dist/schema/core/int.js
  var intIdentify = (value) => typeof value == "bigint" || Number.isInteger(value), intResolve = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
  function intStringify(node, radix, prefix) {
    let { value } = node;
    return intIdentify(value) && value >= 0 ? prefix + value.toString(radix) : stringifyNumber(node);
  }
  var intOct = {
    identify: (value) => intIdentify(value) && value >= 0,
    default: !0,
    tag: "tag:yaml.org,2002:int",
    format: "OCT",
    test: /^0o[0-7]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
    stringify: (node) => intStringify(node, 8, "0o")
  }, int = {
    identify: intIdentify,
    default: !0,
    tag: "tag:yaml.org,2002:int",
    test: /^[-+]?[0-9]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
    stringify: stringifyNumber
  }, intHex = {
    identify: (value) => intIdentify(value) && value >= 0,
    default: !0,
    tag: "tag:yaml.org,2002:int",
    format: "HEX",
    test: /^0x[0-9a-fA-F]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
    stringify: (node) => intStringify(node, 16, "0x")
  };

  // node_modules/yaml/browser/dist/schema/core/schema.js
  var schema = [
    map,
    seq,
    string,
    nullTag,
    boolTag,
    intOct,
    int,
    intHex,
    floatNaN,
    floatExp,
    float
  ];

  // node_modules/yaml/browser/dist/schema/json/schema.js
  function intIdentify2(value) {
    return typeof value == "bigint" || Number.isInteger(value);
  }
  var stringifyJSON = ({ value }) => JSON.stringify(value), jsonScalars = [
    {
      identify: (value) => typeof value == "string",
      default: !0,
      tag: "tag:yaml.org,2002:str",
      resolve: (str) => str,
      stringify: stringifyJSON
    },
    {
      identify: (value) => value == null,
      createNode: () => new Scalar(null),
      default: !0,
      tag: "tag:yaml.org,2002:null",
      test: /^null$/,
      resolve: () => null,
      stringify: stringifyJSON
    },
    {
      identify: (value) => typeof value == "boolean",
      default: !0,
      tag: "tag:yaml.org,2002:bool",
      test: /^true$|^false$/,
      resolve: (str) => str === "true",
      stringify: stringifyJSON
    },
    {
      identify: intIdentify2,
      default: !0,
      tag: "tag:yaml.org,2002:int",
      test: /^-?(?:0|[1-9][0-9]*)$/,
      resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
      stringify: ({ value }) => intIdentify2(value) ? value.toString() : JSON.stringify(value)
    },
    {
      identify: (value) => typeof value == "number",
      default: !0,
      tag: "tag:yaml.org,2002:float",
      test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
      resolve: (str) => parseFloat(str),
      stringify: stringifyJSON
    }
  ], jsonError = {
    default: !0,
    tag: "",
    test: /^/,
    resolve(str, onError) {
      return onError(`Unresolved plain scalar ${JSON.stringify(str)}`), str;
    }
  }, schema2 = [map, seq].concat(jsonScalars, jsonError);

  // node_modules/yaml/browser/dist/schema/yaml-1.1/binary.js
  var binary = {
    identify: (value) => value instanceof Uint8Array,
    // Buffer inherits from Uint8Array
    default: !1,
    tag: "tag:yaml.org,2002:binary",
    /**
     * Returns a Buffer in node and an Uint8Array in browsers
     *
     * To use the resulting buffer as an image, you'll want to do something like:
     *
     *   const blob = new Blob([buffer], { type: 'image/jpeg' })
     *   document.querySelector('#photo').src = URL.createObjectURL(blob)
     */
    resolve(src, onError) {
      if (typeof atob == "function") {
        let str = atob(src.replace(/[\n\r]/g, "")), buffer = new Uint8Array(str.length);
        for (let i = 0; i < str.length; ++i)
          buffer[i] = str.charCodeAt(i);
        return buffer;
      } else
        return onError("This environment does not support reading binary tags; either Buffer or atob is required"), src;
    },
    stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
      if (!value)
        return "";
      let buf = value, str;
      if (typeof btoa == "function") {
        let s = "";
        for (let i = 0; i < buf.length; ++i)
          s += String.fromCharCode(buf[i]);
        str = btoa(s);
      } else
        throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
      if (type ?? (type = Scalar.BLOCK_LITERAL), type !== Scalar.QUOTE_DOUBLE) {
        let lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth), n = Math.ceil(str.length / lineWidth), lines = new Array(n);
        for (let i = 0, o = 0; i < n; ++i, o += lineWidth)
          lines[i] = str.substr(o, lineWidth);
        str = lines.join(type === Scalar.BLOCK_LITERAL ? `
` : " ");
      }
      return stringifyString({ comment, type, value: str }, ctx, onComment, onChompKeep);
    }
  };

  // node_modules/yaml/browser/dist/schema/yaml-1.1/pairs.js
  function resolvePairs(seq2, onError) {
    if (isSeq(seq2))
      for (let i = 0; i < seq2.items.length; ++i) {
        let item = seq2.items[i];
        if (!isPair(item)) {
          if (isMap(item)) {
            item.items.length > 1 && onError("Each pair must have its own sequence indicator");
            let pair = item.items[0] || new Pair(new Scalar(null));
            if (item.commentBefore && (pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}
${pair.key.commentBefore}` : item.commentBefore), item.comment) {
              let cn = pair.value ?? pair.key;
              cn.comment = cn.comment ? `${item.comment}
${cn.comment}` : item.comment;
            }
            item = pair;
          }
          seq2.items[i] = isPair(item) ? item : new Pair(item);
        }
      }
    else
      onError("Expected a sequence for this tag");
    return seq2;
  }
  function createPairs(schema4, iterable, ctx) {
    let { replacer } = ctx, pairs3 = new YAMLSeq(schema4);
    pairs3.tag = "tag:yaml.org,2002:pairs";
    let i = 0;
    if (iterable && Symbol.iterator in Object(iterable))
      for (let it of iterable) {
        typeof replacer == "function" && (it = replacer.call(iterable, String(i++), it));
        let key, value;
        if (Array.isArray(it))
          if (it.length === 2)
            key = it[0], value = it[1];
          else
            throw new TypeError(`Expected [key, value] tuple: ${it}`);
        else if (it && it instanceof Object) {
          let keys = Object.keys(it);
          if (keys.length === 1)
            key = keys[0], value = it[key];
          else
            throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
        } else
          key = it;
        pairs3.items.push(createPair(key, value, ctx));
      }
    return pairs3;
  }
  var pairs = {
    collection: "seq",
    default: !1,
    tag: "tag:yaml.org,2002:pairs",
    resolve: resolvePairs,
    createNode: createPairs
  };

  // node_modules/yaml/browser/dist/schema/yaml-1.1/omap.js
  var YAMLOMap = class _YAMLOMap extends YAMLSeq {
    constructor() {
      super(), this.add = YAMLMap.prototype.add.bind(this), this.delete = YAMLMap.prototype.delete.bind(this), this.get = YAMLMap.prototype.get.bind(this), this.has = YAMLMap.prototype.has.bind(this), this.set = YAMLMap.prototype.set.bind(this), this.tag = _YAMLOMap.tag;
    }
    /**
     * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
     * but TypeScript won't allow widening the signature of a child method.
     */
    toJSON(_, ctx) {
      if (!ctx)
        return super.toJSON(_);
      let map3 = /* @__PURE__ */ new Map();
      ctx?.onCreate && ctx.onCreate(map3);
      for (let pair of this.items) {
        let key, value;
        if (isPair(pair) ? (key = toJS(pair.key, "", ctx), value = toJS(pair.value, key, ctx)) : key = toJS(pair, "", ctx), map3.has(key))
          throw new Error("Ordered maps must not include duplicate keys");
        map3.set(key, value);
      }
      return map3;
    }
    static from(schema4, iterable, ctx) {
      let pairs3 = createPairs(schema4, iterable, ctx), omap2 = new this();
      return omap2.items = pairs3.items, omap2;
    }
  };
  YAMLOMap.tag = "tag:yaml.org,2002:omap";
  var omap = {
    collection: "seq",
    identify: (value) => value instanceof Map,
    nodeClass: YAMLOMap,
    default: !1,
    tag: "tag:yaml.org,2002:omap",
    resolve(seq2, onError) {
      let pairs3 = resolvePairs(seq2, onError), seenKeys = [];
      for (let { key } of pairs3.items)
        isScalar(key) && (seenKeys.includes(key.value) ? onError(`Ordered maps must not include duplicate keys: ${key.value}`) : seenKeys.push(key.value));
      return Object.assign(new YAMLOMap(), pairs3);
    },
    createNode: (schema4, iterable, ctx) => YAMLOMap.from(schema4, iterable, ctx)
  };

  // node_modules/yaml/browser/dist/schema/yaml-1.1/bool.js
  function boolStringify({ value, source }, ctx) {
    return source && (value ? trueTag : falseTag).test.test(source) ? source : value ? ctx.options.trueStr : ctx.options.falseStr;
  }
  var trueTag = {
    identify: (value) => value === !0,
    default: !0,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
    resolve: () => new Scalar(!0),
    stringify: boolStringify
  }, falseTag = {
    identify: (value) => value === !1,
    default: !0,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
    resolve: () => new Scalar(!1),
    stringify: boolStringify
  };

  // node_modules/yaml/browser/dist/schema/yaml-1.1/float.js
  var floatNaN2 = {
    identify: (value) => typeof value == "number",
    default: !0,
    tag: "tag:yaml.org,2002:float",
    test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
    resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
    stringify: stringifyNumber
  }, floatExp2 = {
    identify: (value) => typeof value == "number",
    default: !0,
    tag: "tag:yaml.org,2002:float",
    format: "EXP",
    test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
    resolve: (str) => parseFloat(str.replace(/_/g, "")),
    stringify(node) {
      let num = Number(node.value);
      return isFinite(num) ? num.toExponential() : stringifyNumber(node);
    }
  }, float2 = {
    identify: (value) => typeof value == "number",
    default: !0,
    tag: "tag:yaml.org,2002:float",
    test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
    resolve(str) {
      let node = new Scalar(parseFloat(str.replace(/_/g, ""))), dot = str.indexOf(".");
      if (dot !== -1) {
        let f = str.substring(dot + 1).replace(/_/g, "");
        f[f.length - 1] === "0" && (node.minFractionDigits = f.length);
      }
      return node;
    },
    stringify: stringifyNumber
  };

  // node_modules/yaml/browser/dist/schema/yaml-1.1/int.js
  var intIdentify3 = (value) => typeof value == "bigint" || Number.isInteger(value);
  function intResolve2(str, offset, radix, { intAsBigInt }) {
    let sign = str[0];
    if ((sign === "-" || sign === "+") && (offset += 1), str = str.substring(offset).replace(/_/g, ""), intAsBigInt) {
      switch (radix) {
        case 2:
          str = `0b${str}`;
          break;
        case 8:
          str = `0o${str}`;
          break;
        case 16:
          str = `0x${str}`;
          break;
      }
      let n2 = BigInt(str);
      return sign === "-" ? BigInt(-1) * n2 : n2;
    }
    let n = parseInt(str, radix);
    return sign === "-" ? -1 * n : n;
  }
  function intStringify2(node, radix, prefix) {
    let { value } = node;
    if (intIdentify3(value)) {
      let str = value.toString(radix);
      return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
    }
    return stringifyNumber(node);
  }
  var intBin = {
    identify: intIdentify3,
    default: !0,
    tag: "tag:yaml.org,2002:int",
    format: "BIN",
    test: /^[-+]?0b[0-1_]+$/,
    resolve: (str, _onError, opt) => intResolve2(str, 2, 2, opt),
    stringify: (node) => intStringify2(node, 2, "0b")
  }, intOct2 = {
    identify: intIdentify3,
    default: !0,
    tag: "tag:yaml.org,2002:int",
    format: "OCT",
    test: /^[-+]?0[0-7_]+$/,
    resolve: (str, _onError, opt) => intResolve2(str, 1, 8, opt),
    stringify: (node) => intStringify2(node, 8, "0")
  }, int2 = {
    identify: intIdentify3,
    default: !0,
    tag: "tag:yaml.org,2002:int",
    test: /^[-+]?[0-9][0-9_]*$/,
    resolve: (str, _onError, opt) => intResolve2(str, 0, 10, opt),
    stringify: stringifyNumber
  }, intHex2 = {
    identify: intIdentify3,
    default: !0,
    tag: "tag:yaml.org,2002:int",
    format: "HEX",
    test: /^[-+]?0x[0-9a-fA-F_]+$/,
    resolve: (str, _onError, opt) => intResolve2(str, 2, 16, opt),
    stringify: (node) => intStringify2(node, 16, "0x")
  };

  // node_modules/yaml/browser/dist/schema/yaml-1.1/set.js
  var YAMLSet = class _YAMLSet extends YAMLMap {
    constructor(schema4) {
      super(schema4), this.tag = _YAMLSet.tag;
    }
    add(key) {
      let pair;
      isPair(key) ? pair = key : key && typeof key == "object" && "key" in key && "value" in key && key.value === null ? pair = new Pair(key.key, null) : pair = new Pair(key, null), findPair(this.items, pair.key) || this.items.push(pair);
    }
    /**
     * If `keepPair` is `true`, returns the Pair matching `key`.
     * Otherwise, returns the value of that Pair's key.
     */
    get(key, keepPair) {
      let pair = findPair(this.items, key);
      return !keepPair && isPair(pair) ? isScalar(pair.key) ? pair.key.value : pair.key : pair;
    }
    set(key, value) {
      if (typeof value != "boolean")
        throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
      let prev = findPair(this.items, key);
      prev && !value ? this.items.splice(this.items.indexOf(prev), 1) : !prev && value && this.items.push(new Pair(key));
    }
    toJSON(_, ctx) {
      return super.toJSON(_, ctx, Set);
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx)
        return JSON.stringify(this);
      if (this.hasAllNullValues(!0))
        return super.toString(Object.assign({}, ctx, { allNullValues: !0 }), onComment, onChompKeep);
      throw new Error("Set items must all have null values");
    }
    static from(schema4, iterable, ctx) {
      let { replacer } = ctx, set2 = new this(schema4);
      if (iterable && Symbol.iterator in Object(iterable))
        for (let value of iterable)
          typeof replacer == "function" && (value = replacer.call(iterable, value, value)), set2.items.push(createPair(value, null, ctx));
      return set2;
    }
  };
  YAMLSet.tag = "tag:yaml.org,2002:set";
  var set = {
    collection: "map",
    identify: (value) => value instanceof Set,
    nodeClass: YAMLSet,
    default: !1,
    tag: "tag:yaml.org,2002:set",
    createNode: (schema4, iterable, ctx) => YAMLSet.from(schema4, iterable, ctx),
    resolve(map3, onError) {
      if (isMap(map3)) {
        if (map3.hasAllNullValues(!0))
          return Object.assign(new YAMLSet(), map3);
        onError("Set items must all have null values");
      } else
        onError("Expected a mapping for this tag");
      return map3;
    }
  };

  // node_modules/yaml/browser/dist/schema/yaml-1.1/timestamp.js
  function parseSexagesimal(str, asBigInt) {
    let sign = str[0], parts = sign === "-" || sign === "+" ? str.substring(1) : str, num = (n) => asBigInt ? BigInt(n) : Number(n), res = parts.replace(/_/g, "").split(":").reduce((res2, p) => res2 * num(60) + num(p), num(0));
    return sign === "-" ? num(-1) * res : res;
  }
  function stringifySexagesimal(node) {
    let { value } = node, num = (n) => n;
    if (typeof value == "bigint")
      num = (n) => BigInt(n);
    else if (isNaN(value) || !isFinite(value))
      return stringifyNumber(node);
    let sign = "";
    value < 0 && (sign = "-", value *= num(-1));
    let _60 = num(60), parts = [value % _60];
    return value < 60 ? parts.unshift(0) : (value = (value - parts[0]) / _60, parts.unshift(value % _60), value >= 60 && (value = (value - parts[0]) / _60, parts.unshift(value))), sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
  }
  var intTime = {
    identify: (value) => typeof value == "bigint" || Number.isInteger(value),
    default: !0,
    tag: "tag:yaml.org,2002:int",
    format: "TIME",
    test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
    resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
    stringify: stringifySexagesimal
  }, floatTime = {
    identify: (value) => typeof value == "number",
    default: !0,
    tag: "tag:yaml.org,2002:float",
    format: "TIME",
    test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
    resolve: (str) => parseSexagesimal(str, !1),
    stringify: stringifySexagesimal
  }, timestamp = {
    identify: (value) => value instanceof Date,
    default: !0,
    tag: "tag:yaml.org,2002:timestamp",
    // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
    // may be omitted altogether, resulting in a date format. In such a case, the time part is
    // assumed to be 00:00:00Z (start of day, UTC).
    test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
    resolve(str) {
      let match = str.match(timestamp.test);
      if (!match)
        throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
      let [, year, month, day, hour, minute, second] = match.map(Number), millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0, date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec), tz = match[8];
      if (tz && tz !== "Z") {
        let d = parseSexagesimal(tz, !1);
        Math.abs(d) < 30 && (d *= 60), date -= 6e4 * d;
      }
      return new Date(date);
    },
    stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
  };

  // node_modules/yaml/browser/dist/schema/yaml-1.1/schema.js
  var schema3 = [
    map,
    seq,
    string,
    nullTag,
    trueTag,
    falseTag,
    intBin,
    intOct2,
    int2,
    intHex2,
    floatNaN2,
    floatExp2,
    float2,
    binary,
    merge,
    omap,
    pairs,
    set,
    intTime,
    floatTime,
    timestamp
  ];

  // node_modules/yaml/browser/dist/schema/tags.js
  var schemas = /* @__PURE__ */ new Map([
    ["core", schema],
    ["failsafe", [map, seq, string]],
    ["json", schema2],
    ["yaml11", schema3],
    ["yaml-1.1", schema3]
  ]), tagsByName = {
    binary,
    bool: boolTag,
    float,
    floatExp,
    floatNaN,
    floatTime,
    int,
    intHex,
    intOct,
    intTime,
    map,
    merge,
    null: nullTag,
    omap,
    pairs,
    seq,
    set,
    timestamp
  }, coreKnownTags = {
    "tag:yaml.org,2002:binary": binary,
    "tag:yaml.org,2002:merge": merge,
    "tag:yaml.org,2002:omap": omap,
    "tag:yaml.org,2002:pairs": pairs,
    "tag:yaml.org,2002:set": set,
    "tag:yaml.org,2002:timestamp": timestamp
  };
  function getTags(customTags, schemaName, addMergeTag) {
    let schemaTags = schemas.get(schemaName);
    if (schemaTags && !customTags)
      return addMergeTag && !schemaTags.includes(merge) ? schemaTags.concat(merge) : schemaTags.slice();
    let tags = schemaTags;
    if (!tags)
      if (Array.isArray(customTags))
        tags = [];
      else {
        let keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
        throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
      }
    if (Array.isArray(customTags))
      for (let tag of customTags)
        tags = tags.concat(tag);
    else typeof customTags == "function" && (tags = customTags(tags.slice()));
    return addMergeTag && (tags = tags.concat(merge)), tags.reduce((tags2, tag) => {
      let tagObj = typeof tag == "string" ? tagsByName[tag] : tag;
      if (!tagObj) {
        let tagName = JSON.stringify(tag), keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
        throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
      }
      return tags2.includes(tagObj) || tags2.push(tagObj), tags2;
    }, []);
  }

  // node_modules/yaml/browser/dist/schema/Schema.js
  var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0, Schema = class _Schema {
    constructor({ compat, customTags, merge: merge2, resolveKnownTags, schema: schema4, sortMapEntries, toStringDefaults }) {
      this.compat = Array.isArray(compat) ? getTags(compat, "compat") : compat ? getTags(null, compat) : null, this.name = typeof schema4 == "string" && schema4 || "core", this.knownTags = resolveKnownTags ? coreKnownTags : {}, this.tags = getTags(customTags, this.name, merge2), this.toStringOptions = toStringDefaults ?? null, Object.defineProperty(this, MAP, { value: map }), Object.defineProperty(this, SCALAR, { value: string }), Object.defineProperty(this, SEQ, { value: seq }), this.sortMapEntries = typeof sortMapEntries == "function" ? sortMapEntries : sortMapEntries === !0 ? sortMapEntriesByKey : null;
    }
    clone() {
      let copy = Object.create(_Schema.prototype, Object.getOwnPropertyDescriptors(this));
      return copy.tags = this.tags.slice(), copy;
    }
  };

  // node_modules/yaml/browser/dist/stringify/stringifyDocument.js
  function stringifyDocument(doc, options) {
    let lines = [], hasDirectives = options.directives === !0;
    if (options.directives !== !1 && doc.directives) {
      let dir = doc.directives.toString(doc);
      dir ? (lines.push(dir), hasDirectives = !0) : doc.directives.docStart && (hasDirectives = !0);
    }
    hasDirectives && lines.push("---");
    let ctx = createStringifyContext(doc, options), { commentString } = ctx.options;
    if (doc.commentBefore) {
      lines.length !== 1 && lines.unshift("");
      let cs = commentString(doc.commentBefore);
      lines.unshift(indentComment(cs, ""));
    }
    let chompKeep = !1, contentComment = null;
    if (doc.contents) {
      if (isNode(doc.contents)) {
        if (doc.contents.spaceBefore && hasDirectives && lines.push(""), doc.contents.commentBefore) {
          let cs = commentString(doc.contents.commentBefore);
          lines.push(indentComment(cs, ""));
        }
        ctx.forceBlockIndent = !!doc.comment, contentComment = doc.contents.comment;
      }
      let onChompKeep = contentComment ? void 0 : () => chompKeep = !0, body = stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
      contentComment && (body += lineComment(body, "", commentString(contentComment))), (body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---" ? lines[lines.length - 1] = `--- ${body}` : lines.push(body);
    } else
      lines.push(stringify(doc.contents, ctx));
    if (doc.directives?.docEnd)
      if (doc.comment) {
        let cs = commentString(doc.comment);
        cs.includes(`
`) ? (lines.push("..."), lines.push(indentComment(cs, ""))) : lines.push(`... ${cs}`);
      } else
        lines.push("...");
    else {
      let dc = doc.comment;
      dc && chompKeep && (dc = dc.replace(/^\n+/, "")), dc && ((!chompKeep || contentComment) && lines[lines.length - 1] !== "" && lines.push(""), lines.push(indentComment(commentString(dc), "")));
    }
    return lines.join(`
`) + `
`;
  }

  // node_modules/yaml/browser/dist/doc/Document.js
  var Document = class _Document {
    constructor(value, replacer, options) {
      this.commentBefore = null, this.comment = null, this.errors = [], this.warnings = [], Object.defineProperty(this, NODE_TYPE, { value: DOC });
      let _replacer = null;
      typeof replacer == "function" || Array.isArray(replacer) ? _replacer = replacer : options === void 0 && replacer && (options = replacer, replacer = void 0);
      let opt = Object.assign({
        intAsBigInt: !1,
        keepSourceTokens: !1,
        logLevel: "warn",
        prettyErrors: !0,
        strict: !0,
        stringKeys: !1,
        uniqueKeys: !0,
        version: "1.2"
      }, options);
      this.options = opt;
      let { version } = opt;
      options?._directives ? (this.directives = options._directives.atDocument(), this.directives.yaml.explicit && (version = this.directives.yaml.version)) : this.directives = new Directives({ version }), this.setSchema(version, options), this.contents = value === void 0 ? null : this.createNode(value, _replacer, options);
    }
    /**
     * Create a deep copy of this Document and its contents.
     *
     * Custom Node values that inherit from `Object` still refer to their original instances.
     */
    clone() {
      let copy = Object.create(_Document.prototype, {
        [NODE_TYPE]: { value: DOC }
      });
      return copy.commentBefore = this.commentBefore, copy.comment = this.comment, copy.errors = this.errors.slice(), copy.warnings = this.warnings.slice(), copy.options = Object.assign({}, this.options), this.directives && (copy.directives = this.directives.clone()), copy.schema = this.schema.clone(), copy.contents = isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents, this.range && (copy.range = this.range.slice()), copy;
    }
    /** Adds a value to the document. */
    add(value) {
      assertCollection(this.contents) && this.contents.add(value);
    }
    /** Adds a value to the document. */
    addIn(path, value) {
      assertCollection(this.contents) && this.contents.addIn(path, value);
    }
    /**
     * Create a new `Alias` node, ensuring that the target `node` has the required anchor.
     *
     * If `node` already has an anchor, `name` is ignored.
     * Otherwise, the `node.anchor` value will be set to `name`,
     * or if an anchor with that name is already present in the document,
     * `name` will be used as a prefix for a new unique anchor.
     * If `name` is undefined, the generated anchor will use 'a' as a prefix.
     */
    createAlias(node, name) {
      if (!node.anchor) {
        let prev = anchorNames(this);
        node.anchor = // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        !name || prev.has(name) ? findNewAnchor(name || "a", prev) : name;
      }
      return new Alias(node.anchor);
    }
    createNode(value, replacer, options) {
      let _replacer;
      if (typeof replacer == "function")
        value = replacer.call({ "": value }, "", value), _replacer = replacer;
      else if (Array.isArray(replacer)) {
        let keyToStr = (v) => typeof v == "number" || v instanceof String || v instanceof Number, asStr = replacer.filter(keyToStr).map(String);
        asStr.length > 0 && (replacer = replacer.concat(asStr)), _replacer = replacer;
      } else options === void 0 && replacer && (options = replacer, replacer = void 0);
      let { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {}, { onAnchor, setAnchors, sourceObjects } = createNodeAnchors(
        this,
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        anchorPrefix || "a"
      ), ctx = {
        aliasDuplicateObjects: aliasDuplicateObjects ?? !0,
        keepUndefined: keepUndefined ?? !1,
        onAnchor,
        onTagObj,
        replacer: _replacer,
        schema: this.schema,
        sourceObjects
      }, node = createNode(value, tag, ctx);
      return flow && isCollection(node) && (node.flow = !0), setAnchors(), node;
    }
    /**
     * Convert a key and a value into a `Pair` using the current schema,
     * recursively wrapping all values as `Scalar` or `Collection` nodes.
     */
    createPair(key, value, options = {}) {
      let k = this.createNode(key, null, options), v = this.createNode(value, null, options);
      return new Pair(k, v);
    }
    /**
     * Removes a value from the document.
     * @returns `true` if the item was found and removed.
     */
    delete(key) {
      return assertCollection(this.contents) ? this.contents.delete(key) : !1;
    }
    /**
     * Removes a value from the document.
     * @returns `true` if the item was found and removed.
     */
    deleteIn(path) {
      return isEmptyPath(path) ? this.contents == null ? !1 : (this.contents = null, !0) : assertCollection(this.contents) ? this.contents.deleteIn(path) : !1;
    }
    /**
     * Returns item at `key`, or `undefined` if not found. By default unwraps
     * scalar values from their surrounding node; to disable set `keepScalar` to
     * `true` (collections are always returned intact).
     */
    get(key, keepScalar) {
      return isCollection(this.contents) ? this.contents.get(key, keepScalar) : void 0;
    }
    /**
     * Returns item at `path`, or `undefined` if not found. By default unwraps
     * scalar values from their surrounding node; to disable set `keepScalar` to
     * `true` (collections are always returned intact).
     */
    getIn(path, keepScalar) {
      return isEmptyPath(path) ? !keepScalar && isScalar(this.contents) ? this.contents.value : this.contents : isCollection(this.contents) ? this.contents.getIn(path, keepScalar) : void 0;
    }
    /**
     * Checks if the document includes a value with the key `key`.
     */
    has(key) {
      return isCollection(this.contents) ? this.contents.has(key) : !1;
    }
    /**
     * Checks if the document includes a value at `path`.
     */
    hasIn(path) {
      return isEmptyPath(path) ? this.contents !== void 0 : isCollection(this.contents) ? this.contents.hasIn(path) : !1;
    }
    /**
     * Sets a value in this document. For `!!set`, `value` needs to be a
     * boolean to add/remove the item from the set.
     */
    set(key, value) {
      this.contents == null ? this.contents = collectionFromPath(this.schema, [key], value) : assertCollection(this.contents) && this.contents.set(key, value);
    }
    /**
     * Sets a value in this document. For `!!set`, `value` needs to be a
     * boolean to add/remove the item from the set.
     */
    setIn(path, value) {
      isEmptyPath(path) ? this.contents = value : this.contents == null ? this.contents = collectionFromPath(this.schema, Array.from(path), value) : assertCollection(this.contents) && this.contents.setIn(path, value);
    }
    /**
     * Change the YAML version and schema used by the document.
     * A `null` version disables support for directives, explicit tags, anchors, and aliases.
     * It also requires the `schema` option to be given as a `Schema` instance value.
     *
     * Overrides all previously set schema options.
     */
    setSchema(version, options = {}) {
      typeof version == "number" && (version = String(version));
      let opt;
      switch (version) {
        case "1.1":
          this.directives ? this.directives.yaml.version = "1.1" : this.directives = new Directives({ version: "1.1" }), opt = { resolveKnownTags: !1, schema: "yaml-1.1" };
          break;
        case "1.2":
        case "next":
          this.directives ? this.directives.yaml.version = version : this.directives = new Directives({ version }), opt = { resolveKnownTags: !0, schema: "core" };
          break;
        case null:
          this.directives && delete this.directives, opt = null;
          break;
        default: {
          let sv = JSON.stringify(version);
          throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
        }
      }
      if (options.schema instanceof Object)
        this.schema = options.schema;
      else if (opt)
        this.schema = new Schema(Object.assign(opt, options));
      else
        throw new Error("With a null YAML version, the { schema: Schema } option is required");
    }
    // json & jsonArg are only used from toJSON()
    toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
      let ctx = {
        anchors: /* @__PURE__ */ new Map(),
        doc: this,
        keep: !json,
        mapAsMap: mapAsMap === !0,
        mapKeyWarned: !1,
        maxAliasCount: typeof maxAliasCount == "number" ? maxAliasCount : 100
      }, res = toJS(this.contents, jsonArg ?? "", ctx);
      if (typeof onAnchor == "function")
        for (let { count, res: res2 } of ctx.anchors.values())
          onAnchor(res2, count);
      return typeof reviver == "function" ? applyReviver(reviver, { "": res }, "", res) : res;
    }
    /**
     * A JSON representation of the document `contents`.
     *
     * @param jsonArg Used by `JSON.stringify` to indicate the array index or
     *   property name.
     */
    toJSON(jsonArg, onAnchor) {
      return this.toJS({ json: !0, jsonArg, mapAsMap: !1, onAnchor });
    }
    /** A YAML representation of the document. */
    toString(options = {}) {
      if (this.errors.length > 0)
        throw new Error("Document with errors cannot be stringified");
      if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
        let s = JSON.stringify(options.indent);
        throw new Error(`"indent" option must be a positive integer, not ${s}`);
      }
      return stringifyDocument(this, options);
    }
  };
  function assertCollection(contents) {
    if (isCollection(contents))
      return !0;
    throw new Error("Expected a YAML collection as document contents");
  }

  // node_modules/yaml/browser/dist/errors.js
  var YAMLError = class extends Error {
    constructor(name, pos, code2, message) {
      super(), this.name = name, this.code = code2, this.message = message, this.pos = pos;
    }
  }, YAMLParseError = class extends YAMLError {
    constructor(pos, code2, message) {
      super("YAMLParseError", pos, code2, message);
    }
  }, YAMLWarning = class extends YAMLError {
    constructor(pos, code2, message) {
      super("YAMLWarning", pos, code2, message);
    }
  }, prettifyError = (src, lc) => (error2) => {
    if (error2.pos[0] === -1)
      return;
    error2.linePos = error2.pos.map((pos) => lc.linePos(pos));
    let { line, col } = error2.linePos[0];
    error2.message += ` at line ${line}, column ${col}`;
    let ci = col - 1, lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
    if (ci >= 60 && lineStr.length > 80) {
      let trimStart = Math.min(ci - 39, lineStr.length - 79);
      lineStr = "…" + lineStr.substring(trimStart), ci -= trimStart - 1;
    }
    if (lineStr.length > 80 && (lineStr = lineStr.substring(0, 79) + "…"), line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
      let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
      prev.length > 80 && (prev = prev.substring(0, 79) + `…
`), lineStr = prev + lineStr;
    }
    if (/[^ ]/.test(lineStr)) {
      let count = 1, end = error2.linePos[1];
      end?.line === line && end.col > col && (count = Math.max(1, Math.min(end.col - col, 80 - ci)));
      let pointer = " ".repeat(ci) + "^".repeat(count);
      error2.message += `:

${lineStr}
${pointer}
`;
    }
  };

  // node_modules/yaml/browser/dist/compose/resolve-props.js
  function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
    let spaceBefore = !1, atNewline = startOnNewline, hasSpace = startOnNewline, comment = "", commentSep = "", hasNewline = !1, reqSpace = !1, tab = null, anchor = null, tag = null, newlineAfterProp = null, comma = null, found = null, start = null;
    for (let token of tokens)
      switch (reqSpace && (token.type !== "space" && token.type !== "newline" && token.type !== "comma" && onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space"), reqSpace = !1), tab && (atNewline && token.type !== "comment" && token.type !== "newline" && onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation"), tab = null), token.type) {
        case "space":
          !flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("	") && (tab = token), hasSpace = !0;
          break;
        case "comment": {
          hasSpace || onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
          let cb = token.source.substring(1) || " ";
          comment ? comment += commentSep + cb : comment = cb, commentSep = "", atNewline = !1;
          break;
        }
        case "newline":
          atNewline ? comment ? comment += token.source : (!found || indicator !== "seq-item-ind") && (spaceBefore = !0) : commentSep += token.source, atNewline = !0, hasNewline = !0, (anchor || tag) && (newlineAfterProp = token), hasSpace = !0;
          break;
        case "anchor":
          anchor && onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor"), token.source.endsWith(":") && onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", !0), anchor = token, start ?? (start = token.offset), atNewline = !1, hasSpace = !1, reqSpace = !0;
          break;
        case "tag": {
          tag && onError(token, "MULTIPLE_TAGS", "A node can have at most one tag"), tag = token, start ?? (start = token.offset), atNewline = !1, hasSpace = !1, reqSpace = !0;
          break;
        }
        case indicator:
          (anchor || tag) && onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`), found && onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`), found = token, atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind", hasSpace = !1;
          break;
        case "comma":
          if (flow) {
            comma && onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`), comma = token, atNewline = !1, hasSpace = !1;
            break;
          }
        // else fallthrough
        default:
          onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`), atNewline = !1, hasSpace = !1;
      }
    let last = tokens[tokens.length - 1], end = last ? last.offset + last.source.length : offset;
    return reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "") && onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space"), tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq") && onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation"), {
      comma,
      found,
      spaceBefore,
      comment,
      hasNewline,
      anchor,
      tag,
      newlineAfterProp,
      end,
      start: start ?? end
    };
  }

  // node_modules/yaml/browser/dist/compose/util-contains-newline.js
  function containsNewline(key) {
    if (!key)
      return null;
    switch (key.type) {
      case "alias":
      case "scalar":
      case "double-quoted-scalar":
      case "single-quoted-scalar":
        if (key.source.includes(`
`))
          return !0;
        if (key.end) {
          for (let st of key.end)
            if (st.type === "newline")
              return !0;
        }
        return !1;
      case "flow-collection":
        for (let it of key.items) {
          for (let st of it.start)
            if (st.type === "newline")
              return !0;
          if (it.sep) {
            for (let st of it.sep)
              if (st.type === "newline")
                return !0;
          }
          if (containsNewline(it.key) || containsNewline(it.value))
            return !0;
        }
        return !1;
      default:
        return !0;
    }
  }

  // node_modules/yaml/browser/dist/compose/util-flow-indent-check.js
  function flowIndentCheck(indent, fc, onError) {
    if (fc?.type === "flow-collection") {
      let end = fc.end[0];
      end.indent === indent && (end.source === "]" || end.source === "}") && containsNewline(fc) && onError(end, "BAD_INDENT", "Flow end indicator should be more indented than parent", !0);
    }
  }

  // node_modules/yaml/browser/dist/compose/util-map-includes.js
  function mapIncludes(ctx, items, search) {
    let { uniqueKeys } = ctx.options;
    if (uniqueKeys === !1)
      return !1;
    let isEqual = typeof uniqueKeys == "function" ? uniqueKeys : (a, b) => a === b || isScalar(a) && isScalar(b) && a.value === b.value;
    return items.some((pair) => isEqual(pair.key, search));
  }

  // node_modules/yaml/browser/dist/compose/resolve-block-map.js
  var startColMsg = "All mapping items must start at the same column";
  function resolveBlockMap({ composeNode: composeNode2, composeEmptyNode: composeEmptyNode2 }, ctx, bm, onError, tag) {
    let NodeClass = tag?.nodeClass ?? YAMLMap, map3 = new NodeClass(ctx.schema);
    ctx.atRoot && (ctx.atRoot = !1);
    let offset = bm.offset, commentEnd = null;
    for (let collItem of bm.items) {
      let { start, key, sep, value } = collItem, keyProps = resolveProps(start, {
        indicator: "explicit-key-ind",
        next: key ?? sep?.[0],
        offset,
        onError,
        parentIndent: bm.indent,
        startOnNewline: !0
      }), implicitKey = !keyProps.found;
      if (implicitKey) {
        if (key && (key.type === "block-seq" ? onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key") : "indent" in key && key.indent !== bm.indent && onError(offset, "BAD_INDENT", startColMsg)), !keyProps.anchor && !keyProps.tag && !sep) {
          commentEnd = keyProps.end, keyProps.comment && (map3.comment ? map3.comment += `
` + keyProps.comment : map3.comment = keyProps.comment);
          continue;
        }
        (keyProps.newlineAfterProp || containsNewline(key)) && onError(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
      } else keyProps.found?.indent !== bm.indent && onError(offset, "BAD_INDENT", startColMsg);
      ctx.atKey = !0;
      let keyStart = keyProps.end, keyNode = key ? composeNode2(ctx, key, keyProps, onError) : composeEmptyNode2(ctx, keyStart, start, null, keyProps, onError);
      ctx.schema.compat && flowIndentCheck(bm.indent, key, onError), ctx.atKey = !1, mapIncludes(ctx, map3.items, keyNode) && onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
      let valueProps = resolveProps(sep ?? [], {
        indicator: "map-value-ind",
        next: value,
        offset: keyNode.range[2],
        onError,
        parentIndent: bm.indent,
        startOnNewline: !key || key.type === "block-scalar"
      });
      if (offset = valueProps.end, valueProps.found) {
        implicitKey && (value?.type === "block-map" && !valueProps.hasNewline && onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings"), ctx.options.strict && keyProps.start < valueProps.found.offset - 1024 && onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key"));
        let valueNode = value ? composeNode2(ctx, value, valueProps, onError) : composeEmptyNode2(ctx, offset, sep, null, valueProps, onError);
        ctx.schema.compat && flowIndentCheck(bm.indent, value, onError), offset = valueNode.range[2];
        let pair = new Pair(keyNode, valueNode);
        ctx.options.keepSourceTokens && (pair.srcToken = collItem), map3.items.push(pair);
      } else {
        implicitKey && onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values"), valueProps.comment && (keyNode.comment ? keyNode.comment += `
` + valueProps.comment : keyNode.comment = valueProps.comment);
        let pair = new Pair(keyNode);
        ctx.options.keepSourceTokens && (pair.srcToken = collItem), map3.items.push(pair);
      }
    }
    return commentEnd && commentEnd < offset && onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content"), map3.range = [bm.offset, offset, commentEnd ?? offset], map3;
  }

  // node_modules/yaml/browser/dist/compose/resolve-block-seq.js
  function resolveBlockSeq({ composeNode: composeNode2, composeEmptyNode: composeEmptyNode2 }, ctx, bs, onError, tag) {
    let NodeClass = tag?.nodeClass ?? YAMLSeq, seq2 = new NodeClass(ctx.schema);
    ctx.atRoot && (ctx.atRoot = !1), ctx.atKey && (ctx.atKey = !1);
    let offset = bs.offset, commentEnd = null;
    for (let { start, value } of bs.items) {
      let props = resolveProps(start, {
        indicator: "seq-item-ind",
        next: value,
        offset,
        onError,
        parentIndent: bs.indent,
        startOnNewline: !0
      });
      if (!props.found)
        if (props.anchor || props.tag || value)
          value?.type === "block-seq" ? onError(props.end, "BAD_INDENT", "All sequence items must start at the same column") : onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
        else {
          commentEnd = props.end, props.comment && (seq2.comment = props.comment);
          continue;
        }
      let node = value ? composeNode2(ctx, value, props, onError) : composeEmptyNode2(ctx, props.end, start, null, props, onError);
      ctx.schema.compat && flowIndentCheck(bs.indent, value, onError), offset = node.range[2], seq2.items.push(node);
    }
    return seq2.range = [bs.offset, offset, commentEnd ?? offset], seq2;
  }

  // node_modules/yaml/browser/dist/compose/resolve-end.js
  function resolveEnd(end, offset, reqSpace, onError) {
    let comment = "";
    if (end) {
      let hasSpace = !1, sep = "";
      for (let token of end) {
        let { source, type } = token;
        switch (type) {
          case "space":
            hasSpace = !0;
            break;
          case "comment": {
            reqSpace && !hasSpace && onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
            let cb = source.substring(1) || " ";
            comment ? comment += sep + cb : comment = cb, sep = "";
            break;
          }
          case "newline":
            comment && (sep += source), hasSpace = !0;
            break;
          default:
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
        }
        offset += source.length;
      }
    }
    return { comment, offset };
  }

  // node_modules/yaml/browser/dist/compose/resolve-flow-collection.js
  var blockMsg = "Block collections are not allowed within flow collections", isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
  function resolveFlowCollection({ composeNode: composeNode2, composeEmptyNode: composeEmptyNode2 }, ctx, fc, onError, tag) {
    let isMap2 = fc.start.source === "{", fcName = isMap2 ? "flow map" : "flow sequence", NodeClass = tag?.nodeClass ?? (isMap2 ? YAMLMap : YAMLSeq), coll = new NodeClass(ctx.schema);
    coll.flow = !0;
    let atRoot = ctx.atRoot;
    atRoot && (ctx.atRoot = !1), ctx.atKey && (ctx.atKey = !1);
    let offset = fc.offset + fc.start.source.length;
    for (let i = 0; i < fc.items.length; ++i) {
      let collItem = fc.items[i], { start, key, sep, value } = collItem, props = resolveProps(start, {
        flow: fcName,
        indicator: "explicit-key-ind",
        next: key ?? sep?.[0],
        offset,
        onError,
        parentIndent: fc.indent,
        startOnNewline: !1
      });
      if (!props.found) {
        if (!props.anchor && !props.tag && !sep && !value) {
          i === 0 && props.comma ? onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`) : i < fc.items.length - 1 && onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`), props.comment && (coll.comment ? coll.comment += `
` + props.comment : coll.comment = props.comment), offset = props.end;
          continue;
        }
        !isMap2 && ctx.options.strict && containsNewline(key) && onError(
          key,
          // checked by containsNewline()
          "MULTILINE_IMPLICIT_KEY",
          "Implicit keys of flow sequence pairs need to be on a single line"
        );
      }
      if (i === 0)
        props.comma && onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
      else if (props.comma || onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`), props.comment) {
        let prevItemComment = "";
        loop: for (let st of start)
          switch (st.type) {
            case "comma":
            case "space":
              break;
            case "comment":
              prevItemComment = st.source.substring(1);
              break loop;
            default:
              break loop;
          }
        if (prevItemComment) {
          let prev = coll.items[coll.items.length - 1];
          isPair(prev) && (prev = prev.value ?? prev.key), prev.comment ? prev.comment += `
` + prevItemComment : prev.comment = prevItemComment, props.comment = props.comment.substring(prevItemComment.length + 1);
        }
      }
      if (!isMap2 && !sep && !props.found) {
        let valueNode = value ? composeNode2(ctx, value, props, onError) : composeEmptyNode2(ctx, props.end, sep, null, props, onError);
        coll.items.push(valueNode), offset = valueNode.range[2], isBlock(value) && onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
      } else {
        ctx.atKey = !0;
        let keyStart = props.end, keyNode = key ? composeNode2(ctx, key, props, onError) : composeEmptyNode2(ctx, keyStart, start, null, props, onError);
        isBlock(key) && onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg), ctx.atKey = !1;
        let valueProps = resolveProps(sep ?? [], {
          flow: fcName,
          indicator: "map-value-ind",
          next: value,
          offset: keyNode.range[2],
          onError,
          parentIndent: fc.indent,
          startOnNewline: !1
        });
        if (valueProps.found) {
          if (!isMap2 && !props.found && ctx.options.strict) {
            if (sep)
              for (let st of sep) {
                if (st === valueProps.found)
                  break;
                if (st.type === "newline") {
                  onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                  break;
                }
              }
            props.start < valueProps.found.offset - 1024 && onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
          }
        } else value && ("source" in value && value.source?.[0] === ":" ? onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`) : onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`));
        let valueNode = value ? composeNode2(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode2(ctx, valueProps.end, sep, null, valueProps, onError) : null;
        valueNode ? isBlock(value) && onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg) : valueProps.comment && (keyNode.comment ? keyNode.comment += `
` + valueProps.comment : keyNode.comment = valueProps.comment);
        let pair = new Pair(keyNode, valueNode);
        if (ctx.options.keepSourceTokens && (pair.srcToken = collItem), isMap2) {
          let map3 = coll;
          mapIncludes(ctx, map3.items, keyNode) && onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique"), map3.items.push(pair);
        } else {
          let map3 = new YAMLMap(ctx.schema);
          map3.flow = !0, map3.items.push(pair);
          let endRange = (valueNode ?? keyNode).range;
          map3.range = [keyNode.range[0], endRange[1], endRange[2]], coll.items.push(map3);
        }
        offset = valueNode ? valueNode.range[2] : valueProps.end;
      }
    }
    let expectedEnd = isMap2 ? "}" : "]", [ce, ...ee] = fc.end, cePos = offset;
    if (ce?.source === expectedEnd)
      cePos = ce.offset + ce.source.length;
    else {
      let name = fcName[0].toUpperCase() + fcName.substring(1), msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
      onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg), ce && ce.source.length !== 1 && ee.unshift(ce);
    }
    if (ee.length > 0) {
      let end = resolveEnd(ee, cePos, ctx.options.strict, onError);
      end.comment && (coll.comment ? coll.comment += `
` + end.comment : coll.comment = end.comment), coll.range = [fc.offset, cePos, end.offset];
    } else
      coll.range = [fc.offset, cePos, cePos];
    return coll;
  }

  // node_modules/yaml/browser/dist/compose/compose-collection.js
  function resolveCollection(CN2, ctx, token, onError, tagName, tag) {
    let coll = token.type === "block-map" ? resolveBlockMap(CN2, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq(CN2, ctx, token, onError, tag) : resolveFlowCollection(CN2, ctx, token, onError, tag), Coll = coll.constructor;
    return tagName === "!" || tagName === Coll.tagName ? (coll.tag = Coll.tagName, coll) : (tagName && (coll.tag = tagName), coll);
  }
  function composeCollection(CN2, ctx, token, props, onError) {
    let tagToken = props.tag, tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
    if (token.type === "block-seq") {
      let { anchor, newlineAfterProp: nl } = props, lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
      lastProp && (!nl || nl.offset < lastProp.offset) && onError(lastProp, "MISSING_CHAR", "Missing newline after block sequence props");
    }
    let expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
    if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.tagName && expType === "seq")
      return resolveCollection(CN2, ctx, token, onError, tagName);
    let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
    if (!tag) {
      let kt = ctx.schema.knownTags[tagName];
      if (kt?.collection === expType)
        ctx.schema.tags.push(Object.assign({}, kt, { default: !1 })), tag = kt;
      else
        return kt ? onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, !0) : onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, !0), resolveCollection(CN2, ctx, token, onError, tagName);
    }
    let coll = resolveCollection(CN2, ctx, token, onError, tagName, tag), res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll, node = isNode(res) ? res : new Scalar(res);
    return node.range = coll.range, node.tag = tagName, tag?.format && (node.format = tag.format), node;
  }

  // node_modules/yaml/browser/dist/compose/resolve-block-scalar.js
  function resolveBlockScalar(ctx, scalar, onError) {
    let start = scalar.offset, header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
    if (!header)
      return { value: "", type: null, comment: "", range: [start, start, start] };
    let type = header.mode === ">" ? Scalar.BLOCK_FOLDED : Scalar.BLOCK_LITERAL, lines = scalar.source ? splitLines(scalar.source) : [], chompStart = lines.length;
    for (let i = lines.length - 1; i >= 0; --i) {
      let content = lines[i][1];
      if (content === "" || content === "\r")
        chompStart = i;
      else
        break;
    }
    if (chompStart === 0) {
      let value2 = header.chomp === "+" && lines.length > 0 ? `
`.repeat(Math.max(1, lines.length - 1)) : "", end2 = start + header.length;
      return scalar.source && (end2 += scalar.source.length), { value: value2, type, comment: header.comment, range: [start, end2, end2] };
    }
    let trimIndent = scalar.indent + header.indent, offset = scalar.offset + header.length, contentStart = 0;
    for (let i = 0; i < chompStart; ++i) {
      let [indent, content] = lines[i];
      if (content === "" || content === "\r")
        header.indent === 0 && indent.length > trimIndent && (trimIndent = indent.length);
      else {
        indent.length < trimIndent && onError(offset + indent.length, "MISSING_CHAR", "Block scalars with more-indented leading empty lines must use an explicit indentation indicator"), header.indent === 0 && (trimIndent = indent.length), contentStart = i, trimIndent === 0 && !ctx.atRoot && onError(offset, "BAD_INDENT", "Block scalar values in collections must be indented");
        break;
      }
      offset += indent.length + content.length + 1;
    }
    for (let i = lines.length - 1; i >= chompStart; --i)
      lines[i][0].length > trimIndent && (chompStart = i + 1);
    let value = "", sep = "", prevMoreIndented = !1;
    for (let i = 0; i < contentStart; ++i)
      value += lines[i][0].slice(trimIndent) + `
`;
    for (let i = contentStart; i < chompStart; ++i) {
      let [indent, content] = lines[i];
      offset += indent.length + content.length + 1;
      let crlf = content[content.length - 1] === "\r";
      if (crlf && (content = content.slice(0, -1)), content && indent.length < trimIndent) {
        let message = `Block scalar lines must not be less indented than their ${header.indent ? "explicit indentation indicator" : "first line"}`;
        onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message), indent = "";
      }
      type === Scalar.BLOCK_LITERAL ? (value += sep + indent.slice(trimIndent) + content, sep = `
`) : indent.length > trimIndent || content[0] === "	" ? (sep === " " ? sep = `
` : !prevMoreIndented && sep === `
` && (sep = `

`), value += sep + indent.slice(trimIndent) + content, sep = `
`, prevMoreIndented = !0) : content === "" ? sep === `
` ? value += `
` : sep = `
` : (value += sep + content, sep = " ", prevMoreIndented = !1);
    }
    switch (header.chomp) {
      case "-":
        break;
      case "+":
        for (let i = chompStart; i < lines.length; ++i)
          value += `
` + lines[i][0].slice(trimIndent);
        value[value.length - 1] !== `
` && (value += `
`);
        break;
      default:
        value += `
`;
    }
    let end = start + header.length + scalar.source.length;
    return { value, type, comment: header.comment, range: [start, end, end] };
  }
  function parseBlockScalarHeader({ offset, props }, strict, onError) {
    if (props[0].type !== "block-scalar-header")
      return onError(props[0], "IMPOSSIBLE", "Block scalar header not found"), null;
    let { source } = props[0], mode = source[0], indent = 0, chomp = "", error2 = -1;
    for (let i = 1; i < source.length; ++i) {
      let ch = source[i];
      if (!chomp && (ch === "-" || ch === "+"))
        chomp = ch;
      else {
        let n = Number(ch);
        !indent && n ? indent = n : error2 === -1 && (error2 = offset + i);
      }
    }
    error2 !== -1 && onError(error2, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
    let hasSpace = !1, comment = "", length = source.length;
    for (let i = 1; i < props.length; ++i) {
      let token = props[i];
      switch (token.type) {
        case "space":
          hasSpace = !0;
        // fallthrough
        case "newline":
          length += token.source.length;
          break;
        case "comment":
          strict && !hasSpace && onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters"), length += token.source.length, comment = token.source.substring(1);
          break;
        case "error":
          onError(token, "UNEXPECTED_TOKEN", token.message), length += token.source.length;
          break;
        /* istanbul ignore next should not happen */
        default: {
          let message = `Unexpected token in block scalar header: ${token.type}`;
          onError(token, "UNEXPECTED_TOKEN", message);
          let ts = token.source;
          ts && typeof ts == "string" && (length += ts.length);
        }
      }
    }
    return { mode, indent, chomp, comment, length };
  }
  function splitLines(source) {
    let split = source.split(/\n( *)/), first = split[0], m = first.match(/^( *)/), lines = [m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first]];
    for (let i = 1; i < split.length; i += 2)
      lines.push([split[i], split[i + 1]]);
    return lines;
  }

  // node_modules/yaml/browser/dist/compose/resolve-flow-scalar.js
  function resolveFlowScalar(scalar, strict, onError) {
    let { offset, type, source, end } = scalar, _type, value, _onError = (rel, code2, msg) => onError(offset + rel, code2, msg);
    switch (type) {
      case "scalar":
        _type = Scalar.PLAIN, value = plainValue(source, _onError);
        break;
      case "single-quoted-scalar":
        _type = Scalar.QUOTE_SINGLE, value = singleQuotedValue(source, _onError);
        break;
      case "double-quoted-scalar":
        _type = Scalar.QUOTE_DOUBLE, value = doubleQuotedValue(source, _onError);
        break;
      /* istanbul ignore next should not happen */
      default:
        return onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`), {
          value: "",
          type: null,
          comment: "",
          range: [offset, offset + source.length, offset + source.length]
        };
    }
    let valueEnd = offset + source.length, re = resolveEnd(end, valueEnd, strict, onError);
    return {
      value,
      type: _type,
      comment: re.comment,
      range: [offset, valueEnd, re.offset]
    };
  }
  function plainValue(source, onError) {
    let badChar = "";
    switch (source[0]) {
      /* istanbul ignore next should not happen */
      case "	":
        badChar = "a tab character";
        break;
      case ",":
        badChar = "flow indicator character ,";
        break;
      case "%":
        badChar = "directive indicator character %";
        break;
      case "|":
      case ">": {
        badChar = `block scalar indicator ${source[0]}`;
        break;
      }
      case "@":
      case "`": {
        badChar = `reserved character ${source[0]}`;
        break;
      }
    }
    return badChar && onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`), unfoldLines(source);
  }
  function singleQuotedValue(source, onError) {
    return (source[source.length - 1] !== "'" || source.length === 1) && onError(source.length, "MISSING_CHAR", "Missing closing 'quote"), unfoldLines(source.slice(1, -1)).replace(/''/g, "'");
  }
  function unfoldLines(source) {
    let line = /(.*?)\r?\n/sy, match = line.exec(source);
    if (!match)
      return source;
    let trimEnd, trimBoth;
    try {
      trimEnd = new RegExp("(?<![ 	])[ 	]+$"), trimBoth = new RegExp("^[ 	]+|(?<![ 	])[ 	]+$", "g");
    } catch {
      trimEnd = /[ \t]+$/, trimBoth = /^[ \t]+|[ \t]+$/g;
    }
    let res = match[1].replace(trimEnd, ""), sep = " ", pos = line.lastIndex;
    for (; match = line.exec(source); ) {
      let lm = match[1].replace(trimBoth, "");
      lm === "" ? sep === `
` ? res += sep : sep = `
` : (res += sep + lm, sep = " "), pos = line.lastIndex;
    }
    let last = /[ \t]*(.*)/sy;
    return last.lastIndex = pos, match = last.exec(source), res + sep + (match?.[1] ?? "");
  }
  function doubleQuotedValue(source, onError) {
    let res = "";
    for (let i = 1; i < source.length - 1; ++i) {
      let ch = source[i];
      if (!(ch === "\r" && source[i + 1] === `
`))
        if (ch === `
`) {
          let { fold, offset } = foldNewline(source, i);
          res += fold, i = offset;
        } else if (ch === "\\") {
          let next = source[++i], cc = escapeCodes[next];
          if (cc)
            res += cc;
          else if (next === `
`)
            for (next = source[i + 1]; next === " " || next === "	"; )
              next = source[++i + 1];
          else if (next === "\r" && source[i + 1] === `
`)
            for (next = source[++i + 1]; next === " " || next === "	"; )
              next = source[++i + 1];
          else if (next === "x" || next === "u" || next === "U") {
            let length = next === "x" ? 2 : next === "u" ? 4 : 8;
            res += parseCharCode(source, i + 1, length, onError), i += length;
          } else {
            let raw = source.substr(i - 1, 2);
            onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`), res += raw;
          }
        } else if (ch === " " || ch === "	") {
          let wsStart = i, next = source[i + 1];
          for (; next === " " || next === "	"; )
            next = source[++i + 1];
          next !== `
` && !(next === "\r" && source[i + 2] === `
`) && (res += i > wsStart ? source.slice(wsStart, i + 1) : ch);
        } else
          res += ch;
    }
    return (source[source.length - 1] !== '"' || source.length === 1) && onError(source.length, "MISSING_CHAR", 'Missing closing "quote'), res;
  }
  function foldNewline(source, offset) {
    let fold = "", ch = source[offset + 1];
    for (; (ch === " " || ch === "	" || ch === `
` || ch === "\r") && !(ch === "\r" && source[offset + 2] !== `
`); )
      ch === `
` && (fold += `
`), offset += 1, ch = source[offset + 1];
    return fold || (fold = " "), { fold, offset };
  }
  var escapeCodes = {
    0: "\0",
    // null character
    a: "\x07",
    // bell character
    b: "\b",
    // backspace
    e: "\x1B",
    // escape character
    f: "\f",
    // form feed
    n: `
`,
    // line feed
    r: "\r",
    // carriage return
    t: "	",
    // horizontal tab
    v: "\v",
    // vertical tab
    N: "",
    // Unicode next line
    _: " ",
    // Unicode non-breaking space
    L: "\u2028",
    // Unicode line separator
    P: "\u2029",
    // Unicode paragraph separator
    " ": " ",
    '"': '"',
    "/": "/",
    "\\": "\\",
    "	": "	"
  };
  function parseCharCode(source, offset, length, onError) {
    let cc = source.substr(offset, length), code2 = cc.length === length && /^[0-9a-fA-F]+$/.test(cc) ? parseInt(cc, 16) : NaN;
    try {
      return String.fromCodePoint(code2);
    } catch {
      let raw = source.substr(offset - 2, length + 2);
      return onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`), raw;
    }
  }

  // node_modules/yaml/browser/dist/compose/compose-scalar.js
  function composeScalar(ctx, token, tagToken, onError) {
    let { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar(ctx, token, onError) : resolveFlowScalar(token, ctx.options.strict, onError), tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null, tag;
    ctx.options.stringKeys && ctx.atKey ? tag = ctx.schema[SCALAR] : tagName ? tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError) : token.type === "scalar" ? tag = findScalarTagByTest(ctx, value, token, onError) : tag = ctx.schema[SCALAR];
    let scalar;
    try {
      let res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
      scalar = isScalar(res) ? res : new Scalar(res);
    } catch (error2) {
      let msg = error2 instanceof Error ? error2.message : String(error2);
      onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), scalar = new Scalar(value);
    }
    return scalar.range = range, scalar.source = value, type && (scalar.type = type), tagName && (scalar.tag = tagName), tag.format && (scalar.format = tag.format), comment && (scalar.comment = comment), scalar;
  }
  function findScalarTagByName(schema4, value, tagName, tagToken, onError) {
    if (tagName === "!")
      return schema4[SCALAR];
    let matchWithTest = [];
    for (let tag of schema4.tags)
      if (!tag.collection && tag.tag === tagName)
        if (tag.default && tag.test)
          matchWithTest.push(tag);
        else
          return tag;
    for (let tag of matchWithTest)
      if (tag.test?.test(value))
        return tag;
    let kt = schema4.knownTags[tagName];
    return kt && !kt.collection ? (schema4.tags.push(Object.assign({}, kt, { default: !1, test: void 0 })), kt) : (onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str"), schema4[SCALAR]);
  }
  function findScalarTagByTest({ atKey, directives, schema: schema4 }, value, token, onError) {
    let tag = schema4.tags.find((tag2) => (tag2.default === !0 || atKey && tag2.default === "key") && tag2.test?.test(value)) || schema4[SCALAR];
    if (schema4.compat) {
      let compat = schema4.compat.find((tag2) => tag2.default && tag2.test?.test(value)) ?? schema4[SCALAR];
      if (tag.tag !== compat.tag) {
        let ts = directives.tagString(tag.tag), cs = directives.tagString(compat.tag), msg = `Value may be parsed as either ${ts} or ${cs}`;
        onError(token, "TAG_RESOLVE_FAILED", msg, !0);
      }
    }
    return tag;
  }

  // node_modules/yaml/browser/dist/compose/util-empty-scalar-position.js
  function emptyScalarPosition(offset, before, pos) {
    if (before) {
      pos ?? (pos = before.length);
      for (let i = pos - 1; i >= 0; --i) {
        let st = before[i];
        switch (st.type) {
          case "space":
          case "comment":
          case "newline":
            offset -= st.source.length;
            continue;
        }
        for (st = before[++i]; st?.type === "space"; )
          offset += st.source.length, st = before[++i];
        break;
      }
    }
    return offset;
  }

  // node_modules/yaml/browser/dist/compose/compose-node.js
  var CN = { composeNode, composeEmptyNode };
  function composeNode(ctx, token, props, onError) {
    let atKey = ctx.atKey, { spaceBefore, comment, anchor, tag } = props, node, isSrcToken = !0;
    switch (token.type) {
      case "alias":
        node = composeAlias(ctx, token, onError), (anchor || tag) && onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
        break;
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
      case "block-scalar":
        node = composeScalar(ctx, token, tag, onError), anchor && (node.anchor = anchor.source.substring(1));
        break;
      case "block-map":
      case "block-seq":
      case "flow-collection":
        try {
          node = composeCollection(CN, ctx, token, props, onError), anchor && (node.anchor = anchor.source.substring(1));
        } catch (error2) {
          let message = error2 instanceof Error ? error2.message : String(error2);
          onError(token, "RESOURCE_EXHAUSTION", message);
        }
        break;
      default: {
        let message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
        onError(token, "UNEXPECTED_TOKEN", message), isSrcToken = !1;
      }
    }
    return node ?? (node = composeEmptyNode(ctx, token.offset, void 0, null, props, onError)), anchor && node.anchor === "" && onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string"), atKey && ctx.options.stringKeys && (!isScalar(node) || typeof node.value != "string" || node.tag && node.tag !== "tag:yaml.org,2002:str") && onError(tag ?? token, "NON_STRING_KEY", "With stringKeys, all keys must be strings"), spaceBefore && (node.spaceBefore = !0), comment && (token.type === "scalar" && token.source === "" ? node.comment = comment : node.commentBefore = comment), ctx.options.keepSourceTokens && isSrcToken && (node.srcToken = token), node;
  }
  function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
    let token = {
      type: "scalar",
      offset: emptyScalarPosition(offset, before, pos),
      indent: -1,
      source: ""
    }, node = composeScalar(ctx, token, tag, onError);
    return anchor && (node.anchor = anchor.source.substring(1), node.anchor === "" && onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string")), spaceBefore && (node.spaceBefore = !0), comment && (node.comment = comment, node.range[2] = end), node;
  }
  function composeAlias({ options }, { offset, source, end }, onError) {
    let alias = new Alias(source.substring(1));
    alias.source === "" && onError(offset, "BAD_ALIAS", "Alias cannot be an empty string"), alias.source.endsWith(":") && onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", !0);
    let valueEnd = offset + source.length, re = resolveEnd(end, valueEnd, options.strict, onError);
    return alias.range = [offset, valueEnd, re.offset], re.comment && (alias.comment = re.comment), alias;
  }

  // node_modules/yaml/browser/dist/compose/compose-doc.js
  function composeDoc(options, directives, { offset, start, value, end }, onError) {
    let opts = Object.assign({ _directives: directives }, options), doc = new Document(void 0, opts), ctx = {
      atKey: !1,
      atRoot: !0,
      directives: doc.directives,
      options: doc.options,
      schema: doc.schema
    }, props = resolveProps(start, {
      indicator: "doc-start",
      next: value ?? end?.[0],
      offset,
      onError,
      parentIndent: 0,
      startOnNewline: !0
    });
    props.found && (doc.directives.docStart = !0, value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline && onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker")), doc.contents = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
    let contentEnd = doc.contents.range[2], re = resolveEnd(end, contentEnd, !1, onError);
    return re.comment && (doc.comment = re.comment), doc.range = [offset, contentEnd, re.offset], doc;
  }

  // node_modules/yaml/browser/dist/compose/composer.js
  function getErrorPos(src) {
    if (typeof src == "number")
      return [src, src + 1];
    if (Array.isArray(src))
      return src.length === 2 ? src : [src[0], src[1]];
    let { offset, source } = src;
    return [offset, offset + (typeof source == "string" ? source.length : 1)];
  }
  function parsePrelude(prelude) {
    let comment = "", atComment = !1, afterEmptyLine = !1;
    for (let i = 0; i < prelude.length; ++i) {
      let source = prelude[i];
      switch (source[0]) {
        case "#":
          comment += (comment === "" ? "" : afterEmptyLine ? `

` : `
`) + (source.substring(1) || " "), atComment = !0, afterEmptyLine = !1;
          break;
        case "%":
          prelude[i + 1]?.[0] !== "#" && (i += 1), atComment = !1;
          break;
        default:
          atComment || (afterEmptyLine = !0), atComment = !1;
      }
    }
    return { comment, afterEmptyLine };
  }
  var Composer = class {
    constructor(options = {}) {
      this.doc = null, this.atDirectives = !1, this.prelude = [], this.errors = [], this.warnings = [], this.onError = (source, code2, message, warning) => {
        let pos = getErrorPos(source);
        warning ? this.warnings.push(new YAMLWarning(pos, code2, message)) : this.errors.push(new YAMLParseError(pos, code2, message));
      }, this.directives = new Directives({ version: options.version || "1.2" }), this.options = options;
    }
    decorate(doc, afterDoc) {
      let { comment, afterEmptyLine } = parsePrelude(this.prelude);
      if (comment) {
        let dc = doc.contents;
        if (afterDoc)
          doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
        else if (afterEmptyLine || doc.directives.docStart || !dc)
          doc.commentBefore = comment;
        else if (isCollection(dc) && !dc.flow && dc.items.length > 0) {
          let it = dc.items[0];
          isPair(it) && (it = it.key);
          let cb = it.commentBefore;
          it.commentBefore = cb ? `${comment}
${cb}` : comment;
        } else {
          let cb = dc.commentBefore;
          dc.commentBefore = cb ? `${comment}
${cb}` : comment;
        }
      }
      if (afterDoc) {
        for (let i = 0; i < this.errors.length; ++i)
          doc.errors.push(this.errors[i]);
        for (let i = 0; i < this.warnings.length; ++i)
          doc.warnings.push(this.warnings[i]);
      } else
        doc.errors = this.errors, doc.warnings = this.warnings;
      this.prelude = [], this.errors = [], this.warnings = [];
    }
    /**
     * Current stream status information.
     *
     * Mostly useful at the end of input for an empty stream.
     */
    streamInfo() {
      return {
        comment: parsePrelude(this.prelude).comment,
        directives: this.directives,
        errors: this.errors,
        warnings: this.warnings
      };
    }
    /**
     * Compose tokens into documents.
     *
     * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
     * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
     */
    *compose(tokens, forceDoc = !1, endOffset = -1) {
      for (let token of tokens)
        yield* this.next(token);
      yield* this.end(forceDoc, endOffset);
    }
    /** Advance the composer by one CST token. */
    *next(token) {
      switch (token.type) {
        case "directive":
          this.directives.add(token.source, (offset, message, warning) => {
            let pos = getErrorPos(token);
            pos[0] += offset, this.onError(pos, "BAD_DIRECTIVE", message, warning);
          }), this.prelude.push(token.source), this.atDirectives = !0;
          break;
        case "document": {
          let doc = composeDoc(this.options, this.directives, token, this.onError);
          this.atDirectives && !doc.directives.docStart && this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line"), this.decorate(doc, !1), this.doc && (yield this.doc), this.doc = doc, this.atDirectives = !1;
          break;
        }
        case "byte-order-mark":
        case "space":
          break;
        case "comment":
        case "newline":
          this.prelude.push(token.source);
          break;
        case "error": {
          let msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message, error2 = new YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
          this.atDirectives || !this.doc ? this.errors.push(error2) : this.doc.errors.push(error2);
          break;
        }
        case "doc-end": {
          if (!this.doc) {
            let msg = "Unexpected doc-end without preceding document";
            this.errors.push(new YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
            break;
          }
          this.doc.directives.docEnd = !0;
          let end = resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
          if (this.decorate(this.doc, !0), end.comment) {
            let dc = this.doc.comment;
            this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
          }
          this.doc.range[2] = end.offset;
          break;
        }
        default:
          this.errors.push(new YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
      }
    }
    /**
     * Call at end of input to yield any remaining document.
     *
     * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
     * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
     */
    *end(forceDoc = !1, endOffset = -1) {
      if (this.doc)
        this.decorate(this.doc, !0), yield this.doc, this.doc = null;
      else if (forceDoc) {
        let opts = Object.assign({ _directives: this.directives }, this.options), doc = new Document(void 0, opts);
        this.atDirectives && this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line"), doc.range = [0, endOffset, endOffset], this.decorate(doc, !1), yield doc;
      }
    }
  };

  // node_modules/yaml/browser/dist/parse/cst-visit.js
  var BREAK2 = /* @__PURE__ */ Symbol("break visit"), SKIP2 = /* @__PURE__ */ Symbol("skip children"), REMOVE2 = /* @__PURE__ */ Symbol("remove item");
  function visit2(cst, visitor) {
    "type" in cst && cst.type === "document" && (cst = { start: cst.start, value: cst.value }), _visit(Object.freeze([]), cst, visitor);
  }
  visit2.BREAK = BREAK2;
  visit2.SKIP = SKIP2;
  visit2.REMOVE = REMOVE2;
  visit2.itemAtPath = (cst, path) => {
    let item = cst;
    for (let [field, index] of path) {
      let tok = item?.[field];
      if (tok && "items" in tok)
        item = tok.items[index];
      else
        return;
    }
    return item;
  };
  visit2.parentCollection = (cst, path) => {
    let parent = visit2.itemAtPath(cst, path.slice(0, -1)), field = path[path.length - 1][0], coll = parent?.[field];
    if (coll && "items" in coll)
      return coll;
    throw new Error("Parent collection not found");
  };
  function _visit(path, item, visitor) {
    let ctrl = visitor(item, path);
    if (typeof ctrl == "symbol")
      return ctrl;
    for (let field of ["key", "value"]) {
      let token = item[field];
      if (token && "items" in token) {
        for (let i = 0; i < token.items.length; ++i) {
          let ci = _visit(Object.freeze(path.concat([[field, i]])), token.items[i], visitor);
          if (typeof ci == "number")
            i = ci - 1;
          else {
            if (ci === BREAK2)
              return BREAK2;
            ci === REMOVE2 && (token.items.splice(i, 1), i -= 1);
          }
        }
        typeof ctrl == "function" && field === "key" && (ctrl = ctrl(item, path));
      }
    }
    return typeof ctrl == "function" ? ctrl(item, path) : ctrl;
  }

  // node_modules/yaml/browser/dist/parse/cst.js
  var BOM = "\uFEFF", DOCUMENT = "", FLOW_END = "", SCALAR2 = "";
  function tokenType(source) {
    switch (source) {
      case BOM:
        return "byte-order-mark";
      case DOCUMENT:
        return "doc-mode";
      case FLOW_END:
        return "flow-error-end";
      case SCALAR2:
        return "scalar";
      case "---":
        return "doc-start";
      case "...":
        return "doc-end";
      case "":
      case `
`:
      case `\r
`:
        return "newline";
      case "-":
        return "seq-item-ind";
      case "?":
        return "explicit-key-ind";
      case ":":
        return "map-value-ind";
      case "{":
        return "flow-map-start";
      case "}":
        return "flow-map-end";
      case "[":
        return "flow-seq-start";
      case "]":
        return "flow-seq-end";
      case ",":
        return "comma";
    }
    switch (source[0]) {
      case " ":
      case "	":
        return "space";
      case "#":
        return "comment";
      case "%":
        return "directive-line";
      case "*":
        return "alias";
      case "&":
        return "anchor";
      case "!":
        return "tag";
      case "'":
        return "single-quoted-scalar";
      case '"':
        return "double-quoted-scalar";
      case "|":
      case ">":
        return "block-scalar-header";
    }
    return null;
  }

  // node_modules/yaml/browser/dist/parse/lexer.js
  function isEmpty(ch) {
    switch (ch) {
      case void 0:
      case " ":
      case `
`:
      case "\r":
      case "	":
        return !0;
      default:
        return !1;
    }
  }
  var hexDigits = new Set("0123456789ABCDEFabcdef"), tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()"), flowIndicatorChars = new Set(",[]{}"), invalidAnchorChars = new Set(` ,[]{}
\r	`), isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch), Lexer = class {
    constructor() {
      this.atEnd = !1, this.blockScalarIndent = -1, this.blockScalarKeep = !1, this.buffer = "", this.flowKey = !1, this.flowLevel = 0, this.indentNext = 0, this.indentValue = 0, this.lineEndPos = null, this.next = null, this.pos = 0;
    }
    /**
     * Generate YAML tokens from the `source` string. If `incomplete`,
     * a part of the last line may be left as a buffer for the next call.
     *
     * @returns A generator of lexical tokens
     */
    *lex(source, incomplete = !1) {
      if (source) {
        if (typeof source != "string")
          throw TypeError("source is not a string");
        this.buffer = this.buffer ? this.buffer + source : source, this.lineEndPos = null;
      }
      this.atEnd = !incomplete;
      let next = this.next ?? "stream";
      for (; next && (incomplete || this.hasChars(1)); )
        next = yield* this.parseNext(next);
    }
    atLineEnd() {
      let i = this.pos, ch = this.buffer[i];
      for (; ch === " " || ch === "	"; )
        ch = this.buffer[++i];
      return !ch || ch === "#" || ch === `
` ? !0 : ch === "\r" ? this.buffer[i + 1] === `
` : !1;
    }
    charAt(n) {
      return this.buffer[this.pos + n];
    }
    continueScalar(offset) {
      let ch = this.buffer[offset];
      if (this.indentNext > 0) {
        let indent = 0;
        for (; ch === " "; )
          ch = this.buffer[++indent + offset];
        if (ch === "\r") {
          let next = this.buffer[indent + offset + 1];
          if (next === `
` || !next && !this.atEnd)
            return offset + indent + 1;
        }
        return ch === `
` || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
      }
      if (ch === "-" || ch === ".") {
        let dt = this.buffer.substr(offset, 3);
        if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
          return -1;
      }
      return offset;
    }
    getLine() {
      let end = this.lineEndPos;
      return (typeof end != "number" || end !== -1 && end < this.pos) && (end = this.buffer.indexOf(`
`, this.pos), this.lineEndPos = end), end === -1 ? this.atEnd ? this.buffer.substring(this.pos) : null : (this.buffer[end - 1] === "\r" && (end -= 1), this.buffer.substring(this.pos, end));
    }
    hasChars(n) {
      return this.pos + n <= this.buffer.length;
    }
    setNext(state) {
      return this.buffer = this.buffer.substring(this.pos), this.pos = 0, this.lineEndPos = null, this.next = state, null;
    }
    peek(n) {
      return this.buffer.substr(this.pos, n);
    }
    *parseNext(next) {
      switch (next) {
        case "stream":
          return yield* this.parseStream();
        case "line-start":
          return yield* this.parseLineStart();
        case "block-start":
          return yield* this.parseBlockStart();
        case "doc":
          return yield* this.parseDocument();
        case "flow":
          return yield* this.parseFlowCollection();
        case "quoted-scalar":
          return yield* this.parseQuotedScalar();
        case "block-scalar":
          return yield* this.parseBlockScalar();
        case "plain-scalar":
          return yield* this.parsePlainScalar();
      }
    }
    *parseStream() {
      let line = this.getLine();
      if (line === null)
        return this.setNext("stream");
      if (line[0] === BOM && (yield* this.pushCount(1), line = line.substring(1)), line[0] === "%") {
        let dirEnd = line.length, cs = line.indexOf("#");
        for (; cs !== -1; ) {
          let ch = line[cs - 1];
          if (ch === " " || ch === "	") {
            dirEnd = cs - 1;
            break;
          } else
            cs = line.indexOf("#", cs + 1);
        }
        for (; ; ) {
          let ch = line[dirEnd - 1];
          if (ch === " " || ch === "	")
            dirEnd -= 1;
          else
            break;
        }
        let n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(!0));
        return yield* this.pushCount(line.length - n), this.pushNewline(), "stream";
      }
      if (this.atLineEnd()) {
        let sp = yield* this.pushSpaces(!0);
        return yield* this.pushCount(line.length - sp), yield* this.pushNewline(), "stream";
      }
      return yield DOCUMENT, yield* this.parseLineStart();
    }
    *parseLineStart() {
      let ch = this.charAt(0);
      if (!ch && !this.atEnd)
        return this.setNext("line-start");
      if (ch === "-" || ch === ".") {
        if (!this.atEnd && !this.hasChars(4))
          return this.setNext("line-start");
        let s = this.peek(3);
        if ((s === "---" || s === "...") && isEmpty(this.charAt(3)))
          return yield* this.pushCount(3), this.indentValue = 0, this.indentNext = 0, s === "---" ? "doc" : "stream";
      }
      return this.indentValue = yield* this.pushSpaces(!1), this.indentNext > this.indentValue && !isEmpty(this.charAt(1)) && (this.indentNext = this.indentValue), yield* this.parseBlockStart();
    }
    *parseBlockStart() {
      let [ch0, ch1] = this.peek(2);
      if (!ch1 && !this.atEnd)
        return this.setNext("block-start");
      if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
        let n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(!0));
        return this.indentNext = this.indentValue + 1, this.indentValue += n, "block-start";
      }
      return "doc";
    }
    *parseDocument() {
      yield* this.pushSpaces(!0);
      let line = this.getLine();
      if (line === null)
        return this.setNext("doc");
      let n = yield* this.pushIndicators();
      switch (line[n]) {
        case "#":
          yield* this.pushCount(line.length - n);
        // fallthrough
        case void 0:
          return yield* this.pushNewline(), yield* this.parseLineStart();
        case "{":
        case "[":
          return yield* this.pushCount(1), this.flowKey = !1, this.flowLevel = 1, "flow";
        case "}":
        case "]":
          return yield* this.pushCount(1), "doc";
        case "*":
          return yield* this.pushUntil(isNotAnchorChar), "doc";
        case '"':
        case "'":
          return yield* this.parseQuotedScalar();
        case "|":
        case ">":
          return n += yield* this.parseBlockScalarHeader(), n += yield* this.pushSpaces(!0), yield* this.pushCount(line.length - n), yield* this.pushNewline(), yield* this.parseBlockScalar();
        default:
          return yield* this.parsePlainScalar();
      }
    }
    *parseFlowCollection() {
      let nl, sp, indent = -1;
      do
        nl = yield* this.pushNewline(), nl > 0 ? (sp = yield* this.pushSpaces(!1), this.indentValue = indent = sp) : sp = 0, sp += yield* this.pushSpaces(!0);
      while (nl + sp > 0);
      let line = this.getLine();
      if (line === null)
        return this.setNext("flow");
      if ((indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) && !(indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}")))
        return this.flowLevel = 0, yield FLOW_END, yield* this.parseLineStart();
      let n = 0;
      for (; line[n] === ","; )
        n += yield* this.pushCount(1), n += yield* this.pushSpaces(!0), this.flowKey = !1;
      switch (n += yield* this.pushIndicators(), line[n]) {
        case void 0:
          return "flow";
        case "#":
          return yield* this.pushCount(line.length - n), "flow";
        case "{":
        case "[":
          return yield* this.pushCount(1), this.flowKey = !1, this.flowLevel += 1, "flow";
        case "}":
        case "]":
          return yield* this.pushCount(1), this.flowKey = !0, this.flowLevel -= 1, this.flowLevel ? "flow" : "doc";
        case "*":
          return yield* this.pushUntil(isNotAnchorChar), "flow";
        case '"':
        case "'":
          return this.flowKey = !0, yield* this.parseQuotedScalar();
        case ":": {
          let next = this.charAt(1);
          if (this.flowKey || isEmpty(next) || next === ",")
            return this.flowKey = !1, yield* this.pushCount(1), yield* this.pushSpaces(!0), "flow";
        }
        // fallthrough
        default:
          return this.flowKey = !1, yield* this.parsePlainScalar();
      }
    }
    *parseQuotedScalar() {
      let quote = this.charAt(0), end = this.buffer.indexOf(quote, this.pos + 1);
      if (quote === "'")
        for (; end !== -1 && this.buffer[end + 1] === "'"; )
          end = this.buffer.indexOf("'", end + 2);
      else
        for (; end !== -1; ) {
          let n = 0;
          for (; this.buffer[end - 1 - n] === "\\"; )
            n += 1;
          if (n % 2 === 0)
            break;
          end = this.buffer.indexOf('"', end + 1);
        }
      let qb = this.buffer.substring(0, end), nl = qb.indexOf(`
`, this.pos);
      if (nl !== -1) {
        for (; nl !== -1; ) {
          let cs = this.continueScalar(nl + 1);
          if (cs === -1)
            break;
          nl = qb.indexOf(`
`, cs);
        }
        nl !== -1 && (end = nl - (qb[nl - 1] === "\r" ? 2 : 1));
      }
      if (end === -1) {
        if (!this.atEnd)
          return this.setNext("quoted-scalar");
        end = this.buffer.length;
      }
      return yield* this.pushToIndex(end + 1, !1), this.flowLevel ? "flow" : "doc";
    }
    *parseBlockScalarHeader() {
      this.blockScalarIndent = -1, this.blockScalarKeep = !1;
      let i = this.pos;
      for (; ; ) {
        let ch = this.buffer[++i];
        if (ch === "+")
          this.blockScalarKeep = !0;
        else if (ch > "0" && ch <= "9")
          this.blockScalarIndent = Number(ch) - 1;
        else if (ch !== "-")
          break;
      }
      return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
    }
    *parseBlockScalar() {
      let nl = this.pos - 1, indent = 0, ch;
      loop: for (let i2 = this.pos; ch = this.buffer[i2]; ++i2)
        switch (ch) {
          case " ":
            indent += 1;
            break;
          case `
`:
            nl = i2, indent = 0;
            break;
          case "\r": {
            let next = this.buffer[i2 + 1];
            if (!next && !this.atEnd)
              return this.setNext("block-scalar");
            if (next === `
`)
              break;
          }
          // fallthrough
          default:
            break loop;
        }
      if (!ch && !this.atEnd)
        return this.setNext("block-scalar");
      if (indent >= this.indentNext) {
        this.blockScalarIndent === -1 ? this.indentNext = indent : this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
        do {
          let cs = this.continueScalar(nl + 1);
          if (cs === -1)
            break;
          nl = this.buffer.indexOf(`
`, cs);
        } while (nl !== -1);
        if (nl === -1) {
          if (!this.atEnd)
            return this.setNext("block-scalar");
          nl = this.buffer.length;
        }
      }
      let i = nl + 1;
      for (ch = this.buffer[i]; ch === " "; )
        ch = this.buffer[++i];
      if (ch === "	") {
        for (; ch === "	" || ch === " " || ch === "\r" || ch === `
`; )
          ch = this.buffer[++i];
        nl = i - 1;
      } else if (!this.blockScalarKeep)
        do {
          let i2 = nl - 1, ch2 = this.buffer[i2];
          ch2 === "\r" && (ch2 = this.buffer[--i2]);
          let lastChar = i2;
          for (; ch2 === " "; )
            ch2 = this.buffer[--i2];
          if (ch2 === `
` && i2 >= this.pos && i2 + 1 + indent > lastChar)
            nl = i2;
          else
            break;
        } while (!0);
      return yield SCALAR2, yield* this.pushToIndex(nl + 1, !0), yield* this.parseLineStart();
    }
    *parsePlainScalar() {
      let inFlow = this.flowLevel > 0, end = this.pos - 1, i = this.pos - 1, ch;
      for (; ch = this.buffer[++i]; )
        if (ch === ":") {
          let next = this.buffer[i + 1];
          if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
            break;
          end = i;
        } else if (isEmpty(ch)) {
          let next = this.buffer[i + 1];
          if (ch === "\r" && (next === `
` ? (i += 1, ch = `
`, next = this.buffer[i + 1]) : end = i), next === "#" || inFlow && flowIndicatorChars.has(next))
            break;
          if (ch === `
`) {
            let cs = this.continueScalar(i + 1);
            if (cs === -1)
              break;
            i = Math.max(i, cs - 2);
          }
        } else {
          if (inFlow && flowIndicatorChars.has(ch))
            break;
          end = i;
        }
      return !ch && !this.atEnd ? this.setNext("plain-scalar") : (yield SCALAR2, yield* this.pushToIndex(end + 1, !0), inFlow ? "flow" : "doc");
    }
    *pushCount(n) {
      return n > 0 ? (yield this.buffer.substr(this.pos, n), this.pos += n, n) : 0;
    }
    *pushToIndex(i, allowEmpty) {
      let s = this.buffer.slice(this.pos, i);
      return s ? (yield s, this.pos += s.length, s.length) : (allowEmpty && (yield ""), 0);
    }
    *pushIndicators() {
      let n = 0;
      loop: for (; ; ) {
        switch (this.charAt(0)) {
          case "!":
            n += yield* this.pushTag(), n += yield* this.pushSpaces(!0);
            continue loop;
          case "&":
            n += yield* this.pushUntil(isNotAnchorChar), n += yield* this.pushSpaces(!0);
            continue loop;
          case "-":
          // this is an error
          case "?":
          // this is an error outside flow collections
          case ":": {
            let inFlow = this.flowLevel > 0, ch1 = this.charAt(1);
            if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
              inFlow ? this.flowKey && (this.flowKey = !1) : this.indentNext = this.indentValue + 1, n += yield* this.pushCount(1), n += yield* this.pushSpaces(!0);
              continue loop;
            }
          }
        }
        break loop;
      }
      return n;
    }
    *pushTag() {
      if (this.charAt(1) === "<") {
        let i = this.pos + 2, ch = this.buffer[i];
        for (; !isEmpty(ch) && ch !== ">"; )
          ch = this.buffer[++i];
        return yield* this.pushToIndex(ch === ">" ? i + 1 : i, !1);
      } else {
        let i = this.pos + 1, ch = this.buffer[i];
        for (; ch; )
          if (tagChars.has(ch))
            ch = this.buffer[++i];
          else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2]))
            ch = this.buffer[i += 3];
          else
            break;
        return yield* this.pushToIndex(i, !1);
      }
    }
    *pushNewline() {
      let ch = this.buffer[this.pos];
      return ch === `
` ? yield* this.pushCount(1) : ch === "\r" && this.charAt(1) === `
` ? yield* this.pushCount(2) : 0;
    }
    *pushSpaces(allowTabs) {
      let i = this.pos - 1, ch;
      do
        ch = this.buffer[++i];
      while (ch === " " || allowTabs && ch === "	");
      let n = i - this.pos;
      return n > 0 && (yield this.buffer.substr(this.pos, n), this.pos = i), n;
    }
    *pushUntil(test) {
      let i = this.pos, ch = this.buffer[i];
      for (; !test(ch); )
        ch = this.buffer[++i];
      return yield* this.pushToIndex(i, !1);
    }
  };

  // node_modules/yaml/browser/dist/parse/line-counter.js
  var LineCounter = class {
    constructor() {
      this.lineStarts = [], this.addNewLine = (offset) => this.lineStarts.push(offset), this.linePos = (offset) => {
        let low = 0, high = this.lineStarts.length;
        for (; low < high; ) {
          let mid = low + high >> 1;
          this.lineStarts[mid] < offset ? low = mid + 1 : high = mid;
        }
        if (this.lineStarts[low] === offset)
          return { line: low + 1, col: 1 };
        if (low === 0)
          return { line: 0, col: offset };
        let start = this.lineStarts[low - 1];
        return { line: low, col: offset - start + 1 };
      };
    }
  };

  // node_modules/yaml/browser/dist/parse/parser.js
  function includesToken(list2, type) {
    for (let i = 0; i < list2.length; ++i)
      if (list2[i].type === type)
        return !0;
    return !1;
  }
  function findNonEmptyIndex(list2) {
    for (let i = 0; i < list2.length; ++i)
      switch (list2[i].type) {
        case "space":
        case "comment":
        case "newline":
          break;
        default:
          return i;
      }
    return -1;
  }
  function isFlowToken(token) {
    switch (token?.type) {
      case "alias":
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
      case "flow-collection":
        return !0;
      default:
        return !1;
    }
  }
  function getPrevProps(parent) {
    switch (parent.type) {
      case "document":
        return parent.start;
      case "block-map": {
        let it = parent.items[parent.items.length - 1];
        return it.sep ?? it.start;
      }
      case "block-seq":
        return parent.items[parent.items.length - 1].start;
      /* istanbul ignore next should not happen */
      default:
        return [];
    }
  }
  function getFirstKeyStartProps(prev) {
    if (prev.length === 0)
      return [];
    let i = prev.length;
    loop: for (; --i >= 0; )
      switch (prev[i].type) {
        case "doc-start":
        case "explicit-key-ind":
        case "map-value-ind":
        case "seq-item-ind":
        case "newline":
          break loop;
      }
    for (; prev[++i]?.type === "space"; )
      ;
    return prev.splice(i, prev.length);
  }
  function arrayPushArray(target, source) {
    if (source.length < 1e5)
      Array.prototype.push.apply(target, source);
    else
      for (let i = 0; i < source.length; ++i)
        target.push(source[i]);
  }
  function fixFlowSeqItems(fc) {
    if (fc.start.type === "flow-seq-start")
      for (let it of fc.items)
        it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind") && (it.key && (it.value = it.key), delete it.key, isFlowToken(it.value) ? it.value.end ? arrayPushArray(it.value.end, it.sep) : it.value.end = it.sep : arrayPushArray(it.start, it.sep), delete it.sep);
  }
  var Parser = class {
    /**
     * @param onNewLine - If defined, called separately with the start position of
     *   each new line (in `parse()`, including the start of input).
     */
    constructor(onNewLine) {
      this.atNewLine = !0, this.atScalar = !1, this.indent = 0, this.offset = 0, this.onKeyLine = !1, this.stack = [], this.source = "", this.type = "", this.lexer = new Lexer(), this.onNewLine = onNewLine;
    }
    /**
     * Parse `source` as a YAML stream.
     * If `incomplete`, a part of the last line may be left as a buffer for the next call.
     *
     * Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
     *
     * @returns A generator of tokens representing each directive, document, and other structure.
     */
    *parse(source, incomplete = !1) {
      this.onNewLine && this.offset === 0 && this.onNewLine(0);
      for (let lexeme of this.lexer.lex(source, incomplete))
        yield* this.next(lexeme);
      incomplete || (yield* this.end());
    }
    /**
     * Advance the parser by the `source` of one lexical token.
     */
    *next(source) {
      if (this.source = source, this.atScalar) {
        this.atScalar = !1, yield* this.step(), this.offset += source.length;
        return;
      }
      let type = tokenType(source);
      if (type)
        if (type === "scalar")
          this.atNewLine = !1, this.atScalar = !0, this.type = "scalar";
        else {
          switch (this.type = type, yield* this.step(), type) {
            case "newline":
              this.atNewLine = !0, this.indent = 0, this.onNewLine && this.onNewLine(this.offset + source.length);
              break;
            case "space":
              this.atNewLine && source[0] === " " && (this.indent += source.length);
              break;
            case "explicit-key-ind":
            case "map-value-ind":
            case "seq-item-ind":
              this.atNewLine && (this.indent += source.length);
              break;
            case "doc-mode":
            case "flow-error-end":
              return;
            default:
              this.atNewLine = !1;
          }
          this.offset += source.length;
        }
      else {
        let message = `Not a YAML token: ${source}`;
        yield* this.pop({ type: "error", offset: this.offset, message, source }), this.offset += source.length;
      }
    }
    /** Call at end of input to push out any remaining constructions */
    *end() {
      for (; this.stack.length > 0; )
        yield* this.pop();
    }
    get sourceToken() {
      return {
        type: this.type,
        offset: this.offset,
        indent: this.indent,
        source: this.source
      };
    }
    *step() {
      let top = this.peek(1);
      if (this.type === "doc-end" && top?.type !== "doc-end") {
        for (; this.stack.length > 0; )
          yield* this.pop();
        this.stack.push({
          type: "doc-end",
          offset: this.offset,
          source: this.source
        });
        return;
      }
      if (!top)
        return yield* this.stream();
      switch (top.type) {
        case "document":
          return yield* this.document(top);
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return yield* this.scalar(top);
        case "block-scalar":
          return yield* this.blockScalar(top);
        case "block-map":
          return yield* this.blockMap(top);
        case "block-seq":
          return yield* this.blockSequence(top);
        case "flow-collection":
          return yield* this.flowCollection(top);
        case "doc-end":
          return yield* this.documentEnd(top);
      }
      yield* this.pop();
    }
    peek(n) {
      return this.stack[this.stack.length - n];
    }
    *pop(error2) {
      let token = error2 ?? this.stack.pop();
      if (!token)
        yield { type: "error", offset: this.offset, source: "", message: "Tried to pop an empty stack" };
      else if (this.stack.length === 0)
        yield token;
      else {
        let top = this.peek(1);
        switch (token.type === "block-scalar" ? token.indent = "indent" in top ? top.indent : 0 : token.type === "flow-collection" && top.type === "document" && (token.indent = 0), token.type === "flow-collection" && fixFlowSeqItems(token), top.type) {
          case "document":
            top.value = token;
            break;
          case "block-scalar":
            top.props.push(token);
            break;
          case "block-map": {
            let it = top.items[top.items.length - 1];
            if (it.value) {
              top.items.push({ start: [], key: token, sep: [] }), this.onKeyLine = !0;
              return;
            } else if (it.sep)
              it.value = token;
            else {
              Object.assign(it, { key: token, sep: [] }), this.onKeyLine = !it.explicitKey;
              return;
            }
            break;
          }
          case "block-seq": {
            let it = top.items[top.items.length - 1];
            it.value ? top.items.push({ start: [], value: token }) : it.value = token;
            break;
          }
          case "flow-collection": {
            let it = top.items[top.items.length - 1];
            !it || it.value ? top.items.push({ start: [], key: token, sep: [] }) : it.sep ? it.value = token : Object.assign(it, { key: token, sep: [] });
            return;
          }
          /* istanbul ignore next should not happen */
          default:
            yield* this.pop(), yield* this.pop(token);
        }
        if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
          let last = token.items[token.items.length - 1];
          last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent)) && (top.type === "document" ? top.end = last.start : top.items.push({ start: last.start }), token.items.splice(-1, 1));
        }
      }
    }
    *stream() {
      switch (this.type) {
        case "directive-line":
          yield { type: "directive", offset: this.offset, source: this.source };
          return;
        case "byte-order-mark":
        case "space":
        case "comment":
        case "newline":
          yield this.sourceToken;
          return;
        case "doc-mode":
        case "doc-start": {
          let doc = {
            type: "document",
            offset: this.offset,
            start: []
          };
          this.type === "doc-start" && doc.start.push(this.sourceToken), this.stack.push(doc);
          return;
        }
      }
      yield {
        type: "error",
        offset: this.offset,
        message: `Unexpected ${this.type} token in YAML stream`,
        source: this.source
      };
    }
    *document(doc) {
      if (doc.value)
        return yield* this.lineEnd(doc);
      switch (this.type) {
        case "doc-start": {
          findNonEmptyIndex(doc.start) !== -1 ? (yield* this.pop(), yield* this.step()) : doc.start.push(this.sourceToken);
          return;
        }
        case "anchor":
        case "tag":
        case "space":
        case "comment":
        case "newline":
          doc.start.push(this.sourceToken);
          return;
      }
      let bv = this.startBlockValue(doc);
      bv ? this.stack.push(bv) : yield {
        type: "error",
        offset: this.offset,
        message: `Unexpected ${this.type} token in YAML document`,
        source: this.source
      };
    }
    *scalar(scalar) {
      if (this.type === "map-value-ind") {
        let prev = getPrevProps(this.peek(2)), start = getFirstKeyStartProps(prev), sep;
        scalar.end ? (sep = scalar.end, sep.push(this.sourceToken), delete scalar.end) : sep = [this.sourceToken];
        let map3 = {
          type: "block-map",
          offset: scalar.offset,
          indent: scalar.indent,
          items: [{ start, key: scalar, sep }]
        };
        this.onKeyLine = !0, this.stack[this.stack.length - 1] = map3;
      } else
        yield* this.lineEnd(scalar);
    }
    *blockScalar(scalar) {
      switch (this.type) {
        case "space":
        case "comment":
        case "newline":
          scalar.props.push(this.sourceToken);
          return;
        case "scalar":
          if (scalar.source = this.source, this.atNewLine = !0, this.indent = 0, this.onNewLine) {
            let nl = this.source.indexOf(`
`) + 1;
            for (; nl !== 0; )
              this.onNewLine(this.offset + nl), nl = this.source.indexOf(`
`, nl) + 1;
          }
          yield* this.pop();
          break;
        /* istanbul ignore next should not happen */
        default:
          yield* this.pop(), yield* this.step();
      }
    }
    *blockMap(map3) {
      let it = map3.items[map3.items.length - 1];
      switch (this.type) {
        case "newline":
          if (this.onKeyLine = !1, it.value) {
            let end = "end" in it.value ? it.value.end : void 0;
            (Array.isArray(end) ? end[end.length - 1] : void 0)?.type === "comment" ? end?.push(this.sourceToken) : map3.items.push({ start: [this.sourceToken] });
          } else it.sep ? it.sep.push(this.sourceToken) : it.start.push(this.sourceToken);
          return;
        case "space":
        case "comment":
          if (it.value)
            map3.items.push({ start: [this.sourceToken] });
          else if (it.sep)
            it.sep.push(this.sourceToken);
          else {
            if (this.atIndentedComment(it.start, map3.indent)) {
              let end = map3.items[map3.items.length - 2]?.value?.end;
              if (Array.isArray(end)) {
                arrayPushArray(end, it.start), end.push(this.sourceToken), map3.items.pop();
                return;
              }
            }
            it.start.push(this.sourceToken);
          }
          return;
      }
      if (this.indent >= map3.indent) {
        let atMapIndent = !this.onKeyLine && this.indent === map3.indent, atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind", start = [];
        if (atNextItem && it.sep && !it.value) {
          let nl = [];
          for (let i = 0; i < it.sep.length; ++i) {
            let st = it.sep[i];
            switch (st.type) {
              case "newline":
                nl.push(i);
                break;
              case "space":
                break;
              case "comment":
                st.indent > map3.indent && (nl.length = 0);
                break;
              default:
                nl.length = 0;
            }
          }
          nl.length >= 2 && (start = it.sep.splice(nl[1]));
        }
        switch (this.type) {
          case "anchor":
          case "tag":
            atNextItem || it.value ? (start.push(this.sourceToken), map3.items.push({ start }), this.onKeyLine = !0) : it.sep ? it.sep.push(this.sourceToken) : it.start.push(this.sourceToken);
            return;
          case "explicit-key-ind":
            !it.sep && !it.explicitKey ? (it.start.push(this.sourceToken), it.explicitKey = !0) : atNextItem || it.value ? (start.push(this.sourceToken), map3.items.push({ start, explicitKey: !0 })) : this.stack.push({
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start: [this.sourceToken], explicitKey: !0 }]
            }), this.onKeyLine = !0;
            return;
          case "map-value-ind":
            if (it.explicitKey)
              if (it.sep)
                if (it.value)
                  map3.items.push({ start: [], key: null, sep: [this.sourceToken] });
                else if (includesToken(it.sep, "map-value-ind"))
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start, key: null, sep: [this.sourceToken] }]
                  });
                else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
                  let start2 = getFirstKeyStartProps(it.start), key = it.key, sep = it.sep;
                  sep.push(this.sourceToken), delete it.key, delete it.sep, this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: start2, key, sep }]
                  });
                } else start.length > 0 ? it.sep = it.sep.concat(start, this.sourceToken) : it.sep.push(this.sourceToken);
              else if (includesToken(it.start, "newline"))
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              else {
                let start2 = getFirstKeyStartProps(it.start);
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: start2, key: null, sep: [this.sourceToken] }]
                });
              }
            else
              it.sep ? it.value || atNextItem ? map3.items.push({ start, key: null, sep: [this.sourceToken] }) : includesToken(it.sep, "map-value-ind") ? this.stack.push({
                type: "block-map",
                offset: this.offset,
                indent: this.indent,
                items: [{ start: [], key: null, sep: [this.sourceToken] }]
              }) : it.sep.push(this.sourceToken) : Object.assign(it, { key: null, sep: [this.sourceToken] });
            this.onKeyLine = !0;
            return;
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar": {
            let fs = this.flowScalar(this.type);
            atNextItem || it.value ? (map3.items.push({ start, key: fs, sep: [] }), this.onKeyLine = !0) : it.sep ? this.stack.push(fs) : (Object.assign(it, { key: fs, sep: [] }), this.onKeyLine = !0);
            return;
          }
          default: {
            let bv = this.startBlockValue(map3);
            if (bv) {
              if (bv.type === "block-seq") {
                if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                  yield* this.pop({
                    type: "error",
                    offset: this.offset,
                    message: "Unexpected block-seq-ind on same line with key",
                    source: this.source
                  });
                  return;
                }
              } else atMapIndent && map3.items.push({ start });
              this.stack.push(bv);
              return;
            }
          }
        }
      }
      yield* this.pop(), yield* this.step();
    }
    *blockSequence(seq2) {
      let it = seq2.items[seq2.items.length - 1];
      switch (this.type) {
        case "newline":
          if (it.value) {
            let end = "end" in it.value ? it.value.end : void 0;
            (Array.isArray(end) ? end[end.length - 1] : void 0)?.type === "comment" ? end?.push(this.sourceToken) : seq2.items.push({ start: [this.sourceToken] });
          } else
            it.start.push(this.sourceToken);
          return;
        case "space":
        case "comment":
          if (it.value)
            seq2.items.push({ start: [this.sourceToken] });
          else {
            if (this.atIndentedComment(it.start, seq2.indent)) {
              let end = seq2.items[seq2.items.length - 2]?.value?.end;
              if (Array.isArray(end)) {
                arrayPushArray(end, it.start), end.push(this.sourceToken), seq2.items.pop();
                return;
              }
            }
            it.start.push(this.sourceToken);
          }
          return;
        case "anchor":
        case "tag":
          if (it.value || this.indent <= seq2.indent)
            break;
          it.start.push(this.sourceToken);
          return;
        case "seq-item-ind":
          if (this.indent !== seq2.indent)
            break;
          it.value || includesToken(it.start, "seq-item-ind") ? seq2.items.push({ start: [this.sourceToken] }) : it.start.push(this.sourceToken);
          return;
      }
      if (this.indent > seq2.indent) {
        let bv = this.startBlockValue(seq2);
        if (bv) {
          this.stack.push(bv);
          return;
        }
      }
      yield* this.pop(), yield* this.step();
    }
    *flowCollection(fc) {
      let it = fc.items[fc.items.length - 1];
      if (this.type === "flow-error-end") {
        let top;
        do
          yield* this.pop(), top = this.peek(1);
        while (top?.type === "flow-collection");
      } else if (fc.end.length === 0) {
        switch (this.type) {
          case "comma":
          case "explicit-key-ind":
            !it || it.sep ? fc.items.push({ start: [this.sourceToken] }) : it.start.push(this.sourceToken);
            return;
          case "map-value-ind":
            !it || it.value ? fc.items.push({ start: [], key: null, sep: [this.sourceToken] }) : it.sep ? it.sep.push(this.sourceToken) : Object.assign(it, { key: null, sep: [this.sourceToken] });
            return;
          case "space":
          case "comment":
          case "newline":
          case "anchor":
          case "tag":
            !it || it.value ? fc.items.push({ start: [this.sourceToken] }) : it.sep ? it.sep.push(this.sourceToken) : it.start.push(this.sourceToken);
            return;
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar": {
            let fs = this.flowScalar(this.type);
            !it || it.value ? fc.items.push({ start: [], key: fs, sep: [] }) : it.sep ? this.stack.push(fs) : Object.assign(it, { key: fs, sep: [] });
            return;
          }
          case "flow-map-end":
          case "flow-seq-end":
            fc.end.push(this.sourceToken);
            return;
        }
        let bv = this.startBlockValue(fc);
        bv ? this.stack.push(bv) : (yield* this.pop(), yield* this.step());
      } else {
        let parent = this.peek(2);
        if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep))
          yield* this.pop(), yield* this.step();
        else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
          let prev = getPrevProps(parent), start = getFirstKeyStartProps(prev);
          fixFlowSeqItems(fc);
          let sep = fc.end.splice(1, fc.end.length);
          sep.push(this.sourceToken);
          let map3 = {
            type: "block-map",
            offset: fc.offset,
            indent: fc.indent,
            items: [{ start, key: fc, sep }]
          };
          this.onKeyLine = !0, this.stack[this.stack.length - 1] = map3;
        } else
          yield* this.lineEnd(fc);
      }
    }
    flowScalar(type) {
      if (this.onNewLine) {
        let nl = this.source.indexOf(`
`) + 1;
        for (; nl !== 0; )
          this.onNewLine(this.offset + nl), nl = this.source.indexOf(`
`, nl) + 1;
      }
      return {
        type,
        offset: this.offset,
        indent: this.indent,
        source: this.source
      };
    }
    startBlockValue(parent) {
      switch (this.type) {
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return this.flowScalar(this.type);
        case "block-scalar-header":
          return {
            type: "block-scalar",
            offset: this.offset,
            indent: this.indent,
            props: [this.sourceToken],
            source: ""
          };
        case "flow-map-start":
        case "flow-seq-start":
          return {
            type: "flow-collection",
            offset: this.offset,
            indent: this.indent,
            start: this.sourceToken,
            items: [],
            end: []
          };
        case "seq-item-ind":
          return {
            type: "block-seq",
            offset: this.offset,
            indent: this.indent,
            items: [{ start: [this.sourceToken] }]
          };
        case "explicit-key-ind": {
          this.onKeyLine = !0;
          let prev = getPrevProps(parent), start = getFirstKeyStartProps(prev);
          return start.push(this.sourceToken), {
            type: "block-map",
            offset: this.offset,
            indent: this.indent,
            items: [{ start, explicitKey: !0 }]
          };
        }
        case "map-value-ind": {
          this.onKeyLine = !0;
          let prev = getPrevProps(parent), start = getFirstKeyStartProps(prev);
          return {
            type: "block-map",
            offset: this.offset,
            indent: this.indent,
            items: [{ start, key: null, sep: [this.sourceToken] }]
          };
        }
      }
      return null;
    }
    atIndentedComment(start, indent) {
      return this.type !== "comment" || this.indent <= indent ? !1 : start.every((st) => st.type === "newline" || st.type === "space");
    }
    *documentEnd(docEnd) {
      this.type !== "doc-mode" && (docEnd.end ? docEnd.end.push(this.sourceToken) : docEnd.end = [this.sourceToken], this.type === "newline" && (yield* this.pop()));
    }
    *lineEnd(token) {
      switch (this.type) {
        case "comma":
        case "doc-start":
        case "doc-end":
        case "flow-seq-end":
        case "flow-map-end":
        case "map-value-ind":
          yield* this.pop(), yield* this.step();
          break;
        case "newline":
          this.onKeyLine = !1;
        default:
          token.end ? token.end.push(this.sourceToken) : token.end = [this.sourceToken], this.type === "newline" && (yield* this.pop());
      }
    }
  };

  // node_modules/yaml/browser/dist/public-api.js
  function parseOptions(options) {
    let prettyErrors = options.prettyErrors !== !1;
    return { lineCounter: options.lineCounter || prettyErrors && new LineCounter() || null, prettyErrors };
  }
  function parseAllDocuments(source, options = {}) {
    let { lineCounter, prettyErrors } = parseOptions(options), parser = new Parser(lineCounter?.addNewLine), composer = new Composer(options), docs = Array.from(composer.compose(parser.parse(source)));
    if (prettyErrors && lineCounter)
      for (let doc of docs)
        doc.errors.forEach(prettifyError(source, lineCounter)), doc.warnings.forEach(prettifyError(source, lineCounter));
    return docs.length > 0 ? docs : Object.assign([], { empty: !0 }, composer.streamInfo());
  }

  // node_modules/mdurl/index.mjs
  var mdurl_exports = {};
  __export(mdurl_exports, {
    decode: () => decode_default,
    encode: () => encode_default,
    format: () => format,
    parse: () => parse_default
  });

  // node_modules/mdurl/lib/decode.mjs
  var decodeCache = {};
  function getDecodeCache(exclude) {
    let cache = decodeCache[exclude];
    if (cache)
      return cache;
    cache = decodeCache[exclude] = [];
    for (let i = 0; i < 128; i++) {
      let ch = String.fromCharCode(i);
      cache.push(ch);
    }
    for (let i = 0; i < exclude.length; i++) {
      let ch = exclude.charCodeAt(i);
      cache[ch] = "%" + ("0" + ch.toString(16).toUpperCase()).slice(-2);
    }
    return cache;
  }
  function decode(string2, exclude) {
    typeof exclude != "string" && (exclude = decode.defaultChars);
    let cache = getDecodeCache(exclude);
    return string2.replace(/(%[a-f0-9]{2})+/gi, function(seq2) {
      let result = "";
      for (let i = 0, l = seq2.length; i < l; i += 3) {
        let b1 = parseInt(seq2.slice(i + 1, i + 3), 16);
        if (b1 < 128) {
          result += cache[b1];
          continue;
        }
        if ((b1 & 224) === 192 && i + 3 < l) {
          let b2 = parseInt(seq2.slice(i + 4, i + 6), 16);
          if ((b2 & 192) === 128) {
            let chr = b1 << 6 & 1984 | b2 & 63;
            chr < 128 ? result += "��" : result += String.fromCharCode(chr), i += 3;
            continue;
          }
        }
        if ((b1 & 240) === 224 && i + 6 < l) {
          let b2 = parseInt(seq2.slice(i + 4, i + 6), 16), b3 = parseInt(seq2.slice(i + 7, i + 9), 16);
          if ((b2 & 192) === 128 && (b3 & 192) === 128) {
            let chr = b1 << 12 & 61440 | b2 << 6 & 4032 | b3 & 63;
            chr < 2048 || chr >= 55296 && chr <= 57343 ? result += "���" : result += String.fromCharCode(chr), i += 6;
            continue;
          }
        }
        if ((b1 & 248) === 240 && i + 9 < l) {
          let b2 = parseInt(seq2.slice(i + 4, i + 6), 16), b3 = parseInt(seq2.slice(i + 7, i + 9), 16), b4 = parseInt(seq2.slice(i + 10, i + 12), 16);
          if ((b2 & 192) === 128 && (b3 & 192) === 128 && (b4 & 192) === 128) {
            let chr = b1 << 18 & 1835008 | b2 << 12 & 258048 | b3 << 6 & 4032 | b4 & 63;
            chr < 65536 || chr > 1114111 ? result += "����" : (chr -= 65536, result += String.fromCharCode(55296 + (chr >> 10), 56320 + (chr & 1023))), i += 9;
            continue;
          }
        }
        result += "�";
      }
      return result;
    });
  }
  decode.defaultChars = ";/?:@&=+$,#";
  decode.componentChars = "";
  var decode_default = decode;

  // node_modules/mdurl/lib/encode.mjs
  var encodeCache = {};
  function getEncodeCache(exclude) {
    let cache = encodeCache[exclude];
    if (cache)
      return cache;
    cache = encodeCache[exclude] = [];
    for (let i = 0; i < 128; i++) {
      let ch = String.fromCharCode(i);
      /^[0-9a-z]$/i.test(ch) ? cache.push(ch) : cache.push("%" + ("0" + i.toString(16).toUpperCase()).slice(-2));
    }
    for (let i = 0; i < exclude.length; i++)
      cache[exclude.charCodeAt(i)] = exclude[i];
    return cache;
  }
  function encode(string2, exclude, keepEscaped) {
    typeof exclude != "string" && (keepEscaped = exclude, exclude = encode.defaultChars), typeof keepEscaped > "u" && (keepEscaped = !0);
    let cache = getEncodeCache(exclude), result = "";
    for (let i = 0, l = string2.length; i < l; i++) {
      let code2 = string2.charCodeAt(i);
      if (keepEscaped && code2 === 37 && i + 2 < l && /^[0-9a-f]{2}$/i.test(string2.slice(i + 1, i + 3))) {
        result += string2.slice(i, i + 3), i += 2;
        continue;
      }
      if (code2 < 128) {
        result += cache[code2];
        continue;
      }
      if (code2 >= 55296 && code2 <= 57343) {
        if (code2 >= 55296 && code2 <= 56319 && i + 1 < l) {
          let nextCode = string2.charCodeAt(i + 1);
          if (nextCode >= 56320 && nextCode <= 57343) {
            result += encodeURIComponent(string2[i] + string2[i + 1]), i++;
            continue;
          }
        }
        result += "%EF%BF%BD";
        continue;
      }
      result += encodeURIComponent(string2[i]);
    }
    return result;
  }
  encode.defaultChars = ";/?:@&=+$,-_.!~*'()#";
  encode.componentChars = "-_.!~*'()";
  var encode_default = encode;

  // node_modules/mdurl/lib/format.mjs
  function format(url) {
    let result = "";
    return result += url.protocol || "", result += url.slashes ? "//" : "", result += url.auth ? url.auth + "@" : "", url.hostname && url.hostname.indexOf(":") !== -1 ? result += "[" + url.hostname + "]" : result += url.hostname || "", result += url.port ? ":" + url.port : "", result += url.pathname || "", result += url.search || "", result += url.hash || "", result;
  }

  // node_modules/mdurl/lib/parse.mjs
  function Url() {
    this.protocol = null, this.slashes = null, this.auth = null, this.port = null, this.hostname = null, this.hash = null, this.search = null, this.pathname = null;
  }
  var protocolPattern = /^([a-z0-9.+-]+:)/i, portPattern = /:[0-9]*$/, simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/, delims = ["<", ">", '"', "`", " ", "\r", `
`, "	"], unwise = ["{", "}", "|", "\\", "^", "`"].concat(delims), autoEscape = ["'"].concat(unwise), nonHostChars = ["%", "/", "?", ";", "#"].concat(autoEscape), hostEndingChars = ["/", "?", "#"], hostnameMaxLen = 255, hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/, hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/, hostlessProtocol = {
    javascript: !0,
    "javascript:": !0
  }, slashedProtocol = {
    http: !0,
    https: !0,
    ftp: !0,
    gopher: !0,
    file: !0,
    "http:": !0,
    "https:": !0,
    "ftp:": !0,
    "gopher:": !0,
    "file:": !0
  };
  function urlParse(url, slashesDenoteHost) {
    if (url && url instanceof Url) return url;
    let u = new Url();
    return u.parse(url, slashesDenoteHost), u;
  }
  Url.prototype.parse = function(url, slashesDenoteHost) {
    let lowerProto, hec, slashes, rest = url;
    if (rest = rest.trim(), !slashesDenoteHost && url.split("#").length === 1) {
      let simplePath = simplePathPattern.exec(rest);
      if (simplePath)
        return this.pathname = simplePath[1], simplePath[2] && (this.search = simplePath[2]), this;
    }
    let proto = protocolPattern.exec(rest);
    if (proto && (proto = proto[0], lowerProto = proto.toLowerCase(), this.protocol = proto, rest = rest.substr(proto.length)), (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) && (slashes = rest.substr(0, 2) === "//", slashes && !(proto && hostlessProtocol[proto]) && (rest = rest.substr(2), this.slashes = !0)), !hostlessProtocol[proto] && (slashes || proto && !slashedProtocol[proto])) {
      let hostEnd = -1;
      for (let i = 0; i < hostEndingChars.length; i++)
        hec = rest.indexOf(hostEndingChars[i]), hec !== -1 && (hostEnd === -1 || hec < hostEnd) && (hostEnd = hec);
      let auth, atSign;
      hostEnd === -1 ? atSign = rest.lastIndexOf("@") : atSign = rest.lastIndexOf("@", hostEnd), atSign !== -1 && (auth = rest.slice(0, atSign), rest = rest.slice(atSign + 1), this.auth = auth), hostEnd = -1;
      for (let i = 0; i < nonHostChars.length; i++)
        hec = rest.indexOf(nonHostChars[i]), hec !== -1 && (hostEnd === -1 || hec < hostEnd) && (hostEnd = hec);
      hostEnd === -1 && (hostEnd = rest.length), rest[hostEnd - 1] === ":" && hostEnd--;
      let host = rest.slice(0, hostEnd);
      rest = rest.slice(hostEnd), this.parseHost(host), this.hostname = this.hostname || "";
      let ipv6Hostname = this.hostname[0] === "[" && this.hostname[this.hostname.length - 1] === "]";
      if (!ipv6Hostname) {
        let hostparts = this.hostname.split(/\./);
        for (let i = 0, l = hostparts.length; i < l; i++) {
          let part = hostparts[i];
          if (part && !part.match(hostnamePartPattern)) {
            let newpart = "";
            for (let j = 0, k = part.length; j < k; j++)
              part.charCodeAt(j) > 127 ? newpart += "x" : newpart += part[j];
            if (!newpart.match(hostnamePartPattern)) {
              let validParts = hostparts.slice(0, i), notHost = hostparts.slice(i + 1), bit = part.match(hostnamePartStart);
              bit && (validParts.push(bit[1]), notHost.unshift(bit[2])), notHost.length && (rest = notHost.join(".") + rest), this.hostname = validParts.join(".");
              break;
            }
          }
        }
      }
      this.hostname.length > hostnameMaxLen && (this.hostname = ""), ipv6Hostname && (this.hostname = this.hostname.substr(1, this.hostname.length - 2));
    }
    let hash = rest.indexOf("#");
    hash !== -1 && (this.hash = rest.substr(hash), rest = rest.slice(0, hash));
    let qm = rest.indexOf("?");
    return qm !== -1 && (this.search = rest.substr(qm), rest = rest.slice(0, qm)), rest && (this.pathname = rest), slashedProtocol[lowerProto] && this.hostname && !this.pathname && (this.pathname = ""), this;
  };
  Url.prototype.parseHost = function(host) {
    let port = portPattern.exec(host);
    port && (port = port[0], port !== ":" && (this.port = port.substr(1)), host = host.substr(0, host.length - port.length)), host && (this.hostname = host);
  };
  var parse_default = urlParse;

  // node_modules/uc.micro/build/index.mjs
  var build_exports = {};
  __export(build_exports, {
    Any: () => Any,
    Cc: () => Cc,
    Cf: () => Cf,
    P: () => P,
    S: () => S,
    Z: () => Z
  });
  var Any = /[\0-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/, Cc = /[\0-\x1F\x7F-\x9F]/, Cf = /[\xAD\u0600-\u0605\u061C\u06DD\u070F\u0890\u0891\u08E2\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB]|\uD804[\uDCBD\uDCCD]|\uD80D[\uDC30-\uDC3F]|\uD82F[\uDCA0-\uDCA3]|\uD834[\uDD73-\uDD7A]|\uDB40[\uDC01\uDC20-\uDC7F]/, P = /[!-#%-\*,-\/:;\?@\[-\]_\{\}\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061D-\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C77\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B4E\u1B4F\u1B5A-\u1B60\u1B7D-\u1B7F\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4F\u2E52-\u2E5D\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD803[\uDD6E\uDEAD\uDED0\uDF55-\uDF59\uDF86-\uDF89]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC8\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9\uDFD4\uDFD5\uDFD7\uDFD8]|\uD805[\uDC4B-\uDC4F\uDC5A\uDC5B\uDC5D\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDE60-\uDE6C\uDEB9\uDF3C-\uDF3E]|\uD806[\uDC3B\uDD44-\uDD46\uDDE2\uDE3F-\uDE46\uDE9A-\uDE9C\uDE9E-\uDEA2\uDF00-\uDF09\uDFE1]|\uD807[\uDC41-\uDC45\uDC70\uDC71\uDEF7\uDEF8\uDF43-\uDF4F\uDFFF]|\uD809[\uDC70-\uDC74]|\uD80B[\uDFF1\uDFF2]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD81B[\uDD6D-\uDD6F\uDE97-\uDE9A\uDFE2]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]|\uD839\uDDFF|\uD83A[\uDD5E\uDD5F]/, S = /[\$\+<->\^`\|~\xA2-\xA6\xA8\xA9\xAC\xAE-\xB1\xB4\xB8\xD7\xF7\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u02FF\u0375\u0384\u0385\u03F6\u0482\u058D-\u058F\u0606-\u0608\u060B\u060E\u060F\u06DE\u06E9\u06FD\u06FE\u07F6\u07FE\u07FF\u0888\u09F2\u09F3\u09FA\u09FB\u0AF1\u0B70\u0BF3-\u0BFA\u0C7F\u0D4F\u0D79\u0E3F\u0F01-\u0F03\u0F13\u0F15-\u0F17\u0F1A-\u0F1F\u0F34\u0F36\u0F38\u0FBE-\u0FC5\u0FC7-\u0FCC\u0FCE\u0FCF\u0FD5-\u0FD8\u109E\u109F\u1390-\u1399\u166D\u17DB\u1940\u19DE-\u19FF\u1B61-\u1B6A\u1B74-\u1B7C\u1FBD\u1FBF-\u1FC1\u1FCD-\u1FCF\u1FDD-\u1FDF\u1FED-\u1FEF\u1FFD\u1FFE\u2044\u2052\u207A-\u207C\u208A-\u208C\u20A0-\u20C1\u2100\u2101\u2103-\u2106\u2108\u2109\u2114\u2116-\u2118\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u2140-\u2144\u214A-\u214D\u214F\u218A\u218B\u2190-\u2307\u230C-\u2328\u232B-\u2429\u2440-\u244A\u249C-\u24E9\u2500-\u2767\u2794-\u27C4\u27C7-\u27E5\u27F0-\u2982\u2999-\u29D7\u29DC-\u29FB\u29FE-\u2B73\u2B76-\u2BFF\u2CE5-\u2CEA\u2E50\u2E51\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFF\u3004\u3012\u3013\u3020\u3036\u3037\u303E\u303F\u309B\u309C\u3190\u3191\u3196-\u319F\u31C0-\u31E5\u31EF\u3200-\u321E\u322A-\u3247\u3250\u3260-\u327F\u328A-\u32B0\u32C0-\u33FF\u4DC0-\u4DFF\uA490-\uA4C6\uA700-\uA716\uA720\uA721\uA789\uA78A\uA828-\uA82B\uA836-\uA839\uAA77-\uAA79\uAB5B\uAB6A\uAB6B\uFB29\uFBB2-\uFBD2\uFD40-\uFD4F\uFD90\uFD91\uFDC8-\uFDCF\uFDFC-\uFDFF\uFE62\uFE64-\uFE66\uFE69\uFF04\uFF0B\uFF1C-\uFF1E\uFF3E\uFF40\uFF5C\uFF5E\uFFE0-\uFFE6\uFFE8-\uFFEE\uFFFC\uFFFD]|\uD800[\uDD37-\uDD3F\uDD79-\uDD89\uDD8C-\uDD8E\uDD90-\uDD9C\uDDA0\uDDD0-\uDDFC]|\uD802[\uDC77\uDC78\uDEC8]|\uD803[\uDD8E\uDD8F\uDED1-\uDED8]|\uD805\uDF3F|\uD807[\uDFD5-\uDFF1]|\uD81A[\uDF3C-\uDF3F\uDF45]|\uD82F\uDC9C|\uD833[\uDC00-\uDCEF\uDCFA-\uDCFC\uDD00-\uDEB3\uDEBA-\uDED0\uDEE0-\uDEF0\uDF50-\uDFC3]|\uD834[\uDC00-\uDCF5\uDD00-\uDD26\uDD29-\uDD64\uDD6A-\uDD6C\uDD83\uDD84\uDD8C-\uDDA9\uDDAE-\uDDEA\uDE00-\uDE41\uDE45\uDF00-\uDF56]|\uD835[\uDEC1\uDEDB\uDEFB\uDF15\uDF35\uDF4F\uDF6F\uDF89\uDFA9\uDFC3]|\uD836[\uDC00-\uDDFF\uDE37-\uDE3A\uDE6D-\uDE74\uDE76-\uDE83\uDE85\uDE86]|\uD838[\uDD4F\uDEFF]|\uD83B[\uDCAC\uDCB0\uDD2E\uDEF0\uDEF1]|\uD83C[\uDC00-\uDC2B\uDC30-\uDC93\uDCA0-\uDCAE\uDCB1-\uDCBF\uDCC1-\uDCCF\uDCD1-\uDCF5\uDD0D-\uDDAD\uDDE6-\uDE02\uDE10-\uDE3B\uDE40-\uDE48\uDE50\uDE51\uDE60-\uDE65\uDF00-\uDFFF]|\uD83D[\uDC00-\uDED8\uDEDC-\uDEEC\uDEF0-\uDEFC\uDF00-\uDFD9\uDFE0-\uDFEB\uDFF0]|\uD83E[\uDC00-\uDC0B\uDC10-\uDC47\uDC50-\uDC59\uDC60-\uDC87\uDC90-\uDCAD\uDCB0-\uDCBB\uDCC0\uDCC1\uDCD0-\uDCD8\uDD00-\uDE57\uDE60-\uDE6D\uDE70-\uDE7C\uDE80-\uDE8A\uDE8E-\uDEC6\uDEC8\uDECD-\uDEDC\uDEDF-\uDEEA\uDEEF-\uDEF8\uDF00-\uDF92\uDF94-\uDFEF\uDFFA]/, Z = /[ \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/;

  // node_modules/entities/dist/decode-codepoint.js
  var c1 = [
    8364,
    0,
    8218,
    402,
    8222,
    8230,
    8224,
    8225,
    710,
    8240,
    352,
    8249,
    338,
    0,
    381,
    0,
    0,
    8216,
    8217,
    8220,
    8221,
    8226,
    8211,
    8212,
    732,
    8482,
    353,
    8250,
    339,
    0,
    382,
    376
  ];
  function isInvalidCodePoint(codePoint) {
    return codePoint === 0 || codePoint >= 55296 && codePoint <= 57343 || codePoint > 1114111;
  }
  function replaceCodePoint(codePoint) {
    return isInvalidCodePoint(codePoint) ? 65533 : codePoint >= 128 && codePoint <= 159 && c1[codePoint - 128] || codePoint;
  }
  function codePointToString(codePoint) {
    return codePoint - 1 >>> 0 < 127 || codePoint - 160 >>> 0 < 55136 ? String.fromCharCode(codePoint) : String.fromCodePoint(replaceCodePoint(codePoint));
  }

  // node_modules/entities/dist/internal/decode-shared.js
  var BASE91_INVERSE = /* @__PURE__ */ (() => {
    let table2 = new Uint8Array(127), code2 = 0;
    for (let char = 33; char <= 126; char++)
      char !== 34 && char !== 36 && char !== 92 && (table2[char] = code2++);
    return table2;
  })();
  function decodeTrieDict(input, resultLength, atomCount, dict1AtomCount, ngramCount, dictSize) {
    let inputLength = input.length, twoCharBias = dictSize * 90, pos = 0, readSlotCode = () => {
      let c12 = BASE91_INVERSE[input.charCodeAt(pos++)];
      return c12 < dictSize ? c12 : c12 * 91 - twoCharBias + BASE91_INVERSE[input.charCodeAt(pos++)];
    }, dict2AtomCount = atomCount - dict1AtomCount, slotCount = atomCount + ngramCount, single = new Int32Array(slotCount);
    single.fill(-1, dict1AtomCount, dictSize), single.fill(-1, dictSize + dict2AtomCount, slotCount);
    let start = new Int32Array(slotCount), length = new Int32Array(slotCount);
    function decodeDelta(count, off) {
      let previous = 0, slot = off, end = off + count;
      for (; slot < end; ) {
        let code2 = BASE91_INVERSE[input.charCodeAt(pos++)];
        if (code2 < 89)
          previous += code2, single[slot++] = previous;
        else if (code2 === 89) {
          let runLength = BASE91_INVERSE[input.charCodeAt(pos++)] + 2;
          for (; runLength--; )
            single[slot++] = ++previous;
        } else {
          let next = BASE91_INVERSE[input.charCodeAt(pos++)];
          previous += 89 + // eslint-disable-next-line unicorn/prefer-minimal-ternary -- branches read a different number of side-effecting input bytes
          (next < 90 ? next * 91 + BASE91_INVERSE[input.charCodeAt(pos++)] : BASE91_INVERSE[input.charCodeAt(pos++)] * 8281 + BASE91_INVERSE[input.charCodeAt(pos++)] * 91 + BASE91_INVERSE[input.charCodeAt(pos++)]), single[slot++] = previous;
        }
      }
    }
    decodeDelta(dict1AtomCount, 0), decodeDelta(dict2AtomCount, dictSize);
    let references = new Int32Array(ngramCount * 2), poolSize = 0, ngramIndex = 0;
    function readNgramReferences(count, startSlot) {
      for (let index = 0; index < count; index++) {
        let slot = startSlot + index, a = readSlotCode(), b = readSlotCode();
        references[ngramIndex * 2] = a, references[ngramIndex * 2 + 1] = b, ngramIndex += 1, start[slot] = poolSize;
        let entryLength = (single[a] < 0 ? length[a] : 1) + (single[b] < 0 ? length[b] : 1);
        length[slot] = entryLength, poolSize += entryLength;
      }
    }
    readNgramReferences(ngramCount - dictSize + dict1AtomCount, dictSize + dict2AtomCount), readNgramReferences(dictSize - dict1AtomCount, dict1AtomCount);
    let pool = new Uint16Array(poolSize), write = 0;
    for (let index = 0; index < ngramIndex; index++)
      for (let half = 0; half < 2; half++) {
        let source = references[index * 2 + half], value = single[source];
        if (value < 0) {
          let read = start[source], readEnd = read + length[source];
          for (; read < readEnd; )
            pool[write++] = pool[read++];
        } else
          pool[write++] = value;
      }
    let out = new Uint16Array(resultLength), outIndex = 0;
    for (; pos < inputLength; ) {
      let slot = BASE91_INVERSE[input.charCodeAt(pos++)];
      slot >= dictSize && (slot = slot * 91 - twoCharBias + BASE91_INVERSE[input.charCodeAt(pos++)]);
      let value = single[slot];
      if (value < 0) {
        let read = start[slot], readEnd = read + length[slot];
        for (; read < readEnd; )
          out[outIndex++] = pool[read++];
      } else
        out[outIndex++] = value;
    }
    return out;
  }

  // node_modules/entities/dist/generated/decode-data-html.js
  var htmlDecodeTree = /* @__PURE__ */ decodeTrieDict("!}.&u%}'&}*'~!6*)%&,~!J~!J~%L~y<~!R,~~%Lu~~#GD~~#|)1#%}^%}2%+#.##%##%}&%##%'#%##&%#%#'%#&#%#&#'#%%#&#%##%#)%''%&%#%#'%#%%#%%}%%%#%#&(23#%%#&-%0%('1#(##%#'##+%'*.:1}#%#6-+(%'%%#%%%}#L'2351&('%}&/N'(0(/*-%(%%}#'+&T%7.2}#&%&#%#36/5##%&%%#&#%%#))2%%##%&&'0~!#*+&'%1~!%).'3q?&%'1~!.##%6(~!+%%%(Gw'rT~!E#<nA%#jZ~!H%(~!42##~!*31&~!G%U~#)5~#`3~!J~!Z~%]~%Y~%C~!q~!u~#kz~%#~!6'~!D~!U~!?~#T~!c%~!G#'~%7|~!G~!J~!G&~#pb~(Df}#%}*&}#%##%##%##&#-}&'#'&%#.++}%mI,#,@&(}*%}*'%&##&#%##%}&0}#.},U},%}+%}&%}#%##&}B%(}(%}+%)})%##%#&}&%##%&}<%}>%#%&}*%}(%}9%}/%})%}*%}*%}?&}&%}3%}&*#%})%#%#)}#&#-#+*%E%%'%'#%}#*V##&##I}#&&##%&%#&&Qf%%))w/0+&%#(#.%-''''++++7}>%4'',##1,#%#&%##&#'##&#*#9)%&%}#*}%,#+P(%A&%#'&##wSD',9E00#y#@}(+}&%&>~!#~!X}#*}(&&}(&}(,%}%&#+&}#&}I%#%}%)#(},'%#*}4%%#%}(''}#/##(##),%-##%%)#&}(.}&%#&}%%}*&#%},&&}&%}#%*'#%})%}D&}&%}-&}6&#&}-,%}#%})-(~+`~,=?~I9'9%~!,#%})%})%}@%}?%}(~!?~#<~#pP~#BG~#=1#%K+~#?#~%;)~#A~#mF1~#A'~'X%'~#lR~#N~'N~#r~#m#-~#i'?%#'%~#B%##%,%#~#_%#0%~#]732~,w~2+#:&#%&'0%&>%}#>##F+)#%&&#(+_}4&}-%}(&}@&}O7Fdf0@+/v4}&WU##&/0#&'('B#%}.%}'+#%}#%%&#&%#%##+#&#)#6#'#.},%}c%},%#%##%&#&%#&~#>'*-.%##%##%}#%%}%'~#)D1}#%*&~#_%%'(~#S2%'.}#~#=##*'*-%}&'%'##&&~'E%.#&~#M4}%%##&'%#~#O1##%&#'+~#<B%##%%'%+~#;#@%}#&%#&&%#(~#H1}'%'##&&~#?A}&'~#D#%32}'&&&&~#[}'(#%}'~#;C})&}%%#%~#=&%,3}%'(#%%~#^'#&&)#%'~#Y%-~#d-%'~#^%%&#&&&}#~#b~2t*&'~&(~&@~0%~e~3}%*''0})&}+~!9##-}#%-hD*)1fC#%/&/fB#40~!+#)*4~!+~!K'&:~!/*7~!.#~!H~!L':~%x&~!H#~!*~%1~!I#~!+A~#p'~!F~~#-#~,,(~.Z~!V~%;'B'mq-W~!N~%I%#&&#&}#%},%%}'%}+X#%}#&}(%}'%}<%}#%}%%'}'%}:~![)9@~%>~#UA%-%##&~!C%~!-.9:~!1~!-^2/:a~!y,D*J#-5)/4~%23,~#G~!L1~!0X3`~!2+~!!0-~&E~!W~!o,>Y&]~%cZx_&~#O*9#A#'#+I'%#)~!0B*-5A+-((F&*M#)(-7-5+'-3a5Vi~!Y~!?+[)%3),ERHm~!+:D,VG.+)?fB%%*(%)'(#&80%1'8`K8?`+'Z#&O&'H5#*9)A%%5&3))0%39+.*7#()&&*=4@**L)<'_&*+..;(#*+)./&0#3)%')-8(4ixD(&.}%,('aI:,)%,k2231T)I'#/-W7,/'Q#.'Y24+h')37</31&83##&0#),H(?'&?/1##%#&&#%''-%&&&#(&''&#.-'%#%%(,')*'&#&#'##%(%(#%('#&##%%%%('%#%#%%#%#&%##h>w+v<ayvyvcg.uuhKr}g/v|g>u9i[~>g5uI~=RvdwEg;v/g;uk!!TTSx]@RT!U!#!@VBRUU!'UTe-d0c`e&gSdicedFcrdTaqb.kYcAohdYd@a3e+d}dMdtd.aJ#bqcK`dle/e.e'dwdPdodddjbEb}ogd^ofdpduc6j?l%d{drdqc)d7bacOdQ%T#Y)X.sR[yH>6Vyv3[xwLu>vo'!*.[yBacahoj>6Rew3[xqdZa#!a&#^(X-[yG>6Vyu3[xvg3sEr|g.u/Ri9db0T#^(Xa)!-[y;>6Vylg4wKs{JwNZt3@3r=c4Z([xlg;wKt!cpq's@v7A'*a(a+!-a#[y<3Dt?3Dt'>6Vym3[xmg9rxsNJwLZt4~?r?db1T#`-!(Xa,!0[yS>6Vz%NuQs.g4wKtnJwNZtS@3r>c4Z([y%g;wKtrdga8!a(!#&T*Y-Xa#!a0<or[yc3Dtq>6Vz43[y3JwNZtf@3s!Ju}!%Dti:pm3c_%X#tjB5pkd6q!r]u?voC'*-a.a2!0a&a+[yI3DtI3Ds~3DtH>6Vyw3[xx;:s#~<5pKJwNZtE@3r~d`a)!a2T#a.(!+U.X1[yT3Dt`3Dtv>6Vz&3[y&g9rxwzcxstPu.<rAJwLZtT~?r@dZa%!a.&^*Za(/Reu[ya>6Vz23[y1g3sEr}wkg{NuQRg{ci(U#5@b`~,cg#U(2WnH5wugcRh7dX#T(Y,a'Ta!!a,[yZ<]mj>6Vz,3[y+Pv#5ReZKu+=,%!H}7ABwkaS?Rh:BcW(X#<]mrj:ubv/ARekdg%!(!a.*Ta(Y.X1!#sP>Rl*Dt6[y>>6Vyo3Wf*jOvuumvuRgRJuq*!:9<B@bX~3jVv&v@s@5Re[d/rQt{uAvo&a&a*)a2!,0Wf!3Dt0=Bs'>6Re}3[xy~<5s%JwJZt1~Gs)c;&!#2sJkNuXvzq7rxu,Re8dka4!a8(aEZ+a@Y.X1Xa)[yd=Bs(3DtP>6Vz53[y4cX#X&Re:avRe9~<5s&JwJZtQ~Gs*i^rzvdRg+Jv{%!2sbB@bX}kdga,!Za?&^*T1/!a'Dt+[y6>6Vyf3Wf%g/u;s4hGu6?Rh-JvZ,!c%#&RoX54Rivj7uyvf8RgTKvZB%*!2sGh<vu5Rgq<=C::9bb~#dZ#T&Ta6Y.X*Dt>[y93Wf)coZ(T,6VyifluvRgC@95@B@bX~/hFu34cC#T,k/unq8w8Q5RkUklwQuzunq8w8Q5Rk8d/rJu?v8w9)-&!a0a;a&aIWejg3sEr/h1s<DtDJvyZqY5aws3Jvy!&Wei~Hr1:au5@Bag>23E~5c:Z&bX};kKv?w&unuVu5Rjc;>bs)#~@:Rh.=ay<a]C;b`}Vd6s/t{uAvoaxa()!a,a7%-a#a2Dt,[yF2Wo[>6Vyt3[xuNuPRi&NuPwpi#RoWh?vf8Ri%Jv]!%Ri:KvxD!.'2WeAjZu`q9rxu,Re7woeAg-unLq(qA_/*2Wg_g3u5q^9:4E}/jTrxrzv=Wkkd~0UX#^^Xa-a1a5T&a=U1a'*aEa]!a*aPaA-adok[y54Rn>;:p3~Dp5g9rpsFNvZqjg3uJp4~<5p0Pw;5qlJwNZt*@3p1Pw:5p/Ou!5p2JvG'!6Vye=<qnJvh_[xhg3v,Rh3kOwOw-sDuev/Re^dha[a%!%!a+#Ta7)-5TaCaO!aka!a)sf[yb2>Rl!9ARiq5E}Qg=ucRkBE|oJrJ_@Wk~@Wk{JrJ_@Wk|@WkyJrJ_@Wk}@WkzJvO_[y2g-vMRmiKuYC!)&>Ri;>Ri<@3RkNc](X#@9Rk=g5vuRmhKvDB!+'=]meg3u4Rmgd)#Y'Vz3CARmfd`a+!%T'!+#Ta1Ta6TaM-sTDt9[yA9sYd'%Y#s[[xpj:ueunaXRgEjRq,v-vuqdd2'`#6Rev<32@5>:2<E}5xIo9a*X#Y(;5RePJvD_g>vyRgNj8w)v8<wggs:RgXiZt|vjx,hSq3ah!-(~@:Ro/Ou!5RhWj^v(pyw8unRhUdx-UY#^Ua.a3a70!)%UX1TaDa)'omRiRRhE[y:3Dsz=Br,>6Vyj3[xkg6ruwjcqsrPw;5r*Ku]D'Zt-@3r(~?r.i[vwv]dU1a--U#`a4(g/vsRhPOu!5RhLj:rmu9Wo!~@:wdh@g/vsRiTjXuvvNr}:RhBj^v(pyw8unRn]dz1UYa'a+^Y(!aETZalaRY.Ta?a4[yDJw1!#qLsW>6Vyrfzq-pLflpwRe|Js>%!Dt@3Dt&Jvy_[xs~HrnjMuwpsw'RecKu+D#'!t<~Grl~?rjg5u-x,gwp{ah!-(~@:Rg~Ou!5Rh'jXuvvNr}:Rh#cW#X/c;&!#2sLi[v7u7RgpJv)(!iLrxu,Re6j7v@s@5Se[e7d`aW!Za(a`T.a#!a3!&aDa-!9)Dt_=6s+3[x~~DR|h~DS6avhGun5RkZj3w)v-]mkKunB!&*]kb97R|i<ARk<c:Z(6Vy}Juh'!wziMRoS:F|vkLuauJv5vtvQRh1d='T+Y#VyO~DR|jcF#T'7R|g97R|kJv3'!ay<Rj,Jvh&!:ReXcsa6*a+#a#_aIRf9aLRf?c,Z&Rf5Rf7c.Z&Rf;Rf>cQ#%T'p-Rf8Rf=ct#%'(*!,p,Rf4p+Rf6Rf:Rf<d~'Ua%U*^UYa(!a,-!#a4YaTalaEX0a8a<Weo3Dt/3Dsx=Br93Wen~Dr;~<5p<JwNZt2@3p=Pw:5p;Ou!5r3c7&!#:p>3Ds}KvGB)_6Vyk2sM=<r7x'eovA(!hFu1ARf}cV#X&@r5j6rvwQa^Rf3c=Za'wkghJv__g;unRggA53B9=b^}%j6uduo5Jq;!(hIv%2Re`Ou4ARe_e%a#^^^Xa&!a*a2!&a6YaP!*ad!#a:aE/5Rn?[y@>6Vyp;:pE~DrY~<5pBJwNZt8@3pCh=rt3rWPw:5pAJup_[xoNuPpF9c!#'45pD5ARn)d8#X'X*3@rU72s]h>v<<sSjJpqvewOJq/(!hNw'5ReBk0s2u3w/w'5ReE5@Jq.!a+JQ!&WeU23d(#Y&RjG5]jBk!u7w&u0udARjEe#+^^^Ub#!a2/a`Z(agT1!a-a;|@TaG!aS[yV=Re~fow'RguNuPRe?bz#'>RoUWeL>:Cbb|?JwPZtVg6ruRmzJvD'!6Vz(g/vmRh~Jvy_[y(g9voRgyx*cy(#2>Ri2B9b]~9kIw9u7rluJu3Rg]dI#a%UY'@=p%CAx.gQZ&RhwwygtRm{x5g_Z'+ABqR9Woa=Bp&dV#^*Xa'!&@o{g4v]Rk;Jv{!%Rk[wkkiA5RkiwwfUB=x,fUuqC&*!>RfTg8v0RfV~ARfSd;rJsAuAv9wR'ae+/aO!a@aza/a#[yQ@Wg!2Wemg3sEr0JvB_g>uvReWg2v+Re=KupB_+[y!2AbY~-~Hr2AJwD!(h<~El>h<~El?Kun@+_:9b`}Kg-v/Ri3g;vtwyk_9]k_d=&T#*U.6qh@Ab`|K9:H|CJv[!&3Dtex'fDwC%!Rf[9WlMd[(^X,!a%Z06Vz!@WgBg=v~Rgvg,QRe@awd,#Y+jTv|Q~EfWj]uNr|~FRfXdy#Y&^Ua%!aO.!(a)Ua;=!a@aKap!a-,a!Ta]a[rSa]p?[y82sK=Bq~;:p:~<5p8Pw:5p7d'#Y'Wf(;RnRi[u4w&RgJJvG'!6Vyh=<r#ijuuv/sIKuYD'ZtG@3p9~Gr&d2#`(g<vtRgFj`u5w&rqpxRf2CJuY!+:wfnTOu!5Rg}jNs1ucv&RfwJvA!&3@q|BDcC#T,k/unq8w8Q5RkTklwQuzunq8w8Q5Rk9dga#!a'!a=#a0!:+Tb*b@aO.a4!aba8aFJv^}?!VyR~Dr<g;u%Rn.~<5p[x'e`wNZtR@3p]Pw:5pZhNvjBp.woe_g5u-r4JwF!%DtO3:ooc7&!#:p^3DtpLuGw(!+%)Dtk6Vz#2sd=<r8d'#Y([y#<x3gJt`w@!)%}MRiowzikRij=]ilxAf3,U(#B2Rf#g0v-Rm[ck{`U#]giKv3>)!&6Ri154s,KuGB_%@r68r:dJ|t`#X(9<E|u2@H|rx3gJu?w'!+'1Nu7Reg4=H~+9<wxgY95Rm]xLggZ-`(X}U2:Ri4h<uOawRmsJv__5@bb{jbV~3dka#a'a]!,#a+U=a>b6a3b%!/aKa/)!arwve^VyJ;:pR~DpTg3uJpS~<5pOPw;5qmPw:5pNOu!5pQJvG'!6Vyx=<qoJvA!{~Jup!%@qk7Rn/KvyD!}''[xz;>wkh'?Rh,x8gyt`w5D!&),(SgyccRgztJ@3pPB5p#d'(Y#<]mmifubw&RgoJvE&!82s^JvF&!8Rf,ADb]~;x=h'rNu]vK!,%'*0RnORh)4Rh*AqQg-vaRnNg;wHwkh'ba~4cE#Ta*x3gctyw@'!+%RnFRnD<4Rn@hFvK5RnCxWg[#`&a0Ua()`1Rm75Rg[c]%X#qi8Rg^NvdRj>BwzgZauwji7Rm6A4wgg]d1#&(*,.0a#Rm;Rm<Rm=Rm>Rm?Rm@RmARmBe%#^^^Xaea?aC/b+(,!a+a#!a/!>a&Ta<aKbD!2wphBRnk[yPw}hE|.=Br-3Dtm>6Vy~g6urRf.x,hPrNav!%'RnqRo%Ro#Nu;q[Pw;5r+JwNZtM@3r)d'#Y'Weh;xChL#`&RnmRnoKu}>%(!Rne~Bs-;2wjcussJv+'!aYSO}6@B<5?ba~8LrNvj!.%*ROwungw~ng~:9;Ri^>wtnig;wHRnixDh@|(UZ.x1h@|)!#:2<H|*xHn]#-UX'3Ro)z=iT}6ARns=Bwsn_wpnaRncw]aR(#UXa&Ua*a/=]iPd'#Y&Ro'WnXf{QRm2hNvj]nZd`'T~&1`{|`#9b]{}c:'!#Wl{>@=be}]?cl{{U#:5Abb}Jds#^YaF!a*b4a#a3aPa>&Tb!bH!*a_!Eau?/a&RjY<]gj>6Vz*;:pe~DrZg,QRj1JwNZtX@wihspcJvZ&!VyX9WmOJu|!|N2WmHJvh&!]ht~Bpbcn&T(!#RmQ<s7Nu;padH#X'`+WmJ@>RmKCARhnKup=!)&Wf+:RhqNuPpf9c!#'45pd5AwghpARn(Ls@w!%,)!RmP@Wfe<E|IJva!&WmNg8vsRmLd`*.`#Y'Xa!axRn*]hrA8Rhug5s@rXg8u!RmMd8#X'X*3@rV72smdI*#UY&RmICARho~GsgxVgd)Ta'U-Y&Xa!T#RnEWnA@Wffg1uDRi0hFvK5RnBxGnG&#`%owp)@wsf+bX}Ze-*1!a*^^^Ua|!#a.aq&Ya2!a>.a6!a:aO`aJDtL[y`@Wg#>6Vz12@wzoYRoZNuPRi!NuPRhzg=ucRi,@=b`{Yg=ucRi-ACJvB!&Sh[ebSh]ebi`wUuFRm4Jw2_[y0JvB!.<Ju(!&SoG}6Shd}6<Ju(!&SoH}6She}6Kur@._g5vHRieJvx!{L2G{Kx6gd'T#?Rh82Wi5cZ#X(g1w)Rm5dW-Y(Ta#!a)!#aYa=wnfE=su2>>bU{0j9udv:<svj8uQv-7RgHdE%#^'sq9sp=>Bb_{TJv`!&g/r|snj6v(us5d,#Y(56H}[978H}]Jw5!&g1rushJvB!+j;v{u5?zDhd}6}bj;v{u5?zDhe}6}ce*#`(^^^a[aea!=!a6a*aoXb1a.!aAbL!b>,b'aL!aV@Wf|2Wlg3[y/JwNZt^@3piPw:5pgJunZou3@rsJva&!Vy_g<v~Rm#JvG'!6Vz0=<r{Ju{%!:pj@WfsiXuJu3Rm:JvZ&!WfA~Bph@c4Z&Dtwax5rubx(#:awRk1@d,#Y&RfjRfid1#,Y(@Wfp2Wlrg5s@ryKu[@!,'=]ig9wlk?Rk>g5u-rqJvy'!@9RkQcH(T#=>Ri~@<wkj(Wj(KuZB*!&<7rw@9RkRcH(T#=>Ri}@<wkj)Wj)dg(Ta2Xa9X#`-!a*CARhg@@=I}d9x;c~#X%so=<sj>2@@=aybb}XjWv0Q~EfEj3vLv;<d,#Y(56H}`978H}_dgaPaFa'a/!#a3Y0a_a;a|!1(a7-[yE3[xt;:pJNvZrrg3uJrvJwNZt=@3pIh=rt3rxPw:5pGOu!5rpJvG'!6Vys=<rz@c4Z&Dt(ax5rtJvZ!&~BpH@wsfNg-vaRlNci*U#=<wei<F}a5@Jq.!a*JQ!%@qZ23d(#Y&RjH5]jCk!u7w&u0udARjFd/prq=tyvpaEa(a:.!a1aZ(@@=I}:9wpd%=<sX55w_h}@@=I{t=ay<aU@@=I}T=ay<2@@=I})?C9:9au@9Cb]}DP~=x-fAZ(2Wl1=ay<aU@@=I}>5@d##Y+jTv|vV~EfFj]uNpn~FRfGdgaK!Z2&!a8a-Tb({E!acTbM*!a(DtY[yYd'%Y#sl[y*hHvh>Re5x2c{Z}.j4uCvcawRiMd+#X+_x&d!},<5RkX;2Hzw@x,gavfB-!{CcF&T#Roe;RodwWbBg5urRgaKvHC*_6Vz+<4opieuew&Rmq@d]&Y)X,T#X0Rh}<BqP=4qS9:ReMg/ujReNJw0!/<Jui%!bd{kawwnemRelAxUa?a3#*.&UX(Ya+a/RhvRnQ<o}9Wmtd-#Y&RgSRmw9;Rmxay=Rmyg-vaRmuxEhSrNu,v-voC!%(aR.a(a7+1Ro1>Ro5CE{A9b]{@;5x#eO{:g;urRi+KrNA!%(Ro3>Ro79;Ri_Ku@>{;&!x%gX|{KunA_+g5QRj/g3u5Rj#g>uERj%wio/xRhS&!,!#^1U}wba{8>>@=be}qC@:D5ba{7Ku+A&!}x?ba}t>>@=be}se(aA^^^Uat!b0#{pa+awUazbGa#aLb9bgaWac'a5TbS=Br!d1#`%scp_Jvl!#rT>Re0JvX&!VyN=H{Fcm#U&:pY=ReaJv2&!]h0=]nUJvG'!6Vy|=<r%JrM_=]h2@Wlud'#)U'Wf'b]{i=]h/Jvh!&~BpWg=v]RnMx+ny#'Nu;pVwjnu=]nwxJnx,T#`&Reqwjnt=]nvieu9vrRjLLuYwP(#+!th@wih5pX~Gr'g5v/Rh4KunA'!-CARnP@wwiN:Rm_9x'cvw>!|l=<saKvAA!0&3@q}>w^e1bp#&Re2Re3BDx7gH#T|f5H|eKuZ>!%(:qNAH{]Jv6!+3B2B9=b^{X<5<B92:E{ZLvhwA(a;a%!igQuyRmad+#Y}m@3Rh5d8#X'X*:AqUAHzmaxwbh<aXRnVcF}RT#Nw&cj#U(BWnug/vsRntdka)(a3+.Zb7aYYan1!bVa@Xa}[y^@b[{G=H{+hFu73Rj&Pv#5ReQcK%T#sig1v{Rj'Ku+D#'!t]~Grm~?rkKuMB!01d5#`'Vy.ta3Dtu~Hroc8#'{^45s85AwZbP&!#Rn!wghxWn#KvEA!)&2RlA2RlBx:h|#(T,=]j09Wobz>x]z/@awRoTd+#Y(az]hFhCrm4d,#Y+jTv|Q~EfMj]uNr|~FRfOdCa!Xa9_X#@<plJvf!%b`{(9;Rgwc;.!#2x7cw#T|UDb]|T5Ju={(!=@E{&Jv)&!Ab`{'awJvf!~*>>@=be{#KuY>!+&4Ezyi[ugv&RjIdea+T)#UXa&T-T&a!Rh9auRmW=]kLg5vuRn+g3u4Rn-Ow6ARn,hHus5xNk?#UX(U~)/g8v0RkD~AwkkF?Ri.OuNBwkkA?Ri/d|a2`a*^UYa.!aBTZaTa'Xa;!(!2!-a#b2[yC>6Vyq3[xr2Wi?g1rusVh%s?DtF~<5rbJs;%!DtBfswKtCj[uvuSsEu3RgVx3o:u+wN'*Zt;@3rd~Grh~?rfg8w)Lq)qE&-a%!>bI|`jWv0vV~EfCjTv|vV~Ef@j]uNpn~FRfBcK#T']gWNu7x,k7q4ai(0!hHv8<RhmkMu9vrsBuev/RhlCJvB!,g<v{wchh~@:Rhji[vrv{wchi~@:RhkdS&a5UY#Ta!RgPwwiI5BwciI~@:Rh`x'iJvj'!5]iJPu8Bwch]~@:Rhach)U#h3rp]gLh@t|Ax,hTq3ah!-(~@:Ro0Ou!5RhXj^v(pyw8unRhVd|)`,^UYas!a?/a2Z'a^Ta{Tb7Ta(a#!a,Wf&9sZ3DtAadamov=Bqt3[xig8vsRm~>waiL2b`{QJv*_Ouv2qgj<v]v2BqfdR'X*X#Y-@3qr~Gqv~?p6hHv-]glPup5Lq+q?_%*b_{qF{n9b^{rOu4ARhpKvCD!+&~Bqp:5Dbb}nwoiKl&unuTuBv]v+ueunaXRf0=Jvh!0nKufu8v1w&w7q%w&uHrz:Rgnj5w,uxDJq/(!hNw'5ReCk0s2u3w/w'5ReFd>Za&!*UaA=<wkgsRnSJv^!%Refifw3vyRgOKu_B'!,<]gkiiu:w&Rh<=C@a^<B57@2F{[<B5@aW:=3away9A5aW=<B=C@a^<B57@2F{Ie-#`(^^^bCara.b8aza6!/bZ,!adTbnTbOb+aFaS!aAT9@Wf~2Wli3Dtl2@d,#Y&RfnRfmJwJZtN~GqyJva&!VyMg<v~Rm%iXuJu3Rm9Jv[_=]ih9wlkDRkCd1#`(@Wg>2Wls3cH#T(@<Rj*=>Ri|b~'#23s9h<~El.d'#Y&Dtxi^rzvdRl#d*#U%(o|B2s`hJwSaxRmDKv4B&!1:Rmdd5#`'Vx}to~Hq{x'f1v3(!BA5ba|bJv_&!Wfug1v]ReIdO+U/Y#&G}-8wze=Rh{g1v]ReHg/uQRf/by#)ibQwERl/cH#T(@<Rj+=>Ri{cNu+vlax-!(#a0qa9<Rii2;;bU{H;x<i=&X#Rk`<4wwi=C9H~8xAI(Y#<azRi@45wXI<B9;5bb~7dL(X#Xa(+!aL6Vy{g5QqOau:5au2@ay547EzbxOcU(UX-T#Ta#:Cbb|A?wjh/b_|SOw6ARgtihr}u7Rhy<d1#T)X1@@=I|~=ay<2@@=aybb}Sj3vLv;<d,#Y(56H}A978H}@dGpvs@uAu`vcw9*!aFa+ai%(b!aXa8.a?a[ozWey=sU2@G}Nch&U#Rf_WexKu+D#'!t:~Gr`~?r^j]uNr|~FRg*j^psurwJt|RmcKv)@&!)7Rkv~Br[@wxfO:Rl3co#U'6Rezj_q#vIuavjRltwzeyh@vr5JqD0!>aY?C9:9au@9Cb]}9cl#U*5;5<H||jbuus1ucv&Rfvg1v~d/pppzqFr^a--a~!aMat1(hFv;Wiz@@=Izoj5uuv-7Rix~Cw`fk2WlVcZ#X,k)u3vWs@u2]ktg;wEx'fBq(_2Wg/jTv|vV~EfoJv]!15x'hzqG!(P~EfU~CRl_j6v(us5x4i-#T(2WmZ?C2F|d>Kq<aj1!*jTqIsBv=Wl`~Cw`fi2WlWj`v0u*~>RlR=c>Z,k#u3vWs@u2]kr<c1Z+jTqIsBv=Wla~Cw`fm2WlXdmb3!a{(arZa`bkTa%TbQTa-a9+c'!aM!/[yL=Bqug.w'RifhFvyDRj.g>vgwyk^9]k^Jv3_@WfbAARkhJw2_[x|JvB_wkoIRoKwkoJRoLd'(Y#<]gm=<9<H|yd'%_X#skDtb3awwqkgNulRkgdB#^',9:p'hJwSaxRmEBwVb8@4=H|qLu+w50&!)@3qs~?pU>Awwn;;Rn=c:Z'ARn<=<qwKvC@!/&~BqqJv6!&]eVb^z^xRge'/a%+^`#Sge}6<4Rn3=]n0Pw2>Rn8Jw0!&>Rn:>Rn6cY#a7+!a&=<wkaNw~h3z_c5Z{=wjh#=]nLKv^D!&)Vyz=bW|swYb<WetcG#T(2wxa@qVx@gD#Y&b^|V5JwG&!5bb|pg/w&RgD@x=kHs=uAvn!a%%/'+RmSRh694Ro`g-vaRmRhHv-]mlxCcS#`&ba~.5cD#Ta)P~=d,#Y(56H{>978H{Dd_#{2^Y%_+qbbb{6g3sERhsbU{?dfa.,`a(Xa<!aiX#(55RiG54RiHcI#T'WiU3RiVNvdwtfcRlKNvdd,#Y&RlHRlExQgf.1*^T'X#Sgf}6Wn4=]hfPrk>Rn7Jw0!&>Rn5>Rn9Lunw?&a2!,5<oq@@wqfdRlJj5Q~=d,#Y(~ARfcOuN]fdDKw;ay(}i!547E}j?cI#T(@5bV}iCbV}hdv(^^Tb?a40,b##Tbo!a*bR!a<b|a/!aKai!aU[yK=]o^g:v>ReGJwPZtK<7Rh+h<~El,Pv#5ReR@awwxjCg,ulRjDJv6&!]j!z?aQeeg>w=Sh<eeJw;!&axEzOg,Qosc!#*:wkeJ]eJ>x'h-u(!%Ro.w~h.zPdNZ(X,Ya![x{;9ReY;wkgxRiF:x?ap#Y&RmUg<s2Rkod]+UY0TZ'!a&A9sw<=bczLNvuw{gqzNhJwSaxRmCKuLay!#&s_Rf-55b^{uJvZa!!c%#(55Ri654wmiu5RiuawLu,vp!+}^%b_}Y9;wkgxba}o>A9:=b^}zKuh=a''!3awRk3c*'!#aHRk6c+Z&Rk5Rk4Jv)&!awRjSawd9*`#0?C2@EzMj8u<uJ5RmbjQrquJu3x,k>uq@_+=ayb^|W~ARkEOuN]k@7dhzV^X/X&a-#zRzSb`zXcJzTT#2WkVKvDBzW!%FzY9;5bbzWjQrquJu3Jw3%!b`zU=ayb^zQd:#X(T-a!6Vyywxh}=b]{Jg=u1RiAdGp~qHtzv!w(wA+a+a;<!aJaYai'anasb(=azRmV:Cbb{MLq2vb!%')RjuRjrRjtRjqx3jnqCw3!%')Rk(Rk+Rk&Rk)Lq2vb!%')Rj{RjxRjzRjwLq2vb!%')RjsRjpRjfRjex3jcqCw3!%')Rk'Rk*RjkRjl9<CbbzfOu4ARhxLq2vb!%')RjyRjvRjhRjgx=joq*uKvb!%')+-Rk.Rk%Rj~Rk-Rk#Rj}x=jdq*uKvb!%')+-Rk,Rk!Rj|RjmRjjRjidAq&qKs@uAv8Aa.'*-a@a&0!aM@a5[y73Dsy3Ds|3Dt):wxgI2sHJwJZt.~Gqxwsf0ikrzt}Rl0Jvy_[xj~HqzKv_A|D!&WfP8axRoVcf,U#k(v]v+ueunaXRf1Ju}'!g8u#Ri=jQw!sCunLprq>!,')~<5qeGzq9F{W=c##%s5au:5aU3CBE|;d4#X(D!a&6Vygx(b;#(=]ed?C2F{N<capoq2r[a&!aPa9,'Pw;5s:@@=I|,55w_h|@@=IzcP~=x'fCqB_2Wl2>aU@@=I|1OuNBc1Z+jTqIsBv=Wlc~Cw`fl2WlZ~AcTa%!Z+jTqIsBv=Wlb~Cw`fh2WlYk+uNqJsBv=WlSg,u3dca3#UXaMYa)TaB-=cM|7T#<bI}l5@B932:aV2G{BOuNBJq:|M!5Ezt=<B=C@a^<B57@2F{v>cB{/T#=ay<bI{3Jv6!a.6BKq0ah&+!5E}HP~Ef{978BaU@@=Iza<7d#.Y#978BaU@@=IzH~AJq0!(@@=IzG978BaU@@=IzFe,aU*Y&^^^bvJb,b:bFad!a,c2Ta>aL.bo6!a#CbTa'T#Re{2Wlh2@G{yg6t~Ro_NvdRfticuRQRllJv3&!x&c|zs@Jw3!%RflwpfkRlpKuL;%(!Re<@G|C2GzdhIvuBwgjAg-u0RjAKQB%!(GzZ@G|5NuuRl7d='T+Y#Vy[g<v~Rm!==G|>JvA!)@wma=]m1ifuaw&RmnLs@vT'!|/+[y,g:v>ReTJw1!#qX=x!eC{bLu+wT&)ZtZauq_~Graci&U#F|89:r_Lupvq!.)&2RlG8RfaC=x!eF{_h?rpWlmd&'!#X|&]k::xJey#`'T|+<E|&2@H|%dE#(^,g;u.RiEg6vjRiC9xCkA{O|zY#g=ucRmXKs0@!&*@G|m@awRknJuh!,3d(}gY}eJvj!%Rm):Jw3!%Rm+Rm-Ls0w(&!a(a#@b[|6cZ#X'7RkxWgAOu4ARn'dH'U#Y*Vz-Wm'CARm}d]*#a%^a*T'aK!a<9bV{PC=p*Jw4!&SgxcbB5r]idw(wBRmF7xFkt#&`(Rm/Rm8E|!JuY_9:Rl5=wrgr2:bbxd@xXfB(a*#T+!.X0X1Ta/a'T&RlDRfL>RlyARl9b[z[>RfZ:RlL:RfRwlg/ARl;9;RlxKv,A/!%7s69<74=BA5ba{-8Bde#`a<XaKYa1,a'P~=wxfB2bZ}}?C972@@=I}r8@55B9;5bb}G978B2@@=aybb}3j3vLv;<Jw3&!>Rfk=ayb^}4~Ad1#`*@@=aybb{w2@>==<bbz]dx+UY#^UaF!a9!bB'Ya1.!ajXa#%olRhD[y=3Dt#Ov5BrHKuMB%!(Rf^Wep~HrJwkiQjKr|~FRg)Ku+D#'!t5~GrF~?rDdV)UY,Z/_7RkuG{<~BrBg,rlsO:235B@bX}|d?a1!#`(6Vyn5@d##Y+jTv|vV~EfIj]uNpn~FRfH7Lq2vb1!a9-978BaU@@=Iz9978BbU}#~AJq0!(@@=Iz8978BaU@@=Iz7~AJQ|}!978BbU}!JvkaK!AdUa21-U#`a+(g/vsRn~Ou!5RPj:rmu9WhOjXuvvNr}:RhAj^v(pyw8unRn[kPr}p|u7vwv]RiSBd;pppzq@qHQa?(b.!a.a`@.|xa(hFv;Wiyj5uuv-7Riw~Cw`fg2WlU978BbU|wOuNBJqG!(P~EfD~CRlQcZ#X,k)u3vWs@u2]ksg;wEx'f@q1_2Wg.j]uNpn~FRfqJv]!15x'h{qG!(@@=IzK~CRl^j6v(us5x4i,#T(2WmY?C2F{1>Kq<aj1!*jTqIsBv=Wld~Cw`fj2Wl[j`v0u*~>RlT=c>Z,k#u3vWs@u2]kq<c1Z+jTqIsBv=Wle~Cw`fn2Wl]dn1#c(a(b^a2!b/bAT(bj!aDa7bu,a_a{c0!2T0g:v>ReD2@G{42@G{5~DpM~<5rc=Bx6i>{RT#RnI@zCx]y]z:2Jv[!zr5Awyk]9]k]dD(Y+X#6Vz.g=wKtgwhaCwgmTWj2Lu,w%_+/[y-B;b^xeg3u3Rj-2@bX{*KrJ<!+'@Wg(g?QRlC@Jv`!%b[zIwsfII}8JQ_@w|kW|=Jv(%!AqcOuNBJvEzh!bYzjLs@wP#(0!oy@>RkdJwMZtc3Dtd@BcG#T'9bWxg2@2Fznd*#Y+;2x'c}w<zizixNgwa#Z'U+!/!a'!a+w~g~z6wcn{Rn}wcnzRn|5Rh%=]nJg5vuRmvNvdRlvcprJu}w*az*a#!%.a.'Bot9qT]kj@Wg'ay2Gzv@Jv`!%b[zEwsfHI}1;ck#Ux`<Cbbx_Lu+w!a&0*!wko*wwo,So,}6Juqxf!E}PigQuyRm`d3(`#8>Rn%:A5B;bZ~%KvhCa!a2!x>k7#Uxb@b{#xaRk7Jw0!)>wwhlShl}6>wwhmShm}6CJvB!.x'hhvj{!!5Bwkhhbaz}x'hivjz~!5Bwkhibaz|xEhTrNu,v-vpD!a%&/)a3a.,%Ro2t[CE{)@3re9b]{%wjo09:rgc:Z&Ro6=<riifuaw&RmoKrNA!%(Ro4>Ro89;Ri`dSaL'UYzxZb)7Rka3xRhT&!,!#^1U}vbaz{>>@=be}yC@:D5bazzKu+A&!}{?ba}y>>@=be}wxBh[t`u~vJvr!%a!a()a,a0a4RoC=]o;Ju(!%RoGRhdwjh`=]oAg>w#Ro?g5vuRo=NvdRl|Ku]C.!&;RoEJvB!%RoORoMBx'h[v+_?w~h`}~5?w~hd~!xKh]oiptu-utv.vp!#%&a30a@a'a+(a/aOp(o~p!RoDJu(!%RoHRhewjha=]oBNvdRl}g>w#Ro@g5vuRo>c[#X']o<CauRoRAd-#Y':RkpauRoQKu]C.!&;RoFJvB!%RoNRoPBx'h]v+_?w~ha}t5?w~he}ue!/UbhYacXaW^Tc&a;b:a-c/#b&aja1(!cL+!bKbt!bmcRc9aIc?8[yW3Dtt94Rg`Jv}!&SiRMzBhEebShEMNuPRe>x7gL#TzuwjirRipc<Z&>on;>z=h-MSh.Mwqczx'a7vj&!>Re4@=ResJt__NuPRi*NuPRi)j]uNr|~FRfzKrJ>_+@Wfy@Wf]2WocKrJ<!+'@Wg%g/QRl@@Jv`!&awRl<wsfFIzgLu(w*!.*&ShBMwvhIRhI9;RhNx1hK'!#Sn]Mx1hK~0!#:2<H~7cNu+w7D*'1ZtW>Rn1~?rOc:Z&Rn2=<rQ<7wjh&=BSnLMc]#X(6Vz)w[b=a!U#9wzgMc3#&(RgMRitRis<x,gKt`ax!&+SioM=BSilMc3#&(RgKRinRimKurB,!&SiQMzBhDebShDM6BJQ!(P~Efx978B2@@=I}WLrJw!!,a*&@G}O@9wkibRid@@x'fKwC!&SlDMSfLMjUv~Q~EfKKv3@a+!(hFv-]mpx/hYZ(C5RiWz<o/MwkhY?So/M@x,gbvfB*&!SgEM:SoeeehFu3:Rgbda(,^TZa)X/7Sg[eb:2RgI~BrMC@wgkc:wwkcRerx3h(uUvK!&*,SnOM4Sh*MArRg;wHRh(x=h;rJvPwI!a4',a'0@Wg&=BSh/Mg>w=Rh=g3w*wwgGRgGcW(X#;Sg}M2Gzk@Jv`!&awRl=wsfGIz`dKZ*T'Y-:RhR7RhQg5u-p`j6v(us5d,#Y+~Awkia?RicOuNBwkibba}Ld6p~tyu_vbAa'a+!a/'a3aEa8a!>Sh,ebJv{!&Sh@ebSaReb9;SgwebNuPRi(NvdRl)NuPRi'hHu^<Rm^Jvv_@Wl(g;u1Si/ebKu'B&!*Sh?eb@Wl'z@aPeb95Si.ebcpputyvjB)!,&a+0a%ShAMWeK@G}C@WfJ9;RhMwvhH9w{ia}ix,hJvRA1(!zAn[MRhHx1hJ~*!#hFv(BSn[MBJQ!(@@=I~'978B2@@=I}2db.Ua<'X}+T#a0XaG2G}E;wkg|wuh!Rh!x,hZu,@)!&So0MVy)C5RiXACJvB!&5RiY5RiZg8w)cG}*T#2@bU}=KsA>(!a.3wkhZba~(x,h^u(A!&(SoCMRhb5Bz=h[eb?w~hb~6x,h_u(A!&(SoDMRhc5Bz=h]eb?w~hc~6e)aA1T#T,^^^c-bMb&blcPaP(a/!0!bA=b5c@a(!bfbrc#2afwmhARnjwchORnp2Wlf3DtsNvdRl-2@wpa<]m0bx(#:awRk2@Jw3!%RfhwpfgRlnKQB%!(G{V@G|'NuuRl6d='T+Y#VyUg<v~Rl~==G|<Jv+'!aYShC}6@B<5?ba~8@Jw3'!g2QRljhLrpWlOd+#Y'g.w'rIg>w*wgj@g-u0Rj@Lu+wT&)ZtUauq]~GrGci&U#F|39:rELrNvj!.%*RhCwunfw~nf~:9;Ri]>wtnhg;wHRnhx3hDs@v~!/+'@Wfr@9RkSNu&Rlo=@<5GzoKs0@_+@Wl+@awRkmJuh!-3d(}pY#qWJvj!%Rm(:Jw3!%Rm,Rm*de&!1U-U#`)Re;@G|.@9Ri82@wjfvRlq=@<5GzpLvOvr!).&2RlF8Rf`C=x!eE{.Jw3_g2QRlkhLrpWlPde(!#U{s,UXa*Ta'[y'g:v>ReS;x0PZ&RnlRnn~HrKJw1}f!=x!eB|2w]aP(#Xa&a*Ta.Ua2a7=]iOd'#Y&Ro&WnWg;u.RiDg6vjRiBNvdRlzhNvj]nYJuW_2Wm3x)kFze{9d])!a.!,Y01!#&aC!a3RndC=ox~BrC@2b^{pg,rlse7x'ksuq!%Rm.E{xidw(wBRmGx9o+)X#wwo-So-}69:Rl4@xSf@a#XZ'X)X,Ta(/ARl8b[xc>RfY:RlI:RfQwlg.ARl:9;Rlwdn'#^XafaQa1X1TaHTa)@b[{zcZ#X'7RkwWg@Ou4ARn&x)kG#{,g7u/RkGdH'U#Y*Vz'Wm&CARm|bx#(A]gUbUzJj9Q~=d,#Y(56H}l978H{U7d,0#U*2>ABb_xZ978BbU{e~AJQ{g!978BbU{hxMh?ad{oUYZ.x1h?{l!#:2<H{mx3n[t{vl!,&a%3Ro(z=iS}6ARnr=Bwsn^wvn`Rnbd`*T}B0!#^X'BG{c9b]{a>>@=be}F?JvS!&BG{d7BG}(Bde#`a1X,Ya@!a'P~=wxf@2bZ}I56B2@@=aybb}08@55B9;5bb}<j3vLv;<Jw3&!>Rfg=ayb^}&OuNBKuLA!)a!P~=x#fD{f2@>==<bbzl?C972@@=Ix^d6rSu,v7w*C(0a)a6#B+a%!sQ[y?3Dt%3[xn~<5rLOu!5p@Ku+D#'!t7~GrP~?rNKvlaya7'!h+v-5qMg=t|cd,U#5AAaa5Abb{S@52B5@a[@52B5Gx[iXueu;d<#`a(!/549C;ag>23ExY5@Dah89b^~689Jv)!~2b[~1Lv'w(%*!a#bX|aPrmawRe]keu7uhv-q6rxu,q`xTo]/a5aU!bNaDXbi!b-!ao!b<bwA!#5@B932:aV2G|:d-)Y#hJrL>RhG<7@C5<H|_=Cau:5aj5@B932:bJ|ng>vIbs)#?C2F|9jPv0w.vISh-MKvUaz(.!9ABbb|[5;5<H|Eg>unwfh;9:4E|YjQsBt|vjx'hYq3!(?C2F|J:2<BaY?C2F|GOu!5x,g|p{ah!-(?C2F|c9:4E|OjXuvvNr}:Rh&i[w*t|cd+U#jJvsu)vsSn~Mkfrmu9p}u7vwv]So!McW#Xa!ax5@A5aY:5;5<H|>kJv~vYrquJu3x4ib#T)2@SmZM?C2F|Bj:rmu9@xPhI(a*a#U#`a3-5Abb|L~@:RhK9:4E|0@52B5G|#C::aY?C2F|-:2<BaY?C2F|.5Jvk!a)javYrquJu3x4ia#T)2@SmYM?C2F|HAxPhH(!a#U#`a*-5Abb|4~@:RhJ9:4E|R@52B5G|F:2<BaY?C2F|Sc^#Xa2j=Qq5CJvB!-g<v{z;hhM?C2F|Zi[vrv{z;hiM?C2F|XKsA>!a)-g<v{z;h[eb?C2F|]i[vrv{z;h]eb?C2F|^iZu.vix,hZq3ah!.(?C2F|QOu!5ShXM:2<BaY?C2F|P", 13494, 2713, 49, 25, 61);

  // node_modules/entities/dist/internal/bin-trie-flags.js
  var BinTrieFlags;
  (function(BinTrieFlags2) {
    BinTrieFlags2[BinTrieFlags2.VALUE_LENGTH = 49152] = "VALUE_LENGTH", BinTrieFlags2[BinTrieFlags2.FLAG13 = 8192] = "FLAG13", BinTrieFlags2[BinTrieFlags2.BRANCH_LENGTH = 8064] = "BRANCH_LENGTH", BinTrieFlags2[BinTrieFlags2.JUMP_TABLE = 127] = "JUMP_TABLE", BinTrieFlags2[BinTrieFlags2.VALUE_MASK = 8191] = "VALUE_MASK";
  })(BinTrieFlags || (BinTrieFlags = {}));

  // node_modules/entities/dist/decode.js
  var CharCodes;
  (function(CharCodes2) {
    CharCodes2[CharCodes2.AMP = 38] = "AMP", CharCodes2[CharCodes2.NUM = 35] = "NUM", CharCodes2[CharCodes2.SEMI = 59] = "SEMI", CharCodes2[CharCodes2.EQUALS = 61] = "EQUALS", CharCodes2[CharCodes2.ZERO = 48] = "ZERO", CharCodes2[CharCodes2.NINE = 57] = "NINE", CharCodes2[CharCodes2.LOWER_A = 97] = "LOWER_A", CharCodes2[CharCodes2.LOWER_X = 120] = "LOWER_X";
  })(CharCodes || (CharCodes = {}));
  var TO_LOWER_BIT = 32, CONSUMED_SHIFT = 21, CODE_POINT_MASK = 2097151, CONSUMED_OVERFLOW = 2047, longNumericConsumed = 0;
  function unpackConsumed(packed) {
    let consumed = packed >>> CONSUMED_SHIFT;
    return consumed === CONSUMED_OVERFLOW ? longNumericConsumed : consumed;
  }
  function isNumber(code2) {
    return code2 - CharCodes.ZERO >>> 0 <= 9;
  }
  function isHexadecimalCharacter(code2) {
    return (code2 | TO_LOWER_BIT) - CharCodes.LOWER_A >>> 0 <= 5;
  }
  function isAlpha(code2) {
    return (code2 | TO_LOWER_BIT) - CharCodes.LOWER_A >>> 0 <= 25;
  }
  function isEntityInAttributeInvalidEnd(code2) {
    return code2 === CharCodes.EQUALS || isAlpha(code2) || isNumber(code2);
  }
  var EntityDecoderState;
  (function(EntityDecoderState2) {
    EntityDecoderState2[EntityDecoderState2.EntityStart = 0] = "EntityStart", EntityDecoderState2[EntityDecoderState2.NumericStart = 1] = "NumericStart", EntityDecoderState2[EntityDecoderState2.NumericDecimal = 2] = "NumericDecimal", EntityDecoderState2[EntityDecoderState2.NumericHex = 3] = "NumericHex", EntityDecoderState2[EntityDecoderState2.NamedEntity = 4] = "NamedEntity";
  })(EntityDecoderState || (EntityDecoderState = {}));
  var DecodingMode;
  (function(DecodingMode2) {
    DecodingMode2[DecodingMode2.Legacy = 0] = "Legacy", DecodingMode2[DecodingMode2.Strict = 1] = "Strict", DecodingMode2[DecodingMode2.Attribute = 2] = "Attribute";
  })(DecodingMode || (DecodingMode = {}));
  function determineBranch(decodeTree, current, nodeIndex, char) {
    let branchCount = (current & BinTrieFlags.BRANCH_LENGTH) >> 7, jumpOffset = current & BinTrieFlags.JUMP_TABLE;
    if (jumpOffset) {
      if (branchCount === 0)
        return char === jumpOffset ? nodeIndex : -1;
      let slot = char - jumpOffset;
      if (slot >>> 0 >= branchCount)
        return -1;
      let stored = decodeTree[nodeIndex + slot];
      return stored === 0 ? -1 : nodeIndex + branchCount + stored - 1 & 65535;
    }
    if (branchCount === 0)
      return -1;
    let packedKeySlots = branchCount + 1 >> 1, branchEnd = nodeIndex + packedKeySlots + branchCount;
    for (let index = 0; index < branchCount; index++) {
      let key = decodeTree[nodeIndex + (index >> 1)] >> ((index & 1) << 3) & 255;
      if (key === char) {
        let pointerIndex = nodeIndex + packedKeySlots + index;
        return branchEnd + decodeTree[pointerIndex] & 65535;
      }
      if (key > char)
        return -1;
    }
    return -1;
  }
  function readTrieValue(decodeTree, nodeIndex, valueLength) {
    return valueLength === 1 ? String.fromCharCode(decodeTree[nodeIndex] & BinTrieFlags.VALUE_MASK) : valueLength === 2 ? String.fromCharCode(decodeTree[nodeIndex + 1]) : String.fromCharCode(decodeTree[nodeIndex + 1], decodeTree[nodeIndex + 2]);
  }
  function parseNumericEntity(input, numberStart, inputLength) {
    let offset = numberStart + 1, cp = 0, digitStart = offset;
    if (offset < inputLength && (input.charCodeAt(offset) | TO_LOWER_BIT) === CharCodes.LOWER_X)
      for (offset += 1, digitStart = offset; offset < inputLength; ) {
        let char = input.charCodeAt(offset);
        if (isNumber(char))
          cp = cp * 16 + (char - CharCodes.ZERO);
        else if (isHexadecimalCharacter(char))
          cp = cp * 16 + ((char | TO_LOWER_BIT) - CharCodes.LOWER_A + 10);
        else
          break;
        offset += 1;
      }
    else
      for (; offset < inputLength; ) {
        let digit = input.charCodeAt(offset) - CharCodes.ZERO;
        if (digit >>> 0 > 9)
          break;
        cp = cp * 10 + digit, offset += 1;
      }
    if (offset === digitStart)
      return 0;
    offset < inputLength && input.charCodeAt(offset) === CharCodes.SEMI && (offset += 1), cp > 1114111 && (cp = 1114112);
    let consumed = offset - numberStart;
    return consumed >= CONSUMED_OVERFLOW && (longNumericConsumed = consumed, consumed = CONSUMED_OVERFLOW), consumed << CONSUMED_SHIFT | cp;
  }
  function decodeWithTrie(input, isStrict, isAttribute) {
    let decodeTree = htmlDecodeTree, offset = input.indexOf("&");
    if (offset < 0)
      return input;
    let inputLength = input.length, chunkStart = 0, result = "", root = decodeTree[0], rootJumpOffset = root & BinTrieFlags.JUMP_TABLE, rootBranchCount = (root & BinTrieFlags.BRANCH_LENGTH) >> 7;
    do {
      let entityStart = offset + 1, firstChar = input.charCodeAt(entityStart), consumed, value;
      if (firstChar === CharCodes.NUM) {
        let packed = parseNumericEntity(input, entityStart, inputLength);
        consumed = unpackConsumed(packed), isStrict && consumed > 0 && input.charCodeAt(entityStart + consumed - 1) !== CharCodes.SEMI && (consumed = 0), value = consumed === 0 ? "" : codePointToString(packed & CODE_POINT_MASK);
      } else if (isAlpha(firstChar)) {
        consumed = 0, value = "";
        let rootSlotIndex = firstChar - rootJumpOffset, nodeIndex;
        if (rootSlotIndex >>> 0 < rootBranchCount) {
          let stored = decodeTree[1 + rootSlotIndex];
          nodeIndex = stored === 0 ? -1 : rootBranchCount + stored & 65535;
        } else
          nodeIndex = -1;
        let bestNodeIndex = 0, bestValueLength = 0, current = nodeIndex < 0 ? 0 : decodeTree[nodeIndex], index = entityStart + 1;
        trie: for (; index < inputLength; ) {
          for (
            ;
            // Value-less, non-run node with a nonzero jump offset.
            (current & (BinTrieFlags.VALUE_LENGTH | BinTrieFlags.FLAG13)) === 0 && (current & BinTrieFlags.JUMP_TABLE) !== 0;
          ) {
            let jumpOffset = current & BinTrieFlags.JUMP_TABLE, branchCount = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
            if (branchCount === 0) {
              if (input.charCodeAt(index) !== jumpOffset)
                break trie;
              nodeIndex += 1;
            } else {
              let slot = input.charCodeAt(index) - jumpOffset;
              if (slot >>> 0 >= branchCount)
                break trie;
              let stored = decodeTree[nodeIndex + 1 + slot];
              if (stored === 0)
                break trie;
              nodeIndex = nodeIndex + branchCount + stored & 65535;
            }
            if (current = decodeTree[nodeIndex], index += 1, index >= inputLength)
              break trie;
          }
          if ((current & (BinTrieFlags.VALUE_LENGTH | BinTrieFlags.FLAG13)) === BinTrieFlags.FLAG13) {
            let runLength = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
            if (input.charCodeAt(index) !== (current & BinTrieFlags.JUMP_TABLE))
              break;
            index += 1;
            let remaining = runLength - 1, wordIndex = nodeIndex + 1, charIndexInPacked = 0;
            for (; charIndexInPacked + 1 < remaining; charIndexInPacked += 2) {
              let packed = decodeTree[wordIndex];
              if (input.charCodeAt(index) !== (packed & 255) || (index += 1, input.charCodeAt(index) !== (packed >> 8 & 255)))
                break trie;
              index += 1, wordIndex += 1;
            }
            if (charIndexInPacked < remaining) {
              if (input.charCodeAt(index) !== (decodeTree[wordIndex] & 255))
                break;
              index += 1;
            }
            nodeIndex += 1 + (runLength >> 1), current = decodeTree[nodeIndex];
            continue;
          }
          let valueLength = current >>> 14, char = input.charCodeAt(index);
          if (valueLength !== 0) {
            if (char === CharCodes.SEMI) {
              consumed = index - entityStart + 1, value = valueLength === 1 ? String.fromCharCode(current & BinTrieFlags.VALUE_MASK) : readTrieValue(decodeTree, nodeIndex, valueLength);
              break;
            }
            if (!isStrict && (current & BinTrieFlags.FLAG13) === 0 && (consumed = index - entityStart, bestNodeIndex = nodeIndex, bestValueLength = valueLength), valueLength === 1)
              break;
          }
          let next = determineBranch(decodeTree, current, nodeIndex + (valueLength || 1), char);
          if (next < 0)
            break;
          nodeIndex = next, current = decodeTree[nodeIndex], index += 1;
        }
        if (value === "") {
          let finalVL = current >>> 14;
          finalVL !== 0 && !isStrict && (current & BinTrieFlags.FLAG13) === 0 && (consumed = index - entityStart, bestNodeIndex = nodeIndex, bestValueLength = finalVL), consumed > 0 && (value = readTrieValue(decodeTree, bestNodeIndex, bestValueLength));
        }
      } else
        consumed = 0, value = "";
      consumed === 0 || isAttribute && firstChar !== CharCodes.NUM && input.charCodeAt(entityStart + consumed - 1) !== CharCodes.SEMI && entityStart + consumed < inputLength && isEntityInAttributeInvalidEnd(input.charCodeAt(entityStart + consumed)) ? offset = entityStart : (chunkStart < offset && (result += input.slice(chunkStart, offset)), result += value, offset = chunkStart = entityStart + consumed), input.charCodeAt(offset) !== CharCodes.AMP && (offset = input.indexOf("&", offset));
    } while (offset >= 0);
    return result + input.slice(chunkStart);
  }
  function decodeHTMLStrict(htmlString) {
    return decodeWithTrie(htmlString, !0, !1);
  }

  // node_modules/entities/dist/index.js
  var EntityLevel;
  (function(EntityLevel2) {
    EntityLevel2[EntityLevel2.XML = 0] = "XML", EntityLevel2[EntityLevel2.HTML = 1] = "HTML";
  })(EntityLevel || (EntityLevel = {}));
  var EncodingMode;
  (function(EncodingMode2) {
    EncodingMode2[EncodingMode2.UTF8 = 0] = "UTF8", EncodingMode2[EncodingMode2.ASCII = 1] = "ASCII", EncodingMode2[EncodingMode2.Extensive = 2] = "Extensive", EncodingMode2[EncodingMode2.Attribute = 3] = "Attribute", EncodingMode2[EncodingMode2.Text = 4] = "Text";
  })(EncodingMode || (EncodingMode = {}));

  // node_modules/linkify-it/build/index.mjs
  var REBuilder = class {
    src_Any = Any.source;
    src_Cc = Cc.source;
    src_Z = Z.source;
    src_P = P.source;
    src_ZPCc = [
      this.src_Z,
      this.src_P,
      this.src_Cc
    ].join("|");
    src_ZCc = [this.src_Z, this.src_Cc].join("|");
    cache = {};
    opts = {
      maxLength: 1e4,
      urlAuth: !1,
      schema_names: []
    };
    constructor(opts = {}) {
      this.opts = {
        ...this.opts,
        ...opts
      };
    }
    set(opts = {}) {
      return this.opts = {
        ...this.opts,
        ...opts
      }, this.cache = {}, this;
    }
    escapeRE(str) {
      return str.replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
    }
    nestedPairRE(open, close, depth = 4) {
      let openRE = this.escapeRE(open), closeRE = this.escapeRE(close), atom = `(?:(?!${this.src_ZCc}|${openRE}|${closeRE}).)`, pair = `${openRE}${atom}{0,1000}${closeRE}`;
      for (let level = 2; level <= depth; level++) pair = `${openRE}(?:${atom}|${pair}){0,1000}${closeRE}`;
      return pair;
    }
    get_text_separators() {
      return this.cache.text_separators ??= /[><\uff5c]/;
    }
    get_pseudo_letter() {
      return this.cache.src_pseudo_letter ??= new RegExp(`(?:(?!${this.get_text_separators().source}|${this.src_ZPCc})${this.src_Any})`);
    }
    get_ipv4_addr() {
      return this.cache.src_ip4 ??= /* @__PURE__ */ new RegExp("(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])[.]){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])");
    }
    get_ipv6_addr() {
      let h16 = "[0-9A-Fa-f]{1,4}", ls32 = `(?:(?:${h16}:${h16})|${this.get_ipv4_addr().source})`;
      return this.cache.src_ip6_addr ??= new RegExp(`(?:(?:${h16}:){6}${ls32}|::(?:${h16}:){5}${ls32}|(?:${h16})?::(?:${h16}:){4}${ls32}|(?:(?:${h16}:){0,1}${h16})?::(?:${h16}:){3}${ls32}|(?:(?:${h16}:){0,2}${h16})?::(?:${h16}:){2}${ls32}|(?:(?:${h16}:){0,3}${h16})?::${h16}:${ls32}|(?:(?:${h16}:){0,4}${h16})?::${ls32}|(?:(?:${h16}:){0,5}${h16})?::${h16}|(?:(?:${h16}:){0,6}${h16})?::)`);
    }
    get_ipv6_url_host() {
      return this.cache.src_ip6_host ??= new RegExp(`\\[${this.get_ipv6_addr().source}\\]`);
    }
    get_ipv6_mail_host() {
      return this.cache.src_ipv6_mail_host ??= new RegExp(`\\[IPv6:${this.get_ipv6_addr().source}\\]`);
    }
    get_auth() {
      return this.cache.src_auth ??= new RegExp(`(?:(?:(?!${this.src_ZCc}|[@/\\[\\]()]).){1,50}@)?`);
    }
    get_port() {
      return this.cache.src_port ??= /* @__PURE__ */ new RegExp("(?::(?:6(?:[0-4]\\d{3}|5(?:[0-4]\\d{2}|5(?:[0-2]\\d|3[0-5])))|[1-5]?\\d{1,4}))?");
    }
    get_host_terminator() {
      return this.cache.src_host_terminator ??= new RegExp(`(?=$|${this.get_text_separators().source}|${this.src_ZPCc})(?!${this.opts["---"] ? "-(?!--)|" : "-|"}_|:\\d|\\.-|\\.(?!$|${this.src_ZPCc}))`);
    }
    get_path_terminator() {
      return this.cache.src_path_terminator ??= new RegExp(`${this.src_ZPCc}|${this.get_text_separators().source}`);
    }
    get_path() {
      return this.cache.src_path ??= new RegExp(`(?:[/?#](?:${this.nestedPairRE("[", "]")}|${this.nestedPairRE("(", ")")}|${this.nestedPairRE("{", "}")}|\\"(?:(?!${this.src_ZCc}|["]).){1,100}\\"|\\'(?:(?!${this.src_ZCc}|[']).){1,100}\\'|\\'(?=${this.get_pseudo_letter().source}|[-])|\\.{2,20}[:]?[a-zA-Z0-9%/&]|\\.(?!${this.src_ZCc}|[.]|$)|` + (this.opts["---"] ? "\\-(?!--(?:[^-]|$))(?:-{0,19})|" : "\\-{1,20}|") + `,(?!${this.src_ZCc}|$)|;(?!${this.src_ZCc}|$)|\\!{1,20}(?!${this.src_ZCc}|[!]|$)|\\?(?!${this.src_ZCc}|[?]|$)|` + this.get_path_extra().source + `[\\\\/:%@#&=_~*]|(?!${this.get_path_terminator().source}).){1,${this.opts.maxLength}}|\\/)?`);
    }
    get_mail_name() {
      return this.cache.src_mail_name ??= /* @__PURE__ */ new RegExp("[-!#$%&'*+/=?^_`{|}~a-zA-Z0-9](?:[-!#$%&'*+/=?^_`{|}~a-zA-Z0-9]|[.](?=[-!#$%&'*+/=?^_`{|}~a-zA-Z0-9])){0,63}");
    }
    get_xn() {
      return this.cache.src_xn ??= /* @__PURE__ */ new RegExp("xn--[a-z0-9\\-]{1,59}");
    }
    get_tld() {
      if (this.cache.tld) return this.cache.tld;
      let tlds_src = [...new Set(this.opts.tlds || [])].sort().reverse().join("|");
      return this.cache.tld = new RegExp(`${tlds_src || "$#none#$"}|${this.get_xn().source}`), this.cache.tld;
    }
    get_domain_root() {
      return this.cache.src_domain_root ??= new RegExp("(?:" + this.get_xn().source + `|${this.get_pseudo_letter().source}{1,63})`);
    }
    get_domain() {
      return this.cache.src_domain ??= new RegExp("(?:" + this.get_xn().source + `|(?:${this.get_pseudo_letter().source})|(?:${this.get_pseudo_letter().source}(?:-|${this.get_pseudo_letter().source}){0,61}${this.get_pseudo_letter().source}))`);
    }
    get_url_host_port() {
      return this.cache.url_host_port ??= new RegExp("(?:" + this.get_ipv6_url_host().source + `|(?:(?:(?:${this.get_domain().source})\\.){0,10}${this.get_domain().source}))` + this.get_port().source + this.get_host_terminator().source);
    }
    get_fuzzy_url_host_port() {
      return this.cache.fuzzy_url_host_port ??= new RegExp("(?:" + (this.opts.fuzzyIP ? this.get_ipv4_addr().source + "|" : "") + `(?:(?:(?:${this.get_domain().source})\\.){1,10}(?:${this.get_tld().source})))` + this.get_host_terminator().source);
    }
    get_mail_host() {
      return this.cache.src_mail_host ??= new RegExp("(?:" + this.get_ipv6_mail_host().source + `|(?:(?:(?:${this.get_domain().source})\\.){0,4}${this.get_domain().source}))` + this.get_host_terminator().source);
    }
    get_fuzzy_mail_host() {
      return this.cache.src_fuzzy_mail_host ??= new RegExp("(?:" + this.get_ipv6_mail_host().source + `|(?:(?:(?:${this.get_domain().source})[.]){1,4}${this.get_domain_root().source}))` + this.get_host_terminator().source);
    }
    get_path_extra() {
      return this.cache.src_path_extra ??= /* @__PURE__ */ new RegExp("");
    }
    get_fuzzy_mail_host_search() {
      return this.cache.mail_fuzzy_host_search ??= new RegExp(`@${this.get_fuzzy_mail_host().source}`, "ig");
    }
    get_fuzzy_link_search() {
      return this.cache.link_fuzzy_search ??= new RegExp(`(^|(?![.:/\\-_@])(?:[$+<=>^\`|｜]|${this.src_ZPCc}))(?:(?![$+<=>^\`|｜])${this.get_fuzzy_url_host_port().source}${this.get_path().source})`, "ig");
    }
    get_http_validator() {
      return this.cache.http_validator ??= new RegExp("\\/\\/" + (this.opts.urlAuth ? this.get_auth().source : "") + this.get_url_host_port().source + this.get_path().source, "iy");
    }
    get_relative_proto_validator() {
      return this.cache.relative_proto_validator ??= new RegExp((this.opts.urlAuth ? this.get_auth().source : "") + `(?:localhost|${this.get_ipv6_url_host().source}|(?:(?:${this.get_domain().source})[.]){1,10}${this.get_domain_root().source})` + this.get_port().source + this.get_host_terminator().source + this.get_path().source, "iy");
    }
    get_mail_name_validator() {
      return this.cache.mail_name_validator ??= new RegExp(`(?:^|${this.get_text_separators().source}|"|\\(|${this.src_ZCc})(${this.get_mail_name().source})$`);
    }
    get_mailto_validator() {
      return this.cache.mailto_validator ??= new RegExp(`${this.get_mail_name().source}@${this.get_mail_host().source}`, "iy");
    }
    get_schema_names() {
      return this.cache.schema_names ??= new RegExp((this.opts.schema_names || []).map((name) => this.escapeRE(name)).join("|"));
    }
    get_schema_search() {
      return this.cache.schema_search ??= new RegExp(`(^|(?!_)(?:[><｜]|${this.src_ZPCc}))(${this.get_schema_names().source})`, "ig");
    }
    get_schema_at_start() {
      return this.cache.schema_at_start ??= new RegExp(`^${this.get_schema_search().source}`, "i");
    }
  }, web_schema = {
    validate: (text3, pos, self) => {
      let re = self.re.get_http_validator();
      re.lastIndex = pos;
      let m = re.exec(text3);
      return m ? m[0].length : 0;
    },
    normalize: (match, self) => self.normalize(match)
  }, defaultSchemas = {
    "http:": web_schema,
    "https:": web_schema,
    "ftp:": web_schema,
    "//": {
      validate: function(text3, pos, self) {
        let re = self.re.get_relative_proto_validator();
        re.lastIndex = pos;
        let m = re.exec(text3);
        return m ? pos >= 3 && text3[pos - 3] === ":" || pos >= 3 && text3[pos - 3] === "/" ? 0 : m[0].length : 0;
      },
      normalize: (match, self) => self.normalize(match)
    },
    "mailto:": {
      validate: function(text3, pos, self) {
        let re = self.re.get_mailto_validator();
        re.lastIndex = pos;
        let m = re.exec(text3);
        return m ? m[0].length : 0;
      },
      normalize: (match, self) => self.normalize(match)
    }
  }, tlds_2ch = "a:cdefgilmnoqrstuwxz|b:abdefghijmnorstvwyz|c:acdfghiklmnoruvwxyz|d:ejkmoz|e:cegrstu|f:ijkmor|g:abdefghilmnpqrstuwy|h:kmnrtu|i:delmnoqrst|j:emop|k:eghimnprwyz|l:abcikrstuvy|m:acdeghklmnopqrstuvwxyz|n:acefgilopruz|o:m|p:aefghklmnrstwy|q:a|r:eosuw|s:abcdeghijklmnortuvxyz|t:cdfghjklmnortvwz|u:agksyz|v:aceginu|w:fs|y:et|z:amw", tlds_default = "biz|com|edu|gov|net|org|pro|web|xxx|aero|asia|coop|info|museum|name|shop|рф";
  function unpackTlds() {
    let result = tlds_default.split("|");
    return tlds_2ch.split("|").forEach((item) => {
      let sep = item.indexOf(":"), prefix = item.slice(0, sep);
      for (let suffix of item.slice(sep + 1)) result.push(prefix + suffix);
    }), result;
  }
  var defaultOptions = {
    fuzzyLink: !1,
    fuzzyEmail: !0,
    fuzzyIP: !1,
    "---": !1,
    tlds: unpackTlds(),
    urlAuth: !1,
    maxLength: 1e4
  }, Match = class {
    /** Prefix (protocol) for matched string. Empty for fuzzy links. */
    schema;
    /** First position of matched string. */
    index;
    /** Next position after matched string. */
    lastIndex;
    /** Matched string. */
    raw;
    /** Normalized text of matched string. */
    text;
    /** Normalized URL of matched string. */
    url;
    constructor(text3, schema4, index, lastIndex) {
      let raw = text3.slice(index, lastIndex);
      this.schema = schema4.toLowerCase(), this.index = index, this.lastIndex = lastIndex, this.raw = raw, this.text = raw, this.url = raw;
    }
  }, LinkifyIt = class {
    __opts__;
    __schemas__;
    re;
    /**
    * Creates new linkifier instance.
    *
    * By default understands:
    *
    * - `http(s)://...` , `ftp://...`, `mailto:...` & `//...` links
    * - "fuzzy" emails (foo@bar.com).
    *
    * See {@link LinkifyConstructorOptions} for available options.
    *
    * @param options Recognition options.
    *
    * @example
    * ```javascript
    * import { LinkifyIt } from 'linkify-it'
    *
    * const linkify = new LinkifyIt({ fuzzyLink: true })
    *
    * linkify
    *   .tlds(require('tlds'))       // Reload with full TLD list
    *   .tlds('onion', true)         // Add unofficial `.onion` domain
    *   .add('ftp:', null)           // Disable `ftp:` protocol
    *   .set({ fuzzyIP: true })      // Enable IPs in fuzzy links
    *
    * console.log(linkify.test('Site github.com!')) // true
    * console.log(linkify.match('Site github.com!'))
    * ```
    */
    constructor(options = {}) {
      let { rebuilder, ...linkifyOptions } = options;
      this.__opts__ = {
        ...defaultOptions,
        ...linkifyOptions
      }, this.__schemas__ = { ...defaultSchemas }, this.re = rebuilder || new REBuilder(), this.re.set({
        ...this.__opts__,
        schema_names: Object.keys(this.__schemas__)
      });
    }
    /**
    * Add new rule definition.
    *
    * `schema` is a link prefix (usually, protocol name with `:` at the end,
    * `skype:` for example). `linkify-it` makes sure that prefix is not
    * preceded with alphanumeric char and symbols. Only whitespaces and
    * punctuation allowed.
    *
    * `definition` is a rule to check tail after link prefix. To disable an
    * existing rule, pass `null`.
    *
    * @param schema Rule name (fixed pattern prefix).
    * @param definition Schema definition, or `null` to disable the rule.
    *
    * See [twitter mentions example](https://github.com/markdown-it/linkify-it/blob/master/examples/twitter.mjs).
    */
    add(schema4, definition = null) {
      if (!definition) delete this.__schemas__[schema4];
      else {
        let def = {
          normalize: (match, self) => self.normalize(match),
          ...definition
        };
        this.__schemas__[schema4] = def;
      }
      return this.re.set({
        ...this.__opts__,
        schema_names: Object.keys(this.__schemas__)
      }), this;
    }
    /**
    * Set recognition options for links without schema.
    *
    * @param options Recognition options.
    */
    set(options = {}) {
      return this.__opts__ = {
        ...this.__opts__,
        ...options
      }, this.re.set({
        ...this.__opts__,
        schema_names: Object.keys(this.__schemas__)
      }), this;
    }
    /**
    * Searches linkifiable pattern and returns `true` on success or `false` on fail.
    *
    * @param text Text to scan.
    */
    test(text3) {
      if (!text3.length) return !1;
      let m, re;
      for (re = this.re.get_schema_search(), re.lastIndex = 0; (m = re.exec(text3)) !== null; ) if (this.testSchemaAt(text3, m[2], re.lastIndex)) return !0;
      if (this.__opts__.fuzzyLink && this.__schemas__["http:"] && (re = this.re.get_fuzzy_link_search(), re.lastIndex = 0, re.exec(text3) !== null))
        return !0;
      if (this.__opts__.fuzzyEmail && this.__schemas__["mailto:"] && text3.indexOf("@") >= 0) {
        let mailHostRe = this.re.get_fuzzy_mail_host_search(), mailNameRe = this.re.get_mail_name_validator();
        for (mailHostRe.lastIndex = 0; (m = mailHostRe.exec(text3)) !== null; ) {
          let name = text3.slice(Math.max(0, m.index - 65), m.index);
          if (mailNameRe.test(name)) return !0;
        }
      }
      return !1;
    }
    /**
    * Similar to {@link LinkifyIt.test} but checks only specific protocol tail exactly
    * at given position. Returns length of found pattern (0 on fail).
    *
    * @param text Text to scan.
    * @param schema Rule (schema) name.
    * @param pos Text offset to check from.
    */
    testSchemaAt(text3, schema4, pos) {
      return this.__schemas__[schema4.toLowerCase()] ? this.__schemas__[schema4.toLowerCase()].validate(text3.slice(0, pos + this.__opts__.maxLength), pos, this) : 0;
    }
    /**
    * Returns array of found link descriptions or `null` on fail. We strongly
    * recommend to use {@link LinkifyIt.test} first, for best speed.
    *
    * @param text Text to scan.
    */
    match(text3) {
      let result = [], schemaRe = this.re.get_schema_search(), fuzzyLinkRe, mailHostRe, mailNameRe, fuzzyLinkCandidate, fuzzyEmailCandidate, schemaPrefix, schemaDone = !1, fuzzyLinkDone = !1, fuzzyEmailDone = !1, pos = 0;
      if (!text3.length) return null;
      for (schemaRe.lastIndex = 0, this.__opts__.fuzzyLink && this.__schemas__["http:"] && (fuzzyLinkRe = this.re.get_fuzzy_link_search(), fuzzyLinkRe.lastIndex = 0), this.__opts__.fuzzyEmail && this.__schemas__["mailto:"] && (mailHostRe = this.re.get_fuzzy_mail_host_search(), mailHostRe.lastIndex = 0, mailNameRe = this.re.get_mail_name_validator()); ; ) {
        let scanFrom = Math.max(pos - 1, 0);
        if (mailHostRe && mailNameRe && !fuzzyEmailDone && (!fuzzyEmailCandidate || fuzzyEmailCandidate.index < pos))
          for (mailHostRe.lastIndex < scanFrom && (mailHostRe.lastIndex = scanFrom); ; ) {
            let m = mailHostRe.exec(text3);
            if (!m) {
              fuzzyEmailDone = !0, fuzzyEmailCandidate = void 0;
              break;
            }
            let name = mailNameRe.exec(text3.slice(Math.max(0, m.index - 65), m.index));
            if (name) {
              if (fuzzyEmailCandidate = {
                schema: "mailto:",
                index: m.index - name[1].length,
                lastIndex: m.index + m[0].length
              }, fuzzyEmailCandidate.index >= pos) break;
              mailHostRe.lastIndex < scanFrom && (mailHostRe.lastIndex = scanFrom);
            }
          }
        if (fuzzyLinkRe && !fuzzyLinkDone && (!fuzzyLinkCandidate || fuzzyLinkCandidate.index < pos))
          for (fuzzyLinkRe.lastIndex < scanFrom && (fuzzyLinkRe.lastIndex = scanFrom); ; ) {
            let m = fuzzyLinkRe.exec(text3);
            if (!m) {
              fuzzyLinkDone = !0, fuzzyLinkCandidate = void 0;
              break;
            }
            if (fuzzyLinkCandidate = {
              schema: "",
              index: m.index + m[1].length,
              lastIndex: m.index + m[0].length
            }, fuzzyLinkCandidate.index >= pos) break;
            fuzzyLinkRe.lastIndex < scanFrom && (fuzzyLinkRe.lastIndex = scanFrom);
          }
        let fuzzyCandidate = fuzzyEmailCandidate;
        (!fuzzyCandidate || fuzzyLinkCandidate && (fuzzyLinkCandidate.index < fuzzyCandidate.index || fuzzyLinkCandidate.index === fuzzyCandidate.index && fuzzyLinkCandidate.lastIndex > fuzzyCandidate.lastIndex)) && (fuzzyCandidate = fuzzyLinkCandidate);
        let schemaCandidate;
        if (!schemaDone) for (; ; ) {
          if (!schemaPrefix) {
            schemaRe.lastIndex < scanFrom && (schemaRe.lastIndex = scanFrom);
            let m = schemaRe.exec(text3);
            if (!m) {
              schemaDone = !0;
              break;
            }
            schemaPrefix = {
              schema: m[2],
              index: m.index + m[1].length,
              lastIndex: m.index + m[0].length
            };
          }
          if (schemaPrefix.index < pos) {
            schemaPrefix = void 0;
            continue;
          }
          if (fuzzyCandidate && schemaPrefix.index > fuzzyCandidate.index) break;
          let prefix = schemaPrefix;
          schemaPrefix = void 0;
          let len = this.testSchemaAt(text3, prefix.schema, prefix.lastIndex);
          if (len) {
            schemaCandidate = {
              schema: prefix.schema,
              index: prefix.index,
              lastIndex: prefix.lastIndex + len
            };
            break;
          }
        }
        let candidate = schemaCandidate;
        if ((!candidate || fuzzyEmailCandidate && (fuzzyEmailCandidate.index < candidate.index || fuzzyEmailCandidate.index === candidate.index && fuzzyEmailCandidate.lastIndex > candidate.lastIndex)) && (candidate = fuzzyEmailCandidate), (!candidate || fuzzyLinkCandidate && (fuzzyLinkCandidate.index < candidate.index || fuzzyLinkCandidate.index === candidate.index && fuzzyLinkCandidate.lastIndex > candidate.lastIndex)) && (candidate = fuzzyLinkCandidate), !candidate) break;
        candidate === fuzzyEmailCandidate ? fuzzyEmailCandidate = void 0 : candidate === fuzzyLinkCandidate && (fuzzyLinkCandidate = void 0);
        let match = new Match(text3, candidate.schema, candidate.index, candidate.lastIndex);
        match.schema ? this.__schemas__[match.schema].normalize(match, this) : this.normalize(match), result.push(match), pos = candidate.lastIndex;
      }
      return result.length ? result : null;
    }
    /**
    * Returns fully-formed (not fuzzy) link if it starts at the beginning
    * of the string, and null otherwise.
    *
    * @param text Text to scan.
    */
    matchAtStart(text3) {
      if (!text3.length) return null;
      let m = this.re.get_schema_at_start().exec(text3);
      if (!m) return null;
      let len = this.testSchemaAt(text3, m[2], m[0].length);
      if (!len) return null;
      let match = new Match(text3, m[2], m.index + m[1].length, m.index + m[0].length + len);
      return this.__schemas__[match.schema].normalize(match, this), match;
    }
    /**
    * Load (or merge) new TLDs list. Those are used for fuzzy links (without
    * prefix) to avoid false positives. By default this algorithm is used:
    *
    * - hostname with any 2-letter root zones are ok.
    * - biz|com|edu|gov|net|org|pro|web|xxx|aero|asia|coop|info|museum|name|shop|рф
    *   are ok.
    * - encoded (`xn--...`) root zones are ok.
    *
    * If list is replaced, then exact match for 2-chars root zones will be checked.
    *
    * @param list List of TLDs.
    * @param keepOld Merge with current list if `true` (`false` by default).
    */
    tlds(list2, keepOld = !1) {
      return list2 = Array.isArray(list2) ? list2 : [list2], keepOld ? this.__opts__.tlds = this.__opts__.tlds.concat(list2) : this.__opts__.tlds = list2, this.re.set({
        ...this.__opts__,
        schema_names: Object.keys(this.__schemas__)
      }), this;
    }
    /**
    * Default normalizer (if schema does not define its own).
    *
    * @param match Match to normalize.
    */
    normalize(match) {
      match.schema || (match.url = `http://${match.url}`), match.schema === "mailto:" && !/^mailto:/i.test(match.url) && (match.url = `mailto:${match.url}`);
    }
  };

  // node_modules/punycode.js/punycode.es6.js
  var regexPunycode = /^xn--/, regexNonASCII = /[^\0-\x7F]/, regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, errors = {
    overflow: "Overflow: input needs wider integers to process",
    "not-basic": "Illegal input >= 0x80 (not a basic code point)",
    "invalid-input": "Invalid input"
  }, baseMinusTMin = 35, floor = Math.floor, stringFromCharCode = String.fromCharCode;
  function error(type) {
    throw new RangeError(errors[type]);
  }
  function map2(array, callback) {
    let result = [], length = array.length;
    for (; length--; )
      result[length] = callback(array[length]);
    return result;
  }
  function mapDomain(domain, callback) {
    let parts = domain.split("@"), result = "";
    parts.length > 1 && (result = parts[0] + "@", domain = parts[1]), domain = domain.replace(regexSeparators, ".");
    let labels = domain.split("."), encoded = map2(labels, callback).join(".");
    return result + encoded;
  }
  function ucs2decode(string2) {
    let output = [], counter = 0, length = string2.length;
    for (; counter < length; ) {
      let value = string2.charCodeAt(counter++);
      if (value >= 55296 && value <= 56319 && counter < length) {
        let extra = string2.charCodeAt(counter++);
        (extra & 64512) == 56320 ? output.push(((value & 1023) << 10) + (extra & 1023) + 65536) : (output.push(value), counter--);
      } else
        output.push(value);
    }
    return output;
  }
  var ucs2encode = (codePoints) => String.fromCodePoint(...codePoints), basicToDigit = function(codePoint) {
    return codePoint >= 48 && codePoint < 58 ? 26 + (codePoint - 48) : codePoint >= 65 && codePoint < 91 ? codePoint - 65 : codePoint >= 97 && codePoint < 123 ? codePoint - 97 : 36;
  }, digitToBasic = function(digit, flag) {
    return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
  }, adapt = function(delta, numPoints, firstTime) {
    let k = 0;
    for (delta = firstTime ? floor(delta / 700) : delta >> 1, delta += floor(delta / numPoints); delta > baseMinusTMin * 26 >> 1; k += 36)
      delta = floor(delta / baseMinusTMin);
    return floor(k + (baseMinusTMin + 1) * delta / (delta + 38));
  }, decode2 = function(input) {
    let output = [], inputLength = input.length, i = 0, n = 128, bias = 72, basic = input.lastIndexOf("-");
    basic < 0 && (basic = 0);
    for (let j = 0; j < basic; ++j)
      input.charCodeAt(j) >= 128 && error("not-basic"), output.push(input.charCodeAt(j));
    for (let index = basic > 0 ? basic + 1 : 0; index < inputLength; ) {
      let oldi = i;
      for (let w = 1, k = 36; ; k += 36) {
        index >= inputLength && error("invalid-input");
        let digit = basicToDigit(input.charCodeAt(index++));
        digit >= 36 && error("invalid-input"), digit > floor((2147483647 - i) / w) && error("overflow"), i += digit * w;
        let t = k <= bias ? 1 : k >= bias + 26 ? 26 : k - bias;
        if (digit < t)
          break;
        let baseMinusT = 36 - t;
        w > floor(2147483647 / baseMinusT) && error("overflow"), w *= baseMinusT;
      }
      let out = output.length + 1;
      bias = adapt(i - oldi, out, oldi == 0), floor(i / out) > 2147483647 - n && error("overflow"), n += floor(i / out), i %= out, output.splice(i++, 0, n);
    }
    return String.fromCodePoint(...output);
  }, encode2 = function(input) {
    let output = [];
    input = ucs2decode(input);
    let inputLength = input.length, n = 128, delta = 0, bias = 72;
    for (let currentValue of input)
      currentValue < 128 && output.push(stringFromCharCode(currentValue));
    let basicLength = output.length, handledCPCount = basicLength;
    for (basicLength && output.push("-"); handledCPCount < inputLength; ) {
      let m = 2147483647;
      for (let currentValue of input)
        currentValue >= n && currentValue < m && (m = currentValue);
      let handledCPCountPlusOne = handledCPCount + 1;
      m - n > floor((2147483647 - delta) / handledCPCountPlusOne) && error("overflow"), delta += (m - n) * handledCPCountPlusOne, n = m;
      for (let currentValue of input)
        if (currentValue < n && ++delta > 2147483647 && error("overflow"), currentValue === n) {
          let q = delta;
          for (let k = 36; ; k += 36) {
            let t = k <= bias ? 1 : k >= bias + 26 ? 26 : k - bias;
            if (q < t)
              break;
            let qMinusT = q - t, baseMinusT = 36 - t;
            output.push(
              stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
            ), q = floor(qMinusT / baseMinusT);
          }
          output.push(stringFromCharCode(digitToBasic(q, 0))), bias = adapt(delta, handledCPCountPlusOne, handledCPCount === basicLength), delta = 0, ++handledCPCount;
        }
      ++delta, ++n;
    }
    return output.join("");
  }, toUnicode = function(input) {
    return mapDomain(input, function(string2) {
      return regexPunycode.test(string2) ? decode2(string2.slice(4).toLowerCase()) : string2;
    });
  }, toASCII = function(input) {
    return mapDomain(input, function(string2) {
      return regexNonASCII.test(string2) ? "xn--" + encode2(string2) : string2;
    });
  }, punycode = {
    /**
     * A string representing the current Punycode.js version number.
     * @memberOf punycode
     * @type String
     */
    version: "2.3.1",
    /**
     * An object of methods to convert from JavaScript's internal character
     * representation (UCS-2) to Unicode code points, and back.
     * @see <https://mathiasbynens.be/notes/javascript-encoding>
     * @memberOf punycode
     * @type Object
     */
    ucs2: {
      decode: ucs2decode,
      encode: ucs2encode
    },
    decode: decode2,
    encode: encode2,
    toASCII,
    toUnicode
  };
  var punycode_es6_default = punycode;

  // node_modules/markdown-it/dist/markdown-it.mjs
  var __defProp2 = Object.defineProperty, __exportAll = (all, no_symbols) => {
    let target = {};
    for (var name in all) __defProp2(target, name, {
      get: all[name],
      enumerable: !0
    });
    return no_symbols || __defProp2(target, Symbol.toStringTag, { value: "Module" }), target;
  }, utils_exports = /* @__PURE__ */ __exportAll({
    arrayReplaceAt: () => arrayReplaceAt,
    asciiTrim: () => asciiTrim,
    callable: () => callable,
    escapeHtml: () => escapeHtml,
    escapeRE: () => escapeRE,
    fromCodePoint: () => fromCodePoint,
    isMdAsciiPunct: () => isMdAsciiPunct,
    isPunctChar: () => isPunctChar,
    isPunctCharCode: () => isPunctCharCode,
    isSpace: () => isSpace,
    isValidEntityCode: () => isValidEntityCode,
    isWhiteSpace: () => isWhiteSpace,
    lib: () => lib,
    normalizeReference: () => normalizeReference,
    unescapeAll: () => unescapeAll,
    unescapeMd: () => unescapeMd
  });
  function callable(cls) {
    let wrapper = function(...args) {
      return Reflect.construct(cls, args, new.target && new.target !== wrapper ? new.target : cls);
    };
    return Object.defineProperty(wrapper, "name", { value: cls.name }), Object.setPrototypeOf(wrapper, cls), wrapper.prototype = cls.prototype, wrapper;
  }
  function arrayReplaceAt(src, pos, newElements) {
    return [].concat(src.slice(0, pos), newElements, src.slice(pos + 1));
  }
  function isValidEntityCode(c) {
    return !(c >= 55296 && c <= 57343 || c >= 64976 && c <= 65007 || (c & 65535) === 65535 || (c & 65535) === 65534 || c >= 0 && c <= 8 || c === 11 || c >= 14 && c <= 31 || c >= 127 && c <= 159 || c > 1114111);
  }
  function fromCodePoint(c) {
    if (c > 65535) {
      c -= 65536;
      let surrogate1 = 55296 + (c >> 10), surrogate2 = 56320 + (c & 1023);
      return String.fromCharCode(surrogate1, surrogate2);
    }
    return String.fromCharCode(c);
  }
  var UNESCAPE_MD_RE = /\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, UNESCAPE_ALL_RE = new RegExp(`${UNESCAPE_MD_RE.source}|${/&([a-z#][a-z0-9]{1,31});/gi.source}`, "gi"), DIGITAL_ENTITY_TEST_RE = /^#((?:x[a-f0-9]{1,8}|[0-9]{1,8}))$/i;
  function replaceEntityPattern(match, name) {
    if (name.charCodeAt(0) === 35 && DIGITAL_ENTITY_TEST_RE.test(name)) {
      let code2 = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return isValidEntityCode(code2) ? fromCodePoint(code2) : match;
    }
    let decoded = decodeHTMLStrict(match);
    return decoded !== match ? decoded : match;
  }
  function unescapeMd(str) {
    return str.indexOf("\\") < 0 ? str : str.replace(UNESCAPE_MD_RE, "$1");
  }
  function unescapeAll(str) {
    return str.indexOf("\\") < 0 && str.indexOf("&") < 0 ? str : str.replace(UNESCAPE_ALL_RE, function(match, escaped, entity2) {
      return escaped || replaceEntityPattern(match, entity2);
    });
  }
  var HTML_ESCAPE_TEST_RE = /[&<>"]/, HTML_ESCAPE_REPLACE_RE = /[&<>"]/g, HTML_REPLACEMENTS = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  };
  function replaceUnsafeChar(ch) {
    return HTML_REPLACEMENTS[ch];
  }
  function escapeHtml(str) {
    return HTML_ESCAPE_TEST_RE.test(str) ? str.replace(HTML_ESCAPE_REPLACE_RE, replaceUnsafeChar) : str;
  }
  var REGEXP_ESCAPE_RE = /[.?*+^$[\]\\(){}|-]/g;
  function escapeRE(str) {
    return str.replace(REGEXP_ESCAPE_RE, "\\$&");
  }
  function isSpace(code2) {
    switch (code2) {
      case 9:
      case 32:
        return !0;
    }
    return !1;
  }
  function isWhiteSpace(code2) {
    if (code2 >= 8192 && code2 <= 8202) return !0;
    switch (code2) {
      case 9:
      case 10:
      case 11:
      case 12:
      case 13:
      case 32:
      case 160:
      case 5760:
      case 8239:
      case 8287:
      case 12288:
        return !0;
    }
    return !1;
  }
  function isPunctChar(ch) {
    return P.test(ch) || S.test(ch);
  }
  function isPunctCharCode(code2) {
    return isPunctChar(fromCodePoint(code2));
  }
  function isMdAsciiPunct(ch) {
    switch (ch) {
      case 33:
      case 34:
      case 35:
      case 36:
      case 37:
      case 38:
      case 39:
      case 40:
      case 41:
      case 42:
      case 43:
      case 44:
      case 45:
      case 46:
      case 47:
      case 58:
      case 59:
      case 60:
      case 61:
      case 62:
      case 63:
      case 64:
      case 91:
      case 92:
      case 93:
      case 94:
      case 95:
      case 96:
      case 123:
      case 124:
      case 125:
      case 126:
        return !0;
      default:
        return !1;
    }
  }
  function normalizeReference(str) {
    return str = str.trim().replace(/\s+/g, " "), str.toLowerCase().toUpperCase();
  }
  function isAsciiTrimmable(c) {
    return c === 32 || c === 9 || c === 10 || c === 13;
  }
  function asciiTrim(str) {
    let start = 0;
    for (; start < str.length && isAsciiTrimmable(str.charCodeAt(start)); start++) ;
    let end = str.length - 1;
    for (; end >= start && isAsciiTrimmable(str.charCodeAt(end)); end--) ;
    return str.slice(start, end + 1);
  }
  var lib = {
    mdurl: mdurl_exports,
    ucmicro: build_exports
  };
  function parseLinkLabel(state, start, disableNested) {
    let level, found, marker, prevPos, max = state.posMax, oldPos = state.pos;
    for (state.pos = start + 1, level = 1; state.pos < max; ) {
      if (marker = state.src.charCodeAt(state.pos), marker === 93 && (level--, level === 0)) {
        found = !0;
        break;
      }
      if (prevPos = state.pos, state.md.inline.skipToken(state), marker === 91) {
        if (prevPos === state.pos - 1) level++;
        else if (disableNested)
          return state.pos = oldPos, -1;
      }
    }
    let labelEnd = -1;
    return found && (labelEnd = state.pos), state.pos = oldPos, labelEnd;
  }
  function parseLinkDestination(str, start, max) {
    let code2, pos = start, result = {
      ok: !1,
      pos: 0,
      str: ""
    };
    if (str.charCodeAt(pos) === 60) {
      for (pos++; pos < max; ) {
        if (code2 = str.charCodeAt(pos), code2 === 10 || code2 === 60) return result;
        if (code2 === 62)
          return result.pos = pos + 1, result.str = unescapeAll(str.slice(start + 1, pos)), result.ok = !0, result;
        if (code2 === 92 && pos + 1 < max) {
          pos += 2;
          continue;
        }
        pos++;
      }
      return result;
    }
    let level = 0;
    for (; pos < max && (code2 = str.charCodeAt(pos), !(code2 === 32 || code2 < 32 || code2 === 127)); ) {
      if (code2 === 92 && pos + 1 < max) {
        if (str.charCodeAt(pos + 1) === 32) {
          pos++;
          continue;
        }
        pos += 2;
        continue;
      }
      if (code2 === 40 && (level++, level > 32))
        return result;
      if (code2 === 41) {
        if (level === 0) break;
        level--;
      }
      pos++;
    }
    return start === pos || level !== 0 || (result.str = unescapeAll(str.slice(start, pos)), result.pos = pos, result.ok = !0), result;
  }
  function parseLinkTitle(str, start, max, prev_state) {
    let code2, pos = start, state = {
      ok: !1,
      can_continue: !1,
      pos: 0,
      str: "",
      marker: 0
    };
    if (prev_state)
      state.str = prev_state.str, state.marker = prev_state.marker;
    else {
      if (pos >= max) return state;
      let marker = str.charCodeAt(pos);
      if (marker !== 34 && marker !== 39 && marker !== 40) return state;
      start++, pos++, marker === 40 && (marker = 41), state.marker = marker;
    }
    for (; pos < max; ) {
      if (code2 = str.charCodeAt(pos), code2 === state.marker)
        return state.pos = pos + 1, state.str += unescapeAll(str.slice(start, pos)), state.ok = !0, state;
      if (code2 === 40 && state.marker === 41) return state;
      code2 === 92 && pos + 1 < max && pos++, pos++;
    }
    return state.can_continue = !0, state.str += unescapeAll(str.slice(start, pos)), state;
  }
  var helpers_exports = /* @__PURE__ */ __exportAll({
    parseLinkDestination: () => parseLinkDestination,
    parseLinkLabel: () => parseLinkLabel,
    parseLinkTitle: () => parseLinkTitle
  });
  function _typeof(o) {
    "@babel/helpers - typeof";
    return _typeof = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(o2) {
      return typeof o2;
    } : function(o2) {
      return o2 && typeof Symbol == "function" && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
    }, _typeof(o);
  }
  function toPrimitive(t, r) {
    if (_typeof(t) != "object" || !t) return t;
    var e = t[Symbol.toPrimitive];
    if (e !== void 0) {
      var i = e.call(t, r || "default");
      if (_typeof(i) != "object") return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return (r === "string" ? String : Number)(t);
  }
  function toPropertyKey(t) {
    var i = toPrimitive(t, "string");
    return _typeof(i) == "symbol" ? i : i + "";
  }
  function _defineProperty(e, r, t) {
    return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
      value: t,
      enumerable: !0,
      configurable: !0,
      writable: !0
    }) : e[r] = t, e;
  }
  var Token = class {
    constructor(type, tag, nesting) {
      _defineProperty(
        this,
        /**
        * Source map info. Format: `[ line_begin, line_end ]`
        */
        "map",
        null
      ), _defineProperty(
        this,
        /**
        * nesting level, the same as `state.level`
        */
        "level",
        0
      ), _defineProperty(
        this,
        /**
        * An array of child nodes (inline and img tokens)
        */
        "children",
        null
      ), _defineProperty(
        this,
        /**
        * In a case of self-closing tag (code, html, fence, etc.),
        * it has contents of this tag.
        */
        "content",
        ""
      ), _defineProperty(
        this,
        /**
        * '*' or '_' for emphasis, fence string for fence, etc.
        */
        "markup",
        ""
      ), _defineProperty(
        this,
        /**
        * Additional information:
        *
        * - Info string for "fence" tokens
        * - The value "auto" for autolink "link_open" and "link_close" tokens
        * - The string value of the item marker for ordered-list "list_item_open" tokens
        */
        "info",
        ""
      ), _defineProperty(
        this,
        /**
        * True for block-level tokens, false for inline tokens.
        * Used in renderer to calculate line breaks
        */
        "block",
        !1
      ), _defineProperty(
        this,
        /**
        * If it's true, ignore this element when rendering. Used for tight lists
        * to hide paragraphs.
        */
        "hidden",
        !1
      ), this.type = type, this.tag = tag, this.attrs = null, this.nesting = nesting, this.meta = null;
    }
    /**
    * Search attribute index by name.
    */
    attrIndex(name) {
      if (!this.attrs) return -1;
      let attrs = this.attrs;
      for (let i = 0, len = attrs.length; i < len; i++) if (attrs[i][0] === name) return i;
      return -1;
    }
    /**
    * Add `[ name, value ]` attribute to list. Init attrs if necessary
    */
    attrPush(attrData) {
      this.attrs ? this.attrs.push(attrData) : this.attrs = [attrData];
    }
    /**
    * Set `name` attribute to `value`. Override old value if exists.
    */
    attrSet(name, value) {
      let idx = this.attrIndex(name), attrData = [name, value];
      idx < 0 ? this.attrPush(attrData) : this.attrs[idx] = attrData;
    }
    /**
    * Get the value of attribute `name`, or null if it does not exist.
    */
    attrGet(name) {
      let idx = this.attrIndex(name), value = null;
      return idx >= 0 && (value = this.attrs[idx][1]), value;
    }
    /**
    * Join value to existing attribute via space. Or create new attribute if not
    * exists. Useful to operate with token classes.
    */
    attrJoin(name, value) {
      let idx = this.attrIndex(name);
      idx < 0 ? this.attrPush([name, value]) : this.attrs[idx][1] = `${this.attrs[idx][1]} ${value}`;
    }
  }, Ruler = class {
    constructor() {
      _defineProperty(
        this,
        /** @internal */
        "__rules__",
        []
      ), _defineProperty(
        this,
        /** @internal */
        "__cache__",
        null
      );
    }
    /** @internal */
    __find__(name) {
      for (let i = 0; i < this.__rules__.length; i++) if (this.__rules__[i].name === name) return i;
      return -1;
    }
    /** @internal */
    __compile__() {
      let chains = /* @__PURE__ */ new Set();
      this.__rules__.forEach((rule) => {
        rule.enabled && rule.alt.forEach((altName) => {
          altName && chains.add(altName);
        });
      }), this.__cache__ = /* @__PURE__ */ Object.create(null), this.__cache__[""] = [], this.__rules__.forEach((rule) => {
        rule.enabled && this.__cache__[""].push(rule.fn);
      }), chains.forEach((chain) => {
        this.__cache__[chain] = [], this.__rules__.forEach((rule) => {
          rule.enabled && rule.alt.indexOf(chain) >= 0 && this.__cache__[chain].push(rule.fn);
        });
      });
    }
    /**
    * Replace rule by name with new function & options. Throws error if name not
    * found.
    *
    * @example Replace existing typographer replacement rule with new one
    * ```javascript
    * import MarkdownIt from 'markdown-it'
    * const md = new MarkdownIt()
    *
    * md.core.ruler.at('replacements', function replace(state) {
    *   //...
    * });
    * ```
    */
    at(name, fn, options = {}) {
      let index = this.__find__(name);
      if (index === -1) throw new Error(`Parser rule not found: ${name}`);
      this.__rules__[index].fn = fn, this.__rules__[index].alt = options.alt || [], this.__cache__ = null;
    }
    /**
    * Add new rule to chain before one with given name. See also
    * {@link Ruler.after}, {@link Ruler.push}.
    *
    * @example
    * ```javascript
    * import MarkdownIt from 'markdown-it'
    * const md = new MarkdownIt()
    *
    * md.block.ruler.before('paragraph', 'my_rule', function replace(state) {
    *   //...
    * });
    * ```
    */
    before(beforeName, ruleName, fn, options = {}) {
      let index = this.__find__(beforeName);
      if (index === -1) throw new Error(`Parser rule not found: ${beforeName}`);
      this.__rules__.splice(index, 0, {
        name: ruleName,
        enabled: !0,
        fn,
        alt: options.alt || []
      }), this.__cache__ = null;
    }
    /**
    * Add new rule to chain after one with given name. See also
    * {@link Ruler.before}, {@link Ruler.push}.
    *
    * @example
    * ```javascript
    * import MarkdownIt from 'markdown-it'
    * const md = new MarkdownIt()
    *
    * md.inline.ruler.after('text', 'my_rule', function replace(state) {
    *   //...
    * });
    * ```
    */
    after(afterName, ruleName, fn, options = {}) {
      let index = this.__find__(afterName);
      if (index === -1) throw new Error(`Parser rule not found: ${afterName}`);
      this.__rules__.splice(index + 1, 0, {
        name: ruleName,
        enabled: !0,
        fn,
        alt: options.alt || []
      }), this.__cache__ = null;
    }
    /**
    * Push new rule to the end of chain. See also
    * {@link Ruler.before}, {@link Ruler.after}.
    *
    * @example
    * ```javascript
    * import MarkdownIt from 'markdown-it'
    * const md = new MarkdownIt()
    *
    * md.core.ruler.push('my_rule', function replace(state) {
    *   //...
    * });
    * ```
    */
    push(ruleName, fn, options = {}) {
      this.__rules__.push({
        name: ruleName,
        enabled: !0,
        fn,
        alt: options.alt || []
      }), this.__cache__ = null;
    }
    /**
    * Enable rules with given names. If any rule name not found - throw Error.
    * Errors can be disabled by second param.
    *
    * See also {@link Ruler.disable}, {@link Ruler.enableOnly}.
    *
    * Returns list of found rule names (if no exception happened).
    */
    enable(list2, ignoreInvalid = !1) {
      Array.isArray(list2) || (list2 = [list2]);
      let result = [];
      return list2.forEach((name) => {
        let idx = this.__find__(name);
        if (idx < 0) {
          if (ignoreInvalid) return;
          throw new Error(`Rules manager: invalid rule name ${name}`);
        }
        this.__rules__[idx].enabled = !0, result.push(name);
      }), this.__cache__ = null, result;
    }
    /**
    * Enable rules with given names, and disable everything else. If any rule name
    * not found - throw Error. Errors can be disabled by second param.
    *
    * See also {@link Ruler.disable}, {@link Ruler.enable}.
    */
    enableOnly(list2, ignoreInvalid = !1) {
      Array.isArray(list2) || (list2 = [list2]), this.__rules__.forEach((rule) => {
        rule.enabled = !1;
      }), this.enable(list2, ignoreInvalid);
    }
    /**
    * Disable rules with given names. If any rule name not found - throw Error.
    * Errors can be disabled by second param.
    *
    * See also {@link Ruler.enable}, {@link Ruler.enableOnly}.
    *
    * Returns list of found rule names (if no exception happened).
    */
    disable(list2, ignoreInvalid = !1) {
      Array.isArray(list2) || (list2 = [list2]);
      let result = [];
      return list2.forEach((name) => {
        let idx = this.__find__(name);
        if (idx < 0) {
          if (ignoreInvalid) return;
          throw new Error(`Rules manager: invalid rule name ${name}`);
        }
        this.__rules__[idx].enabled = !1, result.push(name);
      }), this.__cache__ = null, result;
    }
    /**
    * Return array of active functions (rules) for given chain name. It analyzes
    * rules configuration, compiles caches if not exists and returns result.
    *
    * Default chain name is `''` (empty string). It can't be skipped. That's
    * done intentionally, to keep signature monomorphic for high speed.
    */
    getRules(chainName) {
      return this.__cache__ || this.__compile__(), this.__cache__[chainName] || [];
    }
  }, default_rules = {};
  default_rules.code_inline = function(tokens, idx, options, env, slf) {
    let token = tokens[idx];
    return `<code${slf.renderAttrs(token)}>${escapeHtml(token.content)}</code>`;
  };
  default_rules.code_block = function(tokens, idx, options, env, slf) {
    let token = tokens[idx];
    return `<pre${slf.renderAttrs(token)}><code>${escapeHtml(tokens[idx].content)}</code></pre>
`;
  };
  default_rules.fence = function(tokens, idx, options, env, slf) {
    let token = tokens[idx], info = token.info ? unescapeAll(token.info).trim() : "", langName = "", langAttrs = "";
    if (info) {
      let arr = info.split(/(\s+)/g);
      langName = arr[0], langAttrs = arr.slice(2).join("");
    }
    let highlighted;
    if (options.highlight ? highlighted = options.highlight(token.content, langName, langAttrs) || escapeHtml(token.content) : highlighted = escapeHtml(token.content), highlighted.indexOf("<pre") === 0) return highlighted + `
`;
    if (info) {
      let i = token.attrIndex("class"), tmpAttrs = token.attrs ? token.attrs.slice() : [];
      i < 0 ? tmpAttrs.push(["class", `${options.langPrefix}${langName}`]) : (tmpAttrs[i] = [tmpAttrs[i][0], tmpAttrs[i][1]], tmpAttrs[i][1] += ` ${options.langPrefix}${langName}`);
      let tmpToken = { attrs: tmpAttrs };
      return `<pre><code${slf.renderAttrs(tmpToken)}>${highlighted}</code></pre>
`;
    }
    return `<pre><code${slf.renderAttrs(token)}>${highlighted}</code></pre>
`;
  };
  default_rules.image = function(tokens, idx, options, env, slf) {
    let token = tokens[idx];
    return token.attrs[token.attrIndex("alt")][1] = slf.renderInlineAsText(token.children, options, env), slf.renderToken(tokens, idx, options);
  };
  default_rules.hardbreak = function(tokens, idx, options) {
    return options.xhtmlOut ? `<br />
` : `<br>
`;
  };
  default_rules.softbreak = function(tokens, idx, options) {
    return options.breaks ? options.xhtmlOut ? `<br />
` : `<br>
` : `
`;
  };
  default_rules.text = function(tokens, idx) {
    return escapeHtml(tokens[idx].content);
  };
  default_rules.html_block = function(tokens, idx) {
    return tokens[idx].content;
  };
  default_rules.html_inline = function(tokens, idx) {
    return tokens[idx].content;
  };
  var Renderer = class {
    constructor() {
      _defineProperty(
        this,
        /**
        * Contains render rules for tokens. Can be updated and extended.
        *
        * See [source code](https://github.com/markdown-it/markdown-it/blob/master/src/renderer.ts)
        * for more details and examples.
        *
        * @example Custom render rules
        * ```javascript
        * import MarkdownIt from 'markdown-it'
        * const md = new MarkdownIt()
        *
        * md.renderer.rules.strong_open  = function () { return '<b>'; };
        * md.renderer.rules.strong_close = function () { return '</b>'; };
        *
        * const result = md.renderInline(...);
        * ```
        *
        * @example Each rule is called as independent static function with fixed signature
        * ```javascript
        * function my_token_render(tokens, idx, options, env, renderer) {
        *   // ...
        *   return renderedHTML;
        * }
        * ```
        */
        "rules",
        Object.assign({}, default_rules)
      );
    }
    /**
    * Render token attributes to string.
    */
    renderAttrs(token) {
      let i, l, result;
      if (!token.attrs) return "";
      for (result = "", i = 0, l = token.attrs.length; i < l; i++) result += ` ${escapeHtml(token.attrs[i][0])}="${escapeHtml(String(token.attrs[i][1]))}"`;
      return result;
    }
    /**
    * Default token renderer. Can be overriden by custom function
    * in {@link Renderer.rules}.
    */
    renderToken(tokens, idx, options) {
      let token = tokens[idx], result = "";
      if (token.hidden) return "";
      let prev = idx - 1;
      for (; prev >= 0 && tokens[prev].hidden && tokens[prev].nesting === 0; ) prev--;
      token.block && token.nesting !== -1 && prev >= 0 && tokens[prev].hidden && tokens[prev].nesting === -1 && (result += `
`), result += (token.nesting === -1 ? "</" : "<") + token.tag, result += this.renderAttrs(token), token.nesting === 0 && options.xhtmlOut && (result += " /");
      let needLf = !1;
      if (token.block && (needLf = !0, token.nesting === 1)) {
        let next = idx + 1;
        for (; next < tokens.length && tokens[next].hidden && tokens[next].nesting === 0; ) next++;
        if (next < tokens.length) {
          let nextToken = tokens[next];
          (nextToken.type === "inline" || nextToken.hidden || nextToken.nesting === -1 && nextToken.tag === token.tag) && (needLf = !1);
        }
      }
      return result += needLf ? `>
` : ">", result;
    }
    /**
    * The same as {@link Renderer.render}, but for single token of `inline` type.
    */
    renderInline(tokens, options, env) {
      let result = "", rules = this.rules;
      for (let i = 0, len = tokens.length; i < len; i++) {
        let type = tokens[i].type;
        typeof rules[type] < "u" ? result += rules[type](tokens, i, options, env, this) : result += this.renderToken(tokens, i, options);
      }
      return result;
    }
    /**
    * Special kludge for image `alt` attributes to conform CommonMark spec.
    * Don't try to use it! Spec requires to show `alt` content with stripped markup,
    * instead of simple escaping.
    */
    renderInlineAsText(tokens, options, env) {
      let result = "";
      for (let i = 0, len = tokens.length; i < len; i++) switch (tokens[i].type) {
        case "text":
        case "code_inline":
          result += tokens[i].content;
          break;
        case "image":
          result += this.renderInlineAsText(tokens[i].children, options, env);
          break;
        case "html_inline":
        case "html_block":
          result += tokens[i].content;
          break;
        case "softbreak":
        case "hardbreak":
          result += `
`;
      }
      return result;
    }
    /**
    * Takes token stream and generates HTML. Probably, you will never need to call
    * this method directly.
    */
    render(tokens, options, env) {
      let result = "", rules = this.rules;
      for (let i = 0, len = tokens.length; i < len; i++) {
        let type = tokens[i].type;
        type === "inline" ? result += this.renderInline(tokens[i].children, options, env) : typeof rules[type] < "u" ? result += rules[type](tokens, i, options, env, this) : result += this.renderToken(tokens, i, options);
      }
      return result;
    }
  }, StateCore = class {
    constructor(src, md2, env) {
      _defineProperty(this, "tokens", []), _defineProperty(this, "inlineMode", !1), _defineProperty(this, "Token", Token), this.src = src, this.env = env, this.md = md2;
    }
  }, UNNORMALIZED_NEWLINE_RE = /\r\n?/g, NULL_RE = /\0/g;
  function normalize(state) {
    let str;
    str = state.src.replace(UNNORMALIZED_NEWLINE_RE, `
`), str = str.replace(NULL_RE, "�"), state.src = str;
  }
  function block(state) {
    let token;
    state.inlineMode ? (token = new state.Token("inline", "", 0), token.content = state.src, token.map = [0, 1], token.children = [], state.tokens.push(token)) : state.md.block.parse(state.src, state.md, state.env, state.tokens);
  }
  function strip_references(state) {
    let tokens = state.tokens, last = 0;
    for (let curr = 0; curr < tokens.length; curr++)
      tokens[curr].type !== "reference_definition" && (curr !== last && (tokens[last] = tokens[curr]), last++);
    tokens.length !== last && (tokens.length = last);
  }
  function inline(state) {
    let tokens = state.tokens;
    for (let i = 0, l = tokens.length; i < l; i++) {
      let tok = tokens[i];
      tok.type === "inline" && state.md.inline.parse(tok.content, state.md, state.env, tok.children);
    }
  }
  function isLinkOpen$1(str) {
    return /^<a[>\s]/i.test(str);
  }
  function isLinkClose$1(str) {
    return /^<\/a\s*>/i.test(str);
  }
  function linkify$1(state) {
    let blockTokens = state.tokens;
    if (state.md.options.linkify)
      for (let j = 0, l = blockTokens.length; j < l; j++) {
        if (blockTokens[j].type !== "inline" || !state.md.linkify.test(blockTokens[j].content)) continue;
        let tokens = blockTokens[j].children, replacements = [], htmlLinkLevel = 0;
        for (let i = tokens.length - 1; i >= 0; i--) {
          let currentToken = tokens[i];
          if (currentToken.type === "link_close") {
            for (i--; tokens[i].level !== currentToken.level && tokens[i].type !== "link_open"; ) i--;
            continue;
          }
          if (currentToken.type === "html_inline" && (isLinkOpen$1(currentToken.content) && htmlLinkLevel > 0 && htmlLinkLevel--, isLinkClose$1(currentToken.content) && htmlLinkLevel++), !(htmlLinkLevel > 0) && currentToken.type === "text" && state.md.linkify.test(currentToken.content)) {
            let text3 = currentToken.content, links = state.md.linkify.match(text3), nodes = [], level = currentToken.level, lastPos = 0;
            links.length > 0 && links[0].index === 0 && i > 0 && tokens[i - 1].type === "text_special" && (links = links.slice(1));
            for (let ln = 0; ln < links.length; ln++) {
              let url = links[ln].url, fullUrl = state.md.normalizeLink(url);
              if (!state.md.validateLink(fullUrl)) continue;
              let urlText = links[ln].text;
              links[ln].schema ? links[ln].schema === "mailto:" && !/^mailto:/i.test(urlText) ? urlText = state.md.normalizeLinkText(`mailto:${urlText}`).replace(/^mailto:/, "") : urlText = state.md.normalizeLinkText(urlText) : urlText = state.md.normalizeLinkText(`http://${urlText}`).replace(/^http:\/\//, "");
              let pos = links[ln].index;
              if (pos > lastPos) {
                let token = new state.Token("text", "", 0);
                token.content = text3.slice(lastPos, pos), token.level = level, nodes.push(token);
              }
              let token_o = new state.Token("link_open", "a", 1);
              token_o.attrs = [["href", fullUrl]], token_o.level = level++, token_o.markup = "linkify", token_o.info = "auto", nodes.push(token_o);
              let token_t = new state.Token("text", "", 0);
              token_t.content = urlText, token_t.level = level, nodes.push(token_t);
              let token_c = new state.Token("link_close", "a", -1);
              token_c.level = --level, token_c.markup = "linkify", token_c.info = "auto", nodes.push(token_c), lastPos = links[ln].lastIndex;
            }
            if (lastPos < text3.length) {
              let token = new state.Token("text", "", 0);
              token.content = text3.slice(lastPos), token.level = level, nodes.push(token);
            }
            replacements.push({
              index: i,
              nodes
            });
          }
        }
        if (replacements.length > 0) {
          let newTokensLength = tokens.length;
          for (let replacement of replacements) newTokensLength += replacement.nodes.length - 1;
          let newTokens = new Array(newTokensLength), replacementIndex = 0, newTokenIndex = 0;
          replacements.reverse();
          for (let i = 0; i < tokens.length; i++) {
            let replacement = replacements[replacementIndex];
            if (replacement?.index === i) {
              for (let node of replacement.nodes) newTokens[newTokenIndex++] = node;
              replacementIndex++;
            } else newTokens[newTokenIndex++] = tokens[i];
          }
          blockTokens[j].children = newTokens;
        }
      }
  }
  var RARE_RE = /\+-|\.\.|\?\?\?\?|!!!!|,,|--/, SCOPED_ABBR_TEST_RE = /\((c|tm|r)\)/i, SCOPED_ABBR_RE = /\((c|tm|r)\)/gi, SCOPED_ABBR = {
    c: "©",
    r: "®",
    tm: "™"
  };
  function replaceFn(match, name) {
    return SCOPED_ABBR[name.toLowerCase()];
  }
  function replace_scoped(inlineTokens) {
    let inside_autolink = 0;
    for (let i = inlineTokens.length - 1; i >= 0; i--) {
      let token = inlineTokens[i];
      token.type === "text" && !inside_autolink && (token.content = token.content.replace(SCOPED_ABBR_RE, replaceFn)), token.type === "link_open" && token.info === "auto" && inside_autolink--, token.type === "link_close" && token.info === "auto" && inside_autolink++;
    }
  }
  function replace_rare(inlineTokens) {
    let inside_autolink = 0;
    for (let i = inlineTokens.length - 1; i >= 0; i--) {
      let token = inlineTokens[i];
      token.type === "text" && !inside_autolink && RARE_RE.test(token.content) && (token.content = token.content.replace(/\+-/g, "±").replace(/\.{2,}/g, "…").replace(/([?!])…/g, "$1..").replace(/([?!]){4,}/g, "$1$1$1").replace(/,{2,}/g, ",").replace(/(^|[^-])---(?=[^-]|$)/gm, "$1—").replace(/(^|\s)--(?=\s|$)/gm, "$1–").replace(/(^|[^-\s])--(?=[^-\s]|$)/gm, "$1–")), token.type === "link_open" && token.info === "auto" && inside_autolink--, token.type === "link_close" && token.info === "auto" && inside_autolink++;
    }
  }
  function replace(state) {
    let blkIdx;
    if (state.md.options.typographer)
      for (blkIdx = state.tokens.length - 1; blkIdx >= 0; blkIdx--)
        state.tokens[blkIdx].type === "inline" && (SCOPED_ABBR_TEST_RE.test(state.tokens[blkIdx].content) && replace_scoped(state.tokens[blkIdx].children), RARE_RE.test(state.tokens[blkIdx].content) && replace_rare(state.tokens[blkIdx].children));
  }
  var QUOTE_TEST_RE = /['"]/, QUOTE_RE = /['"]/g, APOSTROPHE = "’", MAX_OPENERS = 1e3;
  function truncateStack(stack, heads, length) {
    for (; stack.length > length; ) {
      let item = stack.pop();
      item.isSingleQuote ? heads.single = item.prevSameQuoteIdx : heads.double = item.prevSameQuoteIdx;
    }
  }
  function addReplacement(replacements, tokenIdx, pos, ch) {
    replacements[tokenIdx] || (replacements[tokenIdx] = []), replacements[tokenIdx].push({
      pos,
      ch
    });
  }
  function applyReplacements(str, replacements) {
    let result = "", lastPos = 0;
    replacements.sort((a, b) => a.pos - b.pos);
    for (let i = 0; i < replacements.length; i++) {
      let replacement = replacements[i];
      result += str.slice(lastPos, replacement.pos) + replacement.ch, lastPos = replacement.pos + 1;
    }
    return result + str.slice(lastPos);
  }
  function process_inlines(tokens, state) {
    let j, stack = [], heads = {
      single: -1,
      double: -1
    }, replacements = {};
    for (let i = 0; i < tokens.length; i++) {
      let token = tokens[i], thisLevel = tokens[i].level;
      for (j = stack.length - 1; j >= 0 && !(stack[j].level <= thisLevel); j--) ;
      if (truncateStack(stack, heads, j + 1), token.type !== "text") continue;
      let text3 = token.content, pos = 0, max = text3.length;
      OUTER: for (; pos < max; ) {
        QUOTE_RE.lastIndex = pos;
        let t = QUOTE_RE.exec(text3);
        if (!t) break;
        let canOpen = !0, canClose = !0;
        pos = t.index + 1;
        let isSingle = t[0] === "'", lastChar = 32;
        if (t.index - 1 >= 0) lastChar = text3.charCodeAt(t.index - 1);
        else for (j = i - 1; j >= 0 && !(tokens[j].type === "softbreak" || tokens[j].type === "hardbreak"); j--)
          if (tokens[j].content) {
            lastChar = tokens[j].content.charCodeAt(tokens[j].content.length - 1);
            break;
          }
        let nextChar = 32;
        if (pos < max) nextChar = text3.charCodeAt(pos);
        else for (j = i + 1; j < tokens.length && !(tokens[j].type === "softbreak" || tokens[j].type === "hardbreak"); j++)
          if (tokens[j].content) {
            nextChar = tokens[j].content.charCodeAt(0);
            break;
          }
        let isLastPunctChar = isMdAsciiPunct(lastChar) || isPunctCharCode(lastChar), isNextPunctChar = isMdAsciiPunct(nextChar) || isPunctCharCode(nextChar), isLastWhiteSpace = isWhiteSpace(lastChar), isNextWhiteSpace = isWhiteSpace(nextChar);
        if (isNextWhiteSpace ? canOpen = !1 : isNextPunctChar && (isLastWhiteSpace || isLastPunctChar || (canOpen = !1)), isLastWhiteSpace ? canClose = !1 : isLastPunctChar && (isNextWhiteSpace || isNextPunctChar || (canClose = !1)), nextChar === 34 && t[0] === '"' && lastChar >= 48 && lastChar <= 57 && (canClose = canOpen = !1), canOpen && canClose && (canOpen = isLastPunctChar, canClose = isNextPunctChar), !canOpen && !canClose) {
          isSingle && addReplacement(replacements, i, t.index, APOSTROPHE);
          continue;
        }
        if (canClose && (j = isSingle ? heads.single : heads.double, j >= 0 && stack[j].level === thisLevel)) {
          let item = stack[j], openQuote, closeQuote;
          isSingle ? (openQuote = state.md.options.quotes[2], closeQuote = state.md.options.quotes[3]) : (openQuote = state.md.options.quotes[0], closeQuote = state.md.options.quotes[1]), addReplacement(replacements, i, t.index, closeQuote), addReplacement(replacements, item.tokenIdx, item.contentPos, openQuote), truncateStack(stack, heads, j);
          continue OUTER;
        }
        if (canOpen) {
          if (stack.length >= MAX_OPENERS) return;
          stack.push({
            tokenIdx: i,
            contentPos: t.index,
            isSingleQuote: isSingle,
            level: thisLevel,
            prevSameQuoteIdx: isSingle ? heads.single : heads.double
          }), isSingle ? heads.single = stack.length - 1 : heads.double = stack.length - 1;
        } else canClose && isSingle && addReplacement(replacements, i, t.index, APOSTROPHE);
      }
    }
    Object.keys(replacements).forEach(function(tokenIdx) {
      let idx = Number(tokenIdx);
      tokens[idx].content = applyReplacements(tokens[idx].content, replacements[tokenIdx]);
    });
  }
  function smartquotes(state) {
    if (state.md.options.typographer)
      for (let blkIdx = state.tokens.length - 1; blkIdx >= 0; blkIdx--)
        state.tokens[blkIdx].type !== "inline" || !QUOTE_TEST_RE.test(state.tokens[blkIdx].content) || process_inlines(state.tokens[blkIdx].children, state);
  }
  function join_alt(tokens) {
    let curr, last, max = tokens.length;
    for (curr = 0; curr < max; curr++) tokens[curr].type === "text_special" && (tokens[curr].type = "text");
    for (curr = last = 0; curr < max; curr++) tokens[curr].type === "text" && curr + 1 < max && tokens[curr + 1].type === "text" ? tokens[curr + 1].content = tokens[curr].content + tokens[curr + 1].content : (curr !== last && (tokens[last] = tokens[curr]), last++);
    curr !== last && (tokens.length = last);
  }
  function text_join(state) {
    let curr, last, blockTokens = state.tokens, l = blockTokens.length;
    for (let j = 0; j < l; j++) {
      if (blockTokens[j].type !== "inline") continue;
      let tokens = blockTokens[j].children, max = tokens.length;
      for (curr = 0; curr < max; curr++)
        tokens[curr].type === "text_special" && (tokens[curr].type = "text"), tokens[curr].children && join_alt(tokens[curr].children);
      for (curr = last = 0; curr < max; curr++) tokens[curr].type === "text" && curr + 1 < max && tokens[curr + 1].type === "text" ? tokens[curr + 1].content = tokens[curr].content + tokens[curr + 1].content : (curr !== last && (tokens[last] = tokens[curr]), last++);
      curr !== last && (tokens.length = last);
    }
  }
  var _rules$2 = [
    ["normalize", normalize],
    ["block", block],
    ["strip_references", strip_references],
    ["inline", inline],
    ["linkify", linkify$1],
    ["replacements", replace],
    ["smartquotes", smartquotes],
    ["text_join", text_join]
  ], ParserCore = class {
    constructor() {
      _defineProperty(
        this,
        /**
        * {@link Ruler} instance. Keep configuration of core rules.
        */
        "ruler",
        new Ruler()
      ), _defineProperty(this, "State", StateCore);
      for (let i = 0; i < _rules$2.length; i++) this.ruler.push(_rules$2[i][0], _rules$2[i][1]);
    }
    /**
    * Executes core chain rules.
    */
    process(state) {
      let rules = this.ruler.getRules("");
      for (let i = 0, l = rules.length; i < l; i++) rules[i](state);
    }
  }, StateBlock = class {
    constructor(src, md2, env, tokens) {
      _defineProperty(this, "bMarks", []), _defineProperty(this, "eMarks", []), _defineProperty(this, "tShift", []), _defineProperty(this, "sCount", []), _defineProperty(this, "bsCount", []), _defineProperty(this, "blkIndent", 0), _defineProperty(this, "line", 0), _defineProperty(this, "lineMax", 0), _defineProperty(this, "tight", !1), _defineProperty(this, "listIndent", -1), _defineProperty(this, "parentType", "root"), _defineProperty(this, "level", 0), _defineProperty(this, "Token", Token), this.src = src, this.md = md2, this.env = env, this.tokens = tokens;
      let s = this.src;
      for (let start = 0, pos = 0, indent = 0, offset = 0, len = s.length, indent_found = !1; pos < len; pos++) {
        let ch = s.charCodeAt(pos);
        if (!indent_found) if (isSpace(ch)) {
          indent++, ch === 9 ? offset += 4 - offset % 4 : offset++;
          continue;
        } else indent_found = !0;
        (ch === 10 || pos === len - 1) && (ch !== 10 && pos++, this.bMarks.push(start), this.eMarks.push(pos), this.tShift.push(indent), this.sCount.push(offset), this.bsCount.push(0), indent_found = !1, indent = 0, offset = 0, start = pos + 1);
      }
      this.bMarks.push(s.length), this.eMarks.push(s.length), this.tShift.push(0), this.sCount.push(0), this.bsCount.push(0), this.lineMax = this.bMarks.length - 1;
    }
    push(type, tag, nesting) {
      let token = new Token(type, tag, nesting);
      return token.block = !0, nesting < 0 && this.level--, token.level = this.level, nesting > 0 && this.level++, this.tokens.push(token), token;
    }
    isEmpty(line) {
      return this.bMarks[line] + this.tShift[line] >= this.eMarks[line];
    }
    skipEmptyLines(from) {
      for (let max = this.lineMax; from < max && !(this.bMarks[from] + this.tShift[from] < this.eMarks[from]); from++) ;
      return from;
    }
    skipSpaces(pos) {
      for (let max = this.src.length; pos < max && isSpace(this.src.charCodeAt(pos)); pos++) ;
      return pos;
    }
    skipSpacesBack(pos, min) {
      if (pos <= min) return pos;
      for (; pos > min; ) if (!isSpace(this.src.charCodeAt(--pos))) return pos + 1;
      return pos;
    }
    skipChars(pos, code2) {
      for (let max = this.src.length; pos < max && this.src.charCodeAt(pos) === code2; pos++) ;
      return pos;
    }
    skipCharsBack(pos, code2, min) {
      if (pos <= min) return pos;
      for (; pos > min; ) if (code2 !== this.src.charCodeAt(--pos)) return pos + 1;
      return pos;
    }
    getLines(begin, end, indent, keepLastLF) {
      if (begin >= end) return "";
      let queue2 = new Array(end - begin);
      for (let i = 0, line = begin; line < end; line++, i++) {
        let lineIndent = 0, lineStart = this.bMarks[line], first = lineStart, last;
        for (line + 1 < end || keepLastLF ? last = this.eMarks[line] + 1 : last = this.eMarks[line]; first < last && lineIndent < indent; ) {
          let ch = this.src.charCodeAt(first);
          if (isSpace(ch)) ch === 9 ? lineIndent += 4 - (lineIndent + this.bsCount[line]) % 4 : lineIndent++;
          else if (first - lineStart < this.tShift[line]) lineIndent++;
          else break;
          first++;
        }
        lineIndent > indent ? queue2[i] = new Array(lineIndent - indent + 1).join(" ") + this.src.slice(first, last) : queue2[i] = this.src.slice(first, last);
      }
      return queue2.join("");
    }
  }, MAX_AUTOCOMPLETED_CELLS = 65536;
  function getLine(state, line) {
    let pos = state.bMarks[line] + state.tShift[line], max = state.eMarks[line];
    return state.src.slice(pos, max);
  }
  function escapedSplit(str) {
    let result = [], max = str.length, pos = 0, ch = str.charCodeAt(pos), isEscaped = !1, lastPos = 0, current = "";
    for (; pos < max; )
      ch === 124 && (isEscaped ? (current += str.substring(lastPos, pos - 1), lastPos = pos) : (result.push(current + str.substring(lastPos, pos)), current = "", lastPos = pos + 1)), isEscaped = ch === 92, pos++, ch = str.charCodeAt(pos);
    return result.push(current + str.substring(lastPos)), result;
  }
  function table(state, startLine, endLine, silent) {
    if (startLine + 2 > endLine) return !1;
    let nextLine = startLine + 1;
    if (state.sCount[nextLine] < state.blkIndent || state.sCount[nextLine] - state.blkIndent >= 4) return !1;
    let pos = state.bMarks[nextLine] + state.tShift[nextLine];
    if (pos >= state.eMarks[nextLine]) return !1;
    let firstCh = state.src.charCodeAt(pos++);
    if (firstCh !== 124 && firstCh !== 45 && firstCh !== 58 || pos >= state.eMarks[nextLine]) return !1;
    let secondCh = state.src.charCodeAt(pos++);
    if (secondCh !== 124 && secondCh !== 45 && secondCh !== 58 && !isSpace(secondCh) || firstCh === 45 && isSpace(secondCh)) return !1;
    for (; pos < state.eMarks[nextLine]; ) {
      let ch = state.src.charCodeAt(pos);
      if (ch !== 124 && ch !== 45 && ch !== 58 && !isSpace(ch)) return !1;
      pos++;
    }
    let lineText = getLine(state, startLine + 1), columns = lineText.split("|"), aligns = [];
    for (let i = 0; i < columns.length; i++) {
      let t = columns[i].trim();
      if (!t) {
        if (i === 0 || i === columns.length - 1) continue;
        return !1;
      }
      if (!/^:?-+:?$/.test(t)) return !1;
      t.charCodeAt(t.length - 1) === 58 ? aligns.push(t.charCodeAt(0) === 58 ? "center" : "right") : t.charCodeAt(0) === 58 ? aligns.push("left") : aligns.push("");
    }
    if (lineText = getLine(state, startLine).trim(), lineText.indexOf("|") === -1 || state.sCount[startLine] - state.blkIndent >= 4) return !1;
    columns = escapedSplit(lineText), columns.length && columns[0] === "" && columns.shift(), columns.length && columns[columns.length - 1] === "" && columns.pop();
    let columnCount = columns.length;
    if (columnCount === 0 || columnCount !== aligns.length) return !1;
    if (silent) return !0;
    let oldParentType = state.parentType;
    state.parentType = "table";
    let terminatorRules = state.md.block.ruler.getRules("blockquote"), token_to = state.push("table_open", "table", 1), tableLines = [startLine, 0];
    token_to.map = tableLines;
    let token_tho = state.push("thead_open", "thead", 1);
    token_tho.map = [startLine, startLine + 1];
    let token_htro = state.push("tr_open", "tr", 1);
    token_htro.map = [startLine, startLine + 1];
    for (let i = 0; i < columns.length; i++) {
      let token_ho = state.push("th_open", "th", 1);
      aligns[i] && (token_ho.attrs = [["style", `text-align:${aligns[i]}`]]);
      let token_il = state.push("inline", "", 0);
      token_il.content = columns[i].trim(), token_il.children = [], state.push("th_close", "th", -1);
    }
    state.push("tr_close", "tr", -1), state.push("thead_close", "thead", -1);
    let tbodyLines, autocompletedCells = 0;
    for (nextLine = startLine + 2; nextLine < endLine && !(state.sCount[nextLine] < state.blkIndent); nextLine++) {
      let terminate = !1;
      for (let i = 0, l = terminatorRules.length; i < l; i++) if (terminatorRules[i](state, nextLine, endLine, !0)) {
        terminate = !0;
        break;
      }
      if (terminate || (lineText = getLine(state, nextLine).trim(), !lineText) || state.sCount[nextLine] - state.blkIndent >= 4 || (columns = escapedSplit(lineText), columns.length && columns[0] === "" && columns.shift(), columns.length && columns[columns.length - 1] === "" && columns.pop(), autocompletedCells += columnCount - columns.length, autocompletedCells > MAX_AUTOCOMPLETED_CELLS)) break;
      if (nextLine === startLine + 2) {
        let token_tbo = state.push("tbody_open", "tbody", 1);
        token_tbo.map = tbodyLines = [startLine + 2, 0];
      }
      let token_tro = state.push("tr_open", "tr", 1);
      token_tro.map = [nextLine, nextLine + 1];
      for (let i = 0; i < columnCount; i++) {
        let token_tdo = state.push("td_open", "td", 1);
        aligns[i] && (token_tdo.attrs = [["style", `text-align:${aligns[i]}`]]);
        let token_il = state.push("inline", "", 0);
        token_il.content = columns[i] ? columns[i].trim() : "", token_il.children = [], state.push("td_close", "td", -1);
      }
      state.push("tr_close", "tr", -1);
    }
    return tbodyLines && (state.push("tbody_close", "tbody", -1), tbodyLines[1] = nextLine), state.push("table_close", "table", -1), tableLines[1] = nextLine, state.parentType = oldParentType, state.line = nextLine, !0;
  }
  function code(state, startLine, endLine) {
    if (state.sCount[startLine] - state.blkIndent < 4) return !1;
    let nextLine = startLine + 1, last = nextLine;
    for (; nextLine < endLine; ) {
      if (state.isEmpty(nextLine)) {
        nextLine++;
        continue;
      }
      if (state.sCount[nextLine] - state.blkIndent >= 4) {
        nextLine++, last = nextLine;
        continue;
      }
      break;
    }
    state.line = last;
    let token = state.push("code_block", "code", 0);
    return token.content = state.getLines(startLine, last, 4 + state.blkIndent, !1) + `
`, token.map = [startLine, state.line], !0;
  }
  function fence(state, startLine, endLine, silent) {
    let pos = state.bMarks[startLine] + state.tShift[startLine], max = state.eMarks[startLine];
    if (state.sCount[startLine] - state.blkIndent >= 4 || pos + 3 > max) return !1;
    let marker = state.src.charCodeAt(pos);
    if (marker !== 126 && marker !== 96) return !1;
    let mem = pos;
    pos = state.skipChars(pos, marker);
    let len = pos - mem;
    if (len < 3) return !1;
    let markup = state.src.slice(mem, pos), params = state.src.slice(pos, max);
    if (marker === 96 && params.indexOf(String.fromCharCode(marker)) >= 0)
      return !1;
    if (silent) return !0;
    let nextLine = startLine, haveEndMarker = !1;
    for (; nextLine++, !(nextLine >= endLine || (pos = mem = state.bMarks[nextLine] + state.tShift[nextLine], max = state.eMarks[nextLine], pos < max && state.sCount[nextLine] < state.blkIndent)); )
      if (state.src.charCodeAt(pos) === marker && !(state.sCount[nextLine] - state.blkIndent >= 4) && (pos = state.skipChars(pos, marker), !(pos - mem < len) && (pos = state.skipSpaces(pos), !(pos < max)))) {
        haveEndMarker = !0;
        break;
      }
    len = state.sCount[startLine], state.line = nextLine + (haveEndMarker ? 1 : 0);
    let token = state.push("fence", "code", 0);
    return token.info = params, token.content = state.getLines(startLine + 1, nextLine, len, !0), token.markup = markup, token.map = [startLine, state.line], !0;
  }
  function blockquote(state, startLine, endLine, silent) {
    let pos = state.bMarks[startLine] + state.tShift[startLine], max = state.eMarks[startLine], oldLineMax = state.lineMax;
    if (state.sCount[startLine] - state.blkIndent >= 4 || state.src.charCodeAt(pos) !== 62) return !1;
    if (silent) return !0;
    let oldBMarks = [], oldBSCount = [], oldSCount = [], oldTShift = [], terminatorRules = state.md.block.ruler.getRules("blockquote"), oldParentType = state.parentType;
    state.parentType = "blockquote";
    let lastLineEmpty = !1, nextLine;
    for (nextLine = startLine; nextLine < endLine; nextLine++) {
      let isOutdented = state.sCount[nextLine] < state.blkIndent;
      if (pos = state.bMarks[nextLine] + state.tShift[nextLine], max = state.eMarks[nextLine], pos >= max) break;
      if (state.src.charCodeAt(pos++) === 62 && !isOutdented) {
        let initial = state.sCount[nextLine] + 1, spaceAfterMarker, adjustTab;
        state.src.charCodeAt(pos) === 32 ? (pos++, initial++, adjustTab = !1, spaceAfterMarker = !0) : state.src.charCodeAt(pos) === 9 ? (spaceAfterMarker = !0, (state.bsCount[nextLine] + initial) % 4 === 3 ? (pos++, initial++, adjustTab = !1) : adjustTab = !0) : spaceAfterMarker = !1;
        let offset = initial;
        for (oldBMarks.push(state.bMarks[nextLine]), state.bMarks[nextLine] = pos; pos < max; ) {
          let ch = state.src.charCodeAt(pos);
          if (isSpace(ch)) ch === 9 ? offset += 4 - (offset + state.bsCount[nextLine] + (adjustTab ? 1 : 0)) % 4 : offset++;
          else break;
          pos++;
        }
        lastLineEmpty = pos >= max, oldBSCount.push(state.bsCount[nextLine]), state.bsCount[nextLine] = state.sCount[nextLine] + 1 + (spaceAfterMarker ? 1 : 0), oldSCount.push(state.sCount[nextLine]), state.sCount[nextLine] = offset - initial, oldTShift.push(state.tShift[nextLine]), state.tShift[nextLine] = pos - state.bMarks[nextLine];
        continue;
      }
      if (lastLineEmpty) break;
      let terminate = !1;
      for (let i = 0, l = terminatorRules.length; i < l; i++) if (terminatorRules[i](state, nextLine, endLine, !0)) {
        terminate = !0;
        break;
      }
      if (terminate) {
        state.lineMax = nextLine, state.blkIndent !== 0 && (oldBMarks.push(state.bMarks[nextLine]), oldBSCount.push(state.bsCount[nextLine]), oldTShift.push(state.tShift[nextLine]), oldSCount.push(state.sCount[nextLine]), state.sCount[nextLine] -= state.blkIndent);
        break;
      }
      oldBMarks.push(state.bMarks[nextLine]), oldBSCount.push(state.bsCount[nextLine]), oldTShift.push(state.tShift[nextLine]), oldSCount.push(state.sCount[nextLine]), state.sCount[nextLine] = -1;
    }
    let oldIndent = state.blkIndent;
    state.blkIndent = 0;
    let token_o = state.push("blockquote_open", "blockquote", 1);
    token_o.markup = ">";
    let lines = [startLine, 0];
    token_o.map = lines, state.md.block.tokenize(state, startLine, nextLine);
    let token_c = state.push("blockquote_close", "blockquote", -1);
    token_c.markup = ">", state.lineMax = oldLineMax, state.parentType = oldParentType, lines[1] = state.line;
    for (let i = 0; i < oldTShift.length; i++)
      state.bMarks[i + startLine] = oldBMarks[i], state.tShift[i + startLine] = oldTShift[i], state.sCount[i + startLine] = oldSCount[i], state.bsCount[i + startLine] = oldBSCount[i];
    return state.blkIndent = oldIndent, !0;
  }
  function hr(state, startLine, endLine, silent) {
    let max = state.eMarks[startLine];
    if (state.sCount[startLine] - state.blkIndent >= 4) return !1;
    let pos = state.bMarks[startLine] + state.tShift[startLine], marker = state.src.charCodeAt(pos++);
    if (marker !== 42 && marker !== 45 && marker !== 95) return !1;
    let cnt = 1;
    for (; pos < max; ) {
      let ch = state.src.charCodeAt(pos++);
      if (ch !== marker && !isSpace(ch)) return !1;
      ch === marker && cnt++;
    }
    if (cnt < 3) return !1;
    if (silent) return !0;
    state.line = startLine + 1;
    let token = state.push("hr", "hr", 0);
    return token.map = [startLine, state.line], token.markup = Array(cnt + 1).join(String.fromCharCode(marker)), !0;
  }
  function skipBulletListMarker(state, startLine) {
    let max = state.eMarks[startLine], pos = state.bMarks[startLine] + state.tShift[startLine], marker = state.src.charCodeAt(pos++);
    return marker !== 42 && marker !== 45 && marker !== 43 || pos < max && !isSpace(state.src.charCodeAt(pos)) ? -1 : pos;
  }
  function skipOrderedListMarker(state, startLine) {
    let start = state.bMarks[startLine] + state.tShift[startLine], max = state.eMarks[startLine], pos = start;
    if (pos + 1 >= max) return -1;
    let ch = state.src.charCodeAt(pos++);
    if (ch < 48 || ch > 57) return -1;
    for (; ; ) {
      if (pos >= max) return -1;
      if (ch = state.src.charCodeAt(pos++), ch >= 48 && ch <= 57) {
        if (pos - start >= 10) return -1;
        continue;
      }
      if (ch === 41 || ch === 46) break;
      return -1;
    }
    return pos < max && (ch = state.src.charCodeAt(pos), !isSpace(ch)) ? -1 : pos;
  }
  function markTightParagraphs(state, idx) {
    let level = state.level + 2;
    for (let i = idx + 2, l = state.tokens.length - 2; i < l; i++) state.tokens[i].level === level && state.tokens[i].type === "paragraph_open" && (state.tokens[i + 2].hidden = !0, state.tokens[i].hidden = !0, i += 2);
  }
  function list(state, startLine, endLine, silent) {
    let max, pos, start, token, nextLine = startLine, tight = !0;
    if (state.sCount[nextLine] - state.blkIndent >= 4 || state.listIndent >= 0 && state.sCount[nextLine] - state.listIndent >= 4 && state.sCount[nextLine] < state.blkIndent) return !1;
    let isTerminatingParagraph = !1;
    silent && state.parentType === "paragraph" && state.sCount[nextLine] >= state.blkIndent && (isTerminatingParagraph = !0);
    let isOrdered, markerValue, posAfterMarker;
    if ((posAfterMarker = skipOrderedListMarker(state, nextLine)) >= 0) {
      if (isOrdered = !0, start = state.bMarks[nextLine] + state.tShift[nextLine], markerValue = Number(state.src.slice(start, posAfterMarker - 1)), isTerminatingParagraph && markerValue !== 1) return !1;
    } else if ((posAfterMarker = skipBulletListMarker(state, nextLine)) >= 0) isOrdered = !1;
    else return !1;
    if (isTerminatingParagraph && state.skipSpaces(posAfterMarker) >= state.eMarks[nextLine])
      return !1;
    if (silent) return !0;
    let markerCharCode = state.src.charCodeAt(posAfterMarker - 1), listTokIdx = state.tokens.length;
    isOrdered ? (token = state.push("ordered_list_open", "ol", 1), markerValue !== 1 && (token.attrs = [["start", markerValue]])) : token = state.push("bullet_list_open", "ul", 1);
    let listLines = [nextLine, 0];
    token.map = listLines, token.markup = String.fromCharCode(markerCharCode);
    let prevEmptyEnd = !1, terminatorRules = state.md.block.ruler.getRules("list"), oldParentType = state.parentType;
    for (state.parentType = "list"; nextLine < endLine; ) {
      pos = posAfterMarker, max = state.eMarks[nextLine];
      let initial = state.sCount[nextLine] + posAfterMarker - (state.bMarks[nextLine] + state.tShift[nextLine]), offset = initial;
      for (; pos < max; ) {
        let ch = state.src.charCodeAt(pos);
        if (ch === 9) offset += 4 - (offset + state.bsCount[nextLine]) % 4;
        else if (ch === 32) offset++;
        else break;
        pos++;
      }
      let contentStart = pos, indentAfterMarker;
      contentStart >= max ? indentAfterMarker = 1 : indentAfterMarker = offset - initial, indentAfterMarker > 4 && (indentAfterMarker = 1);
      let indent = initial + indentAfterMarker;
      token = state.push("list_item_open", "li", 1), token.markup = String.fromCharCode(markerCharCode);
      let itemLines = [nextLine, 0];
      token.map = itemLines, isOrdered && (token.info = state.src.slice(start, posAfterMarker - 1));
      let oldTight = state.tight, oldTShift = state.tShift[nextLine], oldSCount = state.sCount[nextLine], oldListIndent = state.listIndent;
      if (state.listIndent = state.blkIndent, state.blkIndent = indent, state.tight = !0, state.tShift[nextLine] = contentStart - state.bMarks[nextLine], state.sCount[nextLine] = offset, contentStart >= max && state.isEmpty(nextLine + 1) ? state.line = Math.min(state.line + 2, endLine) : state.md.block.tokenize(state, nextLine, endLine), (!state.tight || prevEmptyEnd) && (tight = !1), prevEmptyEnd = state.line - nextLine > 1 && state.isEmpty(state.line - 1), state.blkIndent = state.listIndent, state.listIndent = oldListIndent, state.tShift[nextLine] = oldTShift, state.sCount[nextLine] = oldSCount, state.tight = oldTight, token = state.push("list_item_close", "li", -1), token.markup = String.fromCharCode(markerCharCode), nextLine = state.line, itemLines[1] = nextLine, nextLine >= endLine || state.sCount[nextLine] < state.blkIndent || state.sCount[nextLine] - state.blkIndent >= 4) break;
      let terminate = !1;
      for (let i = 0, l = terminatorRules.length; i < l; i++) if (terminatorRules[i](state, nextLine, endLine, !0)) {
        terminate = !0;
        break;
      }
      if (terminate) break;
      if (isOrdered) {
        if (posAfterMarker = skipOrderedListMarker(state, nextLine), posAfterMarker < 0) break;
        start = state.bMarks[nextLine] + state.tShift[nextLine];
      } else if (posAfterMarker = skipBulletListMarker(state, nextLine), posAfterMarker < 0) break;
      if (markerCharCode !== state.src.charCodeAt(posAfterMarker - 1)) break;
    }
    return isOrdered ? token = state.push("ordered_list_close", "ol", -1) : token = state.push("bullet_list_close", "ul", -1), token.markup = String.fromCharCode(markerCharCode), listLines[1] = nextLine, state.line = nextLine, state.parentType = oldParentType, tight && markTightParagraphs(state, listTokIdx), !0;
  }
  function reference(state, startLine, _endLine, silent) {
    let pos = state.bMarks[startLine] + state.tShift[startLine], max = state.eMarks[startLine], nextLine = startLine + 1;
    if (state.sCount[startLine] - state.blkIndent >= 4 || state.src.charCodeAt(pos) !== 91) return !1;
    function getNextLine(nextLine2) {
      let endLine = state.lineMax;
      if (nextLine2 >= endLine || state.isEmpty(nextLine2)) return null;
      let isContinuation = !1;
      if (state.sCount[nextLine2] - state.blkIndent > 3 && (isContinuation = !0), state.sCount[nextLine2] < 0 && (isContinuation = !0), !isContinuation) {
        let terminatorRules = state.md.block.ruler.getRules("reference"), oldParentType = state.parentType;
        state.parentType = "reference";
        let terminate = !1;
        for (let i = 0, l = terminatorRules.length; i < l; i++) if (terminatorRules[i](state, nextLine2, endLine, !0)) {
          terminate = !0;
          break;
        }
        if (state.parentType = oldParentType, terminate) return null;
      }
      let pos2 = state.bMarks[nextLine2] + state.tShift[nextLine2], max2 = state.eMarks[nextLine2];
      return state.src.slice(pos2, max2 + 1);
    }
    let str = state.src.slice(pos, max + 1);
    max = str.length;
    let labelEnd = -1;
    for (pos = 1; pos < max; pos++) {
      let ch = str.charCodeAt(pos);
      if (ch === 91) return !1;
      if (ch === 93) {
        labelEnd = pos;
        break;
      } else if (ch === 10) {
        let lineContent = getNextLine(nextLine);
        lineContent !== null && (str += lineContent, max = str.length, nextLine++);
      } else if (ch === 92 && (pos++, pos < max && str.charCodeAt(pos) === 10)) {
        let lineContent = getNextLine(nextLine);
        lineContent !== null && (str += lineContent, max = str.length, nextLine++);
      }
    }
    if (labelEnd < 0 || str.charCodeAt(labelEnd + 1) !== 58) return !1;
    for (pos = labelEnd + 2; pos < max; pos++) {
      let ch = str.charCodeAt(pos);
      if (ch === 10) {
        let lineContent = getNextLine(nextLine);
        lineContent !== null && (str += lineContent, max = str.length, nextLine++);
      } else if (!isSpace(ch))
        break;
    }
    let destRes = state.md.helpers.parseLinkDestination(str, pos, max);
    if (!destRes.ok) return !1;
    let href = state.md.normalizeLink(destRes.str);
    if (!state.md.validateLink(href)) return !1;
    pos = destRes.pos;
    let destEndPos = pos, destEndLineNo = nextLine, start = pos;
    for (; pos < max; pos++) {
      let ch = str.charCodeAt(pos);
      if (ch === 10) {
        let lineContent = getNextLine(nextLine);
        lineContent !== null && (str += lineContent, max = str.length, nextLine++);
      } else if (!isSpace(ch))
        break;
    }
    let titleRes = state.md.helpers.parseLinkTitle(str, pos, max);
    for (; titleRes.can_continue; ) {
      let lineContent = getNextLine(nextLine);
      if (lineContent === null) break;
      str += lineContent, pos = max, max = str.length, nextLine++, titleRes = state.md.helpers.parseLinkTitle(str, pos, max, titleRes);
    }
    let title;
    for (pos < max && start !== pos && titleRes.ok ? (title = titleRes.str, pos = titleRes.pos) : (title = "", pos = destEndPos, nextLine = destEndLineNo); pos < max && isSpace(str.charCodeAt(pos)); )
      pos++;
    if (pos < max && str.charCodeAt(pos) !== 10 && title)
      for (title = "", pos = destEndPos, nextLine = destEndLineNo; pos < max && isSpace(str.charCodeAt(pos)); )
        pos++;
    if (pos < max && str.charCodeAt(pos) !== 10) return !1;
    let label = normalizeReference(str.slice(1, labelEnd));
    if (!label) return !1;
    if (silent) return !0;
    typeof state.env.references > "u" && (state.env.references = {}), typeof state.env.references[label] > "u" && (state.env.references[label] = {
      title,
      href
    });
    let token = state.push("reference_definition", "", 0);
    token.map = [startLine, nextLine], token.hidden = !0;
    let meta = /* @__PURE__ */ Object.create(null);
    return meta.label = label, token.meta = meta, state.line = nextLine, !0;
  }
  var html_blocks_default = [
    "address",
    "article",
    "aside",
    "base",
    "basefont",
    "blockquote",
    "body",
    "caption",
    "center",
    "col",
    "colgroup",
    "dd",
    "details",
    "dialog",
    "dir",
    "div",
    "dl",
    "dt",
    "fieldset",
    "figcaption",
    "figure",
    "footer",
    "form",
    "frame",
    "frameset",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "head",
    "header",
    "hr",
    "html",
    "iframe",
    "legend",
    "li",
    "link",
    "main",
    "menu",
    "menuitem",
    "nav",
    "noframes",
    "ol",
    "optgroup",
    "option",
    "p",
    "param",
    "search",
    "section",
    "summary",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "title",
    "tr",
    "track",
    "ul"
  ], open_tag = `<[A-Za-z][A-Za-z0-9\\-]*(?:\\s+[a-zA-Z_:][a-zA-Z0-9:._-]*(?:\\s*=\\s*(?:[^"'=<>\`\\x00-\\x20]+|'[^']*'|"[^"]*"))?)*\\s*\\/?>`, close_tag = "<\\/[A-Za-z][A-Za-z0-9\\-]*\\s*>", HTML_TAG_RE = new RegExp(`^(?:${open_tag}|${close_tag}|<!---?>|<!--(?:[^-]|-[^-]|--[^>])*-->|<[?][\\s\\S]*?[?]>|<![A-Za-z][^>]*>|<!\\[CDATA\\[[\\s\\S]*?\\]\\]>)`), HTML_OPEN_CLOSE_TAG_RE = new RegExp(`^(?:${open_tag}|${close_tag})`), HTML_SEQUENCES = [
    [
      /^<(script|pre|style|textarea)(?=(\s|>|$))/i,
      /<\/(script|pre|style|textarea)>/i,
      !0
    ],
    [
      /^<!--/,
      /-->/,
      !0
    ],
    [
      /^<\?/,
      /\?>/,
      !0
    ],
    [
      /^<![A-Za-z]/,
      />/,
      !0
    ],
    [
      /^<!\[CDATA\[/,
      /\]\]>/,
      !0
    ],
    [
      new RegExp(`^</?(${html_blocks_default.join("|")})(?=(\\s|/?>|$))`, "i"),
      /^$/,
      !0
    ],
    [
      new RegExp(`${HTML_OPEN_CLOSE_TAG_RE.source}\\s*$`),
      /^$/,
      !1
    ]
  ];
  function html_block(state, startLine, endLine, silent) {
    let pos = state.bMarks[startLine] + state.tShift[startLine], max = state.eMarks[startLine];
    if (state.sCount[startLine] - state.blkIndent >= 4 || !state.md.options.html || state.src.charCodeAt(pos) !== 60) return !1;
    let lineText = state.src.slice(pos, max), i = 0;
    for (; i < HTML_SEQUENCES.length && !HTML_SEQUENCES[i][0].test(lineText); i++) ;
    if (i === HTML_SEQUENCES.length) return !1;
    if (silent) return HTML_SEQUENCES[i][2];
    let nextLine = startLine + 1, endsOnBlankLine = HTML_SEQUENCES[i][1].test("");
    if (!HTML_SEQUENCES[i][1].test(lineText)) {
      for (; nextLine < endLine && !(state.sCount[nextLine] < state.blkIndent && (endsOnBlankLine || !state.isEmpty(nextLine))); nextLine++)
        if (pos = state.bMarks[nextLine] + state.tShift[nextLine], max = state.eMarks[nextLine], lineText = state.src.slice(pos, max), HTML_SEQUENCES[i][1].test(lineText)) {
          lineText.length !== 0 && nextLine++;
          break;
        }
    }
    state.line = nextLine;
    let token = state.push("html_block", "", 0);
    return token.map = [startLine, nextLine], token.content = state.getLines(startLine, nextLine, state.blkIndent, !0), !0;
  }
  function heading(state, startLine, endLine, silent) {
    let pos = state.bMarks[startLine] + state.tShift[startLine], max = state.eMarks[startLine];
    if (state.sCount[startLine] - state.blkIndent >= 4) return !1;
    let ch = state.src.charCodeAt(pos);
    if (ch !== 35 || pos >= max) return !1;
    let level = 1;
    for (ch = state.src.charCodeAt(++pos); ch === 35 && pos < max && level <= 6; )
      level++, ch = state.src.charCodeAt(++pos);
    if (level > 6 || pos < max && !isSpace(ch)) return !1;
    if (silent) return !0;
    max = state.skipSpacesBack(max, pos);
    let tmp = state.skipCharsBack(max, 35, pos);
    tmp > pos && isSpace(state.src.charCodeAt(tmp - 1)) && (max = tmp), state.line = startLine + 1;
    let token_o = state.push("heading_open", `h${level}`, 1);
    token_o.markup = "########".slice(0, level), token_o.map = [startLine, state.line];
    let token_i = state.push("inline", "", 0);
    token_i.content = asciiTrim(state.src.slice(pos, max)), token_i.map = [startLine, state.line], token_i.children = [];
    let token_c = state.push("heading_close", `h${level}`, -1);
    return token_c.markup = "########".slice(0, level), !0;
  }
  function lheading(state, startLine, endLine) {
    let terminatorRules = state.md.block.ruler.getRules("paragraph");
    if (state.sCount[startLine] - state.blkIndent >= 4) return !1;
    let oldParentType = state.parentType;
    state.parentType = "paragraph";
    let level = 0, marker, nextLine = startLine + 1;
    for (; nextLine < endLine && !state.isEmpty(nextLine); nextLine++) {
      if (state.sCount[nextLine] - state.blkIndent > 3) continue;
      if (state.sCount[nextLine] >= state.blkIndent) {
        let pos = state.bMarks[nextLine] + state.tShift[nextLine], max = state.eMarks[nextLine];
        if (pos < max && (marker = state.src.charCodeAt(pos), (marker === 45 || marker === 61) && (pos = state.skipChars(pos, marker), pos = state.skipSpaces(pos), pos >= max))) {
          level = marker === 61 ? 1 : 2;
          break;
        }
      }
      if (state.sCount[nextLine] < 0) continue;
      let terminate = !1;
      for (let i = 0, l = terminatorRules.length; i < l; i++) if (terminatorRules[i](state, nextLine, endLine, !0)) {
        terminate = !0;
        break;
      }
      if (terminate) break;
    }
    if (!level)
      return state.parentType = oldParentType, !1;
    let content = asciiTrim(state.getLines(startLine, nextLine, state.blkIndent, !1));
    state.line = nextLine + 1;
    let token_o = state.push("heading_open", `h${level}`, 1);
    token_o.markup = String.fromCharCode(marker), token_o.map = [startLine, state.line];
    let token_i = state.push("inline", "", 0);
    token_i.content = content, token_i.map = [startLine, state.line - 1], token_i.children = [];
    let token_c = state.push("heading_close", `h${level}`, -1);
    return token_c.markup = String.fromCharCode(marker), state.parentType = oldParentType, !0;
  }
  function paragraph(state, startLine, endLine) {
    let terminatorRules = state.md.block.ruler.getRules("paragraph"), oldParentType = state.parentType, nextLine = startLine + 1;
    for (state.parentType = "paragraph"; nextLine < endLine && !state.isEmpty(nextLine); nextLine++) {
      if (state.sCount[nextLine] - state.blkIndent > 3 || state.sCount[nextLine] < 0) continue;
      let terminate = !1;
      for (let i = 0, l = terminatorRules.length; i < l; i++) if (terminatorRules[i](state, nextLine, endLine, !0)) {
        terminate = !0;
        break;
      }
      if (terminate) break;
    }
    let content = asciiTrim(state.getLines(startLine, nextLine, state.blkIndent, !1));
    state.line = nextLine;
    let token_o = state.push("paragraph_open", "p", 1);
    token_o.map = [startLine, state.line];
    let token_i = state.push("inline", "", 0);
    return token_i.content = content, token_i.map = [startLine, state.line], token_i.children = [], state.push("paragraph_close", "p", -1), state.parentType = oldParentType, !0;
  }
  var _rules$1 = [
    [
      "table",
      table,
      ["paragraph", "reference"]
    ],
    ["code", code],
    [
      "fence",
      fence,
      [
        "paragraph",
        "reference",
        "blockquote",
        "list"
      ]
    ],
    [
      "blockquote",
      blockquote,
      [
        "paragraph",
        "reference",
        "blockquote",
        "list"
      ]
    ],
    [
      "hr",
      hr,
      [
        "paragraph",
        "reference",
        "blockquote",
        "list"
      ]
    ],
    [
      "list",
      list,
      [
        "paragraph",
        "reference",
        "blockquote"
      ]
    ],
    ["reference", reference],
    [
      "html_block",
      html_block,
      [
        "paragraph",
        "reference",
        "blockquote"
      ]
    ],
    [
      "heading",
      heading,
      [
        "paragraph",
        "reference",
        "blockquote"
      ]
    ],
    ["lheading", lheading],
    ["paragraph", paragraph]
  ], ParserBlock = class {
    constructor() {
      _defineProperty(
        this,
        /**
        * {@link Ruler} instance. Keep configuration of block rules.
        */
        "ruler",
        new Ruler()
      ), _defineProperty(this, "State", StateBlock);
      for (let i = 0; i < _rules$1.length; i++) this.ruler.push(_rules$1[i][0], _rules$1[i][1], { alt: (_rules$1[i][2] || []).slice() });
    }
    tokenize(state, startLine, endLine) {
      let rules = this.ruler.getRules(""), len = rules.length, maxNesting = state.md.options.maxNesting, line = startLine, hasEmptyLines = !1;
      for (; line < endLine && (state.line = line = state.skipEmptyLines(line), !(line >= endLine || state.sCount[line] < state.blkIndent)); ) {
        if (state.level >= maxNesting) {
          state.line = endLine;
          break;
        }
        let prevLine = state.line, ok = !1;
        for (let i = 0; i < len; i++)
          if (ok = rules[i](state, line, endLine, !1), ok) {
            if (prevLine >= state.line) throw new Error("block rule didn't increment state.line");
            break;
          }
        if (!ok) throw new Error("none of the block rules matched");
        state.tight = !hasEmptyLines, state.isEmpty(state.line - 1) && (hasEmptyLines = !0), line = state.line, line < endLine && state.isEmpty(line) && (hasEmptyLines = !0, line++, state.line = line);
      }
    }
    /**
    * Process input string and push block tokens into `outTokens`
    */
    parse(src, md2, env, outTokens) {
      if (!src) return;
      let state = new this.State(src, md2, env, outTokens);
      this.tokenize(state, state.line, state.lineMax);
    }
  }, StateInline = class {
    constructor(src, md2, env, outTokens) {
      _defineProperty(this, "pos", 0), _defineProperty(this, "level", 0), _defineProperty(this, "pending", ""), _defineProperty(this, "pendingLevel", 0), _defineProperty(this, "cache", {}), _defineProperty(this, "backticks", {}), _defineProperty(this, "backticksScanned", !1), _defineProperty(this, "linkLevel", 0), _defineProperty(this, "delimiters", []), _defineProperty(this, "_prev_delimiters", []), _defineProperty(this, "Token", Token), this.src = src, this.env = env, this.md = md2, this.tokens = outTokens, this.tokens_meta = Array(outTokens.length), this.posMax = this.src.length;
    }
    pushPending() {
      let token = new Token("text", "", 0);
      return token.content = this.pending, token.level = this.pendingLevel, this.tokens.push(token), this.pending = "", token;
    }
    push(type, tag, nesting) {
      this.pending && this.pushPending();
      let token = new Token(type, tag, nesting), token_meta;
      return nesting < 0 && (this.level--, this.delimiters = this._prev_delimiters.pop()), token.level = this.level, nesting > 0 && (this.level++, this._prev_delimiters.push(this.delimiters), this.delimiters = [], token_meta = { delimiters: this.delimiters }), this.pendingLevel = this.level, this.tokens.push(token), this.tokens_meta.push(token_meta), token;
    }
    scanDelims(start, canSplitWord) {
      let max = this.posMax, marker = this.src.charCodeAt(start), lastChar;
      if (start === 0) lastChar = 32;
      else if (start === 1)
        lastChar = this.src.charCodeAt(0), (lastChar & 63488) === 55296 && (lastChar = 65533);
      else if (lastChar = this.src.charCodeAt(start - 1), (lastChar & 64512) === 56320) {
        let highSurr = this.src.charCodeAt(start - 2);
        lastChar = (highSurr & 64512) === 55296 ? 65536 + (highSurr - 55296 << 10) + (lastChar - 56320) : 65533;
      } else (lastChar & 64512) === 55296 && (lastChar = 65533);
      let pos = start;
      for (; pos < max && this.src.charCodeAt(pos) === marker; ) pos++;
      let count = pos - start, nextChar = pos < max ? this.src.charCodeAt(pos) : 32;
      if ((nextChar & 64512) === 55296) {
        let lowSurr = this.src.charCodeAt(pos + 1);
        nextChar = (lowSurr & 64512) === 56320 ? 65536 + (nextChar - 55296 << 10) + (lowSurr - 56320) : 65533;
      } else (nextChar & 64512) === 56320 && (nextChar = 65533);
      let isLastPunctChar = isMdAsciiPunct(lastChar) || isPunctCharCode(lastChar), isNextPunctChar = isMdAsciiPunct(nextChar) || isPunctCharCode(nextChar), isLastWhiteSpace = isWhiteSpace(lastChar), isNextWhiteSpace = isWhiteSpace(nextChar), left_flanking = !isNextWhiteSpace && (!isNextPunctChar || isLastWhiteSpace || isLastPunctChar), right_flanking = !isLastWhiteSpace && (!isLastPunctChar || isNextWhiteSpace || isNextPunctChar);
      return {
        can_open: left_flanking && (canSplitWord || !right_flanking || isLastPunctChar),
        can_close: right_flanking && (canSplitWord || !left_flanking || isNextPunctChar),
        length: count
      };
    }
  };
  function isTerminatorChar(ch) {
    switch (ch) {
      case 10:
      case 33:
      case 35:
      case 36:
      case 37:
      case 38:
      case 42:
      case 43:
      case 45:
      case 58:
      case 60:
      case 61:
      case 62:
      case 64:
      case 91:
      case 92:
      case 93:
      case 94:
      case 95:
      case 96:
      case 123:
      case 125:
      case 126:
        return !0;
      default:
        return !1;
    }
  }
  function text(state, silent) {
    let pos = state.pos;
    for (; pos < state.posMax && !isTerminatorChar(state.src.charCodeAt(pos)); ) pos++;
    return pos === state.pos ? !1 : (silent || (state.pending += state.src.slice(state.pos, pos)), state.pos = pos, !0);
  }
  function isAsciiAlpha(code2) {
    return code2 >= 65 && code2 <= 90 || code2 >= 97 && code2 <= 122;
  }
  function isSchemeChar(code2) {
    return code2 >= 65 && code2 <= 90 || code2 >= 97 && code2 <= 122 || code2 >= 48 && code2 <= 57 || code2 === 43 || code2 === 45 || code2 === 46;
  }
  function linkify(state, silent) {
    if (!state.md.options.linkify || state.linkLevel > 0) return !1;
    let pos = state.pos, max = state.posMax;
    if (pos + 3 > max || state.src.charCodeAt(pos) !== 58 || state.src.charCodeAt(pos + 1) !== 47 || state.src.charCodeAt(pos + 2) !== 47) return !1;
    let protoMin = pos - Math.min(10, state.pending.length, pos), protoStart = pos;
    for (; protoStart > protoMin && isSchemeChar(state.src.charCodeAt(protoStart - 1)); ) protoStart--;
    if (protoStart === pos || !isAsciiAlpha(state.src.charCodeAt(protoStart))) return !1;
    let protoLength = pos - protoStart, link2 = state.md.linkify.matchAtStart(state.src.slice(protoStart));
    if (!link2) return !1;
    let url = link2.url;
    if (url.length <= protoLength) return !1;
    let urlEnd = url.length;
    for (; urlEnd > 0 && url.charCodeAt(urlEnd - 1) === 42; ) urlEnd--;
    urlEnd !== url.length && (url = url.slice(0, urlEnd));
    let fullUrl = state.md.normalizeLink(url);
    if (!state.md.validateLink(fullUrl)) return !1;
    if (!silent) {
      state.pending = state.pending.slice(0, -protoLength);
      let token_o = state.push("link_open", "a", 1);
      token_o.attrs = [["href", fullUrl]], token_o.markup = "linkify", token_o.info = "auto";
      let token_t = state.push("text", "", 0);
      token_t.content = state.md.normalizeLinkText(url);
      let token_c = state.push("link_close", "a", -1);
      token_c.markup = "linkify", token_c.info = "auto";
    }
    return state.pos += url.length - protoLength, !0;
  }
  function newline(state, silent) {
    let pos = state.pos;
    if (state.src.charCodeAt(pos) !== 10) return !1;
    let pmax = state.pending.length - 1, max = state.posMax;
    if (!silent) if (pmax >= 0 && state.pending.charCodeAt(pmax) === 32) if (pmax >= 1 && state.pending.charCodeAt(pmax - 1) === 32) {
      let ws = pmax - 1;
      for (; ws >= 1 && state.pending.charCodeAt(ws - 1) === 32; ) ws--;
      state.pending = state.pending.slice(0, ws), state.push("hardbreak", "br", 0);
    } else
      state.pending = state.pending.slice(0, -1), state.push("softbreak", "br", 0);
    else state.push("softbreak", "br", 0);
    for (pos++; pos < max && isSpace(state.src.charCodeAt(pos)); ) pos++;
    return state.pos = pos, !0;
  }
  var ESCAPED = [];
  for (let i = 0; i < 256; i++) ESCAPED.push(0);
  "\\!\"#$%&'()*+,./:;<=>?@[]^_`{|}~-".split("").forEach(function(ch) {
    ESCAPED[ch.charCodeAt(0)] = 1;
  });
  function escape(state, silent) {
    let pos = state.pos, max = state.posMax;
    if (state.src.charCodeAt(pos) !== 92 || (pos++, pos >= max)) return !1;
    let ch1 = state.src.charCodeAt(pos);
    if (ch1 === 10) {
      for (silent || state.push("hardbreak", "br", 0), pos++; pos < max && (ch1 = state.src.charCodeAt(pos), !!isSpace(ch1)); )
        pos++;
      return state.pos = pos, !0;
    }
    if (ch1 === 32) {
      if (!silent) {
        let token = state.push("text_special", "", 0);
        token.content = "\\", token.markup = "\\", token.info = "escape";
      }
      return state.pos = pos, !0;
    }
    let escapedStr = state.src[pos];
    if (ch1 >= 55296 && ch1 <= 56319 && pos + 1 < max) {
      let ch2 = state.src.charCodeAt(pos + 1);
      ch2 >= 56320 && ch2 <= 57343 && (escapedStr += state.src[pos + 1], pos++);
    }
    let origStr = "\\" + escapedStr;
    if (!silent) {
      let token = state.push("text_special", "", 0);
      ch1 < 256 && ESCAPED[ch1] !== 0 ? token.content = escapedStr : token.content = origStr, token.markup = origStr, token.info = "escape";
    }
    return state.pos = pos + 1, !0;
  }
  function buildLastRuns(src) {
    let lastRuns = {}, pos = 0;
    for (; (pos = src.indexOf("`", pos)) !== -1; ) {
      let start = pos;
      for (; src.charCodeAt(++pos) === 96; ) ;
      lastRuns[pos - start] = start;
    }
    return lastRuns;
  }
  function backtick(state, silent) {
    var _state$backticks$open;
    let start = state.pos;
    if (state.src.charCodeAt(start) !== 96) return !1;
    let max = state.posMax, pos = start + 1;
    for (; pos < max && state.src.charCodeAt(pos) === 96; ) pos++;
    let marker = state.src.slice(start, pos), openerLength = marker.length;
    if (state.backticksScanned || (state.backticks = buildLastRuns(state.src), state.backticksScanned = !0), ((_state$backticks$open = state.backticks[openerLength]) !== null && _state$backticks$open !== void 0 ? _state$backticks$open : -1) >= pos) {
      let matchEnd = pos, matchStart;
      for (; (matchStart = state.src.indexOf("`", matchEnd)) !== -1 && matchStart < max; ) {
        for (matchEnd = matchStart + 1; state.src.charCodeAt(matchEnd) === 96; ) matchEnd++;
        if (matchEnd > max) break;
        if (matchEnd - matchStart === openerLength) {
          if (!silent) {
            let token = state.push("code_inline", "code", 0);
            token.markup = marker;
            let content = state.src.slice(pos, matchStart).replace(/\n/g, " ");
            content.startsWith(" ") && content.endsWith(" ") && /[^ ]/.test(content) && (content = content.slice(1, -1)), token.content = content;
          }
          return state.pos = matchEnd, !0;
        }
      }
    }
    return silent || (state.pending += marker), state.pos = pos, !0;
  }
  function strikethrough_tokenize(state, silent) {
    let start = state.pos, marker = state.src.charCodeAt(start);
    if (silent || marker !== 126) return !1;
    let scanned = state.scanDelims(state.pos, !0), len = scanned.length, ch = String.fromCharCode(marker);
    if (len < 2) return !1;
    let token;
    len % 2 && (token = state.push("text", "", 0), token.content = ch, len--);
    for (let i = 0; i < len; i += 2)
      token = state.push("text", "", 0), token.content = ch + ch, state.delimiters.push({
        marker,
        length: 0,
        token: state.tokens.length - 1,
        end: -1,
        open: scanned.can_open,
        close: scanned.can_close
      });
    return state.pos += scanned.length, !0;
  }
  function postProcess$1(state, delimiters) {
    let token, loneMarkers = [], max = delimiters.length;
    for (let i = 0; i < max; i++) {
      let startDelim = delimiters[i];
      if (startDelim.marker !== 126 || startDelim.end === -1) continue;
      let endDelim = delimiters[startDelim.end];
      token = state.tokens[startDelim.token], token.type = "s_open", token.tag = "s", token.nesting = 1, token.markup = "~~", token.content = "", token = state.tokens[endDelim.token], token.type = "s_close", token.tag = "s", token.nesting = -1, token.markup = "~~", token.content = "", state.tokens[endDelim.token - 1].type === "text" && state.tokens[endDelim.token - 1].content === "~" && loneMarkers.push(endDelim.token - 1);
    }
    for (; loneMarkers.length; ) {
      let i = loneMarkers.pop(), j = i + 1;
      for (; j < state.tokens.length && state.tokens[j].type === "s_close"; ) j++;
      j--, i !== j && (token = state.tokens[j], state.tokens[j] = state.tokens[i], state.tokens[i] = token);
    }
  }
  function strikethrough_postProcess(state) {
    let tokens_meta = state.tokens_meta, max = state.tokens_meta.length;
    postProcess$1(state, state.delimiters);
    for (let curr = 0; curr < max; curr++) {
      var _tokens_meta$curr;
      let delimiters = (_tokens_meta$curr = tokens_meta[curr]) === null || _tokens_meta$curr === void 0 ? void 0 : _tokens_meta$curr.delimiters;
      delimiters && postProcess$1(state, delimiters);
    }
  }
  var strikethrough_default = {
    tokenize: strikethrough_tokenize,
    postProcess: strikethrough_postProcess
  };
  function emphasis_tokenize(state, silent) {
    let start = state.pos, marker = state.src.charCodeAt(start);
    if (silent || marker !== 95 && marker !== 42) return !1;
    let scanned = state.scanDelims(state.pos, marker === 42);
    for (let i = 0; i < scanned.length; i++) {
      let token = state.push("text", "", 0);
      token.content = String.fromCharCode(marker), state.delimiters.push({
        marker,
        length: scanned.length,
        token: state.tokens.length - 1,
        end: -1,
        open: scanned.can_open,
        close: scanned.can_close
      });
    }
    return state.pos += scanned.length, !0;
  }
  function postProcess(state, delimiters) {
    let max = delimiters.length;
    for (let i = max - 1; i >= 0; i--) {
      let startDelim = delimiters[i];
      if (startDelim.marker !== 95 && startDelim.marker !== 42 || startDelim.end === -1) continue;
      let endDelim = delimiters[startDelim.end], isStrong = i > 0 && delimiters[i - 1].end === startDelim.end + 1 && delimiters[i - 1].marker === startDelim.marker && delimiters[i - 1].token === startDelim.token - 1 && delimiters[startDelim.end + 1].token === endDelim.token + 1, ch = String.fromCharCode(startDelim.marker), token_o = state.tokens[startDelim.token];
      token_o.type = isStrong ? "strong_open" : "em_open", token_o.tag = isStrong ? "strong" : "em", token_o.nesting = 1, token_o.markup = isStrong ? ch + ch : ch, token_o.content = "";
      let token_c = state.tokens[endDelim.token];
      token_c.type = isStrong ? "strong_close" : "em_close", token_c.tag = isStrong ? "strong" : "em", token_c.nesting = -1, token_c.markup = isStrong ? ch + ch : ch, token_c.content = "", isStrong && (state.tokens[delimiters[i - 1].token].content = "", state.tokens[delimiters[startDelim.end + 1].token].content = "", i--);
    }
  }
  function emphasis_post_process(state) {
    let tokens_meta = state.tokens_meta, max = state.tokens_meta.length;
    postProcess(state, state.delimiters);
    for (let curr = 0; curr < max; curr++) {
      var _tokens_meta$curr;
      let delimiters = (_tokens_meta$curr = tokens_meta[curr]) === null || _tokens_meta$curr === void 0 ? void 0 : _tokens_meta$curr.delimiters;
      delimiters && postProcess(state, delimiters);
    }
  }
  var emphasis_default = {
    tokenize: emphasis_tokenize,
    postProcess: emphasis_post_process
  };
  function link(state, silent) {
    let code2, label, res, ref, href = "", title = "", start = state.pos, parseReference = !0;
    if (state.src.charCodeAt(state.pos) !== 91) return !1;
    let oldPos = state.pos, max = state.posMax, labelStart = state.pos + 1, labelEnd = state.md.helpers.parseLinkLabel(state, state.pos, !0);
    if (labelEnd < 0) return !1;
    let pos = labelEnd + 1;
    if (pos < max && state.src.charCodeAt(pos) === 40) {
      for (parseReference = !1, pos++; pos < max && (code2 = state.src.charCodeAt(pos), !(!isSpace(code2) && code2 !== 10)); pos++)
        ;
      if (pos >= max) return !1;
      if (start = pos, res = state.md.helpers.parseLinkDestination(state.src, pos, state.posMax), res.ok) {
        for (href = state.md.normalizeLink(res.str), state.md.validateLink(href) ? pos = res.pos : href = "", start = pos; pos < max && (code2 = state.src.charCodeAt(pos), !(!isSpace(code2) && code2 !== 10)); pos++)
          ;
        if (res = state.md.helpers.parseLinkTitle(state.src, pos, state.posMax), pos < max && start !== pos && res.ok)
          for (title = res.str, pos = res.pos; pos < max && (code2 = state.src.charCodeAt(pos), !(!isSpace(code2) && code2 !== 10)); pos++)
            ;
      }
      (pos >= max || state.src.charCodeAt(pos) !== 41) && (parseReference = !0), pos++;
    }
    if (parseReference) {
      if (typeof state.env.references > "u") return !1;
      if (pos < max && state.src.charCodeAt(pos) === 91 ? (start = pos + 1, pos = state.md.helpers.parseLinkLabel(state, pos), pos >= 0 ? label = state.src.slice(start, pos++) : pos = labelEnd + 1) : pos = labelEnd + 1, label || (label = state.src.slice(labelStart, labelEnd)), label = normalizeReference(label), ref = state.env.references[label], !ref)
        return state.pos = oldPos, !1;
      href = ref.href, title = ref.title;
    }
    if (!silent) {
      state.pos = labelStart, state.posMax = labelEnd;
      let token_o = state.push("link_open", "a", 1), attrs = [["href", href]];
      if (token_o.attrs = attrs, title && attrs.push(["title", title]), label) {
        let meta = /* @__PURE__ */ Object.create(null);
        meta.label = label, token_o.meta = meta;
      }
      state.linkLevel++, state.md.inline.tokenize(state), state.linkLevel--, state.push("link_close", "a", -1);
    }
    return state.pos = pos, state.posMax = max, !0;
  }
  function image(state, silent) {
    let code2, content, label, pos, ref, res, title, start, href = "", oldPos = state.pos, max = state.posMax;
    if (state.src.charCodeAt(state.pos) !== 33 || state.src.charCodeAt(state.pos + 1) !== 91) return !1;
    let labelStart = state.pos + 2, labelEnd = state.md.helpers.parseLinkLabel(state, state.pos + 1, !1);
    if (labelEnd < 0) return !1;
    if (pos = labelEnd + 1, pos < max && state.src.charCodeAt(pos) === 40) {
      for (pos++; pos < max && (code2 = state.src.charCodeAt(pos), !(!isSpace(code2) && code2 !== 10)); pos++)
        ;
      if (pos >= max) return !1;
      for (start = pos, res = state.md.helpers.parseLinkDestination(state.src, pos, state.posMax), res.ok && (href = state.md.normalizeLink(res.str), state.md.validateLink(href) ? pos = res.pos : href = ""), start = pos; pos < max && (code2 = state.src.charCodeAt(pos), !(!isSpace(code2) && code2 !== 10)); pos++)
        ;
      if (res = state.md.helpers.parseLinkTitle(state.src, pos, state.posMax), pos < max && start !== pos && res.ok)
        for (title = res.str, pos = res.pos; pos < max && (code2 = state.src.charCodeAt(pos), !(!isSpace(code2) && code2 !== 10)); pos++)
          ;
      else title = "";
      if (pos >= max || state.src.charCodeAt(pos) !== 41)
        return state.pos = oldPos, !1;
      pos++;
    } else {
      if (typeof state.env.references > "u") return !1;
      if (pos < max && state.src.charCodeAt(pos) === 91 ? (start = pos + 1, pos = state.md.helpers.parseLinkLabel(state, pos), pos >= 0 ? label = state.src.slice(start, pos++) : pos = labelEnd + 1) : pos = labelEnd + 1, label || (label = state.src.slice(labelStart, labelEnd)), label = normalizeReference(label), ref = state.env.references[label], !ref)
        return state.pos = oldPos, !1;
      href = ref.href, title = ref.title;
    }
    if (!silent) {
      content = state.src.slice(labelStart, labelEnd);
      let tokens = [];
      state.md.inline.parse(content, state.md, state.env, tokens);
      let token = state.push("image", "img", 0), attrs = [["src", href], ["alt", ""]];
      if (token.attrs = attrs, token.children = tokens, token.content = content, title && attrs.push(["title", title]), label) {
        let meta = /* @__PURE__ */ Object.create(null);
        meta.label = label, token.meta = meta;
      }
    }
    return state.pos = pos, state.posMax = max, !0;
  }
  var EMAIL_RE = /^([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)$/, AUTOLINK_RE = /^([a-zA-Z][a-zA-Z0-9+.-]{1,31}):([^<>\x00-\x20]*)$/;
  function autolink(state, silent) {
    let pos = state.pos;
    if (state.src.charCodeAt(pos) !== 60) return !1;
    let start = state.pos, max = state.posMax;
    for (; ; ) {
      if (++pos >= max) return !1;
      let ch = state.src.charCodeAt(pos);
      if (ch === 60) return !1;
      if (ch === 62) break;
    }
    let url = state.src.slice(start + 1, pos);
    if (AUTOLINK_RE.test(url)) {
      let fullUrl = state.md.normalizeLink(url);
      if (!state.md.validateLink(fullUrl)) return !1;
      if (!silent) {
        let token_o = state.push("link_open", "a", 1);
        token_o.attrs = [["href", fullUrl]], token_o.markup = "autolink", token_o.info = "auto";
        let token_t = state.push("text", "", 0);
        token_t.content = state.md.normalizeLinkText(url);
        let token_c = state.push("link_close", "a", -1);
        token_c.markup = "autolink", token_c.info = "auto";
      }
      return state.pos += url.length + 2, !0;
    }
    if (EMAIL_RE.test(url)) {
      let fullUrl = state.md.normalizeLink(`mailto:${url}`);
      if (!state.md.validateLink(fullUrl)) return !1;
      if (!silent) {
        let token_o = state.push("link_open", "a", 1);
        token_o.attrs = [["href", fullUrl]], token_o.markup = "autolink", token_o.info = "auto";
        let token_t = state.push("text", "", 0);
        token_t.content = state.md.normalizeLinkText(url);
        let token_c = state.push("link_close", "a", -1);
        token_c.markup = "autolink", token_c.info = "auto";
      }
      return state.pos += url.length + 2, !0;
    }
    return !1;
  }
  function isLinkOpen(str) {
    return /^<a[>\s]/i.test(str);
  }
  function isLinkClose(str) {
    return /^<\/a\s*>/i.test(str);
  }
  function isLetter(ch) {
    let lc = ch | 32;
    return lc >= 97 && lc <= 122;
  }
  function html_inline(state, silent) {
    if (!state.md.options.html) return !1;
    let max = state.posMax, pos = state.pos;
    if (state.src.charCodeAt(pos) !== 60 || pos + 2 >= max) return !1;
    let ch = state.src.charCodeAt(pos + 1);
    if (ch !== 33 && ch !== 63 && ch !== 47 && !isLetter(ch)) return !1;
    let match = state.src.slice(pos).match(HTML_TAG_RE);
    if (!match) return !1;
    if (!silent) {
      let token = state.push("html_inline", "", 0);
      token.content = match[0], isLinkOpen(token.content) && state.linkLevel++, isLinkClose(token.content) && state.linkLevel--;
    }
    return state.pos += match[0].length, !0;
  }
  var DIGITAL_RE = /^&#((?:x[a-f0-9]{1,6}|[0-9]{1,7}));/i, NAMED_RE = /^&([a-z][a-z0-9]{1,31});/i;
  function entity(state, silent) {
    let pos = state.pos, max = state.posMax;
    if (state.src.charCodeAt(pos) !== 38 || pos + 1 >= max) return !1;
    if (state.src.charCodeAt(pos + 1) === 35) {
      let match = state.src.slice(pos).match(DIGITAL_RE);
      if (match) {
        if (!silent) {
          let code2 = match[1][0].toLowerCase() === "x" ? parseInt(match[1].slice(1), 16) : parseInt(match[1], 10), token = state.push("text_special", "", 0);
          token.content = isValidEntityCode(code2) ? fromCodePoint(code2) : fromCodePoint(65533), token.markup = match[0], token.info = "entity";
        }
        return state.pos += match[0].length, !0;
      }
    } else {
      let match = state.src.slice(pos).match(NAMED_RE);
      if (match) {
        let decoded = decodeHTMLStrict(match[0]);
        if (decoded !== match[0]) {
          if (!silent) {
            let token = state.push("text_special", "", 0);
            token.content = decoded, token.markup = match[0], token.info = "entity";
          }
          return state.pos += match[0].length, !0;
        }
      }
    }
    return !1;
  }
  function processDelimiters(delimiters) {
    let openersBottom = {}, max = delimiters.length;
    if (!max) return;
    let headerIdx = 0, lastTokenIdx = -2, jumps = [];
    for (let closerIdx = 0; closerIdx < max; closerIdx++) {
      let closer = delimiters[closerIdx];
      if (jumps.push(0), (delimiters[headerIdx].marker !== closer.marker || lastTokenIdx !== closer.token - 1) && (headerIdx = closerIdx), lastTokenIdx = closer.token, closer.length = closer.length || 0, !closer.close) continue;
      openersBottom.hasOwnProperty(closer.marker) || (openersBottom[closer.marker] = [
        -1,
        -1,
        -1,
        -1,
        -1,
        -1
      ]);
      let minOpenerIdx = openersBottom[closer.marker][(closer.open ? 3 : 0) + closer.length % 3], openerIdx = headerIdx - jumps[headerIdx] - 1, newMinOpenerIdx = openerIdx;
      for (; openerIdx > minOpenerIdx; openerIdx -= jumps[openerIdx] + 1) {
        let opener = delimiters[openerIdx];
        if (opener.marker === closer.marker && opener.open && opener.end < 0) {
          let isOddMatch = !1;
          if ((opener.close || closer.open) && (opener.length + closer.length) % 3 === 0 && (opener.length % 3 !== 0 || closer.length % 3 !== 0) && (isOddMatch = !0), !isOddMatch) {
            let lastJump = openerIdx > 0 && !delimiters[openerIdx - 1].open ? jumps[openerIdx - 1] + 1 : 0;
            jumps[closerIdx] = closerIdx - openerIdx + lastJump, jumps[openerIdx] = lastJump, closer.open = !1, opener.end = closerIdx, opener.close = !1, newMinOpenerIdx = -1, lastTokenIdx = -2;
            break;
          }
        }
      }
      newMinOpenerIdx !== -1 && (openersBottom[closer.marker][(closer.open ? 3 : 0) + (closer.length || 0) % 3] = newMinOpenerIdx);
    }
  }
  function link_pairs(state) {
    let tokens_meta = state.tokens_meta, max = state.tokens_meta.length;
    processDelimiters(state.delimiters);
    for (let curr = 0; curr < max; curr++) {
      var _tokens_meta$curr;
      let delimiters = (_tokens_meta$curr = tokens_meta[curr]) === null || _tokens_meta$curr === void 0 ? void 0 : _tokens_meta$curr.delimiters;
      delimiters && processDelimiters(delimiters);
    }
  }
  function fragments_join(state) {
    let curr, last, level = 0, tokens = state.tokens, max = state.tokens.length;
    for (curr = last = 0; curr < max; curr++)
      tokens[curr].nesting < 0 && level--, tokens[curr].level = level, tokens[curr].nesting > 0 && level++, tokens[curr].type === "text" && curr + 1 < max && tokens[curr + 1].type === "text" ? tokens[curr + 1].content = tokens[curr].content + tokens[curr + 1].content : (curr !== last && (tokens[last] = tokens[curr]), last++);
    curr !== last && (tokens.length = last);
  }
  var _rules = [
    ["text", text],
    ["linkify", linkify],
    ["newline", newline],
    ["escape", escape],
    ["backticks", backtick],
    ["strikethrough", strikethrough_default.tokenize],
    ["emphasis", emphasis_default.tokenize],
    ["link", link],
    ["image", image],
    ["autolink", autolink],
    ["html_inline", html_inline],
    ["entity", entity]
  ], _rules2 = [
    ["balance_pairs", link_pairs],
    ["strikethrough", strikethrough_default.postProcess],
    ["emphasis", emphasis_default.postProcess],
    ["fragments_join", fragments_join]
  ], ParserInline = class {
    constructor() {
      _defineProperty(
        this,
        /**
        * {@link Ruler} instance. Keep configuration of inline rules.
        */
        "ruler",
        new Ruler()
      ), _defineProperty(
        this,
        /**
        * {@link Ruler} instance. Second ruler used for post-processing
        * (e.g. in emphasis-like rules).
        */
        "ruler2",
        new Ruler()
      ), _defineProperty(this, "State", StateInline);
      for (let i = 0; i < _rules.length; i++) this.ruler.push(_rules[i][0], _rules[i][1]);
      for (let i = 0; i < _rules2.length; i++) this.ruler2.push(_rules2[i][0], _rules2[i][1]);
    }
    skipToken(state) {
      let pos = state.pos, rules = this.ruler.getRules(""), len = rules.length, maxNesting = state.md.options.maxNesting, cache = state.cache;
      if (typeof cache[pos] < "u") {
        state.pos = cache[pos];
        return;
      }
      let ok = !1;
      if (state.level < maxNesting) {
        for (let i = 0; i < len; i++)
          if (state.level++, ok = rules[i](state, !0), state.level--, ok) {
            if (pos >= state.pos) throw new Error("inline rule didn't increment state.pos");
            break;
          }
      } else state.pos = state.posMax;
      ok || state.pos++, cache[pos] = state.pos;
    }
    tokenize(state) {
      let rules = this.ruler.getRules(""), len = rules.length, end = state.posMax, maxNesting = state.md.options.maxNesting;
      for (; state.pos < end; ) {
        let prevPos = state.pos, ok = !1;
        if (state.level < maxNesting) {
          for (let i = 0; i < len; i++)
            if (ok = rules[i](state, !1), ok) {
              if (prevPos >= state.pos) throw new Error("inline rule didn't increment state.pos");
              break;
            }
        }
        if (ok) {
          if (state.pos >= end) break;
          continue;
        }
        state.pending += state.src[state.pos++];
      }
      state.pending && state.pushPending();
    }
    /**
    * Process input string and push inline tokens into `outTokens`
    */
    parse(str, md2, env, outTokens) {
      let state = new this.State(str, md2, env, outTokens);
      this.tokenize(state);
      let rules = this.ruler2.getRules(""), len = rules.length;
      for (let i = 0; i < len; i++) rules[i](state);
    }
  }, config = {
    default: {
      options: {
        html: !1,
        xhtmlOut: !1,
        breaks: !1,
        langPrefix: "language-",
        linkify: !1,
        typographer: !1,
        quotes: "“”‘’",
        highlight: null,
        maxNesting: 100
      },
      components: {
        core: {},
        block: {},
        inline: {}
      }
    },
    zero: {
      options: {
        html: !1,
        xhtmlOut: !1,
        breaks: !1,
        langPrefix: "language-",
        linkify: !1,
        typographer: !1,
        quotes: "“”‘’",
        highlight: null,
        maxNesting: 20
      },
      components: {
        core: { rules: [
          "normalize",
          "block",
          "strip_references",
          "inline",
          "text_join"
        ] },
        block: { rules: ["paragraph"] },
        inline: {
          rules: ["text"],
          rules2: ["balance_pairs", "fragments_join"]
        }
      }
    },
    commonmark: {
      options: {
        html: !0,
        xhtmlOut: !0,
        breaks: !1,
        langPrefix: "language-",
        linkify: !1,
        typographer: !1,
        quotes: "“”‘’",
        highlight: null,
        maxNesting: 20
      },
      components: {
        core: { rules: [
          "normalize",
          "block",
          "strip_references",
          "inline",
          "text_join"
        ] },
        block: { rules: [
          "blockquote",
          "code",
          "fence",
          "heading",
          "hr",
          "html_block",
          "lheading",
          "list",
          "reference",
          "paragraph"
        ] },
        inline: {
          rules: [
            "autolink",
            "backticks",
            "emphasis",
            "entity",
            "escape",
            "html_inline",
            "image",
            "link",
            "newline",
            "text"
          ],
          rules2: [
            "balance_pairs",
            "emphasis",
            "fragments_join"
          ]
        }
      }
    }
  }, BAD_PROTO_RE = /^(vbscript|javascript|file|data):/, GOOD_DATA_RE = /^data:image\/(gif|png|jpeg|webp);/, RECODE_HOSTNAME_FOR = [
    "http:",
    "https:",
    "mailto:"
  ], MarkdownIt = class {
    /**
    * Link validation function. CommonMark allows too much in links. By default
    * we disable `javascript:`, `vbscript:`, `file:` schemas, and almost all `data:...` schemas
    * except some embedded image types.
    *
    * You can change this behaviour:
    *
    * @example
    * ```javascript
    * import MarkdownIt from 'markdown-it'
    * const md = new MarkdownIt()
    *
    * // enable everything
    * md.validateLink = function () { return true; }
    * ```
    */
    validateLink(url) {
      let str = url.trim().toLowerCase();
      return BAD_PROTO_RE.test(str) ? GOOD_DATA_RE.test(str) : !0;
    }
    /**
    * Function used to encode link url to a machine-readable format,
    * which includes url-encoding, punycode, etc.
    */
    normalizeLink(url) {
      let parsed = parse_default(url, !0);
      if (parsed.hostname && (!parsed.protocol || RECODE_HOSTNAME_FOR.indexOf(parsed.protocol) >= 0))
        try {
          parsed.hostname = punycode_es6_default.toASCII(parsed.hostname);
        } catch {
        }
      return parsed.auth && (parsed.auth = encode_default(parsed.auth)), parsed.hostname && (parsed.hostname = encode_default(parsed.hostname)), parsed.pathname && (parsed.pathname = encode_default(parsed.pathname)), parsed.search && (parsed.search = encode_default(parsed.search)), parsed.hash && (parsed.hash = encode_default(parsed.hash)), format(parsed);
    }
    /**
    * Function used to decode link url to a human-readable format`
    */
    normalizeLinkText(url) {
      let parsed = parse_default(url, !0);
      if (parsed.hostname && (!parsed.protocol || RECODE_HOSTNAME_FOR.indexOf(parsed.protocol) >= 0))
        try {
          parsed.hostname = punycode_es6_default.toUnicode(parsed.hostname);
        } catch {
        }
      return decode_default(format(parsed), decode_default.defaultChars + "%");
    }
    constructor(...args) {
      _defineProperty(
        this,
        /**
        * Instance of {@link ParserInline}. You may need it to add new rules when
        * writing plugins. For simple rules control use {@link MarkdownIt.disable}
        * and {@link MarkdownIt.enable}.
        */
        "inline",
        new ParserInline()
      ), _defineProperty(
        this,
        /**
        * Instance of {@link ParserBlock}. You may need it to add new rules when
        * writing plugins. For simple rules control use {@link MarkdownIt.disable}
        * and {@link MarkdownIt.enable}.
        */
        "block",
        new ParserBlock()
      ), _defineProperty(
        this,
        /**
        * Instance of {@link ParserCore} chain executor. You may need it to add new
        * rules when writing plugins. For simple rules control use
        * {@link MarkdownIt.disable} and {@link MarkdownIt.enable}.
        */
        "core",
        new ParserCore()
      ), _defineProperty(
        this,
        /**
        * Instance of {@link Renderer}. Use it to modify output look. Or to add rendering
        * rules for new token types, generated by plugins.
        *
        * See {@link Renderer} docs and
        * [source code](https://github.com/markdown-it/markdown-it/blob/master/src/renderer.ts).
        *
        * @example
        * ```javascript
        * import MarkdownIt from 'markdown-it'
        * const md = new MarkdownIt()
        *
        * function myToken(tokens, idx, options, env, self) {
        *   //...
        *   return result;
        * };
        *
        * md.renderer.rules['my_token'] = myToken
        * ```
        */
        "renderer",
        new Renderer()
      ), _defineProperty(
        this,
        /**
        * [linkify-it](https://github.com/markdown-it/linkify-it) instance.
        * Used by [linkify](https://github.com/markdown-it/markdown-it/blob/master/src/rules_core/linkify.ts)
        * rule.
        */
        "linkify",
        new LinkifyIt()
      ), _defineProperty(
        this,
        /**
        * Assorted utility functions, useful to write plugins. See details
        * [here](https://github.com/markdown-it/markdown-it/blob/master/src/common/utils.ts).
        */
        "utils",
        utils_exports
      ), _defineProperty(
        this,
        /**
        * Link components parser functions, useful to write plugins. See details
        * [here](https://github.com/markdown-it/markdown-it/blob/master/src/helpers).
        */
        "helpers",
        Object.assign({}, helpers_exports)
      );
      let [presetNameOrOptions, options] = args;
      typeof presetNameOrOptions == "string" ? (this.configure(presetNameOrOptions), options && this.set(options)) : (this.configure("default"), this.set(presetNameOrOptions || {}));
    }
    /**
    * Set parser options (in the same format as in constructor). Probably, you
    * will never need it, but you can change options after constructor call.
    *
    * __Note:__ To achieve the best possible performance, don't modify a
    * `markdown-it` instance options on the fly. If you need multiple configurations
    * it's best to create multiple instances and initialize each with separate
    * config.
    *
    * @example
    * ```javascript
    * import MarkdownIt from 'markdown-it'
    *
    * const md = new MarkdownIt()
    *   .set({ html: true, breaks: true })
    *   .set({ typographer: true })
    * ```
    */
    set(options) {
      return Object.assign(this.options, options), this;
    }
    /**
    * Batch load of all options and compenent settings. This is internal method,
    * and you probably will not need it. But if you will - see available presets
    * and data structure [here](https://github.com/markdown-it/markdown-it/tree/master/src/presets)
    *
    * We strongly recommend to use presets instead of direct config loads. That
    * will give better compatibility with next versions.
    */
    configure(presets) {
      let p;
      if (typeof presets == "string") {
        let presetName = presets;
        if (p = config[presetName], !p) throw new Error(`Wrong 'markdown-it' preset "${presetName}", check name`);
      } else p = presets;
      if (!p) throw new Error("Wrong `markdown-it` preset, can't be empty");
      p.options && (this.options = { ...p.options });
      let components = p.components;
      if (components) {
        var _components$inline;
        [
          "core",
          "block",
          "inline"
        ].forEach((name) => {
          var _components$name;
          let rules = (_components$name = components[name]) === null || _components$name === void 0 ? void 0 : _components$name.rules;
          rules && this[name].ruler.enableOnly(rules);
        });
        let rules2 = (_components$inline = components.inline) === null || _components$inline === void 0 ? void 0 : _components$inline.rules2;
        rules2 && this.inline.ruler2.enableOnly(rules2);
      }
      return this;
    }
    /**
    * Enable list or rules. It will automatically find appropriate components,
    * containing rules with given names. If rule not found, and `ignoreInvalid`
    * not set - throws exception.
    *
    * @example
    * ```javascript
    * import MarkdownIt from 'markdown-it'
    *
    * const md = new MarkdownIt()
    *   .enable(['sub', 'sup'])
    *   .disable('smartquotes')
    * ```
    */
    enable(list2, ignoreInvalid = !1) {
      let result = [];
      Array.isArray(list2) || (list2 = [list2]), [
        "core",
        "block",
        "inline"
      ].forEach((chain) => {
        result = result.concat(this[chain].ruler.enable(list2, !0));
      }), result = result.concat(this.inline.ruler2.enable(list2, !0));
      let missed = list2.filter((name) => result.indexOf(name) < 0);
      if (missed.length && !ignoreInvalid) throw new Error(`MarkdownIt. Failed to enable unknown rule(s): ${missed}`);
      return this;
    }
    /**
    * The same as {@link MarkdownIt.enable}, but turn specified rules off.
    */
    disable(list2, ignoreInvalid = !1) {
      let result = [];
      Array.isArray(list2) || (list2 = [list2]), [
        "core",
        "block",
        "inline"
      ].forEach((chain) => {
        result = result.concat(this[chain].ruler.disable(list2, !0));
      }), result = result.concat(this.inline.ruler2.disable(list2, !0));
      let missed = list2.filter((name) => result.indexOf(name) < 0);
      if (missed.length && !ignoreInvalid) throw new Error(`MarkdownIt. Failed to disable unknown rule(s): ${missed}`);
      return this;
    }
    /**
    * Load specified plugin with given params into current parser instance.
    * It's just a sugar to call `plugin(md, params)` with curring.
    *
    * @example
    * ```javascript
    * import MarkdownIt from 'markdown-it'
    * import iterator from 'markdown-it-for-inline'
    *
    * const md = new MarkdownIt()
    *   .use(iterator, 'foo_replace', 'text', function (tokens, idx) {
    *     tokens[idx].content = tokens[idx].content.replace(/foo/g, 'bar')
    *   })
    * ```
    */
    use(plugin, ...params) {
      return plugin.apply(plugin, [this, ...params]), this;
    }
    /**
    * Parse input string and return list of block tokens (special token type
    * "inline" will contain list of inline tokens). You should not call this
    * method directly, until you write custom renderer (for example, to produce
    * AST).
    *
    * `env` is used to pass data between "distributed" rules and return additional
    * metadata like reference info, needed for the renderer. It also can be used to
    * inject data in specific cases. Usually, you will be ok to pass `{}`,
    * and then pass updated object to renderer.
    */
    parse(src, env) {
      if (typeof src != "string") throw new Error("Input data should be a String");
      let state = new this.core.State(src, this, env);
      return this.core.process(state), state.tokens;
    }
    /**
    * Render markdown string into html. It does all magic for you :).
    *
    * `env` can be used to inject additional metadata (`{}` by default).
    * But you will not need it with high probability. See also comment
    * in {@link MarkdownIt.parse}.
    */
    render(src, env = {}) {
      return this.renderer.render(this.parse(src, env), this.options, env);
    }
    /**
    * The same as {@link MarkdownIt.parse} but skip all block rules. It returns
    * the block tokens list with the single `inline` element, containing parsed
    * inline tokens in `children` property. Also updates `env` object.
    */
    parseInline(src, env) {
      let state = new this.core.State(src, this, env);
      return state.inlineMode = !0, this.core.process(state), state.tokens;
    }
    /**
    * Similar to {@link MarkdownIt.render} but for single paragraph content.
    * Result will NOT be wrapped into `<p>` tags.
    */
    renderInline(src, env = {}) {
      return this.renderer.render(this.parseInline(src, env), this.options, env);
    }
  };
  _defineProperty(MarkdownIt, "Token", Token);
  _defineProperty(MarkdownIt, "Ruler", Ruler);
  _defineProperty(MarkdownIt, "Renderer", Renderer);
  _defineProperty(MarkdownIt, "ParserCore", ParserCore);
  _defineProperty(MarkdownIt, "StateCore", StateCore);
  _defineProperty(MarkdownIt, "ParserBlock", ParserBlock);
  _defineProperty(MarkdownIt, "StateBlock", StateBlock);
  _defineProperty(MarkdownIt, "ParserInline", ParserInline);
  _defineProperty(MarkdownIt, "StateInline", StateInline);
  var MarkdownItCallable = callable(MarkdownIt);

  // node_modules/markdown-it-footnote/index.mjs
  function render_footnote_anchor_name(tokens, idx, options, env) {
    let n = Number(tokens[idx].meta.id + 1).toString(), prefix = "";
    return typeof env.docId == "string" && (prefix = `-${env.docId}-`), prefix + n;
  }
  function render_footnote_caption(tokens, idx) {
    let n = Number(tokens[idx].meta.id + 1).toString();
    return tokens[idx].meta.subId > 0 && (n += `:${tokens[idx].meta.subId}`), `[${n}]`;
  }
  function render_footnote_ref(tokens, idx, options, env, slf) {
    let id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf), caption = slf.rules.footnote_caption(tokens, idx, options, env, slf), refid = id;
    return tokens[idx].meta.subId > 0 && (refid += `:${tokens[idx].meta.subId}`), `<sup class="footnote-ref"><a href="#fn${id}" id="fnref${refid}">${caption}</a></sup>`;
  }
  function render_footnote_block_open(tokens, idx, options) {
    return (options.xhtmlOut ? `<hr class="footnotes-sep" />
` : `<hr class="footnotes-sep">
`) + `<section class="footnotes">
<ol class="footnotes-list">
`;
  }
  function render_footnote_block_close() {
    return `</ol>
</section>
`;
  }
  function render_footnote_open(tokens, idx, options, env, slf) {
    let id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);
    return tokens[idx].meta.subId > 0 && (id += `:${tokens[idx].meta.subId}`), `<li id="fn${id}" class="footnote-item">`;
  }
  function render_footnote_close() {
    return `</li>
`;
  }
  function render_footnote_anchor(tokens, idx, options, env, slf) {
    let id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);
    return tokens[idx].meta.subId > 0 && (id += `:${tokens[idx].meta.subId}`), ` <a href="#fnref${id}" class="footnote-backref">↩︎</a>`;
  }
  function footnote_plugin(md2) {
    let parseLinkLabel2 = md2.helpers.parseLinkLabel, isSpace2 = md2.utils.isSpace;
    md2.renderer.rules.footnote_ref = render_footnote_ref, md2.renderer.rules.footnote_block_open = render_footnote_block_open, md2.renderer.rules.footnote_block_close = render_footnote_block_close, md2.renderer.rules.footnote_open = render_footnote_open, md2.renderer.rules.footnote_close = render_footnote_close, md2.renderer.rules.footnote_anchor = render_footnote_anchor, md2.renderer.rules.footnote_caption = render_footnote_caption, md2.renderer.rules.footnote_anchor_name = render_footnote_anchor_name;
    function footnote_def(state, startLine, endLine, silent) {
      let start = state.bMarks[startLine] + state.tShift[startLine], max = state.eMarks[startLine];
      if (start + 4 > max || state.src.charCodeAt(start) !== 91 || state.src.charCodeAt(start + 1) !== 94) return !1;
      let pos;
      for (pos = start + 2; pos < max; pos++) {
        if (state.src.charCodeAt(pos) === 32) return !1;
        if (state.src.charCodeAt(pos) === 93)
          break;
      }
      if (pos === start + 2 || pos + 1 >= max || state.src.charCodeAt(++pos) !== 58) return !1;
      if (silent) return !0;
      pos++, state.env.footnotes || (state.env.footnotes = {}), state.env.footnotes.refs || (state.env.footnotes.refs = {});
      let label = state.src.slice(start + 2, pos - 2);
      state.env.footnotes.refs[`:${label}`] = -1;
      let token_fref_o = new state.Token("footnote_reference_open", "", 1);
      token_fref_o.meta = { label }, token_fref_o.level = state.level++, state.tokens.push(token_fref_o);
      let oldBMark = state.bMarks[startLine], oldTShift = state.tShift[startLine], oldSCount = state.sCount[startLine], oldParentType = state.parentType, posAfterColon = pos, initial = state.sCount[startLine] + pos - (state.bMarks[startLine] + state.tShift[startLine]), offset = initial;
      for (; pos < max; ) {
        let ch = state.src.charCodeAt(pos);
        if (isSpace2(ch))
          ch === 9 ? offset += 4 - offset % 4 : offset++;
        else
          break;
        pos++;
      }
      state.tShift[startLine] = pos - posAfterColon, state.sCount[startLine] = offset - initial, state.bMarks[startLine] = posAfterColon, state.blkIndent += 4, state.parentType = "footnote", state.sCount[startLine] < state.blkIndent && (state.sCount[startLine] += state.blkIndent), state.md.block.tokenize(state, startLine, endLine, !0), state.parentType = oldParentType, state.blkIndent -= 4, state.tShift[startLine] = oldTShift, state.sCount[startLine] = oldSCount, state.bMarks[startLine] = oldBMark;
      let token_fref_c = new state.Token("footnote_reference_close", "", -1);
      return token_fref_c.level = --state.level, state.tokens.push(token_fref_c), !0;
    }
    function footnote_inline(state, silent) {
      let max = state.posMax, start = state.pos;
      if (start + 2 >= max || state.src.charCodeAt(start) !== 94 || state.src.charCodeAt(start + 1) !== 91) return !1;
      let labelStart = start + 2, labelEnd = parseLinkLabel2(state, start + 1);
      if (labelEnd < 0) return !1;
      if (!silent) {
        state.env.footnotes || (state.env.footnotes = {}), state.env.footnotes.list || (state.env.footnotes.list = []);
        let footnoteId = state.env.footnotes.list.length, tokens = [];
        state.md.inline.parse(
          state.src.slice(labelStart, labelEnd),
          state.md,
          state.env,
          tokens
        );
        let token = state.push("footnote_ref", "", 0);
        token.meta = { id: footnoteId }, state.env.footnotes.list[footnoteId] = {
          content: state.src.slice(labelStart, labelEnd),
          tokens
        };
      }
      return state.pos = labelEnd + 1, state.posMax = max, !0;
    }
    function footnote_ref(state, silent) {
      let max = state.posMax, start = state.pos;
      if (start + 3 > max || !state.env.footnotes || !state.env.footnotes.refs || state.src.charCodeAt(start) !== 91 || state.src.charCodeAt(start + 1) !== 94) return !1;
      let pos;
      for (pos = start + 2; pos < max; pos++) {
        if (state.src.charCodeAt(pos) === 32 || state.src.charCodeAt(pos) === 10) return !1;
        if (state.src.charCodeAt(pos) === 93)
          break;
      }
      if (pos === start + 2 || pos >= max) return !1;
      pos++;
      let label = state.src.slice(start + 2, pos - 1);
      if (typeof state.env.footnotes.refs[`:${label}`] > "u") return !1;
      if (!silent) {
        state.env.footnotes.list || (state.env.footnotes.list = []);
        let footnoteId;
        state.env.footnotes.refs[`:${label}`] < 0 ? (footnoteId = state.env.footnotes.list.length, state.env.footnotes.list[footnoteId] = { label, count: 0 }, state.env.footnotes.refs[`:${label}`] = footnoteId) : footnoteId = state.env.footnotes.refs[`:${label}`];
        let footnoteSubId = state.env.footnotes.list[footnoteId].count;
        state.env.footnotes.list[footnoteId].count++;
        let token = state.push("footnote_ref", "", 0);
        token.meta = { id: footnoteId, subId: footnoteSubId, label };
      }
      return state.pos = pos, state.posMax = max, !0;
    }
    function footnote_tail(state) {
      let tokens, current, currentLabel, insideRef = !1, refTokens = {};
      if (!state.env.footnotes || (state.tokens = state.tokens.filter(function(tok) {
        return tok.type === "footnote_reference_open" ? (insideRef = !0, current = [], currentLabel = tok.meta.label, !1) : tok.type === "footnote_reference_close" ? (insideRef = !1, refTokens[":" + currentLabel] = current, !1) : (insideRef && current.push(tok), !insideRef);
      }), !state.env.footnotes.list))
        return;
      let list2 = state.env.footnotes.list;
      state.tokens.push(new state.Token("footnote_block_open", "", 1));
      for (let i = 0, l = list2.length; i < l; i++) {
        let token_fo = new state.Token("footnote_open", "", 1);
        if (token_fo.meta = { id: i, label: list2[i].label }, state.tokens.push(token_fo), list2[i].tokens) {
          tokens = [];
          let token_po = new state.Token("paragraph_open", "p", 1);
          token_po.block = !0, tokens.push(token_po);
          let token_i = new state.Token("inline", "", 0);
          token_i.children = list2[i].tokens, token_i.content = list2[i].content, tokens.push(token_i);
          let token_pc = new state.Token("paragraph_close", "p", -1);
          token_pc.block = !0, tokens.push(token_pc);
        } else list2[i].label && (tokens = refTokens[`:${list2[i].label}`]);
        tokens && (state.tokens = state.tokens.concat(tokens));
        let lastParagraph;
        state.tokens[state.tokens.length - 1].type === "paragraph_close" ? lastParagraph = state.tokens.pop() : lastParagraph = null;
        let t = list2[i].count > 0 ? list2[i].count : 1;
        for (let j = 0; j < t; j++) {
          let token_a = new state.Token("footnote_anchor", "", 0);
          token_a.meta = { id: i, subId: j, label: list2[i].label }, state.tokens.push(token_a);
        }
        lastParagraph && state.tokens.push(lastParagraph), state.tokens.push(new state.Token("footnote_close", "", -1));
      }
      state.tokens.push(new state.Token("footnote_block_close", "", -1));
    }
    md2.block.ruler.before("reference", "footnote_def", footnote_def, { alt: ["paragraph", "reference"] }), md2.inline.ruler.after("image", "footnote_inline", footnote_inline), md2.inline.ruler.after("footnote_inline", "footnote_ref", footnote_ref), md2.core.ruler.after("inline", "footnote_tail", footnote_tail);
  }

  // node_modules/markdown-it-emoji/lib/render.mjs
  function emoji_html(tokens, idx) {
    return tokens[idx].content;
  }

  // node_modules/markdown-it-emoji/lib/replace.mjs
  function create_rule(md2, emojies, shortcuts, scanRE, replaceRE) {
    let arrayReplaceAt2 = md2.utils.arrayReplaceAt, ucm = md2.utils.lib.ucmicro, ZPCc = new RegExp([ucm.Z.source, ucm.P.source, ucm.Cc.source].join("|"));
    function splitTextToken(text3, level, Token2) {
      let last_pos = 0, nodes = [];
      if (text3.replace(replaceRE, function(match, offset, src) {
        let emoji_name;
        if (Object.prototype.hasOwnProperty.call(shortcuts, match)) {
          if (emoji_name = shortcuts[match], offset > 0 && !ZPCc.test(src[offset - 1]) || offset + match.length < src.length && !ZPCc.test(src[offset + match.length]))
            return;
        } else
          emoji_name = match.slice(1, -1);
        if (offset > last_pos) {
          let token2 = new Token2("text", "", 0);
          token2.content = text3.slice(last_pos, offset), nodes.push(token2);
        }
        let token = new Token2("emoji", "", 0);
        token.markup = emoji_name, token.content = emojies[emoji_name], nodes.push(token), last_pos = offset + match.length;
      }), last_pos < text3.length) {
        let token = new Token2("text", "", 0);
        token.content = text3.slice(last_pos), nodes.push(token);
      }
      return nodes;
    }
    return function(state) {
      let token, blockTokens = state.tokens, autolinkLevel = 0;
      for (let j = 0, l = blockTokens.length; j < l; j++) {
        if (blockTokens[j].type !== "inline")
          continue;
        let tokens = blockTokens[j].children;
        for (let i = tokens.length - 1; i >= 0; i--)
          token = tokens[i], (token.type === "link_open" || token.type === "link_close") && token.info === "auto" && (autolinkLevel -= token.nesting), token.type === "text" && autolinkLevel === 0 && scanRE.test(token.content) && (blockTokens[j].children = tokens = arrayReplaceAt2(
            tokens,
            i,
            splitTextToken(token.content, token.level, state.Token)
          ));
      }
    };
  }

  // node_modules/markdown-it-emoji/lib/normalize_opts.mjs
  function quoteRE(str) {
    return str.replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
  }
  function normalize_opts(options) {
    let emojies = options.defs;
    options.enabled.length && (emojies = Object.keys(emojies).reduce((acc, key) => (options.enabled.indexOf(key) >= 0 && (acc[key] = emojies[key]), acc), {}));
    let shortcuts = Object.keys(options.shortcuts).reduce((acc, key) => emojies[key] ? Array.isArray(options.shortcuts[key]) ? (options.shortcuts[key].forEach((alias) => {
      acc[alias] = key;
    }), acc) : (acc[options.shortcuts[key]] = key, acc) : acc, {}), keys = Object.keys(emojies), names2;
    keys.length === 0 ? names2 = "^$" : names2 = keys.map((name) => `:${name}:`).concat(Object.keys(shortcuts)).sort().reverse().map((name) => quoteRE(name)).join("|");
    let scanRE = RegExp(names2), replaceRE = RegExp(names2, "g");
    return {
      defs: emojies,
      shortcuts,
      scanRE,
      replaceRE
    };
  }

  // node_modules/markdown-it-emoji/lib/bare.mjs
  function emoji_plugin(md2, options) {
    let opts = normalize_opts(Object.assign({}, {
      defs: {},
      shortcuts: {},
      enabled: []
    }, options || {}));
    md2.renderer.rules.emoji = emoji_html, md2.core.ruler.after(
      "linkify",
      "emoji",
      create_rule(md2, opts.defs, opts.shortcuts, opts.scanRE, opts.replaceRE)
    );
  }

  // node_modules/markdown-it-emoji/lib/data/shortcuts.mjs
  var shortcuts_default = {
    angry: [">:(", ">:-("],
    blush: [':")', ':-")'],
    broken_heart: ["</3", "<\\3"],
    // :\ and :-\ not used because of conflict with markdown escaping
    confused: [":/", ":-/"],
    // twemoji shows question
    cry: [":'(", ":'-(", ":,(", ":,-("],
    frowning: [":(", ":-("],
    heart: ["<3"],
    imp: ["]:(", "]:-("],
    innocent: ["o:)", "O:)", "o:-)", "O:-)", "0:)", "0:-)"],
    joy: [":')", ":'-)", ":,)", ":,-)", ":'D", ":'-D", ":,D", ":,-D"],
    kissing: [":*", ":-*"],
    laughing: ["x-)", "X-)"],
    neutral_face: [":|", ":-|"],
    open_mouth: [":o", ":-o", ":O", ":-O"],
    rage: [":@", ":-@"],
    smile: [":D", ":-D"],
    smiley: [":)", ":-)"],
    smiling_imp: ["]:)", "]:-)"],
    sob: [":,'(", ":,'-(", ";(", ";-("],
    stuck_out_tongue: [":P", ":-P"],
    sunglasses: ["8-)", "B-)"],
    sweat: [",:(", ",:-("],
    sweat_smile: [",:)", ",:-)"],
    unamused: [":s", ":-S", ":z", ":-Z", ":$", ":-$"],
    wink: [";)", ";-)"]
  };

  // node_modules/markdown-it-emoji/lib/data/full.mjs
  var full_default = {
    100: "💯",
    1234: "🔢",
    grinning: "😀",
    smiley: "😃",
    smile: "😄",
    grin: "😁",
    laughing: "😆",
    satisfied: "😆",
    sweat_smile: "😅",
    rofl: "🤣",
    joy: "😂",
    slightly_smiling_face: "🙂",
    upside_down_face: "🙃",
    melting_face: "🫠",
    wink: "😉",
    blush: "😊",
    innocent: "😇",
    smiling_face_with_three_hearts: "🥰",
    heart_eyes: "😍",
    star_struck: "🤩",
    kissing_heart: "😘",
    kissing: "😗",
    relaxed: "☺️",
    kissing_closed_eyes: "😚",
    kissing_smiling_eyes: "😙",
    smiling_face_with_tear: "🥲",
    yum: "😋",
    stuck_out_tongue: "😛",
    stuck_out_tongue_winking_eye: "😜",
    zany_face: "🤪",
    stuck_out_tongue_closed_eyes: "😝",
    money_mouth_face: "🤑",
    hugs: "🤗",
    hand_over_mouth: "🤭",
    face_with_open_eyes_and_hand_over_mouth: "🫢",
    face_with_peeking_eye: "🫣",
    shushing_face: "🤫",
    thinking: "🤔",
    saluting_face: "🫡",
    zipper_mouth_face: "🤐",
    raised_eyebrow: "🤨",
    neutral_face: "😐",
    expressionless: "😑",
    no_mouth: "😶",
    dotted_line_face: "🫥",
    face_in_clouds: "😶‍🌫️",
    smirk: "😏",
    unamused: "😒",
    roll_eyes: "🙄",
    grimacing: "😬",
    face_exhaling: "😮‍💨",
    lying_face: "🤥",
    shaking_face: "🫨",
    relieved: "😌",
    pensive: "😔",
    sleepy: "😪",
    drooling_face: "🤤",
    sleeping: "😴",
    mask: "😷",
    face_with_thermometer: "🤒",
    face_with_head_bandage: "🤕",
    nauseated_face: "🤢",
    vomiting_face: "🤮",
    sneezing_face: "🤧",
    hot_face: "🥵",
    cold_face: "🥶",
    woozy_face: "🥴",
    dizzy_face: "😵",
    face_with_spiral_eyes: "😵‍💫",
    exploding_head: "🤯",
    cowboy_hat_face: "🤠",
    partying_face: "🥳",
    disguised_face: "🥸",
    sunglasses: "😎",
    nerd_face: "🤓",
    monocle_face: "🧐",
    confused: "😕",
    face_with_diagonal_mouth: "🫤",
    worried: "😟",
    slightly_frowning_face: "🙁",
    frowning_face: "☹️",
    open_mouth: "😮",
    hushed: "😯",
    astonished: "😲",
    flushed: "😳",
    pleading_face: "🥺",
    face_holding_back_tears: "🥹",
    frowning: "😦",
    anguished: "😧",
    fearful: "😨",
    cold_sweat: "😰",
    disappointed_relieved: "😥",
    cry: "😢",
    sob: "😭",
    scream: "😱",
    confounded: "😖",
    persevere: "😣",
    disappointed: "😞",
    sweat: "😓",
    weary: "😩",
    tired_face: "😫",
    yawning_face: "🥱",
    triumph: "😤",
    rage: "😡",
    pout: "😡",
    angry: "😠",
    cursing_face: "🤬",
    smiling_imp: "😈",
    imp: "👿",
    skull: "💀",
    skull_and_crossbones: "☠️",
    hankey: "💩",
    poop: "💩",
    shit: "💩",
    clown_face: "🤡",
    japanese_ogre: "👹",
    japanese_goblin: "👺",
    ghost: "👻",
    alien: "👽",
    space_invader: "👾",
    robot: "🤖",
    smiley_cat: "😺",
    smile_cat: "😸",
    joy_cat: "😹",
    heart_eyes_cat: "😻",
    smirk_cat: "😼",
    kissing_cat: "😽",
    scream_cat: "🙀",
    crying_cat_face: "😿",
    pouting_cat: "😾",
    see_no_evil: "🙈",
    hear_no_evil: "🙉",
    speak_no_evil: "🙊",
    love_letter: "💌",
    cupid: "💘",
    gift_heart: "💝",
    sparkling_heart: "💖",
    heartpulse: "💗",
    heartbeat: "💓",
    revolving_hearts: "💞",
    two_hearts: "💕",
    heart_decoration: "💟",
    heavy_heart_exclamation: "❣️",
    broken_heart: "💔",
    heart_on_fire: "❤️‍🔥",
    mending_heart: "❤️‍🩹",
    heart: "❤️",
    pink_heart: "🩷",
    orange_heart: "🧡",
    yellow_heart: "💛",
    green_heart: "💚",
    blue_heart: "💙",
    light_blue_heart: "🩵",
    purple_heart: "💜",
    brown_heart: "🤎",
    black_heart: "🖤",
    grey_heart: "🩶",
    white_heart: "🤍",
    kiss: "💋",
    anger: "💢",
    boom: "💥",
    collision: "💥",
    dizzy: "💫",
    sweat_drops: "💦",
    dash: "💨",
    hole: "🕳️",
    speech_balloon: "💬",
    eye_speech_bubble: "👁️‍🗨️",
    left_speech_bubble: "🗨️",
    right_anger_bubble: "🗯️",
    thought_balloon: "💭",
    zzz: "💤",
    wave: "👋",
    raised_back_of_hand: "🤚",
    raised_hand_with_fingers_splayed: "🖐️",
    hand: "✋",
    raised_hand: "✋",
    vulcan_salute: "🖖",
    rightwards_hand: "🫱",
    leftwards_hand: "🫲",
    palm_down_hand: "🫳",
    palm_up_hand: "🫴",
    leftwards_pushing_hand: "🫷",
    rightwards_pushing_hand: "🫸",
    ok_hand: "👌",
    pinched_fingers: "🤌",
    pinching_hand: "🤏",
    v: "✌️",
    crossed_fingers: "🤞",
    hand_with_index_finger_and_thumb_crossed: "🫰",
    love_you_gesture: "🤟",
    metal: "🤘",
    call_me_hand: "🤙",
    point_left: "👈",
    point_right: "👉",
    point_up_2: "👆",
    middle_finger: "🖕",
    fu: "🖕",
    point_down: "👇",
    point_up: "☝️",
    index_pointing_at_the_viewer: "🫵",
    "+1": "👍",
    thumbsup: "👍",
    "-1": "👎",
    thumbsdown: "👎",
    fist_raised: "✊",
    fist: "✊",
    fist_oncoming: "👊",
    facepunch: "👊",
    punch: "👊",
    fist_left: "🤛",
    fist_right: "🤜",
    clap: "👏",
    raised_hands: "🙌",
    heart_hands: "🫶",
    open_hands: "👐",
    palms_up_together: "🤲",
    handshake: "🤝",
    pray: "🙏",
    writing_hand: "✍️",
    nail_care: "💅",
    selfie: "🤳",
    muscle: "💪",
    mechanical_arm: "🦾",
    mechanical_leg: "🦿",
    leg: "🦵",
    foot: "🦶",
    ear: "👂",
    ear_with_hearing_aid: "🦻",
    nose: "👃",
    brain: "🧠",
    anatomical_heart: "🫀",
    lungs: "🫁",
    tooth: "🦷",
    bone: "🦴",
    eyes: "👀",
    eye: "👁️",
    tongue: "👅",
    lips: "👄",
    biting_lip: "🫦",
    baby: "👶",
    child: "🧒",
    boy: "👦",
    girl: "👧",
    adult: "🧑",
    blond_haired_person: "👱",
    man: "👨",
    bearded_person: "🧔",
    man_beard: "🧔‍♂️",
    woman_beard: "🧔‍♀️",
    red_haired_man: "👨‍🦰",
    curly_haired_man: "👨‍🦱",
    white_haired_man: "👨‍🦳",
    bald_man: "👨‍🦲",
    woman: "👩",
    red_haired_woman: "👩‍🦰",
    person_red_hair: "🧑‍🦰",
    curly_haired_woman: "👩‍🦱",
    person_curly_hair: "🧑‍🦱",
    white_haired_woman: "👩‍🦳",
    person_white_hair: "🧑‍🦳",
    bald_woman: "👩‍🦲",
    person_bald: "🧑‍🦲",
    blond_haired_woman: "👱‍♀️",
    blonde_woman: "👱‍♀️",
    blond_haired_man: "👱‍♂️",
    older_adult: "🧓",
    older_man: "👴",
    older_woman: "👵",
    frowning_person: "🙍",
    frowning_man: "🙍‍♂️",
    frowning_woman: "🙍‍♀️",
    pouting_face: "🙎",
    pouting_man: "🙎‍♂️",
    pouting_woman: "🙎‍♀️",
    no_good: "🙅",
    no_good_man: "🙅‍♂️",
    ng_man: "🙅‍♂️",
    no_good_woman: "🙅‍♀️",
    ng_woman: "🙅‍♀️",
    ok_person: "🙆",
    ok_man: "🙆‍♂️",
    ok_woman: "🙆‍♀️",
    tipping_hand_person: "💁",
    information_desk_person: "💁",
    tipping_hand_man: "💁‍♂️",
    sassy_man: "💁‍♂️",
    tipping_hand_woman: "💁‍♀️",
    sassy_woman: "💁‍♀️",
    raising_hand: "🙋",
    raising_hand_man: "🙋‍♂️",
    raising_hand_woman: "🙋‍♀️",
    deaf_person: "🧏",
    deaf_man: "🧏‍♂️",
    deaf_woman: "🧏‍♀️",
    bow: "🙇",
    bowing_man: "🙇‍♂️",
    bowing_woman: "🙇‍♀️",
    facepalm: "🤦",
    man_facepalming: "🤦‍♂️",
    woman_facepalming: "🤦‍♀️",
    shrug: "🤷",
    man_shrugging: "🤷‍♂️",
    woman_shrugging: "🤷‍♀️",
    health_worker: "🧑‍⚕️",
    man_health_worker: "👨‍⚕️",
    woman_health_worker: "👩‍⚕️",
    student: "🧑‍🎓",
    man_student: "👨‍🎓",
    woman_student: "👩‍🎓",
    teacher: "🧑‍🏫",
    man_teacher: "👨‍🏫",
    woman_teacher: "👩‍🏫",
    judge: "🧑‍⚖️",
    man_judge: "👨‍⚖️",
    woman_judge: "👩‍⚖️",
    farmer: "🧑‍🌾",
    man_farmer: "👨‍🌾",
    woman_farmer: "👩‍🌾",
    cook: "🧑‍🍳",
    man_cook: "👨‍🍳",
    woman_cook: "👩‍🍳",
    mechanic: "🧑‍🔧",
    man_mechanic: "👨‍🔧",
    woman_mechanic: "👩‍🔧",
    factory_worker: "🧑‍🏭",
    man_factory_worker: "👨‍🏭",
    woman_factory_worker: "👩‍🏭",
    office_worker: "🧑‍💼",
    man_office_worker: "👨‍💼",
    woman_office_worker: "👩‍💼",
    scientist: "🧑‍🔬",
    man_scientist: "👨‍🔬",
    woman_scientist: "👩‍🔬",
    technologist: "🧑‍💻",
    man_technologist: "👨‍💻",
    woman_technologist: "👩‍💻",
    singer: "🧑‍🎤",
    man_singer: "👨‍🎤",
    woman_singer: "👩‍🎤",
    artist: "🧑‍🎨",
    man_artist: "👨‍🎨",
    woman_artist: "👩‍🎨",
    pilot: "🧑‍✈️",
    man_pilot: "👨‍✈️",
    woman_pilot: "👩‍✈️",
    astronaut: "🧑‍🚀",
    man_astronaut: "👨‍🚀",
    woman_astronaut: "👩‍🚀",
    firefighter: "🧑‍🚒",
    man_firefighter: "👨‍🚒",
    woman_firefighter: "👩‍🚒",
    police_officer: "👮",
    cop: "👮",
    policeman: "👮‍♂️",
    policewoman: "👮‍♀️",
    detective: "🕵️",
    male_detective: "🕵️‍♂️",
    female_detective: "🕵️‍♀️",
    guard: "💂",
    guardsman: "💂‍♂️",
    guardswoman: "💂‍♀️",
    ninja: "🥷",
    construction_worker: "👷",
    construction_worker_man: "👷‍♂️",
    construction_worker_woman: "👷‍♀️",
    person_with_crown: "🫅",
    prince: "🤴",
    princess: "👸",
    person_with_turban: "👳",
    man_with_turban: "👳‍♂️",
    woman_with_turban: "👳‍♀️",
    man_with_gua_pi_mao: "👲",
    woman_with_headscarf: "🧕",
    person_in_tuxedo: "🤵",
    man_in_tuxedo: "🤵‍♂️",
    woman_in_tuxedo: "🤵‍♀️",
    person_with_veil: "👰",
    man_with_veil: "👰‍♂️",
    woman_with_veil: "👰‍♀️",
    bride_with_veil: "👰‍♀️",
    pregnant_woman: "🤰",
    pregnant_man: "🫃",
    pregnant_person: "🫄",
    breast_feeding: "🤱",
    woman_feeding_baby: "👩‍🍼",
    man_feeding_baby: "👨‍🍼",
    person_feeding_baby: "🧑‍🍼",
    angel: "👼",
    santa: "🎅",
    mrs_claus: "🤶",
    mx_claus: "🧑‍🎄",
    superhero: "🦸",
    superhero_man: "🦸‍♂️",
    superhero_woman: "🦸‍♀️",
    supervillain: "🦹",
    supervillain_man: "🦹‍♂️",
    supervillain_woman: "🦹‍♀️",
    mage: "🧙",
    mage_man: "🧙‍♂️",
    mage_woman: "🧙‍♀️",
    fairy: "🧚",
    fairy_man: "🧚‍♂️",
    fairy_woman: "🧚‍♀️",
    vampire: "🧛",
    vampire_man: "🧛‍♂️",
    vampire_woman: "🧛‍♀️",
    merperson: "🧜",
    merman: "🧜‍♂️",
    mermaid: "🧜‍♀️",
    elf: "🧝",
    elf_man: "🧝‍♂️",
    elf_woman: "🧝‍♀️",
    genie: "🧞",
    genie_man: "🧞‍♂️",
    genie_woman: "🧞‍♀️",
    zombie: "🧟",
    zombie_man: "🧟‍♂️",
    zombie_woman: "🧟‍♀️",
    troll: "🧌",
    massage: "💆",
    massage_man: "💆‍♂️",
    massage_woman: "💆‍♀️",
    haircut: "💇",
    haircut_man: "💇‍♂️",
    haircut_woman: "💇‍♀️",
    walking: "🚶",
    walking_man: "🚶‍♂️",
    walking_woman: "🚶‍♀️",
    standing_person: "🧍",
    standing_man: "🧍‍♂️",
    standing_woman: "🧍‍♀️",
    kneeling_person: "🧎",
    kneeling_man: "🧎‍♂️",
    kneeling_woman: "🧎‍♀️",
    person_with_probing_cane: "🧑‍🦯",
    man_with_probing_cane: "👨‍🦯",
    woman_with_probing_cane: "👩‍🦯",
    person_in_motorized_wheelchair: "🧑‍🦼",
    man_in_motorized_wheelchair: "👨‍🦼",
    woman_in_motorized_wheelchair: "👩‍🦼",
    person_in_manual_wheelchair: "🧑‍🦽",
    man_in_manual_wheelchair: "👨‍🦽",
    woman_in_manual_wheelchair: "👩‍🦽",
    runner: "🏃",
    running: "🏃",
    running_man: "🏃‍♂️",
    running_woman: "🏃‍♀️",
    woman_dancing: "💃",
    dancer: "💃",
    man_dancing: "🕺",
    business_suit_levitating: "🕴️",
    dancers: "👯",
    dancing_men: "👯‍♂️",
    dancing_women: "👯‍♀️",
    sauna_person: "🧖",
    sauna_man: "🧖‍♂️",
    sauna_woman: "🧖‍♀️",
    climbing: "🧗",
    climbing_man: "🧗‍♂️",
    climbing_woman: "🧗‍♀️",
    person_fencing: "🤺",
    horse_racing: "🏇",
    skier: "⛷️",
    snowboarder: "🏂",
    golfing: "🏌️",
    golfing_man: "🏌️‍♂️",
    golfing_woman: "🏌️‍♀️",
    surfer: "🏄",
    surfing_man: "🏄‍♂️",
    surfing_woman: "🏄‍♀️",
    rowboat: "🚣",
    rowing_man: "🚣‍♂️",
    rowing_woman: "🚣‍♀️",
    swimmer: "🏊",
    swimming_man: "🏊‍♂️",
    swimming_woman: "🏊‍♀️",
    bouncing_ball_person: "⛹️",
    bouncing_ball_man: "⛹️‍♂️",
    basketball_man: "⛹️‍♂️",
    bouncing_ball_woman: "⛹️‍♀️",
    basketball_woman: "⛹️‍♀️",
    weight_lifting: "🏋️",
    weight_lifting_man: "🏋️‍♂️",
    weight_lifting_woman: "🏋️‍♀️",
    bicyclist: "🚴",
    biking_man: "🚴‍♂️",
    biking_woman: "🚴‍♀️",
    mountain_bicyclist: "🚵",
    mountain_biking_man: "🚵‍♂️",
    mountain_biking_woman: "🚵‍♀️",
    cartwheeling: "🤸",
    man_cartwheeling: "🤸‍♂️",
    woman_cartwheeling: "🤸‍♀️",
    wrestling: "🤼",
    men_wrestling: "🤼‍♂️",
    women_wrestling: "🤼‍♀️",
    water_polo: "🤽",
    man_playing_water_polo: "🤽‍♂️",
    woman_playing_water_polo: "🤽‍♀️",
    handball_person: "🤾",
    man_playing_handball: "🤾‍♂️",
    woman_playing_handball: "🤾‍♀️",
    juggling_person: "🤹",
    man_juggling: "🤹‍♂️",
    woman_juggling: "🤹‍♀️",
    lotus_position: "🧘",
    lotus_position_man: "🧘‍♂️",
    lotus_position_woman: "🧘‍♀️",
    bath: "🛀",
    sleeping_bed: "🛌",
    people_holding_hands: "🧑‍🤝‍🧑",
    two_women_holding_hands: "👭",
    couple: "👫",
    two_men_holding_hands: "👬",
    couplekiss: "💏",
    couplekiss_man_woman: "👩‍❤️‍💋‍👨",
    couplekiss_man_man: "👨‍❤️‍💋‍👨",
    couplekiss_woman_woman: "👩‍❤️‍💋‍👩",
    couple_with_heart: "💑",
    couple_with_heart_woman_man: "👩‍❤️‍👨",
    couple_with_heart_man_man: "👨‍❤️‍👨",
    couple_with_heart_woman_woman: "👩‍❤️‍👩",
    family: "👪",
    family_man_woman_boy: "👨‍👩‍👦",
    family_man_woman_girl: "👨‍👩‍👧",
    family_man_woman_girl_boy: "👨‍👩‍👧‍👦",
    family_man_woman_boy_boy: "👨‍👩‍👦‍👦",
    family_man_woman_girl_girl: "👨‍👩‍👧‍👧",
    family_man_man_boy: "👨‍👨‍👦",
    family_man_man_girl: "👨‍👨‍👧",
    family_man_man_girl_boy: "👨‍👨‍👧‍👦",
    family_man_man_boy_boy: "👨‍👨‍👦‍👦",
    family_man_man_girl_girl: "👨‍👨‍👧‍👧",
    family_woman_woman_boy: "👩‍👩‍👦",
    family_woman_woman_girl: "👩‍👩‍👧",
    family_woman_woman_girl_boy: "👩‍👩‍👧‍👦",
    family_woman_woman_boy_boy: "👩‍👩‍👦‍👦",
    family_woman_woman_girl_girl: "👩‍👩‍👧‍👧",
    family_man_boy: "👨‍👦",
    family_man_boy_boy: "👨‍👦‍👦",
    family_man_girl: "👨‍👧",
    family_man_girl_boy: "👨‍👧‍👦",
    family_man_girl_girl: "👨‍👧‍👧",
    family_woman_boy: "👩‍👦",
    family_woman_boy_boy: "👩‍👦‍👦",
    family_woman_girl: "👩‍👧",
    family_woman_girl_boy: "👩‍👧‍👦",
    family_woman_girl_girl: "👩‍👧‍👧",
    speaking_head: "🗣️",
    bust_in_silhouette: "👤",
    busts_in_silhouette: "👥",
    people_hugging: "🫂",
    footprints: "👣",
    monkey_face: "🐵",
    monkey: "🐒",
    gorilla: "🦍",
    orangutan: "🦧",
    dog: "🐶",
    dog2: "🐕",
    guide_dog: "🦮",
    service_dog: "🐕‍🦺",
    poodle: "🐩",
    wolf: "🐺",
    fox_face: "🦊",
    raccoon: "🦝",
    cat: "🐱",
    cat2: "🐈",
    black_cat: "🐈‍⬛",
    lion: "🦁",
    tiger: "🐯",
    tiger2: "🐅",
    leopard: "🐆",
    horse: "🐴",
    moose: "🫎",
    donkey: "🫏",
    racehorse: "🐎",
    unicorn: "🦄",
    zebra: "🦓",
    deer: "🦌",
    bison: "🦬",
    cow: "🐮",
    ox: "🐂",
    water_buffalo: "🐃",
    cow2: "🐄",
    pig: "🐷",
    pig2: "🐖",
    boar: "🐗",
    pig_nose: "🐽",
    ram: "🐏",
    sheep: "🐑",
    goat: "🐐",
    dromedary_camel: "🐪",
    camel: "🐫",
    llama: "🦙",
    giraffe: "🦒",
    elephant: "🐘",
    mammoth: "🦣",
    rhinoceros: "🦏",
    hippopotamus: "🦛",
    mouse: "🐭",
    mouse2: "🐁",
    rat: "🐀",
    hamster: "🐹",
    rabbit: "🐰",
    rabbit2: "🐇",
    chipmunk: "🐿️",
    beaver: "🦫",
    hedgehog: "🦔",
    bat: "🦇",
    bear: "🐻",
    polar_bear: "🐻‍❄️",
    koala: "🐨",
    panda_face: "🐼",
    sloth: "🦥",
    otter: "🦦",
    skunk: "🦨",
    kangaroo: "🦘",
    badger: "🦡",
    feet: "🐾",
    paw_prints: "🐾",
    turkey: "🦃",
    chicken: "🐔",
    rooster: "🐓",
    hatching_chick: "🐣",
    baby_chick: "🐤",
    hatched_chick: "🐥",
    bird: "🐦",
    penguin: "🐧",
    dove: "🕊️",
    eagle: "🦅",
    duck: "🦆",
    swan: "🦢",
    owl: "🦉",
    dodo: "🦤",
    feather: "🪶",
    flamingo: "🦩",
    peacock: "🦚",
    parrot: "🦜",
    wing: "🪽",
    black_bird: "🐦‍⬛",
    goose: "🪿",
    frog: "🐸",
    crocodile: "🐊",
    turtle: "🐢",
    lizard: "🦎",
    snake: "🐍",
    dragon_face: "🐲",
    dragon: "🐉",
    sauropod: "🦕",
    "t-rex": "🦖",
    whale: "🐳",
    whale2: "🐋",
    dolphin: "🐬",
    flipper: "🐬",
    seal: "🦭",
    fish: "🐟",
    tropical_fish: "🐠",
    blowfish: "🐡",
    shark: "🦈",
    octopus: "🐙",
    shell: "🐚",
    coral: "🪸",
    jellyfish: "🪼",
    snail: "🐌",
    butterfly: "🦋",
    bug: "🐛",
    ant: "🐜",
    bee: "🐝",
    honeybee: "🐝",
    beetle: "🪲",
    lady_beetle: "🐞",
    cricket: "🦗",
    cockroach: "🪳",
    spider: "🕷️",
    spider_web: "🕸️",
    scorpion: "🦂",
    mosquito: "🦟",
    fly: "🪰",
    worm: "🪱",
    microbe: "🦠",
    bouquet: "💐",
    cherry_blossom: "🌸",
    white_flower: "💮",
    lotus: "🪷",
    rosette: "🏵️",
    rose: "🌹",
    wilted_flower: "🥀",
    hibiscus: "🌺",
    sunflower: "🌻",
    blossom: "🌼",
    tulip: "🌷",
    hyacinth: "🪻",
    seedling: "🌱",
    potted_plant: "🪴",
    evergreen_tree: "🌲",
    deciduous_tree: "🌳",
    palm_tree: "🌴",
    cactus: "🌵",
    ear_of_rice: "🌾",
    herb: "🌿",
    shamrock: "☘️",
    four_leaf_clover: "🍀",
    maple_leaf: "🍁",
    fallen_leaf: "🍂",
    leaves: "🍃",
    empty_nest: "🪹",
    nest_with_eggs: "🪺",
    mushroom: "🍄",
    grapes: "🍇",
    melon: "🍈",
    watermelon: "🍉",
    tangerine: "🍊",
    orange: "🍊",
    mandarin: "🍊",
    lemon: "🍋",
    banana: "🍌",
    pineapple: "🍍",
    mango: "🥭",
    apple: "🍎",
    green_apple: "🍏",
    pear: "🍐",
    peach: "🍑",
    cherries: "🍒",
    strawberry: "🍓",
    blueberries: "🫐",
    kiwi_fruit: "🥝",
    tomato: "🍅",
    olive: "🫒",
    coconut: "🥥",
    avocado: "🥑",
    eggplant: "🍆",
    potato: "🥔",
    carrot: "🥕",
    corn: "🌽",
    hot_pepper: "🌶️",
    bell_pepper: "🫑",
    cucumber: "🥒",
    leafy_green: "🥬",
    broccoli: "🥦",
    garlic: "🧄",
    onion: "🧅",
    peanuts: "🥜",
    beans: "🫘",
    chestnut: "🌰",
    ginger_root: "🫚",
    pea_pod: "🫛",
    bread: "🍞",
    croissant: "🥐",
    baguette_bread: "🥖",
    flatbread: "🫓",
    pretzel: "🥨",
    bagel: "🥯",
    pancakes: "🥞",
    waffle: "🧇",
    cheese: "🧀",
    meat_on_bone: "🍖",
    poultry_leg: "🍗",
    cut_of_meat: "🥩",
    bacon: "🥓",
    hamburger: "🍔",
    fries: "🍟",
    pizza: "🍕",
    hotdog: "🌭",
    sandwich: "🥪",
    taco: "🌮",
    burrito: "🌯",
    tamale: "🫔",
    stuffed_flatbread: "🥙",
    falafel: "🧆",
    egg: "🥚",
    fried_egg: "🍳",
    shallow_pan_of_food: "🥘",
    stew: "🍲",
    fondue: "🫕",
    bowl_with_spoon: "🥣",
    green_salad: "🥗",
    popcorn: "🍿",
    butter: "🧈",
    salt: "🧂",
    canned_food: "🥫",
    bento: "🍱",
    rice_cracker: "🍘",
    rice_ball: "🍙",
    rice: "🍚",
    curry: "🍛",
    ramen: "🍜",
    spaghetti: "🍝",
    sweet_potato: "🍠",
    oden: "🍢",
    sushi: "🍣",
    fried_shrimp: "🍤",
    fish_cake: "🍥",
    moon_cake: "🥮",
    dango: "🍡",
    dumpling: "🥟",
    fortune_cookie: "🥠",
    takeout_box: "🥡",
    crab: "🦀",
    lobster: "🦞",
    shrimp: "🦐",
    squid: "🦑",
    oyster: "🦪",
    icecream: "🍦",
    shaved_ice: "🍧",
    ice_cream: "🍨",
    doughnut: "🍩",
    cookie: "🍪",
    birthday: "🎂",
    cake: "🍰",
    cupcake: "🧁",
    pie: "🥧",
    chocolate_bar: "🍫",
    candy: "🍬",
    lollipop: "🍭",
    custard: "🍮",
    honey_pot: "🍯",
    baby_bottle: "🍼",
    milk_glass: "🥛",
    coffee: "☕",
    teapot: "🫖",
    tea: "🍵",
    sake: "🍶",
    champagne: "🍾",
    wine_glass: "🍷",
    cocktail: "🍸",
    tropical_drink: "🍹",
    beer: "🍺",
    beers: "🍻",
    clinking_glasses: "🥂",
    tumbler_glass: "🥃",
    pouring_liquid: "🫗",
    cup_with_straw: "🥤",
    bubble_tea: "🧋",
    beverage_box: "🧃",
    mate: "🧉",
    ice_cube: "🧊",
    chopsticks: "🥢",
    plate_with_cutlery: "🍽️",
    fork_and_knife: "🍴",
    spoon: "🥄",
    hocho: "🔪",
    knife: "🔪",
    jar: "🫙",
    amphora: "🏺",
    earth_africa: "🌍",
    earth_americas: "🌎",
    earth_asia: "🌏",
    globe_with_meridians: "🌐",
    world_map: "🗺️",
    japan: "🗾",
    compass: "🧭",
    mountain_snow: "🏔️",
    mountain: "⛰️",
    volcano: "🌋",
    mount_fuji: "🗻",
    camping: "🏕️",
    beach_umbrella: "🏖️",
    desert: "🏜️",
    desert_island: "🏝️",
    national_park: "🏞️",
    stadium: "🏟️",
    classical_building: "🏛️",
    building_construction: "🏗️",
    bricks: "🧱",
    rock: "🪨",
    wood: "🪵",
    hut: "🛖",
    houses: "🏘️",
    derelict_house: "🏚️",
    house: "🏠",
    house_with_garden: "🏡",
    office: "🏢",
    post_office: "🏣",
    european_post_office: "🏤",
    hospital: "🏥",
    bank: "🏦",
    hotel: "🏨",
    love_hotel: "🏩",
    convenience_store: "🏪",
    school: "🏫",
    department_store: "🏬",
    factory: "🏭",
    japanese_castle: "🏯",
    european_castle: "🏰",
    wedding: "💒",
    tokyo_tower: "🗼",
    statue_of_liberty: "🗽",
    church: "⛪",
    mosque: "🕌",
    hindu_temple: "🛕",
    synagogue: "🕍",
    shinto_shrine: "⛩️",
    kaaba: "🕋",
    fountain: "⛲",
    tent: "⛺",
    foggy: "🌁",
    night_with_stars: "🌃",
    cityscape: "🏙️",
    sunrise_over_mountains: "🌄",
    sunrise: "🌅",
    city_sunset: "🌆",
    city_sunrise: "🌇",
    bridge_at_night: "🌉",
    hotsprings: "♨️",
    carousel_horse: "🎠",
    playground_slide: "🛝",
    ferris_wheel: "🎡",
    roller_coaster: "🎢",
    barber: "💈",
    circus_tent: "🎪",
    steam_locomotive: "🚂",
    railway_car: "🚃",
    bullettrain_side: "🚄",
    bullettrain_front: "🚅",
    train2: "🚆",
    metro: "🚇",
    light_rail: "🚈",
    station: "🚉",
    tram: "🚊",
    monorail: "🚝",
    mountain_railway: "🚞",
    train: "🚋",
    bus: "🚌",
    oncoming_bus: "🚍",
    trolleybus: "🚎",
    minibus: "🚐",
    ambulance: "🚑",
    fire_engine: "🚒",
    police_car: "🚓",
    oncoming_police_car: "🚔",
    taxi: "🚕",
    oncoming_taxi: "🚖",
    car: "🚗",
    red_car: "🚗",
    oncoming_automobile: "🚘",
    blue_car: "🚙",
    pickup_truck: "🛻",
    truck: "🚚",
    articulated_lorry: "🚛",
    tractor: "🚜",
    racing_car: "🏎️",
    motorcycle: "🏍️",
    motor_scooter: "🛵",
    manual_wheelchair: "🦽",
    motorized_wheelchair: "🦼",
    auto_rickshaw: "🛺",
    bike: "🚲",
    kick_scooter: "🛴",
    skateboard: "🛹",
    roller_skate: "🛼",
    busstop: "🚏",
    motorway: "🛣️",
    railway_track: "🛤️",
    oil_drum: "🛢️",
    fuelpump: "⛽",
    wheel: "🛞",
    rotating_light: "🚨",
    traffic_light: "🚥",
    vertical_traffic_light: "🚦",
    stop_sign: "🛑",
    construction: "🚧",
    anchor: "⚓",
    ring_buoy: "🛟",
    boat: "⛵",
    sailboat: "⛵",
    canoe: "🛶",
    speedboat: "🚤",
    passenger_ship: "🛳️",
    ferry: "⛴️",
    motor_boat: "🛥️",
    ship: "🚢",
    airplane: "✈️",
    small_airplane: "🛩️",
    flight_departure: "🛫",
    flight_arrival: "🛬",
    parachute: "🪂",
    seat: "💺",
    helicopter: "🚁",
    suspension_railway: "🚟",
    mountain_cableway: "🚠",
    aerial_tramway: "🚡",
    artificial_satellite: "🛰️",
    rocket: "🚀",
    flying_saucer: "🛸",
    bellhop_bell: "🛎️",
    luggage: "🧳",
    hourglass: "⌛",
    hourglass_flowing_sand: "⏳",
    watch: "⌚",
    alarm_clock: "⏰",
    stopwatch: "⏱️",
    timer_clock: "⏲️",
    mantelpiece_clock: "🕰️",
    clock12: "🕛",
    clock1230: "🕧",
    clock1: "🕐",
    clock130: "🕜",
    clock2: "🕑",
    clock230: "🕝",
    clock3: "🕒",
    clock330: "🕞",
    clock4: "🕓",
    clock430: "🕟",
    clock5: "🕔",
    clock530: "🕠",
    clock6: "🕕",
    clock630: "🕡",
    clock7: "🕖",
    clock730: "🕢",
    clock8: "🕗",
    clock830: "🕣",
    clock9: "🕘",
    clock930: "🕤",
    clock10: "🕙",
    clock1030: "🕥",
    clock11: "🕚",
    clock1130: "🕦",
    new_moon: "🌑",
    waxing_crescent_moon: "🌒",
    first_quarter_moon: "🌓",
    moon: "🌔",
    waxing_gibbous_moon: "🌔",
    full_moon: "🌕",
    waning_gibbous_moon: "🌖",
    last_quarter_moon: "🌗",
    waning_crescent_moon: "🌘",
    crescent_moon: "🌙",
    new_moon_with_face: "🌚",
    first_quarter_moon_with_face: "🌛",
    last_quarter_moon_with_face: "🌜",
    thermometer: "🌡️",
    sunny: "☀️",
    full_moon_with_face: "🌝",
    sun_with_face: "🌞",
    ringed_planet: "🪐",
    star: "⭐",
    star2: "🌟",
    stars: "🌠",
    milky_way: "🌌",
    cloud: "☁️",
    partly_sunny: "⛅",
    cloud_with_lightning_and_rain: "⛈️",
    sun_behind_small_cloud: "🌤️",
    sun_behind_large_cloud: "🌥️",
    sun_behind_rain_cloud: "🌦️",
    cloud_with_rain: "🌧️",
    cloud_with_snow: "🌨️",
    cloud_with_lightning: "🌩️",
    tornado: "🌪️",
    fog: "🌫️",
    wind_face: "🌬️",
    cyclone: "🌀",
    rainbow: "🌈",
    closed_umbrella: "🌂",
    open_umbrella: "☂️",
    umbrella: "☔",
    parasol_on_ground: "⛱️",
    zap: "⚡",
    snowflake: "❄️",
    snowman_with_snow: "☃️",
    snowman: "⛄",
    comet: "☄️",
    fire: "🔥",
    droplet: "💧",
    ocean: "🌊",
    jack_o_lantern: "🎃",
    christmas_tree: "🎄",
    fireworks: "🎆",
    sparkler: "🎇",
    firecracker: "🧨",
    sparkles: "✨",
    balloon: "🎈",
    tada: "🎉",
    confetti_ball: "🎊",
    tanabata_tree: "🎋",
    bamboo: "🎍",
    dolls: "🎎",
    flags: "🎏",
    wind_chime: "🎐",
    rice_scene: "🎑",
    red_envelope: "🧧",
    ribbon: "🎀",
    gift: "🎁",
    reminder_ribbon: "🎗️",
    tickets: "🎟️",
    ticket: "🎫",
    medal_military: "🎖️",
    trophy: "🏆",
    medal_sports: "🏅",
    "1st_place_medal": "🥇",
    "2nd_place_medal": "🥈",
    "3rd_place_medal": "🥉",
    soccer: "⚽",
    baseball: "⚾",
    softball: "🥎",
    basketball: "🏀",
    volleyball: "🏐",
    football: "🏈",
    rugby_football: "🏉",
    tennis: "🎾",
    flying_disc: "🥏",
    bowling: "🎳",
    cricket_game: "🏏",
    field_hockey: "🏑",
    ice_hockey: "🏒",
    lacrosse: "🥍",
    ping_pong: "🏓",
    badminton: "🏸",
    boxing_glove: "🥊",
    martial_arts_uniform: "🥋",
    goal_net: "🥅",
    golf: "⛳",
    ice_skate: "⛸️",
    fishing_pole_and_fish: "🎣",
    diving_mask: "🤿",
    running_shirt_with_sash: "🎽",
    ski: "🎿",
    sled: "🛷",
    curling_stone: "🥌",
    dart: "🎯",
    yo_yo: "🪀",
    kite: "🪁",
    gun: "🔫",
    "8ball": "🎱",
    crystal_ball: "🔮",
    magic_wand: "🪄",
    video_game: "🎮",
    joystick: "🕹️",
    slot_machine: "🎰",
    game_die: "🎲",
    jigsaw: "🧩",
    teddy_bear: "🧸",
    pinata: "🪅",
    mirror_ball: "🪩",
    nesting_dolls: "🪆",
    spades: "♠️",
    hearts: "♥️",
    diamonds: "♦️",
    clubs: "♣️",
    chess_pawn: "♟️",
    black_joker: "🃏",
    mahjong: "🀄",
    flower_playing_cards: "🎴",
    performing_arts: "🎭",
    framed_picture: "🖼️",
    art: "🎨",
    thread: "🧵",
    sewing_needle: "🪡",
    yarn: "🧶",
    knot: "🪢",
    eyeglasses: "👓",
    dark_sunglasses: "🕶️",
    goggles: "🥽",
    lab_coat: "🥼",
    safety_vest: "🦺",
    necktie: "👔",
    shirt: "👕",
    tshirt: "👕",
    jeans: "👖",
    scarf: "🧣",
    gloves: "🧤",
    coat: "🧥",
    socks: "🧦",
    dress: "👗",
    kimono: "👘",
    sari: "🥻",
    one_piece_swimsuit: "🩱",
    swim_brief: "🩲",
    shorts: "🩳",
    bikini: "👙",
    womans_clothes: "👚",
    folding_hand_fan: "🪭",
    purse: "👛",
    handbag: "👜",
    pouch: "👝",
    shopping: "🛍️",
    school_satchel: "🎒",
    thong_sandal: "🩴",
    mans_shoe: "👞",
    shoe: "👞",
    athletic_shoe: "👟",
    hiking_boot: "🥾",
    flat_shoe: "🥿",
    high_heel: "👠",
    sandal: "👡",
    ballet_shoes: "🩰",
    boot: "👢",
    hair_pick: "🪮",
    crown: "👑",
    womans_hat: "👒",
    tophat: "🎩",
    mortar_board: "🎓",
    billed_cap: "🧢",
    military_helmet: "🪖",
    rescue_worker_helmet: "⛑️",
    prayer_beads: "📿",
    lipstick: "💄",
    ring: "💍",
    gem: "💎",
    mute: "🔇",
    speaker: "🔈",
    sound: "🔉",
    loud_sound: "🔊",
    loudspeaker: "📢",
    mega: "📣",
    postal_horn: "📯",
    bell: "🔔",
    no_bell: "🔕",
    musical_score: "🎼",
    musical_note: "🎵",
    notes: "🎶",
    studio_microphone: "🎙️",
    level_slider: "🎚️",
    control_knobs: "🎛️",
    microphone: "🎤",
    headphones: "🎧",
    radio: "📻",
    saxophone: "🎷",
    accordion: "🪗",
    guitar: "🎸",
    musical_keyboard: "🎹",
    trumpet: "🎺",
    violin: "🎻",
    banjo: "🪕",
    drum: "🥁",
    long_drum: "🪘",
    maracas: "🪇",
    flute: "🪈",
    iphone: "📱",
    calling: "📲",
    phone: "☎️",
    telephone: "☎️",
    telephone_receiver: "📞",
    pager: "📟",
    fax: "📠",
    battery: "🔋",
    low_battery: "🪫",
    electric_plug: "🔌",
    computer: "💻",
    desktop_computer: "🖥️",
    printer: "🖨️",
    keyboard: "⌨️",
    computer_mouse: "🖱️",
    trackball: "🖲️",
    minidisc: "💽",
    floppy_disk: "💾",
    cd: "💿",
    dvd: "📀",
    abacus: "🧮",
    movie_camera: "🎥",
    film_strip: "🎞️",
    film_projector: "📽️",
    clapper: "🎬",
    tv: "📺",
    camera: "📷",
    camera_flash: "📸",
    video_camera: "📹",
    vhs: "📼",
    mag: "🔍",
    mag_right: "🔎",
    candle: "🕯️",
    bulb: "💡",
    flashlight: "🔦",
    izakaya_lantern: "🏮",
    lantern: "🏮",
    diya_lamp: "🪔",
    notebook_with_decorative_cover: "📔",
    closed_book: "📕",
    book: "📖",
    open_book: "📖",
    green_book: "📗",
    blue_book: "📘",
    orange_book: "📙",
    books: "📚",
    notebook: "📓",
    ledger: "📒",
    page_with_curl: "📃",
    scroll: "📜",
    page_facing_up: "📄",
    newspaper: "📰",
    newspaper_roll: "🗞️",
    bookmark_tabs: "📑",
    bookmark: "🔖",
    label: "🏷️",
    moneybag: "💰",
    coin: "🪙",
    yen: "💴",
    dollar: "💵",
    euro: "💶",
    pound: "💷",
    money_with_wings: "💸",
    credit_card: "💳",
    receipt: "🧾",
    chart: "💹",
    envelope: "✉️",
    email: "📧",
    "e-mail": "📧",
    incoming_envelope: "📨",
    envelope_with_arrow: "📩",
    outbox_tray: "📤",
    inbox_tray: "📥",
    package: "📦",
    mailbox: "📫",
    mailbox_closed: "📪",
    mailbox_with_mail: "📬",
    mailbox_with_no_mail: "📭",
    postbox: "📮",
    ballot_box: "🗳️",
    pencil2: "✏️",
    black_nib: "✒️",
    fountain_pen: "🖋️",
    pen: "🖊️",
    paintbrush: "🖌️",
    crayon: "🖍️",
    memo: "📝",
    pencil: "📝",
    briefcase: "💼",
    file_folder: "📁",
    open_file_folder: "📂",
    card_index_dividers: "🗂️",
    date: "📅",
    calendar: "📆",
    spiral_notepad: "🗒️",
    spiral_calendar: "🗓️",
    card_index: "📇",
    chart_with_upwards_trend: "📈",
    chart_with_downwards_trend: "📉",
    bar_chart: "📊",
    clipboard: "📋",
    pushpin: "📌",
    round_pushpin: "📍",
    paperclip: "📎",
    paperclips: "🖇️",
    straight_ruler: "📏",
    triangular_ruler: "📐",
    scissors: "✂️",
    card_file_box: "🗃️",
    file_cabinet: "🗄️",
    wastebasket: "🗑️",
    lock: "🔒",
    unlock: "🔓",
    lock_with_ink_pen: "🔏",
    closed_lock_with_key: "🔐",
    key: "🔑",
    old_key: "🗝️",
    hammer: "🔨",
    axe: "🪓",
    pick: "⛏️",
    hammer_and_pick: "⚒️",
    hammer_and_wrench: "🛠️",
    dagger: "🗡️",
    crossed_swords: "⚔️",
    bomb: "💣",
    boomerang: "🪃",
    bow_and_arrow: "🏹",
    shield: "🛡️",
    carpentry_saw: "🪚",
    wrench: "🔧",
    screwdriver: "🪛",
    nut_and_bolt: "🔩",
    gear: "⚙️",
    clamp: "🗜️",
    balance_scale: "⚖️",
    probing_cane: "🦯",
    link: "🔗",
    chains: "⛓️",
    hook: "🪝",
    toolbox: "🧰",
    magnet: "🧲",
    ladder: "🪜",
    alembic: "⚗️",
    test_tube: "🧪",
    petri_dish: "🧫",
    dna: "🧬",
    microscope: "🔬",
    telescope: "🔭",
    satellite: "📡",
    syringe: "💉",
    drop_of_blood: "🩸",
    pill: "💊",
    adhesive_bandage: "🩹",
    crutch: "🩼",
    stethoscope: "🩺",
    x_ray: "🩻",
    door: "🚪",
    elevator: "🛗",
    mirror: "🪞",
    window: "🪟",
    bed: "🛏️",
    couch_and_lamp: "🛋️",
    chair: "🪑",
    toilet: "🚽",
    plunger: "🪠",
    shower: "🚿",
    bathtub: "🛁",
    mouse_trap: "🪤",
    razor: "🪒",
    lotion_bottle: "🧴",
    safety_pin: "🧷",
    broom: "🧹",
    basket: "🧺",
    roll_of_paper: "🧻",
    bucket: "🪣",
    soap: "🧼",
    bubbles: "🫧",
    toothbrush: "🪥",
    sponge: "🧽",
    fire_extinguisher: "🧯",
    shopping_cart: "🛒",
    smoking: "🚬",
    coffin: "⚰️",
    headstone: "🪦",
    funeral_urn: "⚱️",
    nazar_amulet: "🧿",
    hamsa: "🪬",
    moyai: "🗿",
    placard: "🪧",
    identification_card: "🪪",
    atm: "🏧",
    put_litter_in_its_place: "🚮",
    potable_water: "🚰",
    wheelchair: "♿",
    mens: "🚹",
    womens: "🚺",
    restroom: "🚻",
    baby_symbol: "🚼",
    wc: "🚾",
    passport_control: "🛂",
    customs: "🛃",
    baggage_claim: "🛄",
    left_luggage: "🛅",
    warning: "⚠️",
    children_crossing: "🚸",
    no_entry: "⛔",
    no_entry_sign: "🚫",
    no_bicycles: "🚳",
    no_smoking: "🚭",
    do_not_litter: "🚯",
    "non-potable_water": "🚱",
    no_pedestrians: "🚷",
    no_mobile_phones: "📵",
    underage: "🔞",
    radioactive: "☢️",
    biohazard: "☣️",
    arrow_up: "⬆️",
    arrow_upper_right: "↗️",
    arrow_right: "➡️",
    arrow_lower_right: "↘️",
    arrow_down: "⬇️",
    arrow_lower_left: "↙️",
    arrow_left: "⬅️",
    arrow_upper_left: "↖️",
    arrow_up_down: "↕️",
    left_right_arrow: "↔️",
    leftwards_arrow_with_hook: "↩️",
    arrow_right_hook: "↪️",
    arrow_heading_up: "⤴️",
    arrow_heading_down: "⤵️",
    arrows_clockwise: "🔃",
    arrows_counterclockwise: "🔄",
    back: "🔙",
    end: "🔚",
    on: "🔛",
    soon: "🔜",
    top: "🔝",
    place_of_worship: "🛐",
    atom_symbol: "⚛️",
    om: "🕉️",
    star_of_david: "✡️",
    wheel_of_dharma: "☸️",
    yin_yang: "☯️",
    latin_cross: "✝️",
    orthodox_cross: "☦️",
    star_and_crescent: "☪️",
    peace_symbol: "☮️",
    menorah: "🕎",
    six_pointed_star: "🔯",
    khanda: "🪯",
    aries: "♈",
    taurus: "♉",
    gemini: "♊",
    cancer: "♋",
    leo: "♌",
    virgo: "♍",
    libra: "♎",
    scorpius: "♏",
    sagittarius: "♐",
    capricorn: "♑",
    aquarius: "♒",
    pisces: "♓",
    ophiuchus: "⛎",
    twisted_rightwards_arrows: "🔀",
    repeat: "🔁",
    repeat_one: "🔂",
    arrow_forward: "▶️",
    fast_forward: "⏩",
    next_track_button: "⏭️",
    play_or_pause_button: "⏯️",
    arrow_backward: "◀️",
    rewind: "⏪",
    previous_track_button: "⏮️",
    arrow_up_small: "🔼",
    arrow_double_up: "⏫",
    arrow_down_small: "🔽",
    arrow_double_down: "⏬",
    pause_button: "⏸️",
    stop_button: "⏹️",
    record_button: "⏺️",
    eject_button: "⏏️",
    cinema: "🎦",
    low_brightness: "🔅",
    high_brightness: "🔆",
    signal_strength: "📶",
    wireless: "🛜",
    vibration_mode: "📳",
    mobile_phone_off: "📴",
    female_sign: "♀️",
    male_sign: "♂️",
    transgender_symbol: "⚧️",
    heavy_multiplication_x: "✖️",
    heavy_plus_sign: "➕",
    heavy_minus_sign: "➖",
    heavy_division_sign: "➗",
    heavy_equals_sign: "🟰",
    infinity: "♾️",
    bangbang: "‼️",
    interrobang: "⁉️",
    question: "❓",
    grey_question: "❔",
    grey_exclamation: "❕",
    exclamation: "❗",
    heavy_exclamation_mark: "❗",
    wavy_dash: "〰️",
    currency_exchange: "💱",
    heavy_dollar_sign: "💲",
    medical_symbol: "⚕️",
    recycle: "♻️",
    fleur_de_lis: "⚜️",
    trident: "🔱",
    name_badge: "📛",
    beginner: "🔰",
    o: "⭕",
    white_check_mark: "✅",
    ballot_box_with_check: "☑️",
    heavy_check_mark: "✔️",
    x: "❌",
    negative_squared_cross_mark: "❎",
    curly_loop: "➰",
    loop: "➿",
    part_alternation_mark: "〽️",
    eight_spoked_asterisk: "✳️",
    eight_pointed_black_star: "✴️",
    sparkle: "❇️",
    copyright: "©️",
    registered: "®️",
    tm: "™️",
    hash: "#️⃣",
    asterisk: "*️⃣",
    zero: "0️⃣",
    one: "1️⃣",
    two: "2️⃣",
    three: "3️⃣",
    four: "4️⃣",
    five: "5️⃣",
    six: "6️⃣",
    seven: "7️⃣",
    eight: "8️⃣",
    nine: "9️⃣",
    keycap_ten: "🔟",
    capital_abcd: "🔠",
    abcd: "🔡",
    symbols: "🔣",
    abc: "🔤",
    a: "🅰️",
    ab: "🆎",
    b: "🅱️",
    cl: "🆑",
    cool: "🆒",
    free: "🆓",
    information_source: "ℹ️",
    id: "🆔",
    m: "Ⓜ️",
    new: "🆕",
    ng: "🆖",
    o2: "🅾️",
    ok: "🆗",
    parking: "🅿️",
    sos: "🆘",
    up: "🆙",
    vs: "🆚",
    koko: "🈁",
    sa: "🈂️",
    ideograph_advantage: "🉐",
    accept: "🉑",
    congratulations: "㊗️",
    secret: "㊙️",
    u6e80: "🈵",
    red_circle: "🔴",
    orange_circle: "🟠",
    yellow_circle: "🟡",
    green_circle: "🟢",
    large_blue_circle: "🔵",
    purple_circle: "🟣",
    brown_circle: "🟤",
    black_circle: "⚫",
    white_circle: "⚪",
    red_square: "🟥",
    orange_square: "🟧",
    yellow_square: "🟨",
    green_square: "🟩",
    blue_square: "🟦",
    purple_square: "🟪",
    brown_square: "🟫",
    black_large_square: "⬛",
    white_large_square: "⬜",
    black_medium_square: "◼️",
    white_medium_square: "◻️",
    black_medium_small_square: "◾",
    white_medium_small_square: "◽",
    black_small_square: "▪️",
    white_small_square: "▫️",
    large_orange_diamond: "🔶",
    large_blue_diamond: "🔷",
    small_orange_diamond: "🔸",
    small_blue_diamond: "🔹",
    small_red_triangle: "🔺",
    small_red_triangle_down: "🔻",
    diamond_shape_with_a_dot_inside: "💠",
    radio_button: "🔘",
    white_square_button: "🔳",
    black_square_button: "🔲",
    checkered_flag: "🏁",
    triangular_flag_on_post: "🚩",
    crossed_flags: "🎌",
    black_flag: "🏴",
    white_flag: "🏳️",
    rainbow_flag: "🏳️‍🌈",
    transgender_flag: "🏳️‍⚧️",
    pirate_flag: "🏴‍☠️",
    ascension_island: "🇦🇨",
    andorra: "🇦🇩",
    united_arab_emirates: "🇦🇪",
    afghanistan: "🇦🇫",
    antigua_barbuda: "🇦🇬",
    anguilla: "🇦🇮",
    albania: "🇦🇱",
    armenia: "🇦🇲",
    angola: "🇦🇴",
    antarctica: "🇦🇶",
    argentina: "🇦🇷",
    american_samoa: "🇦🇸",
    austria: "🇦🇹",
    australia: "🇦🇺",
    aruba: "🇦🇼",
    aland_islands: "🇦🇽",
    azerbaijan: "🇦🇿",
    bosnia_herzegovina: "🇧🇦",
    barbados: "🇧🇧",
    bangladesh: "🇧🇩",
    belgium: "🇧🇪",
    burkina_faso: "🇧🇫",
    bulgaria: "🇧🇬",
    bahrain: "🇧🇭",
    burundi: "🇧🇮",
    benin: "🇧🇯",
    st_barthelemy: "🇧🇱",
    bermuda: "🇧🇲",
    brunei: "🇧🇳",
    bolivia: "🇧🇴",
    caribbean_netherlands: "🇧🇶",
    brazil: "🇧🇷",
    bahamas: "🇧🇸",
    bhutan: "🇧🇹",
    bouvet_island: "🇧🇻",
    botswana: "🇧🇼",
    belarus: "🇧🇾",
    belize: "🇧🇿",
    canada: "🇨🇦",
    cocos_islands: "🇨🇨",
    congo_kinshasa: "🇨🇩",
    central_african_republic: "🇨🇫",
    congo_brazzaville: "🇨🇬",
    switzerland: "🇨🇭",
    cote_divoire: "🇨🇮",
    cook_islands: "🇨🇰",
    chile: "🇨🇱",
    cameroon: "🇨🇲",
    cn: "🇨🇳",
    colombia: "🇨🇴",
    clipperton_island: "🇨🇵",
    costa_rica: "🇨🇷",
    cuba: "🇨🇺",
    cape_verde: "🇨🇻",
    curacao: "🇨🇼",
    christmas_island: "🇨🇽",
    cyprus: "🇨🇾",
    czech_republic: "🇨🇿",
    de: "🇩🇪",
    diego_garcia: "🇩🇬",
    djibouti: "🇩🇯",
    denmark: "🇩🇰",
    dominica: "🇩🇲",
    dominican_republic: "🇩🇴",
    algeria: "🇩🇿",
    ceuta_melilla: "🇪🇦",
    ecuador: "🇪🇨",
    estonia: "🇪🇪",
    egypt: "🇪🇬",
    western_sahara: "🇪🇭",
    eritrea: "🇪🇷",
    es: "🇪🇸",
    ethiopia: "🇪🇹",
    eu: "🇪🇺",
    european_union: "🇪🇺",
    finland: "🇫🇮",
    fiji: "🇫🇯",
    falkland_islands: "🇫🇰",
    micronesia: "🇫🇲",
    faroe_islands: "🇫🇴",
    fr: "🇫🇷",
    gabon: "🇬🇦",
    gb: "🇬🇧",
    uk: "🇬🇧",
    grenada: "🇬🇩",
    georgia: "🇬🇪",
    french_guiana: "🇬🇫",
    guernsey: "🇬🇬",
    ghana: "🇬🇭",
    gibraltar: "🇬🇮",
    greenland: "🇬🇱",
    gambia: "🇬🇲",
    guinea: "🇬🇳",
    guadeloupe: "🇬🇵",
    equatorial_guinea: "🇬🇶",
    greece: "🇬🇷",
    south_georgia_south_sandwich_islands: "🇬🇸",
    guatemala: "🇬🇹",
    guam: "🇬🇺",
    guinea_bissau: "🇬🇼",
    guyana: "🇬🇾",
    hong_kong: "🇭🇰",
    heard_mcdonald_islands: "🇭🇲",
    honduras: "🇭🇳",
    croatia: "🇭🇷",
    haiti: "🇭🇹",
    hungary: "🇭🇺",
    canary_islands: "🇮🇨",
    indonesia: "🇮🇩",
    ireland: "🇮🇪",
    israel: "🇮🇱",
    isle_of_man: "🇮🇲",
    india: "🇮🇳",
    british_indian_ocean_territory: "🇮🇴",
    iraq: "🇮🇶",
    iran: "🇮🇷",
    iceland: "🇮🇸",
    it: "🇮🇹",
    jersey: "🇯🇪",
    jamaica: "🇯🇲",
    jordan: "🇯🇴",
    jp: "🇯🇵",
    kenya: "🇰🇪",
    kyrgyzstan: "🇰🇬",
    cambodia: "🇰🇭",
    kiribati: "🇰🇮",
    comoros: "🇰🇲",
    st_kitts_nevis: "🇰🇳",
    north_korea: "🇰🇵",
    kr: "🇰🇷",
    kuwait: "🇰🇼",
    cayman_islands: "🇰🇾",
    kazakhstan: "🇰🇿",
    laos: "🇱🇦",
    lebanon: "🇱🇧",
    st_lucia: "🇱🇨",
    liechtenstein: "🇱🇮",
    sri_lanka: "🇱🇰",
    liberia: "🇱🇷",
    lesotho: "🇱🇸",
    lithuania: "🇱🇹",
    luxembourg: "🇱🇺",
    latvia: "🇱🇻",
    libya: "🇱🇾",
    morocco: "🇲🇦",
    monaco: "🇲🇨",
    moldova: "🇲🇩",
    montenegro: "🇲🇪",
    st_martin: "🇲🇫",
    madagascar: "🇲🇬",
    marshall_islands: "🇲🇭",
    macedonia: "🇲🇰",
    mali: "🇲🇱",
    myanmar: "🇲🇲",
    mongolia: "🇲🇳",
    macau: "🇲🇴",
    northern_mariana_islands: "🇲🇵",
    martinique: "🇲🇶",
    mauritania: "🇲🇷",
    montserrat: "🇲🇸",
    malta: "🇲🇹",
    mauritius: "🇲🇺",
    maldives: "🇲🇻",
    malawi: "🇲🇼",
    mexico: "🇲🇽",
    malaysia: "🇲🇾",
    mozambique: "🇲🇿",
    namibia: "🇳🇦",
    new_caledonia: "🇳🇨",
    niger: "🇳🇪",
    norfolk_island: "🇳🇫",
    nigeria: "🇳🇬",
    nicaragua: "🇳🇮",
    netherlands: "🇳🇱",
    norway: "🇳🇴",
    nepal: "🇳🇵",
    nauru: "🇳🇷",
    niue: "🇳🇺",
    new_zealand: "🇳🇿",
    oman: "🇴🇲",
    panama: "🇵🇦",
    peru: "🇵🇪",
    french_polynesia: "🇵🇫",
    papua_new_guinea: "🇵🇬",
    philippines: "🇵🇭",
    pakistan: "🇵🇰",
    poland: "🇵🇱",
    st_pierre_miquelon: "🇵🇲",
    pitcairn_islands: "🇵🇳",
    puerto_rico: "🇵🇷",
    palestinian_territories: "🇵🇸",
    portugal: "🇵🇹",
    palau: "🇵🇼",
    paraguay: "🇵🇾",
    qatar: "🇶🇦",
    reunion: "🇷🇪",
    romania: "🇷🇴",
    serbia: "🇷🇸",
    ru: "🇷🇺",
    rwanda: "🇷🇼",
    saudi_arabia: "🇸🇦",
    solomon_islands: "🇸🇧",
    seychelles: "🇸🇨",
    sudan: "🇸🇩",
    sweden: "🇸🇪",
    singapore: "🇸🇬",
    st_helena: "🇸🇭",
    slovenia: "🇸🇮",
    svalbard_jan_mayen: "🇸🇯",
    slovakia: "🇸🇰",
    sierra_leone: "🇸🇱",
    san_marino: "🇸🇲",
    senegal: "🇸🇳",
    somalia: "🇸🇴",
    suriname: "🇸🇷",
    south_sudan: "🇸🇸",
    sao_tome_principe: "🇸🇹",
    el_salvador: "🇸🇻",
    sint_maarten: "🇸🇽",
    syria: "🇸🇾",
    swaziland: "🇸🇿",
    tristan_da_cunha: "🇹🇦",
    turks_caicos_islands: "🇹🇨",
    chad: "🇹🇩",
    french_southern_territories: "🇹🇫",
    togo: "🇹🇬",
    thailand: "🇹🇭",
    tajikistan: "🇹🇯",
    tokelau: "🇹🇰",
    timor_leste: "🇹🇱",
    turkmenistan: "🇹🇲",
    tunisia: "🇹🇳",
    tonga: "🇹🇴",
    tr: "🇹🇷",
    trinidad_tobago: "🇹🇹",
    tuvalu: "🇹🇻",
    taiwan: "🇹🇼",
    tanzania: "🇹🇿",
    ukraine: "🇺🇦",
    uganda: "🇺🇬",
    us_outlying_islands: "🇺🇲",
    united_nations: "🇺🇳",
    us: "🇺🇸",
    uruguay: "🇺🇾",
    uzbekistan: "🇺🇿",
    vatican_city: "🇻🇦",
    st_vincent_grenadines: "🇻🇨",
    venezuela: "🇻🇪",
    british_virgin_islands: "🇻🇬",
    us_virgin_islands: "🇻🇮",
    vietnam: "🇻🇳",
    vanuatu: "🇻🇺",
    wallis_futuna: "🇼🇫",
    samoa: "🇼🇸",
    kosovo: "🇽🇰",
    yemen: "🇾🇪",
    mayotte: "🇾🇹",
    south_africa: "🇿🇦",
    zambia: "🇿🇲",
    zimbabwe: "🇿🇼",
    england: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿"
  };

  // node_modules/markdown-it-emoji/lib/full.mjs
  function emoji_plugin2(md2, options) {
    let opts = Object.assign({}, {
      defs: full_default,
      shortcuts: shortcuts_default,
      enabled: []
    }, options || {});
    emoji_plugin(md2, opts);
  }

  // src/core/markdown.ts
  function slugify(text3) {
    return text3.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s/g, "-");
  }
  function normalize2(text3) {
    return text3.replace(/\s+/g, " ").trim();
  }
  var VOID_TAGS = /* @__PURE__ */ new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
  function isBalancedHtml(html) {
    let stack = [], tagStart = /<(\/?)([a-zA-Z][\w:-]*)/y, at = 0;
    for (; at < html.length; ) {
      let open = html.indexOf("<", at);
      if (open === -1) break;
      if (html.startsWith("<!--", open)) {
        let close = html.indexOf("-->", open + 4);
        if (close === -1) break;
        at = close + 3;
        continue;
      }
      tagStart.lastIndex = open;
      let m = tagStart.exec(html);
      if (!m) {
        at = open + 1;
        continue;
      }
      let end = html.indexOf(">", tagStart.lastIndex);
      if (end === -1) break;
      at = end + 1;
      let name = m[2].toLowerCase();
      if (!(VOID_TAGS.has(name) || html[end - 1] === "/"))
        if (m[1]) {
          if (stack.pop() !== name) return !1;
        } else
          stack.push(name);
    }
    return stack.length === 0;
  }
  function isCommentOnly(html) {
    let at = 0, found = !1;
    for (; ; ) {
      for (; at < html.length && /\s/.test(html[at]); ) at++;
      if (at === html.length) return found;
      if (!html.startsWith("<!--", at)) return !1;
      let close = html.indexOf("-->", at + 4);
      if (close === -1) return !1;
      at = close + 3, found = !0;
    }
  }
  function escapeHtml2(text3) {
    return text3.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  }
  function longestRun(text3, char) {
    let best = 0, run = 0;
    for (let c of text3)
      run = c === char ? run + 1 : 0, best = Math.max(best, run);
    return best;
  }
  function inlineText(token) {
    return token.children.map((c) => c.type === "text" || c.type === "code_inline" ? c.content : "").join("");
  }
  function linkTargets(tokens, from, to) {
    let out = [];
    for (let i = from; i < to; i++)
      for (let c of tokens[i].children ?? [])
        c.type === "link_open" ? out.push(String(c.attrGet("href"))) : c.type === "image" && out.push(String(c.attrGet("src")));
    return out;
  }
  function addUnit(env, token, kind, text3, level, source, links = []) {
    let id = env.units.length, norm = normalize2(text3), exact = kind === "code" || kind === "html" ? text3.replace(/\n+$/, "") : norm;
    env.units.push({
      id,
      kind,
      key: `${kind}${level || ""}:${exact}${links.length ? `\0${links.join("")}` : ""}`,
      text: norm,
      lines: [token.map[0], token.map[1]],
      inList: env.listDepth > 0,
      level,
      source,
      links
    }), token.attrSet("data-mr-u", `${env.nonce}:${id}`);
  }
  function annotateUnits(state) {
    let env = state.env, tokens = state.tokens;
    env.listDepth = 0;
    for (let i = 0; i < tokens.length; i++) {
      let t = tokens[i];
      switch (t.type) {
        case "bullet_list_open":
        case "ordered_list_open":
          env.listDepth++;
          break;
        case "bullet_list_close":
        case "ordered_list_close":
          env.listDepth--;
          break;
        case "heading_open": {
          let level = Number(t.tag.slice(1)), content = tokens[i + 1].content;
          addUnit(env, t, "heading", content, level, `${"#".repeat(level)} ${content}`, linkTargets(tokens, i + 1, i + 2));
          let base = slugify(inlineText(tokens[i + 1])) || "section", seen = env.slugs.get(base) ?? 0;
          env.slugs.set(base, seen + 1), t.attrSet("id", seen ? `${base}-${seen}` : base);
          break;
        }
        case "paragraph_open": {
          let content = tokens[i + 1].content;
          addUnit(env, t, "paragraph", content, 0, content, linkTargets(tokens, i + 1, i + 2));
          break;
        }
        case "fence": {
          let fence2 = "`".repeat(Math.max(3, longestRun(t.content, "`") + 1));
          addUnit(env, t, "code", `${t.info}
${t.content}`, 0, `${fence2}${t.info}
${t.content}${fence2}`);
          break;
        }
        case "code_block":
          addUnit(env, t, "code", t.content, 0, `\`\`\`
${t.content}\`\`\``);
          break;
        case "table_open": {
          let src = env.lines.slice(t.map[0], t.map[1]).join(`
`), standalone = src.split(`
`).map((l) => l.replace(/^\s*(?:>\s?)*\s*/, "")).join(`
`), close = i;
          for (; close < tokens.length && tokens[close].type !== "table_close"; ) close++;
          addUnit(env, t, "table", src, 0, standalone, linkTargets(tokens, i, close));
          break;
        }
        case "html_block":
          !isCommentOnly(t.content) && isBalancedHtml(t.content) && addUnit(env, t, "html", t.content, 0, t.content);
          break;
        case "hr":
          addUnit(env, t, "rule", "---", 0, "---");
          break;
      }
    }
  }
  function taskLists(state) {
    let tokens = state.tokens;
    for (let i = 2; i < tokens.length; i++) {
      let inline2 = tokens[i];
      if (inline2.type !== "inline" || tokens[i - 1].type !== "paragraph_open" || tokens[i - 2].type !== "list_item_open") continue;
      let first = inline2.children?.[0], m = first?.type === "text" ? /^\[([ xX])\][ \t]+/.exec(first.content) : null;
      if (!first || !m) continue;
      first.content = first.content.slice(m[0].length);
      let box = new state.Token("html_inline", "", 0);
      box.content = `<input type="checkbox" class="mr-task" disabled${m[1] === " " ? "" : " checked"}>`, inline2.children.unshift(box), tokens[i - 2].attrJoin("class", "mr-task-item");
    }
  }
  function alerts(state) {
    let tokens = state.tokens;
    for (let i = 0; i + 2 < tokens.length; i++) {
      if (tokens[i].type !== "blockquote_open" || tokens[i + 1].type !== "paragraph_open") continue;
      let children = tokens[i + 2].children, first = children[0], m = first.type === "text" ? /^\[!(note|tip|important|warning|caution)\][ \t]*/i.exec(first.content) : null;
      if (!m) continue;
      let kind = m[1].toLowerCase();
      tokens[i].attrJoin("class", `mr-alert mr-alert-${kind}`), first.content = first.content.slice(m[0].length), first.content || children.splice(0, children[1]?.type === "softbreak" ? 2 : 1);
    }
  }
  function createMarkdown() {
    let md2 = MarkdownItCallable({ html: !0, linkify: !0, typographer: !0 });
    md2.disable("replacements"), md2.use(footnote_plugin), md2.use(emoji_plugin2, { shortcuts: {} }), md2.core.ruler.push("mr_tasks", taskLists), md2.core.ruler.push("mr_alerts", alerts), md2.core.ruler.push("mr_units", annotateUnits);
    let rules = md2.renderer.rules, unitAttr = (t) => ` data-mr-u="${t.attrGet("data-mr-u")}"`;
    return rules.paragraph_open = (tokens, idx, options, _env, self) => tokens[idx].hidden ? `<span class="mr-tight"${unitAttr(tokens[idx])}>` : self.renderToken(tokens, idx, options), rules.paragraph_close = (tokens, idx, options, _env, self) => tokens[idx].hidden ? "</span>" : self.renderToken(tokens, idx, options), rules.fence = (tokens, idx) => {
      let t = tokens[idx], lang = t.info.trim().split(/\s+/)[0], langAttr = lang ? ` data-lang="${escapeHtml2(lang)}"` : "";
      return `<pre${unitAttr(t)}${langAttr}><code>${escapeHtml2(t.content)}</code></pre>
`;
    }, rules.code_block = (tokens, idx) => `<pre${unitAttr(tokens[idx])}><code>${escapeHtml2(tokens[idx].content)}</code></pre>
`, rules.table_open = (tokens, idx) => `<div class="mr-table"${unitAttr(tokens[idx])}><table>
`, rules.table_close = () => `</table></div>
`, rules.html_block = (tokens, idx) => {
      let t = tokens[idx];
      return t.attrGet("data-mr-u") === null ? t.content : `<div class="mr-html"${unitAttr(t)}>${t.content}</div>
`;
    }, md2;
  }
  var md = createMarkdown();

  // src/core/architecture.ts
  var MAX_CONFIG_CHARS = 256e3;

  // src/ui/sandbox-frame.ts
  var queue = Promise.resolve();
  function serve(port, accept, handle) {
    port.onmessage = ({ data }) => {
      accept(data) && (queue = queue.then(async () => {
        let reply;
        try {
          reply = { ...await handle(data), id: data.id };
        } catch {
          reply = { id: data.id, error: !0 };
        }
        port.postMessage(reply);
      }));
    };
  }
  function listen(onPort) {
    addEventListener("message", (event) => {
      let [port] = event.ports;
      port && onPort(port);
    });
  }

  // src/ui/config-frame.ts
  var MAX_DECLARED = 400, FORMATS = ["compose", "workflow", "gitlab-ci", "kubernetes", "terraform"], GITLAB_KEYWORDS = /* @__PURE__ */ new Set(["stages", "variables", "default", "include", "workflow", "image", "services", "before_script", "after_script", "cache"]), Reader = class {
    items = [];
    links = [];
    notes = [];
    seen = /* @__PURE__ */ new Set();
    lines;
    // Plain fields rather than parameter properties, so Node can load this file as it is (scripts/repo-report.mjs).
    constructor(lines) {
      this.lines = lines;
    }
    /** Every node read from the file carries its source range. */
    line(node) {
      return this.lines.linePos(node.range[0]).line;
    }
    item(key, name, kind, line, detail = "") {
      if (!this.seen.has(key)) {
        if (this.seen.add(key), this.items.length + this.links.length >= MAX_DECLARED) throw new RangeError("too many declarations");
        this.items.push({ key, name, kind, line, detail });
      }
    }
    link(from, to, label, line) {
      if (this.items.length + this.links.length >= MAX_DECLARED) throw new RangeError("too many declarations");
      this.links.push({ from, to, label, line });
    }
  }, text2 = (node) => isScalar(node) && node.value !== null && typeof node.value != "object" ? String(node.value) : null;
  function get(node, key) {
    return isMap(node) ? node.get(key, !0) : void 0;
  }
  function pairs2(node) {
    return isMap(node) ? node.items : [];
  }
  function names(node, field) {
    let one = (value) => {
      let name = text2(value) ?? (field ? text2(get(value, field)) : null);
      return name === null ? [] : [{ name, node: value }];
    };
    return isSeq(node) ? node.items.flatMap(one) : one(node);
  }
  function environment(read, node, from, line) {
    let name = text2(node) ?? text2(get(node, "name"));
    name !== null && (read.item(`environment:${name}`, name, "environment", read.line(node)), read.link(from, `environment:${name}`, "deploys to", line));
  }
  function compose(read, root) {
    let services = get(root, "services");
    if (!isMap(services)) {
      read.notes.push("No services are declared.");
      return;
    }
    for (let { key, value } of pairs2(services)) {
      let name = text2(key);
      if (name === null) continue;
      let line = read.line(key), image2 = text2(get(value, "image"));
      read.item(`service:${name}`, name, "service", line, image2 ? `image ${image2}` : get(value, "build") ? "built from the repository" : "");
      let dependsOn = get(value, "depends_on"), targets = isMap(dependsOn) ? pairs2(dependsOn).map((pair) => ({ name: text2(pair.key), node: pair.key })) : names(dependsOn);
      for (let target of targets) target.name !== null && read.link(`service:${name}`, `service:${target.name}`, "depends on", read.line(target.node));
    }
  }
  function workflow(read, root, path) {
    let file = path.slice(path.lastIndexOf("/") + 1), title = text2(get(root, "name")) ?? file, self = `workflow:${path}`;
    read.item(self, title, "workflow", 1, file);
    let jobs = get(root, "jobs");
    for (let { key, value } of pairs2(jobs)) {
      let id = text2(key);
      if (id === null) continue;
      let job = `job:${path}:${id}`, line = read.line(key);
      read.item(job, id, "job", line, text2(get(value, "name")) ?? ""), read.link(self, job, "runs", line);
      for (let need of names(get(value, "needs"))) read.link(job, `job:${path}:${need.name}`, "needs", read.line(need.node));
      environment(read, get(value, "environment"), job, line);
    }
    isMap(jobs) || read.notes.push("No jobs are declared.");
  }
  function gitlabCi(read, root, path) {
    get(root, "include") !== void 0 && read.notes.push("Included files are not read.");
    for (let { key, value } of pairs2(root)) {
      let id = text2(key);
      if (id === null || GITLAB_KEYWORDS.has(id) || id.startsWith(".") || !isMap(value)) continue;
      let job = `job:${path}:${id}`, line = read.line(key), stage = text2(get(value, "stage"));
      read.item(job, id, "job", line, stage ? `stage ${stage}` : ""), stage && (read.item(`stage:${stage}`, stage, "stage", read.line(get(value, "stage"))), read.link(job, `stage:${stage}`, "in stage", line));
      for (let need of names(get(value, "needs"), "job")) read.link(job, `job:${path}:${need.name}`, "needs", read.line(need.node));
      environment(read, get(value, "environment"), job, line);
    }
  }
  function kubernetes(read, root) {
    let kind = text2(get(root, "kind")), metadata = get(root, "metadata"), name = text2(get(metadata, "name"));
    if (!kind || !name || !text2(get(root, "apiVersion"))) return;
    let namespace = text2(get(metadata, "namespace"));
    read.item(`workload:${namespace ?? "default"}/${kind}/${name}`, name, "workload", read.line(root), `${kind}${namespace ? ` in ${namespace}` : ""}`);
  }
  function terraform(read, source, path) {
    let folder = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ".";
    source.split(`
`).forEach((line, i) => {
      let resource = /^\s*resource\s+"([\w-]+)"\s+"([\w-]+)"/.exec(line);
      resource && read.item(`resource:${folder}/${resource[1]}.${resource[2]}`, `${resource[1]}.${resource[2]}`, "resource", i + 1, resource[1]);
      let module = /^\s*module\s+"([\w-]+)"/.exec(line);
      module && read.item(`module:${folder}/${module[1]}`, module[1], "module", i + 1);
    }), read.notes.push("References between Terraform resources are not read.");
  }
  function readConfig(path, format2, source) {
    let lines = new LineCounter(), read = new Reader(lines);
    try {
      if (format2 === "terraform") terraform(read, source, path);
      else {
        let usable = parseAllDocuments(source, { lineCounter: lines, prettyErrors: !1, uniqueKeys: !1 }).filter((doc) => !doc.errors.length);
        if (!usable.length) return { items: [], links: [], notes: ["This file could not be read as YAML."] };
        for (let doc of usable) {
          let root = doc.contents;
          format2 === "compose" ? compose(read, root) : format2 === "workflow" ? workflow(read, root, path) : format2 === "gitlab-ci" ? gitlabCi(read, root, path) : kubernetes(read, root);
        }
        format2 === "kubernetes" && !read.items.length && read.notes.push("No Kubernetes objects are declared.");
      }
    } catch {
      read.notes.push(`Only the first ${MAX_DECLARED} declarations are read.`);
    }
    return { items: read.items, links: read.links, notes: read.notes };
  }
  function isConfigRequest(data) {
    let request = data;
    return typeof request?.id == "number" && typeof request.path == "string" && request.path.length <= 1e3 && FORMATS.includes(request.format) && typeof request.text == "string" && request.text.length <= MAX_CONFIG_CHARS;
  }
  function serveConfigs(port) {
    serve(port, isConfigRequest, async ({ path, format: format2, text: text3 }) => ({ reading: readConfig(path, format2, text3) }));
  }
  listen(serveConfigs);
})();
/*! Bundled license information:

markdown-it/dist/markdown-it.mjs:
  (*! markdown-it 15.0.2 https://github.com/markdown-it/markdown-it @license MIT *)
*/
