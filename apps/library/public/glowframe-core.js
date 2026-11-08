// ../../node_modules/.pnpm/zod@3.24.2/node_modules/zod/lib/index.mjs
var util;
(function(util2) {
  util2.assertEqual = (val) => val;
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
        fieldErrors[sub.path[0]].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var overrideErrorMap = errorMap;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === errorMap ? void 0 : errorMap
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message === null || message === void 0 ? void 0 : message.message;
})(errorUtil || (errorUtil = {}));
var _ZodEnum_cache;
var _ZodNativeEnum_cache;
var ParseInputLazyPath = class {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (this._key instanceof Array) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    var _a, _b;
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message !== null && message !== void 0 ? message : ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: (_a = message !== null && message !== void 0 ? message : required_error) !== null && _a !== void 0 ? _a : ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: (_b = message !== null && message !== void 0 ? message : invalid_type_error) !== null && _b !== void 0 ? _b : ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    var _a;
    const ctx = {
      common: {
        issues: [],
        async: (_a = params === null || params === void 0 ? void 0 : params.async) !== null && _a !== void 0 ? _a : false,
        contextualErrorMap: params === null || params === void 0 ? void 0 : params.errorMap
      },
      path: (params === null || params === void 0 ? void 0 : params.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    var _a, _b;
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if ((_b = (_a = err === null || err === void 0 ? void 0 : err.message) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === null || _b === void 0 ? void 0 : _b.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params === null || params === void 0 ? void 0 : params.errorMap,
        async: true
      },
      path: (params === null || params === void 0 ? void 0 : params.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let regex = `([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d`;
  if (args.precision) {
    regex = `${regex}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    regex = `${regex}(\\.\\d+)?`;
  }
  return regex;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if (!decoded.typ || !decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch (_a) {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch (_a) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    var _a, _b;
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof (options === null || options === void 0 ? void 0 : options.precision) === "undefined" ? null : options === null || options === void 0 ? void 0 : options.precision,
      offset: (_a = options === null || options === void 0 ? void 0 : options.offset) !== null && _a !== void 0 ? _a : false,
      local: (_b = options === null || options === void 0 ? void 0 : options.local) !== null && _b !== void 0 ? _b : false,
      ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof (options === null || options === void 0 ? void 0 : options.precision) === "undefined" ? null : options === null || options === void 0 ? void 0 : options.precision,
      ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options === null || options === void 0 ? void 0 : options.position,
      ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  var _a;
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: (_a = params === null || params === void 0 ? void 0 : params.coerce) !== null && _a !== void 0 ? _a : false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / Math.pow(10, decCount);
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null, min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch (_a) {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  var _a;
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: (_a = params === null || params === void 0 ? void 0 : params.coerce) !== null && _a !== void 0 ? _a : false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    return this._cached = { shape, keys };
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") ;
      else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          var _a, _b, _c, _d;
          const defaultError = (_c = (_b = (_a = this._def).errorMap) === null || _b === void 0 ? void 0 : _b.call(_a, issue, ctx).message) !== null && _c !== void 0 ? _c : ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: (_d = errorUtil.errToObj(message).message) !== null && _d !== void 0 ? _d : defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    util.objectKeys(mask).forEach((key) => {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    util.objectKeys(this.shape).forEach((key) => {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    util.objectKeys(this.shape).forEach((key) => {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    util.objectKeys(this.shape).forEach((key) => {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [
          ctx.common.contextualErrorMap,
          ctx.schemaErrorMap,
          getErrorMap(),
          errorMap
        ].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [
          ctx.common.contextualErrorMap,
          ctx.schemaErrorMap,
          getErrorMap(),
          errorMap
        ].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  constructor() {
    super(...arguments);
    _ZodEnum_cache.set(this, void 0);
  }
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f")) {
      __classPrivateFieldSet(this, _ZodEnum_cache, new Set(this._def.values), "f");
    }
    if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f").has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
_ZodEnum_cache = /* @__PURE__ */ new WeakMap();
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  constructor() {
    super(...arguments);
    _ZodNativeEnum_cache.set(this, void 0);
  }
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f")) {
      __classPrivateFieldSet(this, _ZodNativeEnum_cache, new Set(util.getValidEnumValues(this._def.values)), "f");
    }
    if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f").has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
_ZodNativeEnum_cache = /* @__PURE__ */ new WeakMap();
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return base;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return base;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({ status: status.value, value: result }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      var _a, _b;
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          var _a2, _b2;
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = (_b2 = (_a2 = params.fatal) !== null && _a2 !== void 0 ? _a2 : fatal) !== null && _b2 !== void 0 ? _b2 : true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = (_b = (_a = params.fatal) !== null && _a !== void 0 ? _a : fatal) !== null && _b !== void 0 ? _b : true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;
var z = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  defaultErrorMap: errorMap,
  setErrorMap,
  getErrorMap,
  makeIssue,
  EMPTY_PATH,
  addIssueToContext,
  ParseStatus,
  INVALID,
  DIRTY,
  OK,
  isAborted,
  isDirty,
  isValid,
  isAsync,
  get util() {
    return util;
  },
  get objectUtil() {
    return objectUtil;
  },
  ZodParsedType,
  getParsedType,
  ZodType,
  datetimeRegex,
  ZodString,
  ZodNumber,
  ZodBigInt,
  ZodBoolean,
  ZodDate,
  ZodSymbol,
  ZodUndefined,
  ZodNull,
  ZodAny,
  ZodUnknown,
  ZodNever,
  ZodVoid,
  ZodArray,
  ZodObject,
  ZodUnion,
  ZodDiscriminatedUnion,
  ZodIntersection,
  ZodTuple,
  ZodRecord,
  ZodMap,
  ZodSet,
  ZodFunction,
  ZodLazy,
  ZodLiteral,
  ZodEnum,
  ZodNativeEnum,
  ZodPromise,
  ZodEffects,
  ZodTransformer: ZodEffects,
  ZodOptional,
  ZodNullable,
  ZodDefault,
  ZodCatch,
  ZodNaN,
  BRAND,
  ZodBranded,
  ZodPipeline,
  ZodReadonly,
  custom,
  Schema: ZodType,
  ZodSchema: ZodType,
  late,
  get ZodFirstPartyTypeKind() {
    return ZodFirstPartyTypeKind;
  },
  coerce,
  any: anyType,
  array: arrayType,
  bigint: bigIntType,
  boolean: booleanType,
  date: dateType,
  discriminatedUnion: discriminatedUnionType,
  effect: effectsType,
  "enum": enumType,
  "function": functionType,
  "instanceof": instanceOfType,
  intersection: intersectionType,
  lazy: lazyType,
  literal: literalType,
  map: mapType,
  nan: nanType,
  nativeEnum: nativeEnumType,
  never: neverType,
  "null": nullType,
  nullable: nullableType,
  number: numberType,
  object: objectType,
  oboolean,
  onumber,
  optional: optionalType,
  ostring,
  pipeline: pipelineType,
  preprocess: preprocessType,
  promise: promiseType,
  record: recordType,
  set: setType,
  strictObject: strictObjectType,
  string: stringType,
  symbol: symbolType,
  transformer: effectsType,
  tuple: tupleType,
  "undefined": undefinedType,
  union: unionType,
  unknown: unknownType,
  "void": voidType,
  NEVER,
  ZodIssueCode,
  quotelessJson,
  ZodError
});

// ../../node_modules/.pnpm/zod-to-json-schema@3.24.3_zod@3.24.2/node_modules/zod-to-json-schema/dist/esm/Options.js
var ignoreOverride = Symbol("Let zodToJsonSchema decide on which parser to use");

// ../../node_modules/.pnpm/zod-to-json-schema@3.24.3_zod@3.24.2/node_modules/zod-to-json-schema/dist/esm/parsers/string.js
var ALPHA_NUMERIC = new Set("ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvxyz0123456789");

// ../schema/dist/index.js
var CURRENT_SCHEMA_VERSION = 1;
var MetaSchema = z.object({
  id: z.string().min(1).regex(
    /^[a-z0-9-_]+$/,
    "ID must consist of lowercase alphanumeric, hyphens, and underscores"
  ),
  name: z.string().min(1),
  author: z.string().min(1),
  license: z.string().min(1),
  tags: z.array(z.string()).default([]),
  description: z.string().optional(),
  previewImage: z.string().optional()
}).describe("Scene metadata and licensing");
var BackgroundSchema = z.object({
  color: z.string().min(1).default("#000000").describe("Background color in hex, rgb, or oklch format"),
  haze: z.object({
    intensity: z.number().min(0).max(2).default(0.6).describe("Volumetric haze intensity"),
    color: z.string().optional().describe("Optional haze tint color")
  }).default({ intensity: 0.6 })
}).describe("Background styling and haze effect");
var BaseShapeProps = {
  position: z.tuple([
    z.number().min(0).max(1).describe("Normalized center X coordinate"),
    z.number().min(0).max(1).describe("Normalized center Y coordinate")
  ]).default([0.5, 0.5]),
  scale: z.number().min(0.01).max(2).default(0.3).describe("Shape scale relative to canvas short dimension"),
  rotation: z.number().min(-360).max(360).default(0).describe("Rotation in degrees")
};
var PresetShapeTypeSchema = z.enum([
  "triangle",
  "hexagon",
  "circle",
  "rounded-rect",
  "star",
  "polygon"
]);
var PresetShapeSchema = z.object({
  type: z.literal("preset"),
  preset: PresetShapeTypeSchema,
  sides: z.number().int().min(3).max(32).optional().describe("Number of sides for polygon"),
  cornerRadius: z.number().min(0).max(0.5).optional().describe("Normalized corner radius for rounded shapes"),
  ...BaseShapeProps
}).describe("Built-in geometric preset shape");
var SvgPathShapeSchema = z.object({
  type: z.literal("svg-path"),
  d: z.string().min(1).describe("SVG path data string (d attribute)"),
  viewBox: z.tuple([
    z.number().describe("viewBox min-x"),
    z.number().describe("viewBox min-y"),
    z.number().positive().describe("viewBox width"),
    z.number().positive().describe("viewBox height")
  ]).describe("SVG viewBox [minX, minY, width, height]"),
  ...BaseShapeProps
}).describe("Vector shape defined by raw SVG path data");
var SvgFileShapeSchema = z.object({
  type: z.literal("svg-file"),
  asset: z.string().min(1).describe("Relative path or asset identifier for the SVG file"),
  viewBox: z.tuple([z.number(), z.number(), z.number().positive(), z.number().positive()]).optional().describe("Optional explicit viewBox override"),
  ...BaseShapeProps
}).describe("Vector shape loaded from an SVG file");
var TextShapeSchema = z.object({
  type: z.literal("text"),
  text: z.string().min(1).describe("Text content to render as shape silhouette"),
  font: z.string().default("sans-serif").describe("Font family or specifier for rendering text"),
  fontWeight: z.string().optional().describe("CSS font weight"),
  ...BaseShapeProps
}).describe("Silhouette shape generated from text");
var ShapeSchema = z.discriminatedUnion("type", [
  PresetShapeSchema,
  SvgPathShapeSchema,
  SvgFileShapeSchema,
  TextShapeSchema
]).describe("The silhouette shape at the center of the scene");
var CenterContentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("image"),
    asset: z.string().min(1).describe("Path to image asset"),
    tint: z.string().nullable().optional().describe("Optional color tint overlay"),
    scale: z.number().min(0.01).max(2).default(0.6).describe("Content scale relative to shape interior"),
    opacity: z.number().min(0).max(1).default(1)
  }),
  z.object({
    type: z.literal("svg"),
    asset: z.string().min(1).describe("Path to SVG asset"),
    tint: z.string().nullable().optional().describe("Optional color tint overlay"),
    scale: z.number().min(0.01).max(2).default(0.6).describe("Content scale relative to shape interior"),
    opacity: z.number().min(0).max(1).default(1)
  }),
  z.object({
    type: z.literal("text"),
    text: z.string().min(1).describe("Interior text message or symbol"),
    fontFamily: z.string().default("sans-serif"),
    tint: z.string().nullable().optional(),
    scale: z.number().min(0.01).max(2).default(0.6),
    opacity: z.number().min(0).max(1).default(1)
  })
]).nullable().describe("Optional content inside the shape interior mask");
var FillSchema = z.object({
  color: z.string().min(1).default("#000000").describe("Base interior color, default pure black"),
  content: CenterContentSchema.default(null)
}).describe("Shape interior fill configuration");
var EdgeSchema = z.object({
  width: z.number().min(1e-4).max(0.05).default(4e-3).describe("Core rim line width in normalized units"),
  falloff: z.number().min(1e-3).max(0.5).default(0.09).describe("Glow exponential falloff distance"),
  intensity: z.number().min(0).max(5).default(1).describe("Overall glow brightness multiplier"),
  dispersion: z.number().min(0).max(2).default(0.35).describe("Prism dispersion spread along the perimeter")
}).describe("Rim glow and light emission properties");
var PaletteSchema = z.array(z.string().min(1)).min(2, "Each palette must contain at least 2 color stops").describe("A color palette represented as an ordered array of color strings (OKLCH recommended)");
var PalettesSchema = z.array(PaletteSchema).min(1, "Scene must provide at least one palette").describe("List of available color palettes for cycle/transitions");
var BaseModeIdSchema = z.enum([
  "glow",
  "pulse",
  "rotate",
  "spectrum-cycle",
  "flicker",
  "sweep",
  "orbit"
]);
var ModeSchema = z.object({
  id: BaseModeIdSchema.or(z.string().min(1)).describe("Base animation mode identifier"),
  params: z.record(z.unknown()).default({}).describe("Mode-specific continuous animation parameters")
}).describe("Base continuous animation mode");
var ModifierSchema = z.object({
  id: z.string().min(1).describe("Modifier effect identifier"),
  params: z.record(z.unknown()).default({}).describe("Modifier parameters")
}).describe("Secondary continuous effect modifier");
var InteractionSchema = z.object({
  followCursor: z.boolean().default(true).describe("Whether cursor position directs rim lighting"),
  sharpness: z.number().min(0.1).max(10).default(3).describe("Specular highlight focus sharpness"),
  smoothing: z.number().min(0.01).max(1).default(0.12).describe("Cursor interpolation smoothing factor"),
  idleOrbit: z.boolean().default(true).describe("Whether to ease to idle light orbit when inactive"),
  idleTimeoutMs: z.number().int().min(500).max(6e4).default(3e3).describe("Inactivity timeout before idle orbit starts")
}).describe("Interactive pointer illumination settings");
var ClickActionIdSchema = z.enum([
  "next-palette",
  "random-palette",
  "ripple",
  "burst",
  "next-mode",
  "toggle-content",
  "none"
]);
var ClickActionItemSchema = z.object({
  action: ClickActionIdSchema.or(z.string().min(1)).describe("Action identifier to trigger"),
  params: z.record(z.unknown()).optional().describe("Optional parameters for the click action")
}).describe("Click event action entry");
var OnClickSchema = z.object({
  object: z.array(ClickActionItemSchema).default([]).describe("Actions executed on clicking inside the shape silhouette"),
  background: z.array(ClickActionItemSchema).default([]).describe("Actions executed on clicking the background")
}).describe("Click event bindings");
var PerformanceSchema = z.object({
  fpsCap: z.number().int().min(10).max(144).default(60).describe("Target frames per second cap"),
  resolutionScale: z.number().min(0.25).max(1).default(1).describe("Rendering resolution scale relative to canvas physical size")
}).describe("Rendering performance targets");
var SceneSchemaV1 = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  meta: MetaSchema,
  background: BackgroundSchema,
  shape: ShapeSchema,
  fill: FillSchema,
  edge: EdgeSchema,
  palettes: PalettesSchema,
  mode: ModeSchema,
  modifiers: z.array(ModifierSchema).default([]),
  interaction: InteractionSchema,
  onClick: OnClickSchema,
  performance: PerformanceSchema
}).describe("Glowframe Scene v1 Specification");
var SceneValidationError = class _SceneValidationError extends Error {
  issues;
  constructor(message, issues = []) {
    super(message);
    this.name = "SceneValidationError";
    this.issues = issues;
    Object.setPrototypeOf(this, _SceneValidationError.prototype);
  }
};
var UnsupportedVersionError = class _UnsupportedVersionError extends Error {
  receivedVersion;
  supportedVersions;
  constructor(receivedVersion, supportedVersions) {
    super(
      `Unsupported schemaVersion: ${String(receivedVersion)}. Supported versions: ${supportedVersions.join(", ")}`
    );
    this.name = "UnsupportedVersionError";
    this.receivedVersion = receivedVersion;
    this.supportedVersions = supportedVersions;
    Object.setPrototypeOf(this, _UnsupportedVersionError.prototype);
  }
};
function parseScene(raw) {
  if (typeof raw !== "object" || raw === null) {
    throw new SceneValidationError("Scene must be an object", [
      { path: "", message: "Expected object, received " + typeof raw }
    ]);
  }
  const rawObj = raw;
  const version = rawObj["schemaVersion"];
  if (version !== CURRENT_SCHEMA_VERSION) {
    throw new UnsupportedVersionError(version, [CURRENT_SCHEMA_VERSION]);
  }
  const result = SceneSchemaV1.safeParse(raw);
  if (!result.success) {
    const issues = formatZodIssues(result.error);
    const readable = issues.map((i) => `  - [${i.path || "root"}]: ${i.message}`).join("\n");
    throw new SceneValidationError(`Invalid scene schema:
${readable}`, issues);
  }
  return result.data;
}
function formatZodIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));
}
var exampleScene = {
  schemaVersion: 1,
  meta: {
    id: "triangle-prism",
    name: "Prism Triangle",
    author: "Your Name",
    license: "CC0-1.0",
    tags: ["minimal", "dark", "triangle"]
  },
  background: {
    color: "#000000",
    haze: {
      intensity: 0.6
    }
  },
  shape: {
    type: "preset",
    preset: "triangle",
    position: [0.5, 0.52],
    scale: 0.28,
    rotation: 0
  },
  fill: {
    color: "#000000",
    content: null
  },
  edge: {
    width: 4e-3,
    falloff: 0.09,
    intensity: 1,
    dispersion: 0.35
  },
  palettes: [
    ["oklch(0.75 0.2 350)", "oklch(0.7 0.2 290)", "oklch(0.7 0.18 250)", "oklch(0.8 0.2 150)"],
    ["oklch(0.8 0.18 80)", "oklch(0.7 0.22 40)", "oklch(0.65 0.25 20)"]
  ],
  mode: {
    id: "glow",
    params: {}
  },
  modifiers: [],
  interaction: {
    followCursor: true,
    sharpness: 3,
    smoothing: 0.12,
    idleOrbit: true,
    idleTimeoutMs: 3e3
  },
  onClick: {
    object: [{ action: "next-palette" }, { action: "ripple" }],
    background: []
  },
  performance: {
    fpsCap: 30,
    resolutionScale: 0.5
  }
};

// src/clock.ts
var SystemClock = class {
  now() {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
  }
};
var ManualClock = class {
  currentTime;
  constructor(initialTimeMs = 0) {
    this.currentTime = initialTimeMs;
  }
  now() {
    return this.currentTime;
  }
  set(timeMs) {
    this.currentTime = timeMs;
  }
  advance(deltaMs) {
    this.currentTime += deltaMs;
  }
};

// src/input/noop.ts
var NoopInput = class {
  subscribe(_handlers) {
    return () => {
    };
  }
};

// src/errors.ts
var UnsupportedError = class _UnsupportedError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnsupportedError";
    Object.setPrototypeOf(this, _UnsupportedError.prototype);
  }
};
var WebGLContextLostError = class _WebGLContextLostError extends Error {
  constructor(message = "WebGL2 context lost") {
    super(message);
    this.name = "WebGLContextLostError";
    Object.setPrototypeOf(this, _WebGLContextLostError.prototype);
  }
};
var RenderError = class _RenderError extends Error {
  constructor(message) {
    super(message);
    this.name = "RenderError";
    Object.setPrototypeOf(this, _RenderError.prototype);
  }
};
var AssetLoadError = class _AssetLoadError extends Error {
  constructor(message) {
    super(message);
    this.name = "AssetLoadError";
    Object.setPrototypeOf(this, _AssetLoadError.prototype);
  }
};
var ShapeRasterizationError = class _ShapeRasterizationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ShapeRasterizationError";
    Object.setPrototypeOf(this, _ShapeRasterizationError.prototype);
  }
};

// src/gl/context.ts
function getWebGL2Context(canvas, attrs) {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
    ...attrs
  });
  if (!gl) {
    throw new UnsupportedError(
      "WebGL2 is not supported or could not be initialized on this canvas"
    );
  }
  return gl;
}

// src/gl/quad.ts
function createQuadMesh(gl) {
  const vao = gl.createVertexArray();
  const vbo = gl.createBuffer();
  if (!vao || !vbo) {
    if (vao) gl.deleteVertexArray(vao);
    if (vbo) gl.deleteBuffer(vbo);
    throw new Error("Failed to allocate WebGL quad geometry buffers");
  }
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  const vertices = new Float32Array([
    -1,
    -1,
    1,
    -1,
    -1,
    1,
    -1,
    1,
    1,
    -1,
    1,
    1
  ]);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return {
    vao,
    vbo,
    draw() {
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindVertexArray(null);
    },
    dispose() {
      gl.deleteBuffer(vbo);
      gl.deleteVertexArray(vao);
    }
  };
}

// src/gl/texture.ts
function createR8Texture(gl, width, height, data) {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("Failed to create WebGL texture");
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, width, height, 0, gl.RED, gl.UNSIGNED_BYTE, data);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return {
    texture,
    bind(unit = 0) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    },
    updateData(w, h, newData) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, w, h, 0, gl.RED, gl.UNSIGNED_BYTE, newData);
      gl.bindTexture(gl.TEXTURE_2D, null);
    },
    dispose() {
      gl.deleteTexture(texture);
    }
  };
}
function createRgbaTexture(gl, width, height, data) {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("Failed to create WebGL RGBA texture");
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    data ?? null
  );
  gl.bindTexture(gl.TEXTURE_2D, null);
  return {
    texture,
    bind(unit = 0) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    },
    updateData(w, h, newData) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, newData);
      gl.bindTexture(gl.TEXTURE_2D, null);
    },
    dispose() {
      gl.deleteTexture(texture);
    }
  };
}

// src/color/oklch.ts
function srgbToLinear(c) {
  if (c <= 0) return 0;
  if (c >= 1) return 1;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function oklabToLinearSrgb(L, a, b, out) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  const r = 4.0767434729 * l - 3.3077115913 * m + 0.2309699291 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const target = out ?? [0, 0, 0];
  target[0] = Math.max(0, Math.min(1, r));
  target[1] = Math.max(0, Math.min(1, g));
  target[2] = Math.max(0, Math.min(1, bl));
  return target;
}
function linearSrgbToOklab(r, g, b, out) {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a_ = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const b_ = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const target = out ?? [0, 0, 0];
  target[0] = L;
  target[1] = a_;
  target[2] = b_;
  return target;
}
function oklchToOklab(L, C, H, out) {
  const rad = H * Math.PI / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);
  const target = out ?? [0, 0, 0];
  target[0] = L;
  target[1] = a;
  target[2] = b;
  return target;
}
function parseColorToOklab(colorStr) {
  const str = colorStr.trim().toLowerCase();
  const oklchMatch = str.match(
    /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?(?:\s*\/\s*([\d.]+)(%?))?\s*\)$/
  );
  if (oklchMatch) {
    const rawL = parseFloat(oklchMatch[1]);
    const isLPercent = oklchMatch[2] === "%";
    const L = isLPercent ? rawL / 100 : rawL;
    const C = parseFloat(oklchMatch[3]);
    const H = parseFloat(oklchMatch[4]);
    const alphaStr = oklchMatch[5];
    const alpha = alphaStr !== void 0 ? oklchMatch[6] === "%" ? parseFloat(alphaStr) / 100 : parseFloat(alphaStr) : 1;
    const [labL, a, b] = oklchToOklab(L, C, H);
    return { L: labL, a, b, alpha };
  }
  if (str.startsWith("#")) {
    const hex = str.slice(1);
    let r = 0, g = 0, b = 0, a = 1;
    if (hex.length === 3 || hex.length === 4) {
      r = parseInt(hex[0] + hex[0], 16) / 255;
      g = parseInt(hex[1] + hex[1], 16) / 255;
      b = parseInt(hex[2] + hex[2], 16) / 255;
      if (hex.length === 4) a = parseInt(hex[3] + hex[3], 16) / 255;
    } else if (hex.length === 6 || hex.length === 8) {
      r = parseInt(hex.slice(0, 2), 16) / 255;
      g = parseInt(hex.slice(2, 4), 16) / 255;
      b = parseInt(hex.slice(4, 6), 16) / 255;
      if (hex.length === 8) a = parseInt(hex.slice(6, 8), 16) / 255;
    }
    const linR = srgbToLinear(r);
    const linG = srgbToLinear(g);
    const linB = srgbToLinear(b);
    const [labL, labA, labB] = linearSrgbToOklab(linR, linG, linB);
    return { L: labL, a: labA, b: labB, alpha: a };
  }
  const rgbMatch = str.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/
  );
  if (rgbMatch) {
    const r = parseFloat(rgbMatch[1]) / 255;
    const g = parseFloat(rgbMatch[2]) / 255;
    const b = parseFloat(rgbMatch[3]) / 255;
    const a = rgbMatch[4] !== void 0 ? parseFloat(rgbMatch[4]) : 1;
    const linR = srgbToLinear(r);
    const linG = srgbToLinear(g);
    const linB = srgbToLinear(b);
    const [labL, labA, labB] = linearSrgbToOklab(linR, linG, linB);
    return { L: labL, a: labA, b: labB, alpha: a };
  }
  return { L: 1, a: 0, b: 0, alpha: 1 };
}
function parseColorToLinearSrgb(colorStr) {
  const oklab = parseColorToOklab(colorStr);
  const [r, g, b] = oklabToLinearSrgb(oklab.L, oklab.a, oklab.b);
  return [r, g, b, oklab.alpha];
}
function samplePaletteLinear(paletteOklab, t, out) {
  const target = out ?? [0, 0, 0, 1];
  const count = paletteOklab.length;
  if (count === 0) {
    target[0] = 1;
    target[1] = 1;
    target[2] = 1;
    target[3] = 1;
    return target;
  }
  if (count === 1) {
    const c = paletteOklab[0];
    const [r2, g2, b2] = oklabToLinearSrgb(c.L, c.a, c.b);
    target[0] = r2;
    target[1] = g2;
    target[2] = b2;
    target[3] = c.alpha;
    return target;
  }
  const normT = (t % 1 + 1) % 1;
  const scaled = normT * count;
  const idx0 = Math.floor(scaled) % count;
  const idx1 = (idx0 + 1) % count;
  const frac = scaled - Math.floor(scaled);
  const c0 = paletteOklab[idx0];
  const c1 = paletteOklab[idx1];
  const L = c0.L + frac * (c1.L - c0.L);
  const a = c0.a + frac * (c1.a - c0.a);
  const b = c0.b + frac * (c1.b - c0.b);
  const alpha = c0.alpha + frac * (c1.alpha - c0.alpha);
  const [r, g, bl] = oklabToLinearSrgb(L, a, b);
  target[0] = r;
  target[1] = g;
  target[2] = bl;
  target[3] = alpha;
  return target;
}

// src/shape/rasterize.ts
function getTriangleVertices(size = 0.7) {
  const h = size * (Math.sqrt(3) / 2);
  const topY = 0.5 - 2 / 3 * h;
  const bottomY = 0.5 + 1 / 3 * h;
  const leftX = 0.5 - size / 2;
  const rightX = 0.5 + size / 2;
  return [
    [0.5, topY],
    [rightX, bottomY],
    [leftX, bottomY]
  ];
}
function getStarVertices(points = 5, outerRadius = 0.35, innerRadius = 0.17) {
  const vertices = [];
  const totalPoints = points * 2;
  for (let i = 0; i < totalPoints; i++) {
    const angle = i * Math.PI / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    vertices.push([0.5 + r * Math.cos(angle), 0.5 + r * Math.sin(angle)]);
  }
  return vertices;
}
function getRegularPolygonVertices(sides = 6, radius = 0.35) {
  const vertices = [];
  for (let i = 0; i < sides; i++) {
    const angle = i * 2 * Math.PI / sides - Math.PI / 2;
    vertices.push([0.5 + radius * Math.cos(angle), 0.5 + radius * Math.sin(angle)]);
  }
  return vertices;
}
function rasterizePolygon(vertices, width = 1024, height = 1024) {
  const mask = new Uint8Array(width * height);
  const n = vertices.length;
  if (n < 3) return { width, height, mask };
  const scaled = vertices.map(([x, y]) => [x * width, y * height]);
  for (let y = 0; y < height; y++) {
    const py = y + 0.5;
    for (let x = 0; x < width; x++) {
      const px = x + 0.5;
      let inside = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = scaled[i][0];
        const yi = scaled[i][1];
        const xj = scaled[j][0];
        const yj = scaled[j][1];
        const intersect = yi > py !== yj > py && px < (xj - xi) * (py - yi) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }
      if (inside) {
        mask[y * width + x] = 1;
      }
    }
  }
  return { width, height, mask };
}
function rasterizeCircle(radius = 0.35, width = 1024, height = 1024) {
  const mask = new Uint8Array(width * height);
  const cx = width * 0.5;
  const cy = height * 0.5;
  const rPx = radius * Math.min(width, height);
  const rSq = rPx * rPx;
  for (let y = 0; y < height; y++) {
    const dy = y + 0.5 - cy;
    const dySq = dy * dy;
    for (let x = 0; x < width; x++) {
      const dx = x + 0.5 - cx;
      if (dx * dx + dySq <= rSq) {
        mask[y * width + x] = 1;
      }
    }
  }
  return { width, height, mask };
}
function rasterizeRoundedRect(rectWidth = 0.65, rectHeight = 0.65, cornerRadius = 0.1, width = 1024, height = 1024) {
  const mask = new Uint8Array(width * height);
  const halfW = rectWidth * width / 2;
  const halfH = rectHeight * height / 2;
  const rPx = cornerRadius * Math.min(width, height);
  const cx = width * 0.5;
  const cy = height * 0.5;
  for (let y = 0; y < height; y++) {
    const dy = Math.abs(y + 0.5 - cy);
    for (let x = 0; x < width; x++) {
      const dx = Math.abs(x + 0.5 - cx);
      if (dx <= halfW && dy <= halfH) {
        const cornerDx = dx - (halfW - rPx);
        const cornerDy = dy - (halfH - rPx);
        if (cornerDx > 0 && cornerDy > 0) {
          if (cornerDx * cornerDx + cornerDy * cornerDy <= rPx * rPx) {
            mask[y * width + x] = 1;
          }
        } else {
          mask[y * width + x] = 1;
        }
      }
    }
  }
  return { width, height, mask };
}
function parseSvgString(svgContent) {
  const trimmed = svgContent.trim();
  if (!trimmed || !trimmed.includes("<svg") && !trimmed.includes("<path")) {
    throw new AssetLoadError("Invalid SVG content: missing <svg> or <path> elements");
  }
  let viewBox = [0, 0, 100, 100];
  const vbMatch = trimmed.match(
    /viewBox=["']\s*([-\d.]+)[,\s]+([-\d.]+)[,\s]+([-\d.]+)[,\s]+([-\d.]+)["']/i
  );
  if (vbMatch) {
    const minX = parseFloat(vbMatch[1]);
    const minY = parseFloat(vbMatch[2]);
    const w = parseFloat(vbMatch[3]);
    const h = parseFloat(vbMatch[4]);
    if (!isNaN(minX) && !isNaN(minY) && w > 0 && h > 0) {
      viewBox = [minX, minY, w, h];
    }
  } else {
    const wMatch = trimmed.match(/width=["']\s*([-\d.]+)\s*(?:px)?["']/i);
    const hMatch = trimmed.match(/height=["']\s*([-\d.]+)\s*(?:px)?["']/i);
    if (wMatch && hMatch) {
      const w = parseFloat(wMatch[1]);
      const h = parseFloat(hMatch[1]);
      if (w > 0 && h > 0) {
        viewBox = [0, 0, w, h];
      }
    }
  }
  const paths = [];
  const pathRegex = /<path[^>]*\bd=["']([^"']+)["']/gi;
  let match;
  while ((match = pathRegex.exec(trimmed)) !== null) {
    if (match[1] && match[1].trim().length > 0) {
      paths.push(match[1].trim());
    }
  }
  if (paths.length === 0) {
    const singlePathMatch = trimmed.match(/^M\s*[-\d.]+/i);
    if (singlePathMatch) {
      paths.push(trimmed);
    } else {
      throw new AssetLoadError("Failed to parse SVG: no valid path elements found");
    }
  }
  return { viewBox, paths };
}
function create2DCanvas(width, height) {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (ctx) return { canvas, ctx };
  }
  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) return { canvas, ctx };
  }
  return null;
}
function rasterizeSvgPathWithCanvas(d, viewBox, width, height) {
  const canvasObj = create2DCanvas(width, height);
  if (!canvasObj) {
    throw new AssetLoadError("Canvas 2D context unavailable for SVG path rasterization");
  }
  const { ctx } = canvasObj;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);
  const [minX, minY, vbWidth, vbHeight] = viewBox;
  if (vbWidth <= 0 || vbHeight <= 0) {
    throw new AssetLoadError(`Invalid viewBox dimensions: ${vbWidth}x${vbHeight}`);
  }
  const targetSize = width * 0.72;
  const scale = Math.min(targetSize / vbWidth, targetSize / vbHeight);
  const offsetX = (width - vbWidth * scale) / 2 - minX * scale;
  const offsetY = (height - vbHeight * scale) / 2 - minY * scale;
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  try {
    const path2d = new Path2D(d);
    ctx.fillStyle = "#ffffff";
    ctx.fill(path2d);
  } catch (err) {
    throw new AssetLoadError(
      `Failed to rasterize SVG path: ${err instanceof Error ? err.message : String(err)}`
    );
  } finally {
    ctx.restore();
  }
  const imgData = ctx.getImageData(0, 0, width, height);
  const pixels = imgData.data;
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) {
    if (pixels[i * 4] > 128) {
      mask[i] = 1;
    }
  }
  return { width, height, mask };
}
function rasterizeTextWithCanvas(text, fontFamily, fontWeight, width, height) {
  const canvasObj = create2DCanvas(width, height);
  if (!canvasObj) {
    throw new AssetLoadError("Canvas 2D context unavailable for text rasterization");
  }
  const { ctx } = canvasObj;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);
  const weight = fontWeight ? `${fontWeight} ` : "";
  const fontSize = Math.floor(width * 0.4);
  ctx.font = `${weight}${fontSize}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, width / 2, height / 2);
  const imgData = ctx.getImageData(0, 0, width, height);
  const pixels = imgData.data;
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) {
    if (pixels[i * 4] > 128) {
      mask[i] = 1;
    }
  }
  return { width, height, mask };
}
function rasterizeShape(shape, width = 1024, height = 1024) {
  if (shape.type === "preset") {
    switch (shape.preset) {
      case "triangle": {
        const verts2 = getTriangleVertices(0.7);
        return rasterizePolygon(verts2, width, height);
      }
      case "circle": {
        return rasterizeCircle(0.35, width, height);
      }
      case "rounded-rect": {
        const radius = shape.cornerRadius ?? 0.1;
        return rasterizeRoundedRect(0.65, 0.65, radius, width, height);
      }
      case "star": {
        const verts2 = getStarVertices(5, 0.35, 0.17);
        return rasterizePolygon(verts2, width, height);
      }
      case "hexagon": {
        const verts2 = getRegularPolygonVertices(6, 0.35);
        return rasterizePolygon(verts2, width, height);
      }
      case "polygon": {
        const sides = shape.sides ?? 6;
        const verts2 = getRegularPolygonVertices(sides, 0.35);
        return rasterizePolygon(verts2, width, height);
      }
    }
  }
  if (shape.type === "svg-path") {
    if (!shape.d || shape.d.trim().length === 0) {
      throw new AssetLoadError('SVG path "d" attribute must not be empty');
    }
    return rasterizeSvgPathWithCanvas(shape.d, shape.viewBox, width, height);
  }
  if (shape.type === "svg-file") {
    if (!shape.asset || shape.asset.trim().length === 0) {
      throw new AssetLoadError("SVG file asset must not be empty");
    }
    const { viewBox, paths } = parseSvgString(shape.asset);
    const effectiveViewBox = shape.viewBox ?? viewBox;
    const combinedD = paths.join(" ");
    return rasterizeSvgPathWithCanvas(combinedD, effectiveViewBox, width, height);
  }
  if (shape.type === "text") {
    if (!shape.text || shape.text.trim().length === 0) {
      throw new AssetLoadError("Text shape must not be empty");
    }
    return rasterizeTextWithCanvas(
      shape.text,
      shape.font ?? "sans-serif",
      shape.fontWeight,
      width,
      height
    );
  }
  const verts = getTriangleVertices(0.7);
  return rasterizePolygon(verts, width, height);
}

// src/content/rasterize.ts
function rasterizeCenterContent(content, size = 512) {
  if (!content) {
    const emptyData = new Uint8Array(4);
    return {
      width: 1,
      height: 1,
      data: emptyData,
      tint: [1, 1, 1, 0],
      scale: 0.6,
      opacity: 0
    };
  }
  let tintRgb = [1, 1, 1, 0];
  if (content.tint) {
    const srgb = parseColorToLinearSrgb(content.tint);
    tintRgb = [srgb[0], srgb[1], srgb[2], 1];
  }
  const scale = content.scale ?? 0.6;
  const opacity = content.opacity ?? 1;
  let canvas = null;
  let ctx = null;
  if (typeof OffscreenCanvas !== "undefined") {
    const offCanvas = new OffscreenCanvas(size, size);
    ctx = offCanvas.getContext("2d");
    canvas = offCanvas;
  } else if (typeof document !== "undefined" && typeof document.createElement === "function") {
    const domCanvas = document.createElement("canvas");
    domCanvas.width = size;
    domCanvas.height = size;
    ctx = domCanvas.getContext("2d");
    canvas = domCanvas;
  }
  if (!canvas || !ctx) {
    const fallbackData = new Uint8Array(16 * 4);
    fallbackData.fill(255);
    return {
      width: 4,
      height: 4,
      data: fallbackData,
      tint: tintRgb,
      scale,
      opacity
    };
  }
  ctx.clearRect(0, 0, size, size);
  if (content.type === "text") {
    const fontSize = Math.floor(size * 0.4);
    ctx.font = `${fontSize}px ${content.fontFamily ?? "sans-serif"}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(content.text, size / 2, size / 2);
  } else if (content.type === "svg") {
    try {
      const { viewBox, paths } = parseSvgString(content.asset);
      const [minX, minY, vbWidth, vbHeight] = viewBox;
      const targetSize = size * 0.8;
      const svgScale = Math.min(targetSize / vbWidth, targetSize / vbHeight);
      const offsetX = (size - vbWidth * svgScale) / 2 - minX * svgScale;
      const offsetY = (size - vbHeight * svgScale) / 2 - minY * svgScale;
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(svgScale, svgScale);
      ctx.fillStyle = "#ffffff";
      for (const d of paths) {
        ctx.fill(new Path2D(d));
      }
      ctx.restore();
    } catch {
    }
  }
  const imgData = ctx.getImageData(0, 0, size, size);
  return {
    width: size,
    height: size,
    data: new Uint8Array(imgData.data.buffer),
    tint: tintRgb,
    scale,
    opacity
  };
}

// src/gl/program.ts
function createShaderProgram(gl, vertexSource, fragmentSource) {
  const vertShader = gl.createShader(gl.VERTEX_SHADER);
  const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  if (!vertShader || !fragShader) {
    if (vertShader) gl.deleteShader(vertShader);
    if (fragShader) gl.deleteShader(fragShader);
    throw new RenderError("Failed to allocate WebGL shader objects");
  }
  gl.shaderSource(vertShader, vertexSource);
  gl.compileShader(vertShader);
  if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(vertShader);
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    throw new RenderError(`Vertex shader compilation failed: ${info ?? "unknown error"}`);
  }
  gl.shaderSource(fragShader, fragmentSource);
  gl.compileShader(fragShader);
  if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(fragShader);
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    throw new RenderError(`Fragment shader compilation failed: ${info ?? "unknown error"}`);
  }
  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    throw new RenderError("Failed to allocate WebGL program object");
  }
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    throw new RenderError(`WebGL program link failed: ${info ?? "unknown error"}`);
  }
  gl.detachShader(program, vertShader);
  gl.detachShader(program, fragShader);
  gl.deleteShader(vertShader);
  gl.deleteShader(fragShader);
  const uniformCache = /* @__PURE__ */ new Map();
  return {
    program,
    use() {
      gl.useProgram(program);
    },
    getUniformLocation(name) {
      if (uniformCache.has(name)) {
        return uniformCache.get(name);
      }
      const loc = gl.getUniformLocation(program, name);
      uniformCache.set(name, loc);
      return loc;
    },
    dispose() {
      uniformCache.clear();
      gl.deleteProgram(program);
    }
  };
}

// src/shaders/quad.vert.ts
var QUAD_VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_position;

out vec2 v_uv;

void main() {
  // Map [-1, 1] clip space to [0, 1] UV with top-left origin
  v_uv = vec2((a_position.x + 1.0) * 0.5, (1.0 - a_position.y) * 0.5);
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// src/shaders/glow.frag.ts
var GLOW_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_sdf;
uniform vec2 u_resolution;        // Viewport width, height
uniform vec2 u_shapePos;          // Shape center [0..1]
uniform float u_shapeScale;       // Normalized shape scale
uniform float u_shapeRotation;    // Radians
uniform int u_shapeType;          // 0 = EDT texture, 1 = analytic triangle, 2 = analytic circle, 3 = analytic hexagon
uniform float u_maxDistance;      // Normalized max distance factor
uniform float u_edgeWidth;        // Rim core width
uniform float u_edgeFalloff;      // Glow exponential falloff
uniform float u_edgeIntensity;    // Glow intensity multiplier
uniform float u_edgeDispersion;   // Prism dispersion offset
uniform vec3 u_fillColor;         // Linear RGB interior color
uniform vec3 u_bgColor;           // Linear RGB background color
uniform vec4 u_palette[8];        // Linear RGB color stops
uniform int u_paletteCount;       // Number of color stops (max 8)
uniform float u_time;             // Time in seconds
uniform float u_rotationSpeed;    // Mode rotation speed
uniform vec2 u_cursorPos;         // Normalized cursor position [0..1]
uniform float u_cursorSharpness;  // Specular light focus
uniform float u_hazeIntensity;    // Background haze intensity
uniform float u_hasCursor;        // 1.0 if cursor active, 0.0 otherwise
uniform float u_hoverTransition;  // Smooth hover weight [0..1]
uniform float u_lightAngle;       // Perimeter light angle [radians]
uniform float u_pulseFactor;      // Base mode: pulse multiplier (1.0 default)
uniform float u_hueShift;         // Base mode: spectrum-cycle hue offset (0.0 default)
uniform float u_flickerFactor;    // Base mode: neon flicker multiplier (1.0 default)
uniform vec4 u_sweep;             // Base mode: sweep [angle, width, intensity, active]
uniform vec4 u_ripple;            // Click effect: ripple [originU, originV, radius, intensity]
uniform float u_burstFactor;      // Click effect: burst flash multiplier (0.0 default)
uniform sampler2D u_contentTexture; // Center content RGBA texture
uniform float u_hasContent;       // 1.0 if center content active, 0.0 otherwise
uniform float u_contentScale;     // Relative scale of center content
uniform float u_contentOpacity;   // Center content alpha opacity
uniform vec4 u_contentTint;       // Optional tint overlay [r, g, b, active]

vec3 samplePalette(float t) {
  if (u_paletteCount <= 1) return u_palette[0].rgb;
  float scaled = fract(t) * float(u_paletteCount);
  int i0 = int(floor(scaled)) % u_paletteCount;
  int i1 = (i0 + 1) % u_paletteCount;
  float fracVal = fract(scaled);
  return mix(u_palette[i0].rgb, u_palette[i1].rgb, fracVal);
}

// Distance from point p to segment [a, b]
float sdfSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

// Analytic signed distance to 2D triangle (Vercel geometry.wgsl / Inigo Quilez)
float sdfTriangle(vec2 p, vec2 a, vec2 b, vec2 c) {
  float d = min(min(sdfSegment(p, a, b), sdfSegment(p, b, c)), sdfSegment(p, c, a));
  vec2 e0 = b - a;
  vec2 e1 = c - b;
  vec2 e2 = a - c;
  float side0 = e0.x * (p.y - a.y) - e0.y * (p.x - a.x);
  float side1 = e1.x * (p.y - b.y) - e1.y * (p.x - b.x);
  float side2 = e2.x * (p.y - c.y) - e2.y * (p.x - c.x);
  bool inside = (side0 <= 0.0 && side1 <= 0.0 && side2 <= 0.0) ||
                (side0 >= 0.0 && side1 >= 0.0 && side2 >= 0.0);
  return inside ? -d : d;
}

// Analytic regular hexagon
float sdHexagon(vec2 p, float r) {
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p = abs(p);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}

void main() {
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);

  // Aspect-corrected offset from shape center
  vec2 diff = v_uv - u_shapePos;
  diff.x *= aspect;

  // Inverse rotation into shape coordinate space
  float cosR = cos(-u_shapeRotation);
  float sinR = sin(-u_shapeRotation);
  vec2 rotated = vec2(
    diff.x * cosR - diff.y * sinR,
    diff.x * sinR + diff.y * cosR
  );

  float safeScale = max(u_shapeScale, 0.001);
  vec2 p = rotated / safeScale;
  vec2 shapeUv = p + vec2(0.5);

  float d = 0.0;
  vec2 shapeNormal = vec2(0.0, 1.0);

  if (u_shapeType == 1) {
    // Analytic equilateral triangle matching canonical preset geometry (size 0.7)
    // h = 0.7 * sqrt(3)/2 = 0.60621778; topY = -2/3*h = -0.40414519; botY = 1/3*h = 0.20207259
    const vec2 p0 = vec2(0.0, -0.40414518843);
    const vec2 p1 = vec2(0.35, 0.20207259422);
    const vec2 p2 = vec2(-0.35, 0.20207259422);
    float localD = sdfTriangle(p, p0, p1, p2);
    d = localD * safeScale;

    // True analytic normal via central differences
    const float eps = 0.0005;
    float ndx = sdfTriangle(p + vec2(eps, 0.0), p0, p1, p2) - sdfTriangle(p - vec2(eps, 0.0), p0, p1, p2);
    float ndy = sdfTriangle(p + vec2(0.0, eps), p0, p1, p2) - sdfTriangle(p - vec2(0.0, eps), p0, p1, p2);
    float nLen = length(vec2(ndx, ndy));
    shapeNormal = nLen > 0.00001 ? vec2(ndx, ndy) / nLen : vec2(0.0, 1.0);
  } else if (u_shapeType == 2) {
    // Analytic circle
    float localD = length(p) - 0.35;
    d = localD * safeScale;
    float pLen = length(p);
    shapeNormal = pLen > 0.00001 ? p / pLen : vec2(0.0, 1.0);
  } else if (u_shapeType == 3) {
    // Analytic hexagon
    float localD = sdHexagon(p, 0.35);
    d = localD * safeScale;
    const float eps = 0.0005;
    float ndx = sdHexagon(p + vec2(eps, 0.0), 0.35) - sdHexagon(p - vec2(eps, 0.0), 0.35);
    float ndy = sdHexagon(p + vec2(0.0, eps), 0.35) - sdHexagon(p - vec2(0.0, eps), 0.35);
    float nLen = length(vec2(ndx, ndy));
    shapeNormal = nLen > 0.00001 ? vec2(ndx, ndy) / nLen : vec2(0.0, 1.0);
  } else {
    // Fallback: EDT texture for arbitrary SVG paths or text
    vec2 clampedUv = clamp(shapeUv, vec2(0.001), vec2(0.999));
    float rawSdf = texture(u_sdf, clampedUv).r;
    float distPixels = (rawSdf - 0.5) * 2.0 * u_maxDistance;
    vec2 boxDistVec = max(vec2(0.0), max(vec2(0.0) - shapeUv, shapeUv - vec2(1.0)));
    float extraPixels = length(boxDistVec) * 1024.0;
    float totalPixels = distPixels + extraPixels;
    d = (totalPixels / 1024.0) * safeScale;

    float eps = 1.0 / 1024.0;
    float dR = texture(u_sdf, clamp(shapeUv + vec2(eps, 0.0), 0.001, 0.999)).r;
    float dL = texture(u_sdf, clamp(shapeUv - vec2(eps, 0.0), 0.001, 0.999)).r;
    float dU = texture(u_sdf, clamp(shapeUv + vec2(0.0, eps), 0.001, 0.999)).r;
    float dD = texture(u_sdf, clamp(shapeUv - vec2(0.0, eps), 0.001, 0.999)).r;
    vec2 grad = vec2(dR - dL, dU - dD);
    float gLen = length(grad);
    shapeNormal = gLen > 0.00001 ? grad / gLen : vec2(0.0, 1.0);
  }

  // Edge perimeter angle around shape center
  float angle = (length(p) > 0.00001) ? atan(p.y, p.x) : 0.0;
  float normAngle = fract((angle / 6.28318530718) + 0.5 + u_time * u_rotationSpeed + u_hueShift);

  // Chromatic dispersion for prism effect
  float disp = u_edgeDispersion * 0.035;
  float rColor = samplePalette(normAngle - disp).r;
  float gColor = samplePalette(normAngle).g;
  float bColor = samplePalette(normAngle + disp).b;
  vec3 edgeColor = vec3(rColor, gColor, bColor);

  // --- Dynamic Multi-Band Perimeter Motion ---
  float perimeterLight = 1.0;
  if (u_rotationSpeed > 0.001) {
    // 3 harmonic traveling wave bands inspired by Vercel LINE_VELOCITIES [-3.302, -2.355, -1.636]
    float posAngle = fract((angle / 6.28318530718) + 0.5);
    float s = u_rotationSpeed;
    float t = u_time;

    // Band centers traveling at non-commensurate harmonic ratios
    float c0 = fract(t * s * 1.0);
    float c1 = fract(t * s * 0.713 + 0.333);
    float c2 = fract(t * s * 0.495 + 0.666);

    // Dynamic breathing sizes
    float w0 = 0.16 + 0.05 * sin(t * 0.41);
    float w1 = 0.14 + 0.04 * sin(t * 0.31 + 2.1);
    float w2 = 0.12 + 0.03 * sin(t * 0.23 + 4.2);

    // Dynamic breathing intensities
    float f0 = 0.5 + 0.5 * sin(t * 0.52 + 1.57);
    float f1 = 0.5 + 0.5 * sin(t * 0.38 + 0.40);
    float f2 = 0.5 + 0.5 * sin(t * 0.28 - 0.60);

    float d0 = min(abs(posAngle - c0), 1.0 - abs(posAngle - c0));
    float d1 = min(abs(posAngle - c1), 1.0 - abs(posAngle - c1));
    float d2 = min(abs(posAngle - c2), 1.0 - abs(posAngle - c2));

    float p0 = exp(-(d0 * d0) / max(2.0 * w0 * w0, 0.001)) * f0;
    float p1 = exp(-(d1 * d1) / max(2.0 * w1 * w1, 0.001)) * f1;
    float p2 = exp(-(d2 * d2) / max(2.0 * w2 * w2, 0.001)) * f2;

    float multiBand = max(p0, max(p1, p2));
    float idleLight = mix(0.10, 0.85, multiBand);

    // Hover beam focusing toward cursor
    float angleDiff = abs(angle - u_lightAngle);
    if (angleDiff > 3.14159265) angleDiff = 6.2831853 - angleDiff;
    float cursorBeam = pow(max(cos(angleDiff), 0.0), 3.0);
    float activeCursorLight = mix(0.10, 0.90, cursorBeam);

    perimeterLight = mix(idleLight, activeCursorLight, u_hoverTransition);
  } else if (u_hoverTransition > 0.001) {
    float angleDiff = abs(angle - u_lightAngle);
    if (angleDiff > 3.14159265) angleDiff = 6.2831853 - angleDiff;
    float cursorBeam = pow(max(cos(angleDiff), 0.0), 3.0);
    perimeterLight = mix(0.12, 1.0, cursorBeam);
  }

  // Active edge illumination: purely on the shape perimeter (no cursor light blob)
  float edgeLight = perimeterLight;

  // Mode modulations
  edgeLight = edgeLight * u_pulseFactor * u_flickerFactor + u_burstFactor;

  // Sweep highlight beam
  if (u_sweep.w > 0.5) {
    float dAngle = abs(normAngle - u_sweep.x);
    dAngle = min(dAngle, 1.0 - dAngle);
    float sweepBeam = exp(-(dAngle * dAngle) / max(u_sweep.y * u_sweep.y, 0.0001)) * u_sweep.z;
    edgeLight += sweepBeam;
  }

  // Transient ripple wave
  if (u_ripple.w > 0.001) {
    float clickDist = length(shapeUv - u_ripple.xy);
    float waveDist = abs(clickDist - u_ripple.z);
    edgeLight += exp(-(waveDist * waveDist) / 0.0015) * u_ripple.w;
  }

  // --- Pure Vercel Edge Falloff & Space Expansion ---
  // 1. Razor-sharp core line
  float core = smoothstep(u_edgeWidth, 0.0, abs(d));
  // 2. Near-band falloff
  float nearOuter = max(u_edgeFalloff, 0.018);
  float nearFade = clamp(1.0 - max(d, 0.0) / nearOuter, 0.0, 1.0);
  float nearBand = pow(nearFade, 2.8);
  // 3. Two-stage exponential far radiance expanding naturally into the black void
  float farStage1 = exp(-max(d, 0.0) * 13.0) * 0.35;
  float farStage2 = exp(-max(d, 0.0) * 3.8) * 0.14;
  float farGlow = farStage1 + farStage2;

  // Calibrated rim profile: never clips/blows out into washed-out white
  float rimProfile = (nearBand * 0.45 + core * 0.55 + farGlow) * u_edgeIntensity * edgeLight;

  // Inside vs outside composition
  vec3 linearColor;
  float outAlpha = 1.0;
  if (d < 0.0) {
    vec3 col = u_fillColor;
    if (u_hasContent > 0.5) {
      vec2 contentUv = (shapeUv - vec2(0.5)) / max(u_contentScale, 0.001) + vec2(0.5);
      if (contentUv.x >= 0.0 && contentUv.x <= 1.0 && contentUv.y >= 0.0 && contentUv.y <= 1.0) {
        vec4 texSample = texture(u_contentTexture, contentUv);
        vec3 contentRgb = (u_contentTint.w > 0.5) ? u_contentTint.rgb : texSample.rgb;
        float alpha = texSample.a * u_contentOpacity;
        col = mix(col, contentRgb, alpha);
      }
    }
    // Subpixel occluder edge derivative for crisp anti-aliased silhouette
    float occluderEdge = max(length(vec2(dFdx(d), dFdy(d))), 0.001);
    float occluder = clamp(0.5 - d / occluderEdge, 0.0, 1.0);
    linearColor = mix(edgeColor * rimProfile, col, occluder);
    outAlpha = 1.0;
  } else {
    linearColor = u_bgColor + (edgeColor * rimProfile);
    float glowBrightness = max(linearColor.r, max(linearColor.g, linearColor.b));
    outAlpha = clamp(glowBrightness * 3.0, 0.0, 1.0);
  }

  // Screen-edge vertical fade
  float vertDist = min(v_uv.y, 1.0 - v_uv.y);
  float screenEdgeFade = sqrt(clamp(vertDist / 0.15, 0.0, 1.0));
  linearColor *= screenEdgeFade;
  outAlpha *= screenEdgeFade;

  linearColor = clamp(linearColor, 0.0, 1.0);

  // Gamma correction to sRGB
  vec3 srgb = pow(linearColor, vec3(1.0 / 2.2));

  // Dither in sRGB space on outside rim/background to eliminate banding without lifting true black
  if (d >= 0.0 && dot(srgb, vec3(1.0)) > 0.001) {
    float dither = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
    srgb = clamp(srgb + vec3(dither), 0.0, 1.0);
  }

  fragColor = vec4(srgb, outAlpha);
}
`;

// src/shape/edt.ts
var INF = 1e9;
function edt1d(f, n, d, v, z2) {
  let k = 0;
  v[0] = 0;
  z2[0] = -INF;
  z2[1] = +INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z2[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z2[k] = s;
    z2[k + 1] = +INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z2[k + 1] < q) {
      k++;
    }
    const vk = v[k];
    const diff = q - vk;
    d[q] = diff * diff + f[vk];
  }
}
function edt2d(mask, width, height, featureVal, outputSquared) {
  const maxDim = Math.max(width, height);
  const f = new Float64Array(maxDim);
  const d = new Float64Array(maxDim);
  const v = new Int32Array(maxDim);
  const z2 = new Float64Array(maxDim + 1);
  const temp = new Float64Array(width * height);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      f[y] = mask[y * width + x] === featureVal ? 0 : INF;
    }
    edt1d(f, height, d, v, z2);
    for (let y = 0; y < height; y++) {
      temp[y * width + x] = d[y];
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      f[x] = temp[y * width + x];
    }
    edt1d(f, width, d, v, z2);
    for (let x = 0; x < width; x++) {
      outputSquared[y * width + x] = d[x];
    }
  }
}
function computeSdf(mask, width, height, maxDistance = 64) {
  const total = width * height;
  const dOutSq = new Float64Array(total);
  const dInSq = new Float64Array(total);
  edt2d(mask, width, height, 1, dOutSq);
  edt2d(mask, width, height, 0, dInSq);
  const cpuDistances = new Float32Array(total);
  const r8Data = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    const isInside = mask[i] === 1;
    let dist;
    if (isInside) {
      dist = -Math.sqrt(dInSq[i]);
    } else {
      dist = +Math.sqrt(dOutSq[i]);
    }
    cpuDistances[i] = dist;
    const norm = Math.max(0, Math.min(1, dist / maxDistance * 0.5 + 0.5));
    r8Data[i] = Math.round(norm * 255);
  }
  return {
    width,
    height,
    maxDistance,
    cpuDistances,
    r8Data
  };
}

// src/shape/worker.ts
var WORKER_SCRIPT = `
self.onmessage = function(e) {
  var mask = new Uint8Array(e.data.maskBuffer);
  var width = e.data.width;
  var height = e.data.height;
  var maxDistance = e.data.maxDistance;

  var INF = 1e9;
  function edt1d(f, n, d, v, z) {
    var k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = +INF;
    for (var q = 1; q < n; q++) {
      var s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = +INF;
    }
    k = 0;
    for (var q = 0; q < n; q++) {
      while (z[k + 1] < q) k++;
      var vk = v[k];
      var diff = q - vk;
      d[q] = diff * diff + f[vk];
    }
  }

  function edt2d(maskArr, w, h, featureVal, out) {
    var maxDim = Math.max(w, h);
    var f = new Float64Array(maxDim);
    var d = new Float64Array(maxDim);
    var v = new Int32Array(maxDim);
    var z = new Float64Array(maxDim + 1);
    var temp = new Float64Array(w * h);

    for (var x = 0; x < w; x++) {
      for (var y = 0; y < h; y++) {
        f[y] = maskArr[y * w + x] === featureVal ? 0 : INF;
      }
      edt1d(f, h, d, v, z);
      for (var y = 0; y < h; y++) {
        temp[y * w + x] = d[y];
      }
    }

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        f[x] = temp[y * w + x];
      }
      edt1d(f, w, d, v, z);
      for (var x = 0; x < w; x++) {
        out[y * w + x] = d[x];
      }
    }
  }

  var total = width * height;
  var dOutSq = new Float64Array(total);
  var dInSq = new Float64Array(total);
  edt2d(mask, width, height, 1, dOutSq);
  edt2d(mask, width, height, 0, dInSq);

  var cpuDistances = new Float32Array(total);
  var r8Data = new Uint8Array(total);

  for (var i = 0; i < total; i++) {
    var isInside = mask[i] === 1;
    var dist = isInside ? -Math.sqrt(dInSq[i]) : +Math.sqrt(dOutSq[i]);
    cpuDistances[i] = dist;
    var norm = Math.max(0, Math.min(1, (dist / maxDistance) * 0.5 + 0.5));
    r8Data[i] = Math.round(norm * 255);
  }

  self.postMessage(
    {
      width: width,
      height: height,
      maxDistance: maxDistance,
      cpuDistances: cpuDistances,
      r8Data: r8Data
    },
    [cpuDistances.buffer, r8Data.buffer]
  );
};
`;
var cachedWorkerUrl = null;
function getWorkerUrl() {
  if (cachedWorkerUrl) return cachedWorkerUrl;
  if (typeof Blob !== "undefined" && typeof URL !== "undefined" && URL.createObjectURL) {
    try {
      const blob = new Blob([WORKER_SCRIPT], { type: "application/javascript" });
      cachedWorkerUrl = URL.createObjectURL(blob);
      return cachedWorkerUrl;
    } catch {
      return null;
    }
  }
  return null;
}
async function computeSdfAsync(mask, width, height, maxDistance = 96) {
  const workerUrl = getWorkerUrl();
  if (typeof Worker !== "undefined" && workerUrl) {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(workerUrl);
        const maskCopy = new Uint8Array(mask);
        worker.onmessage = (e) => {
          worker.terminate();
          resolve({
            width: e.data.width,
            height: e.data.height,
            maxDistance: e.data.maxDistance,
            cpuDistances: e.data.cpuDistances,
            r8Data: e.data.r8Data
          });
        };
        worker.onerror = (err) => {
          worker.terminate();
          try {
            resolve(computeSdf(mask, width, height, maxDistance));
          } catch {
            reject(err);
          }
        };
        worker.postMessage(
          {
            maskBuffer: maskCopy.buffer,
            width,
            height,
            maxDistance
          },
          [maskCopy.buffer]
        );
      } catch {
        resolve(computeSdf(mask, width, height, maxDistance));
      }
    });
  }
  return computeSdf(mask, width, height, maxDistance);
}

// src/shape/pipeline.ts
function buildShapePipeline(shape, gridSize = 1024, maxDistance = 96) {
  const rasterized = rasterizeShape(shape, gridSize, gridSize);
  const sdf = computeSdf(rasterized.mask, gridSize, gridSize, maxDistance);
  const hitTest = (u, v) => {
    if (u < 0 || u > 1 || v < 0 || v > 1) {
      return maxDistance;
    }
    const px = Math.min(gridSize - 1, Math.max(0, Math.floor(u * gridSize)));
    const py = Math.min(gridSize - 1, Math.max(0, Math.floor(v * gridSize)));
    return sdf.cpuDistances[py * gridSize + px];
  };
  return {
    sdf,
    shape,
    hitTest
  };
}
async function buildShapePipelineAsync(shape, gridSize = 1024, maxDistance = 96) {
  const rasterized = rasterizeShape(shape, gridSize, gridSize);
  const sdf = await computeSdfAsync(rasterized.mask, gridSize, gridSize, maxDistance);
  const hitTest = (u, v) => {
    if (u < 0 || u > 1 || v < 0 || v > 1) {
      return maxDistance;
    }
    const px = Math.min(gridSize - 1, Math.max(0, Math.floor(u * gridSize)));
    const py = Math.min(gridSize - 1, Math.max(0, Math.floor(v * gridSize)));
    return sdf.cpuDistances[py * gridSize + px];
  };
  return {
    sdf,
    shape,
    hitTest
  };
}

// src/color/spring.ts
var DEFAULT_SPRING_CONFIG = {
  angularFrequency: 14,
  dampingRatio: 1
};
function createPaletteSprings(maxStops = 8) {
  const springs = [];
  for (let i = 0; i < maxStops; i++) {
    springs.push({
      L: 0,
      a: 0,
      b: 0,
      alpha: 1,
      vL: 0,
      va: 0,
      vb: 0,
      valpha: 0,
      targetL: 0,
      targeta: 0,
      targetb: 0,
      targetAlpha: 1
    });
  }
  return springs;
}
function setSpringTargetsImmediate(springs, targets) {
  for (let i = 0; i < springs.length; i++) {
    const s = springs[i];
    const t = targets[i % targets.length];
    s.L = t.L;
    s.a = t.a;
    s.b = t.b;
    s.alpha = t.alpha;
    s.targetL = t.L;
    s.targeta = t.a;
    s.targetb = t.b;
    s.targetAlpha = t.alpha;
    s.vL = 0;
    s.va = 0;
    s.vb = 0;
    s.valpha = 0;
  }
}
function setSpringTargets(springs, targets) {
  for (let i = 0; i < springs.length; i++) {
    const s = springs[i];
    const t = targets[i % targets.length];
    s.targetL = t.L;
    s.targeta = t.a;
    s.targetb = t.b;
    s.targetAlpha = t.alpha;
  }
}
function stepPaletteSprings(springs, stopCount, dt, config = DEFAULT_SPRING_CONFIG) {
  if (dt <= 0) return false;
  const safeDt = Math.min(dt, 0.1);
  const omega = config.angularFrequency;
  const zeta = config.dampingRatio;
  let isMoving = false;
  for (let i = 0; i < stopCount; i++) {
    const s = springs[i];
    s.L = stepComponent(s.L, s.targetL, s.vL, safeDt, omega, zeta, (v) => {
      s.vL = v;
    });
    s.a = stepComponent(s.a, s.targeta, s.va, safeDt, omega, zeta, (v) => {
      s.va = v;
    });
    s.b = stepComponent(s.b, s.targetb, s.vb, safeDt, omega, zeta, (v) => {
      s.vb = v;
    });
    s.alpha = stepComponent(s.alpha, s.targetAlpha, s.valpha, safeDt, omega, zeta, (v) => {
      s.valpha = v;
    });
    if (Math.abs(s.L - s.targetL) > 5e-4 || Math.abs(s.a - s.targeta) > 5e-4 || Math.abs(s.b - s.targetb) > 5e-4 || Math.abs(s.vL) > 1e-3 || Math.abs(s.va) > 1e-3 || Math.abs(s.vb) > 1e-3) {
      isMoving = true;
    }
  }
  return isMoving;
}
function stepComponent(current, target, velocity, dt, omega, zeta, setVelocity) {
  const diff = current - target;
  const fSpring = -omega * omega * diff;
  const fDamping = -2 * zeta * omega * velocity;
  const accel = fSpring + fDamping;
  const nextVel = velocity + accel * dt;
  const nextPos = current + nextVel * dt;
  setVelocity(nextVel);
  return nextPos;
}
function generateRandomPalette(seed) {
  const rng = seed !== void 0 ? pseudoRandom(seed) : Math.random;
  const baseHue = rng() * 360;
  const offsets = [0, 45, 90, 150];
  const stops = [];
  for (let i = 0; i < offsets.length; i++) {
    const hue = (baseHue + offsets[i]) % 360;
    const L = 0.7 + (rng() - 0.5) * 0.15;
    const C = 0.18 + (rng() - 0.5) * 0.06;
    const [labL, a, b] = oklchToOklab(L, C, hue);
    stops.push({ L: labL, a, b, alpha: 1 });
  }
  return stops;
}
function pseudoRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = s * 16807 % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// src/effects/registry.ts
var BASE_MODES = {
  glow: {
    id: "glow",
    paramSchema: z.object({}),
    uniforms: [],
    evaluate(_params, _ctx, out) {
      out.pulseFactor = 1;
      out.rotationSpeed = 0;
      out.hueShift = 0;
      out.flickerFactor = 1;
      out.sweep[3] = 0;
      out.orbitPos = null;
    }
  },
  pulse: {
    id: "pulse",
    paramSchema: z.object({
      speed: z.number().default(2),
      depth: z.number().min(0).max(1).default(0.35)
    }),
    uniforms: ["u_pulseFactor"],
    evaluate(params, ctx, out) {
      const speed = typeof params?.speed === "number" ? params.speed : 2;
      const depth = typeof params?.depth === "number" ? params.depth : 0.35;
      out.pulseFactor = 1 + depth * Math.sin(ctx.timeSec * speed * Math.PI * 2);
      out.rotationSpeed = 0;
      out.hueShift = 0;
      out.flickerFactor = 1;
      out.sweep[3] = 0;
      out.orbitPos = null;
    }
  },
  rotate: {
    id: "rotate",
    paramSchema: z.object({
      speed: z.number().default(0.25)
    }),
    uniforms: ["u_rotationSpeed"],
    evaluate(params, _ctx, out) {
      const speed = typeof params?.speed === "number" ? params.speed : 0.25;
      out.pulseFactor = 1;
      out.rotationSpeed = speed;
      out.hueShift = 0;
      out.flickerFactor = 1;
      out.sweep[3] = 0;
      out.orbitPos = null;
    }
  },
  "spectrum-cycle": {
    id: "spectrum-cycle",
    paramSchema: z.object({
      speed: z.number().default(0.15)
    }),
    uniforms: ["u_hueShift"],
    evaluate(params, ctx, out) {
      const speed = typeof params?.speed === "number" ? params.speed : 0.15;
      out.pulseFactor = 1;
      out.rotationSpeed = 0;
      out.hueShift = (ctx.timeSec * speed % 1 + 1) % 1;
      out.flickerFactor = 1;
      out.sweep[3] = 0;
      out.orbitPos = null;
    }
  },
  flicker: {
    id: "flicker",
    paramSchema: z.object({
      seed: z.number().default(42),
      depth: z.number().min(0).max(1).default(0.2),
      speed: z.number().default(15)
    }),
    uniforms: ["u_flickerFactor"],
    evaluate(params, ctx, out) {
      const seed = typeof params?.seed === "number" ? params.seed : 42;
      const depth = typeof params?.depth === "number" ? params.depth : 0.2;
      const speed = typeof params?.speed === "number" ? params.speed : 15;
      const s1 = Math.sin(ctx.timeSec * speed * 1.7 + seed * 1.3);
      const s2 = Math.cos(ctx.timeSec * speed * 3.9 + seed * 2.7);
      const s3 = Math.sin(ctx.timeSec * speed * 8.3 + seed * 4.1);
      const jitter = (s1 * 0.5 + s2 * 0.3 + s3 * 0.2) * depth;
      out.pulseFactor = 1;
      out.rotationSpeed = 0;
      out.hueShift = 0;
      out.flickerFactor = Math.max(0.1, 1 + jitter);
      out.sweep[3] = 0;
      out.orbitPos = null;
    }
  },
  sweep: {
    id: "sweep",
    paramSchema: z.object({
      speed: z.number().default(0.4),
      width: z.number().positive().default(0.08),
      intensity: z.number().positive().default(1.8)
    }),
    uniforms: ["u_sweep"],
    evaluate(params, ctx, out) {
      const speed = typeof params?.speed === "number" ? params.speed : 0.4;
      const width = typeof params?.width === "number" ? params.width : 0.08;
      const intensity = typeof params?.intensity === "number" ? params.intensity : 1.8;
      out.pulseFactor = 1;
      out.rotationSpeed = 0;
      out.hueShift = 0;
      out.flickerFactor = 1;
      out.sweep[0] = (ctx.timeSec * speed % 1 + 1) % 1;
      out.sweep[1] = width;
      out.sweep[2] = intensity;
      out.sweep[3] = 1;
      out.orbitPos = null;
    }
  },
  orbit: {
    id: "orbit",
    paramSchema: z.object({
      speed: z.number().default(0.8),
      radius: z.number().positive().default(1.3)
    }),
    uniforms: ["u_cursorPos", "u_hasCursor"],
    evaluate(params, ctx, out) {
      const speed = typeof params?.speed === "number" ? params.speed : 0.8;
      const radiusFactor = typeof params?.radius === "number" ? params.radius : 1.3;
      const orbitAngle = ctx.timeSec * speed;
      const radius = ctx.shapeScale * radiusFactor;
      out.pulseFactor = 1;
      out.rotationSpeed = 0;
      out.hueShift = 0;
      out.flickerFactor = 1;
      out.sweep[3] = 0;
      out.orbitPos = [
        ctx.shapeCenter[0] + Math.cos(orbitAngle) * radius,
        ctx.shapeCenter[1] + Math.sin(orbitAngle) * radius
      ];
    }
  }
};
var CLICK_ACTIONS = {
  "next-palette": {
    id: "next-palette",
    paramSchema: z.object({}),
    uniforms: ["u_palette[0]"]
  },
  "random-palette": {
    id: "random-palette",
    paramSchema: z.object({
      seed: z.number().optional()
    }),
    uniforms: ["u_palette[0]"]
  },
  ripple: {
    id: "ripple",
    paramSchema: z.object({
      speed: z.number().default(1.5),
      duration: z.number().default(0.6),
      intensity: z.number().default(1.5)
    }),
    uniforms: ["u_ripple"]
  },
  burst: {
    id: "burst",
    paramSchema: z.object({
      intensity: z.number().default(2),
      decay: z.number().default(4),
      duration: z.number().default(0.5)
    }),
    uniforms: ["u_burstFactor"]
  },
  "next-mode": {
    id: "next-mode",
    paramSchema: z.object({
      modes: z.array(z.string()).optional()
    }),
    uniforms: []
  },
  "toggle-content": {
    id: "toggle-content",
    paramSchema: z.object({}),
    uniforms: []
  },
  none: {
    id: "none",
    paramSchema: z.object({}),
    uniforms: []
  }
};
var ALL_BASE_MODE_IDS = [
  "glow",
  "pulse",
  "rotate",
  "spectrum-cycle",
  "flicker",
  "sweep",
  "orbit"
];
var ALL_CLICK_ACTION_IDS = [
  "next-palette",
  "random-palette",
  "ripple",
  "burst",
  "next-mode",
  "toggle-content",
  "none"
];

// src/renderer.ts
function getShapeType(shape) {
  if (shape.type === "preset") {
    if (shape.preset === "triangle") return 1;
    if (shape.preset === "circle") return 2;
    if (shape.preset === "hexagon") return 3;
  }
  return 0;
}
function createRenderer(options) {
  const { canvas } = options;
  let currentScene = parseScene(options.scene);
  const clock = options.clock ?? new SystemClock();
  const input = options.input ?? new NoopInput();
  let isRunning = false;
  let isPaused = false;
  let isContextLost = false;
  let isCanvasVisible = true;
  let rafId = null;
  let lastFrameTime = 0;
  let fpsCap = currentScene.performance.fpsCap;
  let resolutionScale = currentScene.performance.resolutionScale;
  let cssWidth = typeof canvas.clientWidth === "number" && canvas.clientWidth > 0 ? canvas.clientWidth : canvas.width || 800;
  let cssHeight = typeof canvas.clientHeight === "number" && canvas.clientHeight > 0 ? canvas.clientHeight : canvas.height || 600;
  let dpr = typeof window !== "undefined" && window.devicePixelRatio ? window.devicePixelRatio : 1;
  let pointerActive = false;
  let targetPointerX = 0.5;
  let targetPointerY = 0.5;
  let currentPointerX = 0.5;
  let currentPointerY = 0.5;
  let lastPointerTime = clock.now();
  let lastAnimTime = clock.now();
  let isOrbiting = false;
  let hoverTransition = 0;
  let currentPaletteIndex = 0;
  let activeModeId = currentScene.mode.id;
  let activeModeParams = currentScene.mode.params || {};
  let activeRipple = null;
  let activeBurst = null;
  let isContentVisible = true;
  const modeUniforms = {
    pulseFactor: 1,
    rotationSpeed: 0,
    hueShift: 0,
    flickerFactor: 1,
    sweep: [0, 0.08, 1.8, 0],
    orbitPos: null
  };
  const effectContext = {
    timeSec: 0,
    timeMs: 0,
    shapeCenter: [0.5, 0.52],
    shapeScale: 0.28
  };
  const paletteBuffer = new Float32Array(32);
  const fillColorBuffer = new Float32Array(3);
  const bgColorBuffer = new Float32Array(3);
  const sweepBuffer = new Float32Array(4);
  const rippleBuffer = new Float32Array(4);
  const contentTintBuffer = new Float32Array(4);
  const tempLinearRgb = [0, 0, 0];
  const paletteSprings = createPaletteSprings(8);
  let activePaletteOklab = [];
  let paletteStopCount = 0;
  const currentUniforms = {
    u_cursorPos: [0.5, 0.5],
    u_hasCursor: 0,
    u_cursorSharpness: 3,
    u_hazeIntensity: 0.6,
    u_hoverTransition: 0,
    u_lightAngle: 0,
    u_shapeType: getShapeType(currentScene.shape),
    u_shapePos: [0.5, 0.52],
    u_shapeScale: 0.28,
    u_shapeRotation: 0,
    u_maxDistance: 96,
    u_edgeWidth: 4e-3,
    u_edgeFalloff: 0.09,
    u_edgeIntensity: 1,
    u_edgeDispersion: 0.35,
    u_time: 0,
    u_rotationSpeed: 0,
    u_pulseFactor: 1,
    u_hueShift: 0,
    u_flickerFactor: 1,
    u_sweep: [0, 0.08, 1.8, 0],
    u_ripple: [0.5, 0.5, 0, 0],
    u_burstFactor: 0,
    u_hasContent: 0
  };
  let gl = getWebGL2Context(canvas);
  let quad = createQuadMesh(gl);
  let program = createShaderProgram(gl, QUAD_VERTEX_SHADER, GLOW_FRAGMENT_SHADER);
  let shapePipeline = buildShapePipeline(currentScene.shape);
  let sdfTexture = createR8Texture(
    gl,
    shapePipeline.sdf.width,
    shapePipeline.sdf.height,
    shapePipeline.sdf.r8Data
  );
  let contentResult = rasterizeCenterContent(currentScene.fill.content);
  let contentTexture = createRgbaTexture(
    gl,
    contentResult.width,
    contentResult.height,
    contentResult.data
  );
  function refreshColors(scene, immediate = true) {
    const rawFill = parseColorToLinearSrgb(scene.fill.color);
    fillColorBuffer[0] = rawFill[0];
    fillColorBuffer[1] = rawFill[1];
    fillColorBuffer[2] = rawFill[2];
    const rawBg = parseColorToLinearSrgb(scene.background.color);
    bgColorBuffer[0] = rawBg[0];
    bgColorBuffer[1] = rawBg[1];
    bgColorBuffer[2] = rawBg[2];
    const currentPalette = scene.palettes[currentPaletteIndex] ?? scene.palettes[0] ?? ["#ffffff", "#000000"];
    activePaletteOklab = currentPalette.map((c) => parseColorToOklab(c));
    paletteStopCount = Math.min(8, currentPalette.length);
    if (immediate) {
      setSpringTargetsImmediate(paletteSprings, activePaletteOklab);
    } else {
      setSpringTargets(paletteSprings, activePaletteOklab);
    }
    for (let i = 0; i < paletteStopCount; i++) {
      const s = paletteSprings[i];
      oklabToLinearSrgb(s.L, s.a, s.b, tempLinearRgb);
      const baseIdx = i * 4;
      paletteBuffer[baseIdx] = tempLinearRgb[0];
      paletteBuffer[baseIdx + 1] = tempLinearRgb[1];
      paletteBuffer[baseIdx + 2] = tempLinearRgb[2];
      paletteBuffer[baseIdx + 3] = s.alpha;
    }
  }
  refreshColors(currentScene, true);
  function screenToShapeUv(x, y) {
    const aspect = canvas.width / Math.max(canvas.height, 1);
    const diffX = (x - currentScene.shape.position[0]) * aspect;
    const diffY = y - currentScene.shape.position[1];
    const rotRad = currentScene.shape.rotation * Math.PI / 180;
    const cosR = Math.cos(-rotRad);
    const sinR = Math.sin(-rotRad);
    const rotX = diffX * cosR - diffY * sinR;
    const rotY = diffX * sinR + diffY * cosR;
    const safeScale = Math.max(currentScene.shape.scale, 1e-3);
    const shapeU = rotX / safeScale + 0.5;
    const shapeV = rotY / safeScale + 0.5;
    return [shapeU, shapeV];
  }
  function isPointerInsideShape(x, y) {
    const aspect = canvas.width / Math.max(canvas.height, 1);
    const diffX = (x - currentScene.shape.position[0]) * aspect;
    const diffY = y - currentScene.shape.position[1];
    const rotRad = currentScene.shape.rotation * Math.PI / 180;
    const cosR = Math.cos(-rotRad);
    const sinR = Math.sin(-rotRad);
    const rotX = diffX * cosR - diffY * sinR;
    const rotY = diffX * sinR + diffY * cosR;
    const safeScale = Math.max(currentScene.shape.scale, 1e-3);
    const localX = rotX / safeScale;
    const localY = rotY / safeScale;
    if (currentScene.shape.type === "preset" && currentScene.shape.preset === "triangle") {
      const e0X = 0.35;
      const e0Y = 0.60621778265;
      const e1X = -0.7;
      const e1Y = 0;
      const e2X = 0.35;
      const e2Y = -0.60621778265;
      const side0 = e0X * (localY - -0.40414518843) - e0Y * (localX - 0);
      const side1 = e1X * (localY - 0.20207259422) - e1Y * (localX - 0.35);
      const side2 = e2X * (localY - 0.20207259422) - e2Y * (localX - -0.35);
      return side0 <= 0 && side1 <= 0 && side2 <= 0 || side0 >= 0 && side1 >= 0 && side2 >= 0;
    }
    if (currentScene.shape.type === "preset" && currentScene.shape.preset === "circle") {
      return localX * localX + localY * localY <= 0.35 * 0.35;
    }
    const [shapeU, shapeV] = screenToShapeUv(x, y);
    return shapePipeline.hitTest(shapeU, shapeV) < 0;
  }
  function hitTestScreen(x, y) {
    return isPointerInsideShape(x, y) ? "object" : "background";
  }
  function executeAction(item, _screenPos, shapePos) {
    const action = item.action;
    const params = item.params || {};
    if (action === "next-palette") {
      if (currentScene.palettes.length > 0) {
        currentPaletteIndex = (currentPaletteIndex + 1) % currentScene.palettes.length;
        const pal = currentScene.palettes[currentPaletteIndex];
        activePaletteOklab = pal.map((c) => parseColorToOklab(c));
        paletteStopCount = Math.min(8, activePaletteOklab.length);
        setSpringTargets(paletteSprings, activePaletteOklab);
      }
    } else if (action === "random-palette") {
      activePaletteOklab = generateRandomPalette();
      paletteStopCount = Math.min(8, activePaletteOklab.length);
      setSpringTargets(paletteSprings, activePaletteOklab);
    } else if (action === "burst") {
      const intensity = typeof params["intensity"] === "number" ? params["intensity"] : 2;
      const decay = typeof params["decay"] === "number" ? params["decay"] : 4;
      const duration = typeof params["duration"] === "number" ? params["duration"] : 0.5;
      activeBurst = {
        startTime: clock.now(),
        duration,
        intensity,
        decay
      };
    } else if (action === "ripple") {
      const originU = shapePos ? shapePos[0] : 0.5;
      const originV = shapePos ? shapePos[1] : 0.5;
      const speed = typeof params["speed"] === "number" ? params["speed"] : 1.5;
      const duration = typeof params["duration"] === "number" ? params["duration"] : 0.6;
      const intensity = typeof params["intensity"] === "number" ? params["intensity"] : 1.5;
      activeRipple = {
        originU,
        originV,
        startTime: clock.now(),
        duration,
        speed,
        intensity
      };
    } else if (action === "next-mode") {
      const modeList = Array.isArray(params["modes"]) ? params["modes"] : ALL_BASE_MODE_IDS;
      const currentIdx = modeList.indexOf(activeModeId);
      const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % modeList.length : 0;
      activeModeId = modeList[nextIdx];
      activeModeParams = {};
    } else if (action === "toggle-content") {
      isContentVisible = !isContentVisible;
    }
  }
  function updateCanvasDimensions() {
    const physWidth = Math.max(1, Math.round(cssWidth * dpr * resolutionScale));
    const physHeight = Math.max(1, Math.round(cssHeight * dpr * resolutionScale));
    if (canvas.width !== physWidth || canvas.height !== physHeight) {
      canvas.width = physWidth;
      canvas.height = physHeight;
    }
  }
  updateCanvasDimensions();
  const unsubscribeInput = input.subscribe({
    onPointerMove(x, y) {
      targetPointerX = x;
      targetPointerY = y;
      pointerActive = true;
      lastPointerTime = clock.now();
    },
    onPointerDown(x, y) {
      targetPointerX = x;
      targetPointerY = y;
      pointerActive = true;
      lastPointerTime = clock.now();
      const [shapeU, shapeV] = screenToShapeUv(x, y);
      const distance = shapePipeline.hitTest(shapeU, shapeV);
      const hit = distance < 0 ? "object" : "background";
      const actionList = hit === "object" ? currentScene.onClick.object : currentScene.onClick.background;
      for (let i = 0; i < actionList.length; i++) {
        executeAction(actionList[i], [x, y], [shapeU, shapeV]);
      }
    },
    onPointerLeave() {
      pointerActive = false;
    },
    onVisibilityChange(visible) {
      isCanvasVisible = visible;
      if (visible && isRunning && !isPaused && rafId === null) {
        lastFrameTime = clock.now();
        scheduleNextFrame();
      }
    }
  });
  const onContextLost = (e) => {
    e.preventDefault();
    isContextLost = true;
    if (rafId !== null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
  const onContextRestored = () => {
    isContextLost = false;
    try {
      gl = getWebGL2Context(canvas);
      quad = createQuadMesh(gl);
      program = createShaderProgram(gl, QUAD_VERTEX_SHADER, GLOW_FRAGMENT_SHADER);
      sdfTexture = createR8Texture(
        gl,
        shapePipeline.sdf.width,
        shapePipeline.sdf.height,
        shapePipeline.sdf.r8Data
      );
      contentTexture = createRgbaTexture(
        gl,
        contentResult.width,
        contentResult.height,
        contentResult.data
      );
      if (isRunning && !isPaused) {
        lastFrameTime = clock.now();
        scheduleNextFrame();
      }
    } catch {
    }
  };
  const htmlCanvas = canvas;
  if (typeof htmlCanvas.addEventListener === "function") {
    htmlCanvas.addEventListener("webglcontextlost", onContextLost, false);
    htmlCanvas.addEventListener("webglcontextrestored", onContextRestored, false);
  }
  function renderFrame(timeMs) {
    if (isContextLost) return;
    const now = timeMs !== void 0 ? timeMs : clock.now();
    const timeSec = now * 1e-3;
    const dt = Math.max(0, (now - lastAnimTime) * 1e-3);
    lastAnimTime = now;
    stepPaletteSprings(paletteSprings, paletteStopCount, dt);
    for (let i = 0; i < paletteStopCount; i++) {
      const s = paletteSprings[i];
      oklabToLinearSrgb(s.L, s.a, s.b, tempLinearRgb);
      const baseIdx = i * 4;
      paletteBuffer[baseIdx] = tempLinearRgb[0];
      paletteBuffer[baseIdx + 1] = tempLinearRgb[1];
      paletteBuffer[baseIdx + 2] = tempLinearRgb[2];
      paletteBuffer[baseIdx + 3] = s.alpha;
    }
    effectContext.timeSec = timeSec;
    effectContext.timeMs = now;
    effectContext.shapeCenter[0] = currentScene.shape.position[0];
    effectContext.shapeCenter[1] = currentScene.shape.position[1];
    effectContext.shapeScale = currentScene.shape.scale;
    const modeDef = BASE_MODES[activeModeId] ?? BASE_MODES.glow;
    modeDef.evaluate(activeModeParams, effectContext, modeUniforms);
    if (activeRipple !== null) {
      const elapsed = (now - activeRipple.startTime) * 1e-3;
      if (elapsed >= activeRipple.duration || elapsed < 0) {
        activeRipple = null;
        rippleBuffer[0] = 0.5;
        rippleBuffer[1] = 0.5;
        rippleBuffer[2] = 0;
        rippleBuffer[3] = 0;
      } else {
        const progress = elapsed / activeRipple.duration;
        rippleBuffer[0] = activeRipple.originU;
        rippleBuffer[1] = activeRipple.originV;
        rippleBuffer[2] = elapsed * activeRipple.speed;
        rippleBuffer[3] = (1 - progress) * activeRipple.intensity;
      }
    } else {
      rippleBuffer[0] = 0.5;
      rippleBuffer[1] = 0.5;
      rippleBuffer[2] = 0;
      rippleBuffer[3] = 0;
    }
    let burstFactor = 0;
    if (activeBurst !== null) {
      const elapsed = (now - activeBurst.startTime) * 1e-3;
      if (elapsed >= activeBurst.duration || elapsed < 0) {
        activeBurst = null;
      } else {
        burstFactor = activeBurst.intensity * Math.exp(-activeBurst.decay * elapsed);
      }
    }
    const timeSinceLastPointer = now - lastPointerTime;
    const idleTimeout = currentScene.interaction.idleTimeoutMs ?? 3e3;
    const isExplicitOrbitMode = modeUniforms.orbitPos !== null;
    const shouldIdleOrbit = !isExplicitOrbitMode && currentScene.interaction.idleOrbit && (!pointerActive || timeSinceLastPointer > idleTimeout);
    isOrbiting = isExplicitOrbitMode || shouldIdleOrbit;
    if (isExplicitOrbitMode && modeUniforms.orbitPos) {
      targetPointerX = modeUniforms.orbitPos[0];
      targetPointerY = modeUniforms.orbitPos[1];
    } else if (shouldIdleOrbit) {
      const orbitSpeed = 0.8;
      const orbitAngle = timeSec * orbitSpeed;
      const shapeCenter = currentScene.shape.position;
      const orbitRadius = currentScene.shape.scale * 1.3;
      targetPointerX = shapeCenter[0] + Math.cos(orbitAngle) * orbitRadius;
      targetPointerY = shapeCenter[1] + Math.sin(orbitAngle) * orbitRadius;
    }
    const isInside = pointerActive && isPointerInsideShape(targetPointerX, targetPointerY);
    const smoothing = currentScene.interaction.smoothing;
    currentPointerX += (targetPointerX - currentPointerX) * smoothing;
    currentPointerY += (targetPointerY - currentPointerY) * smoothing;
    const hasCursor = isExplicitOrbitMode || currentScene.interaction.followCursor && (pointerActive && !isInside || shouldIdleOrbit) ? 1 : 0;
    const aspect = canvas.width / Math.max(canvas.height, 1);
    const shapeX = currentScene.shape.position[0];
    const shapeY = currentScene.shape.position[1];
    const dx = (currentPointerX - shapeX) * aspect;
    const dy = currentPointerY - shapeY;
    const hoverTarget = pointerActive && !isInside ? 1 : 0;
    const hoverAlpha = dt > 0 ? 1 - Math.exp(-dt / 0.25) : 1;
    hoverTransition += (hoverTarget - hoverTransition) * hoverAlpha;
    hoverTransition = Math.max(0, Math.min(1, hoverTransition));
    const rotSpeed = modeUniforms.rotationSpeed;
    const autoAngle = rotSpeed !== 0 ? timeSec * rotSpeed * Math.PI * 2 % (Math.PI * 2) : 0;
    let activeLightAngle = autoAngle;
    if (hoverTransition > 1e-3) {
      const cursorAngle = Math.atan2(dy, dx);
      let angleDiff = (cursorAngle - autoAngle) % (Math.PI * 2);
      if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      activeLightAngle = autoAngle + angleDiff * hoverTransition;
    }
    sweepBuffer[0] = modeUniforms.sweep[0];
    sweepBuffer[1] = modeUniforms.sweep[1];
    sweepBuffer[2] = modeUniforms.sweep[2];
    sweepBuffer[3] = modeUniforms.sweep[3];
    currentUniforms.u_cursorPos[0] = currentPointerX;
    currentUniforms.u_cursorPos[1] = currentPointerY;
    currentUniforms.u_hasCursor = hasCursor;
    currentUniforms.u_hoverTransition = hoverTransition;
    currentUniforms.u_lightAngle = activeLightAngle;
    currentUniforms.u_shapeType = getShapeType(currentScene.shape);
    currentUniforms.u_cursorSharpness = currentScene.interaction.sharpness;
    currentUniforms.u_hazeIntensity = currentScene.background.haze.intensity;
    currentUniforms.u_shapePos[0] = currentScene.shape.position[0];
    currentUniforms.u_shapePos[1] = currentScene.shape.position[1];
    currentUniforms.u_shapeScale = currentScene.shape.scale;
    currentUniforms.u_shapeRotation = currentScene.shape.rotation * Math.PI / 180;
    currentUniforms.u_maxDistance = shapePipeline.sdf.maxDistance;
    currentUniforms.u_edgeWidth = currentScene.edge.width;
    currentUniforms.u_edgeFalloff = currentScene.edge.falloff;
    currentUniforms.u_edgeIntensity = currentScene.edge.intensity;
    currentUniforms.u_edgeDispersion = currentScene.edge.dispersion;
    currentUniforms.u_time = timeSec;
    currentUniforms.u_rotationSpeed = modeUniforms.rotationSpeed;
    currentUniforms.u_pulseFactor = modeUniforms.pulseFactor;
    currentUniforms.u_hueShift = modeUniforms.hueShift;
    currentUniforms.u_flickerFactor = modeUniforms.flickerFactor;
    currentUniforms.u_sweep[0] = sweepBuffer[0];
    currentUniforms.u_sweep[1] = sweepBuffer[1];
    currentUniforms.u_sweep[2] = sweepBuffer[2];
    currentUniforms.u_sweep[3] = sweepBuffer[3];
    currentUniforms.u_ripple[0] = rippleBuffer[0];
    currentUniforms.u_ripple[1] = rippleBuffer[1];
    currentUniforms.u_ripple[2] = rippleBuffer[2];
    currentUniforms.u_ripple[3] = rippleBuffer[3];
    currentUniforms.u_burstFactor = burstFactor;
    const hasContent = isContentVisible && currentScene.fill.content !== null ? 1 : 0;
    currentUniforms.u_hasContent = hasContent;
    contentTintBuffer[0] = contentResult.tint[0];
    contentTintBuffer[1] = contentResult.tint[1];
    contentTintBuffer[2] = contentResult.tint[2];
    contentTintBuffer[3] = contentResult.tint[3];
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    program.use();
    sdfTexture.bind(0);
    contentTexture.bind(1);
    const uSdfLoc = program.getUniformLocation("u_sdf");
    if (uSdfLoc) gl.uniform1i(uSdfLoc, 0);
    const uResLoc = program.getUniformLocation("u_resolution");
    if (uResLoc) gl.uniform2f(uResLoc, canvas.width, canvas.height);
    const uShapePosLoc = program.getUniformLocation("u_shapePos");
    if (uShapePosLoc)
      gl.uniform2f(uShapePosLoc, currentScene.shape.position[0], currentScene.shape.position[1]);
    const uShapeScaleLoc = program.getUniformLocation("u_shapeScale");
    if (uShapeScaleLoc) gl.uniform1f(uShapeScaleLoc, currentScene.shape.scale);
    const uShapeRotLoc = program.getUniformLocation("u_shapeRotation");
    if (uShapeRotLoc) gl.uniform1f(uShapeRotLoc, currentScene.shape.rotation * Math.PI / 180);
    const uShapeTypeLoc = program.getUniformLocation("u_shapeType");
    if (uShapeTypeLoc) gl.uniform1i(uShapeTypeLoc, currentUniforms.u_shapeType);
    const uMaxDistLoc = program.getUniformLocation("u_maxDistance");
    if (uMaxDistLoc) gl.uniform1f(uMaxDistLoc, shapePipeline.sdf.maxDistance);
    const uEdgeWidthLoc = program.getUniformLocation("u_edgeWidth");
    if (uEdgeWidthLoc) gl.uniform1f(uEdgeWidthLoc, currentScene.edge.width);
    const uEdgeFalloffLoc = program.getUniformLocation("u_edgeFalloff");
    if (uEdgeFalloffLoc) gl.uniform1f(uEdgeFalloffLoc, currentScene.edge.falloff);
    const uEdgeIntensityLoc = program.getUniformLocation("u_edgeIntensity");
    if (uEdgeIntensityLoc) gl.uniform1f(uEdgeIntensityLoc, currentScene.edge.intensity);
    const uEdgeDispLoc = program.getUniformLocation("u_edgeDispersion");
    if (uEdgeDispLoc) gl.uniform1f(uEdgeDispLoc, currentScene.edge.dispersion);
    const uFillLoc = program.getUniformLocation("u_fillColor");
    if (uFillLoc) gl.uniform3fv(uFillLoc, fillColorBuffer);
    const uBgLoc = program.getUniformLocation("u_bgColor");
    if (uBgLoc) gl.uniform3fv(uBgLoc, bgColorBuffer);
    const uPalCountLoc = program.getUniformLocation("u_paletteCount");
    if (uPalCountLoc) gl.uniform1i(uPalCountLoc, paletteStopCount);
    const uPalLoc = program.getUniformLocation("u_palette[0]");
    if (uPalLoc) gl.uniform4fv(uPalLoc, paletteBuffer);
    const uTimeLoc = program.getUniformLocation("u_time");
    if (uTimeLoc) gl.uniform1f(uTimeLoc, timeSec);
    const uRotSpeedLoc = program.getUniformLocation("u_rotationSpeed");
    if (uRotSpeedLoc) gl.uniform1f(uRotSpeedLoc, modeUniforms.rotationSpeed);
    const uPulseLoc = program.getUniformLocation("u_pulseFactor");
    if (uPulseLoc) gl.uniform1f(uPulseLoc, modeUniforms.pulseFactor);
    const uHueShiftLoc = program.getUniformLocation("u_hueShift");
    if (uHueShiftLoc) gl.uniform1f(uHueShiftLoc, modeUniforms.hueShift);
    const uFlickerLoc = program.getUniformLocation("u_flickerFactor");
    if (uFlickerLoc) gl.uniform1f(uFlickerLoc, modeUniforms.flickerFactor);
    const uSweepLoc = program.getUniformLocation("u_sweep");
    if (uSweepLoc) gl.uniform4fv(uSweepLoc, sweepBuffer);
    const uRippleLoc = program.getUniformLocation("u_ripple");
    if (uRippleLoc) gl.uniform4fv(uRippleLoc, rippleBuffer);
    const uBurstLoc = program.getUniformLocation("u_burstFactor");
    if (uBurstLoc) gl.uniform1f(uBurstLoc, burstFactor);
    const uCursorPosLoc = program.getUniformLocation("u_cursorPos");
    if (uCursorPosLoc) gl.uniform2f(uCursorPosLoc, currentPointerX, currentPointerY);
    const uHoverLoc = program.getUniformLocation("u_hoverTransition");
    if (uHoverLoc) gl.uniform1f(uHoverLoc, hoverTransition);
    const uLightAngleLoc = program.getUniformLocation("u_lightAngle");
    if (uLightAngleLoc) gl.uniform1f(uLightAngleLoc, activeLightAngle);
    const uCursorSharpLoc = program.getUniformLocation("u_cursorSharpness");
    if (uCursorSharpLoc) gl.uniform1f(uCursorSharpLoc, currentScene.interaction.sharpness);
    const uHazeLoc = program.getUniformLocation("u_hazeIntensity");
    if (uHazeLoc) gl.uniform1f(uHazeLoc, currentScene.background.haze.intensity);
    const uHasCursorLoc = program.getUniformLocation("u_hasCursor");
    if (uHasCursorLoc) gl.uniform1f(uHasCursorLoc, hasCursor);
    const uContentTexLoc = program.getUniformLocation("u_contentTexture");
    if (uContentTexLoc) gl.uniform1i(uContentTexLoc, 1);
    const uHasContentLoc = program.getUniformLocation("u_hasContent");
    if (uHasContentLoc) gl.uniform1f(uHasContentLoc, hasContent);
    const uContentScaleLoc = program.getUniformLocation("u_contentScale");
    if (uContentScaleLoc) gl.uniform1f(uContentScaleLoc, contentResult.scale);
    const uContentOpacityLoc = program.getUniformLocation("u_contentOpacity");
    if (uContentOpacityLoc) gl.uniform1f(uContentOpacityLoc, contentResult.opacity);
    const uContentTintLoc = program.getUniformLocation("u_contentTint");
    if (uContentTintLoc) gl.uniform4fv(uContentTintLoc, contentTintBuffer);
    quad.draw();
  }
  function loop() {
    if (!isRunning || isPaused || !isCanvasVisible || isContextLost) {
      rafId = null;
      return;
    }
    const now = clock.now();
    const minFrameInterval = 1e3 / Math.max(1, fpsCap);
    const elapsed = now - lastFrameTime;
    if (elapsed >= minFrameInterval) {
      lastFrameTime = now - elapsed % minFrameInterval;
      renderFrame(now);
    }
    scheduleNextFrame();
  }
  function scheduleNextFrame() {
    if (typeof requestAnimationFrame !== "undefined") {
      rafId = requestAnimationFrame(loop);
    }
  }
  return {
    start() {
      if (isRunning) return;
      isRunning = true;
      lastFrameTime = clock.now();
      scheduleNextFrame();
    },
    stop() {
      isRunning = false;
      if (rafId !== null && typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
    setScene(newScene) {
      currentScene = parseScene(newScene);
      fpsCap = currentScene.performance.fpsCap;
      resolutionScale = currentScene.performance.resolutionScale;
      activeModeId = currentScene.mode.id;
      activeModeParams = currentScene.mode.params || {};
      activeRipple = null;
      activeBurst = null;
      refreshColors(currentScene);
      shapePipeline = buildShapePipeline(currentScene.shape);
      sdfTexture.updateData(
        shapePipeline.sdf.width,
        shapePipeline.sdf.height,
        shapePipeline.sdf.r8Data
      );
      contentResult = rasterizeCenterContent(currentScene.fill.content);
      contentTexture.updateData(contentResult.width, contentResult.height, contentResult.data);
      updateCanvasDimensions();
      if (!isRunning) {
        renderFrame(clock.now());
      }
    },
    setPaused(paused) {
      isPaused = paused;
      if (!isPaused && isRunning && rafId === null) {
        lastFrameTime = clock.now();
        scheduleNextFrame();
      }
    },
    setResolutionScale(scale) {
      resolutionScale = Math.max(0.25, Math.min(1, scale));
      updateCanvasDimensions();
      if (!isRunning) {
        renderFrame(clock.now());
      }
    },
    setFpsCap(fps) {
      fpsCap = Math.max(10, Math.min(144, fps));
    },
    resize(width, height, devicePixelRatio) {
      cssWidth = width;
      cssHeight = height;
      if (devicePixelRatio !== void 0) {
        dpr = devicePixelRatio;
      }
      updateCanvasDimensions();
      if (!isRunning) {
        renderFrame(clock.now());
      }
    },
    renderFrame(timeMs) {
      renderFrame(timeMs);
    },
    dispose() {
      isRunning = false;
      if (rafId !== null && typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      unsubscribeInput();
      if (typeof htmlCanvas.removeEventListener === "function") {
        htmlCanvas.removeEventListener("webglcontextlost", onContextLost);
        htmlCanvas.removeEventListener("webglcontextrestored", onContextRestored);
      }
      quad.dispose();
      sdfTexture.dispose();
      contentTexture.dispose();
      program.dispose();
    },
    get isRunning() {
      return isRunning;
    },
    get isPaused() {
      return isPaused;
    },
    get currentScene() {
      return currentScene;
    },
    getCursorPosition() {
      return [currentPointerX, currentPointerY];
    },
    getTargetCursorPosition() {
      return [targetPointerX, targetPointerY];
    },
    isIdleOrbitActive() {
      return isOrbiting;
    },
    getUniformValues() {
      return currentUniforms;
    },
    handleClick(x, y) {
      return hitTestScreen(x, y);
    },
    getActivePaletteIndex() {
      return currentPaletteIndex;
    },
    getActiveMode() {
      return activeModeId;
    },
    setMode(id, params) {
      activeModeId = id;
      activeModeParams = params || {};
      if (!isRunning) {
        renderFrame(clock.now());
      }
    },
    triggerAction(actionId, params, origin) {
      let shapePos;
      if (origin) {
        shapePos = screenToShapeUv(origin[0], origin[1]);
      }
      executeAction({ action: actionId, params }, origin, shapePos);
      if (!isRunning) {
        renderFrame(clock.now());
      }
    },
    isContentVisible() {
      return isContentVisible;
    }
  };
}

// src/input/browser.ts
var BrowserInput = class {
  target;
  constructor(target) {
    this.target = target ?? null;
  }
  setTarget(target) {
    this.target = target;
  }
  subscribe(handlers) {
    const el = this.target;
    if (!el) {
      return () => {
      };
    }
    const onPointerMove = (e) => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      handlers.onPointerMove(Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y)));
    };
    const onPointerDown = (e) => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      handlers.onPointerDown(Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y)));
    };
    const onPointerLeave = () => {
      handlers.onPointerLeave();
    };
    const onVisibilityChange = () => {
      if (typeof document !== "undefined") {
        handlers.onVisibilityChange(document.visibilityState === "visible");
      }
    };
    el.addEventListener("pointermove", onPointerMove, { passive: true });
    el.addEventListener("pointerdown", onPointerDown, { passive: true });
    el.addEventListener("pointerleave", onPointerLeave, { passive: true });
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityChange, { passive: true });
    }
    return () => {
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerleave", onPointerLeave);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    };
  }
};
export {
  ALL_BASE_MODE_IDS,
  ALL_CLICK_ACTION_IDS,
  AssetLoadError,
  BASE_MODES,
  BrowserInput,
  CLICK_ACTIONS,
  ManualClock,
  NoopInput,
  RenderError,
  ShapeRasterizationError,
  SystemClock,
  UnsupportedError,
  WebGLContextLostError,
  buildShapePipeline,
  buildShapePipelineAsync,
  computeSdf,
  computeSdfAsync,
  createPaletteSprings,
  createRenderer,
  exampleScene,
  generateRandomPalette,
  getRegularPolygonVertices,
  getStarVertices,
  getTriangleVertices,
  linearSrgbToOklab,
  oklabToLinearSrgb,
  oklchToOklab,
  parseColorToLinearSrgb,
  parseColorToOklab,
  parseSvgString,
  rasterizeCenterContent,
  rasterizeCircle,
  rasterizePolygon,
  rasterizeRoundedRect,
  rasterizeShape,
  samplePaletteLinear,
  setSpringTargets,
  setSpringTargetsImmediate,
  stepPaletteSprings
};
//# sourceMappingURL=index.js.map