import * as OapiCore from "@larksuite/oapi-core";

const asyncRedis = require("async-redis");

export const GetConfig = (domain: OapiCore.Domain, appSetting: OapiCore.AppSettings, logLevel: OapiCore.LoggerLevel): OapiCore.Config => {
    let logger = new OapiCore.ConsoleLogger()
    let store = new RedisStore()
    return OapiCore.newConfig(domain, appSetting, logger, logLevel, store)
}

const client = asyncRedis.createClient(6379, "127.0.0.1");

client.on("error", function (err) {
    console.log("Error " + err);
});

class RedisStore {

    get = (key: string) => {
        return client.get(key)
    }

    put = (key: string, value: string, expire: number) => {
        return client.setex(key, expire, value)
    }

}




