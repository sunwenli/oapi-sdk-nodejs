import * as querystring from "querystring"
import * as util from "util"
import * as fetch from 'node-fetch'
import {OAPIRootPath, UserIDType} from "../constants/constants";
import {Context, Domain} from "@larksuite/oapi-core";
import * as stream from "stream";

const ctxKeyRequestInfo = "x-request-info"

export type OptFn = (opt: Opt) => void

export enum AccessTokenType {
    None = "none_access_token",
    App = "app_access_token",
    Tenant = "tenant_access_token",
    User = "user_access_token",
}

export class UserID {
    typ: UserIDType
    id: string

    constructor(typ: UserIDType, id: string) {
        this.typ = typ
        this.id = id
    }
}

export class Opt {
    isNotDataField: boolean
    pathParams: { [key: string]: any }
    queryParams: { [key: string]: any }
    userAccessToken: string
    userID: UserID
    tenantKey: string
    timeoutOfMs: number
    isResponseStream: boolean
    responseStream: any
}

export class Info<T> {
    httpPath: string                         // request http path
    httpMethod: string                       // request http method
    queryParams: string                       // request query
    input: any                                // request body
    accessibleTokenTypeSet: Set<AccessTokenType> // request accessible token type
    accessTokenType: AccessTokenType              // request access token type
    tenantKey: string
    userAccessToken: string                       // user access token
    userID: UserID
    isNotDataField: boolean = false         // response body is not data field
    isResponseStream: boolean = false
    output: T                               // response body data
    retryable: boolean = false
    timeout: number                         // http request time out
    optFns: OptFn[]

    withContext(ctx: Context): void {
        ctx.set(ctxKeyRequestInfo, this)
    }
}

export const getInfoByCtx = (ctx: Context): Info<any> => {
    return ctx.get(ctxKeyRequestInfo)
}

export const setTimeoutOfMs = function (timeoutOfMs: number): (opt: Opt) => void {
    return function (opt: Opt) {
        opt.timeoutOfMs = timeoutOfMs
    }
}

export const setUserAccessToken = function (userAccessToken: string): (opt: Opt) => void {
    return function (opt: Opt) {
        opt.userAccessToken = userAccessToken
    }
}

/*
export const setUserID = function (id: string): (opt: Opt) => void {
    return function (opt: Opt) {
        opt.userID = new UserID(UserIDType.User, id)
    }
}

export const setOpenID = function (id: string): (opt: Opt) => void {
    return function (opt: Opt) {
        opt.userID = new UserID(UserIDType.Open, id)
    }
}

export const setUnionID = function (id: string): (opt: Opt) => void {
    return function (opt: Opt) {
        opt.userID = new UserID(UserIDType.Union, id)
    }
}
*/

export const setTenantKey = function (tenantKey: string): (opt: Opt) => void {
    return function (opt: Opt) {
        opt.tenantKey = tenantKey
    }
}

export const setPathParams = function (pathParams: { [key: string]: any }): (opt: Opt) => void {
    return function (opt: Opt) {
        opt.pathParams = pathParams
    }
}

export const setQueryParams = function (queryParams: { [key: string]: any }): (opt: Opt) => void {
    return function (opt: Opt) {
        opt.queryParams = queryParams
    }
}

export const setIsNotDataField = function (): (opt: Opt) => void {
    return function (opt: Opt) {
        opt.isNotDataField = true
    }
}

export const setIsResponseStream = function (): (opt: Opt) => void {
    return function (opt: Opt) {
        opt.isResponseStream = true
    }
}

export const setResponseStream = function (responseStream: stream.Writable): (opt: Opt) => void {
    return function (opt: Opt) {
        opt.responseStream = responseStream
    }
}

export interface HTTPRequestOpts {
    method: string
    timeout: number
    body?: any
    headers: {}
    bodySource?: {
        isStream: boolean;
        filePath: string;
    }
}

export class Request<T> extends Info<T> {
    httpRequestOpts: HTTPRequestOpts
    httpResponse: fetch.Response
    err: any

    url(): string {
        let path = util.format("/%s/%s", OAPIRootPath, this.httpPath)
        if (this.queryParams) {
            path = util.format("%s?%s", path, this.queryParams)
        }
        return path
    }

    fullUrl(domain: Domain): string {
        return util.format("%s%s", domain, this.url())
    }

    toString(): string {
        return util.format("%s %s\n%s", this.httpMethod, this.url(), this.accessTokenType)
    }

    init() {
        let opt = new Opt()
        for (let v of this.optFns) {
            v(opt)
        }
        this.isNotDataField = opt.isNotDataField
        this.isResponseStream = opt.isResponseStream
        if (opt.responseStream) {
            this.isResponseStream = true
            this.output = opt.responseStream
        }
        if (opt.tenantKey) {
            if (this.accessibleTokenTypeSet.has(AccessTokenType.Tenant)) {
                this.accessTokenType = AccessTokenType.Tenant
                this.tenantKey = opt.tenantKey
            }
        }
        this.tenantKey = opt.tenantKey || ""
        if (opt.userAccessToken || opt.userID) {
            if (this.accessibleTokenTypeSet.has(AccessTokenType.User)) {
                this.accessTokenType = AccessTokenType.User
                this.userAccessToken = opt.userAccessToken || ""
                this.userID = opt.userID
            }
        }
        this.timeout = opt.timeoutOfMs || 30000
        if (opt.queryParams) {
            this.queryParams = querystring.stringify(opt.queryParams)
        }
        if (opt.pathParams) {
            this.httpPath = resolvePath(this.httpPath, opt.pathParams)
        }
    }
}

export const newRequestByAuth = <T>(httpPath: string, httpMethod: string, input: any, output: T): Request<T> => {
    let r = new Request<T>()
    r.httpPath = httpPath
    r.httpMethod = httpMethod
    r.input = input
    r.output = output
    r.accessibleTokenTypeSet = new Set<AccessTokenType>()
    r.accessTokenType = AccessTokenType.None
    r.optFns = [setIsNotDataField()]
    return r
}

const resolvePath = (path: string, pathVar: { [key: string]: any }): string => {
    let tmpPath = path
    let newPath = ""
    while (true) {
        let i = tmpPath.indexOf(":")
        if (i === -1) {
            newPath += tmpPath
            break
        }
        newPath += tmpPath.substring(0, i)
        let subPath = tmpPath.substring(i)
        let j = subPath.indexOf("/")
        if (j === -1) {
            j = subPath.length
        }
        let varName = subPath.substring(1, j)
        let v = pathVar[varName]
        if (v === undefined) {
            throw new Error(util.format("path:%s, param name:%s not find value", path, varName))
        }
        newPath += v
        if (j === subPath.length) {
            break
        }
        tmpPath = subPath.substring(j)
    }
    return newPath
}

export const newRequestOfTs = <T>(httpPath: string, httpMethod: string, accessTokenTypes: AccessTokenType[],
                                  input: any, output: T, ...optFns: OptFn[]): Request<T> => {
    let accessibleTokenTypeSet = new Set<AccessTokenType>()
    for (let v of accessTokenTypes) {
        accessibleTokenTypeSet.add(v)
    }
    let r = new Request<T>()
    r.httpPath = httpPath
    r.httpMethod = httpMethod
    r.accessibleTokenTypeSet = accessibleTokenTypeSet
    r.input = input
    r.output = output
    r.accessTokenType = accessTokenTypes[0]
    r.optFns = optFns
    return r
}

export const newRequest = (httpPath: string, httpMethod: string, accessTokenType: AccessTokenType,
                           input: any, ...optFns: OptFn[]): Request<any> => {
    let output: any
    return newRequestOfTs(httpPath, httpMethod, [accessTokenType], input, output, ...optFns)
}




