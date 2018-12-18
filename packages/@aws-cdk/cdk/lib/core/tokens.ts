import { Construct } from "./construct";

/**
 * If objects has a function property by this name, they will be considered tokens, and this
 * function will be called to resolve the value for this object.
 */
export const RESOLVE_METHOD = 'resolve';

export type ContextMap = {[key: string]: any};

export interface ResolveOptions {
    context?: ContextMap;

    prefix?: string[];
}

/**
 * Represents a special or lazily-evaluated value.
 *
 * Can be used to delay evaluation of a certain value in case, for example,
 * that it requires some context or late-bound data. Can also be used to
 * mark values that need special processing at document rendering time.
 *
 * Tokens can be embedded into strings while retaining their original
 * semantics.
 */
export class Token {
  private tokenStringification?: string;
  private tokenListification?: string[];

  /**
   * Creates a token that resolves to `value`.
   *
   * If value is a function, the function is evaluated upon resolution and
   * the value it returns will be used as the token's value.
   *
   * displayName is used to represent the Token when it's embedded into a string; it
   * will look something like this:
   *
   *    "embedded in a larger string is ${Token[DISPLAY_NAME.123]}"
   *
   * This value is used as a hint to humans what the meaning of the Token is,
   * and does not have any effect on the evaluation.
   *
   * Must contain only alphanumeric and simple separator characters (_.:-).
   *
   * @param valueOrFunction What this token will evaluate to, literal or function.
   * @param displayName A human-readable display hint for this Token
   */
  constructor(private readonly valueOrFunction?: any, private readonly displayName?: string) {
  }

  /**
   * @returns The resolved value for this token.
   */
  public resolve(context: ContextMap): any {
    let value = this.valueOrFunction;
    if (typeof(value) === 'function') {
      value = value(context);
    }

    return value;
  }

  /**
   * Return a reversible string representation of this token
   *
   * If the Token is initialized with a literal, the stringified value of the
   * literal is returned. Otherwise, a special quoted string representation
   * of the Token is returned that can be embedded into other strings.
   *
   * Strings with quoted Tokens in them can be restored back into
   * complex values with the Tokens restored by calling `resolve()`
   * on the string.
   */
  public toString(): string {
    const valueType = typeof this.valueOrFunction;
    // Optimization: if we can immediately resolve this, don't bother
    // registering a Token.
    if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
      return this.valueOrFunction.toString();
    }

    if (this.tokenStringification === undefined) {
      this.tokenStringification = TOKEN_MAP.registerString(this, this.displayName);
    }
    return this.tokenStringification;
  }

  /**
   * Turn this Token into JSON
   *
   * This gets called by JSON.stringify(). We want to prohibit this, because
   * it's not possible to do this properly, so we just throw an error here.
   */
  public toJSON(): any {
    // tslint:disable-next-line:max-line-length
    throw new Error('JSON.stringify() cannot be applied to structure with a Token in it. Use a document-specific stringification method instead.');
  }

  /**
   * Return a string list representation of this token
   *
   * Call this if the Token intrinsically evaluates to a list of strings.
   * If so, you can represent the Token in a similar way in the type
   * system.
   *
   * Note that even though the Token is represented as a list of strings, you
   * still cannot do any operations on it such as concatenation, indexing,
   * or taking its length. The only useful operations you can do to these lists
   * is constructing a `FnJoin` or a `FnSelect` on it.
   */
  public toList(): string[] {
    const valueType = typeof this.valueOrFunction;
    if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
      throw new Error('Got a literal Token value; cannot be encoded as a list.');
    }

    if (this.tokenListification === undefined) {
      this.tokenListification = TOKEN_MAP.registerList(this, this.displayName);
    }
    return this.tokenListification;
  }

  /**
   * Return a concated version of this Token in a string context
   *
   * The default implementation of this combines strings, but specialized
   * implements of Token can return a more appropriate value.
   */
  public concat(left: any | undefined, right: any | undefined): Token {
    const parts = [left, resolve(this), right].filter(x => x !== undefined);
    return new Token(parts.map(x => `${x}`).join(''));
  }
}

/**
 * Returns true if obj is a token (i.e. has the resolve() method or is a string
 * that includes token markers), or it's a listifictaion of a Token string.
 *
 * @param obj The object to test.
 */
export function unresolved(obj: any): boolean {
  if (typeof(obj) === 'string') {
    return TOKEN_MAP.createStringTokenString(obj).test();
  } else if (Array.isArray(obj) && obj.length === 1) {
    return isListToken(obj[0]);
  } else {
    return obj && typeof(obj[RESOLVE_METHOD]) === 'function';
  }
}

/**
 * Resolves an object by evaluating all tokens and removing any undefined or empty objects or arrays.
 * Values can only be primitives, arrays or tokens. Other objects (i.e. with methods) will be rejected.
 *
 * @param obj The object to resolve.
 * @param options Resolution options (prefix and context)
 */
export function resolve(obj: any, options: ResolveOptions = {}): any {
  const prefix = options.prefix || [ ];
  const context = options.context || {};
  const pathName = '/' + prefix.join('/');

  // protect against cyclic references by limiting depth.
  if (prefix.length > 200) {
    throw new Error('Unable to resolve object tree with circular reference. Path: ' + pathName);
  }

  //
  // undefined
  //

  if (typeof(obj) === 'undefined') {
    return undefined;
  }

  //
  // null
  //

  if (obj === null) {
    return null;
  }

  //
  // functions - not supported (only tokens are supported)
  //

  if (typeof(obj) === 'function') {
    throw new Error(`Trying to resolve a non-data object. Only token are supported for lazy evaluation. Path: ${pathName}. Object: ${obj}`);
  }

  //
  // string - potentially replace all stringified Tokens
  //
  if (typeof(obj) === 'string') {
    return TOKEN_MAP.resolveStringTokens(obj as string);
  }

  //
  // primitives - as-is
  //

  if (typeof(obj) !== 'object' || obj instanceof Date) {
    return obj;
  }

  //
  // tokens - invoke 'resolve' and continue to resolve recursively
  //

  if (unresolved(obj)) {
    const value = obj[RESOLVE_METHOD](context);
    return resolve(value, { context, prefix });
  }

  //
  // arrays - resolve all values, remove undefined and remove empty arrays
  //

  if (Array.isArray(obj)) {
    if (containsListToken(obj)) {
      return TOKEN_MAP.resolveListTokens(obj);
    }

    const arr = obj
      .map((x, i) => resolve(x, { context, prefix: prefix.concat(i.toString()) }))
      .filter(x => typeof(x) !== 'undefined');

    return arr;
  }

  //
  // tokens - invoke 'resolve' and continue to resolve recursively
  //

  if (unresolved(obj)) {
    const value = obj[RESOLVE_METHOD]();
    return resolve(value, options);
  }

  //
  // objects - deep-resolve all values
  //

  // Must not be a Construct at this point, otherwise you probably made a type
  // mistake somewhere and resolve will get into an infinite loop recursing into
  // child.parent <---> parent.children
  if (obj instanceof Construct) {
    throw new Error('Trying to resolve() a Construct at ' + pathName);
  }

  const result: any = { };
  for (const key of Object.keys(obj)) {
    const resolvedKey = resolve(key);
    if (typeof(resolvedKey) !== 'string') {
      throw new Error(`The key "${key}" has been resolved to ${JSON.stringify(resolvedKey)} but must be resolvable to a string`);
    }

    const value = resolve(obj[key], { context, prefix: prefix.concat(key) });

    // skip undefined
    if (typeof(value) === 'undefined') {
      continue;
    }

    result[resolvedKey] = value;
  }

  return result;
}

function isListToken(x: any) {
    return typeof(x) === 'string' && TOKEN_MAP.createListTokenString(x).test();
}

function containsListToken(xs: any[]) {
  return xs.some(isListToken);
}

/**
 * Central place where we keep a mapping from Tokens to their String representation
 *
 * The string representation is used to embed token into strings,
 * and stored to be able to
 *
 * All instances of TokenStringMap share the same storage, so that this process
 * works even when different copies of the library are loaded.
 */
class TokenMap {
  private readonly tokenMap: {[key: string]: Token};

  constructor() {
    const glob = global as any;
    this.tokenMap = glob.__cdkTokenMap = glob.__cdkTokenMap || {};
  }

  /**
   * Generate a unique string for this Token, returning a key
   *
   * Every call for the same Token will produce a new unique string, no
   * attempt is made to deduplicate. Token objects should cache the
   * value themselves, if required.
   *
   * The token can choose (part of) its own representation string with a
   * hint. This may be used to produce aesthetically pleasing and
   * recognizable token representations for humans.
   */
  public registerString(token: Token, representationHint?: string): string {
    const key = this.register(token, representationHint);
    return `${BEGIN_STRING_TOKEN_MARKER}${key}${END_TOKEN_MARKER}`;
  }

  /**
   * Generate a unique string for this Token, returning a key
   */
  public registerList(token: Token, representationHint?: string): string[] {
    const key = this.register(token, representationHint);
    return [`${BEGIN_LIST_TOKEN_MARKER}${key}${END_TOKEN_MARKER}`];
  }

  /**
   * Returns a `TokenString` for this string.
   */
  public createStringTokenString(s: string) {
    return new TokenString(s, BEGIN_STRING_TOKEN_MARKER, `[${VALID_KEY_CHARS}]+`, END_TOKEN_MARKER);
  }

  /**
   * Returns a `TokenString` for this string.
   */
  public createListTokenString(s: string) {
    return new TokenString(s, BEGIN_LIST_TOKEN_MARKER, `[${VALID_KEY_CHARS}]+`, END_TOKEN_MARKER);
  }

  /**
   * Replace any Token markers in this string with their resolved values
   */
  public resolveStringTokens(s: string): any {
    const str = this.createStringTokenString(s);
    const fragments = str.split(this.lookupToken.bind(this));
    return fragments.join();
  }

  public resolveListTokens(xs: string[]): any {
    // Must be a singleton list token, because concatenation is not allowed.
    if (xs.length !== 1) {
      throw new Error(`Cannot add elements to list token, got: ${xs}`);
    }

    const str = this.createListTokenString(xs[0]);
    const fragments = str.split(this.lookupToken.bind(this));
    if (fragments.length !== 1) {
      throw new Error(`Cannot concatenate strings in a tokenized string array, got: ${xs[0]}`);
    }
    return fragments.values()[0];
  }

  /**
   * Find a Token by key
   */
  public lookupToken(key: string): Token {
    if (!(key in this.tokenMap)) {
      throw new Error(`Unrecognized token key: ${key}`);
    }

    return this.tokenMap[key];
  }

  private register(token: Token, representationHint?: string): string {
    const counter = Object.keys(this.tokenMap).length;
    const representation = representationHint || `TOKEN`;

    const key = `${representation}.${counter}`;
    if (new RegExp(`[^${VALID_KEY_CHARS}]`).exec(key)) {
      throw new Error(`Invalid characters in token representation: ${key}`);
    }

    this.tokenMap[key] = token;
    return key;
  }
}

const BEGIN_STRING_TOKEN_MARKER = '${Token[';
const BEGIN_LIST_TOKEN_MARKER = '#{Token[';
const END_TOKEN_MARKER = ']}';
const VALID_KEY_CHARS = 'a-zA-Z0-9:._-';

/**
 * Singleton instance of the token string map
 */
const TOKEN_MAP = new TokenMap();

/**
 * Interface that Token joiners implement
 */
export interface ITokenJoiner {
  /**
   * The name of the joiner.
   *
   * Must be unique per joiner: this value will be used to assert that there
   * is exactly only type of joiner in a join operation.
   */
  id: string;

  /**
   * Return the language intrinsic that will combine the strings in the given engine
   */
  join(fragments: any[]): any;
}

/**
 * A string with markers in it that can be resolved to external values
 */
class TokenString {
  private pattern: string;

  constructor(
    private readonly str: string,
    private readonly beginMarker: string,
    private readonly idPattern: string,
    private readonly endMarker: string) {
    this.pattern = `${regexQuote(this.beginMarker)}(${this.idPattern})${regexQuote(this.endMarker)}`;
  }

  /**
   * Split string on markers, substituting markers with Tokens
   */
  public split(lookup: (id: string) => Token): TokenStringFragments {
    const re = new RegExp(this.pattern, 'g');
    const ret = new TokenStringFragments();

    let rest = 0;
    let m = re.exec(this.str);
    while (m) {
      if (m.index > rest) {
        ret.addString(this.str.substring(rest, m.index));
      }

      ret.addToken(lookup(m[1]));

      rest = re.lastIndex;
      m = re.exec(this.str);
    }

    if (rest < this.str.length) {
      ret.addString(this.str.substring(rest));
    }

    return ret;
  }

  /**
   * Indicates if this string includes tokens.
   */
  public test(): boolean {
    const re = new RegExp(this.pattern, 'g');
    return re.test(this.str);
  }
}

/**
 * Result of the split of a string with Tokens
 *
 * Either a literal part of the string, or an unresolved Token.
 */
type StringFragment = { type: 'string'; str: string };
type TokenFragment = { type: 'token'; token: Token };
type Fragment =  StringFragment | TokenFragment;

/**
 * Fragments of a string with markers
 */
class TokenStringFragments {
  private readonly fragments = new Array<Fragment>();

  public get length() {
    return this.fragments.length;
  }

  public values(): any[] {
    return this.fragments.map(f => f.type === 'token' ? resolve(f.token) : f.str);
  }

  public addString(str: string) {
    this.fragments.push({ type: 'string', str });
  }

  public addToken(token: Token) {
    this.fragments.push({ type: 'token', token });
  }

  /**
   * Combine the resolved string fragments using the Tokens to join.
   *
   * Resolves the result.
   */
  public join(): any {
    if (this.fragments.length === 0) { return ''; }
    if (this.fragments.length === 1) { return resolveFragment(this.fragments[0]); }

    const first = this.fragments[0];

    let i;
    let token: Token;

    if (first.type === 'token') {
      token = first.token;
      i = 1;
    } else {
      // We never have two strings in a row
      token = (this.fragments[1] as TokenFragment).token.concat(first.str, undefined);
      i = 2;
    }

    while (i < this.fragments.length) {
      token = token.concat(undefined, resolveFragment(this.fragments[i]));
      i++;
    }

    return resolve(token);
  }
}

/**
 * Resolve the value from a single fragment
 */
function resolveFragment(fragment: Fragment): any {
  return fragment.type === 'string' ? fragment.str : resolve(fragment.token);
}

/**
 * Quote a string for use in a regex
 */
function regexQuote(s: string) {
  return s.replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
}
